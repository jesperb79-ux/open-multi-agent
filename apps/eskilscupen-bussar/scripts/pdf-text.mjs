/**
 * Minimal, dependency-free PDF text extraction.
 *
 * Only supports what the Eskilscupen timetable PDF actually uses:
 *   - classic `N G obj ... endobj` objects (no object streams for pages/content)
 *   - FlateDecode content streams
 *   - simple TrueType fonts with WinAnsiEncoding
 *
 * It returns positioned text chunks (x/y in PDF user space) so the importer can
 * rebuild the timetable grid from column positions instead of guessing from
 * whitespace.
 */

import { inflateSync } from 'node:zlib'

/** WinAnsiEncoding differs from Latin-1 only in the 0x80-0x9F range. */
const WIN_ANSI_HIGH = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
}

function decodeWinAnsi(bytes) {
  let out = ''
  for (const b of bytes) {
    out += b >= 0x80 && b <= 0x9f ? (WIN_ANSI_HIGH[b] ?? '') : String.fromCharCode(b)
  }
  return out
}

/** Index every `N G obj` in the file so objects can be resolved by number. */
function indexObjects(raw) {
  const offsets = new Map()
  const re = /(?:^|[\r\n\s>\]])(\d+)\s+(\d+)\s+obj\b/g
  let m
  while ((m = re.exec(raw)) !== null) {
    offsets.set(Number(m[1]), m.index + m[0].indexOf(m[1]) + m[0].length - m[0].indexOf(m[1]))
    // store the offset just after the `obj` keyword
    offsets.set(Number(m[1]), re.lastIndex)
  }
  return offsets
}

class Pdf {
  constructor(buffer) {
    this.buffer = buffer
    this.raw = buffer.toString('latin1')
    this.offsets = indexObjects(this.raw)
  }

  /** Raw body text of an object, plus its stream bytes when it has one. */
  getObject(num) {
    const start = this.offsets.get(num)
    if (start === undefined) return null
    const streamIdx = this.raw.indexOf('stream', start)
    const endIdx = this.raw.indexOf('endobj', start)
    const hasStream = streamIdx !== -1 && (endIdx === -1 || streamIdx < endIdx)
    const dict = this.raw.slice(start, hasStream ? streamIdx : endIdx)
    if (!hasStream) return { dict, stream: null }

    let dataStart = streamIdx + 'stream'.length
    if (this.raw[dataStart] === '\r') dataStart++
    if (this.raw[dataStart] === '\n') dataStart++

    let length = this.resolveLength(dict)
    if (length === null) {
      const endStream = this.raw.indexOf('endstream', dataStart)
      length = endStream - dataStart
    }
    let bytes = this.buffer.subarray(dataStart, dataStart + length)
    if (/\/Filter\s*\/FlateDecode/.test(dict)) {
      try {
        bytes = inflateSync(bytes)
      } catch {
        return { dict, stream: null }
      }
    }
    return { dict, stream: bytes }
  }

  resolveLength(dict) {
    const direct = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/)
    if (direct) return Number(direct[1])
    const indirect = dict.match(/\/Length\s+(\d+)\s+\d+\s+R/)
    if (indirect) {
      const obj = this.getObject(Number(indirect[1]))
      const n = obj?.dict.match(/(\d+)/)
      if (n) return Number(n[1])
    }
    return null
  }

  /** Page object numbers in document order. */
  pageNumbers() {
    const catalogNum = this.findCatalog()
    const catalog = this.getObject(catalogNum)
    const pagesRef = catalog?.dict.match(/\/Pages\s+(\d+)\s+\d+\s+R/)
    if (!pagesRef) throw new Error('PDF: no /Pages found')
    const pages = []
    this.collectPages(Number(pagesRef[1]), pages, new Set())
    return pages
  }

  findCatalog() {
    for (const num of this.offsets.keys()) {
      const obj = this.getObject(num)
      if (obj && /\/Type\s*\/Catalog/.test(obj.dict)) return num
    }
    throw new Error('PDF: no /Catalog found')
  }

  collectPages(num, out, seen) {
    if (seen.has(num)) return
    seen.add(num)
    const obj = this.getObject(num)
    if (!obj) return
    if (/\/Type\s*\/Page[^s]/.test(obj.dict)) {
      out.push(num)
      return
    }
    const kids = obj.dict.match(/\/Kids\s*\[([\s\S]*?)\]/)
    if (!kids) return
    for (const ref of kids[1].matchAll(/(\d+)\s+\d+\s+R/g)) {
      this.collectPages(Number(ref[1]), out, seen)
    }
  }

  pageContent(pageNum) {
    const page = this.getObject(pageNum)
    if (!page) return ''
    const single = page.dict.match(/\/Contents\s+(\d+)\s+\d+\s+R/)
    const array = page.dict.match(/\/Contents\s*\[([\s\S]*?)\]/)
    const refs = []
    if (array) {
      for (const ref of array[1].matchAll(/(\d+)\s+\d+\s+R/g)) refs.push(Number(ref[1]))
    } else if (single) {
      refs.push(Number(single[1]))
    }
    return refs
      .map((r) => this.getObject(r)?.stream)
      .filter(Boolean)
      .map((b) => b.toString('latin1'))
      .join('\n')
  }
}

/** Tokenize a content stream into numbers, strings, names, arrays and operators. */
function* tokenize(content) {
  let i = 0
  const n = content.length
  while (i < n) {
    const c = content[i]
    if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0') {
      i++
      continue
    }
    if (c === '%') {
      while (i < n && content[i] !== '\n' && content[i] !== '\r') i++
      continue
    }
    if (c === '(') {
      let depth = 1
      const bytes = []
      i++
      while (i < n && depth > 0) {
        const ch = content[i]
        if (ch === '\\') {
          const next = content[i + 1]
          const simple = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 }
          if (next in simple) {
            bytes.push(simple[next])
            i += 2
          } else if (next >= '0' && next <= '7') {
            let oct = ''
            i++
            while (oct.length < 3 && content[i] >= '0' && content[i] <= '7') oct += content[i++]
            bytes.push(parseInt(oct, 8))
          } else if (next === '\n') {
            i += 2
          } else if (next === '\r') {
            i += content[i + 2] === '\n' ? 3 : 2
          } else {
            bytes.push(next.charCodeAt(0))
            i += 2
          }
          continue
        }
        if (ch === '(') depth++
        if (ch === ')') {
          depth--
          if (depth === 0) {
            i++
            break
          }
        }
        bytes.push(ch.charCodeAt(0))
        i++
      }
      yield { type: 'string', value: decodeWinAnsi(bytes) }
      continue
    }
    if (c === '<' && content[i + 1] !== '<') {
      const end = content.indexOf('>', i)
      const hex = content.slice(i + 1, end).replace(/\s+/g, '')
      const bytes = []
      for (let k = 0; k < hex.length; k += 2) bytes.push(parseInt(hex.slice(k, k + 2).padEnd(2, '0'), 16))
      yield { type: 'string', value: decodeWinAnsi(bytes) }
      i = end + 1
      continue
    }
    if (c === '<' && content[i + 1] === '<') {
      yield { type: 'op', value: '<<' }
      i += 2
      continue
    }
    if (c === '>' && content[i + 1] === '>') {
      yield { type: 'op', value: '>>' }
      i += 2
      continue
    }
    if (c === '[' || c === ']' || c === '{' || c === '}') {
      yield { type: 'op', value: c }
      i++
      continue
    }
    if (c === '/') {
      let j = i + 1
      while (j < n && !/[\s/[\]<>(){}%]/.test(content[j])) j++
      yield { type: 'name', value: content.slice(i + 1, j) }
      i = j
      continue
    }
    if (/[-+.\d]/.test(c)) {
      let j = i
      while (j < n && /[-+.\deE]/.test(content[j])) j++
      const num = Number(content.slice(i, j))
      if (!Number.isNaN(num)) {
        yield { type: 'number', value: num }
        i = j
        continue
      }
    }
    let j = i
    while (j < n && !/[\s/[\]<>(){}%]/.test(content[j])) j++
    if (j === i) j++
    yield { type: 'op', value: content.slice(i, j) }
    i = j
  }
}

const multiply = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
]

/**
 * Run the text-showing operators of a content stream and return every drawn
 * chunk with its device-space origin.
 *
 * @returns {{x:number,y:number,text:string}[]}
 */
export function extractChunks(content) {
  const chunks = []
  let tm = [1, 0, 0, 1, 0, 0]
  let tlm = [1, 0, 0, 1, 0, 0]
  let leading = 0
  let ctm = [1, 0, 0, 1, 0, 0]
  const stack = []
  const operands = []

  const show = (text) => {
    if (!text) return
    const m = multiply(tm, ctm)
    chunks.push({ x: m[4], y: m[5], text })
  }
  const nextLine = (tx, ty) => {
    tlm = multiply([1, 0, 0, 1, tx, ty], tlm)
    tm = tlm.slice()
  }

  for (const token of tokenize(content)) {
    if (token.type !== 'op') {
      operands.push(token)
      continue
    }
    const op = token.value
    const nums = operands.filter((o) => o.type === 'number').map((o) => o.value)
    switch (op) {
      case 'q':
        stack.push(ctm.slice())
        break
      case 'Q':
        ctm = stack.pop() ?? [1, 0, 0, 1, 0, 0]
        break
      case 'cm':
        if (nums.length >= 6) ctm = multiply(nums.slice(-6), ctm)
        break
      case 'BT':
        tm = [1, 0, 0, 1, 0, 0]
        tlm = tm.slice()
        break
      case 'Tm':
        if (nums.length >= 6) {
          tm = nums.slice(-6)
          tlm = tm.slice()
        }
        break
      case 'TL':
        leading = nums.at(-1) ?? leading
        break
      case 'Td':
        if (nums.length >= 2) nextLine(nums.at(-2), nums.at(-1))
        break
      case 'TD':
        if (nums.length >= 2) {
          leading = -nums.at(-1)
          nextLine(nums.at(-2), nums.at(-1))
        }
        break
      case 'T*':
        nextLine(0, -leading)
        break
      case 'Tj':
      case "'":
      case '"': {
        if (op !== 'Tj') nextLine(0, -leading)
        const str = operands.filter((o) => o.type === 'string').at(-1)
        show(str?.value ?? '')
        break
      }
      case ']': {
        // A TJ array is flushed on the following TJ operator; keep operands.
        break
      }
      case 'TJ': {
        const text = operands
          .filter((o) => o.type === 'string')
          .map((o) => o.value)
          .join('')
        show(text)
        break
      }
      default:
        break
    }
    if (op !== '[' && op !== ']') operands.length = 0
  }
  return chunks
}

/**
 * Extract every page of a PDF as positioned text chunks.
 *
 * @param {Buffer} buffer raw PDF bytes
 * @returns {{page:number, chunks:{x:number,y:number,text:string}[]}[]}
 */
export function extractPdfPages(buffer) {
  const pdf = new Pdf(buffer)
  return pdf.pageNumbers().map((num, index) => ({
    page: index + 1,
    chunks: extractChunks(pdf.pageContent(num)),
  }))
}

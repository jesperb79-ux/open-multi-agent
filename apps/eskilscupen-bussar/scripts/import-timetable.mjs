#!/usr/bin/env node
/**
 * Import the Eskilscupen bus timetable PDF into normalised JSON.
 *
 *   node scripts/import-timetable.mjs [--pdf <path>] [--out <dir>] [--report <path>]
 *
 * The PDF is read, never written. Output:
 *   src/data/timetable.json   stops, routes, services and trips (stop sequences)
 *   src/data/venues.json      football venue -> stop bindings
 *   data/import-report.json   every row/column that was rejected or looked odd
 *
 * How the PDF is read: each timetable page is a grid where every row is a stop
 * and every column is one departure (one trip). We pull positioned text chunks
 * out of the PDF, group them into rows by y, then cluster the times of a block
 * by x so that a column = a trip. That preserves the stop order per trip, which
 * is what a transfer planner needs.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractPdfPages } from './pdf-text.mjs'
import { STOPS, VENUES, SERVICES, SERVICE_PATTERNS } from './stop-config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

/** Two chunks belong to the same row when their baselines are this close. */
const ROW_TOLERANCE = 2.5
/** Two times belong to the same column when their x origins are this close. */
const COLUMN_TOLERANCE = 12
/** A backwards time jump larger than this is read as "past midnight". */
const MIDNIGHT_WRAP_THRESHOLD_MIN = 12 * 60

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

// ---------------------------------------------------------------- utilities

const normaliseLabel = (s) => s.replace(/\s+/g, ' ').trim()

/** "06:25:00" -> 385. Returns null when the value is not a valid clock time. */
export function parseTimeToMinutes(value) {
  const m = TIME_RE.exec(value.trim())
  if (!m) return null
  const hours = Number(m[1])
  const minutes = Number(m[2])
  const seconds = m[3] === undefined ? 0 : Number(m[3])
  if (hours > 47 || minutes > 59 || seconds > 59) return null
  if (seconds !== 0) return null // the source only ever uses whole minutes
  return hours * 60 + minutes
}

/** 385 -> "06:25". Minutes past 24:00 keep counting ("24:10" = 00:10 next day). */
export function formatMinutes(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const looksLikeTime = (s) => TIME_RE.test(s.trim())

// ------------------------------------------------------------ stop registry

export function buildStopIndex() {
  const byLabel = new Map()
  for (const stop of STOPS) {
    byLabel.set(normaliseLabel(stop.name).toLowerCase(), stop.id)
    for (const alias of stop.aliases ?? []) {
      byLabel.set(normaliseLabel(alias).toLowerCase(), stop.id)
    }
  }
  return byLabel
}

// --------------------------------------------------------------- page model

/** Group a page's chunks into rows ordered top to bottom. */
export function toRows(chunks) {
  const sorted = [...chunks].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  for (const chunk of sorted) {
    const last = rows[rows.length - 1]
    if (last && Math.abs(last.y - chunk.y) <= ROW_TOLERANCE) {
      last.items.push(chunk)
      last.y = (last.y * (last.items.length - 1) + chunk.y) / last.items.length
    } else {
      rows.push({ y: chunk.y, items: [chunk] })
    }
  }
  for (const row of rows) row.items.sort((a, b) => a.x - b.x)
  return rows
}

/**
 * Read "LINJE 11 NORRUT FREDAG & LÖRDAG" out of a page.
 * Returns null for pages without a timetable header (page 1 is an index whose
 * lines also start with "Linje", hence the direction word is required).
 */
function readPageHeader(rows) {
  const text = rows
    .map((r) => r.items.map((i) => i.text).join(' '))
    .find((line) => /LINJE\s*\d+\s*(NORRUT|SÖDERUT|NORR\s*\/\s*SÖDERUT)/i.test(line))
  if (!text) return null
  const route = /LINJE\s*(\d+)/i.exec(text)
  const service = SERVICE_PATTERNS.find((s) => s.pattern.test(text))
  const direction = /NORR\s*\/\s*SÖDERUT/i.test(text)
    ? 'norr/söderut'
    : /NORRUT/i.test(text)
      ? 'norrut'
      : /SÖDERUT/i.test(text)
        ? 'söderut'
        : null
  return {
    text: normaliseLabel(text.replace(/BUSSLINJER ESKILSCUPEN \d+/i, '')),
    routeId: route ? route[1] : null,
    serviceId: service ? service.serviceId : null,
    direction,
  }
}

const isSeparatorRow = (row) => row.items.every((i) => /^\/+$/.test(i.text.trim()))

const isChromeRow = (row) =>
  row.items.some((i) => /BUSSLINJER ESKILSCUPEN|LINJE\s*\d+/i.test(i.text)) ||
  row.items.every((i) => /^sid\s*\d+$/i.test(i.text.trim()) || i.text.trim() === '')

/**
 * Split a page into blocks of consecutive stop rows.
 * A block is one printed sub-table: same stops, one column per departure.
 */
export function toBlocks(rows, page, issues) {
  const blocks = []
  let current = []
  const flush = () => {
    if (current.length) blocks.push(current)
    current = []
  }
  for (const row of rows) {
    if (isSeparatorRow(row)) {
      flush()
      continue
    }
    if (isChromeRow(row)) continue
    const [label, ...rest] = row.items
    if (!label) continue
    const labelText = normaliseLabel(label.text)
    if (!labelText) continue
    if (looksLikeTime(labelText)) {
      issues.push({
        level: 'error',
        code: 'row-without-stop-label',
        page,
        detail: `Rad utan hållplatsnamn: ${row.items.map((i) => i.text).join(' ')}`,
      })
      continue
    }
    if (rest.length === 0) {
      issues.push({ level: 'warning', code: 'row-without-times', page, detail: `Hållplatsrad utan tider: "${labelText}"` })
      continue
    }
    current.push({ label: labelText, cells: rest })
  }
  flush()
  return blocks
}

/** Cluster the x positions of every time cell in a block into trip columns. */
function columnsOf(block) {
  const xs = []
  for (const row of block) for (const cell of row.cells) xs.push(cell.x)
  xs.sort((a, b) => a - b)
  const centers = []
  for (const x of xs) {
    const last = centers[centers.length - 1]
    if (last && x - last.sum / last.n <= COLUMN_TOLERANCE) {
      last.sum += x
      last.n += 1
    } else {
      centers.push({ sum: x, n: 1 })
    }
  }
  return centers.map((c) => c.sum / c.n)
}

const nearestColumn = (columns, x) => {
  let best = 0
  for (let i = 1; i < columns.length; i++) {
    if (Math.abs(columns[i] - x) < Math.abs(columns[best] - x)) best = i
  }
  return best
}

// ------------------------------------------------------------------ importer

/**
 * Turn positioned PDF pages into trips.
 *
 * @returns {{trips: object[], issues: object[], unknownLabels: Map<string, number>}}
 */
export function buildTrips(pages, stopIndex) {
  const issues = []
  const unknownLabels = new Map()
  const trips = []

  for (const { page, chunks } of pages) {
    const rows = toRows(chunks)
    const header = readPageHeader(rows)
    if (!header) continue // page 1 is the index, it has no LINJE header
    if (!header.routeId || !header.serviceId) {
      issues.push({
        level: 'error',
        code: 'unreadable-page-header',
        page,
        detail: `Kunde inte läsa linje/trafikdygn ur rubriken: "${header.text}"`,
      })
      continue
    }

    const blocks = toBlocks(rows, page, issues)
    blocks.forEach((block, blockIndex) => {
      const columns = columnsOf(block)
      /** @type {{stopId: string, label: string, minutes: number}[][]} */
      const columnStops = columns.map(() => [])
      /** How many stop rows the printed sub-table has, for the verification file. */
      let blockStopCount = 0

      for (const row of block) {
        const stopId = stopIndex.get(row.label.toLowerCase())
        if (!stopId) {
          unknownLabels.set(row.label, (unknownLabels.get(row.label) ?? 0) + 1)
          issues.push({
            level: 'error',
            code: 'unknown-stop-label',
            page,
            block: blockIndex + 1,
            detail: `Okänt hållplatsnamn "${row.label}" — lägg till den i scripts/stop-config.mjs`,
          })
          continue
        }
        blockStopCount += 1
        for (const cell of row.cells) {
          const raw = cell.text.trim()
          const minutes = parseTimeToMinutes(raw)
          if (minutes === null) {
            issues.push({
              level: 'error',
              code: 'invalid-time',
              page,
              block: blockIndex + 1,
              detail: `Ogiltig tid "${raw}" vid hållplats "${row.label}"`,
            })
            continue
          }
          columnStops[nearestColumn(columns, cell.x)].push({ stopId, label: row.label, minutes })
        }
      }

      columnStops.forEach((stopTimes, columnIndex) => {
        const tripId = `${header.routeId}-${header.serviceId}-p${page}b${blockIndex + 1}c${columnIndex + 1}`
        const source = {
          page,
          block: blockIndex + 1,
          column: columnIndex + 1,
          columnX: Math.round(columns[columnIndex] * 10) / 10,
        }
        if (stopTimes.length === 0) return
        if (stopTimes.length < 2) {
          issues.push({
            level: 'warning',
            code: 'incomplete-trip',
            page,
            block: blockIndex + 1,
            tripId,
            detail: `Tur med bara en hållplats (${stopTimes[0].label} ${formatMinutes(stopTimes[0].minutes)}) — ignorerad`,
          })
          return
        }

        // Roll the clock forward when the printed times pass midnight.
        let rejected = false
        const rolled = []
        let dayShift = 0
        for (let i = 0; i < stopTimes.length; i++) {
          const value = stopTimes[i].minutes + dayShift
          const prev = rolled[i - 1]
          if (prev && value < prev.minutes) {
            const drop = prev.minutes - value
            if (drop >= MIDNIGHT_WRAP_THRESHOLD_MIN) {
              dayShift += 24 * 60
            } else {
              issues.push({
                level: 'error',
                code: 'non-monotonic-times',
                page,
                block: blockIndex + 1,
                tripId,
                detail:
                  `Ankomst före avgång: ${prev.label} ${formatMinutes(prev.minutes)} → ` +
                  `${stopTimes[i].label} ${formatMinutes(stopTimes[i].minutes)} — turen avvisad`,
              })
              rejected = true
              break
            }
          }
          rolled.push({ stopId: stopTimes[i].stopId, minutes: stopTimes[i].minutes + dayShift })
        }
        if (rejected) return

        trips.push({
          id: tripId,
          routeId: header.routeId,
          serviceId: header.serviceId,
          direction: header.direction,
          page,
          source,
          blockStopCount,
          skipsStops: rolled.length < blockStopCount,
          headsign: rolled[rolled.length - 1].stopId,
          stopTimes: rolled.map((s) => ({ stopId: s.stopId, time: formatMinutes(s.minutes) })),
        })
      })
    })
  }

  return { trips, issues, unknownLabels }
}

/** Drop trips whose route + service + stop/time sequence is already present. */
export function dedupeTrips(trips, issues) {
  const seen = new Map()
  const kept = []
  for (const trip of trips) {
    const key = [
      trip.routeId,
      trip.serviceId,
      ...trip.stopTimes.map((s) => `${s.stopId}@${s.time}`),
    ].join('|')
    const first = seen.get(key)
    if (first) {
      issues.push({
        level: 'warning',
        code: 'duplicate-trip',
        page: trip.page,
        tripId: trip.id,
        detail: `Identisk med ${first} (samma linje, trafikdygn, hållplatser och tider) — dubbletten togs bort`,
      })
      continue
    }
    seen.set(key, trip.id)
    kept.push(trip)
  }
  return kept
}

function main() {
  const args = process.argv.slice(2)
  const argOf = (name, fallback) => {
    const i = args.indexOf(name)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
  }
  const pdfPath = resolve(ROOT, argOf('--pdf', 'data/busslinjer2026eskilscupen.pdf'))
  const outDir = resolve(ROOT, argOf('--out', 'src/data'))
  const reportPath = resolve(ROOT, argOf('--report', 'data/import-report.json'))

  const buffer = readFileSync(pdfPath)
  const sha256 = createHash('sha256').update(buffer).digest('hex')
  const pages = extractPdfPages(buffer)

  const stopIndex = buildStopIndex()
  const { trips: rawTrips, issues, unknownLabels } = buildTrips(pages, stopIndex)
  const trips = dedupeTrips(rawTrips, issues)

  // Venue bindings must resolve to stops that actually exist and are served.
  const stopIds = new Set(STOPS.map((s) => s.id))
  const servedStopIds = new Set(trips.flatMap((t) => t.stopTimes.map((s) => s.stopId)))
  for (const venue of VENUES) {
    if (venue.stopIds.length === 0) {
      issues.push({
        level: 'error',
        code: 'venue-without-stop',
        detail: `Fotbollsplanen "${venue.name}" saknar kopplad hållplats`,
      })
    }
    for (const stopId of venue.stopIds) {
      if (!stopIds.has(stopId)) {
        issues.push({
          level: 'error',
          code: 'venue-without-stop',
          detail: `Fotbollsplanen "${venue.name}" pekar på okänd hållplats "${stopId}"`,
        })
      } else if (!servedStopIds.has(stopId)) {
        issues.push({
          level: 'error',
          code: 'venue-stop-without-departures',
          detail: `Hållplatsen "${stopId}" (${venue.name}) har inga avgångar i tidtabellen`,
        })
      }
    }
    if (venue.unresolved) {
      issues.push({
        level: 'warning',
        code: 'venue-stops-unresolved',
        detail: `${venue.name}: ${venue.unresolved}`,
      })
    }
  }

  for (const stop of STOPS) {
    if (!servedStopIds.has(stop.id)) {
      issues.push({
        level: 'warning',
        code: 'stop-without-departures',
        detail: `Hållplatsen "${stop.name}" finns i konfigurationen men har inga avgångar i tidtabellen`,
      })
    }
  }

  const routeIds = [...new Set(trips.map((t) => t.routeId))].sort((a, b) => Number(a) - Number(b))
  const timetable = {
    source: { file: pdfPath.slice(pdfPath.lastIndexOf('/') + 1), sha256, pages: pages.length },
    services: SERVICES,
    routes: routeIds.map((id) => ({ id, name: `Linje ${id}` })),
    stops: STOPS.filter((s) => servedStopIds.has(s.id)).map(({ id, name }) => ({ id, name })),
    trips: trips.map(({ id, routeId, serviceId, headsign, stopTimes }) => ({
      id,
      routeId,
      serviceId,
      headsign,
      stopTimes,
    })),
  }

  const connectionCount = trips.reduce((sum, t) => sum + t.stopTimes.length - 1, 0)
  const errors = issues.filter((i) => i.level === 'error')
  const report = {
    source: timetable.source,
    summary: {
      pages: pages.length,
      routes: timetable.routes.length,
      stops: timetable.stops.length,
      trips: trips.length,
      connections: connectionCount,
      duplicatesRemoved: rawTrips.length - trips.length,
      tripsRejected: errors.filter((i) => i.code === 'non-monotonic-times' || i.code === 'invalid-time').length,
      errors: errors.length,
      warnings: issues.length - errors.length,
    },
    unknownStopLabels: [...unknownLabels.entries()].map(([label, count]) => ({ label, count })),
    issues,
  }

  mkdirSync(outDir, { recursive: true })
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(resolve(outDir, 'timetable.json'), `${JSON.stringify(timetable)}\n`)
  writeFileSync(
    resolve(outDir, 'venues.json'),
    `${JSON.stringify(VENUES, null, 2)}\n`,
  )
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  const { summary } = report
  console.log(
    `Importerade ${summary.trips} turer (${summary.connections} förbindelser) ` +
      `på ${summary.routes} linjer och ${summary.stops} hållplatser från ${summary.pages} sidor.`,
  )
  console.log(`Fel: ${summary.errors}, varningar: ${summary.warnings}. Rapport: ${reportPath}`)
  if (summary.errors > 0) {
    for (const issue of errors.slice(0, 20)) console.error(`  [${issue.code}] sid ${issue.page ?? '-'}: ${issue.detail}`)
    process.exitCode = 1
  }
}

// Only run the importer when the file is executed directly, so tests can
// import the helpers above.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}

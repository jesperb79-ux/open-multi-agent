#!/usr/bin/env node
/**
 * Skriv en manuell verifieringsfil: ett urval importerade turer i läsbar form,
 * så att PDF:en och den normaliserade JSON-filen kan jämföras rad för rad.
 *
 *   node scripts/verify-import.mjs [--pdf <path>] [--out <path>]
 *
 * Urvalet väljs så att de knepiga fallen alltid finns med:
 *   - sidor som delas av "//" (flera deltabeller per sida)
 *   - kolumner med tomma hållplatsceller
 *   - linje 17:s snabbturer
 *   - dubblettkolumner
 *   - både fredag/lördag och söndag
 *   - båda riktningarna
 *
 * Skriptet kör importens egna funktioner FÖRE dubblettborttagningen, så att
 * även borttagna kolumner kan visas tillsammans med sin tvilling.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractPdfPages } from './pdf-text.mjs'
import { buildStopIndex, buildTrips } from './import-timetable.mjs'
import { STOPS } from './stop-config.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const stopNames = new Map(STOPS.map((s) => [s.id, s.name]))
const stopLabel = (id) => stopNames.get(id) ?? id
const serviceLabel = (id) => (id === 'fre-lor' ? 'Fredag & lördag' : id === 'sondag' ? 'Söndag' : id)

/** Key that identifies an exact duplicate column. */
const duplicateKey = (trip) =>
  [trip.routeId, trip.serviceId, ...trip.stopTimes.map((s) => `${s.stopId}@${s.time}`)].join('|')

/** Turn a trip into the block of text a human compares against the PDF. */
function renderTrip(trip, annotations) {
  const lines = []
  lines.push(`### ${trip.id}`)
  lines.push('')
  lines.push(`| Fält | Värde |`)
  lines.push(`| --- | --- |`)
  lines.push(`| PDF-sida | ${trip.source.page} |`)
  lines.push(`| Deltabell på sidan | ${trip.source.block} |`)
  lines.push(`| Kolumn i deltabellen | ${trip.source.column} (x ≈ ${trip.source.columnX}) |`)
  lines.push(`| Linje | ${trip.routeId} |`)
  lines.push(`| Trafikdag | ${serviceLabel(trip.serviceId)} |`)
  lines.push(`| Riktning | ${trip.direction ?? 'okänd'} |`)
  lines.push(`| Antal hållplatser | ${trip.stopTimes.length} av ${trip.blockStopCount} i deltabellen |`)
  for (const note of annotations) lines.push(`| Kontrollerar | ${note} |`)
  lines.push('')
  lines.push('| # | Tid | Hållplats |')
  lines.push('| --- | --- | --- |')
  trip.stopTimes.forEach((stopTime, index) => {
    lines.push(`| ${index + 1} | ${stopTime.time} | ${stopLabel(stopTime.stopId)} |`)
  })
  lines.push('')
  return lines.join('\n')
}

function main() {
  const args = process.argv.slice(2)
  const argOf = (name, fallback) => {
    const i = args.indexOf(name)
    return i !== -1 && args[i + 1] ? args[i + 1] : fallback
  }
  const pdfPath = resolve(ROOT, argOf('--pdf', 'data/busslinjer2026eskilscupen.pdf'))
  const outPath = resolve(ROOT, argOf('--out', 'data/verification-sample.md'))

  const buffer = readFileSync(pdfPath)
  const pages = extractPdfPages(buffer)
  const { trips } = buildTrips(pages, buildStopIndex())

  // Which trips are exact duplicates of another column?
  const byKey = new Map()
  for (const trip of trips) {
    const key = duplicateKey(trip)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(trip)
  }
  const duplicateGroups = [...byKey.values()].filter((group) => group.length > 1)
  const duplicateOf = new Map()
  for (const group of duplicateGroups) {
    for (const trip of group.slice(1)) duplicateOf.set(trip.id, group[0].id)
  }

  const blocksPerPage = new Map()
  for (const trip of trips) {
    blocksPerPage.set(trip.source.page, Math.max(blocksPerPage.get(trip.source.page) ?? 0, trip.source.block))
  }

  /** @type {{trip: object, notes: string[]}[]} */
  const selected = []
  const chosen = new Set()
  const pick = (trip, note) => {
    if (!trip) return
    const existing = selected.find((s) => s.trip.id === trip.id)
    if (existing) {
      if (!existing.notes.includes(note)) existing.notes.push(note)
      return
    }
    chosen.add(trip.id)
    selected.push({ trip, notes: [note] })
  }

  const find = (predicate) => trips.find(predicate)
  const findAll = (predicate) => trips.filter(predicate)

  // 1. En tur per linje, med båda trafikdagarna representerade.
  const routeIds = [...new Set(trips.map((t) => t.routeId))].sort((a, b) => Number(a) - Number(b))
  for (const routeId of routeIds) {
    pick(
      find((t) => t.routeId === routeId && t.serviceId === 'fre-lor' && !t.skipsStops),
      `Linje ${routeId}, fredag/lördag, komplett tur`,
    )
    pick(
      find((t) => t.routeId === routeId && t.serviceId === 'sondag' && !t.skipsStops),
      `Linje ${routeId}, söndag, komplett tur`,
    )
  }

  // 2. Sidor med flera deltabeller (rader med "//" i PDF:en).
  for (const [page, blockCount] of [...blocksPerPage.entries()].sort((a, b) => a[0] - b[0])) {
    if (blockCount < 2) continue
    for (let block = 1; block <= Math.min(blockCount, 2); block++) {
      pick(
        find((t) => t.source.page === page && t.source.block === block),
        `Sid ${page} är delad av "//" — deltabell ${block} av ${blockCount}`,
      )
    }
    if (selected.length > 24) break
  }

  // 3. Turer med tomma hållplatsceller (kolumnen hoppar över hållplatser).
  for (const trip of findAll((t) => t.skipsStops).slice(0, 3)) {
    pick(
      trip,
      `Tomma celler: kolumnen har ${trip.stopTimes.length} tider av ${trip.blockStopCount} hållplatsrader`,
    )
  }

  // 4. Linje 17:s snabbturer — de som hoppar över mellanliggande hållplatser.
  for (const trip of findAll((t) => t.routeId === '17' && t.skipsStops)) {
    pick(trip, 'Snabbtur på linje 17: hoppar över mellanliggande hållplatser')
  }
  pick(
    find((t) => t.routeId === '17' && !t.skipsStops),
    'Linje 17, vanlig tur — jämför med snabbturen ovan',
  )

  // 5. Dubblettkolumner: båda kolumnerna i gruppen tas med.
  for (const group of duplicateGroups.slice(0, 2)) {
    pick(group[0], `Dubblettkolumn: originalet, behålls i användarens resultat`)
    pick(
      group[1],
      `Dubblettkolumn: identisk med ${group[0].id} (sid ${group[0].source.page}, kolumn ${group[0].source.column}) — filtreras bort ur resultatet`,
    )
  }

  // 6. Båda riktningarna på en linje som har separata sidor.
  pick(
    find((t) => t.routeId === '11' && t.direction === 'norrut'),
    'Riktning norrut',
  )
  pick(
    find((t) => t.routeId === '11' && t.direction === 'söderut'),
    'Riktning söderut',
  )

  selected.sort(
    (a, b) => a.trip.source.page - b.trip.source.page || a.trip.source.column - b.trip.source.column,
  )

  const out = []
  out.push('# Manuell verifiering av tidtabellsimporten')
  out.push('')
  out.push(`Källa: \`${basename(pdfPath)}\` (${pages.length} sidor).`)
  out.push('')
  out.push(
    'Filen är genererad av `npm run verify:import`. Jämför varje tur nedan med ' +
      'motsvarande kolumn i PDF:en: gå till angiven sida, räkna dig fram till ' +
      'kolumnen och läs av tiderna uppifrån och ned.',
  )
  out.push('')
  out.push('## Sammanfattning')
  out.push('')
  out.push(`- Turer i urvalet: **${selected.length}**`)
  out.push(`- Totalt antal importerade kolumner: **${trips.length}**`)
  out.push(`- Dubblettgrupper i PDF:en: **${duplicateGroups.length}**`)
  out.push(`- Turer som hoppar över hållplatser: **${findAll((t) => t.skipsStops).length}**`)
  out.push('')
  out.push('| Tur | Sida | Deltabell | Kolumn | Linje | Trafikdag | Riktning | Hållplatser | Kontrollerar |')
  out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const { trip, notes } of selected) {
    out.push(
      `| \`${trip.id}\` | ${trip.source.page} | ${trip.source.block} | ${trip.source.column} | ` +
        `${trip.routeId} | ${serviceLabel(trip.serviceId)} | ${trip.direction ?? '–'} | ` +
        `${trip.stopTimes.length}/${trip.blockStopCount} | ${notes.join('; ')} |`,
    )
  }
  out.push('')
  out.push('## Turer')
  out.push('')
  for (const { trip, notes } of selected) {
    const extra = duplicateOf.has(trip.id) ? [...notes, `Identisk med ${duplicateOf.get(trip.id)}`] : notes
    out.push(renderTrip(trip, extra))
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${out.join('\n')}\n`)
  console.log(`Skrev ${selected.length} turer till ${outPath}`)
  if (selected.length < 15) {
    console.error('För få turer i urvalet — minst 15 krävs.')
    process.exitCode = 1
  }
}

main()

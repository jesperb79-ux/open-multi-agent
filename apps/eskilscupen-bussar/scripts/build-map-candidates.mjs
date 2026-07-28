#!/usr/bin/env node
/**
 * Bygger en komplett kandidatlista över allt som ska kunna öppnas i Google
 * Maps: varje spelplats i venue-konfigurationen och varje hållplats i
 * tidtabellen, med alla namnvarianter som förekommer i underlaget.
 *
 *   node scripts/build-map-candidates.mjs [--out data/map-candidates.json]
 *
 * Listan är indata till matchningen mot Google Maps. Den innehåller inga
 * koordinater och inga gissningar — bara namn, alias och källhänvisningar.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STOPS, VENUES } from './stop-config.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Officiella namn och kartreferenser ur Eskilscupens eget material. */
const OFFICIAL = {
  'norrvalla-ip': { officialName: 'Norrvalla IP', zone: 'C3' },
  'harlyckan-ip': { officialName: 'Harlyckans IP', zone: 'C4' },
  olympia: { officialName: 'Olympia' },
  'filborna-ip': { officialName: 'Filborna IP' },
  'vastergard-ip': { officialName: 'Västergårds IP' },
  'attekulla-ip': { officialName: 'Ättekulla IP' },
  'larods-ip': { officialName: 'Laröds IP' },
  'rydeback-ip': { officialName: 'Rydebäcks IP' },
  'maria-park-ip': { officialName: 'Maria Park IP' },
  'allerums-ip': { officialName: 'Allerums IP' },
}

const CUP_SOURCES = [
  'https://www.eskilscupen.nu/sv/spelplaner-adress-gps',
  'https://www.eskilscupen.nu/spelplaner-kartor',
  'https://static.cupmanager.net/uploads/8/y/0C4/eskilscupen-karta-2025.pdf',
]
const TIMETABLE_SOURCE = 'data/busslinjer2026eskilscupen.pdf'

function main() {
  const args = process.argv.slice(2)
  const outIndex = args.indexOf('--out')
  const outPath = resolve(ROOT, outIndex !== -1 && args[outIndex + 1] ? args[outIndex + 1] : 'data/map-candidates.json')

  const stopById = new Map(STOPS.map((stop) => [stop.id, stop]))

  const venueCandidates = VENUES.map((venue) => {
    const official = OFFICIAL[venue.id] ?? {}
    const notes = []
    if (venue.note) notes.push(venue.note)
    if (venue.unresolved) notes.push(venue.unresolved)
    if (venue.stopIds.length > 1) {
      notes.push(`Nås från ${venue.stopIds.length} hållplatser: ${venue.stopIds.join(', ')}.`)
    }
    return {
      id: venue.id,
      appName: venue.name,
      ...(official.officialName ? { officialName: official.officialName } : {}),
      type: 'venue',
      // Planens alias är hållplatsnamnen den nås från.
      aliases: venue.stopIds.map((stopId) => stopById.get(stopId)?.name).filter(Boolean),
      sourceUrls: CUP_SOURCES,
      sourceYear: 2025,
      ...(official.zone ? { mapReference: official.zone } : {}),
      ...(notes.length ? { notes } : {}),
    }
  })

  const stopCandidates = STOPS.map((stop) => {
    const servingVenues = VENUES.filter((venue) => venue.stopIds.includes(stop.id))
    const notes = []
    if (servingVenues.length) {
      notes.push(`Betjänar ${servingVenues.map((v) => v.name).join(', ')}.`)
    }
    if (servingVenues.some((v) => v.unresolved)) {
      notes.push('Planen nås från flera hållplatser som inte är utredda.')
    }
    return {
      id: stop.id,
      appName: stop.name,
      type: 'bus-stop',
      // Varje stavning som PDF:en använder.
      aliases: stop.aliases ?? [],
      sourceUrls: [TIMETABLE_SOURCE],
      sourceYear: 2026,
      ...(notes.length ? { notes } : {}),
    }
  })

  const candidates = [...venueCandidates, ...stopCandidates]
  const document = {
    generatedFrom: 'scripts/stop-config.mjs',
    counts: {
      total: candidates.length,
      venues: venueCandidates.length,
      busStops: stopCandidates.length,
      withOfficialName: candidates.filter((c) => c.officialName).length,
      withAliases: candidates.filter((c) => c.aliases.length > 0).length,
    },
    candidates,
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`)
  const { counts } = document
  console.log(
    `Skrev ${counts.total} kandidater (${counts.venues} spelplatser, ${counts.busStops} hållplatser, ` +
      `${counts.withOfficialName} med officiellt namn) till ${outPath}`,
  )
}

main()

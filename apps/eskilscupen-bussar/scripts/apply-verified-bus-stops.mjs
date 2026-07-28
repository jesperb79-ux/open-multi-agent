#!/usr/bin/env node
/**
 * Läser in manuellt verifierade hållplatslägen i navigeringsregistret.
 *
 *   node scripts/apply-verified-bus-stops.mjs [--dry-run]
 *
 * Källan är data/verified-bus-stops.json, ifylld för hand enligt
 * docs/bus-stop-manual-verification.md. Miljön kommer inte åt någon karttjänst,
 * så koordinaterna måste komma från en människa som faktiskt tittat.
 *
 * Skriptet är avsiktligt strängt. En halvfärdig eller motsägelsefull fil ska
 * inte kunna skriva sönder ett register som i dag fungerar, så *ingenting*
 * skrivs om någon post är ogiltig — inte ens de poster som råkar vara korrekta.
 * Antingen går hela filen igenom, eller så avbryts körningen med en förklaring.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Klassificeringar som ger en Navigera-knapp i appen. */
export const SHOWN_CLASSIFICATIONS = [
  'exact-public-transit-stop',
  'exact-cup-stop',
  'probable-cup-stop',
]

/** Alla tillåtna klassificeringar. `unverified` visar ingen knapp. */
export const CLASSIFICATIONS = [...SHOWN_CLASSIFICATIONS, 'unverified']

/** Texten en probable-cup-stop ska visa i gränssnittet. */
export const CUP_SIGNAGE_NOTICE = 'Följ Eskilscupens skyltning på plats.'

/** Grovt hörn kring Helsingborg med omland. Fångar tecken- och teckenbyten. */
const BOUNDS = { minLat: 55.85, maxLat: 56.25, minLng: 12.5, maxLng: 13.15 }

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

/**
 * Är länken en Google Maps-adress som pekar ut en plats?
 *
 * Bara google.com-värdar accepteras — en förkortad eller vidarelänkad adress
 * går inte att granska, och en länk till fel tjänst ska inte smyga in.
 */
export function parseGoogleMapsUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return { ok: false, reason: 'googleMapsUrl är ingen giltig adress' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'googleMapsUrl måste använda https' }
  }
  // Ankrat i båda ändar och utan punkt i toppdomänen, annars släpps
  // google.com.something-else.example igenom.
  if (!/^(www\.)?google\.(com|se|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(url.hostname)) {
    return { ok: false, reason: `googleMapsUrl pekar på ${url.hostname}, inte på google.com` }
  }
  if (!url.pathname.startsWith('/maps')) {
    return { ok: false, reason: 'googleMapsUrl pekar inte på /maps' }
  }
  return { ok: true, url }
}

/** Ligger koordinaten inom Helsingborg med omland? */
export function coordinateProblem(latitude, longitude) {
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    return 'latitude och longitude måste vara tal'
  }
  // Prövas före ramen: 0,0 är ett ofyllt fält, inte en plats i Atlanten.
  if (latitude === 0 && longitude === 0) return 'latitude och longitude är fortfarande 0'
  if (latitude < BOUNDS.minLat || latitude > BOUNDS.maxLat) {
    return `latitude ${latitude} ligger utanför Helsingborg med omland`
  }
  if (longitude < BOUNDS.minLng || longitude > BOUNDS.maxLng) {
    return `longitude ${longitude} ligger utanför Helsingborg med omland`
  }
  return null
}

/**
 * Granskar en enskild post.
 *
 * @returns {{stopId: string, problems: string[], entry?: object}}
 */
export function validateEntry(stopId, raw, knownStopIds) {
  const problems = []

  if (!knownStopIds.has(stopId)) {
    problems.push(`okänt stopId "${stopId}" — finns inte i tidtabellen`)
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { stopId, problems: [...problems, 'posten är inget objekt'] }
  }

  const { googleMapsUrl, latitude, longitude, classification, verified, note } = raw

  if (verified !== true) {
    problems.push('verified måste vara true')
  }
  if (!CLASSIFICATIONS.includes(classification)) {
    problems.push(
      `classification "${classification}" är inte en av ${CLASSIFICATIONS.join(', ')}`,
    )
  }

  const hasUrl = typeof googleMapsUrl === 'string' && googleMapsUrl.trim() !== ''
  const hasCoordinates = latitude !== undefined || longitude !== undefined

  if (classification === 'unverified') {
    // Obekräftad hållplats får ingen knapp, och därmed inget mål alls.
    if (hasUrl || hasCoordinates) {
      problems.push('unverified får varken googleMapsUrl eller koordinater')
    }
    if (!note) problems.push('unverified kräver en note som förklarar varför')
    return problems.length ? { stopId, problems } : { stopId, problems, entry: { classification, note } }
  }

  if (!hasUrl && !hasCoordinates) {
    problems.push('posten saknar både googleMapsUrl och koordinater')
  }

  let coordinates
  if (hasCoordinates) {
    const problem = coordinateProblem(latitude, longitude)
    if (problem) problems.push(problem)
    else coordinates = { latitude, longitude }
  }

  let url
  if (hasUrl) {
    const parsed = parseGoogleMapsUrl(googleMapsUrl)
    if (!parsed.ok) problems.push(parsed.reason)
    else url = googleMapsUrl
  }

  if (!note) {
    problems.push('note saknas — skriv vad som kontrollerades')
  }

  if (problems.length) return { stopId, problems }
  return {
    stopId,
    problems,
    entry: {
      classification,
      ...(coordinates ?? {}),
      ...(url ? { googleMapsUrl: url } : {}),
      note,
    },
  }
}

/**
 * Granskar hela filen.
 *
 * @returns {{ok: boolean, entries: Record<string, object>, problems: string[], skipped: string[]}}
 */
export function validateDocument(document, knownStopIds) {
  const problems = []
  const entries = {}
  const skipped = []

  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    return { ok: false, entries, problems: ['filen innehåller inget objekt'], skipped }
  }
  const stops = document.stops
  if (stops === undefined) {
    return { ok: false, entries, problems: ['filen saknar fältet "stops"'], skipped }
  }
  if (stops === null || typeof stops !== 'object' || Array.isArray(stops)) {
    return { ok: false, entries, problems: ['"stops" är inget objekt'], skipped }
  }

  for (const [stopId, raw] of Object.entries(stops)) {
    const result = validateEntry(stopId, raw, knownStopIds)
    if (result.problems.length) {
      problems.push(...result.problems.map((p) => `${stopId}: ${p}`))
      continue
    }
    if (result.entry.classification === 'unverified') skipped.push(stopId)
    else entries[stopId] = result.entry
  }

  // Allt eller inget: en trasig post gör hela filen oanvändbar, så inte ens de
  // korrekta posterna lämnas ut. Annars kunde en anropare skriva halva
  // registret och tro att det var fullständigt.
  if (problems.length) return { ok: false, entries: {}, problems, skipped: [] }
  return { ok: true, entries, problems, skipped }
}

/** Navigeringsmålet: koordinaten när den finns, annars den färdiga länken. */
export function destinationFor(entry) {
  if (entry.latitude !== undefined && entry.longitude !== undefined) {
    return `${entry.latitude},${entry.longitude}`
  }
  return entry.googleMapsUrl
}

function main() {
  const dryRun = process.argv.includes('--dry-run')
  const sourcePath = resolve(APP, 'data/verified-bus-stops.json')
  const targetPath = resolve(APP, 'data/bus-stop-navigation.json')

  const timetable = JSON.parse(readFileSync(resolve(APP, 'src/data/timetable.json'), 'utf8'))
  const stopNames = new Map(timetable.stops.map((stop) => [stop.id, stop.name]))
  const knownStopIds = new Set(stopNames.keys())

  let document
  try {
    document = JSON.parse(readFileSync(sourcePath, 'utf8'))
  } catch (error) {
    console.error(`Kunde inte läsa ${sourcePath}: ${error.message}`)
    process.exit(1)
  }

  const result = validateDocument(document, knownStopIds)

  if (!result.ok) {
    console.error(`\nAvbryter — ${result.problems.length} problem i verified-bus-stops.json:\n`)
    for (const problem of result.problems) console.error(`  • ${problem}`)
    console.error('\nInget har skrivits. Rätta posterna och kör igen.\n')
    process.exit(1)
  }

  const applied = Object.keys(result.entries)
  const missing = [...knownStopIds].filter(
    (id) => !applied.includes(id) && !result.skipped.includes(id),
  )

  console.log('\nManuellt verifierade busshållplatser')
  console.log('─'.repeat(72))
  if (applied.length === 0) {
    console.log('Inga verifierade hållplatser ännu. Appen använder sina nuvarande mål.')
  }
  for (const stopId of applied) {
    const entry = result.entries[stopId]
    console.log(
      `  ✓ ${stopId.padEnd(22)} ${(stopNames.get(stopId) ?? '').padEnd(44)} ` +
        `${entry.classification.padEnd(26)} ${destinationFor(entry)}`,
    )
  }
  for (const stopId of result.skipped) {
    console.log(`  – ${stopId.padEnd(22)} obekräftad, ingen knapp visas`)
  }
  console.log('─'.repeat(72))
  console.log(
    `${applied.length} verifierade, ${result.skipped.length} obekräftade, ` +
      `${missing.length} ej granskade av ${knownStopIds.size} hållplatser.`,
  )
  if (missing.length) {
    console.log(`Ej granskade: ${missing.join(', ')}`)
  }

  if (dryRun) {
    console.log('\n--dry-run: ingenting skrevs.\n')
    return
  }

  writeFileSync(
    targetPath,
    `${JSON.stringify(
      {
        generatedFrom: 'data/verified-bus-stops.json',
        note:
          'Manuellt verifierade hållplatslägen. Genereras av scripts/apply-verified-bus-stops.mjs — ' +
          'redigera inte för hand.',
        counts: {
          verified: applied.length,
          unverified: result.skipped.length,
          notReviewed: missing.length,
        },
        stops: result.entries,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`\nSkrev ${targetPath}\n`)
}

// Körs bara som skript, inte när testerna importerar validerarna.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main()
}

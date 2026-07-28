#!/usr/bin/env node
/**
 * Skriver verifieringsrapporten ur data/google-maps-matches.json.
 *
 *   node scripts/build-map-report.mjs
 *
 * Rapporten är den mänskliga vyn av matchningarna: en rad per plats med
 * bedömning, källa och kommentar, plus en summering av vad som återstår att
 * kontrollera för hand.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const STATUS_LABEL = {
  'verified-against-official-map': 'Verifierad mot officiell karta',
  probable: 'Sannolik',
  unverified: 'Obekräftad',
  rejected: 'Avvisad',
}

const cell = (value) => (value ?? '–').toString().replace(/\|/g, '\\|')

function main() {
  const doc = JSON.parse(readFileSync(resolve(APP, 'data/google-maps-matches.json'), 'utf8'))
  const outPath = resolve(ROOT, 'docs/google-maps-verification-report.md')
  const { matches, counts } = doc

  const rows = (type) =>
    matches
      .filter((m) => m.type === type)
      .map((m) =>
        `| ${cell(m.appName)} | ${cell(m.mapName)} | ${m.type === 'venue' ? 'Spelplats' : 'Hållplats'} | ` +
        `${cell(m.mapCell)} | ${cell(m.landmark)} | ${cell(m.matchedName)} | \`${cell(m.query)}\` | ` +
        `${m.confidence} | ${STATUS_LABEL[m.verificationStatus]} | ` +
        `${cell(m.reasoning)}${m.notes ? ' ' + m.notes.join(' ') : ''} |`,
      )

  const header =
    '| Appnamn | Kartans namn | Typ | Kartcell | Landmärke | Google Maps-mål | Sökfras | Confidence | Status | Kommentar |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'

  const manual = matches.filter(
    (m) => m.verificationStatus !== 'verified-against-official-map' || m.confidence !== 'high',
  )
  const noLink = matches.filter((m) => m.verificationStatus === 'unverified' || m.confidence === 'low')

  const out = [
    '# Google Maps — verifieringsrapport',
    '',
    'Genererad av `npm run maps:report` ur `data/google-maps-matches.json`.',
    '',
    '## Sammanfattning',
    '',
    '| | Spelplatser | Hållplatser | Totalt |',
    '| --- | --- | --- | --- |',
    `| Verifierade mot officiell karta | ${counts.venues.verified} | ${counts.busStops.verified} | ${counts.venues.verified + counts.busStops.verified} |`,
    `| Sannolika (visas i appen) | ${counts.venues.probable} | ${counts.busStops.probable} | ${counts.venues.probable + counts.busStops.probable} |`,
    `| Obekräftade (visas inte) | ${counts.venues.unverified} | ${counts.busStops.unverified} | ${counts.venues.unverified + counts.busStops.unverified} |`,
    `| Avvisade | ${counts.venues.rejected} | ${counts.busStops.rejected} | ${counts.venues.rejected + counts.busStops.rejected} |`,
    `| **Totalt** | **${counts.venues.probable + counts.venues.unverified + counts.venues.rejected + counts.venues.verified}** | **${counts.busStops.probable + counts.busStops.unverified + counts.busStops.rejected + counts.busStops.verified}** | **${counts.total}** |`,
    '',
    `> ${doc.note}`,
    '',
    `Kartan är märkt 2025. Arrangören använder samma underlag för 2026, men linje 17 har lagts om: ` +
      `kartan kör den till Höganäs och Lerberget, 2026 års tidtabell till Mörarp.`,
    '',
    '## Utan länk i appen',
    '',
    ...(noLink.length
      ? noLink.map((m) => `- **${m.appName}** (${m.type === 'venue' ? 'spelplats' : 'hållplats'}) — ${m.reasoning}`)
      : ['- Inga.']),
    '',
    '## Kräver manuell kontroll på plats',
    '',
    ...manual.map(
      (m) =>
        `- **${m.appName}** (${m.type === 'venue' ? 'spelplats' : 'hållplats'}, ${m.confidence}) — ` +
        `${m.notes ? m.notes.join(' ') : m.reasoning}`,
    ),
    '',
    '## Spelplatser',
    '',
    header,
    ...rows('venue'),
    '',
    '## Hållplatser',
    '',
    header,
    ...rows('bus-stop'),
    '',
  ]

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${out.join('\n')}\n`)
  console.log(`Skrev verifieringsrapport till ${outPath}`)
}

main()

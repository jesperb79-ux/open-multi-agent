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
        `| ${cell(m.appName)} | ${cell(m.officialName)} | ${m.type === 'venue' ? 'Spelplats' : 'Hållplats'} | ` +
        `${cell(m.matchedName ?? m.query)} | – | ${m.confidence} | ${STATUS_LABEL[m.verificationStatus]} | ` +
        `${m.sourceUrls.map((u) => (u.startsWith('http') ? `[källa](${u})` : `\`${u}\``)).join(', ')} | ` +
        `${cell(m.reasoning)}${m.notes ? ' ' + m.notes.join(' ') : ''} |`,
      )

  const header =
    '| Appnamn | Officiellt namn | Typ | Google Maps-träff | Koordinat | Confidence | Status | Källa | Kommentar |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'

  const manual = matches.filter((m) => m.verificationStatus === 'unverified')

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
    '## Kräver manuell kontroll',
    '',
    ...manual.map((m) => `- **${m.appName}** (${m.type === 'venue' ? 'spelplats' : 'hållplats'}) — ${m.reasoning}`),
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

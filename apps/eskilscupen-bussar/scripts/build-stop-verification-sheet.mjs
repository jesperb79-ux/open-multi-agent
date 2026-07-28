#!/usr/bin/env node
/**
 * Skriver det manuella verifieringsunderlaget för appens 28 hållplatser.
 *
 *   node scripts/build-stop-verification-sheet.mjs
 *
 * Miljön kommer inte åt Google Maps, OpenStreetMap, Overpass, Wikidata eller
 * Skånetrafiken — proxyn svarar 403 på CONNECT för samtliga. Koordinater kan
 * därför inte hämtas maskinellt, och att gissa dem vore värre än att låta bli:
 * en felaktig koordinat öppnar tyst fel punkt, medan ett felaktigt namn
 * åtminstone syns för den som klickar.
 *
 * Underlaget är i stället en checklista att fylla i för hand. Varje rad har en
 * färdig söklänk som letar efter *hållplatsen*, inte skolan eller planen, och
 * tomma fält för det som ska fyllas i. Resultatet skrivs sedan in i
 * data/verified-bus-stops.json och läses av scripts/apply-verified-bus-stops.mjs.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const APP = resolve(HERE, '..')
const ROOT = resolve(HERE, '../../..')

/**
 * Hållplatser som bara finns under cupen.
 *
 * De har ingen permanent skylt och inget namn i den ordinarie kollektiv-
 * trafiken, så "busshållplats <namn>" ger ingen träff. Söklänken pekar i
 * stället på landmärket som Eskilscupens karta placerar Ⓗ vid.
 */
const CUP_SPECIFIC = {
  glumslov: 'Glumslövs IP, Glumslöv',
  barslov: 'Bållevi IP, Bårslöv',
  gantofta: 'Stendösvallen, Gantofta',
  flygfaltet: 'Filborna vattentorn, Helsingborg',
}

/** Orten som ska stå i söklänken. Utan den hamnar sökningen i fel kommun. */
const LOCALITY = {
  glumslov: 'Glumslöv',
  barslov: 'Bårslöv',
  gantofta: 'Gantofta',
  'paarp-medevi': 'Påarp',
  'morarp-vidablick-ip': 'Mörarp',
  'odakra-toftavallen': 'Ödåkra',
  'allerums-ip': 'Allerum',
  'larods-ip': 'Laröd, Helsingborg',
  'rydeback-ip': 'Rydebäck, Helsingborg',
}

/**
 * Namnet att söka på, när tidtabellens namn inte fungerar som sökterm.
 *
 * Tidtabellen skriver ofta hållplats och spelplats i samma sträng
 * ("Filbornaskolan / Filborna IP"). Det är hållplatsdelen som ska sökas.
 */
const SEARCH_NAME = {
  'hedens-ip': 'Högastensskolan',
  'filborna-ip': 'Filbornaskolan',
  'vastergard-ip': 'Adolfsberg',
  'odakra-toftavallen': 'Spritan Fabriksgatan',
  elinebergsplatsen: 'Elinebergsplatsen',
  elinebergskyrkan: 'Elinebergskyrkan',
  'maria-park': 'Maria Park',
  'paarp-medevi': 'Påarp Medevi',
  'morarp-vidablick-ip': 'Mörarp Vidablick',
  'allerums-ip': 'Allerums IP',
  'scandic-nord': 'Scandic Nord',
}

/** De tolv hållplatser användaren bett om att få kontrollerade först. */
const PRIORITY = [
  'gustavslundsskolan',
  'olympiaskolan',
  'filborna-ip',
  'hedens-ip',
  'vastra-ramlosa-skola',
  'elinebergsplatsen',
  'elinebergskyrkan',
  'wieselgrensskolan',
  'husensjoskolan',
  'tagaborgsskolan',
  'ronnowska-skolan',
  'scandic-nord',
]

const searchUrl = (query) =>
  `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query }).toString()}`

/** Söklänken för en rad: hållplatsen, aldrig skolan eller planen. */
export function searchQueryFor(stopId, timetableName) {
  const landmark = CUP_SPECIFIC[stopId]
  if (landmark) return `Eskilscupen hållplats ${landmark}`

  const name = SEARCH_NAME[stopId] ?? timetableName
  const locality = LOCALITY[stopId] ?? 'Helsingborg'
  return `busshållplats ${name}, ${locality}`
}

const cell = (value) => (value ?? '').toString().replace(/\|/g, '\\|')

function main() {
  const timetable = JSON.parse(readFileSync(resolve(APP, 'src/data/timetable.json'), 'utf8'))
  const matches = JSON.parse(readFileSync(resolve(APP, 'data/google-maps-matches.json'), 'utf8'))
  const stopMatch = new Map(
    matches.matches.filter((m) => m.type === 'bus-stop').map((m) => [m.id, m]),
  )

  const stops = timetable.stops.map((stop) => {
    const match = stopMatch.get(stop.id)
    return {
      stopId: stop.id,
      timetableName: stop.name,
      mapLabel: match?.mapStop ?? '',
      mapCell: match?.mapCell ?? '',
      current: match?.query ?? '',
      shown: Boolean(match) && match.verificationStatus !== 'unverified' && match.confidence !== 'low',
      cupSpecific: stop.id in CUP_SPECIFIC,
      query: searchQueryFor(stop.id, stop.name),
    }
  })

  const row = (stop) =>
    `| \`${stop.stopId}\` | ${cell(stop.timetableName)} | ${cell(stop.mapLabel) || '—'} | ` +
    `${cell(stop.mapCell) || '—'} | ${stop.current ? `\`${cell(stop.current)}\`` : '— ingen länk'} | ` +
    `[Sök hållplats](${searchUrl(stop.query)}) | ☐ | | |`

  const priority = stops.filter((s) => PRIORITY.includes(s.stopId))
  priority.sort((a, b) => PRIORITY.indexOf(a.stopId) - PRIORITY.indexOf(b.stopId))
  const rest = stops.filter((s) => !PRIORITY.includes(s.stopId))

  const header = [
    '| stopId | Tidtabellens namn | Kartans Ⓗ | Cell | Nuvarande mål | Sök hållplatsen | Status | Verifierad länk eller koordinat | Kommentar |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ].join('\n')

  const doc = `# Manuell verifiering av busshållplatserna

Appens navigeringslänkar pekar i dag på namngivna platser — skolor, planer och
landmärken. Målet är att de i stället ska peka på **själva busshållplatsen**.

Den här sessionens miljö kommer inte åt någon karttjänst. Proxyn svarar \`403\`
på CONNECT för Google Maps, \`openstreetmap.org\`, \`overpass-api.de\`,
\`nominatim.openstreetmap.org\`, \`query.wikidata.org\`, \`photon.komoot.io\`,
\`download.geofabrik.de\`, \`data.samtrafiken.se\`, \`api.trafiklab.se\`,
\`karta.helsingborg.se\` och \`moovitapp.com\`. Koordinater kan därför inte
hämtas maskinellt.

En gissad koordinat är sämre än ingen: den ser exakt ut, öppnar tyst fel punkt
och går inte att ifrågasätta för den som klickar. Därför står fälten tomma tills
någon fyllt i dem för hand.

## Så här fyller du i

1. Klicka på **Sök hållplatsen** i tabellen. Länken söker på hållplatsen, inte
   på skolan eller planen.
2. Jämför träffens läge med den rosa Ⓗ-symbolen i \`data/eskilscupen-karta-2025.pdf\`,
   i den kartcell som står i tabellen.
3. Stämmer läget: högerklicka på hållplatsen i Google Maps och kopiera
   koordinaten. Fyll i **Status** och **Verifierad länk eller koordinat**.
4. Ligger hållplatsen i två lägen på varsin sida av vägen och kartan inte visar
   vilket som används — skriv \`probable\` och notera osäkerheten i kommentaren.
   Välj inte sida på måfå.
5. Hittar du ingen registrerad hållplats: skriv \`unverified\`. Då visas ingen
   Navigera-knapp alls, vilket är det avsedda utfallet.

### Statusvärden

| Status | Betyder | Knapp i appen |
| --- | --- | --- |
| \`exact-public-transit-stop\` | Registrerad hållplats i ordinarie trafik, läget stämmer mot kartan | Ja |
| \`exact-cup-stop\` | Cupspecifik hållplats, läget entydigt belagt mot Ⓗ | Ja |
| \`probable-cup-stop\` | Rätt område, men sida av vägen eller exakt läge oklart | Ja, med ”Följ Eskilscupens skyltning på plats.” |
| \`unverified\` | Ingen säker matchning | Nej |

### När tabellen är ifylld

Skriv över resultatet i \`data/verified-bus-stops.json\` och kör:

\`\`\`bash
npm run stops:apply
\`\`\`

Skriptet vägrar skriva något alls om en post är ofullständig, så en halvfärdig
fil kan inte förstöra registret.

## Prioriterade hållplatser

De tolv som ska kontrolleras först. Samtliga är ordinarie hållplatser med namn
i den vanliga kollektivtrafiken, så \`busshållplats <namn>\` bör ge träff.

${header}
${priority.map(row).join('\n')}

## Övriga hållplatser

${header}
${rest.map(row).join('\n')}

## Cupspecifika hållplatser

Fyra hållplatser finns bara under cupen. De har inget namn i den ordinarie
trafiken, så \`busshållplats <namn>\` ger ingen träff — söklänken pekar i
stället på landmärket som kartan placerar Ⓗ vid. Rätt status för dem är
\`exact-cup-stop\` eller \`probable-cup-stop\`, aldrig
\`exact-public-transit-stop\`.

| stopId | Ⓗ ligger vid | Cell | Linje enligt kartans indexlista |
| --- | --- | --- | --- |
| \`glumslov\` | Glumslövs IP | E8 | Linje 11 |
| \`barslov\` | Bållevi IP | E5 | Linje 12 |
| \`gantofta\` | Stendösvallen, intill Gantofta skola | E6 | Linje 12 |
| \`flygfaltet\` | Flygfältet / Vattentornet | D3 | Linje 14 |

## Kända svårigheter

**Mörarp Vidablick IP** saknas helt på 2025 års karta — som ort, anläggning och
Ⓗ. Kartans indexlista visar varför: 2025 gick linje 17 till Höganäs Sportcenter
och Vikvalla i Viken, medan 2026 års tidtabell kör linje 17 till Mörarp. Linjen
är omlagd mellan åren. Den här hållplatsen kan inte verifieras mot kartan alls
och ska stå kvar som \`unverified\` tills arrangören svarar.

**Elinebergsplatsen och Elinebergskyrkan** är två skilda Ⓗ i C4 — den ena
väster om Elinebergsskolan, den andra öster om. De ska förbli separata poster
med varsin koordinat. Slå aldrig ihop dem.

**Adolfsberg** ligger enligt både tidtabellen och kartans indexlista ca 300 m
från Västergårds IP. Koordinaten ska vara hållplatsens, inte planens.

**Spritan, Ödåkra Fabriksgatan – Toftavallen** heter olika mellan åren. Kartans
Ⓗ 2025 heter ”Toftavallen Gläntanskolan”; 2026 års tidtabell sätter Spritan vid
Fabriksgatan först. Kontrollera vilket läge som gäller 2026 innan du sätter
annat än \`probable-cup-stop\`.

---

Underlaget genereras av \`scripts/build-stop-verification-sheet.mjs\`. Kör om det
när tidtabellen byts ut; de ifyllda värdena bor i \`data/verified-bus-stops.json\`
och skrivs inte över.
`

  const outPath = resolve(ROOT, 'docs/bus-stop-manual-verification.md')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, doc)
  console.log(
    `Skrev underlag för ${stops.length} hållplatser till ${outPath} ` +
      `(${priority.length} prioriterade, ${Object.keys(CUP_SPECIFIC).length} cupspecifika).`,
  )
}

main()

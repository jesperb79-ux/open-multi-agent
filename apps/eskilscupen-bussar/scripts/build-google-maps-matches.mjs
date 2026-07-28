#!/usr/bin/env node
/**
 * Matchar varje kandidat i data/map-candidates.json mot en Google Maps-sökfras
 * och bedömer hur säker träffen är.
 *
 *   node scripts/build-google-maps-matches.mjs
 *
 * Bedömningarna nedan är gjorda för hand och motiveras i `reasoning`. Inga
 * koordinater sätts: Eskilscupens egen sida med GPS-uppgifter gick inte att
 * läsa (se docs/map-source-audit.md), och att gissa fram en koordinat vore
 * värre än att låta bli.
 *
 * `verificationStatus`:
 *   verified-against-official-map  Träffen är jämförd mot Eskilscupens karta.
 *                                  Ingen post har den statusen ännu — kartan
 *                                  gick inte att läsa härifrån.
 *   probable                       Sökfrasen pekar på ett entydigt landmärke
 *                                  eller en namngiven anläggning.
 *   unverified                     Går inte att bedöma. Visas inte i appen.
 *   rejected                       Sökfrasen leder bevisligen fel.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CUP_MAP = 'https://static.cupmanager.net/uploads/8/y/0C4/eskilscupen-karta-2025.pdf'
const CUP_GPS = 'https://www.eskilscupen.nu/sv/spelplaner-adress-gps'
const CITY = 'https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/'
const TIMETABLE = 'data/busslinjer2026eskilscupen.pdf'
const MOOVIT_PLATSEN = 'https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergsplatsen-Stockholm-stop_402353017-1083'
const MOOVIT_KYRKAN = 'https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergskyrkan-Stockholm-stop_402304015-1083'
const SPRITAN = 'https://spritan.com/'

/** Bedömning per spelplats. */
const VENUES = {
  'norrvalla-ip': {
    query: 'Norrvalla IP, Helsingborg, Sverige',
    matchedName: 'Norrvalla idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CUP_MAP, CITY],
    reasoning:
      'Etablerad kommunal anläggning med eget uppslag i stadens anläggningsregister. Cupens karta anger zon C3.',
  },
  olympia: {
    query: 'Olympia, Helsingborg, Sverige',
    matchedName: 'Olympia',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [CUP_MAP, CITY],
    reasoning:
      'Arenan är entydig i Google Maps, men cupen spelar på Olympiafältet intill. Markören hamnar sannolikt vid arenan, inte vid planerna.',
    notes: ['Kontrollera om cupen vill peka på Olympiafältet i stället för arenan.'],
  },
  'filborna-ip': {
    query: 'Filborna IP, Helsingborg, Sverige',
    matchedName: 'Filborna idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister med adress Filbornavägen 101A.',
  },
  'vastergard-ip': {
    query: 'Västergårds IP, Helsingborg, Sverige',
    matchedName: 'Västergårds idrottsplats',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [CUP_MAP],
    reasoning:
      'Tidtabellen stavar "Vätergård", vilket är fel. Sökfrasen använder den korrekta stavningen Västergård som cupens egen resultatsida använder.',
  },
  'harlyckan-ip': {
    query: 'Harlyckans IP, Helsingborg, Sverige',
    matchedName: 'Harlyckans IP',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CUP_MAP],
    reasoning: 'Namnet används av cupen själv i resultatsystemet. Cupens karta anger zon C4.',
    notes: ['Planen nås från två skilda hållplatser — se elinebergsplatsen och elinebergskyrkan.'],
  },
  'hedens-ip': {
    query: 'Hedens IP, Helsingborg, Sverige',
    matchedName: 'Hedens IP',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Planen ligger vid Högastensskolan i stadsdelen Högasten. Namnet Hedens IP är etablerat men mindre entydigt än en skoladress.',
  },
  'attekulla-ip': {
    query: 'Ättekulla IP, Helsingborg, Sverige',
    matchedName: 'Ättekulla idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister, adress Ättekullagatan.',
  },
  'raa-ip': {
    query: 'Råå IP, Helsingborg, Sverige',
    matchedName: 'Råå idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister.',
  },
  'orby-ip': {
    query: 'Örby ängars IP, Helsingborg, Sverige',
    matchedName: 'Örby ängars idrottsplats',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning:
      'Staden kallar anläggningen "Örby ängars idrottsplats"; tidtabellen skriver bara "Örby IP". Den längre formen ger en säkrare träff.',
  },
  'rydeback-ip': {
    query: 'Rydebäcks IP, Rydebäck, Helsingborg, Sverige',
    matchedName: 'Rydebäcks idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister. Orten Rydebäck ingår i frasen.',
  },
  'maria-park-ip': {
    query: 'Maria Park IP, Helsingborg, Sverige',
    matchedName: 'Maria Park',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Maria Park är ett väl avgränsat område. Att idrottsplatsen heter Maria Park IP framgår av cupens egen innehållsförteckning i tidtabellen.',
  },
  'larods-ip': {
    query: 'Laröds IP, Laröd, Helsingborg, Sverige',
    matchedName: 'Laröds idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister. Orten Laröd ingår i frasen.',
  },
  'allerums-ip': {
    query: 'Allerums IP, Allerum, Sverige',
    matchedName: 'Allerums idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Eget uppslag i stadens anläggningsregister, adress Jonstorpsvägen i Allerum.',
  },
  toftavallen: {
    query: 'Toftavallen, Ödåkra, Sverige',
    matchedName: 'Toftavallen',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning:
      'Toftavallen ligger i Ödåkra enligt stadens register, där anläggningen kallas Ödåkra idrottsplats. Namnet Toftavallen används av cupen.',
    notes: ['Att Toftavallen och Ödåkra idrottsplats är samma anläggning är en tolkning.'],
  },
  'morarp-vidablick-ip': {
    query: 'Vidablick IP, Mörarp, Sverige',
    confidence: 'low',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen skriver "Mörarp Vidablick IP". Stadens register känner en anläggning i Mörarp men inte namnet Vidablick. Kopplingen är en tolkning och går inte att styrka.',
    notes: ['Kräver manuell kontroll mot Eskilscupens karta.'],
  },
}

/** Bedömning per hållplats. */
const STOPS = {
  glumslov: {
    query: 'Glumslöv, Sverige',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen anger bara orten. Var i Glumslöv cupbussen stannar framgår inte, och Google Maps pekar på ortens mittpunkt.',
    notes: ['Kräver manuell kontroll — sannolikt en tillfällig påstigningsplats.'],
  },
  'rydeback-ip': {
    query: 'Rydebäcks IP, Rydebäck, Helsingborg, Sverige',
    matchedName: 'Rydebäcks idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen, som har eget uppslag hos staden.',
  },
  'orby-ip': {
    query: 'Örby ängars IP, Helsingborg, Sverige',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen.',
  },
  'raa-ip': {
    query: 'Råå IP, Helsingborg, Sverige',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen.',
  },
  'hedens-ip': {
    query: 'Högastensskolan, Helsingborg, Sverige',
    matchedName: 'Högastensskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen namnger hållplatsen efter skolan ("Högastensskolan / Hedens IP"). En skola är ett entydigt landmärke i Google Maps.',
    notes: ['Bussen kan stanna på annan sida av skolan än huvudentrén.'],
  },
  'attekulla-ip': {
    query: 'Ättekulla IP, Helsingborg, Sverige',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen.',
  },
  'vastra-ramlosa-skola': {
    query: 'Västra Ramlösa skola, Helsingborg, Sverige',
    matchedName: 'Västra Ramlösa skola',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skolan är ett entydigt landmärke och hållplatsen bär dess namn.',
  },
  elinebergsplatsen: {
    query: 'Elinebergsplatsen, Helsingborg, Sverige',
    matchedName: 'Helsingborg Elinebergsplatsen',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [MOOVIT_PLATSEN, TIMETABLE],
    reasoning:
      'Finns som egen hållplats i kollektivtrafikdata, skild från Elinebergskyrkan. Avståndet mellan de två anges till 257 m, ungefär fyra minuters gång — de är alltså inte samma läge.',
    notes: ['Hålls isär från Elinebergskyrkan. Slå inte ihop dem.'],
  },
  elinebergskyrkan: {
    query: 'Elinebergskyrkan, Helsingborg, Sverige',
    matchedName: 'Helsingborg Elinebergskyrkan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [MOOVIT_KYRKAN, TIMETABLE],
    reasoning:
      'Finns som egen hållplats i kollektivtrafikdata. Kyrkans klocktorn är byggt samman med hållplatsen, vilket gör läget entydigt.',
    notes: ['Hålls isär från Elinebergsplatsen, 257 m bort. Slå inte ihop dem.'],
  },
  wieselgrensskolan: {
    query: 'Wieselgrensskolan, Helsingborg, Sverige',
    matchedName: 'Wieselgrensskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
  },
  husensjoskolan: {
    query: 'Husensjöskolan, Helsingborg, Sverige',
    matchedName: 'Husensjöskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
  },
  gustavslundsskolan: {
    query: 'Gustavslundsskolan, Helsingborg, Sverige',
    matchedName: 'Gustavslundsskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
  },
  'vastergard-ip': {
    query: 'Adolfsberg, Helsingborg, Sverige',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen skriver "Adolfsberg (Vätergård IP 300m)". Adolfsberg är en stadsdel, inte ett hållplatsläge, så Google Maps pekar på området och inte på hållplatsen.',
    notes: ['Kräver manuell kontroll. Planen ligger ca 300 m från hållplatsen enligt tidtabellen.'],
  },
  'filborna-ip': {
    query: 'Filbornaskolan, Helsingborg, Sverige',
    matchedName: 'Filbornaskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Tidtabellen namnger hållplatsen efter skolan, som är ett entydigt landmärke.',
    notes: ['Bussen kan stanna på annan sida av skolan än huvudentrén.'],
  },
  olympiaskolan: {
    query: 'Olympiaskolan, Helsingborg, Sverige',
    matchedName: 'Olympiaskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
    notes: ['Planen Olympia ligger på Olympiafältet en bit bort.'],
  },
  tagaborgsskolan: {
    query: 'Tågaborgsskolan, Helsingborg, Sverige',
    matchedName: 'Tågaborgsskolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
  },
  'norrvalla-ip': {
    query: 'Norrvalla IP, Helsingborg, Sverige',
    matchedName: 'Norrvalla idrottsplats',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning:
      'Hållplatsen är namngiven efter idrottsplatsen. Tidtabellen stavar "Norvalla" genomgående, vilket är fel — sökfrasen använder den korrekta stavningen.',
  },
  barslov: {
    query: 'Bårslöv, Helsingborg, Sverige',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning: 'Tidtabellen anger bara orten. Var i Bårslöv bussen stannar framgår inte.',
    notes: ['Kräver manuell kontroll — sannolikt en tillfällig påstigningsplats.'],
  },
  gantofta: {
    query: 'Gantofta, Sverige',
    confidence: 'medium',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning: 'Tidtabellen anger bara orten. Var i Gantofta bussen stannar framgår inte.',
    notes: ['Kräver manuell kontroll — sannolikt en tillfällig påstigningsplats.'],
  },
  'paarp-medevi': {
    query: 'Medevi IP, Påarp, Sverige',
    matchedName: 'Medevi IP',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen skriver "Påarp Medevi". Medevi IP är en idrottsplats i Påarp, vilket förklarar namnet och ger en betydligt bättre träff än enbart orten.',
  },
  'morarp-vidablick-ip': {
    query: 'Vidablick IP, Mörarp, Sverige',
    confidence: 'low',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Att Vidablick är Mörarps idrottsplats är en tolkning som inte går att styrka ur tillgängliga källor.',
    notes: ['Kräver manuell kontroll mot Eskilscupens karta.'],
  },
  flygfaltet: {
    query: 'Vattentornet, Helsingborg, Sverige',
    confidence: 'low',
    verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning:
      'Tidtabellen skriver "Flygfältet (Vattentornet)". Båda orden är ortsbeskrivningar snarare än hållplatsnamn, och det finns flera vattentorn i området.',
    notes: ['Kräver manuell kontroll — mycket sannolikt en tillfällig påstigningsplats vid cupområdet.'],
  },
  'maria-park': {
    query: 'Maria Park, Helsingborg, Sverige',
    matchedName: 'Maria Park',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Maria Park är ett väl avgränsat och namngivet område i Google Maps.',
  },
  'larods-ip': {
    query: 'Laröds IP, Laröd, Helsingborg, Sverige',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen, som har eget uppslag hos staden.',
  },
  'scandic-nord': {
    query: 'Scandic Helsingborg Nord, Sverige',
    matchedName: 'Scandic Helsingborg Nord',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Hotellet är ett entydigt namngivet landmärke.',
  },
  'allerums-ip': {
    query: 'Allerums IP, Allerum, Sverige',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [CITY],
    reasoning: 'Hållplatsen är namngiven efter idrottsplatsen.',
  },
  'odakra-toftavallen': {
    query: 'Spritan, Ödåkra, Sverige',
    matchedName: 'Spritan — Spritfabriken i Ödåkra',
    confidence: 'medium',
    verificationStatus: 'probable',
    sourceUrls: [SPRITAN, TIMETABLE],
    reasoning:
      'Hållplatsen heter "Spritan, Ödåkra Fabriksgatan – Toftavallen". Spritan är den gamla spritfabriken i Ödåkra, i dag ett namngivet besöksmål och därmed ett entydigt landmärke.',
    notes: ['Hållplatsen ligger vid Spritan; planen Toftavallen kan ligga en bit bort.'],
  },
  'ronnowska-skolan': {
    query: 'Rönnowska skolan, Helsingborg, Sverige',
    matchedName: 'Rönnowska skolan',
    confidence: 'high',
    verificationStatus: 'probable',
    sourceUrls: [TIMETABLE],
    reasoning: 'Skola, entydigt landmärke med samma namn som hållplatsen.',
  },
}

const searchUrl = (query) =>
  `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query }).toString()}`

function main() {
  const candidatesPath = resolve(ROOT, 'data/map-candidates.json')
  const outPath = resolve(ROOT, 'data/google-maps-matches.json')
  const { candidates } = JSON.parse(readFileSync(candidatesPath, 'utf8'))

  const missing = []
  const matches = candidates.map((candidate) => {
    const table = candidate.type === 'venue' ? VENUES : STOPS
    const entry = table[candidate.id]
    if (!entry) {
      missing.push(`${candidate.type}:${candidate.id}`)
      return null
    }
    return {
      id: candidate.id,
      type: candidate.type,
      appName: candidate.appName,
      ...(candidate.officialName ? { officialName: candidate.officialName } : {}),
      query: entry.query,
      googleMapsUrl: searchUrl(entry.query),
      ...(entry.matchedName ? { matchedName: entry.matchedName } : {}),
      confidence: entry.confidence,
      verificationStatus: entry.verificationStatus,
      sourceUrls: entry.sourceUrls,
      reasoning: entry.reasoning,
      ...(entry.notes ? { notes: entry.notes } : {}),
    }
  })

  if (missing.length) {
    console.error(`Kandidater utan bedömning: ${missing.join(', ')}`)
    process.exitCode = 1
    return
  }

  const count = (type, status) =>
    matches.filter((m) => m.type === type && m.verificationStatus === status).length

  const document = {
    generatedFrom: 'data/map-candidates.json',
    note:
      'Ingen post har statusen verified-against-official-map: Eskilscupens karta och GPS-sida ' +
      'gick inte att läsa från utvecklingsmiljön. Se docs/map-source-audit.md.',
    counts: {
      total: matches.length,
      venues: {
        verified: count('venue', 'verified-against-official-map'),
        probable: count('venue', 'probable'),
        unverified: count('venue', 'unverified'),
        rejected: count('venue', 'rejected'),
      },
      busStops: {
        verified: count('bus-stop', 'verified-against-official-map'),
        probable: count('bus-stop', 'probable'),
        unverified: count('bus-stop', 'unverified'),
        rejected: count('bus-stop', 'rejected'),
      },
    },
    matches,
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`)
  const { counts } = document
  console.log(
    `Skrev ${counts.total} matchningar. Spelplaner: ${counts.venues.probable} sannolika, ` +
      `${counts.venues.unverified} obekräftade. Hållplatser: ${counts.busStops.probable} sannolika, ` +
      `${counts.busStops.unverified} obekräftade.`,
  )
}

main()

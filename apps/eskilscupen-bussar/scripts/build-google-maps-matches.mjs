#!/usr/bin/env node
/**
 * Matchar varje kandidat i data/map-candidates.json mot ett Google Maps-mål och
 * bedömer träffen mot Eskilscupens officiella karta.
 *
 *   node scripts/build-google-maps-matches.mjs
 *
 * Facit är `data/eskilscupen-karta-2025.pdf`. Kartan har en indexlista med
 * kartcell per anläggning och rosa H-symboler för cupens egna busshållplatser.
 * Arrangören använder samma underlag för 2025 och 2026.
 *
 * `verificationStatus` säger om LÄGET är kontrollerat mot kartan.
 * `confidence` säger hur säkert Google Maps hittar rätt på sökfrasen.
 * De två är oberoende: ett läge kan vara belagt på kartan samtidigt som
 * sökfrasen är vansklig.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const CUP_MAP = 'data/eskilscupen-karta-2025.pdf'
const CUP_GPS = 'https://www.eskilscupen.nu/sv/spelplaner-adress-gps'
const CITY = 'https://helsingborg.se/uppleva-och-gora/anlaggningar-och-sporthallar/fotbollsplaner/'
const TIMETABLE = 'data/busslinjer2026eskilscupen.pdf'
const MOOVIT_PLATSEN = 'https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergsplatsen-Stockholm-stop_402353017-1083'
const MOOVIT_KYRKAN = 'https://moovitapp.com/index/sv/offentlig_transit-Helsingborg_Elinebergskyrkan-Stockholm-stop_402304015-1083'
const SPRITAN = 'https://spritan.com/'

/**
 * Bedömning per spelplats, kontrollerad mot kartan.
 * `mapCell` och `mapName` kommer ur kartans indexlista, `mapStop` är den
 * rosa H-symbol som ligger vid anläggningen.
 */
const VENUES = {
  'norrvalla-ip': {
    query: 'Norrvalla IP, Helsingborg, Sverige', matchedName: 'Norrvalla IP',
    mapName: 'Norrvalla IP, Helsingborg', mapCell: 'C3', mapStop: 'Norrvalla IP',
    landmark: 'Berga, norr om Ringstorpsskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Kartan visar grön spelplats "Norrvalla IP" i C3 med en H-hållplats med samma namn intill. Trafikeras av linjerna 11–20.',
  },
  olympia: {
    query: 'Olympiafältet, Helsingborg, Sverige', matchedName: 'Olympiafältet',
    mapName: 'Olympiafältet, Helsingborg', mapCell: 'C3', mapStop: 'Olympiaskolan',
    landmark: 'Idrottens Hus / Arenan, Slottshagen',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartan kallar spelplatsen "Olympiafältet", inte Olympia. Sökfrasen är ändrad till kartans namn, vilket pekar på planerna i stället för på arenan. Hållplatsen är Olympiaskolan strax söder om.',
  },
  'filborna-ip': {
    query: 'Filborna IP, Helsingborg, Sverige', matchedName: 'Filborna IP',
    mapName: 'Filborna IP, Helsingborg', mapCell: 'C3 D3', mapStop: 'Filborna IP',
    landmark: 'Filbornaskolan, Nanny Palmkvistskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Grön spelplats "Filborna IP" i C3 D3 med H-hållplats med samma namn vid Filbornaskolan.',
  },
  'vastergard-ip': {
    query: 'Västergårds IP, Helsingborg, Sverige', matchedName: 'Västergårds IP',
    mapName: 'Västergårds IP, Helsingborg', mapCell: 'D4', mapStop: 'Västergårds IP',
    landmark: 'Västergårdshallen, Adolfsberg',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartan skriver "Västergårds IP, Helsingborg, D4 ... (300 m)". Tidtabellens stavning "Vätergård" är alltså fel. H-hållplatsen ligger väster om planerna, vilket förklarar de 300 metrarna.',
    notes: ['Kartan anger uttryckligen 300 m mellan hållplats och plan.'],
  },
  'harlyckan-ip': {
    query: 'Harlyckans IP, Helsingborg, Sverige', matchedName: 'Harlyckans IP',
    mapName: 'Harlyckans IP, Helsingborg', mapCell: 'C4', mapStop: 'Elinebergsplatsen / Elinebergskyrkan',
    landmark: 'Harlyckehallen, Elinebergsskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Grön spelplats "Harlyckans IP" i C4 intill Harlyckehallen. Ingen egen H-symbol — planen nås från Elinebergsplatsen och Elinebergskyrkan, som ligger som två skilda H strax söder om.',
    notes: ['Kartan bekräftar att planen har två skilda hållplatser.'],
  },
  'hedens-ip': {
    query: 'Hedens IP, Helsingborg, Sverige', matchedName: 'Hedens IP',
    mapName: 'Hedens IP, Helsingborg', mapCell: 'C5', mapStop: 'Hedens IP',
    landmark: 'Högastenshallen, Högastensskolan, Norrehedshallen',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Grön spelplats "Hedens IP" i C5 med H-hållplats med samma namn, intill Högastenshallen och Högastensskolan.',
  },
  'attekulla-ip': {
    query: 'Ättekulla IP, Helsingborg, Sverige', matchedName: 'Ättekulla IP',
    mapName: 'Ättekulla IP, Helsingborg', mapCell: 'D5', mapStop: 'Ättekulla IP',
    landmark: 'Ättekullaskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Grön spelplats "Ättekulla IP" i D5 med H-hållplats med samma namn vid Ättekullaskolan.',
  },
  'raa-ip': {
    query: 'Råå IP, Helsingborg, Sverige', matchedName: 'Råå IP',
    mapName: 'Råå IP, C5 D5', mapCell: 'C5 D5', mapStop: 'Råå IP',
    landmark: 'Råå vallar, söder om Hedens IP',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Grön spelplats "Råå IP" i C5 D5 med H-hållplats med samma namn.',
  },
  'orby-ip': {
    query: 'Örby IP, Helsingborg, Sverige', matchedName: 'Örby IP',
    mapName: 'Örby Kropp IP, D6', mapCell: 'D6', mapStop: 'Örby IP',
    landmark: 'Örby ängar, Pålstorp',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartans indexlista skriver "Örby Kropp IP, D6" medan H-hållplatsen bara heter "Örby IP". Läget är belagt, men Google känner sannolikt inte det längre namnet, så sökfrasen följer hållplatsens namn.',
    notes: ['H-symbolen ligger några hundra meter norr om den gröna spelplatsen.'],
  },
  'rydeback-ip': {
    query: 'Rydebäcks IP, Rydebäck, Helsingborg, Sverige', matchedName: 'Rydebäcks IP',
    mapName: 'Rydebäcks IP, E7', mapCell: 'E7', mapStop: 'Rydebäcks IP',
    landmark: 'Rydebäcksskolan, Rydebäckshallarna',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Grön spelplats "Rydebäcks IP" i E7 med H-hållplats med samma namn vid Rydebäcksskolan.',
  },
  'maria-park-ip': {
    query: 'Maria Park fotbollsplan, Helsingborg, Sverige', matchedName: 'Maria Park fotbollsplan',
    mapName: 'Maria Park fotbollsplan, C2', mapCell: 'C2', mapStop: 'Maria Park IP',
    landmark: 'Maria Parkskolan, Kullavägen, Mariahallen',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartan kallar planen "Maria Park fotbollsplan" i C2. H-hållplatsen heter "Maria Park IP" och ligger vid Maria Parkskolan / Kullavägen.',
  },
  'larods-ip': {
    query: 'Laröds IP, Laröd, Helsingborg, Sverige', matchedName: 'Laröds IP',
    mapName: 'Laröds IP, A1 B1', mapCell: 'A1 B1', mapStop: 'Laröds IP',
    landmark: 'Hittarpshallen, Laröds skola',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, CITY],
    reasoning: 'Grön spelplats "Laröds IP" i A1 B1 med H-hållplats med samma namn.',
  },
  'allerums-ip': {
    query: 'Ryavallen, Allerum, Sverige', matchedName: 'Ryavallen',
    mapName: 'Ryavallen, Allerum, C1', mapCell: 'C1', mapStop: 'Allerums IP',
    landmark: 'Allerum',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartan kallar anläggningen "Ryavallen, Allerum" i C1 medan H-hållplatsen heter "Allerums IP". Sökfrasen använder kartans namn, som är anläggningens riktiga.',
    notes: ['Tidtabellens "Allerums IP" är hållplatsens namn, inte planens.'],
  },
  toftavallen: {
    query: 'Toftavallen, Ödåkra, Sverige', matchedName: 'Toftavallen',
    mapName: 'Toftavallen, Ödåkra, D1', mapCell: 'D1', mapStop: 'Toftavallen / Gläntanskolan',
    landmark: 'Gläntanskolan, Ödåkra station',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Grön spelplats "Toftavallen" i D1 med H-hållplatsen "Toftavallen Gläntanskolan" intill. Att Toftavallen ligger i Ödåkra är därmed belagt.',
  },
  'morarp-vidablick-ip': {
    query: 'Vidablick IP, Mörarp, Sverige',
    confidence: 'low', verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning: 'Mörarp finns inte alls på 2025 års karta — varken orten, anläggningen eller någon H-symbol. Kartans linje 17 gick 2025 till Höganäs och Lerberget, medan 2026 års tidtabell kör linje 17 till Mörarp. Läget går alltså inte att belägga ur det här underlaget.',
    notes: ['Linje 17 har lagts om mellan 2025 och 2026. Kräver uppgift från arrangören.'],
  },
}

/** Bedömning per hållplats, kontrollerad mot kartans H-symboler. */
const STOPS = {
  glumslov: {
    query: 'Glumslövs IP, Glumslöv, Sverige', matchedName: 'Glumslövs IP',
    mapName: 'Glumslövs IP, E8', mapCell: 'E8', mapStop: 'Glumslöv',
    landmark: 'Glumslövs IP, Glumslöv station',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbolen "Glumslöv" ligger vid den gröna spelplatsen "Glumslövs IP" i E8, inte i ortens mitt. Sökfrasen pekar därför på idrottsplatsen.',
    notes: ['Cupspecifik hållplats. Exakt vägkant framgår inte av kartan.'],
  },
  'rydeback-ip': {
    query: 'Rydebäcks IP, Rydebäck, Helsingborg, Sverige', matchedName: 'Rydebäcks IP',
    mapName: 'Rydebäcks IP, E7', mapCell: 'E7', mapStop: 'Rydebäcks IP',
    landmark: 'Rydebäcksskolan', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol "Rydebäcks IP" vid den gröna spelplatsen i E7.',
  },
  'orby-ip': {
    query: 'Örby IP, Helsingborg, Sverige', matchedName: 'Örby IP',
    mapName: 'Örby Kropp IP, D6', mapCell: 'D6', mapStop: 'Örby IP',
    landmark: 'Örby ängar',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbol "Örby IP" i D6, norr om den gröna spelplatsen.',
    notes: ['Hållplatsen ligger en bit från planen.'],
  },
  'raa-ip': {
    query: 'Råå IP, Helsingborg, Sverige', matchedName: 'Råå IP',
    mapName: 'Råå IP, C5 D5', mapCell: 'C5 D5', mapStop: 'Råå IP',
    landmark: 'Råå vallar', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol "Råå IP" vid den gröna spelplatsen i C5 D5.',
  },
  'hedens-ip': {
    query: 'Hedens IP, Helsingborg, Sverige', matchedName: 'Hedens IP',
    mapName: 'Hedens IP, Helsingborg, C5', mapCell: 'C5', mapStop: 'Hedens IP',
    landmark: 'Högastenshallen, Högastensskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartans H-symbol heter "Hedens IP", inte Högastensskolan. Sökfrasen är ändrad till hållplatsens riktiga namn; skolan ligger intill.',
  },
  'attekulla-ip': {
    query: 'Ättekulla IP, Helsingborg, Sverige', matchedName: 'Ättekulla IP',
    mapName: 'Ättekulla IP, D5', mapCell: 'D5', mapStop: 'Ättekulla IP',
    landmark: 'Ättekullaskolan', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol "Ättekulla IP" vid den gröna spelplatsen i D5.',
  },
  'vastra-ramlosa-skola': {
    query: 'Västra Ramlösa skola, Helsingborg, Sverige', matchedName: 'Västra Ramlösa skola',
    mapName: 'Västra Ramlösa skola, D4', mapCell: 'D4', mapStop: 'Västra Ramlösa Skola',
    landmark: 'Ramlösagården, Eskilsminne',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i D4.',
  },
  elinebergsplatsen: {
    query: 'Elinebergsplatsen, Helsingborg, Sverige', matchedName: 'Elinebergsplatsen',
    mapName: 'Elinebergsplatsen', mapCell: 'C4', mapStop: 'Elinebergsplatsen',
    landmark: 'Elinebergsskolan, Harlyckehallen',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, MOOVIT_PLATSEN],
    reasoning: 'Kartan visar två skilda H-symboler i C4: "Elinebergsplatsen" väster om Elinebergsskolan och "Elinebergskyrkan" öster om. De är alltså två hållplatser, inte en.',
    notes: ['Hålls isär från Elinebergskyrkan. Slå inte ihop dem.'],
  },
  elinebergskyrkan: {
    query: 'Elinebergskyrkan, Helsingborg, Sverige', matchedName: 'Elinebergskyrkan',
    mapName: 'Elinebergskyrkan', mapCell: 'C4', mapStop: 'Elinebergskyrkan',
    landmark: 'Elinebergsskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP, MOOVIT_KYRKAN],
    reasoning: 'Egen H-symbol i C4, tydligt skild från Elinebergsplatsen. Kollektivtrafikdata anger 257 m mellan de två.',
    notes: ['Hålls isär från Elinebergsplatsen. Slå inte ihop dem.'],
  },
  wieselgrensskolan: {
    query: 'Wieselgrensskolan, Helsingborg, Sverige', matchedName: 'Wieselgrensskolan',
    mapName: 'Wieselgrensskolan, C4', mapCell: 'C4', mapStop: 'Wieselgrensskolan',
    landmark: 'Husensjö', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i C4.',
  },
  husensjoskolan: {
    query: 'Husensjöskolan, Helsingborg, Sverige', matchedName: 'Husensjöskolan',
    mapName: 'Husensjöskolan, C4', mapCell: 'C4', mapStop: 'Husensjöskolan',
    landmark: 'Husensjö', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i C4.',
  },
  gustavslundsskolan: {
    query: 'Gustavslundsskolan, Helsingborg, Sverige', matchedName: 'Gustavslundsskolan',
    mapName: 'Gustavslundsskolan, D4', mapCell: 'D4', mapStop: 'Gustavslundsskolan',
    landmark: 'Långeberga', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i D4.',
  },
  'vastergard-ip': {
    query: 'Västergårds IP, Helsingborg, Sverige', matchedName: 'Västergårds IP',
    mapName: 'Västergårds IP, D4', mapCell: 'D4', mapStop: 'Västergårds IP',
    landmark: 'Västergårdshallen, Adolfsberg',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartans H-symbol heter "Västergårds IP", inte Adolfsberg. Tidtabellens "Adolfsberg (Vätergård IP 300m)" beskriver stadsdelen och avståndet; sökfrasen följer kartans namn.',
    notes: ['Kartan anger 300 m mellan hållplats och plan.'],
  },
  'filborna-ip': {
    query: 'Filborna IP, Helsingborg, Sverige', matchedName: 'Filborna IP',
    mapName: 'Filborna IP, C3 D3', mapCell: 'C3 D3', mapStop: 'Filborna IP',
    landmark: 'Filbornaskolan, Nanny Palmkvistskolan',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartans H-symbol heter "Filborna IP" och ligger vid Filbornaskolan. Sökfrasen är ändrad från skolan till hållplatsens riktiga namn.',
  },
  olympiaskolan: {
    query: 'Olympiaskolan, Helsingborg, Sverige', matchedName: 'Olympiaskolan',
    mapName: 'Olympiaskolan, C4', mapCell: 'C4', mapStop: 'Olympiaskolan',
    landmark: 'Olympiafältet, Idrottens Hus',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbol vid Olympiaskolan. Spelplatsen Olympiafältet ligger strax norr om.',
  },
  tagaborgsskolan: {
    query: 'Tågaborgsskolan, Helsingborg, Sverige', matchedName: 'Tågaborgsskolan',
    mapName: 'Tågaborgsskolan, C3', mapCell: 'C3', mapStop: 'Tågaborgsskolan',
    landmark: 'Fredriksdal', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i C3.',
  },
  'norrvalla-ip': {
    query: 'Norrvalla IP, Helsingborg, Sverige', matchedName: 'Norrvalla IP',
    mapName: 'Norrvalla IP, C3', mapCell: 'C3', mapStop: 'Norrvalla IP',
    landmark: 'Berga, Dalhem',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbol "Norrvalla IP" i C3. Tidtabellens stavning "Norvalla" är fel; kartan skriver Norrvalla.',
  },
  barslov: {
    query: 'Bållevi IP, Bårslöv, Sverige', matchedName: 'Bållevi IP',
    mapName: 'Bållevi IP, Bårslöv, E5', mapCell: 'E5', mapStop: 'Bårslöv',
    landmark: 'Bållevi IP, Bårslöv',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbolen "Bårslöv" ligger vid den gröna spelplatsen "Bållevi IP" i E5, inte i ortens mitt. Sökfrasen pekar därför på idrottsplatsen.',
    notes: ['Cupspecifik hållplats. Exakt vägkant framgår inte av kartan.'],
  },
  gantofta: {
    query: 'Stendösvallen, Gantofta, Sverige', matchedName: 'Stendösvallen',
    mapName: 'Stendösvallen, Gantofta, E6', mapCell: 'E6', mapStop: 'Gantofta',
    landmark: 'Gantofta skola, Gantofta idrottshall, Gantofta station',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbolen "Gantofta" ligger vid spelplatsen "Stendösvallen" och Gantofta skola i E6, inte i ortens mitt.',
    notes: ['Cupspecifik hållplats. Exakt vägkant framgår inte av kartan.'],
  },
  'paarp-medevi': {
    query: 'Medevi IP, Påarp, Sverige', matchedName: 'Medevi IP',
    mapName: 'Medevi IP, Påarp, E4 F4', mapCell: 'E4 F4', mapStop: 'Medevi IP',
    landmark: 'Påarp station',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'Kartan bekräftar "Medevi IP, Påarp" i E4 F4 med H-symbol med samma namn. Tidtabellens "Påarp Medevi" syftar alltså på Medevi IP.',
  },
  'morarp-vidablick-ip': {
    query: 'Vidablick IP, Mörarp, Sverige',
    confidence: 'low', verificationStatus: 'unverified',
    sourceUrls: [TIMETABLE],
    reasoning: 'Mörarp saknas helt på 2025 års karta. Linje 17 gick då till Höganäs och Lerberget, inte till Mörarp.',
    notes: ['Linje 17 har lagts om mellan 2025 och 2026. Kräver uppgift från arrangören.'],
  },
  flygfaltet: {
    // "Flygfältet, Helsingborg" öppnade Ängelholms flygplats, som heter
    // Ängelholm–Helsingborg Airport. Ordet Flygfältet får därför inte stå
    // kvar i sökfrasen — kartans andra namn på platsen är entydigt.
    query: 'Filborna vattentorn, Helsingborg, Sverige', matchedName: 'Vattentornet',
    mapName: 'Flygfältet / Vattentornet, D3', mapCell: 'D3', mapStop: 'Flygfältet',
    landmark: 'Filborna vattentorn vid Österleden i höjd med Filbornavägen, öster om Filborna',
    confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [
      CUP_MAP,
      'https://helsingborg.se/trafik-och-stadsplanering/trafik-och-byggprojekt/trafik-och-stadsmiljo/helsingborgs-nya-vattentorn/',
      'https://sv.wikipedia.org/wiki/Filborna_vattentorn',
    ],
    reasoning:
      'Kartan visar "Flygfältet / Vattentornet, D3" som en egen grön spelplats med H-symbol öster om Filborna. Vattentornet är samma byggnad som Helsingborgs stad och NSVA kallar Filborna vattentorn: 40 meter högt, invigt 2022, vid Österleden i höjd med Filbornavägen. Det är ett namngivet landmärke i rätt kartcell, till skillnad från ordet Flygfältet.',
    notes: [
      'Sökfrasen pekar på vattentornet, inte på spelplanens kortsida. Exakt vägkant framgår inte av kartan.',
    ],
  },
  'maria-park': {
    query: 'Maria Parkskolan, Helsingborg, Sverige', matchedName: 'Maria Parkskolan',
    mapName: 'Maria Park fotbollsplan, C2', mapCell: 'C2', mapStop: 'Maria Park IP',
    landmark: 'Maria Parkskolan, Kullavägen, Maria station',
    confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbolen "Maria Park IP" ligger vid Maria Parkskolan och Kullavägen i C2. Skolan är den entydigaste sökfrasen.',
  },
  'larods-ip': {
    query: 'Laröds IP, Laröd, Helsingborg, Sverige', matchedName: 'Laröds IP',
    mapName: 'Laröds IP, A1 B1', mapCell: 'A1 B1', mapStop: 'Laröds IP',
    landmark: 'Hittarpshallen', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol "Laröds IP" vid den gröna spelplatsen i A1 B1.',
  },
  'scandic-nord': {
    query: 'Scandic Helsingborg Nord, Sverige', matchedName: 'Scandic Nord',
    mapName: 'Scandic Nord, C2', mapCell: 'C2', mapStop: 'Scandic Nord',
    landmark: 'Väla', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid hotellet i C2, listat under Övriga platser.',
  },
  'allerums-ip': {
    query: 'Ryavallen, Allerum, Sverige', matchedName: 'Ryavallen',
    mapName: 'Ryavallen, Allerum, C1', mapCell: 'C1', mapStop: 'Allerums IP',
    landmark: 'Allerum', confidence: 'medium', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP],
    reasoning: 'H-symbolen heter "Allerums IP" men anläggningen heter Ryavallen enligt kartans indexlista. Sökfrasen använder anläggningens namn.',
  },
  'odakra-toftavallen': {
    query: 'Toftavallen, Ödåkra, Sverige', matchedName: 'Toftavallen / Gläntanskolan',
    mapName: 'Toftavallen, Ödåkra, D1', mapCell: 'D1', mapStop: 'Toftavallen / Gläntanskolan',
    landmark: 'Gläntanskolan, Ödåkra station',
    confidence: 'medium', verificationStatus: 'probable',
    sourceUrls: [CUP_MAP, SPRITAN],
    reasoning: 'Kartans H-symbol heter "Toftavallen Gläntanskolan" och ligger vid spelplatsen i D1. 2026 års tidtabell kallar hållplatsen "Spritan, Ödåkra Fabriksgatan – Toftavallen", vilket pekar på ett annat läge vid den gamla spritfabriken. Namnen skiljer sig mellan åren, så läget är inte fullt belagt.',
    notes: ['Hållplatsnamnet skiljer sig mellan kartan 2025 och tidtabellen 2026.'],
  },
  'ronnowska-skolan': {
    query: 'Rönnowska skolan, Helsingborg, Sverige', matchedName: 'Rönnowska skolan',
    mapName: 'Rönnowska skolan, C4', mapCell: 'C4', mapStop: 'Rönnowska skolan',
    landmark: 'Rönnowska hallen', confidence: 'high', verificationStatus: 'verified-against-official-map',
    sourceUrls: [CUP_MAP], reasoning: 'H-symbol vid skolan i C4.',
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
      ...(entry.mapName ? { mapName: entry.mapName } : {}),
      ...(entry.mapCell ? { mapCell: entry.mapCell } : {}),
      ...(entry.mapStop ? { mapStop: entry.mapStop } : {}),
      ...(entry.landmark ? { landmark: entry.landmark } : {}),
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
      'Kontrollerad mot data/eskilscupen-karta-2025.pdf — kartcell ur indexlistan och ' +
      'rosa H-symbol för cupens busshållplatser. Se docs/map-pdf-analysis.md.',
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

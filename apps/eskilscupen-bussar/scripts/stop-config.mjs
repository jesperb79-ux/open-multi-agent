/**
 * Canonical stops and venue bindings for Eskilscupen.
 *
 * This is the only place where free-text labels from the PDF are mapped onto
 * stable ids. When next year's timetable arrives, run the importer, read the
 * "unknown stop label" entries in the report, and add them here.
 *
 * Two different things are kept apart:
 *
 *   `aliases`       different spellings of the SAME physical stop. Merged.
 *   `Venue.stopIds` several stops may serve the same football venue. NOT
 *                   merged — the venue simply gets more than one stop.
 *
 * A label is only listed as an alias when the source shows it is the same
 * place. When that cannot be decided from the timetable, the stops stay
 * separate and the open question is recorded in `venue.unresolved`.
 */

/** @typedef {{id: string, name: string, aliases?: string[]}} StopConfig */
/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   stopIds: string[],
 *   note?: string,
 *   unresolved?: string,
 * }} VenueConfig
 */

/** @type {StopConfig[]} */
export const STOPS = [
  { id: 'glumslov', name: 'Glumslöv' },
  { id: 'rydeback-ip', name: 'Rydebäck IP' },
  { id: 'orby-ip', name: 'Örby IP' },
  { id: 'raa-ip', name: 'Råå IP' },
  {
    id: 'hedens-ip',
    name: 'Högastensskolan / Hedens IP',
    // "Högasten" (linje 11) är samma namn förkortat till stadsdelen;
    // "Högastensskolan" (linje 13, 21) är skolan i samma stadsdel.
    aliases: ['Högasten / Hedens IP'],
  },
  { id: 'attekulla-ip', name: 'Ättekulla IP' },
  { id: 'vastra-ramlosa-skola', name: 'Västra Ramlösa Skola' },

  // --- Harlyckan: två hållplatsnamn, se VENUES nedan ---------------------
  {
    id: 'elinebergsplatsen',
    name: 'Elinebergsplatsen / Harlyckan IP',
    // "Elinebergsplansen" skiljer sig med en bokstav från "Elinebergsplatsen",
    // är inte ett ortnamn på svenska, och har exakt samma grannhållplatser och
    // körtider (Västra Ramlösa Skola 4 min på både linje 11 och 13/14).
    // Det är en felstavning, inte en annan hållplats.
    aliases: ['Elinebergsplatsen Harlyckan IP', 'Elinebergsplansen / Harlyckan IP'],
  },
  {
    id: 'elinebergskyrkan',
    name: 'Elinebergskyrkan / Harlyckan IP',
    // Elinebergskyrkan är ett eget landmärke, inte en stavning av
    // Elinebergsplatsen. Tidtabellen likställer dem aldrig — se
    // venue "harlyckan-ip".
    aliases: ['Elinebergskyrkan Harlyckan IP'],
  },

  { id: 'wieselgrensskolan', name: 'Wieselgrensskolan' },
  { id: 'husensjoskolan', name: 'Husensjöskolan' },
  { id: 'gustavslundsskolan', name: 'Gustavslundsskolan' },
  {
    id: 'vastergard-ip',
    name: 'Adolfsberg (Västergård IP 300 m)',
    aliases: ['Adolfsberg (Vätergård IP 300m)'],
  },
  {
    id: 'filborna-ip',
    name: 'Filbornaskolan / Filborna IP',
    aliases: ['Filbornaskolan/Filborna IP'],
  },
  { id: 'olympiaskolan', name: 'Olympiaskolan' },
  { id: 'tagaborgsskolan', name: 'Tågaborgsskolan' },
  // The PDF spells it "Norvalla IP" in every table; the index page spells it
  // "Norrvalla IP". We use the index spelling.
  { id: 'norrvalla-ip', name: 'Norrvalla IP', aliases: ['Norvalla IP'] },
  { id: 'barslov', name: 'Bårslöv' },
  { id: 'gantofta', name: 'Gantofta' },
  { id: 'paarp-medevi', name: 'Påarp Medevi' },
  { id: 'morarp-vidablick-ip', name: 'Mörarp Vidablick IP' },
  { id: 'flygfaltet', name: 'Flygfältet (Vattentornet)' },
  { id: 'maria-park', name: 'Maria Park' },
  { id: 'larods-ip', name: 'Laröds IP' },
  { id: 'scandic-nord', name: 'Scandic Nord' },
  { id: 'allerums-ip', name: 'Allerums IP' },
  {
    id: 'odakra-toftavallen',
    name: 'Spritan, Ödåkra Fabriksgatan – Toftavallen',
    aliases: ['Spritan, Ödåkra Fabriksgatan - Toftavallen'],
  },
  { id: 'ronnowska-skolan', name: 'Rönnowska skolan' },
]

/**
 * Football venues served by the cup buses.
 *
 * Only venues that the timetable itself names are listed — no addresses or
 * coordinates are invented. Several venues share a stop with a school, which
 * is why the venue name and the stop name differ.
 *
 * @type {VenueConfig[]}
 */
export const VENUES = [
  { id: 'norrvalla-ip', name: 'Norrvalla IP', stopIds: ['norrvalla-ip'] },
  { id: 'olympia', name: 'Olympia', stopIds: ['olympiaskolan'], note: 'Hållplats Olympiaskolan' },
  {
    id: 'filborna-ip',
    name: 'Filborna IP',
    stopIds: ['filborna-ip'],
    note: 'Hållplats Filbornaskolan',
  },
  {
    id: 'vastergard-ip',
    name: 'Västergård IP',
    stopIds: ['vastergard-ip'],
    note: 'Hållplats Adolfsberg, ca 300 m promenad',
  },
  {
    id: 'harlyckan-ip',
    name: 'Harlyckans IP',
    stopIds: ['elinebergsplatsen', 'elinebergskyrkan'],
    note: 'Två hållplatsnamn i tidtabellen',
    unresolved:
      'Tidtabellen använder två olika hållplatsnamn för Harlyckans IP: ' +
      '"Elinebergsplatsen" (linje 11, 13, 14, 17) och "Elinebergskyrkan" (linje 12, 21). ' +
      'Det går inte att avgöra ur underlaget om det är samma fysiska hållplats. ' +
      'De hålls därför isär, och ett byte mellan dem planeras inte som ett bussbyte ' +
      'utan kräver att du går. Kontrollera med arrangören.',
  },
  {
    id: 'hedens-ip',
    name: 'Hedens IP',
    stopIds: ['hedens-ip'],
    note: 'Hållplats Högastensskolan',
  },
  { id: 'attekulla-ip', name: 'Ättekulla IP', stopIds: ['attekulla-ip'] },
  { id: 'raa-ip', name: 'Råå IP', stopIds: ['raa-ip'] },
  { id: 'orby-ip', name: 'Örby IP', stopIds: ['orby-ip'] },
  { id: 'rydeback-ip', name: 'Rydebäck IP', stopIds: ['rydeback-ip'] },
  { id: 'maria-park-ip', name: 'Maria Park IP', stopIds: ['maria-park'] },
  { id: 'larods-ip', name: 'Laröds IP', stopIds: ['larods-ip'] },
  { id: 'allerums-ip', name: 'Allerums IP', stopIds: ['allerums-ip'] },
  {
    id: 'toftavallen',
    name: 'Toftavallen',
    stopIds: ['odakra-toftavallen'],
    note: 'Hållplats Spritan, Ödåkra',
  },
  { id: 'morarp-vidablick-ip', name: 'Mörarp Vidablick IP', stopIds: ['morarp-vidablick-ip'] },
]

/**
 * Service calendars. The PDF only distinguishes "fredag & lördag" from
 * "söndag" — it contains no calendar dates at all, so services are matched by
 * weekday (0 = Sunday ... 6 = Saturday).
 */
export const SERVICES = [
  { id: 'fre-lor', label: 'Fredag & lördag', weekdays: [5, 6] },
  { id: 'sondag', label: 'Söndag', weekdays: [0] },
]

/** Header text → service id. */
export const SERVICE_PATTERNS = [
  { pattern: /FREDAG\s*&\s*LÖRDAG/i, serviceId: 'fre-lor' },
  { pattern: /SÖNDAG/i, serviceId: 'sondag' },
]

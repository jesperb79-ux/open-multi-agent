/**
 * Canonical stops and venue bindings for Eskilscupen.
 *
 * This is the only place where free-text labels from the PDF are mapped onto
 * stable ids. When next year's timetable arrives, run the importer, read the
 * "unknown stop label" entries in the report, and add them here.
 *
 * `aliases` must contain every spelling that occurs in the PDF, exactly as the
 * PDF writes it (the importer trims and collapses whitespace, nothing else).
 */

/** @typedef {{id: string, name: string, aliases?: string[]}} StopConfig */
/** @typedef {{id: string, name: string, stopId: string, note?: string}} VenueConfig */

/** @type {StopConfig[]} */
export const STOPS = [
  { id: 'glumslov', name: 'Glumslöv' },
  { id: 'rydeback-ip', name: 'Rydebäck IP' },
  { id: 'orby-ip', name: 'Örby IP' },
  { id: 'raa-ip', name: 'Råå IP' },
  {
    id: 'hedens-ip',
    name: 'Högastensskolan / Hedens IP',
    aliases: ['Högasten / Hedens IP'],
  },
  { id: 'attekulla-ip', name: 'Ättekulla IP' },
  { id: 'vastra-ramlosa-skola', name: 'Västra Ramlösa Skola' },
  {
    id: 'harlyckan-ip',
    name: 'Elinebergsplatsen / Harlyckan IP',
    // The PDF uses three different spellings for the Harlyckan stop.
    // "Elinebergsplansen" is a typo; "Elinebergskyrkan" is a nearby landmark.
    // All three are treated as one stop — see README, "Kända oklarheter".
    aliases: [
      'Elinebergsplatsen Harlyckan IP',
      'Elinebergsplansen / Harlyckan IP',
      'Elinebergskyrkan Harlyckan IP',
    ],
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
  { id: 'norrvalla-ip', name: 'Norrvalla IP', stopId: 'norrvalla-ip' },
  { id: 'olympia', name: 'Olympia', stopId: 'olympiaskolan', note: 'Hållplats Olympiaskolan' },
  { id: 'filborna-ip', name: 'Filborna IP', stopId: 'filborna-ip', note: 'Hållplats Filbornaskolan' },
  {
    id: 'vastergard-ip',
    name: 'Västergård IP',
    stopId: 'vastergard-ip',
    note: 'Hållplats Adolfsberg, ca 300 m promenad',
  },
  { id: 'harlyckan-ip', name: 'Harlyckans IP', stopId: 'harlyckan-ip', note: 'Hållplats Elinebergsplatsen' },
  { id: 'hedens-ip', name: 'Hedens IP', stopId: 'hedens-ip', note: 'Hållplats Högastensskolan' },
  { id: 'attekulla-ip', name: 'Ättekulla IP', stopId: 'attekulla-ip' },
  { id: 'raa-ip', name: 'Råå IP', stopId: 'raa-ip' },
  { id: 'orby-ip', name: 'Örby IP', stopId: 'orby-ip' },
  { id: 'rydeback-ip', name: 'Rydebäck IP', stopId: 'rydeback-ip' },
  { id: 'maria-park-ip', name: 'Maria Park IP', stopId: 'maria-park' },
  { id: 'larods-ip', name: 'Laröds IP', stopId: 'larods-ip' },
  { id: 'allerums-ip', name: 'Allerums IP', stopId: 'allerums-ip' },
  { id: 'toftavallen', name: 'Toftavallen', stopId: 'odakra-toftavallen', note: 'Hållplats Spritan, Ödåkra' },
  { id: 'morarp-vidablick-ip', name: 'Mörarp Vidablick IP', stopId: 'morarp-vidablick-ip' },
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

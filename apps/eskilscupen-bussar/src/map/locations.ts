/**
 * Positioner för planer och hållplatser.
 *
 * Fylls i från arrangörens sida "Spelplaner (Adress, GPS)" — se
 * docs/map-source-audit.md. Just nu finns inga verifierade koordinater alls,
 * och det är avsiktligt: en gissad position på en karta är värre än ingen
 * karta, eftersom den ser lika säker ut som en riktig.
 *
 * Regeln är enkel: bara `verified` får ritas ut. `reported` och `unknown`
 * listas som "position ej bekräftad" utan att placeras någonstans.
 */

export type LocationConfidence = 'verified' | 'reported' | 'unknown'

export interface Coordinate {
  latitude: number
  longitude: number
}

export interface PlaceLocation {
  /** Hållplats-id ur tidtabellen, eller venue-id för en plan. */
  id: string
  /** Utelämnad så länge ingen kontrollerad koordinat finns. */
  coordinate?: Coordinate
  /** Gatuadress, om den är känd. Räknas inte som en position. */
  address?: string
  confidence: LocationConfidence
  /** Varifrån uppgiften kommer, i klartext. */
  source?: string
  note?: string
}

const REPORTED = 'Adress refererad ur officiell sida via sökmotor, ej läst i primärkälla.'

/**
 * Planernas positioner. Konfidensen speglar granskningen i
 * docs/map-source-audit.md — ingen post är `verified` ännu.
 */
export const venueLocations: PlaceLocation[] = [
  { id: 'norrvalla-ip', address: 'Rundgången 15, 254 52 Helsingborg', confidence: 'reported', source: REPORTED },
  {
    id: 'olympia',
    address: 'Olympiaområdet, Filbornavägen 11, 252 76 Helsingborg',
    confidence: 'reported',
    source: REPORTED,
    note: 'Adressen pekar på Olympiahallen. Cupen spelar på Olympiafältet bredvid arenan.',
  },
  { id: 'filborna-ip', address: 'Filbornavägen 101A, Helsingborg', confidence: 'reported', source: REPORTED },
  { id: 'vastergard-ip', address: 'Södra Rangvallagatan 65, Helsingborg', confidence: 'reported', source: REPORTED },
  {
    id: 'harlyckan-ip',
    address: 'Gärdesgatan 4, Helsingborg',
    confidence: 'reported',
    source: REPORTED,
    note: 'Planen nås från två hållplatser som ännu inte är utredda.',
  },
  { id: 'hedens-ip', address: 'Planteringsvägen 143, Helsingborg', confidence: 'reported', source: REPORTED },
  { id: 'attekulla-ip', address: 'Ättekullagatan, Helsingborg', confidence: 'reported', source: REPORTED },
  { id: 'raa-ip', address: 'Starkoddersgatan 6, Råå', confidence: 'reported', source: REPORTED },
  { id: 'orby-ip', address: 'Örbyvägen, Örby ängar', confidence: 'reported', source: REPORTED },
  { id: 'rydeback-ip', address: 'Frösögatan 15, Rydebäck', confidence: 'reported', source: REPORTED },
  { id: 'maria-park-ip', address: 'Mariehällsvägen, Helsingborg', confidence: 'reported', source: REPORTED },
  { id: 'larods-ip', address: 'Gummarpsvägen 25, Laröd', confidence: 'reported', source: REPORTED },
  { id: 'allerums-ip', address: 'Jonstorpsvägen, Allerum', confidence: 'reported', source: REPORTED },
  {
    id: 'toftavallen',
    confidence: 'unknown',
    note: 'Kallas Ödåkra idrottsplats i kommunens register. Att det är samma anläggning är en tolkning.',
  },
  {
    id: 'morarp-vidablick-ip',
    confidence: 'unknown',
    note: 'Ingen gatuadress hittad. Att Vidablick är Mörarps idrottsplats är en tolkning.',
  },
]

/**
 * Hållplatsernas lägen. Tidtabells-PDF:en innehåller varken koordinater eller
 * adresser, så listan är tom tills hållplatsdata hämtats.
 */
export const stopLocations: PlaceLocation[] = []

const byId = (locations: PlaceLocation[]) => new Map(locations.map((l) => [l.id, l]))

export const venueLocationById = byId(venueLocations)
export const stopLocationById = byId(stopLocations)

/** En position får bara ritas ut när den är kontrollerad mot primärkälla. */
export const isPlottable = (location: PlaceLocation | undefined): boolean =>
  location?.confidence === 'verified' && location.coordinate !== undefined

/** Positioner som får ritas ut, i den ordning de definierats. */
export const plottableLocations = (locations: PlaceLocation[]): PlaceLocation[] =>
  locations.filter(isPlottable)

/** Platser som saknar kontrollerad position och därför bara kan listas. */
export const unplottableLocations = (locations: PlaceLocation[]): PlaceLocation[] =>
  locations.filter((location) => !isPlottable(location))

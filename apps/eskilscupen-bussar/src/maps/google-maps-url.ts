/**
 * Officiella Google Maps-URL:er, utan API-nyckel.
 *
 * Adresserna byggs alltid med `URLSearchParams`, aldrig genom att klistra ihop
 * strängar. Det gör att å, ä, ö, mellanslag och skiljetecken kodas rätt och att
 * en sökfras inte kan smita ut ur sin parameter.
 */

const SEARCH_BASE = 'https://www.google.com/maps/search/'
const DIRECTIONS_BASE = 'https://www.google.com/maps/dir/'

/** Attribut som varje extern länk ska ha. */
export const EXTERNAL_LINK_ATTRIBUTES = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const

/** Öppnar Google Maps med en sökning på platsen. */
export function mapsSearchUrl(query: string): string {
  const params = new URLSearchParams({ api: '1', query })
  return `${SEARCH_BASE}?${params.toString()}`
}

/**
 * Öppnar vägbeskrivning till platsen, till fots.
 *
 * Ingen `origin` skickas med: Google Maps utgår då från användarens egen
 * position, och appen behöver varken be om platsbehörighet eller känna till
 * var användaren är.
 */
export function mapsDirectionsUrl(destination: string): string {
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'walking',
    dir_action: 'navigate',
  })
  return `${DIRECTIONS_BASE}?${params.toString()}`
}

import { mapsLocationForStop, type GoogleMapsLocation } from '../config/googleMapsLocations'
import type { Journey } from '../types'

/** Var i resan en navigeringslänk hör hemma. */
export type JourneyLinkRole = 'start' | 'transfer' | 'destination'

/** Nyckel i {@link journeyLinks}, t.ex. `transfer:norrvalla-ip`. */
export const linkKey = (role: JourneyLinkRole, stopId: string): string => `${role}:${stopId}`

/**
 * De hållplatser i en resa som ska få en Navigera-länk: påstigningen, varje
 * faktiskt byte och slutmålet. Mellanliggande hållplatser som bussen bara
 * passerar får ingen — man kliver inte av där.
 *
 * Samma navigeringsmål visas bara en gång per resealternativ. Elva av
 * spelplatserna delar mål med sin hållplats (Laröds IP, Filborna IP, Råå IP …),
 * och en resa kan börja och sluta i närheten av samma läge. Utan den
 * kontrollen får användaren flera knappar som öppnar exakt samma karta.
 *
 * Ren funktion utan miljöberoende — feature-flaggan sitter i {@link MapsLinks},
 * som är det enda stället där en länk faktiskt renderas.
 */
export function journeyLinks(journey: Journey): Map<string, GoogleMapsLocation> {
  const links = new Map<string, GoogleMapsLocation>()
  if (journey.legs.length === 0) return links

  const candidates: [JourneyLinkRole, string][] = [
    ['start', journey.legs[0].fromStop],
    ...journey.transfersDetail.map(
      (transfer): [JourneyLinkRole, string] => ['transfer', transfer.stopId],
    ),
    ['destination', journey.legs[journey.legs.length - 1].toStop],
  ]

  const seenDestinations = new Set<string>()
  for (const [role, stopId] of candidates) {
    const location = mapsLocationForStop(stopId)
    // Platser utan belagt läge filtreras redan bort i konfigurationen.
    if (!location) continue
    if (seenDestinations.has(location.directionsUrl)) continue
    seenDestinations.add(location.directionsUrl)
    links.set(linkKey(role, stopId), location)
  }
  return links
}

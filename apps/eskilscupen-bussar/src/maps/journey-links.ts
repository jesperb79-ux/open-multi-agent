import { mapsLocationForStop, type GoogleMapsLocation } from '../config/googleMapsLocations'
import type { Journey } from '../types'
import { finalWalkTarget } from './venue-stops'

/** Var i resan en navigeringslänk hör hemma. */
export type JourneyLinkRole = 'start' | 'transfer' | 'destination' | 'venue'

/** Nyckel i {@link journeyLinks}, t.ex. `transfer:norrvalla-ip`. */
export const linkKey = (role: JourneyLinkRole, id: string): string => `${role}:${id}`

/**
 * De platser i en resa som ska få en Navigera-länk.
 *
 * Under bussresan är det hållplatsen som gäller, aldrig spelplanen. Cupbussen
 * stannar ofta en bit därifrån — vid Högastensskolan, Filbornaskolan, Spritan
 * eller Adolfsberg 300 m från Västergårds IP — och den som ska hinna med
 * bussen behöver komma till hållplatsen, inte till planen. Nycklarna under
 * resan är därför alltid tidtabellens `stopId`:
 *
 *   `start`       resans första påstigningshållplats
 *   `transfer`    varje faktiskt byte
 *   `destination` hållplatsen där man kliver av sista bussen
 *
 * Först när bussresan är slut blir spelplatsen intressant:
 *
 *   `venue`       den sista gångsträckan från sluthållplatsen till planen
 *
 * Den läggs bara till när planen har ett annat navigeringsmål än hållplatsen.
 * Elva av femton spelplatser har hållplatsen på planen, och där vore en andra
 * knapp bara en dubblett.
 *
 * Mellanliggande hållplatser som bussen passerar får ingen länk — man kliver
 * inte av där. Samma navigeringsmål visas aldrig mer än en gång per
 * resealternativ.
 *
 * Ren funktion utan miljöberoende — feature-flaggan sitter i `MapsLinks`, som
 * är det enda stället där en länk faktiskt renderas.
 */
export function journeyLinks(
  journey: Journey,
  destinationVenueId?: string,
): Map<string, GoogleMapsLocation> {
  const links = new Map<string, GoogleMapsLocation>()
  if (journey.legs.length === 0) return links

  const arrivalStop = journey.legs[journey.legs.length - 1].toStop

  const candidates: [JourneyLinkRole, string, GoogleMapsLocation | undefined][] = [
    ['start', journey.legs[0].fromStop, mapsLocationForStop(journey.legs[0].fromStop)],
    ...journey.transfersDetail.map(
      (transfer): [JourneyLinkRole, string, GoogleMapsLocation | undefined] => [
        'transfer',
        transfer.stopId,
        mapsLocationForStop(transfer.stopId),
      ],
    ),
    ['destination', arrivalStop, mapsLocationForStop(arrivalStop)],
    // Sist i listan: delar planen mål med hållplatsen faller den bort här.
    ['venue', destinationVenueId ?? '', finalWalkTarget(destinationVenueId, arrivalStop)],
  ]

  const seenDestinations = new Set<string>()
  for (const [role, id, location] of candidates) {
    // Platser utan belagt läge filtreras redan bort i konfigurationen.
    if (!location) continue
    if (seenDestinations.has(location.directionsUrl)) continue
    seenDestinations.add(location.directionsUrl)
    links.set(linkKey(role, id), location)
  }
  return links
}

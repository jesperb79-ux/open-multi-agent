/**
 * Google Maps-länkar för appens platser.
 *
 * Innehållet kommer från `data/google-maps-matches.json`, som byggs av
 * `npm run maps:matches` och bär bedömningen per plats. Den här filen lägger
 * bara på de färdiga adresserna och filtrerar bort det som inte får visas.
 *
 * Obekräftade platser (`unverified`) exponeras inte alls: hellre ingen länk än
 * en som pekar på ortens mittpunkt när användaren tror att den pekar på
 * hållplatsen.
 */

import matches from '../../data/google-maps-matches.json'
import { mapsDirectionsUrl, mapsSearchUrl } from '../maps/google-maps-url'

export type GoogleMapsConfidence = 'high' | 'medium' | 'low'

export type GoogleMapsVerificationStatus =
  | 'verified-against-official-map'
  | 'probable'
  | 'unverified'

export interface GoogleMapsLocation {
  id: string
  label: string
  type: 'venue' | 'bus-stop'
  query: string
  latitude?: number
  longitude?: number
  confidence: GoogleMapsConfidence
  verificationStatus: GoogleMapsVerificationStatus
  showUrl: string
  directionsUrl: string
  note?: string
}

/** Texten användaren får när placeringen inte är säker. */
export const APPROXIMATE_NOTICE = 'Placeringen är ungefärlig, kontrollera skyltning på plats.'

interface RawMatch {
  id: string
  type: string
  appName: string
  query: string
  matchedName?: string
  confidence: string
  verificationStatus: string
  reasoning: string
  notes?: string[]
}

const SHOWN: GoogleMapsVerificationStatus[] = ['verified-against-official-map', 'probable']

const isShown = (status: string): status is GoogleMapsVerificationStatus =>
  (SHOWN as string[]).includes(status)

/**
 * Destinationen för navigeringslänken.
 *
 * Koordinater används när de är säkra nog; annars den verifierade sökfrasen.
 * I dag finns inga koordinater — Eskilscupens GPS-sida gick inte att läsa.
 */
const destinationFor = (location: { query: string; latitude?: number; longitude?: number }): string =>
  location.latitude !== undefined && location.longitude !== undefined
    ? `${location.latitude},${location.longitude}`
    : location.query

function build(raw: RawMatch): GoogleMapsLocation {
  const base = {
    id: raw.id,
    label: raw.matchedName ?? raw.appName,
    type: raw.type as GoogleMapsLocation['type'],
    query: raw.query,
    confidence: raw.confidence as GoogleMapsConfidence,
    verificationStatus: raw.verificationStatus as GoogleMapsVerificationStatus,
    ...(raw.notes?.length ? { note: raw.notes[0] } : {}),
  }
  return {
    ...base,
    showUrl: mapsSearchUrl(base.query),
    directionsUrl: mapsDirectionsUrl(destinationFor(base)),
  }
}

/** Alla platser som får visas i appen. */
export const googleMapsLocations: GoogleMapsLocation[] = (matches.matches as RawMatch[])
  .filter((raw) => isShown(raw.verificationStatus))
  .map(build)

const byKey = new Map(googleMapsLocations.map((location) => [`${location.type}:${location.id}`, location]))

/** Länkar för en fotbollsplan, eller `undefined` när platsen inte får visas. */
export const mapsLocationForVenue = (venueId: string): GoogleMapsLocation | undefined =>
  byKey.get(`venue:${venueId}`)

/** Länkar för en hållplats, eller `undefined` när platsen inte får visas. */
export const mapsLocationForStop = (stopId: string): GoogleMapsLocation | undefined =>
  byKey.get(`bus-stop:${stopId}`)

/**
 * Behöver placeringen en reservation?
 *
 * Allt som inte är `high` får texten i {@link APPROXIMATE_NOTICE}. En medelsäker
 * träff pekar på rätt område men inte nödvändigtvis på hållplatsläget.
 */
export const needsApproximateNotice = (location: GoogleMapsLocation): boolean =>
  location.confidence !== 'high'

/**
 * Är platsen kontrollerad mot Eskilscupens officiella karta?
 *
 * Ingen plats är det ännu. Funktionen finns för att gränssnittet aldrig ska
 * kunna påstå att en träff är verifierad bara för att namnet stämmer.
 */
export const isVerifiedAgainstOfficialMap = (location: GoogleMapsLocation): boolean =>
  location.verificationStatus === 'verified-against-official-map'

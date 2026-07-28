import {
  mapsLocationForStop,
  mapsLocationForVenue,
  type GoogleMapsLocation,
} from '../config/googleMapsLocations'
import { venues } from '../data/timetable'

/**
 * Kopplingen spelplats → hållplats → navigeringsmål.
 *
 * De två sakerna är inte samma. Cupbussen stannar ofta vid en skola, en
 * station eller en tillfällig hållplats en bit från planen — Hedens IP nås
 * från Högastensskolan, Filborna IP från Filbornaskolan, Västergårds IP från
 * Adolfsberg 300 m bort, Toftavallen från Spritan vid Fabriksgatan.
 *
 * Under själva bussresan är hållplatsen det som gäller. Spelplatsen är målet
 * för den sista gångsträckan, och bara när den faktiskt ligger någon
 * annanstans än hållplatsen.
 */

const stopIdsByVenue = new Map(venues.map((venue) => [venue.id, venue.stopIds]))

/** Vilka hållplatser trafikerar spelplatsen? Tom lista för okänd plats. */
export const stopIdsForVenue = (venueId: string): string[] => stopIdsByVenue.get(venueId) ?? []

/** Spelplatser som nås från hållplatsen. En hållplats kan betjäna flera. */
export const venueIdsForStop = (stopId: string): string[] =>
  venues.filter((venue) => venue.stopIds.includes(stopId)).map((venue) => venue.id)

/**
 * Är spelplatsen och hållplatsen samma navigeringsmål?
 *
 * Elva av femton spelplatser är det — Norrvalla IP, Råå IP, Laröds IP och de
 * andra har hållplatsen på planen. Då räcker en knapp.
 */
export function sharesTarget(venueId: string, stopId: string): boolean {
  const venue = mapsLocationForVenue(venueId)
  const stop = mapsLocationForStop(stopId)
  if (!venue || !stop) return false
  return venue.directionsUrl === stop.directionsUrl
}

/**
 * Målet för den sista gångsträckan från hållplatsen till planen.
 *
 * `undefined` när spelplatsen saknar länk, när den inte alls nås från den här
 * hållplatsen, eller när den delar mål med hållplatsen — då har resenären
 * redan navigerat rätt och en knapp till skulle bara peka på samma karta.
 */
export function finalWalkTarget(
  venueId: string | undefined,
  arrivalStopId: string,
): GoogleMapsLocation | undefined {
  if (!venueId) return undefined
  if (!stopIdsForVenue(venueId).includes(arrivalStopId)) return undefined
  if (sharesTarget(venueId, arrivalStopId)) return undefined
  return mapsLocationForVenue(venueId)
}

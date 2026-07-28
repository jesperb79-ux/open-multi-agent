import type { BusConnection, Service, Stop, Timetable, Venue } from '../types'
import { buildConnections } from '../planner/findJourneys'
import timetableJson from './timetable.json'
import venuesJson from './venues.json'

export const timetable = timetableJson as Timetable
export const venues = venuesJson as Venue[]

/** Connections are derived once; the JSON only ships trips to stay small. */
export const connections: BusConnection[] = buildConnections(timetable.trips)

export const stopsById = new Map<string, Stop>(timetable.stops.map((s) => [s.id, s]))
export const routesById = new Map(timetable.routes.map((r) => [r.id, r]))

export const stopName = (stopId: string): string => stopsById.get(stopId)?.name ?? stopId
export const routeName = (routeId: string): string => routesById.get(routeId)?.name ?? `Linje ${routeId}`

/** Stops that a venue is attached to, so the UI can list the rest separately. */
export const venueStopIds = new Set(venues.flatMap((v) => v.stopIds))

/** The service calendar that runs on a given `YYYY-MM-DD` date, if any. */
export function serviceForDate(isoDate: string, services: Service[] = timetable.services): Service | null {
  const date = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const weekday = date.getDay()
  return services.find((s) => s.weekdays.includes(weekday)) ?? null
}

/**
 * Vilka hållplatser som trafikeras vilket trafikdygn.
 *
 * Fem hållplatser går bara på söndagen (Gantofta, Påarp Medevi, Allerums IP,
 * Flygfältet och Mörarp Vidablick IP). Utan den här uppslagningen möts en
 * användare som söker till dem på en fredag av ett tekniskt felmeddelande med
 * ett internt id i stället för en förklaring.
 */
export const servedStopIdsByService = new Map<string, Set<string>>(
  timetable.services.map((service) => [
    service.id,
    new Set(
      timetable.trips
        .filter((trip) => trip.serviceId === service.id)
        .flatMap((trip) => trip.stopTimes.map((stopTime) => stopTime.stopId)),
    ),
  ]),
)

/** Sant när hållplatsen har minst en avgång eller ankomst det trafikdygnet. */
export const isStopServed = (stopId: string, serviceId: string): boolean =>
  servedStopIdsByService.get(serviceId)?.has(stopId) ?? false

/** De trafikdygn hållplatsen trafikeras — tom lista om den aldrig trafikeras. */
export const servicesServingStop = (stopId: string): Service[] =>
  timetable.services.filter((service) => isStopServed(stopId, service.id))

export interface DataProblem {
  code: 'no-trips' | 'venue-without-stop' | 'unknown-stop-reference'
  message: string
}

/**
 * Check that the bundled data is usable before the UI offers a search.
 * Returns an empty list when everything is in order.
 */
export function validateData(): DataProblem[] {
  const problems: DataProblem[] = []
  if (!timetable.trips || timetable.trips.length === 0) {
    problems.push({ code: 'no-trips', message: 'Tidtabellen innehåller inga avgångar.' })
  }
  for (const venue of venues) {
    const served = venue.stopIds.filter((stopId) => stopsById.has(stopId))
    if (served.length === 0) {
      problems.push({
        code: 'venue-without-stop',
        message: `Fotbollsplanen ${venue.name} saknar en hållplats som trafikeras av cupbussarna.`,
      })
    } else if (served.length < venue.stopIds.length) {
      problems.push({
        code: 'unknown-stop-reference',
        message: `Fotbollsplanen ${venue.name} pekar på en hållplats som inte finns i tidtabellen.`,
      })
    }
  }
  return problems
}

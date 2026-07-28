import { stopsById, venueStopIds, venues } from './data/timetable'
import { timetable } from './data/timetable'

/** One selectable entry in the from/to pickers. */
export interface Place {
  /** Unique key for the `<option>` — venues and stops share the same list. */
  key: string
  label: string
  stopId: string
  group: 'Fotbollsplaner' | 'Övriga hållplatser'
  note?: string
}

/**
 * Football venues first, then the remaining stops. Two venues sharing a stop
 * both appear, so a user can pick the name they recognise.
 */
export const places: Place[] = [
  ...venues
    .filter((venue) => stopsById.has(venue.stopId))
    .map((venue): Place => ({
      key: `venue:${venue.id}`,
      label: venue.name,
      stopId: venue.stopId,
      group: 'Fotbollsplaner',
      note: venue.note,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv')),
  ...timetable.stops
    .filter((stop) => !venueStopIds.has(stop.id))
    .map((stop): Place => ({
      key: `stop:${stop.id}`,
      label: stop.name,
      stopId: stop.id,
      group: 'Övriga hållplatser',
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'sv')),
]

export const placeByKey = new Map(places.map((place) => [place.key, place]))

/** Venues without a stop in the timetable — surfaced as a data problem. */
export const venuesWithoutStop = venues.filter((venue) => !stopsById.has(venue.stopId))

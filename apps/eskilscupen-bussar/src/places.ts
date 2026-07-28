import { stopName, stopsById, timetable, venueStopIds, venues } from './data/timetable'

/** One selectable entry in the from/to pickers. */
export interface Place {
  /** Unique key for the `<option>` — venues and stops share the same list. */
  key: string
  label: string
  stopId: string
  /** Spelplatsen, när platsen är en sådan. Målet för den sista gångsträckan. */
  venueId?: string
  group: 'Fotbollsplaner' | 'Övriga hållplatser'
  note?: string
  /** Open question about which physical stop serves this venue. */
  unresolved?: string
}

/**
 * Football venues first, then the remaining stops.
 *
 * A venue served by more than one stop gets one entry per stop, because the
 * timetable does not tell us whether those stops are the same place. The
 * traveller picks the one their bus actually calls at.
 */
export const places: Place[] = [
  ...venues
    .flatMap((venue) =>
      venue.stopIds
        .filter((stopId) => stopsById.has(stopId))
        .map((stopId, _index, served): Place => ({
          key: `venue:${venue.id}@${stopId}`,
          label: served.length > 1 ? `${venue.name} – ${stopName(stopId)}` : venue.name,
          stopId,
          venueId: venue.id,
          group: 'Fotbollsplaner',
          note: venue.note,
          unresolved: venue.unresolved,
        })),
    )
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

/** Venues with no stop at all in the timetable — surfaced as a data problem. */
export const venuesWithoutStop = venues.filter(
  (venue) => !venue.stopIds.some((stopId) => stopsById.has(stopId)),
)

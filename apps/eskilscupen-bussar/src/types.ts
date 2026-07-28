/** Domain types shared by the timetable data, the planner and the UI. */

/**
 * One bus movement between two consecutive stops on one trip.
 *
 * Times are `HH:MM` in local time. Values at or beyond `24:00` mean "next day"
 * (`24:10` is 00:10 the following morning), which is how a trip that runs past
 * midnight is represented without needing a date on every row.
 */
export interface BusConnection {
  routeId: string
  tripId: string
  fromStop: string
  departureTime: string
  toStop: string
  arrivalTime: string
  /** Set only when a connection runs on one specific date. */
  operatingDate?: string
  /** Service calendar the connection belongs to, e.g. `fre-lor`. */
  serviceId?: string
}

/**
 * A football venue and the stops it is served from.
 *
 * More than one stop is allowed: the timetable sometimes names two different
 * stops for the same pitch. Those stops are kept apart rather than merged, and
 * the open question is recorded in `unresolved`.
 */
export interface Venue {
  id: string
  name: string
  stopIds: string[]
  address?: string
  latitude?: number
  longitude?: number
  /** Free-text hint, e.g. "Hållplats Adolfsberg, ca 300 m promenad". */
  note?: string
  /** Set when it is unclear whether the venue's stops are the same place. */
  unresolved?: string
}

export interface Stop {
  id: string
  name: string
}

export interface Route {
  id: string
  name: string
}

export interface Service {
  id: string
  label: string
  /** Weekdays the service runs on, `0` = Sunday ... `6` = Saturday. */
  weekdays: number[]
}

export interface StopTime {
  stopId: string
  time: string
}

export interface Trip {
  id: string
  routeId: string
  serviceId: string
  headsign: string
  stopTimes: StopTime[]
}

export interface Timetable {
  source: { file: string; sha256: string; pages: number }
  services: Service[]
  routes: Route[]
  stops: Stop[]
  trips: Trip[]
}

/** One continuous ride on a single bus (one `tripId`). */
export interface JourneyLeg {
  routeId: string
  tripId: string
  fromStop: string
  toStop: string
  departureTime: string
  arrivalTime: string
  departureMinutes: number
  arrivalMinutes: number
  /** Stops passed without changing bus, in travel order. */
  intermediateStops: string[]
}

/** The wait between two legs. */
export interface JourneyTransfer {
  stopId: string
  arrivalTime: string
  departureTime: string
  waitMinutes: number
}

export interface Journey {
  departureTime: string
  arrivalTime: string
  departureMinutes: number
  arrivalMinutes: number
  durationMinutes: number
  /** Number of bus changes — a journey on one bus has `0`. */
  transfers: number
  legs: JourneyLeg[]
  transfersDetail: JourneyTransfer[]
}

export type PlannerErrorCode =
  | 'same-origin-and-destination'
  | 'invalid-time-format'
  | 'unknown-stop'
  | 'no-connections'
  | 'invalid-options'

/** Thrown for input the planner cannot act on. The UI turns `code` into text. */
export class PlannerError extends Error {
  readonly code: PlannerErrorCode

  constructor(code: PlannerErrorCode, message: string) {
    super(message)
    this.name = 'PlannerError'
    this.code = code
  }
}

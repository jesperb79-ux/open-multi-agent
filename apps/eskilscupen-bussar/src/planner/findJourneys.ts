import {
  type BusConnection,
  type Journey,
  type JourneyLeg,
  type JourneyTransfer,
  PlannerError,
} from '../types'
import { formatTime, parseTime } from './time'

export interface FindJourneysOptions {
  connections: BusConnection[]
  originStop: string
  destinationStop: string
  /** `HH:MM`; the traveller is at the origin stop from this time. */
  earliestDeparture: string
  /** Minimum time needed to change bus. Default 5. */
  minimumTransferMinutes?: number
  /** Maximum number of bus changes. Default 3. */
  maxTransfers?: number
  /** Only use connections belonging to this service calendar. */
  serviceId?: string
  /** Only use connections valid on this date (`YYYY-MM-DD`). */
  operatingDate?: string
  /** How many alternatives to return. Default 3. */
  maxResults?: number
}

export const DEFAULT_MINIMUM_TRANSFER_MINUTES = 5
export const DEFAULT_MAX_TRANSFERS = 3
export const DEFAULT_MAX_RESULTS = 3

/** A connection with its times resolved to minutes, ready for scanning. */
interface ScanConnection {
  connection: BusConnection
  departure: number
  arrival: number
}

/**
 * A partial journey ending at some stop. Labels are kept per stop and pruned by
 * Pareto dominance on (arrival, transfers).
 */
interface Label {
  arrival: number
  transfers: number
  /** Trip of the last connection — riding on means no extra transfer. */
  tripId: string | null
  firstDeparture: number
  totalWaitMinutes: number
  previous: Label | null
  connection: ScanConnection | null
}

/** Prepare and sanity-check the raw connection list. */
function prepare(options: FindJourneysOptions): ScanConnection[] {
  const { connections, serviceId, operatingDate } = options
  const scannable: ScanConnection[] = []

  for (const connection of connections) {
    if (serviceId !== undefined && connection.serviceId !== undefined && connection.serviceId !== serviceId) {
      continue
    }
    if (operatingDate !== undefined && connection.operatingDate !== undefined && connection.operatingDate !== operatingDate) {
      continue
    }
    const departure = parseTime(connection.departureTime)
    const arrival = parseTime(connection.arrivalTime)
    if (arrival < departure) {
      throw new PlannerError(
        'invalid-time-format',
        `Förbindelsen ${connection.tripId} ${connection.fromStop}→${connection.toStop} ` +
          `ankommer (${connection.arrivalTime}) före avgång (${connection.departureTime}).`,
      )
    }
    scannable.push({ connection, departure, arrival })
  }

  scannable.sort((a, b) => a.departure - b.departure || a.arrival - b.arrival)
  return scannable
}

/**
 * Last resort when two labels are equal on every optimisation criterion:
 * spend as little time waiting at stops as possible.
 */
function isBetterTieBreak(candidate: Label, incumbent: Label): boolean {
  return candidate.totalWaitMinutes < incumbent.totalWaitMinutes
}

/**
 * Does `a` dominate `b`? A journey is better when it arrives no later, changes
 * bus no more often, and leaves no earlier. Departure time has to be part of
 * this: without it, an option that leaves 10 minutes later and arrives at the
 * same time would be thrown away even though it is strictly nicer to travel.
 */
function dominates(a: Label, b: Label): boolean {
  return a.arrival <= b.arrival && a.transfers <= b.transfers && a.firstDeparture >= b.firstDeparture
}

/** Insert a label into a Pareto set. Returns false if it was dominated. */
function addLabel(labels: Label[], candidate: Label): boolean {
  for (const existing of labels) {
    if (!dominates(existing, candidate)) continue
    // Equal on every criterion — keep whichever waits less.
    if (dominates(candidate, existing) && isBetterTieBreak(candidate, existing)) break
    return false
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    if (dominates(candidate, labels[i])) labels.splice(i, 1)
  }
  labels.push(candidate)
  return true
}

/**
 * Pareto set for "still on this bus". Arrival is fixed by the trip itself, so
 * only the transfer count and the departure time can differ.
 */
function addOnboardLabel(labels: Label[], candidate: Label): void {
  const onboardDominates = (a: Label, b: Label) =>
    a.transfers <= b.transfers && a.firstDeparture >= b.firstDeparture
  for (const existing of labels) {
    if (!onboardDominates(existing, candidate)) continue
    if (onboardDominates(candidate, existing) && isBetterTieBreak(candidate, existing)) break
    return
  }
  for (let i = labels.length - 1; i >= 0; i--) {
    if (onboardDominates(candidate, labels[i])) labels.splice(i, 1)
  }
  labels.push(candidate)
}

/**
 * Connection-scan profile search over the whole day.
 *
 * Connections are scanned in departure order. A connection can be used either by
 * staying seated on a trip already boarded, or by boarding at its `fromStop`
 * after waiting at least `minimumTransferMinutes`. Staying seated is tracked per
 * trip rather than per stop: a traveller already on the bus needs no transfer
 * time, and would otherwise be wrongly pruned by a label that merely arrives at
 * the same stop at the same time.
 *
 * @returns every non-dominated way to reach `destinationStop`
 */
function searchProfile(
  scannable: ScanConnection[],
  originStop: string,
  destinationStop: string,
  earliestDeparture: number,
  minimumTransferMinutes: number,
  maxTransfers: number,
): Label[] {
  const labelsByStop = new Map<string, Label[]>()
  /** Per trip: where the traveller sits right now, best label per transfer count. */
  const onboardByTrip = new Map<string, Label[]>()

  const originLabel: Label = {
    arrival: earliestDeparture,
    transfers: -1, // boarding the first bus lifts this to 0
    tripId: null,
    firstDeparture: Number.POSITIVE_INFINITY,
    totalWaitMinutes: 0,
    previous: null,
    connection: null,
  }
  labelsByStop.set(originStop, [originLabel])

  for (const scan of scannable) {
    if (scan.departure < earliestDeparture) continue

    const tripId = scan.connection.tripId
    /** Labels for "aboard this bus at scan.fromStop", with the transfer count so far. */
    const aboard: Label[] = [...(onboardByTrip.get(tripId) ?? [])]

    for (const label of labelsByStop.get(scan.connection.fromStop) ?? []) {
      if (label.tripId === tripId) continue // already covered by `aboard`
      const transfers = label.transfers + 1
      if (transfers > maxTransfers) continue

      // Standing at the origin stop costs no transfer time; changing bus does.
      const isAtOrigin = label.connection === null
      const wait = scan.departure - label.arrival
      if (wait < 0) continue
      if (!isAtOrigin && wait < minimumTransferMinutes) continue

      addOnboardLabel(aboard, {
        ...label,
        transfers,
        totalWaitMinutes: label.totalWaitMinutes + (isAtOrigin ? 0 : wait),
        firstDeparture: isAtOrigin ? scan.departure : label.firstDeparture,
      })
    }

    if (aboard.length === 0) continue

    const arrived: Label[] = []
    for (const rider of aboard) {
      addOnboardLabel(arrived, {
        arrival: scan.arrival,
        transfers: rider.transfers,
        tripId,
        firstDeparture: rider.firstDeparture,
        totalWaitMinutes: rider.totalWaitMinutes,
        previous: rider,
        connection: scan,
      })
    }

    // The traveller is now one stop further along this trip.
    onboardByTrip.set(tripId, arrived)

    const target = scan.connection.toStop
    const targetLabels = labelsByStop.get(target) ?? []
    labelsByStop.set(target, targetLabels)
    for (const candidate of arrived) addLabel(targetLabels, candidate)
  }

  return labelsByStop.get(destinationStop) ?? []
}

/**
 * Ranking of the Pareto front: earliest arrival first, then fewest changes,
 * then the latest departure and the shortest waiting time.
 */
function isBetterJourney(candidate: Label, incumbent: Label): boolean {
  if (candidate.arrival !== incumbent.arrival) return candidate.arrival < incumbent.arrival
  if (candidate.transfers !== incumbent.transfers) return candidate.transfers < incumbent.transfers
  if (candidate.firstDeparture !== incumbent.firstDeparture) {
    return candidate.firstDeparture > incumbent.firstDeparture
  }
  return isBetterTieBreak(candidate, incumbent)
}

/** Walk a label chain back to the origin and merge same-trip connections. */
function toJourney(label: Label): Journey {
  const scans: ScanConnection[] = []
  for (let node: Label | null = label; node?.connection; node = node.previous) {
    scans.push(node.connection)
  }
  scans.reverse()

  const legs: JourneyLeg[] = []
  for (const scan of scans) {
    const last = legs[legs.length - 1]
    if (last && last.tripId === scan.connection.tripId) {
      last.intermediateStops.push(last.toStop)
      last.toStop = scan.connection.toStop
      last.arrivalTime = scan.connection.arrivalTime
      last.arrivalMinutes = scan.arrival
      continue
    }
    legs.push({
      routeId: scan.connection.routeId,
      tripId: scan.connection.tripId,
      fromStop: scan.connection.fromStop,
      toStop: scan.connection.toStop,
      departureTime: formatTime(scan.departure),
      arrivalTime: formatTime(scan.arrival),
      departureMinutes: scan.departure,
      arrivalMinutes: scan.arrival,
      intermediateStops: [],
    })
  }

  const transfersDetail: JourneyTransfer[] = []
  for (let i = 1; i < legs.length; i++) {
    transfersDetail.push({
      stopId: legs[i].fromStop,
      arrivalTime: legs[i - 1].arrivalTime,
      departureTime: legs[i].departureTime,
      waitMinutes: legs[i].departureMinutes - legs[i - 1].arrivalMinutes,
    })
  }

  const first = legs[0]
  const last = legs[legs.length - 1]
  return {
    departureTime: first.departureTime,
    arrivalTime: last.arrivalTime,
    departureMinutes: first.departureMinutes,
    arrivalMinutes: last.arrivalMinutes,
    durationMinutes: last.arrivalMinutes - first.departureMinutes,
    transfers: legs.length - 1,
    legs,
    transfersDetail,
  }
}

/**
 * Find the best bus journeys between two stops.
 *
 * The bus network is treated as a time-dependent graph: a departure may only be
 * used if it leaves after the traveller has reached the stop, if the transfer
 * time is long enough, and if it runs on the selected day. Alternatives are
 * produced by repeating the search from just after each result's first
 * departure, so the list is "next bus, the one after that, …" — each of them
 * optimal for its own departure window.
 *
 * @returns up to `maxResults` journeys, best first. Empty when nothing runs.
 * @throws {PlannerError} for unusable input (same stops, bad time, unknown stop)
 */
export function findJourneys(options: FindJourneysOptions): Journey[] {
  const {
    originStop,
    destinationStop,
    minimumTransferMinutes = DEFAULT_MINIMUM_TRANSFER_MINUTES,
    maxTransfers = DEFAULT_MAX_TRANSFERS,
    maxResults = DEFAULT_MAX_RESULTS,
  } = options

  if (!options.connections || options.connections.length === 0) {
    throw new PlannerError('no-connections', 'Tidtabellsdata saknas eller kunde inte läsas.')
  }
  if (!originStop || !destinationStop) {
    throw new PlannerError('unknown-stop', 'Både startplats och destination måste anges.')
  }
  if (originStop === destinationStop) {
    throw new PlannerError('same-origin-and-destination', 'Start och destination är samma hållplats.')
  }
  if (minimumTransferMinutes < 0 || maxTransfers < 0 || maxResults < 1) {
    throw new PlannerError('invalid-options', 'Ogiltiga sökinställningar.')
  }

  const earliestDeparture = parseTime(options.earliestDeparture)
  const scannable = prepare(options)

  const servedStops = new Set<string>()
  for (const scan of scannable) {
    servedStops.add(scan.connection.fromStop)
    servedStops.add(scan.connection.toStop)
  }
  if (!servedStops.has(originStop)) {
    throw new PlannerError('unknown-stop', `Hållplatsen "${originStop}" trafikeras inte av cupbussarna denna dag.`)
  }
  if (!servedStops.has(destinationStop)) {
    throw new PlannerError('unknown-stop', `Hållplatsen "${destinationStop}" trafikeras inte av cupbussarna denna dag.`)
  }

  const front = searchProfile(
    scannable,
    originStop,
    destinationStop,
    earliestDeparture,
    minimumTransferMinutes,
    maxTransfers,
  )

  // The front holds only journeys that nothing else beats outright. Sorting it
  // by arrival puts the best first; because no entry dominates another, that is
  // also the order the buses leave in.
  return front
    .sort((a, b) => (isBetterJourney(a, b) ? -1 : isBetterJourney(b, a) ? 1 : 0))
    .slice(0, maxResults)
    .map(toJourney)
}

/** Expand trips into the consecutive-stop connections the planner consumes. */
export function buildConnections(
  trips: { id: string; routeId: string; serviceId: string; stopTimes: { stopId: string; time: string }[] }[],
): BusConnection[] {
  const connections: BusConnection[] = []
  for (const trip of trips) {
    for (let i = 0; i < trip.stopTimes.length - 1; i++) {
      connections.push({
        routeId: trip.routeId,
        tripId: trip.id,
        serviceId: trip.serviceId,
        fromStop: trip.stopTimes[i].stopId,
        departureTime: trip.stopTimes[i].time,
        toStop: trip.stopTimes[i + 1].stopId,
        arrivalTime: trip.stopTimes[i + 1].time,
      })
    }
  }
  return connections
}

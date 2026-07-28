import { describe, expect, it } from 'vitest'
import report from '../data/import-report.json'
import { connections, serviceForDate, stopsById, timetable, validateData, venues } from '../src/data/timetable'
import { findJourneys } from '../src/planner/findJourneys'
import { parseTime } from '../src/planner/time'

/** Guards on the real imported data — no invented departures may sneak in. */
describe('importerad tidtabell', () => {
  it('kommer från den bifogade PDF:en', () => {
    expect(timetable.source.file).toBe('busslinjer2026eskilscupen.pdf')
    expect(timetable.source.pages).toBe(24)
    expect(timetable.source.sha256).toBe(report.source.sha256)
  })

  it('importerades utan fel', () => {
    expect(report.summary.errors).toBe(0)
    expect(report.summary.trips).toBe(timetable.trips.length)
  })

  it('har turer på alla nio linjer', () => {
    expect(timetable.routes.map((r) => r.id)).toEqual(['11', '12', '13', '14', '15', '16', '17', '20', '21'])
    for (const route of timetable.routes) {
      expect(timetable.trips.some((t) => t.routeId === route.id)).toBe(true)
    }
  })

  it('har bara kända hållplatser och stigande tider i varje tur', () => {
    for (const trip of timetable.trips) {
      expect(trip.stopTimes.length).toBeGreaterThanOrEqual(2)
      let previous = -1
      for (const stopTime of trip.stopTimes) {
        expect(stopsById.has(stopTime.stopId)).toBe(true)
        const minutes = parseTime(stopTime.time)
        expect(minutes).toBeGreaterThanOrEqual(previous)
        previous = minutes
      }
    }
  })

  it('kopplar varje fotbollsplan till en trafikerad hållplats', () => {
    expect(validateData()).toEqual([])
    for (const venue of venues) {
      expect(connections.some((c) => c.fromStop === venue.stopId || c.toStop === venue.stopId)).toBe(true)
    }
  })

  it('väljer trafikdygn utifrån veckodag', () => {
    expect(serviceForDate('2026-07-31')?.id).toBe('fre-lor') // fredag
    expect(serviceForDate('2026-08-01')?.id).toBe('fre-lor') // lördag
    expect(serviceForDate('2026-08-02')?.id).toBe('sondag') // söndag
    expect(serviceForDate('2026-07-29')).toBeNull() // onsdag — inga cupbussar
    expect(serviceForDate('inte-ett-datum')).toBeNull()
  })
})

describe('reseplanering på riktig tidtabellsdata', () => {
  const search = (originStop: string, destinationStop: string, earliestDeparture: string, serviceId = 'fre-lor') =>
    findJourneys({ connections, originStop, destinationStop, earliestDeparture, serviceId })

  it('hittar en direktresa Harlyckan → Olympia', () => {
    const [journey] = search('harlyckan-ip', 'olympiaskolan', '13:00')
    expect(journey.transfers).toBe(0)
    expect(journey.legs[0].routeId).toBeDefined()
    expect(parseTime(journey.departureTime)).toBeGreaterThanOrEqual(parseTime('13:00'))
  })

  it('hittar en resa med byte Laröds IP → Filborna IP', () => {
    const [journey] = search('larods-ip', 'filborna-ip', '10:00')
    expect(journey.transfers).toBeGreaterThanOrEqual(1)
    expect(journey.legs[0].fromStop).toBe('larods-ip')
    expect(journey.legs.at(-1)?.toStop).toBe('filborna-ip')
    for (const transfer of journey.transfersDetail) {
      expect(transfer.waitMinutes).toBeGreaterThanOrEqual(5)
    }
  })

  it('kedjar ihop hållplatser på samma tur utan att räkna byte', () => {
    // Linje 11 kör Rydebäck → Olympiaskolan via sju mellanliggande hållplatser.
    const [journey] = search('rydeback-ip', 'olympiaskolan', '06:00')
    expect(journey.transfers).toBe(0)
    expect(journey.legs).toHaveLength(1)
    expect(journey.legs[0].intermediateStops).toContain('raa-ip')
    expect(journey.legs[0].intermediateStops.length).toBeGreaterThan(3)
  })

  it('returnerar tre alternativ i stigande avgångstid', () => {
    const journeys = search('norrvalla-ip', 'olympiaskolan', '12:00')
    expect(journeys).toHaveLength(3)
    const departures = journeys.map((j) => parseTime(j.departureTime))
    expect(departures).toEqual([...departures].sort((a, b) => a - b))
  })

  it('ger inga resor efter sista avgången för dagen', () => {
    expect(search('norrvalla-ip', 'larods-ip', '23:30')).toEqual([])
  })

  it('håller söndagsturer åtskilda från fredag/lördag', () => {
    // Linje 20 och 21 kör bara på söndagen.
    const sunday = connections.filter((c) => c.routeId === '20')
    expect(sunday.every((c) => c.serviceId === 'sondag')).toBe(true)
    expect(search('attekulla-ip', 'vastergard-ip', '14:00', 'sondag').length).toBeGreaterThan(0)
  })
})

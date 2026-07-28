import { describe, expect, it } from 'vitest'
import { buildConnections, findJourneys } from '../src/planner/findJourneys'
import { PlannerError, type BusConnection } from '../src/types'

/**
 * Small hand-written networks. Real timetable data is exercised separately in
 * timetable-data.test.ts — these fixtures exist to pin down the algorithm.
 */

const trip = (
  id: string,
  routeId: string,
  stops: [string, string][],
): { id: string; routeId: string; serviceId: string; stopTimes: { stopId: string; time: string }[] } => ({
  id,
  routeId,
  serviceId: 'test',
  stopTimes: stops.map(([stopId, time]) => ({ stopId, time })),
})

describe('findJourneys', () => {
  it('hittar en direktresa utan byte', () => {
    const connections = buildConnections([
      trip('t1', 'E2', [
        ['harlyckan', '13:10'],
        ['olympia', '13:22'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'harlyckan',
      destinationStop: 'olympia',
      earliestDeparture: '13:00',
    })

    expect(journey.transfers).toBe(0)
    expect(journey.departureTime).toBe('13:10')
    expect(journey.arrivalTime).toBe('13:22')
    expect(journey.durationMinutes).toBe(12)
    expect(journey.legs).toHaveLength(1)
    expect(journey.legs[0].routeId).toBe('E2')
  })

  it('hittar en resa med ett byte', () => {
    const connections = buildConnections([
      trip('t1', 'E2', [
        ['harlyckan', '13:10'],
        ['olympia', '13:22'],
      ]),
      trip('t2', 'E5', [
        ['olympia', '13:30'],
        ['filborna', '13:42'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'harlyckan',
      destinationStop: 'filborna',
      earliestDeparture: '13:00',
    })

    expect(journey.transfers).toBe(1)
    expect(journey.arrivalTime).toBe('13:42')
    expect(journey.legs.map((l) => l.routeId)).toEqual(['E2', 'E5'])
    expect(journey.transfersDetail).toEqual([
      { stopId: 'olympia', arrivalTime: '13:22', departureTime: '13:30', waitMinutes: 8 },
    ])
  })

  it('hittar en resa med två byten', () => {
    const connections = buildConnections([
      trip('t1', 'E1', [
        ['a', '10:00'],
        ['b', '10:10'],
      ]),
      trip('t2', 'E2', [
        ['b', '10:20'],
        ['c', '10:30'],
      ]),
      trip('t3', 'E3', [
        ['c', '10:40'],
        ['d', '10:50'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'd',
      earliestDeparture: '09:00',
    })

    expect(journey.transfers).toBe(2)
    expect(journey.arrivalTime).toBe('10:50')
    expect(journey.legs.map((l) => l.routeId)).toEqual(['E1', 'E2', 'E3'])
  })

  it('tillåter inte byten som är kortare än minsta bytestid', () => {
    const connections = buildConnections([
      trip('t1', 'E1', [
        ['a', '10:00'],
        ['b', '10:10'],
      ]),
      // 3 minuters byte — för kort.
      trip('t2', 'E2', [
        ['b', '10:13'],
        ['c', '10:20'],
      ]),
      // 10 minuters byte — går bra.
      trip('t3', 'E2', [
        ['b', '10:20'],
        ['c', '10:27'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'c',
      earliestDeparture: '09:00',
      minimumTransferMinutes: 5,
    })

    expect(journey.arrivalTime).toBe('10:27')
    expect(journey.transfersDetail[0].waitMinutes).toBe(10)

    // Med 2 minuters minsta bytestid blir den snabba anslutningen tillåten.
    const [faster] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'c',
      earliestDeparture: '09:00',
      minimumTransferMinutes: 2,
    })
    expect(faster.arrivalTime).toBe('10:20')
  })

  it('väljer en senare avgång när den ankommer tidigare', () => {
    const connections = buildConnections([
      // Långsam buss: avgår tidigt, ankommer sent.
      trip('slow', 'E1', [
        ['a', '10:00'],
        ['b', '11:30'],
      ]),
      // Snabb buss: avgår senare men ankommer först.
      trip('fast', 'E9', [
        ['a', '10:30'],
        ['b', '10:50'],
      ]),
    ])

    const journeys = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'b',
      earliestDeparture: '09:00',
    })

    expect(journeys[0].departureTime).toBe('10:30')
    expect(journeys[0].arrivalTime).toBe('10:50')
    // Den långsamma bussen avgår tidigare men ankommer senare — den är
    // sämre på båda sätten och visas inte som alternativ.
    expect(journeys).toHaveLength(1)
  })

  it('räknar inte samma tripId genom flera hållplatser som byte', () => {
    const connections = buildConnections([
      trip('t1', 'E11', [
        ['a', '08:00'],
        ['b', '08:05'],
        ['c', '08:12'],
        ['d', '08:20'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'd',
      earliestDeparture: '07:00',
    })

    expect(journey.transfers).toBe(0)
    expect(journey.legs).toHaveLength(1)
    expect(journey.legs[0].intermediateStops).toEqual(['b', 'c'])
    expect(journey.transfersDetail).toEqual([])
  })

  it('stannar kvar på bussen även när bytestiden inte hade räckt', () => {
    // Bussen står stilla 0 minuter i b. Att sitta kvar ska ändå fungera,
    // trots att ett byte hade krävt 5 minuter.
    const connections = buildConnections([
      trip('through', 'E11', [
        ['a', '08:00'],
        ['b', '08:10'],
        ['c', '08:20'],
      ]),
      // En annan buss når b exakt samtidigt, med lika många byten och en
      // senare avgång — den får ändå inte tränga undan genomgångsresan.
      trip('decoy', 'E12', [
        ['a', '08:02'],
        ['b', '08:10'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'c',
      earliestDeparture: '07:00',
      minimumTransferMinutes: 5,
    })

    expect(journey.transfers).toBe(0)
    expect(journey.arrivalTime).toBe('08:20')
  })

  it('returnerar inga resor när ingen förbindelse finns', () => {
    const connections = buildConnections([
      trip('t1', 'E1', [
        ['a', '10:00'],
        ['b', '10:10'],
      ]),
      trip('t2', 'E2', [
        ['c', '10:00'],
        ['d', '10:10'],
      ]),
    ])

    expect(
      findJourneys({ connections, originStop: 'a', destinationStop: 'd', earliestDeparture: '06:00' }),
    ).toEqual([])
  })

  it('returnerar inga resor efter dagens sista avgång', () => {
    const connections = buildConnections([
      trip('t1', 'E1', [
        ['a', '10:00'],
        ['b', '10:10'],
      ]),
    ])

    expect(
      findJourneys({ connections, originStop: 'a', destinationStop: 'b', earliestDeparture: '11:00' }),
    ).toEqual([])
  })

  it('klarar resor som passerar midnatt', () => {
    // 24:10 betyder 00:10 dagen efter.
    const connections = buildConnections([
      trip('late', 'E1', [
        ['a', '23:40'],
        ['b', '23:55'],
      ]),
      trip('night', 'E2', [
        ['b', '24:05'],
        ['c', '24:20'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'c',
      earliestDeparture: '23:00',
    })

    expect(journey.transfers).toBe(1)
    expect(journey.departureTime).toBe('23:40')
    expect(journey.arrivalTime).toBe('00:20')
    expect(journey.arrivalMinutes).toBe(24 * 60 + 20)
    expect(journey.durationMinutes).toBe(40)
  })

  it('prioriterar färre byten vid samma ankomsttid', () => {
    const connections = buildConnections([
      // Direktbuss a -> c, ankomst 11:00.
      trip('direct', 'E1', [
        ['a', '10:00'],
        ['c', '11:00'],
      ]),
      // Två bussar via b, samma ankomsttid 11:00 men ett byte.
      trip('leg1', 'E2', [
        ['a', '10:00'],
        ['b', '10:30'],
      ]),
      trip('leg2', 'E3', [
        ['b', '10:40'],
        ['c', '11:00'],
      ]),
    ])

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'c',
      earliestDeparture: '09:00',
    })

    expect(journey.arrivalTime).toBe('11:00')
    expect(journey.transfers).toBe(0)
  })

  it('respekterar maxTransfers', () => {
    const connections = buildConnections([
      trip('t1', 'E1', [
        ['a', '10:00'],
        ['b', '10:10'],
      ]),
      trip('t2', 'E2', [
        ['b', '10:20'],
        ['c', '10:30'],
      ]),
      trip('t3', 'E3', [
        ['c', '10:40'],
        ['d', '10:50'],
      ]),
    ])

    expect(
      findJourneys({
        connections,
        originStop: 'a',
        destinationStop: 'd',
        earliestDeparture: '09:00',
        maxTransfers: 1,
      }),
    ).toEqual([])
  })

  it('filtrerar på trafikdygn', () => {
    const connections: BusConnection[] = [
      {
        routeId: '11',
        tripId: 'sun',
        serviceId: 'sondag',
        fromStop: 'a',
        departureTime: '10:00',
        toStop: 'b',
        arrivalTime: '10:20',
      },
      {
        routeId: '11',
        tripId: 'fri',
        serviceId: 'fre-lor',
        fromStop: 'a',
        departureTime: '10:10',
        toStop: 'b',
        arrivalTime: '10:30',
      },
    ]

    const [journey] = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'b',
      earliestDeparture: '09:00',
      serviceId: 'fre-lor',
    })

    expect(journey.legs[0].tripId).toBe('fri')
  })

  it('returnerar högst tre alternativ, i tur och ordning', () => {
    const connections = buildConnections(
      ['10:00', '10:20', '10:40', '11:00'].map((time, i) =>
        trip(`t${i}`, 'E1', [
          ['a', time],
          ['b', `${time.slice(0, 2)}:${String(Number(time.slice(3)) + 15).padStart(2, '0')}`],
        ]),
      ),
    )

    const journeys = findJourneys({
      connections,
      originStop: 'a',
      destinationStop: 'b',
      earliestDeparture: '09:00',
    })

    expect(journeys).toHaveLength(3)
    expect(journeys.map((j) => j.departureTime)).toEqual(['10:00', '10:20', '10:40'])
  })
})

describe('findJourneys — felhantering', () => {
  const connections = buildConnections([
    trip('t1', 'E1', [
      ['a', '10:00'],
      ['b', '10:10'],
    ]),
  ])

  it('avvisar samma start och destination', () => {
    expect(() =>
      findJourneys({ connections, originStop: 'a', destinationStop: 'a', earliestDeparture: '09:00' }),
    ).toThrow(PlannerError)
    try {
      findJourneys({ connections, originStop: 'a', destinationStop: 'a', earliestDeparture: '09:00' })
    } catch (error) {
      expect((error as PlannerError).code).toBe('same-origin-and-destination')
    }
  })

  it('avvisar tom tidtabell', () => {
    try {
      findJourneys({ connections: [], originStop: 'a', destinationStop: 'b', earliestDeparture: '09:00' })
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as PlannerError).code).toBe('no-connections')
    }
  })

  it('avvisar ogiltigt tidsformat', () => {
    try {
      findJourneys({ connections, originStop: 'a', destinationStop: 'b', earliestDeparture: '25.70' })
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as PlannerError).code).toBe('invalid-time-format')
    }
  })

  it('avvisar hållplatser som inte trafikeras', () => {
    try {
      findJourneys({ connections, originStop: 'a', destinationStop: 'zzz', earliestDeparture: '09:00' })
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as PlannerError).code).toBe('unknown-stop')
    }
  })

  it('avvisar förbindelser där ankomst ligger före avgång', () => {
    const broken: BusConnection[] = [
      {
        routeId: '11',
        tripId: 'broken',
        fromStop: 'a',
        departureTime: '10:30',
        toStop: 'b',
        arrivalTime: '10:05',
      },
    ]
    try {
      findJourneys({ connections: broken, originStop: 'a', destinationStop: 'b', earliestDeparture: '09:00' })
      throw new Error('should have thrown')
    } catch (error) {
      expect((error as PlannerError).code).toBe('invalid-time-format')
    }
  })
})

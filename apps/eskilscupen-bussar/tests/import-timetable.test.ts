import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain JS import script, exercised here for its parsing rules
import { buildStopIndex, buildTrips, dedupeTrips, parseTimeToMinutes } from '../scripts/import-timetable.mjs'

interface Chunk {
  x: number
  y: number
  text: string
}

/** Build the positioned chunks of one synthetic timetable page. */
function page(rows: [string, ...(string | null)[]][], header = 'LINJE 99 NORRUT FREDAG & LÖRDAG'): {
  page: number
  chunks: Chunk[]
} {
  const chunks: Chunk[] = [
    { x: 52, y: 520, text: 'BUSSLINJER ESKILSCUPEN 2026' },
    { x: 207, y: 520, text: header },
  ]
  rows.forEach(([label, ...cells], rowIndex) => {
    const y = 500 - rowIndex * 12
    chunks.push({ x: 52, y, text: label })
    cells.forEach((cell, columnIndex) => {
      if (cell === null) return
      chunks.push({ x: 200 + columnIndex * 40, y, text: cell })
    })
  })
  return { page: 2, chunks }
}

const stopIndex = buildStopIndex()

describe('parseTimeToMinutes', () => {
  it('läser klockslag i tidtabellens format', () => {
    expect(parseTimeToMinutes('06:25:00')).toBe(385)
    expect(parseTimeToMinutes('13:10')).toBe(790)
    expect(parseTimeToMinutes('24:10:00')).toBe(1450)
  })

  it('avvisar ogiltiga värden', () => {
    expect(parseTimeToMinutes('6.25')).toBeNull()
    expect(parseTimeToMinutes('26:75:00')).toBeNull()
    expect(parseTimeToMinutes('')).toBeNull()
    expect(parseTimeToMinutes('kl 6')).toBeNull()
    // Sekunder används aldrig i underlaget — en rad med sekunder är misstänkt.
    expect(parseTimeToMinutes('06:25:30')).toBeNull()
  })
})

describe('buildTrips', () => {
  it('gör en kolumn till en tur med hållplatserna i ordning', () => {
    const { trips, issues } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00', '06:45:00'],
          ['Örby IP', '06:38:00', '06:58:00'],
          ['Råå IP', '06:45:00', '07:05:00'],
        ]),
      ],
      stopIndex,
    )

    expect(issues).toEqual([])
    expect(trips).toHaveLength(2)
    expect(trips[0].routeId).toBe('99')
    expect(trips[0].serviceId).toBe('fre-lor')
    expect(trips[0].stopTimes).toEqual([
      { stopId: 'rydeback-ip', time: '06:25' },
      { stopId: 'orby-ip', time: '06:38' },
      { stopId: 'raa-ip', time: '06:45' },
    ])
    expect(trips[1].stopTimes.map((s: { time: string }) => s.time)).toEqual(['06:45', '06:58', '07:05'])
  })

  it('hanterar turer som hoppar över hållplatser', () => {
    const { trips } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00', '07:00:00'],
          ['Örby IP', '06:38:00', null],
          ['Råå IP', '06:45:00', '07:10:00'],
        ]),
      ],
      stopIndex,
    )

    expect(trips[1].stopTimes).toEqual([
      { stopId: 'rydeback-ip', time: '07:00' },
      { stopId: 'raa-ip', time: '07:10' },
    ])
  })

  it('avvisar turer där ankomsten ligger före avgången', () => {
    const { trips, issues } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00'],
          ['Örby IP', '06:10:00'],
          ['Råå IP', '06:45:00'],
        ]),
      ],
      stopIndex,
    )

    expect(trips).toHaveLength(0)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ level: 'error', code: 'non-monotonic-times', page: 2 })
  })

  it('läser stora tidshopp bakåt som passage över midnatt', () => {
    const { trips, issues } = buildTrips(
      [
        page([
          ['Rydebäck IP', '23:40:00'],
          ['Örby IP', '23:55:00'],
          ['Råå IP', '00:10:00'],
        ]),
      ],
      stopIndex,
    )

    expect(issues).toEqual([])
    expect(trips[0].stopTimes.map((s: { time: string }) => s.time)).toEqual(['23:40', '23:55', '24:10'])
  })

  it('rapporterar ogiltiga klockslag i stället för att gissa', () => {
    const { trips, issues } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00'],
          ['Örby IP', '06:9x:00'],
          ['Råå IP', '06:45:00'],
        ]),
      ],
      stopIndex,
    )

    expect(issues.filter((i: { code: string }) => i.code === 'invalid-time')).toHaveLength(1)
    // Resten av kolumnen tas ändå med.
    expect(trips[0].stopTimes.map((s: { stopId: string }) => s.stopId)).toEqual(['rydeback-ip', 'raa-ip'])
  })

  it('rapporterar okända hållplatsnamn', () => {
    const { issues, unknownLabels } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00'],
          ['Nya Planen IP', '06:35:00'],
        ]),
      ],
      stopIndex,
    )

    expect(issues.some((i: { code: string }) => i.code === 'unknown-stop-label')).toBe(true)
    expect(unknownLabels.get('Nya Planen IP')).toBe(1)
  })

  it('rapporterar rader som saknar hållplatsnamn', () => {
    const { issues } = buildTrips(
      [
        {
          page: 2,
          chunks: [
            { x: 52, y: 520, text: 'BUSSLINJER ESKILSCUPEN 2026' },
            { x: 207, y: 520, text: 'LINJE 99 NORRUT SÖNDAG' },
            { x: 52, y: 500, text: '06:25:00' },
            { x: 200, y: 500, text: '06:45:00' },
          ],
        },
      ],
      stopIndex,
    )

    expect(issues.some((i: { code: string }) => i.code === 'row-without-stop-label')).toBe(true)
  })

  it('ignorerar kolumner med bara en hållplats och rapporterar dem', () => {
    const { trips, issues } = buildTrips(
      [
        page([
          ['Rydebäck IP', '06:25:00', '07:00:00'],
          ['Örby IP', '06:38:00', null],
        ]),
      ],
      stopIndex,
    )

    expect(trips).toHaveLength(1)
    expect(issues.some((i: { code: string }) => i.code === 'incomplete-trip')).toBe(true)
  })

  it('hoppar över sidor utan läsbar linjerubrik', () => {
    const { trips } = buildTrips([page([['Rydebäck IP', '06:25:00']], 'INNEHÅLL')], stopIndex)
    expect(trips).toHaveLength(0)
  })
})

describe('dedupeTrips', () => {
  it('tar bort identiska turer och rapporterar dem', () => {
    const base = {
      routeId: '11',
      serviceId: 'fre-lor',
      page: 2,
      stopTimes: [
        { stopId: 'a', time: '10:00' },
        { stopId: 'b', time: '10:10' },
      ],
    }
    const issues: { code: string }[] = []
    const kept = dedupeTrips([{ ...base, id: 'x' }, { ...base, id: 'y' }], issues)

    expect(kept.map((t: { id: string }) => t.id)).toEqual(['x'])
    expect(issues).toHaveLength(1)
    expect(issues[0].code).toBe('duplicate-trip')
  })

  it('behåller turer som skiljer sig åt i tid', () => {
    const issues: unknown[] = []
    const kept = dedupeTrips(
      [
        { id: 'x', routeId: '11', serviceId: 'fre-lor', stopTimes: [{ stopId: 'a', time: '10:00' }] },
        { id: 'y', routeId: '11', serviceId: 'fre-lor', stopTimes: [{ stopId: 'a', time: '10:05' }] },
      ],
      issues,
    )
    expect(kept).toHaveLength(2)
    expect(issues).toEqual([])
  })
})

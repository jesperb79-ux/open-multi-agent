import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import { connections, routeName, stopName } from '../src/data/timetable'
import { findJourneys, type FindJourneysOptions } from '../src/planner/findJourneys'
import type { Journey } from '../src/types'

/**
 * Tio+ verkliga resefall körda mot den importerade tidtabellen.
 *
 * Varje fall har en förväntan skriven för hand efter att ha lästs av ur PDF:en.
 * Testet jämför förväntat mot faktiskt och skriver samtidigt en läsbar
 * kontrollrapport till data/journey-checks.md.
 */

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../data/journey-checks.md')

interface Expectation {
  /** Antal byten i det bästa alternativet. `null` = ingen resa ska finnas. */
  transfers: number | null
  departureTime?: string
  arrivalTime?: string
  /** Linjerna i tur och ordning. */
  routes?: string[]
  /** Bytespunkter i tur och ordning. */
  transferStops?: string[]
  /** Väntetid vid varje byte. */
  waits?: number[]
}

interface Case {
  id: string
  title: string
  why: string
  query: Omit<FindJourneysOptions, 'connections'>
  expected: Expectation
}

const q = (
  originStop: string,
  destinationStop: string,
  earliestDeparture: string,
  serviceId: string,
  rest: Partial<FindJourneysOptions> = {},
): Omit<FindJourneysOptions, 'connections'> => ({
  originStop,
  destinationStop,
  earliestDeparture,
  serviceId,
  ...rest,
})

const CASES: Case[] = [
  {
    id: 'direkt',
    title: 'Direktresa utan byte',
    why: 'Linje 11 går hela vägen Rydebäck IP → Olympiaskolan.',
    query: q('rydeback-ip', 'olympiaskolan', '06:00', 'fre-lor'),
    expected: { transfers: 0, departureTime: '06:30', arrivalTime: '07:12', routes: ['11'] },
  },
  {
    id: 'ett-byte',
    title: 'Resa med ett byte',
    why: 'Laröds IP nås bara av linje 15; Filborna IP kräver byte vid Norrvalla IP.',
    query: q('larods-ip', 'filborna-ip', '10:00', 'fre-lor'),
    expected: {
      transfers: 1,
      departureTime: '10:17',
      arrivalTime: '11:03',
      routes: ['15', '14'],
      transferStops: ['norrvalla-ip'],
      waits: [13],
    },
  },
  {
    id: 'tva-byten',
    title: 'Resa med två byten',
    why: 'Ättekulla IP → Laröds IP på söndagen kräver linje 13, 12 och 15.',
    query: q('attekulla-ip', 'larods-ip', '08:00', 'sondag'),
    expected: {
      transfers: 2,
      departureTime: '08:09',
      arrivalTime: '09:18',
      routes: ['13', '12', '15'],
      transferStops: ['vastra-ramlosa-skola', 'norrvalla-ip'],
      waits: [6, 6],
    },
  },
  {
    id: 'kort-byte-tillatet',
    title: 'Byte på 3 minuter — tillåtet när minsta bytestid är 3',
    why: 'Maria Park → Olympiaskolan har en anslutning med bara 3 minuters byte.',
    query: q('maria-park', 'olympiaskolan', '11:00', 'fre-lor', { minimumTransferMinutes: 3 }),
    expected: {
      transfers: 1,
      departureTime: '11:06',
      arrivalTime: '11:28',
      routes: ['15', '12'],
      waits: [3],
    },
  },
  {
    id: 'kort-byte-avvisat',
    title: 'Samma resa med 5 minuters minsta bytestid — det korta bytet väljs bort',
    why: '3-minutersbytet får inte användas; resan blir 18 minuter längre.',
    query: q('maria-park', 'olympiaskolan', '11:00', 'fre-lor', { minimumTransferMinutes: 5 }),
    expected: {
      transfers: 1,
      departureTime: '11:06',
      arrivalTime: '11:46',
      routes: ['15', '11'],
      waits: [17],
    },
  },
  {
    id: 'fredag-lordag',
    title: 'Fredag/lördag: linje 21 kör inte',
    why: 'Ättekulla IP → Västergård IP går bara med linje 13 på fredag och lördag.',
    query: q('attekulla-ip', 'vastergard-ip', '14:00', 'fre-lor'),
    expected: { transfers: 0, departureTime: '14:09', arrivalTime: '14:36', routes: ['13'] },
  },
  {
    id: 'sondag',
    title: 'Söndag: samma sträcka, andra linjer',
    why: 'På söndagen finns en snabbare anslutning via linje 13 + 12, och linje 21 tillkommer.',
    query: q('attekulla-ip', 'vastergard-ip', '14:00', 'sondag'),
    expected: {
      transfers: 1,
      departureTime: '14:09',
      arrivalTime: '14:33',
      routes: ['13', '12'],
      waits: [6],
    },
  },
  {
    id: 'hoppar-over',
    title: 'Tur som hoppar över hållplatser',
    why: 'Linje 11:s första tur går Rydebäck IP 06:25 direkt till Norrvalla IP 06:55.',
    query: q('rydeback-ip', 'norrvalla-ip', '06:00', 'fre-lor'),
    expected: { transfers: 0, departureTime: '06:25', arrivalTime: '06:55', routes: ['11'] },
  },
  {
    id: 'linje-17-snabbtur',
    title: 'Linje 17:s snabbtur väljs framför den vanliga turen',
    why: 'Turen 07:08 ankommer 07:54; snabbturen 07:10 ankommer 07:30.',
    query: q('norrvalla-ip', 'morarp-vidablick-ip', '07:00', 'sondag'),
    expected: { transfers: 0, departureTime: '07:10', arrivalTime: '07:30', routes: ['17'] },
  },
  {
    id: 'harlyckan-start',
    title: 'Harlyckan som start (hållplats Elinebergsplatsen)',
    why: 'Linje 11, 13, 14 och 17 stannar vid Elinebergsplatsen.',
    query: q('elinebergsplatsen', 'larods-ip', '13:00', 'fre-lor'),
    expected: {
      transfers: 1,
      departureTime: '13:11',
      arrivalTime: '14:06',
      routes: ['14', '15'],
      transferStops: ['norrvalla-ip'],
      waits: [6],
    },
  },
  {
    id: 'harlyckan-mal',
    title: 'Harlyckan som destination (hållplats Elinebergskyrkan)',
    why: 'Linje 12 och 21 stannar vid Elinebergskyrkan.',
    query: q('norrvalla-ip', 'elinebergskyrkan', '13:00', 'sondag'),
    expected: { transfers: 0, departureTime: '13:18', arrivalTime: '13:52', routes: ['12'] },
  },
  {
    id: 'harlyckan-halls-isar',
    title: 'Harlyckans två hållplatser hålls isär',
    why:
      'Flygfältet nås av linje 17, som stannar vid Elinebergsplatsen. För att nå ' +
      'Elinebergskyrkan krävs byten — de slås alltså inte ihop till en hållplats.',
    query: q('flygfaltet', 'elinebergskyrkan', '08:00', 'sondag'),
    expected: {
      transfers: 2,
      departureTime: '08:20',
      arrivalTime: '09:10',
      routes: ['17', '11', '12'],
      transferStops: ['elinebergsplatsen', 'vastra-ramlosa-skola'],
    },
  },
  {
    id: 'ingen-resa',
    title: 'Ingen resa efter dagens sista avgång',
    why: 'Sista bussen mot Laröds IP har gått långt före 23:30.',
    query: q('norrvalla-ip', 'larods-ip', '23:30', 'fre-lor'),
    expected: { transfers: null },
  },
]

const describeJourney = (journey: Journey | undefined): string => {
  if (!journey) return 'ingen resa'
  const parts = [
    `${journey.departureTime}→${journey.arrivalTime}`,
    `${journey.durationMinutes} min`,
    journey.transfers === 0 ? 'inget byte' : `${journey.transfers} byte(n)`,
    journey.legs.map((leg) => routeName(leg.routeId)).join(' + '),
  ]
  if (journey.transfersDetail.length > 0) {
    parts.push(
      journey.transfersDetail
        .map((t) => `byte ${stopName(t.stopId)} ${t.waitMinutes} min`)
        .join('; '),
    )
  }
  return parts.join(' · ')
}

const describeExpectation = (expected: Expectation): string => {
  if (expected.transfers === null) return 'ingen resa'
  const parts = [
    `${expected.departureTime}→${expected.arrivalTime}`,
    expected.transfers === 0 ? 'inget byte' : `${expected.transfers} byte(n)`,
  ]
  if (expected.routes) parts.push(expected.routes.map((r) => `Linje ${r}`).join(' + '))
  if (expected.transferStops) parts.push(`byte vid ${expected.transferStops.map(stopName).join(', ')}`)
  if (expected.waits) parts.push(`väntetid ${expected.waits.join(', ')} min`)
  return parts.join(' · ')
}

const rows: { testCase: Case; journeys: Journey[]; passed: boolean }[] = []

describe('kontrollkörning mot importerad tidtabell', () => {
  for (const testCase of CASES) {
    it(testCase.title, () => {
      const journeys = findJourneys({ connections, ...testCase.query })
      const [best] = journeys
      let passed = true
      try {
        if (testCase.expected.transfers === null) {
          expect(journeys).toEqual([])
        } else {
          expect(best).toBeDefined()
          expect(best.transfers).toBe(testCase.expected.transfers)
          if (testCase.expected.departureTime) {
            expect(best.departureTime).toBe(testCase.expected.departureTime)
          }
          if (testCase.expected.arrivalTime) {
            expect(best.arrivalTime).toBe(testCase.expected.arrivalTime)
          }
          if (testCase.expected.routes) {
            expect(best.legs.map((leg) => leg.routeId)).toEqual(testCase.expected.routes)
          }
          if (testCase.expected.transferStops) {
            expect(best.transfersDetail.map((t) => t.stopId)).toEqual(testCase.expected.transferStops)
          }
          if (testCase.expected.waits) {
            expect(best.transfersDetail.map((t) => t.waitMinutes)).toEqual(testCase.expected.waits)
          }
          // Minsta bytestid ska alltid hållas.
          const minimum = testCase.query.minimumTransferMinutes ?? 5
          for (const transfer of best.transfersDetail) {
            expect(transfer.waitMinutes).toBeGreaterThanOrEqual(minimum)
          }
        }
      } catch (error) {
        passed = false
        throw error
      } finally {
        rows.push({ testCase, journeys, passed })
      }
    })
  }

  afterAll(() => {
    const out: string[] = []
    out.push('# Kontrollkörning: verkliga resefall')
    out.push('')
    out.push(
      'Genererad av `npm test` (tests/journey-checks.test.ts). Förväntan i varje ' +
        'rad är skriven för hand mot PDF:en; "faktisk" är vad reseplaneraren ' +
        'räknar fram ur den importerade tidtabellen.',
    )
    out.push('')
    const failed = rows.filter((r) => !r.passed).length
    out.push(`**${rows.length - failed} av ${rows.length} fall stämmer.**`)
    out.push('')
    out.push('| # | Fall | Sökning | Förväntad | Faktisk | Status |')
    out.push('| --- | --- | --- | --- | --- | --- |')
    rows.forEach(({ testCase, journeys, passed }, index) => {
      const { query } = testCase
      const search =
        `${stopName(query.originStop)} → ${stopName(query.destinationStop)}, ` +
        `${query.earliestDeparture}, ${query.serviceId}` +
        (query.minimumTransferMinutes === undefined
          ? ''
          : `, minsta byte ${query.minimumTransferMinutes} min`)
      out.push(
        `| ${index + 1} | ${testCase.title} | ${search} | ${describeExpectation(testCase.expected)} | ` +
          `${describeJourney(journeys[0])} | ${passed ? 'OK' : 'AVVIKER'} |`,
      )
    })
    out.push('')
    out.push('## Detaljer')
    out.push('')
    for (const { testCase, journeys, passed } of rows) {
      out.push(`### ${testCase.title}`)
      out.push('')
      out.push(testCase.why)
      out.push('')
      out.push(`- Sökning: \`${JSON.stringify(testCase.query)}\``)
      out.push(`- Förväntad: ${describeExpectation(testCase.expected)}`)
      out.push(`- Faktisk: ${describeJourney(journeys[0])}`)
      out.push(`- Status: **${passed ? 'OK' : 'AVVIKER'}**`)
      out.push('')
      if (journeys.length > 0) {
        out.push('Samtliga alternativ som appen visar:')
        out.push('')
        for (const journey of journeys) {
          out.push(`- ${describeJourney(journey)}`)
          for (const leg of journey.legs) {
            const via =
              leg.intermediateStops.length > 0
                ? ` (via ${leg.intermediateStops.map(stopName).join(', ')})`
                : ''
            out.push(
              `  - ${leg.departureTime} ${routeName(leg.routeId)} från ${stopName(leg.fromStop)} → ` +
                `${leg.arrivalTime} ${stopName(leg.toStop)}${via}`,
            )
          }
        }
        out.push('')
      }
    }

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(OUT, `${out.join('\n')}\n`)
  })
})

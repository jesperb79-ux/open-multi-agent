import { describe, expect, it } from 'vitest'
import { parseMapsFlag } from '../src/map/feature-flag'
import {
  isPlottable,
  plottableLocations,
  unplottableLocations,
  venueLocationById,
  venueLocations,
  stopLocations,
  type PlaceLocation,
} from '../src/map/locations'
import { buildMapView, geoLink, project } from '../src/map/map-view'
import { connections } from '../src/data/timetable'
import { placeByKey, places } from '../src/places'
import { findJourneys } from '../src/planner/findJourneys'
import { venues } from '../src/data/timetable'

const verified = (id: string, latitude: number, longitude: number): PlaceLocation => ({
  id,
  coordinate: { latitude, longitude },
  confidence: 'verified',
  source: 'test',
})

describe('feature flag VITE_ENABLE_MAPS', () => {
  it('är av när variabeln saknas eller är tom', () => {
    expect(parseMapsFlag(undefined)).toBe(false)
    expect(parseMapsFlag(null)).toBe(false)
    expect(parseMapsFlag('')).toBe(false)
  })

  it('är av för allt utom exakt "true"', () => {
    for (const value of ['false', 'FALSE', '0', '1', 'yes', 'ja', 'on', 'tru', 'maps']) {
      expect(parseMapsFlag(value), value).toBe(false)
    }
    // Även icke-strängar ska tolkas som av.
    expect(parseMapsFlag(true as unknown)).toBe(false)
    expect(parseMapsFlag(1 as unknown)).toBe(false)
  })

  it('är på för "true", oavsett skiftläge och blanktecken', () => {
    for (const value of ['true', 'TRUE', 'True', ' true ', '\ttrue\n']) {
      expect(parseMapsFlag(value), value).toBe(true)
    }
  })

  it('är av i det här projektets .env-inställning', () => {
    // .env och .env.example levererar VITE_ENABLE_MAPS=false.
    expect(parseMapsFlag('false')).toBe(false)
  })
})

describe('bara verifierade positioner får ritas ut', () => {
  it('en position utan konfidens "verified" ritas aldrig', () => {
    expect(isPlottable({ id: 'x', coordinate: { latitude: 56, longitude: 12 }, confidence: 'reported' })).toBe(false)
    expect(isPlottable({ id: 'x', coordinate: { latitude: 56, longitude: 12 }, confidence: 'unknown' })).toBe(false)
    expect(isPlottable(undefined)).toBe(false)
  })

  it('"verified" utan koordinat ritas inte heller', () => {
    expect(isPlottable({ id: 'x', confidence: 'verified' })).toBe(false)
    expect(isPlottable({ id: 'x', address: 'Gata 1', confidence: 'verified' })).toBe(false)
  })

  it('bara "verified" med koordinat ritas', () => {
    expect(isPlottable(verified('x', 56.05, 12.7))).toBe(true)
  })

  it('inga inlagda positioner är verifierade ännu', () => {
    // Källgranskningen i docs/map-source-audit.md hittade inga koordinater.
    expect(plottableLocations(venueLocations)).toEqual([])
    expect(plottableLocations(stopLocations)).toEqual([])
    expect(unplottableLocations(venueLocations)).toHaveLength(venueLocations.length)
  })

  it('ingen post har koordinat utan att vara granskad', () => {
    for (const location of [...venueLocations, ...stopLocations]) {
      if (location.coordinate) {
        expect(location.confidence, location.id).toBe('verified')
        expect(location.source, location.id).toBeTruthy()
      }
    }
  })

  it('positionsregistret täcker alla fotbollsplaner', () => {
    for (const venue of venues) {
      expect(venueLocationById.has(venue.id), venue.id).toBe(true)
    }
  })
})

describe('kartans innehåll', () => {
  const lookup = new Map<string, PlaceLocation>([
    ['a', verified('a', 56.05, 12.7)],
    ['b', verified('b', 56.06, 12.72)],
    ['c', { id: 'c', address: 'Gata 1', confidence: 'reported' }],
    ['d', { id: 'd', confidence: 'unknown' }],
  ])

  it('placerar bara de verifierade platserna', () => {
    const view = buildMapView(
      [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
        { id: 'd', label: 'D' },
      ],
      lookup,
    )

    expect(view.points.map((p) => p.id)).toEqual(['a', 'b'])
    expect(view.unverified.map((p) => p.id)).toEqual(['c', 'd'])
    expect(view.empty).toBe(false)
  })

  it('redovisar osäkra platser med sin konfidens, aldrig som verifierade', () => {
    const view = buildMapView([{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }], lookup)

    expect(view.points).toEqual([])
    expect(view.empty).toBe(true)
    expect(view.unverified).toEqual([
      { id: 'c', label: 'C', address: 'Gata 1', confidence: 'reported', note: undefined },
      { id: 'd', label: 'D', address: undefined, confidence: 'unknown', note: undefined },
    ])
    // Ingen av dem har fått en position.
    for (const place of view.unverified) {
      expect(place).not.toHaveProperty('x')
      expect(place).not.toHaveProperty('coordinate')
    }
  })

  it('en plats som saknas i registret behandlas som okänd', () => {
    const view = buildMapView([{ id: 'finns-inte', label: 'Okänd' }], lookup)
    expect(view.points).toEqual([])
    expect(view.unverified[0].confidence).toBe('unknown')
  })

  it('med dagens data går ingenting att rita ut', () => {
    const view = buildMapView([
      { id: 'norrvalla-ip', label: 'Norrvalla IP' },
      { id: 'larods-ip', label: 'Laröds IP' },
    ])
    expect(view.empty).toBe(true)
    expect(view.unverified).toHaveLength(2)
    expect(view.unverified.every((p) => p.confidence !== 'verified')).toBe(true)
  })
})

describe('projektionen', () => {
  it('ger inga punkter för en tom lista', () => {
    expect(project([])).toEqual([])
  })

  it('sätter en ensam punkt i mitten', () => {
    expect(project([{ latitude: 56.05, longitude: 12.7 }])).toEqual([{ x: 50, y: 50 }])
  })

  it('håller alla punkter inom kartans yta', () => {
    const projected = project([
      { latitude: 56.0, longitude: 12.6 },
      { latitude: 56.2, longitude: 12.9 },
      { latitude: 56.1, longitude: 12.75 },
    ])
    for (const point of projected) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(100)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(100)
    }
  })

  it('vänder latitud rätt — nordligare punkt hamnar högre upp', () => {
    const [south, north] = project([
      { latitude: 56.0, longitude: 12.7 },
      { latitude: 56.2, longitude: 12.7 },
    ])
    expect(north.y).toBeLessThan(south.y)
  })
})

describe('länk till kartapp', () => {
  it('använder geo:-schemat, utan extern tjänst eller nyckel', () => {
    const link = geoLink({ latitude: 56.0553, longitude: 12.7005 })
    expect(link).toBe('geo:56.0553,12.7005')
    expect(link).not.toMatch(/https?:/)
    expect(link).not.toMatch(/key|token|api/i)
  })
})

describe('kartan påverkar inte reseplaneraren', () => {
  const search = (originLabel: string, destinationLabel: string, time: string, serviceId: string) => {
    const origin = places.find((p) => p.label === originLabel)!
    const destination = places.find((p) => p.label === destinationLabel)!
    return findJourneys({
      connections,
      originStop: origin.stopId,
      destinationStop: destination.stopId,
      earliestDeparture: time,
      serviceId,
    })
  }

  it('reseplaneringen ger samma svar oavsett kartans data', () => {
    const before = search('Rydebäck IP', 'Olympia', '06:00', 'fre-lor')
    // Kartan läser samma platsregister men får inte röra planeringen.
    buildMapView(places.map((p) => ({ id: p.key, label: p.label })))
    const after = search('Rydebäck IP', 'Olympia', '06:00', 'fre-lor')

    expect(after).toEqual(before)
    expect(before[0].departureTime).toBe('06:30')
    expect(before[0].arrivalTime).toBe('07:12')
  })

  it('en trasig positionspost stoppar inte kartan och därmed inte resan', () => {
    const broken = new Map<string, PlaceLocation>([
      // Koordinater som inte går att projicera.
      ['a', { id: 'a', coordinate: { latitude: NaN, longitude: NaN }, confidence: 'verified' }],
    ])
    expect(() => buildMapView([{ id: 'a', label: 'A' }], broken)).not.toThrow()

    const journeys = search('Laröds IP', 'Filborna IP', '10:00', 'fre-lor')
    expect(journeys.length).toBeGreaterThan(0)
  })

  it('reseplaneraren importerar ingenting från kartmodulerna', async () => {
    // Kartan får aldrig bli ett beroende för planeringen.
    const planner = await import('../src/planner/findJourneys?raw')
      .then(() => null)
      .catch(() => null)
    void planner
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/planner/findJourneys.ts', import.meta.url), 'utf8'),
    )
    expect(source).not.toMatch(/from '\.\.?\/map/)
  })
})

describe('inga nycklar eller betaltjänster i kartkoden', () => {
  it('kartmodulerna anropar ingen extern tjänst', async () => {
    const fs = await import('node:fs')
    for (const file of ['locations.ts', 'map-view.ts', 'MapPanel.tsx', 'feature-flag.ts']) {
      const source = fs.readFileSync(new URL(`../src/map/${file}`, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(/api[_-]?key|access[_-]?token|mapbox|googleapis|tile\.openstreetmap/i)
      expect(source, file).not.toMatch(/fetch\(|XMLHttpRequest/)
    }
  })
})

describe('platsnyckel till kartans id', () => {
  it('venue-nyckeln pekar ut planen, inte hållplatsen', () => {
    // Kartan visar planer; App skickar in venue-id:t ur platsnyckeln.
    const harlyckan = places.find((p) => p.stopId === 'elinebergsplatsen')!
    expect(harlyckan.key.startsWith('venue:harlyckan-ip@')).toBe(true)
    expect(placeByKey.get(harlyckan.key)?.stopId).toBe('elinebergsplatsen')
    // Positionsregistret känner planen.
    expect(venueLocationById.has('harlyckan-ip')).toBe(true)
  })
})

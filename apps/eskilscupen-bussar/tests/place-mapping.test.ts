import { describe, expect, it } from 'vitest'
import { connections, isStopServed, servicesServingStop, stopsById, timetable, venues } from '../src/data/timetable'
import { journeyKey, journeyKeys } from '../src/journey-key'
import { placeByKey, places } from '../src/places'
import { findJourneys } from '../src/planner/findJourneys'
import type { Journey } from '../src/types'

/**
 * Regressionstester för två fel som slog igenom till produktion:
 *
 *  1. Resekorten fick React-nycklar som kunde kollidera, vilket lämnade kvar
 *     kort från den förra sökningen.
 *  2. Ett hållplats-id lämnades orört i felmeddelandet när en plats inte
 *     trafikerades vald dag, vilket såg ut som att en venue-slug läckt in i
 *     reseplaneraren.
 *
 * Här kontrolleras också att gränssnittets platsval alltid översätts till ett
 * riktigt hållplats-id innan det når `findJourneys`.
 */

const venueIds = new Set(venues.map((venue) => venue.id))
const stopIds = new Set(timetable.stops.map((stop) => stop.id))

/** Så här gör App.tsx: select-värde → plats → hållplats-id. */
const stopIdForSelectValue = (selectValue: string): string | undefined =>
  placeByKey.get(selectValue)?.stopId

const search = (originKey: string, destinationKey: string, time: string, serviceId: string): Journey[] => {
  const originStop = stopIdForSelectValue(originKey)
  const destinationStop = stopIdForSelectValue(destinationKey)
  if (!originStop || !destinationStop) throw new Error('okänt platsval')
  return findJourneys({ connections, originStop, destinationStop, earliestDeparture: time, serviceId })
}

const key = (label: string): string => {
  const place = places.find((p) => p.label === label)
  if (!place) throw new Error(`ingen plats med etiketten "${label}"`)
  return place.key
}

describe('platsval översätts till hållplats-id', () => {
  it('varje plats pekar på en hållplats som finns i tidtabellen', () => {
    expect(places.length).toBeGreaterThan(0)
    for (const place of places) {
      expect(stopsById.has(place.stopId), `${place.key} -> ${place.stopId}`).toBe(true)
    }
  })

  it('select-värdet är aldrig samma sak som hållplats-id:t', () => {
    // Nyckeln som ligger i <option value=...> är "venue:<id>@<stopId>" eller
    // "stop:<id>" — skickas den rakt in i planeraren blir det fel.
    for (const place of places) {
      expect(place.key).not.toBe(place.stopId)
      expect(stopsById.has(place.key)).toBe(false)
    }
  })

  it('venue-id används aldrig som hållplats-id när de skiljer sig åt', () => {
    for (const venue of venues) {
      for (const stopId of venue.stopIds) {
        const place = places.find((p) => p.key === `venue:${venue.id}@${stopId}`)
        expect(place?.stopId).toBe(stopId)
      }
    }
    // Olympia är det tydligaste fallet: venue-id "olympia" finns inte som
    // hållplats, hållplatsen heter "olympiaskolan".
    expect(venueIds.has('olympia')).toBe(true)
    expect(stopIds.has('olympia')).toBe(false)
    expect(stopIdForSelectValue(key('Olympia'))).toBe('olympiaskolan')
  })

  it('ett okänt eller föråldrat sparat värde ger ingen hållplats', () => {
    // Ett värde från en tidigare version, eller en plats som tagits bort i en
    // ny tidtabell, får aldrig tolkas som ett hållplats-id.
    for (const stale of ['allerums-ip', 'olympia', 'venue:allerums-ip', 'venue:borta@borta', 'stop:borta', '']) {
      expect(stopIdForSelectValue(stale)).toBeUndefined()
    }
  })

  it('Harlyckans två hållplatser hålls isär', () => {
    const platsen = key('Harlyckans IP – Elinebergsplatsen / Harlyckan IP')
    const kyrkan = key('Harlyckans IP – Elinebergskyrkan / Harlyckan IP')

    expect(stopIdForSelectValue(platsen)).toBe('elinebergsplatsen')
    expect(stopIdForSelectValue(kyrkan)).toBe('elinebergskyrkan')
    expect(stopIdForSelectValue(platsen)).not.toBe(stopIdForSelectValue(kyrkan))
    // Ingen av dem får bli venue-id:t.
    expect(stopIdForSelectValue(platsen)).not.toBe('harlyckan-ip')
    expect(stopIdForSelectValue(kyrkan)).not.toBe('harlyckan-ip')
  })
})

describe('sökningar från gränssnittets platsval', () => {
  it('Rydebäck IP → Olympia, fredag', () => {
    const [journey] = search(key('Rydebäck IP'), key('Olympia'), '06:00', 'fre-lor')
    expect(journey.legs[0].fromStop).toBe('rydeback-ip')
    expect(journey.legs.at(-1)?.toStop).toBe('olympiaskolan')
    expect(journey.departureTime).toBe('06:30')
    expect(journey.arrivalTime).toBe('07:12')
  })

  it('Ättekulla IP → Västergård IP, söndag', () => {
    const [journey] = search(key('Ättekulla IP'), key('Västergård IP'), '14:00', 'sondag')
    expect(journey.legs[0].fromStop).toBe('attekulla-ip')
    expect(journey.legs.at(-1)?.toStop).toBe('vastergard-ip')
    expect(journey.departureTime).toBe('14:09')
    expect(journey.arrivalTime).toBe('14:33')
  })

  it('Laröds IP → Allerums IP, söndag', () => {
    const [journey] = search(key('Laröds IP'), key('Allerums IP'), '10:00', 'sondag')
    expect(journey.legs[0].fromStop).toBe('larods-ip')
    expect(journey.legs.at(-1)?.toStop).toBe('allerums-ip')
    expect(journey.transfers).toBeGreaterThanOrEqual(1)
  })

  it('Laröds IP → Allerums IP, fredag: Allerums IP trafikeras inte då', () => {
    // Detta är fallet som rapporterades som produktionsfel. Underlaget säger
    // att linje 16 bara stannar vid Allerums IP på söndagen, så det finns
    // ingen resa — men gränssnittet måste kunna förklara varför.
    expect(isStopServed('allerums-ip', 'fre-lor')).toBe(false)
    expect(isStopServed('allerums-ip', 'sondag')).toBe(true)
    expect(servicesServingStop('allerums-ip').map((s) => s.id)).toEqual(['sondag'])
  })

  it('vet vilka hållplatser som bara går på söndagen', () => {
    const sundayOnly = timetable.stops
      .filter((stop) => !isStopServed(stop.id, 'fre-lor') && isStopServed(stop.id, 'sondag'))
      .map((stop) => stop.id)
      .sort()
    expect(sundayOnly).toEqual([
      'allerums-ip',
      'flygfaltet',
      'gantofta',
      'morarp-vidablick-ip',
      'paarp-medevi',
    ])
  })

  it('varje hållplats trafikeras minst ett trafikdygn', () => {
    for (const stop of timetable.stops) {
      expect(servicesServingStop(stop.id).length, stop.id).toBeGreaterThan(0)
    }
  })
})

describe('React-nycklar för resekorten', () => {
  const cases: [string, string, string, string][] = [
    ['Ättekulla IP', 'Västergård IP', '14:00', 'sondag'],
    ['Rydebäck IP', 'Olympia', '06:00', 'fre-lor'],
    ['Laröds IP', 'Filborna IP', '10:00', 'fre-lor'],
    ['Norrvalla IP', 'Olympia', '12:00', 'fre-lor'],
    ['Laröds IP', 'Allerums IP', '10:00', 'sondag'],
  ]

  it('är unika för varje resultatlista', () => {
    for (const [from, to, time, service] of cases) {
      const journeys = search(key(from), key(to), time, service)
      const keys = journeyKeys(journeys)
      expect(new Set(keys).size, `${from} -> ${to} ${service}`).toBe(keys.length)
    }
  })

  it('skiljer sig mellan två olika sökningar', () => {
    const first = journeyKeys(search(key('Ättekulla IP'), key('Västergård IP'), '14:00', 'sondag'), 1)
    const second = journeyKeys(search(key('Rydebäck IP'), key('Olympia'), '06:00', 'fre-lor'), 2)
    expect(first.some((k) => second.includes(k))).toBe(false)
  })

  it('den tidigare nyckelformeln kolliderade — därför bytte vi ut den', () => {
    // Regressionen: två alternativ startar med samma buss (samma avgångstid
    // och samma tripId). Det gav dubbletter, och React lämnade kvar kort från
    // den förra sökningen.
    const journeys = search(key('Ättekulla IP'), key('Västergård IP'), '14:00', 'sondag')
    const old = journeys.map((j) => `${j.departureTime}-${j.legs[0].tripId}`)
    expect(new Set(old).size).toBeLessThan(old.length)

    const fixed = journeys.map((journey, index) => journeyKey(0, index, journey))
    expect(new Set(fixed).size).toBe(fixed.length)
  })
})

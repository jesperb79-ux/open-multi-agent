import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { connections, timetable, venues } from '../src/data/timetable'
import { findJourneys } from '../src/planner/findJourneys'
import type { Journey } from '../src/types'
import { parseMapsFlag } from '../src/maps/feature-flag'
import { journeyLinks, linkKey } from '../src/maps/journey-links'
import matchesDocument from '../data/google-maps-matches.json'
import {
  SIGNAGE_NOTICE,
  googleMapsLocations,
  isVerifiedAgainstOfficialMap,
  mapsLocationForStop,
  mapsLocationForVenue,
  needsSignageNotice,
} from '../src/config/googleMapsLocations'
import {
  EXTERNAL_LINK_ATTRIBUTES,
  mapsDirectionsUrl,
  mapsSearchUrl,
} from '../src/maps/google-maps-url'

const paramsOf = (url: string) => new URL(url).searchParams

const allMatches = matchesDocument.matches
const stopMapsLocations = googleMapsLocations.filter((l) => l.type === 'bus-stop')

describe('URL-kodning', () => {
  it('kodar å, ä och ö korrekt', () => {
    const url = mapsSearchUrl('Råå IP, Helsingborg, Sverige')
    expect(url).toContain('R%C3%A5%C3%A5')
    expect(paramsOf(url).get('query')).toBe('Råå IP, Helsingborg, Sverige')

    for (const [text, encoded] of [
      ['Laröds IP', 'Lar%C3%B6ds'],
      ['Ättekulla IP', '%C3%84ttekulla'],
      ['Örby ängars IP', '%C3%96rby+%C3%A4ngars'],
      ['Mörarp', 'M%C3%B6rarp'],
      ['Ödåkra', '%C3%96d%C3%A5kra'],
    ] as const) {
      const encodedUrl = mapsSearchUrl(text)
      expect(encodedUrl, text).toContain(encoded)
      expect(paramsOf(encodedUrl).get('query'), text).toBe(text)
    }
  })

  it('kodar tecken som annars skulle bryta ur parametern', () => {
    const nasty = 'Plan & Co, "Ödåkra" #1 ?a=b&c=d'
    const url = mapsSearchUrl(nasty)
    // Frasen kommer tillbaka oskadd, och inga extra parametrar har smugit in.
    expect(paramsOf(url).get('query')).toBe(nasty)
    expect([...paramsOf(url).keys()].sort()).toEqual(['api', 'query'])
  })

  it('bygger adresser med URLSearchParams, inte strängkonkatenering', () => {
    const source = readFileSync(new URL('../src/maps/google-maps-url.ts', import.meta.url), 'utf8')
    expect(source).toContain('URLSearchParams')
    // Ingen fras stoppas in direkt i URL-strängen.
    expect(source).not.toMatch(/\$\{(query|destination)\}/)
  })
})

describe('söklänk', () => {
  it('använder den officiella sök-URL:en med api=1', () => {
    const url = mapsSearchUrl('Norrvalla IP, Helsingborg, Sverige')
    expect(url.startsWith('https://www.google.com/maps/search/?')).toBe(true)
    expect(paramsOf(url).get('api')).toBe('1')
  })

  it('en spelplats får en söklänk med sin sökfras', () => {
    const larod = mapsLocationForVenue('larods-ip')
    expect(larod?.query).toBe('Laröds IP, Laröd, Helsingborg, Sverige')
    expect(paramsOf(mapsSearchUrl(larod!.query)).get('query')).toBe(larod!.query)
  })

  it('en hållplats får en sökfras ur kartans namn', () => {
    const stop = mapsLocationForStop('filborna-ip')
    expect(stop?.query).toBe('Filborna IP, Helsingborg, Sverige')
    expect(paramsOf(mapsSearchUrl(stop!.query)).get('query')).toBe(stop!.query)
  })

  it('sökfraserna är platsnamn, aldrig interna id:n', () => {
    for (const location of allMatches) {
      expect(location.query, location.id).not.toBe(location.id)
      // Inga bindestrecks-slugar som "larods-ip".
      expect(location.query, location.id).not.toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/)
      expect(location.query, location.id).toMatch(/Sverige$/)
    }
  })
})

describe('navigeringslänk', () => {
  it('använder travelmode=walking och startar navigeringen', () => {
    const url = mapsDirectionsUrl('Laröds IP, Laröd, Helsingborg, Sverige')
    expect(url.startsWith('https://www.google.com/maps/dir/?')).toBe(true)
    const params = paramsOf(url)
    expect(params.get('api')).toBe('1')
    expect(params.get('travelmode')).toBe('walking')
    expect(params.get('dir_action')).toBe('navigate')
  })

  it('anger destination men aldrig användarens position', () => {
    const params = paramsOf(mapsDirectionsUrl('Olympia, Helsingborg, Sverige'))
    expect(params.get('destination')).toBe('Olympia, Helsingborg, Sverige')
    expect(params.get('origin')).toBeNull()
    expect([...params.keys()].sort()).toEqual(['api', 'destination', 'dir_action', 'travelmode'])
  })

  it('appen ber aldrig om platsbehörighet', () => {
    for (const file of ['maps/google-maps-url.ts', 'maps/MapsLinks.tsx', 'maps/feature-flag.ts', 'config/googleMapsLocations.ts']) {
      const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(/geolocation|getCurrentPosition|watchPosition/i)
    }
  })
})

describe('Harlyckans två hållplatser', () => {
  it('har varsin sökfras och slås inte ihop', () => {
    const platsen = mapsLocationForStop('elinebergsplatsen')
    const kyrkan = mapsLocationForStop('elinebergskyrkan')

    expect(platsen?.query).toBe('Elinebergsplatsen, Helsingborg, Sverige')
    expect(kyrkan?.query).toBe('Elinebergskyrkan, Helsingborg, Sverige')
    expect(platsen?.query).not.toBe(kyrkan?.query)
    expect(mapsSearchUrl(platsen!.query)).not.toBe(mapsSearchUrl(kyrkan!.query))
  })

  it('båda finns kvar som egna poster i konfigurationen', () => {
    const ids = stopMapsLocations.map((l) => l.id)
    expect(ids).toContain('elinebergsplatsen')
    expect(ids).toContain('elinebergskyrkan')
  })
})

describe('säkerhetsnivå och verifiering', () => {
  it('en fullt belagd plats får ingen reservation', () => {
    const larod = mapsLocationForVenue('larods-ip')!
    expect(larod.verificationStatus).toBe('verified-against-official-map')
    expect(larod.confidence).toBe('high')
    expect(needsSignageNotice(larod)).toBe(false)
  })

  it('en plats som bara är sannolik får reservationen', () => {
    // Ödåkra/Toftavallen heter olika på kartan 2025 och i tidtabellen 2026.
    const odakra = mapsLocationForStop('odakra-toftavallen')!
    expect(odakra.verificationStatus).toBe('probable')
    expect(needsSignageNotice(odakra)).toBe(true)
  })

  it('en medelsäker sökfras får reservationen även när läget är belagt', () => {
    for (const id of ['barslov', 'gantofta', 'glumslov', 'flygfaltet']) {
      const stop = mapsLocationForStop(id)!
      expect(stop.verificationStatus, id).toBe('verified-against-official-map')
      expect(stop.confidence, id).toBe('medium')
      expect(needsSignageNotice(stop), id).toBe(true)
    }
  })

  it('reservationstexten är den efterfrågade', () => {
    expect(SIGNAGE_NOTICE).toBe('Kontrollera skyltning på plats.')
  })

  it('de flesta platser är nu belagda mot kartan', () => {
    const verified = googleMapsLocations.filter(isVerifiedAgainstOfficialMap)
    expect(verified.length).toBe(googleMapsLocations.length - 1)
  })

  it('obekräftade och lågt bedömda platser visas inte i appen', () => {
    const hidden = allMatches.filter(
      (m) => m.verificationStatus === 'unverified' || m.confidence === 'low',
    )
    expect(hidden.length).toBeGreaterThan(0)
    for (const match of hidden) {
      const lookup = match.type === 'venue' ? mapsLocationForVenue : mapsLocationForStop
      expect(lookup(match.id), match.id).toBeUndefined()
    }
    // Mörarp Vidablick IP saknas helt på kartan och får därför ingen knapp.
    expect(mapsLocationForVenue('morarp-vidablick-ip')).toBeUndefined()
    expect(mapsLocationForStop('morarp-vidablick-ip')).toBeUndefined()
  })

  it('varje visad plats är kontrollerad mot en kartcell', () => {
    for (const location of googleMapsLocations) {
      const match = allMatches.find((m) => m.id === location.id && m.type === location.type)!
      expect(match.mapCell, location.id).toBeTruthy()
      expect(match.landmark, location.id).toBeTruthy()
    }
  })

  it('varje bedömning är motiverad, och varje låg bedömning har en anteckning', () => {
    for (const match of allMatches) {
      expect(match.reasoning, match.id).toBeTruthy()
      expect(match.sourceUrls.length, match.id).toBeGreaterThan(0)
      if (match.confidence === 'low') expect(match.notes, match.id).toBeTruthy()
    }
  })

  it('gränssnittet visar reservationen där den behövs', () => {
    const source = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(source).toContain('needsSignageNotice(location)')
    expect(source).toContain('SIGNAGE_NOTICE')
  })

  it('gränssnittet har bara Navigera-knappen', () => {
    const source = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(source).toContain('>\n        Navigera\n      </a>')
    expect(source).not.toContain('Visa i Google Maps')
    // Bara en länk per plats.
    expect((source.match(/<a\b/g) ?? []).length).toBe(1)
  })
})

describe('täckning', () => {
  it('varje fotbollsplan och hållplats är bedömd', () => {
    expect(allMatches.filter((m) => m.type === 'venue')).toHaveLength(venues.length)
    expect(allMatches.filter((m) => m.type === 'bus-stop')).toHaveLength(timetable.stops.length)
  })

  it('en verifierad spelplats får en Navigera-länk', () => {
    const larod = mapsLocationForVenue('larods-ip')
    expect(larod?.verificationStatus).toBe('verified-against-official-map')
    expect(larod?.directionsUrl).toContain('/maps/dir/')
    expect(paramsOf(larod!.directionsUrl).get('travelmode')).toBe('walking')
  })

  it('en verifierad hållplats får en Navigera-länk', () => {
    const stop = mapsLocationForStop('filborna-ip')
    expect(stop?.verificationStatus).toBe('verified-against-official-map')
    // Kartans H-symbol heter "Filborna IP", inte Filbornaskolan.
    expect(stop?.query).toBe('Filborna IP, Helsingborg, Sverige')
    expect(stop?.directionsUrl).toContain('/maps/dir/')
  })

  it('en plats utan konfiguration ger ingen länk att rendera', () => {
    expect(mapsLocationForVenue('finns-inte')).toBeUndefined()
    expect(mapsLocationForStop('finns-inte')).toBeUndefined()
    // Mörarp saknas på kartan och har därför ingen konfiguration heller.
    expect(mapsLocationForStop('morarp-vidablick-ip')).toBeUndefined()
    // Platser utan belagt läge sållas bort när länklistan byggs, och
    // komponenten renderar ändå ingenting om den ändå skulle få undefined.
    const links = readFileSync(new URL('../src/maps/journey-links.ts', import.meta.url), 'utf8')
    expect(links).toContain('if (!location) continue')
    const component = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(component).toContain('if (!location) return null')
  })

  it('inga koordinater är påhittade', () => {
    for (const location of googleMapsLocations) {
      expect(location.latitude, location.id).toBeUndefined()
      expect(location.longitude, location.id).toBeUndefined()
    }
  })
})

describe('sökfraserna', () => {
  it('använder rätt ort utanför centrala Helsingborg', () => {
    expect(mapsLocationForVenue('larods-ip')?.query).toContain('Laröd')
    expect(mapsLocationForVenue('allerums-ip')?.query).toContain('Allerum')
    expect(mapsLocationForVenue('rydeback-ip')?.query).toContain('Rydebäck')
    expect(mapsLocationForVenue('toftavallen')?.query).toContain('Ödåkra')
    expect(mapsLocationForStop('paarp-medevi')?.query).toContain('Påarp')
  })

  it('hittar inte på gatuadresser', () => {
    for (const match of allMatches) {
      expect(match.query, match.id).not.toMatch(/\d+\s*[A-Za-z]?\s*,/)
    }
  })

  it('rättar stavfel som finns i tidtabellen', () => {
    // PDF:en skriver "Norvalla" och "Vätergård"; kartan skriver rätt.
    expect(mapsLocationForStop('norrvalla-ip')?.query).toContain('Norrvalla')
    expect(mapsLocationForVenue('vastergard-ip')?.query).toContain('Västergård')
  })

  it('följer kartans namn där det skiljer sig från tidtabellens', () => {
    // Kartan: Olympiafältet, Ryavallen, Medevi IP, Stendösvallen, Bållevi IP.
    expect(mapsLocationForVenue('olympia')?.query).toContain('Olympiafältet')
    expect(mapsLocationForVenue('allerums-ip')?.query).toContain('Ryavallen')
    expect(mapsLocationForStop('paarp-medevi')?.query).toContain('Medevi IP')
    expect(mapsLocationForStop('gantofta')?.query).toContain('Stendösvallen')
    expect(mapsLocationForStop('barslov')?.query).toContain('Bållevi IP')
    expect(mapsLocationForStop('glumslov')?.query).toContain('Glumslövs IP')
  })
})

describe('feature flag', () => {
  it('är av för allt utom exakt "true"', () => {
    for (const value of [undefined, null, '', 'false', 'FALSE', '0', '1', 'yes', 'maps']) {
      expect(parseMapsFlag(value), String(value)).toBe(false)
    }
  })

  it('är på för "true" oavsett skiftläge och blanktecken', () => {
    for (const value of ['true', 'TRUE', ' true ', '\ttrue\n']) {
      expect(parseMapsFlag(value), value).toBe(true)
    }
  })

  it('stoppar renderingen i komponenten, inte i länkurvalet', () => {
    // Flaggan sitter där länken faktiskt visas. journeyLinks är ren och kan
    // därför testas utan att miljövariabeln behöver simuleras.
    const component = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(component).toContain('if (!ENABLED) return null')
    const links = readFileSync(new URL('../src/maps/journey-links.ts', import.meta.url), 'utf8')
    expect(links).not.toContain('import.meta.env')
    expect(links).not.toContain('mapsEnabled')
  })
})

describe('externa länkar', () => {
  it('har target och rel som skyddar mot tabnabbing', () => {
    expect(EXTERNAL_LINK_ATTRIBUTES).toEqual({ target: '_blank', rel: 'noopener noreferrer' })
  })

  it('varje länk i komponenten har säkra attribut', () => {
    const source = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    const anchors = source.match(/<a\b[\s\S]*?>/g) ?? []
    expect(anchors.length).toBeGreaterThan(0)
    for (const anchor of anchors) {
      expect(anchor).toContain('target="_blank"')
      expect(anchor).toContain('rel="noopener noreferrer"')
    }
  })

  it('appen hämtar aldrig något från Google', () => {
    for (const file of ['maps/google-maps-url.ts', 'maps/MapsLinks.tsx', 'config/googleMapsLocations.ts']) {
      const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
      expect(source, file).not.toMatch(/fetch\(|XMLHttpRequest|<iframe|<script/i)
      expect(source, file).not.toMatch(/api[_-]?key|maps\.googleapis\.com/i)
    }
  })
})

describe('kartlänkarna påverkar inte resealgoritmen', () => {
  it('reseplaneraren importerar ingenting från kart- eller kartkonfigurationen', () => {
    const planner = readFileSync(new URL('../src/planner/findJourneys.ts', import.meta.url), 'utf8')
    expect(planner).not.toMatch(/from '\.\.?\/(maps|config)/)
  })

  it('samma sökning ger samma resa oavsett kartlänkarna', () => {
    const query = {
      connections,
      originStop: 'rydeback-ip',
      destinationStop: 'olympiaskolan',
      earliestDeparture: '06:00',
      serviceId: 'fre-lor',
    }
    const before = findJourneys(query)
    // Bygg alla länkar; planeringen ska inte märka något.
    googleMapsLocations.forEach((l) => [l.showUrl, l.directionsUrl])
    expect(findJourneys(query)).toEqual(before)
    expect(before[0].departureTime).toBe('06:30')
  })
})

/**
 * Riktiga resor ur den importerade tidtabellen. För varje resa kontrolleras
 * att hållplatserna som faktiskt visas i resekortet också har en Navigera-länk,
 * och att en plats utan belagt läge inte får någon.
 */
describe('Navigera-länkar på riktiga resor', () => {
  const journeyFor = (originStop: string, destinationStop: string, time: string, serviceId: string) =>
    findJourneys({ connections, originStop, destinationStop, earliestDeparture: time, serviceId })[0]

  /** Hållplatserna som gränssnittet sätter en länk vid: start, byten och mål. */
  const linkedStops = (journey: Journey): string[] => [
    journey.legs[0].fromStop,
    ...journey.transfersDetail.map((t) => t.stopId),
    journey.legs[journey.legs.length - 1].toStop,
  ]

  const cases: [string, string, string, string, string][] = [
    ['Laröds IP → Filborna IP', 'larods-ip', 'filborna-ip', '10:00', 'fre-lor'],
    ['Rydebäck IP → Olympia', 'rydeback-ip', 'olympiaskolan', '06:00', 'fre-lor'],
    ['Ättekulla IP → Västergård IP', 'attekulla-ip', 'vastergard-ip', '14:00', 'sondag'],
    ['via Harlyckan (Elinebergsplatsen)', 'elinebergsplatsen', 'larods-ip', '13:00', 'fre-lor'],
    ['via Flygfältet', 'flygfaltet', 'norrvalla-ip', '08:00', 'sondag'],
    ['via Glumslöv', 'glumslov', 'norrvalla-ip', '09:00', 'fre-lor'],
    ['via Bårslöv', 'barslov', 'norrvalla-ip', '09:00', 'sondag'],
    ['via Gantofta', 'gantofta', 'norrvalla-ip', '09:00', 'sondag'],
  ]

  for (const [name, from, to, time, service] of cases) {
    it(`${name} — varje visad hållplats har en Navigera-länk`, () => {
      const journey = journeyFor(from, to, time, service)
      expect(journey, name).toBeDefined()
      for (const stopId of linkedStops(journey)) {
        const location = mapsLocationForStop(stopId)
        expect(location, `${name}: ${stopId}`).toBeDefined()
        expect(location!.directionsUrl).toContain('/maps/dir/')
        expect(paramsOf(location!.directionsUrl).get('travelmode')).toBe('walking')
        expect(paramsOf(location!.directionsUrl).get('origin')).toBeNull()
      }
    })
  }

  it('en resa till Mörarp får ingen länk vid slutmålet', () => {
    const journey = journeyFor('norrvalla-ip', 'morarp-vidablick-ip', '07:00', 'sondag')
    expect(journey).toBeDefined()
    expect(journey.legs.at(-1)!.toStop).toBe('morarp-vidablick-ip')
    // Läget saknas på kartan, så ingen knapp visas.
    expect(mapsLocationForStop('morarp-vidablick-ip')).toBeUndefined()
    // Men startplatsen har en.
    expect(mapsLocationForStop(journey.legs[0].fromStop)).toBeDefined()
  })

  it('Harlyckan använder den hållplats resan faktiskt går från', () => {
    const platsen = journeyFor('elinebergsplatsen', 'larods-ip', '13:00', 'fre-lor')
    expect(platsen.legs[0].fromStop).toBe('elinebergsplatsen')
    expect(mapsLocationForStop('elinebergsplatsen')!.query).toContain('Elinebergsplatsen')

    const kyrkan = journeyFor('norrvalla-ip', 'elinebergskyrkan', '13:00', 'sondag')
    expect(kyrkan.legs.at(-1)!.toStop).toBe('elinebergskyrkan')
    expect(mapsLocationForStop('elinebergskyrkan')!.query).toContain('Elinebergskyrkan')
  })
})

/**
 * Länkarna ska inte trängas. Per resealternativ visas högst en vid
 * påstigningen, en vid varje faktiskt byte och en vid slutmålet — och samma
 * navigeringsmål aldrig mer än en gång.
 */
describe('antal Navigera-länkar per resa', () => {
  const journeyFor = (originStop: string, destinationStop: string, time: string, serviceId: string) =>
    findJourneys({ connections, originStop, destinationStop, earliestDeparture: time, serviceId })[0]

  const cases: [string, string, string, string, string][] = [
    ['Laröds IP → Filborna IP', 'larods-ip', 'filborna-ip', '10:00', 'fre-lor'],
    ['Rydebäck IP → Olympia', 'rydeback-ip', 'olympiaskolan', '06:00', 'fre-lor'],
    ['Ättekulla IP → Västergård IP', 'attekulla-ip', 'vastergard-ip', '14:00', 'sondag'],
    ['via Harlyckan', 'elinebergsplatsen', 'larods-ip', '13:00', 'fre-lor'],
    ['via Flygfältet', 'flygfaltet', 'norrvalla-ip', '08:00', 'sondag'],
    ['via Glumslöv', 'glumslov', 'norrvalla-ip', '09:00', 'fre-lor'],
    ['via Bårslöv', 'barslov', 'norrvalla-ip', '09:00', 'sondag'],
    ['via Gantofta', 'gantofta', 'norrvalla-ip', '09:00', 'sondag'],
  ]

  it('samma navigeringsmål visas aldrig två gånger i samma resa', () => {
    for (const [name, from, to, time, service] of cases) {
      const links = journeyLinks(journeyFor(from, to, time, service))
      const destinations = [...links.values()].map((l) => l.directionsUrl)
      expect(new Set(destinations).size, name).toBe(destinations.length)
    }
  })

  it('samma plats visas bara en gång per resealternativ', () => {
    for (const [name, from, to, time, service] of cases) {
      const links = journeyLinks(journeyFor(from, to, time, service))
      const ids = [...links.keys()].map((key) => key.split(':')[1])
      expect(new Set(ids).size, name).toBe(ids.length)
    }
  })

  it('start, byte och mål får varsin länk', () => {
    // Laröds IP → Filborna IP har ett byte vid Norrvalla IP.
    const journey = journeyFor('larods-ip', 'filborna-ip', '10:00', 'fre-lor')
    expect(journey.transfers).toBe(1)
    const links = journeyLinks(journey)

    expect(links.has(linkKey('start', journey.legs[0].fromStop))).toBe(true)
    expect(links.has(linkKey('transfer', journey.transfersDetail[0].stopId))).toBe(true)
    expect(links.has(linkKey('destination', journey.legs.at(-1)!.toStop))).toBe(true)
  })

  it('en resa utan byte får högst två länkar', () => {
    const journey = journeyFor('rydeback-ip', 'olympiaskolan', '06:00', 'fre-lor')
    expect(journey.transfers).toBe(0)
    expect(journeyLinks(journey).size).toBeLessThanOrEqual(2)
  })

  it('en resa med ett byte får högst tre länkar', () => {
    const journey = journeyFor('larods-ip', 'filborna-ip', '10:00', 'fre-lor')
    expect(journey.transfers).toBe(1)
    expect(journeyLinks(journey).size).toBeLessThanOrEqual(3)
  })

  it('antalet länkar överstiger aldrig antalet byten plus två', () => {
    for (const [name, from, to, time, service] of cases) {
      const journey = journeyFor(from, to, time, service)
      expect(journeyLinks(journey).size, name).toBeLessThanOrEqual(journey.transfers + 2)
    }
  })

  it('mellanliggande hållplatser får ingen länk', () => {
    // Linje 11 passerar sju hållplatser mellan Rydebäck och Olympiaskolan.
    const journey = journeyFor('rydeback-ip', 'olympiaskolan', '06:00', 'fre-lor')
    const passed = journey.legs.flatMap((leg) => leg.intermediateStops)
    expect(passed.length).toBeGreaterThan(0)
    const linkedStops = [...journeyLinks(journey).keys()].map((key) => key.split(':')[1])
    for (const stopId of passed) {
      expect(linkedStops, stopId).not.toContain(stopId)
    }
  })

  it('en plats utan belagt läge får ingen länk ens som slutmål', () => {
    const journey = journeyFor('norrvalla-ip', 'morarp-vidablick-ip', '07:00', 'sondag')
    const links = journeyLinks(journey)
    expect(links.has(linkKey('destination', 'morarp-vidablick-ip'))).toBe(false)
    expect(links.has(linkKey('start', journey.legs[0].fromStop))).toBe(true)
  })

  it('översikten ovanför resekorten har inga egna länkar kvar', () => {
    // Elva spelplatser delar navigeringsmål med sin hållplats, så länkarna i
    // översikten var dubbletter av dem i resekortet.
    const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
    expect(app).not.toContain('venue-maps')
    expect(app).not.toContain('MapsLinks')
  })

  it('länkarna renderas bara från resekortet', () => {
    const card = readFileSync(new URL('../src/components/JourneyCard.tsx', import.meta.url), 'utf8')
    expect(card).toContain('journeyLinks(journey)')
    // Tre ställen: påstigning, byte och slutmål.
    expect((card.match(/<MapsLinks /g) ?? []).length).toBe(3)
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { timetable, venues } from '../src/data/timetable'
import { parseMapsFlag } from '../src/maps/feature-flag'
import matchesDocument from '../data/google-maps-matches.json'
import {
  APPROXIMATE_NOTICE,
  googleMapsLocations,
  isVerifiedAgainstOfficialMap,
  mapsLocationForStop,
  mapsLocationForVenue,
  needsApproximateNotice,
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

  it('en hållplats får en söklänk med sin egen sökfras', () => {
    const stop = mapsLocationForStop('filborna-ip')
    expect(stop?.query).toBe('Filbornaskolan, Helsingborg, Sverige')
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
  it('allt som inte är high får en reservation', () => {
    for (const location of googleMapsLocations) {
      expect(needsApproximateNotice(location), location.id).toBe(location.confidence !== 'high')
    }
  })

  it('reservationstexten är den efterfrågade', () => {
    expect(APPROXIMATE_NOTICE).toBe('Placeringen är ungefärlig, kontrollera skyltning på plats.')
  })

  it('ingen plats påstås verifierad mot Eskilscupens karta', () => {
    // Kartan gick inte att läsa — se docs/map-source-audit.md.
    for (const location of googleMapsLocations) {
      expect(isVerifiedAgainstOfficialMap(location), location.id).toBe(false)
    }
  })

  it('obekräftade platser visas inte i appen', () => {
    const hidden = allMatches.filter((m) => m.verificationStatus === 'unverified')
    expect(hidden.length).toBeGreaterThan(0)
    for (const match of hidden) {
      const lookup = match.type === 'venue' ? mapsLocationForVenue : mapsLocationForStop
      expect(lookup(match.id), match.id).toBeUndefined()
    }
  })

  it('varje bedömning är motiverad, och varje låg bedömning har en anteckning', () => {
    for (const match of allMatches) {
      expect(match.reasoning, match.id).toBeTruthy()
      expect(match.sourceUrls.length, match.id).toBeGreaterThan(0)
      if (match.confidence === 'low') expect(match.notes, match.id).toBeTruthy()
    }
  })

  it('gränssnittet visar reservationen i stället för att påstå verifiering', () => {
    const source = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(source).toContain('needsApproximateNotice(location)')
    expect(source).toContain('APPROXIMATE_NOTICE')
  })
})

describe('täckning', () => {
  it('varje fotbollsplan och hållplats är bedömd', () => {
    expect(allMatches.filter((m) => m.type === 'venue')).toHaveLength(venues.length)
    expect(allMatches.filter((m) => m.type === 'bus-stop')).toHaveLength(timetable.stops.length)
  })

  it('en verifierad spelplats får båda länkarna', () => {
    const larod = mapsLocationForVenue('larods-ip')
    expect(larod?.showUrl).toContain('/maps/search/')
    expect(larod?.directionsUrl).toContain('/maps/dir/')
    expect(paramsOf(larod!.directionsUrl).get('travelmode')).toBe('walking')
  })

  it('en verifierad hållplats får båda länkarna', () => {
    const stop = mapsLocationForStop('filborna-ip')
    expect(stop?.query).toBe('Filbornaskolan, Helsingborg, Sverige')
    expect(stop?.showUrl).toContain('/maps/search/')
    expect(stop?.directionsUrl).toContain('/maps/dir/')
  })

  it('en plats utan konfiguration ger ingen länk att rendera', () => {
    expect(mapsLocationForVenue('finns-inte')).toBeUndefined()
    expect(mapsLocationForStop('finns-inte')).toBeUndefined()
    // Även en obekräftad plats saknar konfiguration i appen.
    expect(mapsLocationForStop('flygfaltet')).toBeUndefined()
    const source = readFileSync(new URL('../src/maps/MapsLinks.tsx', import.meta.url), 'utf8')
    expect(source).toContain('if (!location) return null')
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
  })

  it('hittar inte på gatuadresser', () => {
    for (const match of allMatches) {
      expect(match.query, match.id).not.toMatch(/\d+\s*[A-Za-z]?\s*,/)
    }
  })

  it('rättar stavfel som finns i tidtabellen', () => {
    // PDF:en skriver "Norvalla" och "Vätergård".
    expect(mapsLocationForStop('norrvalla-ip')?.query).toContain('Norrvalla')
    expect(mapsLocationForVenue('vastergard-ip')?.query).toContain('Västergård')
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

  it('samma sökning ger samma resa oavsett kartlänkarna', async () => {
    const { connections } = await import('../src/data/timetable')
    const { findJourneys } = await import('../src/planner/findJourneys')
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

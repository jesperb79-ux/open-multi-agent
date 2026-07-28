import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain JS import script, exercised here for its validation rules
import { CLASSIFICATIONS, CUP_SIGNAGE_NOTICE, SHOWN_CLASSIFICATIONS, coordinateProblem, destinationFor, parseGoogleMapsUrl, validateDocument, validateEntry } from '../scripts/apply-verified-bus-stops.mjs'
import { timetable } from '../src/data/timetable'

const knownStopIds = new Set(timetable.stops.map((stop) => stop.id))

/** En post som ska gå igenom, som utgångspunkt för varianterna nedan. */
const valid = {
  latitude: 56.0432,
  longitude: 12.7123,
  classification: 'exact-public-transit-stop',
  verified: true,
  note: 'Kontrollerad mot H-markeringen i D4',
}

const check = (stopId: string, raw: unknown) => validateEntry(stopId, raw, knownStopIds)
const problemsOf = (stopId: string, raw: unknown): string[] => check(stopId, raw).problems

describe('verified-bus-stops: enskilda poster', () => {
  it('en fullständig post går igenom', () => {
    const result = check('gustavslundsskolan', valid)
    expect(result.problems).toEqual([])
    expect(result.entry).toMatchObject({
      latitude: 56.0432,
      longitude: 12.7123,
      classification: 'exact-public-transit-stop',
    })
  })

  it('okänt stopId avvisas', () => {
    expect(problemsOf('finns-inte', valid).join(' ')).toContain('okänt stopId')
    // Ett id ur Google Maps-konfigurationen räcker inte — det ska vara
    // tidtabellens.
    expect(problemsOf('harlyckan-ip', valid).join(' ')).toContain('okänt stopId')
  })

  it('verified måste vara true', () => {
    for (const verified of [false, undefined, 'true', 1, null]) {
      const problems = problemsOf('gustavslundsskolan', { ...valid, verified })
      expect(problems.join(' '), String(verified)).toContain('verified måste vara true')
    }
  })

  it('posten måste ha antingen länk eller koordinater', () => {
    const bare = { classification: 'exact-cup-stop', verified: true, note: 'x' }
    expect(problemsOf('flygfaltet', bare).join(' ')).toContain(
      'saknar både googleMapsUrl och koordinater',
    )
  })

  it('en länk ensam räcker', () => {
    const result = check('olympiaskolan', {
      googleMapsUrl: 'https://www.google.com/maps/place/Olympiaskolan/@56.04,12.71,17z',
      classification: 'exact-public-transit-stop',
      verified: true,
      note: 'Kopierad från Google Maps',
    })
    expect(result.problems).toEqual([])
    expect(result.entry.googleMapsUrl).toContain('google.com/maps')
  })

  it('note krävs — en koordinat utan förklaring säger inget', () => {
    const { note: _omitted, ...withoutNote } = valid
    expect(problemsOf('gustavslundsskolan', withoutNote).join(' ')).toContain('note saknas')
  })

  it('en ogiltig klassificering avvisas', () => {
    for (const classification of ['exact', 'verified', '', undefined, 'EXACT-CUP-STOP']) {
      const problems = problemsOf('gustavslundsskolan', { ...valid, classification })
      expect(problems.join(' '), String(classification)).toContain('är inte en av')
    }
  })

  it('alla fyra klassificeringarna accepteras', () => {
    for (const classification of CLASSIFICATIONS) {
      if (classification === 'unverified') continue
      expect(problemsOf('gustavslundsskolan', { ...valid, classification }), classification).toEqual(
        [],
      )
    }
  })

  it('en post som inte är ett objekt avvisas', () => {
    for (const raw of [null, 'https://maps.google.com', 42, [56.04, 12.71]]) {
      expect(problemsOf('gustavslundsskolan', raw).join(' '), String(raw)).toContain(
        'posten är inget objekt',
      )
    }
  })
})

describe('verified-bus-stops: koordinater', () => {
  it('0,0 avvisas — det är ett ofyllt fält', () => {
    expect(coordinateProblem(0, 0)).toContain('fortfarande 0')
  })

  it('koordinater utanför Helsingborg med omland avvisas', () => {
    // Stockholm, Malmö och ett omkastat lat/lng-par.
    expect(coordinateProblem(59.33, 18.06)).toContain('latitude')
    expect(coordinateProblem(55.6, 13.0)).toContain('latitude')
    expect(coordinateProblem(12.71, 56.04)).toContain('latitude')
  })

  it('koordinater som inte är tal avvisas', () => {
    for (const [lat, lng] of [
      ['56.04', '12.71'],
      [NaN, 12.71],
      [56.04, Infinity],
      [null, null],
    ]) {
      expect(coordinateProblem(lat, lng), `${lat},${lng}`).toContain('måste vara tal')
    }
  })

  it('ett giltigt läge i Helsingborg accepteras', () => {
    expect(coordinateProblem(56.0432, 12.7123)).toBeNull()
    // Laröd i norr och Rydebäck i söder ligger båda inom ramen.
    expect(coordinateProblem(56.09, 12.65)).toBeNull()
    expect(coordinateProblem(55.94, 12.76)).toBeNull()
  })

  it('en halv koordinat avvisas', () => {
    const { longitude: _omitted, ...halfway } = valid
    expect(problemsOf('gustavslundsskolan', halfway).join(' ')).toContain('måste vara tal')
  })
})

describe('verified-bus-stops: länkar', () => {
  it('bara google.com accepteras', () => {
    for (const url of [
      'https://maps.apple.com/place?q=56,12',
      'https://goo.gl/maps/abc',
      'https://openstreetmap.org/node/1',
      'https://google.com.evil.example/maps',
    ]) {
      expect(parseGoogleMapsUrl(url).ok, url).toBe(false)
    }
  })

  it('http avvisas', () => {
    expect(parseGoogleMapsUrl('http://www.google.com/maps/place/X').ok).toBe(false)
  })

  it('en google.com-adress utanför /maps avvisas', () => {
    expect(parseGoogleMapsUrl('https://www.google.com/search?q=busshållplats').ok).toBe(false)
  })

  it('en riktig Maps-adress accepteras', () => {
    for (const url of [
      'https://www.google.com/maps/place/Olympiaskolan/@56.04,12.71,17z',
      'https://google.se/maps/@56.04,12.71,17z',
      'https://www.google.com/maps/dir/?api=1&destination=56.04,12.71',
    ]) {
      expect(parseGoogleMapsUrl(url).ok, url).toBe(true)
    }
  })

  it('skräp avvisas utan att kasta', () => {
    for (const url of ['', 'inte en url', '56.04,12.71']) {
      expect(parseGoogleMapsUrl(url).ok, url).toBe(false)
    }
  })
})

describe('verified-bus-stops: unverified', () => {
  it('en obekräftad hållplats får varken länk eller koordinat', () => {
    const problems = problemsOf('morarp-vidablick-ip', {
      ...valid,
      classification: 'unverified',
    })
    expect(problems.join(' ')).toContain('unverified får varken')
  })

  it('en obekräftad hållplats behöver en förklaring', () => {
    const problems = problemsOf('morarp-vidablick-ip', {
      classification: 'unverified',
      verified: true,
    })
    expect(problems.join(' ')).toContain('kräver en note')
  })

  it('en korrekt obekräftad post går igenom men ger inget mål', () => {
    const result = check('morarp-vidablick-ip', {
      classification: 'unverified',
      verified: true,
      note: 'Saknas på 2025 års karta. Linje 17 omlagd mellan åren.',
    })
    expect(result.problems).toEqual([])
    expect(result.entry.latitude).toBeUndefined()
    expect(result.entry.googleMapsUrl).toBeUndefined()
  })
})

describe('verified-bus-stops: hela filen', () => {
  const documentOf = (stops: Record<string, unknown>) => ({ stops })

  it('en tom fil är giltig och skriver inget', () => {
    const result = validateDocument(documentOf({}), knownStopIds)
    expect(result.ok).toBe(true)
    expect(Object.keys(result.entries)).toEqual([])
  })

  it('en enda trasig post stoppar hela filen', () => {
    const result = validateDocument(
      documentOf({
        gustavslundsskolan: valid,
        olympiaskolan: { ...valid, verified: false },
      }),
      knownStopIds,
    )
    expect(result.ok).toBe(false)
    // Ingenting skrivs — inte ens den post som var korrekt.
    expect(result.entries.gustavslundsskolan).toBeUndefined()
    expect(result.problems.join(' ')).toContain('olympiaskolan')
  })

  it('problemen namnger vilken hållplats som är fel', () => {
    const result = validateDocument(
      documentOf({ husensjoskolan: { ...valid, latitude: 0, longitude: 0 } }),
      knownStopIds,
    )
    expect(result.ok).toBe(false)
    expect(result.problems[0].startsWith('husensjoskolan:')).toBe(true)
  })

  it('en fil utan "stops" avvisas i stället för att tolkas', () => {
    expect(validateDocument({}, knownStopIds).problems.join(' ')).toContain('saknar fältet')
    expect(validateDocument({ stops: [] }, knownStopIds).problems.join(' ')).toContain(
      'inget objekt',
    )
    expect(validateDocument(null, knownStopIds).problems.join(' ')).toContain('inget objekt')
  })

  it('obekräftade räknas för sig och hamnar inte i registret', () => {
    const result = validateDocument(
      documentOf({
        gustavslundsskolan: valid,
        'morarp-vidablick-ip': {
          classification: 'unverified',
          verified: true,
          note: 'Saknas på kartan',
        },
      }),
      knownStopIds,
    )
    expect(result.ok).toBe(true)
    expect(Object.keys(result.entries)).toEqual(['gustavslundsskolan'])
    expect(result.skipped).toEqual(['morarp-vidablick-ip'])
  })
})

describe('verified-bus-stops: navigeringsmål', () => {
  it('koordinaten vinner över länken', () => {
    expect(destinationFor({ latitude: 56.0432, longitude: 12.7123 })).toBe('56.0432,12.7123')
    expect(
      destinationFor({
        latitude: 56.0432,
        longitude: 12.7123,
        googleMapsUrl: 'https://www.google.com/maps/place/X',
      }),
    ).toBe('56.0432,12.7123')
  })

  it('länken används när koordinat saknas', () => {
    expect(destinationFor({ googleMapsUrl: 'https://www.google.com/maps/place/X' })).toBe(
      'https://www.google.com/maps/place/X',
    )
  })
})

describe('verified-bus-stops: underlaget och mallen', () => {
  const sheet = readFileSync(
    new URL('../../../docs/bus-stop-manual-verification.md', import.meta.url),
    'utf8',
  )

  it('underlaget listar samtliga hållplatser', () => {
    for (const stop of timetable.stops) {
      expect(sheet, stop.id).toContain(`\`${stop.id}\``)
    }
  })

  it('ordinarie hållplatser söks med ordet busshållplats', () => {
    // URL-kodat: busshållplats → bussh%C3%A5llplats
    for (const stopId of ['gustavslundsskolan', 'olympiaskolan', 'elinebergsplatsen']) {
      const row = sheet.split('\n').find((line) => line.includes(`\`${stopId}\``))!
      expect(row, stopId).toContain('bussh%C3%A5llplats')
    }
  })

  it('cupspecifika hållplatser söks på landmärket i stället', () => {
    for (const stopId of ['glumslov', 'barslov', 'gantofta', 'flygfaltet']) {
      const row = sheet.split('\n').find((line) => line.includes(`\`${stopId}\``))!
      expect(row, stopId).toContain('Eskilscupen+h%C3%A5llplats')
      expect(row, stopId).not.toContain('bussh%C3%A5llplats')
    }
  })

  it('underlaget förklarar att Elineberg förblir separata', () => {
    expect(sheet).toContain('Elinebergsplatsen och Elinebergskyrkan')
    expect(sheet).toContain('Slå aldrig ihop dem')
  })

  it('mallen i data-filen är tom tills något verifierats', () => {
    const template = JSON.parse(
      readFileSync(new URL('../data/verified-bus-stops.json', import.meta.url), 'utf8'),
    )
    expect(template.stops).toEqual({})
    expect(Object.keys(template.model)).toEqual(['<stopId>'])
  })

  it('texten för probable-cup-stop är den efterfrågade', () => {
    expect(CUP_SIGNAGE_NOTICE).toBe('Följ Eskilscupens skyltning på plats.')
    expect(SHOWN_CLASSIFICATIONS).not.toContain('unverified')
    expect(SHOWN_CLASSIFICATIONS).toHaveLength(3)
  })
})

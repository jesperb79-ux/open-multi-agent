import { describe, expect, it } from 'vitest'
import {
  browserStorage,
  favoriteFor,
  FAVORITES_STORAGE_KEY,
  loadFavorites,
  saveFavorites,
  toggleFavorite,
  type Favorites,
  type StorageLike,
} from '../src/favorites'
import { placeByKey, places } from '../src/places'
import { stopsById, venues } from '../src/data/timetable'

/** Minimal localStorage-ersättare. */
class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>()

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) this.data.set(key, value)
  }

  getItem(key: string) {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }
}

/** Uppträder som Safaris privata läge: allt kastar. */
const brokenStorage: StorageLike = {
  getItem() {
    throw new Error('SecurityError')
  },
  setItem() {
    throw new Error('QuotaExceededError')
  },
  removeItem() {
    throw new Error('SecurityError')
  },
}

const known = (placeKey: string) => placeByKey.has(placeKey)
const ORIGIN = places.find((p) => p.label === 'Laröds IP')!.key
const DESTINATION = places.find((p) => p.label === 'Olympia')!.key

const stored = (favorites: Favorites) => ({ [FAVORITES_STORAGE_KEY]: JSON.stringify(favorites) })

describe('favoriter — spara och läsa', () => {
  it('sparar båda favoriterna i localStorage', () => {
    const storage = new FakeStorage()
    saveFavorites(storage, { origin: ORIGIN, destination: DESTINATION })

    expect(JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual({
      origin: ORIGIN,
      destination: DESTINATION,
    })
  })

  it('återställer favoriterna efter omladdning', () => {
    const storage = new FakeStorage()
    saveFavorites(storage, { origin: ORIGIN, destination: DESTINATION })

    // En ny sidladdning läser samma lagring på nytt.
    const restored = loadFavorites(storage, known)
    expect(restored).toEqual({ origin: ORIGIN, destination: DESTINATION })
    expect(favoriteFor(restored, 'origin')).toBe(ORIGIN)
    expect(favoriteFor(restored, 'destination')).toBe(DESTINATION)
  })

  it('fungerar när bara startplanen är sparad', () => {
    const restored = loadFavorites(new FakeStorage(stored({ origin: ORIGIN })), known)
    expect(restored).toEqual({ origin: ORIGIN })
    expect(favoriteFor(restored, 'origin')).toBe(ORIGIN)
    expect(favoriteFor(restored, 'destination')).toBe('')
  })

  it('fungerar när bara destinationen är sparad', () => {
    const restored = loadFavorites(new FakeStorage(stored({ destination: DESTINATION })), known)
    expect(restored).toEqual({ destination: DESTINATION })
    expect(favoriteFor(restored, 'origin')).toBe('')
    expect(favoriteFor(restored, 'destination')).toBe(DESTINATION)
  })

  it('ger tomma favoriter när lagringen är tom', () => {
    expect(loadFavorites(new FakeStorage(), known)).toEqual({})
    expect(favoriteFor({}, 'origin')).toBe('')
    expect(favoriteFor({}, 'destination')).toBe('')
  })

  it('tar bort posten när den sista favoriten tas bort', () => {
    const storage = new FakeStorage()
    saveFavorites(storage, { origin: ORIGIN })
    saveFavorites(storage, {})
    expect(storage.getItem(FAVORITES_STORAGE_KEY)).toBeNull()
  })
})

describe('favoriter — trasig eller otillgänglig lagring', () => {
  it('klarar att localStorage saknas helt', () => {
    expect(loadFavorites(null, known)).toEqual({})
    expect(() => saveFavorites(null, { origin: ORIGIN })).not.toThrow()
    expect(loadFavorites(undefined, known)).toEqual({})
  })

  it('klarar att localStorage kastar', () => {
    expect(loadFavorites(brokenStorage, known)).toEqual({})
    expect(() => saveFavorites(brokenStorage, { origin: ORIGIN })).not.toThrow()
  })

  it('ignorerar trasig JSON', () => {
    const storage = new FakeStorage({ [FAVORITES_STORAGE_KEY]: '{inte json' })
    expect(loadFavorites(storage, known)).toEqual({})
  })

  it('ignorerar värden av fel typ', () => {
    expect(loadFavorites(new FakeStorage({ [FAVORITES_STORAGE_KEY]: '"text"' }), known)).toEqual({})
    expect(loadFavorites(new FakeStorage({ [FAVORITES_STORAGE_KEY]: 'null' }), known)).toEqual({})
    const wrongTypes = new FakeStorage({
      [FAVORITES_STORAGE_KEY]: JSON.stringify({ origin: 42, destination: [] }),
    })
    expect(loadFavorites(wrongTypes, known)).toEqual({})
  })

  it('hoppar över en sparad plats som inte längre finns', () => {
    // Kan hända när nästa års tidtabell tar bort en hållplats.
    const storage = new FakeStorage(stored({ origin: 'venue:finns-inte@borta', destination: DESTINATION }))
    expect(loadFavorites(storage, known)).toEqual({ destination: DESTINATION })
  })

  it('browserStorage() ger null när localStorage inte finns', () => {
    // Testerna kör i Node utan DOM.
    expect(browserStorage()).toBeNull()
  })
})

describe('toggleFavorite', () => {
  it('sparar en plats som inte var favorit', () => {
    expect(toggleFavorite({}, 'origin', ORIGIN)).toEqual({ origin: ORIGIN })
  })

  it('tar bort platsen när den redan är favorit', () => {
    expect(toggleFavorite({ origin: ORIGIN }, 'origin', ORIGIN)).toEqual({})
  })

  it('byter favorit när en annan plats är vald', () => {
    expect(toggleFavorite({ origin: ORIGIN }, 'origin', DESTINATION)).toEqual({ origin: DESTINATION })
  })

  it('rör inte den andra platsen', () => {
    expect(toggleFavorite({ destination: DESTINATION }, 'origin', ORIGIN)).toEqual({
      origin: ORIGIN,
      destination: DESTINATION,
    })
  })

  it('gör ingenting när ingen plats är vald', () => {
    expect(toggleFavorite({ origin: ORIGIN }, 'destination', '')).toEqual({ origin: ORIGIN })
  })

  it('ändrar inte objektet som skickades in', () => {
    const before: Favorites = { origin: ORIGIN }
    const after = toggleFavorite(before, 'destination', DESTINATION)
    expect(before).toEqual({ origin: ORIGIN })
    expect(after).not.toBe(before)
  })
})

/**
 * En favorit sparas som en platsnyckel, inte som ett hållplats-id. Den måste
 * översättas via `placeByKey` innan den når reseplaneraren — annars hamnar en
 * venue-slug i `originStop`, vilket var precis det produktionsfelet såg ut som.
 */
describe('favoriter översätts till hållplats-id', () => {
  const venueIds = new Set(venues.map((venue) => venue.id))

  it('en återställd favorit ger ett hållplats-id som finns i tidtabellen', () => {
    const storage = new FakeStorage()
    saveFavorites(storage, { origin: ORIGIN, destination: DESTINATION })

    const restored = loadFavorites(storage, known)
    const originStop = placeByKey.get(favoriteFor(restored, 'origin'))?.stopId
    const destinationStop = placeByKey.get(favoriteFor(restored, 'destination'))?.stopId

    expect(originStop).toBe('larods-ip')
    expect(destinationStop).toBe('olympiaskolan')
    expect(stopsById.has(originStop!)).toBe(true)
    expect(stopsById.has(destinationStop!)).toBe(true)
  })

  it('en favorit blir aldrig ett venue-id', () => {
    // "Olympia" är venue-id; hållplatsen heter "olympiaskolan".
    const storage = new FakeStorage()
    saveFavorites(storage, { destination: DESTINATION })
    const stopId = placeByKey.get(favoriteFor(loadFavorites(storage, known), 'destination'))?.stopId

    expect(stopId).toBe('olympiaskolan')
    expect(venueIds.has(stopId!)).toBe(false)
  })

  it('varje sparbar plats pekar på en verklig hållplats', () => {
    for (const place of places) {
      const restored = loadFavorites(new FakeStorage(stored({ origin: place.key })), known)
      const stopId = placeByKey.get(favoriteFor(restored, 'origin'))?.stopId
      expect(stopId, place.key).toBe(place.stopId)
      expect(stopsById.has(stopId!), place.key).toBe(true)
    }
  })

  it('ett ogiltigt sparat värde ger inget hållplats-id alls', () => {
    // Ett hållplats-id, ett venue-id och en nyckel från en äldre version — inget
    // av dem får återställas som ett val.
    for (const stale of ['allerums-ip', 'olympia', 'harlyckan-ip', 'venue:allerums-ip', 'stop:borta']) {
      const restored = loadFavorites(new FakeStorage(stored({ origin: stale })), known)
      expect(restored.origin, stale).toBeUndefined()
      expect(favoriteFor(restored, 'origin')).toBe('')
      expect(placeByKey.get(favoriteFor(restored, 'origin'))).toBeUndefined()
    }
  })

  it('Harlyckans två hållplatser kan sparas var för sig', () => {
    const platsen = places.find((p) => p.stopId === 'elinebergsplatsen')!.key
    const kyrkan = places.find((p) => p.stopId === 'elinebergskyrkan')!.key
    expect(platsen).not.toBe(kyrkan)

    const storage = new FakeStorage()
    saveFavorites(storage, { origin: platsen, destination: kyrkan })
    const restored = loadFavorites(storage, known)

    expect(placeByKey.get(restored.origin!)?.stopId).toBe('elinebergsplatsen')
    expect(placeByKey.get(restored.destination!)?.stopId).toBe('elinebergskyrkan')
  })
})

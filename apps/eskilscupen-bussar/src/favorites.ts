/**
 * Favoritplaner, sparade lokalt i webbläsaren.
 *
 * Inget konto, ingen inloggning, ingen server — bara `localStorage`. Läsning
 * och skrivning får aldrig krascha appen: en full disk, avstängda kakor eller
 * Safaris privata läge gör att `localStorage` kastar, och en tidtabell som
 * bytts ut kan göra en sparad plats ogiltig. Båda fallen behandlas som
 * "ingen favorit sparad".
 */

export const FAVORITES_STORAGE_KEY = 'eskilscupen:favoritplaner'

export type FavoriteSlot = 'origin' | 'destination'

export interface Favorites {
  /** Nyckeln till en plats i `places`, inte ett hållplats-id. */
  origin?: string
  destination?: string
}

/** Den delmängd av `localStorage` som favoriterna använder. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0

/**
 * Läs sparade favoriter.
 *
 * @param storage `localStorage`, eller `null`/`undefined` när det saknas
 * @param isKnownPlace avgör om en sparad nyckel fortfarande finns i appen
 */
export function loadFavorites(
  storage: StorageLike | null | undefined,
  isKnownPlace: (placeKey: string) => boolean,
): Favorites {
  if (!storage) return {}

  let raw: string | null
  try {
    raw = storage.getItem(FAVORITES_STORAGE_KEY)
  } catch {
    return {}
  }
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}

  const { origin, destination } = parsed as Record<string, unknown>
  const favorites: Favorites = {}
  // En sparad plats som inte längre finns hoppas över i stället för att
  // återställas som ett tomt val.
  if (isNonEmptyString(origin) && isKnownPlace(origin)) favorites.origin = origin
  if (isNonEmptyString(destination) && isKnownPlace(destination)) favorites.destination = destination
  return favorites
}

/** Skriv favoriterna. Är båda tomma tas posten bort helt. */
export function saveFavorites(storage: StorageLike | null | undefined, favorites: Favorites): void {
  if (!storage) return
  try {
    if (!favorites.origin && !favorites.destination) {
      storage.removeItem(FAVORITES_STORAGE_KEY)
      return
    }
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  } catch {
    // Går det inte att spara får användaren ändå använda appen som vanligt.
  }
}

/**
 * Slå på eller av en favorit. Är platsen redan favorit tas den bort.
 * Returnerar alltid ett nytt objekt — anroparen kan jämföra med `===`.
 */
export function toggleFavorite(
  favorites: Favorites,
  slot: FavoriteSlot,
  placeKey: string,
): Favorites {
  const next: Favorites = { ...favorites }
  if (!placeKey || next[slot] === placeKey) delete next[slot]
  else next[slot] = placeKey
  return next
}

/** Det som ska vara förvalt när appen öppnas. */
export const favoriteFor = (favorites: Favorites, slot: FavoriteSlot): string =>
  favorites[slot] ?? ''

/** Hämtar `localStorage` utan att krascha där det inte finns eller är blockerat. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

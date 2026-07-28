/**
 * Vad kartan ska visa, uträknat utan DOM så att det går att testa.
 *
 * Den bärande regeln finns i `isPlottable`: en plats hamnar bara bland
 * punkterna om dess position är kontrollerad mot primärkälla. Allt annat
 * hamnar i `unverified` och redovisas som saknad position.
 */

import {
  isPlottable,
  venueLocationById,
  type Coordinate,
  type PlaceLocation,
} from './locations'

export interface MapPoint {
  id: string
  label: string
  coordinate: Coordinate
  /** 0–100 inom kartans viewBox. */
  x: number
  y: number
}

export interface UnverifiedPlace {
  id: string
  label: string
  address?: string
  confidence: PlaceLocation['confidence']
  note?: string
}

export interface MapView {
  points: MapPoint[]
  unverified: UnverifiedPlace[]
  /** Sant när ingenting går att rita ut. */
  empty: boolean
}

export interface MapPlaceInput {
  /** Venue-id eller hållplats-id. */
  id: string
  label: string
}

/**
 * Projicerar longitud/latitud till kartans kvadrat.
 *
 * En equirectangular-projektion med cosinuskorrektion räcker gott: hela cupen
 * ryms inom några få kilometer, där skillnaden mot en riktig projektion är
 * mindre än ritnoggrannheten. En enda punkt hamnar i mitten.
 */
export function project(coordinates: Coordinate[]): { x: number; y: number }[] {
  if (coordinates.length === 0) return []
  if (coordinates.length === 1) return [{ x: 50, y: 50 }]

  const latitudes = coordinates.map((c) => c.latitude)
  const longitudes = coordinates.map((c) => c.longitude)
  const midLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2
  const scale = Math.cos((midLatitude * Math.PI) / 180)

  const xs = longitudes.map((lon) => lon * scale)
  const ys = latitudes
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  const span = Math.max(spanX, spanY) || 1
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)

  // 10 % marginal så att punkter vid kanten inte klipps.
  return coordinates.map((_, index) => ({
    x: 10 + ((xs[index] - minX) / span) * 80,
    // Latitud växer norrut, y växer nedåt i SVG.
    y: 10 + (1 - (ys[index] - minY) / span) * 80,
  }))
}

/**
 * Bygg kartans innehåll för en uppsättning platser.
 *
 * @param places platser som gränssnittet vill visa
 * @param lookup positionsregistret, normalt `venueLocationById`
 */
export function buildMapView(
  places: MapPlaceInput[],
  lookup: Map<string, PlaceLocation> = venueLocationById,
): MapView {
  const plottable: { place: MapPlaceInput; location: PlaceLocation }[] = []
  const unverified: UnverifiedPlace[] = []

  for (const place of places) {
    const location = lookup.get(place.id)
    if (isPlottable(location) && location?.coordinate) {
      plottable.push({ place, location })
    } else {
      unverified.push({
        id: place.id,
        label: place.label,
        address: location?.address,
        confidence: location?.confidence ?? 'unknown',
        note: location?.note,
      })
    }
  }

  const projected = project(plottable.map((p) => p.location.coordinate as Coordinate))
  const points: MapPoint[] = plottable.map((entry, index) => ({
    id: entry.place.id,
    label: entry.place.label,
    coordinate: entry.location.coordinate as Coordinate,
    x: projected[index].x,
    y: projected[index].y,
  }))

  return { points, unverified, empty: points.length === 0 }
}

/**
 * Länk till användarens egen kartapp. `geo:`-URI:n hanteras av telefonen och
 * kräver varken nyckel eller extern tjänst från appens sida.
 */
export const geoLink = (coordinate: Coordinate): string =>
  `geo:${coordinate.latitude},${coordinate.longitude}`

import { MapErrorBoundary, MapPanel } from './MapPanel'
import type { MapPlaceInput } from './map-view'

/**
 * Kartans enda ingång utåt, som en default-export så att App kan ladda den
 * dynamiskt. Är feature-flaggan av importeras den här filen aldrig, och koden
 * hamnar i en egen chunk som webbläsaren inte hämtar.
 */
export default function MapSection({ places }: { places: MapPlaceInput[] }) {
  return (
    <MapErrorBoundary>
      <MapPanel places={places} />
    </MapErrorBoundary>
  )
}

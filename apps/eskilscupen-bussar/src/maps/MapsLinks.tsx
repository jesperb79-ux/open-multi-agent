import {
  APPROXIMATE_NOTICE,
  mapsLocationForStop,
  mapsLocationForVenue,
  needsApproximateNotice,
  type GoogleMapsLocation,
} from '../config/googleMapsLocations'
import { mapsEnabled } from './feature-flag'

const ENABLED = mapsEnabled()

interface Props {
  /** Hållplats-id eller venue-id. */
  id: string
  kind: 'stop' | 'venue'
  /** `navigate` visar vägbeskrivning först, `search` bara söklänken. */
  variant?: 'navigate' | 'search'
}

/**
 * Små länkar som öppnar platsen i Google Maps.
 *
 * Renderar ingenting när feature-flaggan är av, och ingenting när platsen
 * saknar en tillräckligt säker träff — obekräftade platser filtreras bort
 * redan i konfigurationen, så det blir hellre ingen knapp än en som pekar på
 * ortens mittpunkt.
 *
 * Appen hämtar aldrig något från Google. Den bygger bara adresser som
 * användaren själv klickar på.
 */
export function MapsLinks({ id, kind, variant = 'search' }: Props) {
  if (!ENABLED) return null

  const location: GoogleMapsLocation | undefined =
    kind === 'venue' ? mapsLocationForVenue(id) : mapsLocationForStop(id)
  if (!location) return null

  const approximate = needsApproximateNotice(location)

  return (
    <span className="maps-links">
      {variant === 'navigate' && (
        <a
          className="maps-link maps-link-primary"
          href={location.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Navigera hit
        </a>
      )}
      <a className="maps-link" href={location.showUrl} target="_blank" rel="noopener noreferrer">
        Visa i Google Maps
      </a>
      {approximate && <span className="maps-approximate">{APPROXIMATE_NOTICE}</span>}
    </span>
  )
}

/** Är länkarna påslagna? Används för att slippa rendera tomma rader. */
export const mapsLinksEnabled = ENABLED

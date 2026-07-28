import {
  mapsLocationForStop,
  mapsLocationForVenue,
  needsSignageNotice,
  SIGNAGE_NOTICE,
  type GoogleMapsLocation,
} from '../config/googleMapsLocations'
import { mapsEnabled } from './feature-flag'

const ENABLED = mapsEnabled()

interface Props {
  /** Hållplats-id eller venue-id. */
  id: string
  kind: 'stop' | 'venue'
}

/**
 * Liten länk som öppnar vägbeskrivning till platsen i Google Maps.
 *
 * Renderar ingenting när feature-flaggan är av, och ingenting när platsen
 * saknar ett belagt läge — obekräftade platser filtreras bort redan i
 * konfigurationen, så det blir hellre ingen knapp än en som leder fel.
 *
 * Appen hämtar aldrig något från Google och ber aldrig om användarens position.
 * Den bygger bara en adress som användaren själv klickar på; Google Maps utgår
 * sedan från telefonens egen position.
 */
export function MapsLinks({ id, kind }: Props) {
  if (!ENABLED) return null

  const location: GoogleMapsLocation | undefined =
    kind === 'venue' ? mapsLocationForVenue(id) : mapsLocationForStop(id)
  if (!location) return null

  return (
    <span className="maps-links">
      <a
        className="maps-link maps-link-primary"
        href={location.directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Navigera
      </a>
      {needsSignageNotice(location) && <span className="maps-approximate">{SIGNAGE_NOTICE}</span>}
    </span>
  )
}

/** Är länkarna påslagna? Används för att slippa rendera tomma rader. */
export const mapsLinksEnabled = ENABLED

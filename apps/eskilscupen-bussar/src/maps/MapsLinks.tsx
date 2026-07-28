import {
  needsSignageNotice,
  SIGNAGE_NOTICE,
  type GoogleMapsLocation,
} from '../config/googleMapsLocations'
import { mapsEnabled } from './feature-flag'

const ENABLED = mapsEnabled()

/**
 * Liten länk som öppnar vägbeskrivning till platsen i Google Maps.
 *
 * Vilka platser som får en länk avgörs av `journeyLinks`, som ser till att
 * samma navigeringsmål bara visas en gång per resealternativ. Här sitter
 * feature-flaggan: är den av renderas ingenting alls.
 *
 * Appen hämtar aldrig något från Google och ber aldrig om användarens position.
 * Den bygger bara en adress som användaren själv klickar på; Google Maps utgår
 * sedan från telefonens egen position.
 */
export function MapsLinks({ location }: { location?: GoogleMapsLocation }) {
  if (!ENABLED) return null
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

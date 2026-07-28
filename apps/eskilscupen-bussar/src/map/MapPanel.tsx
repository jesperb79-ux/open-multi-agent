import { Component, type ErrorInfo, type ReactNode } from 'react'
import { buildMapView, geoLink, type MapPlaceInput } from './map-view'

/**
 * Kartan får aldrig ta ned reseplaneraren. Kraschar den visas en rad text och
 * resten av sidan fungerar som vanligt.
 */
export class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kartan kunde inte visas:', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="map-note" role="status">
          Kartan kunde inte visas. Reseförslagen ovan fungerar som vanligt.
        </p>
      )
    }
    return this.props.children
  }
}

/**
 * Schematisk karta över de platser som har en kontrollerad position.
 *
 * Ritas som en egen SVG utan bakgrundsbrickor. Det är ett medvetet val: en
 * bakgrundskarta skulle kräva en extern karttjänst, och projektet ska varken
 * ha API-nycklar eller betaltjänster.
 */
export function MapPanel({ places }: { places: MapPlaceInput[] }) {
  const view = buildMapView(places)

  return (
    <section className="map-panel" aria-label="Karta">
      <h2 className="map-title">Karta</h2>

      {view.empty ? (
        <p className="map-note">
          Ingen av platserna i den här resan har en position som är kontrollerad mot cupens
          officiella uppgifter, så kartan visar ingenting utplacerat ännu.
        </p>
      ) : (
        <svg className="map-canvas" viewBox="0 0 100 100" role="img" aria-label="Karta över resans platser">
          {view.points.map((point) => (
            <g key={point.id}>
              <circle cx={point.x} cy={point.y} r="2.4" className="map-dot" />
              <text x={point.x} y={point.y - 4} className="map-label" textAnchor="middle">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      )}

      {view.points.length > 0 && (
        <ul className="map-list">
          {view.points.map((point) => (
            <li key={point.id}>
              <a href={geoLink(point.coordinate)}>{point.label}</a> — öppna i din kartapp
            </li>
          ))}
        </ul>
      )}

      {view.unverified.length > 0 && (
        <div className="map-unverified">
          <p>
            <strong>Position ej bekräftad</strong> — de här platserna placeras inte ut, eftersom
            uppgiften inte är kontrollerad mot cupens officiella spelplatslista.
          </p>
          <ul>
            {view.unverified.map((place) => (
              <li key={place.id}>
                {place.label}
                {place.address ? ` — uppgiven adress: ${place.address}` : ' — ingen adress känd'}
                {place.note ? ` (${place.note})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

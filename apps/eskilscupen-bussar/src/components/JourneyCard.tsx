import { useMemo, useState } from 'react'
import { routeName, stopName } from '../data/timetable'
import { journeyLinks, linkKey } from '../maps/journey-links'
import { MapsLinks } from '../maps/MapsLinks'
import { formatDuration } from '../planner/time'
import type { Journey } from '../types'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** "00:20" on the day after departure is shown as "00:20 +1". */
function timeWithDayMark(time: string, minutes: number, departureMinutes: number): string {
  const days = Math.floor(minutes / (24 * 60)) - Math.floor(departureMinutes / (24 * 60))
  return days > 0 ? `${time} +${days}` : time
}

export function JourneyCard({
  journey,
  index,
  destinationVenueId,
}: {
  journey: Journey
  index: number
  /** Spelplatsen resenären valt, när målet är en sådan. */
  destinationVenueId?: string
}) {
  // Hållplats under resan, spelplats först på slutet — och inga dubbletter.
  const links = useMemo(
    () => journeyLinks(journey, destinationVenueId),
    [journey, destinationVenueId],
  )
  const [expandedLegs, setExpandedLegs] = useState<number[]>([])
  const toggleLeg = (legIndex: number) =>
    setExpandedLegs((current) =>
      current.includes(legIndex) ? current.filter((i) => i !== legIndex) : [...current, legIndex],
    )

  return (
    <article className="journey" aria-label={`Resealternativ ${index + 1}`}>
      <header className="journey-head">
        <p className="journey-times">
          <span className="time">{journey.departureTime}</span>
          <span className="arrow" aria-hidden="true">
            →
          </span>
          <span className="time">
            {timeWithDayMark(journey.arrivalTime, journey.arrivalMinutes, journey.departureMinutes)}
          </span>
        </p>
        <p className="journey-summary">
          {formatDuration(journey.durationMinutes)}
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span className={journey.transfers === 0 ? 'badge badge-direct' : 'badge'}>
            {journey.transfers === 0 ? 'Inget byte' : plural(journey.transfers, 'byte', 'byten')}
          </span>
        </p>
      </header>

      <ol className="timeline">
        {journey.legs.map((leg, legIndex) => {
          const transfer = legIndex > 0 ? journey.transfersDetail[legIndex - 1] : null
          return (
            <li key={leg.tripId + leg.fromStop} className="leg">
              {transfer && (
                <p className="transfer">
                  <span className="transfer-icon" aria-hidden="true">
                    ⇄
                  </span>
                  Byte vid <strong>{stopName(transfer.stopId)}</strong> ·{' '}
                  {plural(transfer.waitMinutes, 'minut', 'minuter')} väntetid
                  <MapsLinks location={links.get(linkKey('transfer', transfer.stopId))} />
                </p>
              )}

              <p className="step step-board">
                <span className="step-time">{leg.departureTime}</span>
                <span className="step-body">
                  <span className="route">{routeName(leg.routeId)}</span> från{' '}
                  <strong>{stopName(leg.fromStop)}</strong>
                  {legIndex === 0 && <MapsLinks location={links.get(linkKey('start', leg.fromStop))} />}
                </span>
              </p>

              {leg.intermediateStops.length > 0 && (
                <p className="step step-via">
                  <span className="step-time" aria-hidden="true" />
                  <span className="step-body">
                    <button
                      type="button"
                      className="link"
                      aria-expanded={expandedLegs.includes(legIndex)}
                      onClick={() => toggleLeg(legIndex)}
                    >
                      {expandedLegs.includes(legIndex) ? 'Dölj' : 'Visa'}{' '}
                      {plural(leg.intermediateStops.length, 'hållplats', 'hållplatser')} på vägen
                    </button>
                    {expandedLegs.includes(legIndex) && (
                      <span className="via-list">{leg.intermediateStops.map(stopName).join(' · ')}</span>
                    )}
                  </span>
                </p>
              )}

              <p className="step step-alight">
                <span className="step-time">
                  {timeWithDayMark(leg.arrivalTime, leg.arrivalMinutes, journey.departureMinutes)}
                </span>
                <span className="step-body">
                  Ankomst <strong>{stopName(leg.toStop)}</strong>
                  {legIndex === journey.legs.length - 1 && (
                    <MapsLinks location={links.get(linkKey('destination', leg.toStop))} />
                  )}
                </span>
              </p>
            </li>
          )
        })}
      </ol>

      {/* Bussresan är slut — nu, och först nu, gäller spelplatsen. Raden
          visas bara när planen ligger någon annanstans än hållplatsen. */}
      {destinationVenueId && links.has(linkKey('venue', destinationVenueId)) && (
        <p className="final-walk">
          <span className="final-walk-icon" aria-hidden="true">
            ⇥
          </span>
          Sista biten till fots till{' '}
          <strong>{links.get(linkKey('venue', destinationVenueId))!.label}</strong>
          <MapsLinks location={links.get(linkKey('venue', destinationVenueId))} />
        </p>
      )}
    </article>
  )
}

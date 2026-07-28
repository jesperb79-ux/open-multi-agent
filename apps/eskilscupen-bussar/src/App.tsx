import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { currentDate, currentTime } from './clock'
import { JourneyCard } from './components/JourneyCard'
import { PlaceSelect } from './components/PlaceSelect'
import {
  browserStorage,
  favoriteFor,
  loadFavorites,
  saveFavorites,
  toggleFavorite,
  type FavoriteSlot,
} from './favorites'
import { shareApp } from './share'
import {
  defaultTournamentDate,
  isAfterTournament,
  tournamentDateByValue,
  tournamentDateLabel,
  tournamentDates,
  TOURNAMENT_YEAR,
} from './config/tournament'
import { connections, servicesServingStop, isStopServed, timetable, validateData } from './data/timetable'
import { journeyKey } from './journey-key'
import { mapsEnabled } from './map/feature-flag'
import { placeByKey, venuesWithoutStop } from './places'
import { DEFAULT_MINIMUM_TRANSFER_MINUTES, findJourneys } from './planner/findJourneys'
import { tryParseTime } from './planner/time'
import { PlannerError, type Journey } from './types'

/** Etikett för trafikdygnet ur den importerade tidtabellen, t.ex. "Fredag & lördag". */
const serviceLabel = (serviceId: string) =>
  timetable.services.find((service) => service.id === serviceId)?.label ?? serviceId

/** "venue:harlyckan-ip@elinebergsplatsen" -> "harlyckan-ip"; "stop:raa-ip" -> "raa-ip". */
const venueIdOf = (placeKey: string): string =>
  placeKey.startsWith('venue:') ? placeKey.slice('venue:'.length).split('@')[0] : placeKey.slice('stop:'.length)

type Result =
  | { kind: 'idle' }
  | { kind: 'journeys'; journeys: Journey[] }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string }

const storage = browserStorage()

/**
 * Kartan laddas bara när VITE_ENABLE_MAPS är true. Är flaggan av importeras
 * kartmodulerna aldrig, så webbläsaren hämtar inte en byte av dem och appen
 * beter sig exakt som utan kartfunktionen.
 */
const MapSection = mapsEnabled() ? lazy(() => import('./map/MapSection')) : null

export default function App() {
  // Favoriterna läses en gång och avgör vad som är förvalt vid start.
  const [favorites, setFavorites] = useState(() =>
    loadFavorites(storage, (placeKey) => placeByKey.has(placeKey)),
  )
  const [origin, setOrigin] = useState(() => favoriteFor(favorites, 'origin'))
  const [destination, setDestination] = useState(() => favoriteFor(favorites, 'destination'))
  const [date, setDate] = useState<string>(() => defaultTournamentDate(currentDate()).date)
  const [time, setTime] = useState(currentTime)
  const [minimumTransferMinutes, setMinimumTransferMinutes] = useState(DEFAULT_MINIMUM_TRANSFER_MINUTES)
  const [result, setResult] = useState<Result>({ kind: 'idle' })
  // Räknas upp vid varje sökning så att resekorten byts ut helt.
  const [searchId, setSearchId] = useState(0)
  const [shareMessage, setShareMessage] = useState('')

  const dataProblems = useMemo(validateData, [])
  const tournamentOver = useMemo(() => isAfterTournament(currentDate()), [])
  const tournamentDay = tournamentDateByValue.get(date) ?? tournamentDates[0]
  const originPlace = placeByKey.get(origin)
  const destinationPlace = placeByKey.get(destination)
  const unresolvedNotes = [
    ...new Set([originPlace?.unresolved, destinationPlace?.unresolved].filter(Boolean) as string[]),
  ]

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
    setResult({ kind: 'idle' })
  }

  /** Slår på eller av favoriten och skriver till localStorage direkt. */
  const toggleFavoritePlace = (slot: FavoriteSlot, placeKey: string) => {
    const next = toggleFavorite(favorites, slot, placeKey)
    setFavorites(next)
    saveFavorites(storage, next)
  }

  const share = async () => {
    const outcome = await shareApp(window.location.href, window.navigator)
    setShareMessage(outcome.kind === 'copied' || outcome.kind === 'failed' ? outcome.message : '')
  }

  // Meddelandet efter en kopierad länk är kort och försvinner av sig självt.
  useEffect(() => {
    if (!shareMessage) return undefined
    const timer = window.setTimeout(() => setShareMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [shareMessage])

  const search = (event: React.FormEvent) => {
    event.preventDefault()

    if (!originPlace || !destinationPlace) {
      setResult({ kind: 'error', message: 'Välj både startplats och destination.' })
      return
    }
    if (originPlace.stopId === destinationPlace.stopId) {
      setResult({
        kind: 'error',
        message:
          originPlace.key === destinationPlace.key
            ? 'Start och destination är samma plats. Välj två olika platser.'
            : `${originPlace.label} och ${destinationPlace.label} har samma hållplats — ingen buss behövs.`,
      })
      return
    }
    if (tryParseTime(time) === null) {
      setResult({ kind: 'error', message: `Ogiltig tid: "${time}". Ange tiden som HH:MM.` })
      return
    }

    // Fem hållplatser trafikeras bara på söndagen. Säg det med platsens namn
    // i stället för att låta planeraren svara med ett internt hållplats-id.
    for (const place of [originPlace, destinationPlace]) {
      if (isStopServed(place.stopId, tournamentDay.timetableType)) continue
      const otherDays = servicesServingStop(place.stopId)
      setResult({
        kind: 'empty',
        message: otherDays.length
          ? `${place.label} trafikeras inte ${tournamentDateLabel(tournamentDay).toLowerCase()}. ` +
            `Cupbussarna kör dit ${otherDays.map((s) => s.label.toLowerCase()).join(' och ')}.`
          : `${place.label} trafikeras inte av cupbussarna.`,
      })
      return
    }
    try {
      const journeys = findJourneys({
        connections,
        originStop: originPlace.stopId,
        destinationStop: destinationPlace.stopId,
        earliestDeparture: time,
        minimumTransferMinutes,
        serviceId: tournamentDay.timetableType,
        maxTransfers: 3,
        maxResults: 3,
      })

      if (journeys.length === 0) {
        setResult({
          kind: 'empty',
          message:
            `Ingen resa hittades från ${originPlace.label} till ${destinationPlace.label} ` +
            `efter ${time} ${tournamentDateLabel(tournamentDay).toLowerCase()}. Prova en tidigare tid, ` +
            'en annan cupdag ' +
            'eller en längre tillåten restid.',
        })
        return
      }
      setSearchId((current) => current + 1)
      setResult({ kind: 'journeys', journeys })
    } catch (error) {
      const message =
        error instanceof PlannerError
          ? error.message
          : 'Något gick fel när resan skulle beräknas. Ladda om sidan och försök igen.'
      setResult({ kind: 'error', message })
    }
  }

  if (dataProblems.length > 0) {
    return (
      <main className="app">
        <h1>Eskilscupen – bussresor</h1>
        <div className="notice notice-error" role="alert">
          <p>Tidtabellsdata saknas eller kunde inte läsas:</p>
          <ul>
            {dataProblems.map((problem) => (
              <li key={problem.code + problem.message}>{problem.message}</li>
            ))}
          </ul>
        </div>
      </main>
    )
  }

  return (
    <main className="app">
      <header className="app-head">
        <h1>Eskilscupen – bussresor</h1>
        <p className="lead">Hitta rätt cupbuss mellan planerna i Helsingborg.</p>
      </header>

      {tournamentOver && (
        <div className="notice notice-warning" role="status">
          Eskilscupen {TOURNAMENT_YEAR} är avslutad. Tidtabellen visas fortfarande för cupens tre
          dagar — välj en av dem och tryck på ”Sök resa”.
        </div>
      )}

      {venuesWithoutStop.length > 0 && (
        <div className="notice notice-warning" role="status">
          Följande planer saknar hållplats i tidtabellen:{' '}
          {venuesWithoutStop.map((venue) => venue.name).join(', ')}.
        </div>
      )}

      <form className="search" onSubmit={search}>
        <PlaceSelect
          id="origin"
          label="Från"
          value={origin}
          onChange={setOrigin}
          favorite={{
            isFavorite: Boolean(origin) && favorites.origin === origin,
            onToggle: () => toggleFavoritePlace('origin', origin),
          }}
        />

        <button type="button" className="swap" onClick={swap} aria-label="Byt plats på start och destination">
          <span aria-hidden="true">⇅</span> Byt håll
        </button>

        <PlaceSelect
          id="destination"
          label="Till"
          value={destination}
          onChange={setDestination}
          favorite={{
            isFavorite: Boolean(destination) && favorites.destination === destination,
            onToggle: () => toggleFavoritePlace('destination', destination),
          }}
        />

        {/* Egen rad vardera: "Söndag 2 augusti 2026" ryms inte i ett halvbrett
            fält på 375–430 px och skulle klippas av. */}
        <div className="field">
          <label htmlFor="date">Cupdag {TOURNAMENT_YEAR}</label>
          <select id="date" value={date} onChange={(event) => setDate(event.target.value)}>
            {tournamentDates.map((day) => (
              <option key={day.date} value={day.date}>
                {tournamentDateLabel(day)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="time">Tidigast avgång</label>
          <div className="time-row">
            <input id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            {/* type="button" — knappen fyller bara i tiden, den söker inte. */}
            <button type="button" className="now" onClick={() => setTime(currentTime())}>
              Nu
            </button>
          </div>
        </div>

        <p className="service-note">
          {tournamentDateLabel(tournamentDay)} · Trafikdygn: {serviceLabel(tournamentDay.timetableType)}
        </p>

        <details className="settings">
          <summary>Inställningar</summary>
          <div className="field">
            <label htmlFor="transfer">Minsta bytestid: {minimumTransferMinutes} min</label>
            <input
              id="transfer"
              type="range"
              min={0}
              max={20}
              step={1}
              value={minimumTransferMinutes}
              onChange={(event) => setMinimumTransferMinutes(Number(event.target.value))}
            />
          </div>
        </details>

        <button type="submit" className="primary">
          Sök resa
        </button>
      </form>

      <section className="results" aria-live="polite">
        {result.kind === 'error' && (
          <div className="notice notice-error" role="alert">
            {result.message}
          </div>
        )}
        {result.kind === 'empty' && <div className="notice notice-warning">{result.message}</div>}
        {result.kind === 'journeys' && (
          <>
            {unresolvedNotes.length > 0 && (
              <div className="notice notice-warning" role="status">
                <p>
                  <strong>Osäker hållplats</strong>
                </p>
                {unresolvedNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            )}
            {(originPlace?.note || destinationPlace?.note) && (
              <p className="venue-note">
                {originPlace?.note && `Start: ${originPlace.note}. `}
                {destinationPlace?.note && `Mål: ${destinationPlace.note}.`}
              </p>
            )}
            {result.journeys.map((journey, index) => (
              <JourneyCard key={journeyKey(searchId, index, journey)} journey={journey} index={index} />
            ))}
            {MapSection && originPlace && destinationPlace && (
              <Suspense fallback={null}>
                <MapSection
                  places={[
                    { id: venueIdOf(originPlace.key), label: originPlace.label },
                    { id: venueIdOf(destinationPlace.key), label: destinationPlace.label },
                  ]}
                />
              </Suspense>
            )}
          </>
        )}
      </section>

      <div className="share-row">
        <button type="button" className="share" onClick={share}>
          <span aria-hidden="true">↗</span> Dela
        </button>
        <span className="share-message" role="status">
          {shareMessage}
        </span>
      </div>

      <footer className="app-foot">
        <p className="disclaimer">
          Reseplaneraren bygger på Eskilscupens publicerade busstidtabell. Kontrollera alltid
          skyltning och information från cuporganisationen vid förändringar.
        </p>
        <p>
          Tidtabell: {timetable.trips.length} turer på {timetable.routes.length} linjer, inläst från{' '}
          {timetable.source.file}. Endast avgångar ur cupens officiella tidtabell visas.
        </p>
      </footer>
    </main>
  )
}

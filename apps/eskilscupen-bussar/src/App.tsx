import { useMemo, useState } from 'react'
import { JourneyCard } from './components/JourneyCard'
import { PlaceSelect } from './components/PlaceSelect'
import {
  defaultTournamentDate,
  isAfterTournament,
  tournamentDateByValue,
  tournamentDateLabel,
  tournamentDates,
  TOURNAMENT_YEAR,
} from './config/tournament'
import { connections, timetable, validateData } from './data/timetable'
import { placeByKey, venuesWithoutStop } from './places'
import { DEFAULT_MINIMUM_TRANSFER_MINUTES, findJourneys } from './planner/findJourneys'
import { tryParseTime } from './planner/time'
import { PlannerError, type Journey } from './types'

const pad = (value: number) => String(value).padStart(2, '0')
const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
const nowTime = () => {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Etikett för trafikdygnet ur den importerade tidtabellen, t.ex. "Fredag & lördag". */
const serviceLabel = (serviceId: string) =>
  timetable.services.find((service) => service.id === serviceId)?.label ?? serviceId

type Result =
  | { kind: 'idle' }
  | { kind: 'journeys'; journeys: Journey[] }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string }

export default function App() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState<string>(() => defaultTournamentDate(todayIso()).date)
  const [time, setTime] = useState(nowTime)
  const [minimumTransferMinutes, setMinimumTransferMinutes] = useState(DEFAULT_MINIMUM_TRANSFER_MINUTES)
  const [result, setResult] = useState<Result>({ kind: 'idle' })

  const dataProblems = useMemo(validateData, [])
  const tournamentOver = useMemo(() => isAfterTournament(todayIso()), [])
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
        <PlaceSelect id="origin" label="Från" value={origin} onChange={setOrigin} />

        <button type="button" className="swap" onClick={swap} aria-label="Byt plats på start och destination">
          <span aria-hidden="true">⇅</span> Byt håll
        </button>

        <PlaceSelect id="destination" label="Till" value={destination} onChange={setDestination} />

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
          <input id="time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
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
              <JourneyCard key={`${journey.departureTime}-${journey.legs[0].tripId}`} journey={journey} index={index} />
            ))}
          </>
        )}
      </section>

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

import { describe, expect, it } from 'vitest'
import {
  defaultTournamentDate,
  isAfterTournament,
  tournamentDateByValue,
  tournamentDateLabel,
  tournamentDates,
} from '../src/config/tournament'
import { timetable } from '../src/data/timetable'

describe('cupdatum', () => {
  it('har exakt cupens tre dagar', () => {
    expect(tournamentDates.map((day) => day.date)).toEqual(['2026-07-31', '2026-08-01', '2026-08-02'])
  })

  it('kopplar fredag och lördag till fre-lor och söndag till sondag', () => {
    expect(tournamentDateByValue.get('2026-07-31')?.timetableType).toBe('fre-lor')
    expect(tournamentDateByValue.get('2026-08-01')?.timetableType).toBe('fre-lor')
    expect(tournamentDateByValue.get('2026-08-02')?.timetableType).toBe('sondag')
  })

  it('pekar bara på trafikdygn som finns i tidtabellen', () => {
    const serviceIds = new Set(timetable.services.map((service) => service.id))
    for (const day of tournamentDates) {
      expect(serviceIds.has(day.timetableType)).toBe(true)
      expect(timetable.trips.some((trip) => trip.serviceId === day.timetableType)).toBe(true)
    }
  })

  it('visar årtalet i etiketten', () => {
    expect(tournamentDates.map(tournamentDateLabel)).toEqual([
      'Fredag 31 juli 2026',
      'Lördag 1 augusti 2026',
      'Söndag 2 augusti 2026',
    ])
  })
})

describe('defaultTournamentDate', () => {
  it('väljer första dagen långt före cupen', () => {
    expect(defaultTournamentDate('2026-01-15').date).toBe('2026-07-31')
    expect(defaultTournamentDate('2026-07-30').date).toBe('2026-07-31')
  })

  it('väljer dagens datum när cupen pågår', () => {
    expect(defaultTournamentDate('2026-07-31').date).toBe('2026-07-31')
    expect(defaultTournamentDate('2026-08-01').date).toBe('2026-08-01')
    expect(defaultTournamentDate('2026-08-02').date).toBe('2026-08-02')
  })

  it('faller tillbaka på fredagen efter cupens slut', () => {
    expect(defaultTournamentDate('2026-08-03').date).toBe('2026-07-31')
    expect(defaultTournamentDate('2027-05-01').date).toBe('2026-07-31')
  })

  it('vet när cupen är avslutad', () => {
    expect(isAfterTournament('2026-08-02')).toBe(false)
    expect(isAfterTournament('2026-08-03')).toBe(true)
    expect(isAfterTournament('2026-06-01')).toBe(false)
  })
})

/**
 * Cupens verifierade trafikdatum.
 *
 * PDF:en innehåller inga kalenderdatum — den skiljer bara på trafikdygnen
 * "fredag & lördag" och "söndag". Kopplingen datum → tidtabell hör därför hemma
 * här, inte i den importerade tidtabellsdatan. Inför nästa års cup är det den
 * här listan som byts ut.
 */

export const TOURNAMENT_YEAR = 2026

export const tournamentDates = [
  {
    date: '2026-07-31',
    timetableType: 'fre-lor',
    label: 'Fredag 31 juli',
  },
  {
    date: '2026-08-01',
    timetableType: 'fre-lor',
    label: 'Lördag 1 augusti',
  },
  {
    date: '2026-08-02',
    timetableType: 'sondag',
    label: 'Söndag 2 augusti',
  },
] as const

export type TournamentDate = (typeof tournamentDates)[number]

/** Etikett med årtal, så att "Fredag 31 juli" inte kan förväxlas med ett annat år. */
export const tournamentDateLabel = (day: TournamentDate): string =>
  `${day.label} ${TOURNAMENT_YEAR}`

export const tournamentDateByValue = new Map<string, TournamentDate>(
  tournamentDates.map((day) => [day.date, day]),
)

/**
 * Vilken cupdag som ska vara förvald.
 *
 * Före eller under cupen: närmast kommande cupdag. Efter cupens sista dag:
 * första dagen — appen söker aldrig av sig själv, så inget resultat visas
 * förrän användaren trycker på "Sök resa".
 *
 * @param today dagens datum som `YYYY-MM-DD`
 */
export function defaultTournamentDate(today: string): TournamentDate {
  return tournamentDates.find((day) => day.date >= today) ?? tournamentDates[0]
}

/** Sant när cupen redan är avslutad, så gränssnittet kan säga det rakt ut. */
export const isAfterTournament = (today: string): boolean =>
  today > tournamentDates[tournamentDates.length - 1].date

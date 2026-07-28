import { PlannerError } from '../types'

const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

export const MINUTES_PER_DAY = 24 * 60

/**
 * Parse `HH:MM` (or `HH:MM:SS`) into minutes past midnight.
 * Hours above 23 are allowed and mean "next day" — `24:10` is 1450.
 *
 * @throws {PlannerError} with code `invalid-time-format`
 */
export function parseTime(value: string): number {
  const match = TIME_RE.exec(value.trim())
  if (!match) {
    throw new PlannerError('invalid-time-format', `Ogiltigt tidsformat: "${value}". Använd HH:MM.`)
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] === undefined ? 0 : Number(match[3])
  if (hours > 47 || minutes > 59 || seconds > 59) {
    throw new PlannerError('invalid-time-format', `Ogiltig tid: "${value}".`)
  }
  return hours * 60 + minutes
}

/** Same as {@link parseTime} but returns `null` instead of throwing. */
export function tryParseTime(value: string): number | null {
  try {
    return parseTime(value)
  } catch {
    return null
  }
}

/** 1450 -> "00:10". Times past midnight wrap around the clock. */
export function formatTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** How many days past the search day a time falls on. */
export function dayOffset(totalMinutes: number): number {
  return Math.floor(totalMinutes / MINUTES_PER_DAY)
}

/** "32 min" / "1 h 12 min" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

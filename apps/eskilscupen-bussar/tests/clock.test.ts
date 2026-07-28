import { describe, expect, it } from 'vitest'
import { currentDate, currentTime } from '../src/clock'

/** Klockan bakom "Nu"-knappen och det förvalda datumet. */
describe('currentTime', () => {
  it('ger lokal tid som HH:MM', () => {
    // new Date(år, månad, dag, timme, minut) tolkas i lokal tid.
    expect(currentTime(new Date(2026, 6, 31, 13, 47))).toBe('13:47')
  })

  it('nollutfyller timmar och minuter', () => {
    expect(currentTime(new Date(2026, 6, 31, 6, 5))).toBe('06:05')
    expect(currentTime(new Date(2026, 6, 31, 0, 0))).toBe('00:00')
    expect(currentTime(new Date(2026, 6, 31, 9, 0))).toBe('09:00')
  })

  it('använder 24-timmarsklocka', () => {
    expect(currentTime(new Date(2026, 6, 31, 23, 59))).toBe('23:59')
    expect(currentTime(new Date(2026, 6, 31, 18, 30))).toBe('18:30')
  })

  it('följer lokal tid, inte UTC', () => {
    // Ett klockslag som hamnar på ett annat datum i UTC ska ändå ge lokal tid.
    const local = new Date(2026, 6, 31, 1, 15)
    expect(currentTime(local)).toBe('01:15')
    expect(currentTime(local)).toBe(
      `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`,
    )
  })

  it('ger ett värde som <input type="time"> accepterar', () => {
    expect(currentTime()).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
  })
})

describe('currentDate', () => {
  it('ger lokalt datum som YYYY-MM-DD', () => {
    expect(currentDate(new Date(2026, 6, 31, 13, 47))).toBe('2026-07-31')
    expect(currentDate(new Date(2026, 7, 1, 0, 30))).toBe('2026-08-01')
    expect(currentDate(new Date(2026, 0, 9, 23, 59))).toBe('2026-01-09')
  })

  it('ger ett värde som går att jämföra med cupdatumen', () => {
    expect(currentDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

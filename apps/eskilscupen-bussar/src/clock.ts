/** Lokal tid i de format formulärets fält använder. */

const pad = (value: number) => String(value).padStart(2, '0')

/** Aktuell lokal tid som `HH:MM` — samma format som `<input type="time">`. */
export const currentTime = (now: Date = new Date()): string =>
  `${pad(now.getHours())}:${pad(now.getMinutes())}`

/** Aktuellt lokalt datum som `YYYY-MM-DD`. */
export const currentDate = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

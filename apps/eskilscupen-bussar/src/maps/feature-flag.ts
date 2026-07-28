/**
 * Feature flag för Google Maps-länkarna.
 *
 * Avstängd om inte `VITE_ENABLE_MAPS` uttryckligen är satt till `true`. Allt
 * annat — tomt, `false`, felstavat, saknad variabel — betyder av, så att en
 * felaktig miljövariabel aldrig kan slå på funktionen av misstag.
 */

/** Tolkar värdet av miljövariabeln. Exporterad för att kunna testas. */
export const parseMapsFlag = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().toLowerCase() === 'true'

/** Är länkarna påslagna? Läses en gång vid start. */
export const mapsEnabled = (): boolean => parseMapsFlag(import.meta.env.VITE_ENABLE_MAPS)

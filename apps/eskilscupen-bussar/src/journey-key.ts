import type { Journey } from './types'

/**
 * React-nyckel för ett resekort.
 *
 * Nyckeln måste vara unik inom listan. Det räcker inte med avgångstid och
 * första turens `tripId`: två alternativ startar ofta med samma buss — det ena
 * sitter kvar, det andra byter till en snabbare anslutning — och får då
 * identiska nycklar. React kan inte matcha om en lista med dubbletter, och kort
 * från den förra sökningen blir kvar på skärmen.
 *
 * `searchId` räknas upp vid varje sökning så att korten byts ut helt i stället
 * för att återanvändas mellan två olika sökningar.
 */
export const journeyKey = (searchId: number, index: number, journey: Journey): string =>
  `${searchId}:${index}:${journey.departureTime}-${journey.arrivalTime}`

/** Alla nycklar för en resultatlista — används av testerna. */
export const journeyKeys = (journeys: Journey[], searchId = 0): string[] =>
  journeys.map((journey, index) => journeyKey(searchId, index, journey))

/**
 * Dela appen: Web Share API när webbläsaren har det, annars urklipp.
 *
 * Logiken ligger här i stället för i komponenten så att den går att testa utan
 * webbläsare — anroparen skickar in det `navigator`-liknande objektet.
 */

export const SHARE_TITLE = 'Eskilscupen – Bussresor'
export const SHARE_TEXT = 'Hitta snabbaste bussresan mellan Eskilscupens spelplatser.'
export const COPIED_MESSAGE = 'Länken har kopierats.'
export const COPY_FAILED_MESSAGE = 'Kunde inte kopiera länken. Kopiera adressen från webbläsarens adressfält.'

export interface ShareData {
  title: string
  text: string
  url: string
}

/** Den delmängd av `navigator` som delningen använder. */
export interface ShareTarget {
  share?: (data: ShareData) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export type ShareOutcome =
  | { kind: 'shared' }
  /** Användaren stängde delningsdialogen — inget att säga till om. */
  | { kind: 'dismissed' }
  | { kind: 'copied'; message: string }
  | { kind: 'failed'; message: string }

export const shareData = (url: string): ShareData => ({
  title: SHARE_TITLE,
  text: SHARE_TEXT,
  url,
})

/**
 * Dela den aktuella adressen.
 *
 * Web Share API används när det finns. Faller webbläsaren tillbaka på urklipp
 * visas ett kort meddelande. En avbruten delning (användaren stängde dialogen)
 * räknas inte som ett fel och leder inte till att länken kopieras.
 */
export async function shareApp(url: string, navigator: ShareTarget | undefined): Promise<ShareOutcome> {
  const data = shareData(url)

  if (navigator?.share) {
    try {
      await navigator.share(data)
      return { kind: 'shared' }
    } catch (error) {
      // AbortError = användaren stängde dialogen. Allt annat betyder att
      // delningen inte gick att genomföra, och då försöker vi med urklipp.
      if (error instanceof Error && error.name === 'AbortError') return { kind: 'dismissed' }
    }
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url)
      return { kind: 'copied', message: COPIED_MESSAGE }
    } catch {
      return { kind: 'failed', message: COPY_FAILED_MESSAGE }
    }
  }

  return { kind: 'failed', message: COPY_FAILED_MESSAGE }
}

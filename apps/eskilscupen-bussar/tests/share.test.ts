import { describe, expect, it, vi } from 'vitest'
import {
  COPIED_MESSAGE,
  COPY_FAILED_MESSAGE,
  shareApp,
  shareData,
  SHARE_TEXT,
  SHARE_TITLE,
  type ShareData,
  type ShareTarget,
} from '../src/share'

const URL = 'https://eskilscupen-bussar.example/'

const abortError = () => {
  const error = new Error('Share canceled')
  error.name = 'AbortError'
  return error
}

describe('innehållet som delas', () => {
  it('har titel, text och den aktuella adressen', () => {
    expect(shareData(URL)).toEqual({
      title: 'Eskilscupen – Bussresor',
      text: 'Hitta snabbaste bussresan mellan Eskilscupens spelplatser.',
      url: URL,
    })
    expect(SHARE_TITLE).toBe('Eskilscupen – Bussresor')
    expect(SHARE_TEXT).toBe('Hitta snabbaste bussresan mellan Eskilscupens spelplatser.')
  })
})

describe('Web Share API', () => {
  it('används när webbläsaren stöder det', async () => {
    const shared: ShareData[] = []
    const navigator: ShareTarget = {
      share: async (data) => {
        shared.push(data)
      },
      clipboard: { writeText: vi.fn() },
    }

    expect(await shareApp(URL, navigator)).toEqual({ kind: 'shared' })
    expect(shared).toEqual([{ title: SHARE_TITLE, text: SHARE_TEXT, url: URL }])
    // Urklipp ska inte användas när delningen lyckades.
    expect(navigator.clipboard?.writeText).not.toHaveBeenCalled()
  })

  it('kopierar inte länken när användaren stänger delningsdialogen', async () => {
    const writeText = vi.fn()
    const navigator: ShareTarget = {
      share: async () => {
        throw abortError()
      },
      clipboard: { writeText },
    }

    expect(await shareApp(URL, navigator)).toEqual({ kind: 'dismissed' })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('faller tillbaka på urklipp när delningen misslyckas av annan orsak', async () => {
    const writeText = vi.fn(async () => {})
    const navigator: ShareTarget = {
      share: async () => {
        throw new Error('NotAllowedError')
      },
      clipboard: { writeText },
    }

    expect(await shareApp(URL, navigator)).toEqual({ kind: 'copied', message: COPIED_MESSAGE })
    expect(writeText).toHaveBeenCalledWith(URL)
  })
})

describe('fallback till urklipp', () => {
  it('kopierar länken och meddelar det när Web Share saknas', async () => {
    const copied: string[] = []
    const navigator: ShareTarget = {
      clipboard: {
        writeText: async (text) => {
          copied.push(text)
        },
      },
    }

    expect(await shareApp(URL, navigator)).toEqual({ kind: 'copied', message: COPIED_MESSAGE })
    expect(copied).toEqual([URL])
    expect(COPIED_MESSAGE).toBe('Länken har kopierats.')
  })

  it('säger till när urklipp nekas', async () => {
    const navigator: ShareTarget = {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError')
        },
      },
    }

    expect(await shareApp(URL, navigator)).toEqual({ kind: 'failed', message: COPY_FAILED_MESSAGE })
  })

  it('säger till när varken delning eller urklipp finns', async () => {
    expect(await shareApp(URL, {})).toEqual({ kind: 'failed', message: COPY_FAILED_MESSAGE })
    expect(await shareApp(URL, undefined)).toEqual({ kind: 'failed', message: COPY_FAILED_MESSAGE })
  })
})

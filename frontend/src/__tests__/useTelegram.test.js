import { describe, it, expect, beforeEach } from 'vitest'
import { useTelegram } from '../hooks/useTelegram.js'

beforeEach(() => {
  delete window.Telegram
})

describe('useTelegram', () => {
  it('returns fallback user when window.Telegram is not defined', () => {
    const { user, tg } = useTelegram()
    expect(tg).toBeUndefined()
    expect(user.id).toBe(123456789)
    expect(user.first_name).toBe('Jose')
    expect(user.username).toBe('ezran_eng')
  })

  it('returns real user from initDataUnsafe when Telegram is present', () => {
    const telegramUser = {
      id: 987654321,
      first_name: 'Maria',
      last_name: 'Lopez',
      username: 'marialopez',
      photo_url: 'https://t.me/photo.jpg',
    }
    window.Telegram = {
      WebApp: {
        ready: () => {},
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        expand: () => {},
        requestFullscreen: () => {},
        initDataUnsafe: { user: telegramUser },
        initData: 'some-init-data',
      },
    }
    const { user, tg } = useTelegram()
    expect(tg).toBeDefined()
    expect(user.id).toBe(987654321)
    expect(user.first_name).toBe('Maria')
    expect(user.username).toBe('marialopez')
  })

  it('falls back to default user when initDataUnsafe.user is missing', () => {
    window.Telegram = {
      WebApp: {
        ready: () => {},
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        expand: () => {},
        initDataUnsafe: {},
        initData: '',
      },
    }
    const { user } = useTelegram()
    expect(user.id).toBe(123456789)
  })

  it('calls tg.ready() when Telegram WebApp exists', () => {
    let readyCalled = false
    window.Telegram = {
      WebApp: {
        ready: () => { readyCalled = true },
        setHeaderColor: () => {},
        setBackgroundColor: () => {},
        expand: () => {},
        initDataUnsafe: {},
        initData: '',
      },
    }
    useTelegram()
    expect(readyCalled).toBe(true)
  })

  it('does not throw when optional tg methods are missing', () => {
    window.Telegram = {
      WebApp: {
        ready: () => {},
        // setHeaderColor, setBackgroundColor, requestFullscreen deliberately missing
        expand: () => {},
        initDataUnsafe: {},
        initData: '',
      },
    }
    expect(() => useTelegram()).not.toThrow()
  })
})

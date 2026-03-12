import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTelegram } from '../hooks/useTelegram'

describe('useTelegram', () => {
  beforeEach(() => {
    delete window.Telegram
  })

  it('devuelve usuario fallback cuando no está en Telegram', () => {
    const { user, tg } = useTelegram()
    expect(tg).toBeUndefined()
    expect(user.id).toBe(123456789)
    expect(user.first_name).toBe('Dev')
  })

  it('devuelve el usuario real cuando está en Telegram', () => {
    window.Telegram = {
      WebApp: {
        ready: vi.fn(),
        expand: vi.fn(),
        setHeaderColor: vi.fn(),
        setBackgroundColor: vi.fn(),
        initDataUnsafe: {
          user: { id: 999, first_name: 'Jose', username: 'josez' },
        },
        initData: 'user=...&hash=abc',
      },
    }
    const { user } = useTelegram()
    expect(user.id).toBe(999)
    expect(user.first_name).toBe('Jose')
  })
})

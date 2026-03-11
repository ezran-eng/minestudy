import { describe, it, expect, vi, beforeEach } from 'vitest'
import api, {
  createOrUpdateUser,
  getUserProfile,
  getRanking,
  toggleSeguirMateria,
  getMateriasSeguidas,
  updateProgress,
  getProgresoUnidad,
} from '../services/api.js'

// Helper: build a successful fetch mock response
function mockFetch(data, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  // Reset window.Telegram so header helpers start clean
  delete window.Telegram
})

// ─── getInitDataHeader ────────────────────────────────────────────────────────

describe('getInitDataHeader (via api.get)', () => {
  it('sends X-Telegram-Init-Data when initData is present', async () => {
    window.Telegram = { WebApp: { initData: 'test-init-data' } }
    global.fetch = mockFetch({ data: [] })
    await api.get('/materias')
    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers['X-Telegram-Init-Data']).toBe('test-init-data')
  })

  it('omits X-Telegram-Init-Data when Telegram is not present', async () => {
    global.fetch = mockFetch({ data: [] })
    await api.get('/materias')
    const [, options] = global.fetch.mock.calls[0]
    expect(options.headers['X-Telegram-Init-Data']).toBeUndefined()
  })
})

// ─── api.get ──────────────────────────────────────────────────────────────────

describe('api.get', () => {
  it('returns { data } on success', async () => {
    global.fetch = mockFetch([{ id: 1, nombre: 'Geología' }])
    const result = await api.get('/materias')
    expect(result.data).toEqual([{ id: 1, nombre: 'Geología' }])
  })

  it('throws on non-ok response', async () => {
    global.fetch = mockFetch(null, false, 500)
    await expect(api.get('/materias')).rejects.toThrow('GET /materias failed')
  })

  it('calls the correct URL', async () => {
    global.fetch = mockFetch({})
    await api.get('/some/path')
    expect(global.fetch.mock.calls[0][0]).toBe('http://localhost:8000/some/path')
  })
})

// ─── api.post ─────────────────────────────────────────────────────────────────

describe('api.post', () => {
  it('sends POST with JSON body', async () => {
    global.fetch = mockFetch({ id: 1 })
    await api.post('/quiz/resultado', { id_usuario: 1, correctas: 3, total: 5 })
    const [, options] = global.fetch.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toMatchObject({ id_usuario: 1 })
  })

  it('throws on failure', async () => {
    global.fetch = mockFetch(null, false, 400)
    await expect(api.post('/quiz/resultado', {})).rejects.toThrow('POST /quiz/resultado failed')
  })
})

// ─── api.put ──────────────────────────────────────────────────────────────────

describe('api.put', () => {
  it('sends PUT with JSON body', async () => {
    global.fetch = mockFetch({ porcentaje: 80 })
    await api.put('/progreso', { id_usuario: 1, porcentaje: 80 })
    const [, options] = global.fetch.mock.calls[0]
    expect(options.method).toBe('PUT')
    expect(JSON.parse(options.body)).toMatchObject({ porcentaje: 80 })
  })
})

// ─── api.delete ───────────────────────────────────────────────────────────────

describe('api.delete', () => {
  it('sends DELETE request', async () => {
    global.fetch = mockFetch({})
    await api.delete('/admin/infografias/1')
    const [, options] = global.fetch.mock.calls[0]
    expect(options.method).toBe('DELETE')
  })
})

// ─── createOrUpdateUser ───────────────────────────────────────────────────────

describe('createOrUpdateUser', () => {
  it('posts user data and returns response', async () => {
    const userData = { id_telegram: 123, first_name: 'Jose' }
    global.fetch = mockFetch({ ...userData, racha: 0 })
    const result = await createOrUpdateUser(userData)
    expect(result.id_telegram).toBe(123)
  })

  it('throws when response is not ok', async () => {
    global.fetch = mockFetch(null, false, 400)
    await expect(createOrUpdateUser({})).rejects.toThrow('Failed to create or update user')
  })
})

// ─── getUserProfile ───────────────────────────────────────────────────────────

describe('getUserProfile', () => {
  it('fetches user by id_telegram', async () => {
    global.fetch = mockFetch({ id_telegram: 999, first_name: 'Ana' })
    const result = await getUserProfile(999)
    expect(result.first_name).toBe('Ana')
    expect(global.fetch.mock.calls[0][0]).toContain('/users/999')
  })

  it('throws on 404', async () => {
    global.fetch = mockFetch(null, false, 404)
    await expect(getUserProfile(999)).rejects.toThrow('Failed to get user profile')
  })
})

// ─── getRanking ───────────────────────────────────────────────────────────────

describe('getRanking', () => {
  it('returns ranking list', async () => {
    const data = [{ id_telegram: 1, first_name: 'Alice', total_progress: 80 }]
    global.fetch = mockFetch(data)
    const result = await getRanking()
    expect(result).toHaveLength(1)
    expect(result[0].first_name).toBe('Alice')
  })
})

// ─── toggleSeguirMateria ──────────────────────────────────────────────────────

describe('toggleSeguirMateria', () => {
  it('sends siguiendo=true when following', async () => {
    global.fetch = mockFetch({ siguiendo: true })
    await toggleSeguirMateria(5, 123, true)
    const [, options] = global.fetch.mock.calls[0]
    expect(JSON.parse(options.body)).toMatchObject({ id_usuario: 123, siguiendo: true })
  })

  it('sends siguiendo=false when unfollowing', async () => {
    global.fetch = mockFetch({ siguiendo: false })
    await toggleSeguirMateria(5, 123, false)
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.siguiendo).toBe(false)
  })

  it('omits siguiendo when undefined (legacy toggle)', async () => {
    global.fetch = mockFetch({ siguiendo: false })
    await toggleSeguirMateria(5, 123, undefined)
    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('siguiendo')
  })

  it('throws with detail when server returns error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ detail: 'Already following' }),
    })
    await expect(toggleSeguirMateria(5, 123, true)).rejects.toMatchObject({
      detail: 'Already following',
    })
  })
})

// ─── updateProgress ───────────────────────────────────────────────────────────

describe('updateProgress', () => {
  it('sends progress data and returns result', async () => {
    const payload = { id_usuario: 1, id_materia: 2, id_unidad: 3, porcentaje: 90 }
    global.fetch = mockFetch({ ...payload })
    const result = await updateProgress(payload)
    expect(result.porcentaje).toBe(90)
  })
})

// ─── getProgresoUnidad ────────────────────────────────────────────────────────

describe('getProgresoUnidad', () => {
  it('calls endpoint with correct query params', async () => {
    global.fetch = mockFetch({ porcentaje: 50 })
    await getProgresoUnidad(3, 100)
    const url = global.fetch.mock.calls[0][0]
    expect(url).toContain('/unidades/3/progreso')
    expect(url).toContain('id_usuario=100')
  })
})

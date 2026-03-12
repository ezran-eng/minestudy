import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOrUpdateUser } from '../services/api'
import api from '../services/api'

const mockFetch = (data, ok = true, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

beforeEach(() => {
  delete window.Telegram
  vi.clearAllMocks()
})

describe('createOrUpdateUser', () => {
  it('hace POST a /users con los datos correctos', async () => {
    mockFetch({ id_telegram: 123, first_name: 'Jose' })
    const result = await createOrUpdateUser({ id_telegram: 123, first_name: 'Jose' })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/users',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result.id_telegram).toBe(123)
  })

  it('lanza error si la respuesta no es ok', async () => {
    mockFetch({}, false, 500)
    await expect(createOrUpdateUser({ id_telegram: 1, first_name: 'X' }))
      .rejects.toThrow()
  })
})

describe('api genérico', () => {
  it('api.get hace GET al endpoint correcto', async () => {
    mockFetch([{ id: 1 }])
    const data = await api.get('/mis-items')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/mis-items',
      expect.objectContaining({ headers: expect.any(Object) }),
    )
    expect(data).toEqual([{ id: 1 }])
  })

  it('api.post hace POST con body JSON', async () => {
    mockFetch({ id: 2, nombre: 'Test' })
    const data = await api.post('/mis-items', { nombre: 'Test' })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/mis-items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ nombre: 'Test' }),
      }),
    )
    expect(data.id).toBe(2)
  })

  it('api.put hace PUT con body JSON', async () => {
    mockFetch({ id: 1, nombre: 'Actualizado' })
    await api.put('/mis-items/1', { nombre: 'Actualizado' })
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/mis-items/1',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('api.delete hace DELETE', async () => {
    mockFetch({})
    await api.delete('/mis-items/1')
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/mis-items/1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

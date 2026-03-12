const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const getInitDataHeader = () => {
  const initData = window.Telegram?.WebApp?.initData
  return initData ? { 'X-Telegram-Init-Data': initData } : {}
}

const getAdminHeader = () => {
  const secret = import.meta.env.VITE_ADMIN_SECRET
  return secret ? { 'X-Admin-Token': secret } : {}
}

// ─── Usuario ──────────────────────────────────────────────────────────────────
export const createOrUpdateUser = async (userData) => {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getInitDataHeader() },
    body: JSON.stringify(userData),
  })
  if (!res.ok) throw new Error('Error al sincronizar usuario')
  return res.json()
}

export const getUser = async (idTelegram) => {
  const res = await fetch(`${API_URL}/users/${idTelegram}`, {
    headers: { ...getInitDataHeader() },
  })
  if (!res.ok) throw new Error('Usuario no encontrado')
  return res.json()
}

// ─── Cliente genérico (usalo para tus propios endpoints) ─────────────────────
const api = {
  get: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: { ...getInitDataHeader(), ...getAdminHeader() },
    })
    if (!res.ok) throw new Error(`GET ${endpoint} falló con ${res.status}`)
    return res.json()
  },

  post: async (endpoint, payload) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getInitDataHeader(), ...getAdminHeader() },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`POST ${endpoint} falló con ${res.status}`)
    return res.json()
  },

  put: async (endpoint, payload) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getInitDataHeader(), ...getAdminHeader() },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`PUT ${endpoint} falló con ${res.status}`)
    return res.json()
  },

  delete: async (endpoint) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { ...getAdminHeader() },
    })
    if (!res.ok) throw new Error(`DELETE ${endpoint} falló con ${res.status}`)
    return {}
  },
}

export default api

// ─── Tus funciones acá ────────────────────────────────────────────────────────
// Ejemplo:
// export const getMisItems = () => api.get('/mis-items')
// export const createItem  = (data) => api.post('/mis-items', data)

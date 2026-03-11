import { vi } from 'vitest'

// Stub Vite env variables used by api.js
vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
vi.stubEnv('VITE_ADMIN_SECRET', '')

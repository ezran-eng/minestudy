import { vi } from 'vitest'
import '@testing-library/jest-dom'

vi.stubEnv('VITE_API_URL', 'http://localhost:8000')
vi.stubEnv('VITE_ADMIN_SECRET', '')
vi.stubEnv('VITE_SENTRY_DSN', '')

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import '@telegram-apps/telegram-ui/dist/styles.css'
import './index.css'
import App from './App.jsx'
import { AppRoot } from '@telegram-apps/telegram-ui'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoot appearance="dark">
      <App />
    </AppRoot>
  </StrictMode>,
)

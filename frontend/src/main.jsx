import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import '@telegram-apps/telegram-ui/dist/styles.css'
import './index.css'
import './i18n'
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
    <TonConnectUIProvider
      manifestUrl="https://minestudy.vercel.app/tonconnect-manifest.json"
      actionsConfiguration={{ twaReturnUrl: 'https://t.me/DaathApp_bot/app' }}
    >
      <AppRoot appearance="dark">
        <App />
      </AppRoot>
    </TonConnectUIProvider>
  </StrictMode>,
)

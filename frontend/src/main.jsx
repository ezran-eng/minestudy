import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@telegram-apps/telegram-ui/dist/styles.css'
import './index.css'
import App from './App.jsx'
import { AppRoot } from '@telegram-apps/telegram-ui'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppRoot appearance="dark">
      <App />
    </AppRoot>
  </StrictMode>,
)

import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ErrorBoundary from './components/ErrorBoundary'
import { useTelegram } from './hooks/useTelegram'
import { createOrUpdateUser } from './services/api'

// ─── Pantallas (lazy — se cargan solo cuando el usuario navega a ellas) ───────
const Home = lazy(() => import('./screens/Home'))
// Agregá tus pantallas acá:
// const MiPantalla = lazy(() => import('./screens/MiPantalla'))

// ─── React Query — configuración probada para Mini Apps de Telegram ───────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // en Telegram el foco cambia mucho — mejor desactivado
    },
  },
})

const App = () => {
  const { user, tg } = useTelegram()
  const [telegramChecked, setTelegramChecked] = useState(false)

  // Esperar 300ms antes de bloquear — Telegram inyecta initData de forma asíncrona
  // Sin este delay, el primer render muestra "solo en Telegram" aunque estés en Telegram
  useEffect(() => {
    const t = setTimeout(() => setTelegramChecked(true), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
    }
    if (user) {
      createOrUpdateUser({
        id_telegram: user.id,
        first_name:  user.first_name  || 'Usuario',
        last_name:   user.last_name   || null,
        username:    user.username    || null,
        foto_url:    user.photo_url   || null,
      }).catch(err => console.error('[App] error al sincronizar usuario:', err))
    }
  }, [user, tg])

  // Bloquear si definitivamente no estamos en Telegram (después del delay)
  if (telegramChecked && !window.Telegram?.WebApp?.initData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: '#0e0e0e',
        padding: '32px', textAlign: 'center', gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>🤖</div>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
          Solo disponible en Telegram
        </div>
        <div style={{ fontSize: '14px', color: '#aaa', maxWidth: '280px', lineHeight: 1.5 }}>
          Esta app solo funciona dentro de Telegram como Mini App.
        </div>
        {/* Cambiá esta URL por la de tu bot */}
        <a
          href="https://t.me/TU_BOT_AQUI"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '12px 28px', background: '#2AABEE', color: '#fff',
            borderRadius: '12px', fontWeight: 700, fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Abrir en Telegram
        </a>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ErrorBoundary>
          <Suspense fallback={
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100vh', background: 'var(--bg)',
            }}>
              <div style={{ color: 'var(--text2)', fontSize: '14px' }}>Cargando...</div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              {/* Agregá tus rutas acá: */}
              {/* <Route path="/mi-pantalla" element={<MiPantalla />} /> */}
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  )
}

export default App

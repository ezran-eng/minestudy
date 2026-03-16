import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/Toast';
import Mascota from './components/mascota';
import Timer from './components/Timer';
import PomodoroSugerencia from './components/PomodoroSugerencia';
import PomodoroFloating from './components/PomodoroFloating';
import { MascotaProvider } from './context/MascotaContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { useTelegram } from './hooks/useTelegram';
import { createOrUpdateUser, getPrivacidad } from './services/api';

const Home = lazy(() => import('./screens/Home'));
const Study = lazy(() => import('./screens/Study'));
const MateriaDetail = lazy(() => import('./screens/MateriaDetail'));
const UnidadDetail = lazy(() => import('./screens/UnidadDetail'));
const Profile = lazy(() => import('./screens/Profile'));
const UserProfile = lazy(() => import('./screens/UserProfile'));
const CinematicOnboarding = lazy(() => import('./components/Onboarding'));

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontFamily: "'Silkscreen', cursive" }}>...</div>
  </div>
);

const AppContent = ({ user }) => {
  const location = useLocation();
  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}><div style={{ color: 'var(--text2)', fontSize: '14px' }}>Cargando...</div></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/study" element={<Study />} />
            <Route path="/materia/:id" element={<MateriaDetail />} />
            <Route path="/materia/:id/unidad/:idx" element={<UnidadDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/perfil/:id" element={<UserProfile />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <BottomNav user={user} />
      {user?.id && <Mascota userId={user.id} />}
      <Timer />
      <PomodoroSugerencia />
      <PomodoroFloating />
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const { user, tg } = useTelegram();
  // null = loading, false = not done, true = done
  const [onboardingDone, setOnboardingDone] = useState(null);
  // Wait briefly for Telegram to inject initData before deciding we're outside Telegram
  const [telegramChecked, setTelegramChecked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTelegramChecked(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    if (user) {
      const initData = window.Telegram?.WebApp?.initData;
      console.log('[App] syncing user — id:', user.id, '| initData present:', !!initData);
      const userData = {
        id_telegram: user.id,
        first_name: user.first_name || 'Desconocido',
        last_name: user.last_name || null,
        username: user.username || null,
        foto_url: user.photo_url || null,
      };

      createOrUpdateUser(userData)
        .then(() => getPrivacidad(user.id))
        .then(data => setOnboardingDone(data.onboarding_completado))
        .catch(err => {
          console.error('[App] error during init:', err);
          setOnboardingDone(true); // don't block the user on error
        });
    }
  }, [user, tg]);

  // Block if not running inside Telegram (wait 300ms first to let Telegram inject initData)
  if (telegramChecked && !window.Telegram?.WebApp?.initData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0e0e0e', padding: '32px', textAlign: 'center', gap: '16px',
      }}>
        <div style={{ fontSize: '56px' }}>📚</div>
        <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>DaathApp</div>
        <div style={{ fontSize: '16px', color: '#aaa', lineHeight: 1.5, maxWidth: '280px' }}>
          DaathApp solo está disponible desde Telegram
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Abrí el bot @DaathApp_bot para acceder
        </div>
        <a
          href="https://t.me/DaathApp_bot"
          target="_blank"
          rel="noreferrer"
          style={{
            marginTop: '8px', padding: '12px 28px',
            background: '#2AABEE', color: '#fff',
            borderRadius: '12px', fontWeight: 700, fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Abrir en Telegram
        </a>
      </div>
    );
  }

  // No user from Telegram yet — just show the app normally
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <ToastProvider>
            <AppContent user={user} />
          </ToastProvider>
        </Router>
      </QueryClientProvider>
    );
  }

  // Waiting for onboarding check
  if (onboardingDone === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text2)', fontSize: '14px' }}>Cargando...</div>
      </div>
    );
  }

  // ── Cinematic onboarding ──────────────────────────────────────────────────
  // Show for: first-time users, OR returning users who haven't opted out
  const noMostrar = localStorage.getItem('onboarding_no_mostrar');
  if (!noMostrar) {
    return (
      <ErrorBoundary fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#000' }}>
          <button onClick={() => { localStorage.setItem('onboarding_no_mostrar', 'true'); localStorage.setItem('onboarding_completado', 'true'); window.location.reload(); }}
            style={{ padding: '14px 28px', borderRadius: '14px', background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', color: '#c4b5fd', fontFamily: "'Silkscreen', cursive", fontSize: '12px', cursor: 'pointer' }}>
            Saltar intro →
          </button>
        </div>
      }>
        <Suspense fallback={<Loading />}>
          <CinematicOnboarding
            user={user}
            onComplete={() => setOnboardingDone(true)}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ToastProvider>
          <PomodoroProvider>
            <MascotaProvider>
              <AppContent user={user} />
            </MascotaProvider>
          </PomodoroProvider>
        </ToastProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;

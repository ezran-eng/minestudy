import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Home from './screens/Home';
import Study from './screens/Study';
import MateriaDetail from './screens/MateriaDetail';
import UnidadDetail from './screens/UnidadDetail';
import Profile from './screens/Profile';
import UserProfile from './screens/UserProfile';
import Onboarding from './screens/Onboarding';
import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/Toast';

import { useTelegram } from './hooks/useTelegram';
import { createOrUpdateUser, getPrivacidad } from './services/api';

const AppContent = ({ user }) => {
  const location = useLocation();
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/study" element={<Study />} />
        <Route path="/materia/:id" element={<MateriaDetail />} />
        <Route path="/materia/:id/unidad/:idx" element={<UnidadDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/perfil/:id" element={<UserProfile />} />
      </Routes>
      <BottomNav user={user} />
    </>
  );
};

const App = () => {
  const { user, tg } = useTelegram();
  // null = loading, false = not done, true = done
  const [onboardingDone, setOnboardingDone] = useState(null);

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

  // No user from Telegram yet — just show the app normally
  if (!user) {
    return (
      <Router>
        <ToastProvider>
          <AppContent user={user} />
        </ToastProvider>
      </Router>
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

  // First time — show onboarding
  if (onboardingDone === false) {
    return (
      <Onboarding
        user={user}
        onComplete={() => setOnboardingDone(true)}
      />
    );
  }

  return (
    <Router>
      <ToastProvider>
        <AppContent user={user} />
      </ToastProvider>
    </Router>
  );
};

export default App;

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Home from './screens/Home';
import Study from './screens/Study';
import MateriaDetail from './screens/MateriaDetail';
import UnidadDetail from './screens/UnidadDetail';
import Profile from './screens/Profile';
import BottomNav from './components/BottomNav';

import { useTelegram } from './hooks/useTelegram';
import { createOrUpdateUser } from './services/api';

// A wrapper component to conditionally show the BottomNav
const AppContent = ({ user }) => {
  const location = useLocation();
  // Bottom nav is typically hidden in detailed screens (MateriaDetail, UnidadDetail) in mobile apps
  // But based on the HTML prototype, the bottom nav was a global fixed element at the bottom.
  // We'll show it everywhere or customize based on the path if needed.
  // The HTML shows screen bottom: 64px which accounts for the bottom nav.

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/study" element={<Study />} />
        <Route path="/materia/:id" element={<MateriaDetail />} />
        <Route path="/materia/:id/unidad/:idx" element={<UnidadDetail />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <BottomNav user={user} />
    </>
  );
};

const App = () => {
  const { user, tg } = useTelegram();

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }

    if (user) {
      const userData = {
        id_telegram: user.id,
        first_name: user.first_name || 'Desconocido',
        last_name: user.last_name || null,
        username: user.username || null,
        foto_url: user.photo_url || null,
      };

      createOrUpdateUser(userData)
        .then(data => console.log('User synced with backend:', data))
        .catch(err => console.error('Error syncing user:', err));
    }
  }, [user, tg]);

  return (
    <Router>
      <AppContent user={user} />
    </Router>
  );
};

export default App;

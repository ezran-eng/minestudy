import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import Home from './screens/Home';
import Study from './screens/Study';
import MateriaDetail from './screens/MateriaDetail';
import UnidadDetail from './screens/UnidadDetail';
import Profile from './screens/Profile';
import BottomNav from './components/BottomNav';

// A wrapper component to conditionally show the BottomNav
const AppContent = () => {
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
      <BottomNav />
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

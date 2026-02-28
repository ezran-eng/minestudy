import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon">🏠</div>
        <div className="nav-label">Inicio</div>
        <div className="nav-dot"></div>
      </Link>
      <Link to="/study" className={`nav-item ${location.pathname.startsWith('/study') || location.pathname.startsWith('/materia') ? 'active' : ''}`}>
        <div className="nav-icon">📖</div>
        <div className="nav-label">Study</div>
        <div className="nav-dot"></div>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <div className="nav-icon">👤</div>
        <div className="nav-label">Perfil</div>
        <div className="nav-dot"></div>
      </Link>
    </div>
  );
};

export default BottomNav;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const BottomNav = ({ user }) => {
  const location = useLocation();

  const initial = user?.first_name ? user.first_name[0].toUpperCase() : 'E';
  const photoUrl = user?.photo_url;

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon">🏠</div>
        <div className="nav-label">Inicio</div>
      </Link>
      <Link to="/study" className={`nav-item ${location.pathname.startsWith('/study') || location.pathname.startsWith('/materia') ? 'active' : ''}`}>
        <div className="nav-icon">📖</div>
        <div className="nav-label">Study</div>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <div className="nav-avatar">
          {photoUrl ? <img src={photoUrl} alt="Avatar" /> : initial}
        </div>

      </Link>
    </div>
  );
};

export default BottomNav;

import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserProfile } from '../services/api';

const BottomNav = () => {
  const location = useLocation();
  const { user } = useTelegram();
  const [backendUser, setBackendUser] = useState(null);

  useEffect(() => {
    if (user && user.id) {
      getUserProfile(user.id)
        .then(data => setBackendUser(data))
        .catch(err => console.error('Error fetching backend user for BottomNav:', err));
    }
  }, [user]);

  const displayUser = backendUser || user;
  const initial = displayUser?.first_name ? displayUser.first_name[0].toUpperCase() : 'E';
  const photoUrl = displayUser?.foto_url || user?.photo_url;

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
        <div className="nav-label">Perfil</div>
      </Link>
    </div>
  );
};

export default BottomNav;

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const EyeIcon = ({ active }) => (
  <svg width="20" height="14" viewBox="0 0 20 14" style={{ display: 'block' }}>
    <ellipse cx="10" cy="7" rx="9" ry="6" stroke={active ? '#fff' : '#555'} strokeWidth="1.5" fill="none"/>
    <circle cx="10" cy="7" r="3" fill={active ? '#fff' : '#555'}/>
  </svg>
);

const BottomNav = ({ user }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const initial = user?.first_name ? user.first_name[0].toUpperCase() : 'E';
  const photoUrl = user?.photo_url;
  const isZonaLibre = location.pathname === '/zona-libre';

  return (
    <div className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <div className="nav-icon">🏠</div>
        <div className="nav-label">{t('nav.home')}</div>
      </Link>
      <Link to="/study" className={`nav-item ${location.pathname.startsWith('/study') || location.pathname.startsWith('/materia') ? 'active' : ''}`}>
        <div className="nav-icon">📖</div>
        <div className="nav-label">{t('nav.study')}</div>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <div className="nav-avatar">
          {photoUrl ? <img src={photoUrl} alt="Avatar" /> : initial}
        </div>
      </Link>
      <Link to="/zona-libre" className={`nav-item ${isZonaLibre ? 'active' : ''}`}>
        <div className="nav-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EyeIcon active={isZonaLibre} />
        </div>
        <div className="nav-label" style={isZonaLibre ? { color: '#fff' } : undefined}>{t('nav.zonaLibre')}</div>
      </Link>
    </div>
  );
};

export default BottomNav;

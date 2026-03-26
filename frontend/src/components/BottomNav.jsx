import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const HomeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: active ? 'drop-shadow(0 0 6px rgba(255,255,240,0.4))' : 'none', transition: 'filter 0.3s' }}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V10.5z" stroke={active ? '#FFFFF0' : '#555'} strokeWidth="1.8" strokeLinejoin="round" fill={active ? 'rgba(255,255,240,0.1)' : 'none'}/>
  </svg>
);

const StudyIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: active ? 'drop-shadow(0 0 6px rgba(255,255,240,0.4))' : 'none', transition: 'filter 0.3s' }}>
    <path d="M4 19.5V4.5A1.5 1.5 0 015.5 3H20v15H5.5A1.5 1.5 0 004 19.5zm0 0A1.5 1.5 0 005.5 21H20" stroke={active ? '#FFFFF0' : '#555'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 7h6" stroke={active ? '#FFFFF0' : '#555'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const EyeIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ display: 'block', filter: active ? 'drop-shadow(0 0 6px rgba(255,255,240,0.4))' : 'none', transition: 'filter 0.3s' }}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke={active ? '#FFFFF0' : '#555'} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke={active ? '#FFFFF0' : '#555'} strokeWidth="1.8" fill={active ? 'rgba(255,255,240,0.15)' : 'none'}/>
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
        <div className="nav-icon"><HomeIcon active={location.pathname === '/'} /></div>
        <div className="nav-label">{t('nav.home')}</div>
      </Link>
      <Link to="/study" className={`nav-item ${location.pathname.startsWith('/study') || location.pathname.startsWith('/materia') ? 'active' : ''}`}>
        <div className="nav-icon"><StudyIcon active={location.pathname.startsWith('/study') || location.pathname.startsWith('/materia')} /></div>
        <div className="nav-label">{t('nav.study')}</div>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <div className="nav-avatar">
          {photoUrl ? <img src={photoUrl} alt="Avatar" /> : initial}
        </div>
      </Link>
      <Link to="/zona-libre" className={`nav-item ${isZonaLibre ? 'active' : ''}`}>
        <div className="nav-icon"><EyeIcon active={isZonaLibre} /></div>
        <div className="nav-label">{t('nav.zonaLibre')}</div>
      </Link>
    </div>
  );
};

export default BottomNav;

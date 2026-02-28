import React from 'react';

const Profile = () => {
  return (
    <div className="screen active" id="screen-profile">
      <div className="profile-header">
        <div className="profile-title">Mi Perfil</div>
      </div>
      <div className="profile-body">
        <div className="profile-avatar">⛏️</div>
        <div className="profile-name">Estudiante de Minería</div>
        <div className="profile-tag">UNSJ · Ingeniería de Minas · 3er año</div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-value">7</div><div className="stat-label">Racha</div></div>
          <div className="stat-card"><div className="stat-value">284</div><div className="stat-label">Sesiones</div></div>
          <div className="stat-card"><div className="stat-value">89%</div><div className="stat-label">Precisión</div></div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Configuración</div>
          <div className="profile-row">
            <div className="profile-row-label">🔔 Notificaciones</div>
            <div className="profile-row-val">Activas</div>
          </div>
          <div className="profile-row">
            <div className="profile-row-label">🌐 Idioma</div>
            <div className="profile-row-val">Español</div>
          </div>
          <div className="profile-row">
            <div className="profile-row-label">📤 Exportar progreso</div>
            <div className="profile-row-val">›</div>
          </div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Acerca de</div>
          <div className="profile-row">
            <div className="profile-row-label">⚡ MineStudy Hub</div>
            <div className="profile-row-val">v1.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

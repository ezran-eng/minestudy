import React, { useEffect, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getRanking, getUserProfile } from '../services/api';

const Profile = () => {
  const { user } = useTelegram();
  const [ranking, setRanking] = useState([]);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [backendUser, setBackendUser] = useState(null);

  useEffect(() => {
    if (user && user.id) {
      getUserProfile(user.id)
        .then(data => setBackendUser(data))
        .catch(err => console.error('Error fetching backend user:', err));
    }
  }, [user]);

  useEffect(() => {
    getRanking()
      .then(data => {
        setRanking(data);
        setLoadingRanking(false);
      })
      .catch(err => {
        console.error('Error fetching ranking:', err);
        setLoadingRanking(false);
      });
  }, []);

  // Use backend data if available, fallback to Telegram WebApp data, then default
  const displayUser = backendUser || user;
  const profileName = displayUser ? `${displayUser.first_name} ${displayUser.last_name || ''}`.trim() : 'Estudiante de Minería';
  const username = displayUser?.username ? `@${displayUser.username}` : 'Sin nombre de usuario';
  const photoUrl = backendUser ? backendUser.foto_url : user?.photo_url;

  return (
    <div className="screen active" id="screen-profile">
      <div className="profile-header">
        <div className="profile-title">Mi Perfil</div>
      </div>
      <div className="profile-body">
        <div className="profile-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
          ) : (
            '⛏️'
          )}
        </div>
        <div className="profile-name">{profileName}</div>
        <div className="profile-tag">{username}</div>

        <div className="stats-row">
          <div className="stat-card"><div className="stat-value">{backendUser?.racha || 0}</div><div className="stat-label">Racha</div></div>
          <div className="stat-card"><div className="stat-value">284</div><div className="stat-label">Sesiones</div></div>
          <div className="stat-card"><div className="stat-value">89%</div><div className="stat-label">Precisión</div></div>
        </div>

        <div className="profile-section">
          <div className="profile-section-title">Ranking Global (Progreso Promedio)</div>
          {loadingRanking ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>Cargando ranking...</div>
          ) : ranking.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center' }}>No hay datos de ranking.</div>
          ) : (
            ranking.map((rankUser, index) => (
              <div className="profile-row" key={rankUser.id_telegram}>
                <div className="profile-row-label">
                  <strong>#{index + 1}</strong> {rankUser.first_name} {rankUser.last_name || ''}
                </div>
                <div className="profile-row-val">{Number(rankUser.total_progress).toFixed(1)}%</div>
              </div>
            ))
          )}
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

import React, { useEffect, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { getRanking, getUserProfile } from '../services/api';
import { Section, Cell } from '@telegram-apps/telegram-ui';

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

  const displayUser = backendUser || user;
  const profileName = displayUser ? `${displayUser.first_name || ''} ${displayUser.last_name || ''}`.trim() : 'Estudiante de Minería';
  const username = displayUser?.username ? `@${displayUser.username}` : 'Sin nombre de usuario';
  const photoUrl = backendUser ? backendUser.foto_url : user?.photo_url;
  const racha = backendUser?.racha || 0;

  return (
    <div className="screen active screen-container" id="screen-profile">
      <div className="profile-body">
        <div className="profile-hero">
          <div className="profile-avatar-big">
            {photoUrl ? <img src={photoUrl} alt="Avatar" /> : '⛏️'}
          </div>
          <div className="profile-name">{profileName || 'Estudiante'}</div>
          <div className="profile-user">{username}</div>
        </div>

        <div className="stats-grid" style={{ marginBottom: '16px' }}>
          <div className="stat-card"><div className="stat-val">{racha}</div><div className="stat-lbl">Racha</div></div>
          <div className="stat-card"><div className="stat-val">284</div><div className="stat-lbl">Sesiones</div></div>
          <div className="stat-card"><div className="stat-val">89%</div><div className="stat-lbl">Precisión</div></div>
        </div>

        <div className="ranking-card">
          <div className="ranking-title">Ranking Global</div>
          {loadingRanking ? (
            <div className="ranking-empty">Cargando ranking...</div>
          ) : ranking.length === 0 ? (
            <div className="ranking-empty">No hay datos de ranking aún.</div>
          ) : (
            ranking.slice(0, 5).map((rankUser, index) => (
              <div className="ranking-item" key={rankUser.id_telegram || index}>
                <div className="rank-pos">#{index + 1}</div>
                <div className="rank-name">{rankUser.first_name} {rankUser.last_name || ''}</div>
                <div className="rank-score">{Number(rankUser.total_progress).toFixed(1)}%</div>
              </div>
            ))
          )}
        </div>

        <Section header="Configuración" style={{ marginBottom: '16px', borderRadius: 'var(--r2)', overflow: 'hidden' }}>
          <Cell before="🔔" after="Activas">Notificaciones</Cell>
          <Cell before="🌐" after="Español">Idioma</Cell>
          <Cell before="📤" after="›">Exportar progreso</Cell>
        </Section>

        <Section header="Acerca de" style={{ borderRadius: 'var(--r2)', overflow: 'hidden' }}>
          <Cell before="✦" after="v1.0">DaathApp</Cell>
        </Section>

      </div>
    </div>
  );
};

export default Profile;

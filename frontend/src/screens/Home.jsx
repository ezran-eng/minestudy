import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserProfile, getUserStats, getActividadReciente, getMateriasSeguidas } from '../services/api';

const TIPO_ICON = {
  quiz: '🎯',
  flashcard: '🃏',
  pdf: '📄',
  infografia: '🖼️',
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const [racha, setRacha] = useState(0);
  const [stats, setStats] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [sinMaterias, setSinMaterias] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id)
      .then(profile => { if (typeof profile.racha === 'number') setRacha(profile.racha); })
      .catch(err => console.error(err));
    getUserStats(user.id).then(setStats).catch(err => console.error(err));
    getActividadReciente(user.id).then(setActividad).catch(err => console.error(err));
    getMateriasSeguidas(user.id)
      .then(data => setSinMaterias(data.materia_ids.length === 0))
      .catch(() => {});
  }, [user?.id]);

  const firstName = user?.first_name || 'Estudiante';

  const handleContinuar = () => {
    if (stats?.foco) {
      navigate(`/materia/${stats.foco.materia_id}/unidad/${stats.foco.unidad_id}`);
    } else {
      navigate('/study');
    }
  };

  return (
    <div className="screen active screen-container" id="screen-home" style={{ paddingBottom: '8px' }}>
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="hero-greeting">Bienvenido de vuelta, <span style={{ color: 'var(--gold)' }}>{firstName}</span> 👋</div>
            <div className="hero-name">Listo para <span style={{ color: 'var(--gold)' }}>estudiar?</span></div>
          </div>
          <div className="streak-pill">🔥 {racha} {racha === 1 ? 'día' : 'días'}</div>
        </div>
      </div>

      {/* Tutorial para usuarios sin materias */}
      {sinMaterias && (
        <div style={{
          margin: '0 16px 16px',
          padding: '16px',
          background: 'var(--s2)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
            Para empezar a estudiar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>📚</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Andá a <strong>Study</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>🔍</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Buscá tu materia</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>➕</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>Tocá <strong>Seguir</strong> para desbloquear el contenido</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/study')}
            style={{
              width: '100%', padding: '10px',
              background: 'var(--gold)', color: '#000',
              borderRadius: '10px', border: 'none',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Ir a Study
          </button>
        </div>
      )}

      {!sinMaterias && <>
      {/* Foco del día */}
      <div className="focus-card">
        <div className="focus-inner">
          <div className="focus-tag">Foco del día</div>
          {stats === null ? (
            <div className="focus-title" style={{ opacity: 0.5 }}>Cargando...</div>
          ) : stats.foco ? (
            <>
              <div className="focus-title">{stats.foco.materia_nombre} — {stats.foco.unidad_nombre}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${stats.foco.porcentaje}%` }}></div>
              </div>
              <div className="progress-text">{stats.foco.porcentaje}% completado</div>
            </>
          ) : (
            <div className="focus-title" style={{ opacity: 0.7 }}>Todo al día — sin unidades pendientes 🎉</div>
          )}
          <button className="btn-continue" onClick={handleContinuar}>▶ Continuar estudio</button>
        </div>
      </div>

      {/* Tu Progreso */}
      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">Tu progreso</div></div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-val">{stats != null ? `${Math.round(stats.progreso_general)}%` : '—'}</div>
          <div className="stat-lbl">Progreso general</div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">Actividad reciente</div></div>
        {actividad.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: '14px', padding: '8px 0' }}>
            Sin actividad registrada aún
          </div>
        ) : (
          <div className="activity-list">
            {actividad.map((item, i) => (
              <div key={i} className="act-item">
                <div style={{ fontSize: '20px', flexShrink: 0 }}>{TIPO_ICON[item.tipo] || '📌'}</div>
                <div className="act-info">
                  <div className="act-text">{item.titulo}</div>
                  <div className="act-sub">{item.detalle} · {item.hace}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>}
    </div>
  );
};

export default Home;

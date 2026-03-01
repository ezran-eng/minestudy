import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserProfile } from '../services/api';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const [racha, setRacha] = useState(0);

  useEffect(() => {
    if (user && user.id) {
      getUserProfile(user.id)
        .then(profile => {
          if (profile && typeof profile.racha === 'number') {
            setRacha(profile.racha);
          }
        })
        .catch(err => console.error('Error fetching profile:', err));
    }
  }, [user]);

  const firstName = user?.first_name || 'Estudiante';

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

      <div className="focus-card">
        <div className="focus-inner">
          <div className="focus-tag">Foco del día</div>
          <div className="focus-title">Prácticas Profesionalizantes — Unidad 3: Seguridad Operacional</div>
          <div className="focus-chips">
            <div className="chip">📚 12 temas</div>
            <div className="chip">⏱ ~45 min</div>
            <div className="chip">🎯 Final libre</div>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: '38%' }}></div></div>
          <div className="progress-text">38% completado — 7 de 18 temas</div>
          <button className="btn-continue" onClick={() => navigate('/study')}>▶ Continuar estudio</button>
        </div>
      </div>

      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">Tu progreso</div></div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-val">142</div><div className="stat-lbl">Flashcards</div></div>
          <div className="stat-card"><div className="stat-val">89%</div><div className="stat-lbl">Precisión</div></div>
          <div className="stat-card"><div className="stat-val">6</div><div className="stat-lbl">Materias</div></div>
        </div>
      </div>

      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">Actividad reciente</div></div>
        <div className="activity-list">
          <div className="act-item">
            <div className="act-dot gold"></div>
            <div className="act-info"><div className="act-text">Quiz completado — Voladura</div><div className="act-sub">hace 2 horas · 15 preguntas</div></div>
            <div className="act-score">13/15</div>
          </div>
          <div className="act-item">
            <div className="act-dot green"></div>
            <div className="act-info"><div className="act-text">Flashcards repasadas</div><div className="act-sub">ayer · Mineralogía</div></div>
            <div className="act-score">24 🃏</div>
          </div>
          <div className="act-item">
            <div className="act-dot rust"></div>
            <div className="act-info"><div className="act-text">PDF cargado — Prác. Prof.</div><div className="act-sub">hace 3 días · 48 páginas</div></div>
            <div className="act-score">+36 temas</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

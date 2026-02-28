import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="screen active" id="screen-home">
      <div className="header">
        <div className="brand">
          <div className="brand-icon">⛏️</div>
          <div className="brand-name">Mine<span>Study</span></div>
        </div>
        <div className="streak">🔥 7 días</div>
      </div>
      <div className="pad">
        <div className="greeting">
          <div className="greeting-sub">Bienvenido de vuelta</div>
          <div className="greeting-name">Listo para <span>estudiar?</span></div>
        </div>

        <div className="daily-card">
          <div className="daily-label">Foco del día</div>
          <div className="daily-title">Prácticas Profesionalizantes — Unidad 3: Seguridad Operacional</div>
          <div className="daily-meta">
            <div className="daily-chip">📚 12 temas</div>
            <div className="daily-chip">⏱ ~45 min</div>
            <div className="daily-chip">🎯 Final libre</div>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar" style={{ width: '38%' }}></div>
          </div>
          <div className="progress-label">38% completado — 7 de 18 temas</div>
          <button className="btn-primary" onClick={() => navigate('/study')}>▶ Continuar estudio</button>
        </div>

        <div className="section-head">
          <div className="section-title">Tu progreso</div>
        </div>
        <div className="stats-row">
          <div className="stat-card"><div className="stat-value">142</div><div className="stat-label">Flashcards</div></div>
          <div className="stat-card"><div className="stat-value">89%</div><div className="stat-label">Precisión</div></div>
          <div className="stat-card"><div className="stat-value">6</div><div className="stat-label">Materias</div></div>
        </div>

        <div className="section-head" style={{ marginTop: '4px' }}>
          <div className="section-title">Actividad reciente</div>
        </div>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-dot gold"></div>
            <div className="activity-info">
              <div className="activity-text">Quiz completado — Voladura</div>
              <div className="activity-sub">hace 2 horas · 15 preguntas</div>
            </div>
            <div className="activity-score">13/15</div>
          </div>
          <div className="activity-item">
            <div className="activity-dot green"></div>
            <div className="activity-info">
              <div className="activity-text">Flashcards repasadas</div>
              <div className="activity-sub">ayer · Mineralogía</div>
            </div>
            <div className="activity-score">24 🃏</div>
          </div>
          <div className="activity-item">
            <div className="activity-dot rust"></div>
            <div className="activity-info">
              <div className="activity-text">PDF cargado — Prác. Prof.</div>
              <div className="activity-sub">hace 3 días · 48 páginas</div>
            </div>
            <div className="activity-score">+36 temas</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { useMateriasSeguidas, useUserStats, useActividadReciente, useUserPerfil, useMascotaHint, useCommunityCounter } from '../hooks/useQueryHooks';
import { useMascotaUpdate } from '../context/MascotaContext';

const TIPO_ICON = {
  quiz: '🎯',
  flashcard: '🃏',
  pdf: '📄',
  infografia: '🖼️',
};

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
}

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useTelegram();

  const { data: perfilData } = useUserPerfil(user?.id);
  const { data: stats } = useUserStats(user?.id);
  const { data: actividad = [] } = useActividadReciente(user?.id);
  const { data: seguidasRes } = useMateriasSeguidas(user?.id);

  const { data: hint } = useMascotaHint(user?.id);
  const { data: community } = useCommunityCounter();
  const updateMascota = useMascotaUpdate();

  const racha = perfilData?.racha ?? 0;
  const sinMaterias = seguidasRes ? seguidasRes.materia_ids.length === 0 : false;

  useEffect(() => {
    if (!updateMascota) return;
    const datos = {
      racha,
      flashcards_vencidas: hint?.flashcards_due ?? 0,
      progreso_general: Math.round(stats?.progreso_general ?? 0),
    };
    updateMascota({ pantalla: 'home', datos });
    window.dispatchEvent(new CustomEvent('mascota:event', {
      detail: { accion: 'enter', pantalla: 'home', datos },
    }));
  }, [racha, hint?.flashcards_due, stats?.progreso_general]); // eslint-disable-line

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
            <div className="hero-greeting">{t('home.welcomeBack')} <span style={{ color: 'var(--gold)' }}>{firstName}</span> 👋</div>
            <div className="hero-name"><Trans i18nKey="home.readyToStudy" components={{ 1: <span style={{ color: 'var(--gold)' }} /> }} /></div>
          </div>
          <div className="streak-pill">🔥 {t('home.streak', { count: racha })}</div>
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
            {t('home.getStarted')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>📚</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}><Trans i18nKey="home.goToStudy" components={{ 1: <strong /> }} /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>🔍</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{t('home.searchSubject')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>➕</span>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}><Trans i18nKey="home.tapFollow" components={{ 1: <strong /> }} /></span>
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
            {t('home.goStudy')}
          </button>
        </div>
      )}

      {!sinMaterias && <>
      {/* Foco del día */}
      <div className="focus-card">
        <div className="focus-inner">
          <div className="focus-tag">{t('home.focusOfDay')}</div>
          {!stats ? (
            <div className="focus-title" style={{ opacity: 0.5 }}>{t('home.loading')}</div>
          ) : stats.foco ? (
            <>
              <div className="focus-title">{stats.foco.materia_nombre} — {stats.foco.unidad_nombre}</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${stats.foco.porcentaje}%` }}></div>
              </div>
              <div className="progress-text">{t('home.completed', { n: stats.foco.porcentaje })}</div>
            </>
          ) : (
            <div className="focus-title" style={{ opacity: 0.7 }}>{t('home.allCaughtUp')}</div>
          )}
          <button className="btn-continue" onClick={handleContinuar}>{t('home.continueStudy')}</button>
        </div>
      </div>

      {/* Tu Progreso */}
      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">{t('home.yourProgress')}</div></div>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <div className="stat-val">{stats != null ? `${Math.round(stats.progreso_general)}%` : '—'}</div>
          <div className="stat-lbl">{t('home.generalProgress')}</div>
        </div>
      </div>

      {/* Community Counter — nuevos usuarios en Telegram */}
      {community && community.total > 0 && (
        <div className="community-counter">
          <div className="community-counter-inner">
            <div className="community-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="var(--gold)"/>
              </svg>
            </div>
            <div className="community-big-number">
              <AnimatedNumber value={community.total} />
            </div>
            <div className="community-label">{t('home.communityTotal')}</div>
            <div className="community-pills">
              {community.new_this_week > 0 && (
                <span className="community-pill">+{community.new_this_week} {t('home.communityWeek')}</span>
              )}
              {community.new_today > 0 && (
                <span className="community-pill community-pill--hot">+{community.new_today} {t('home.communityToday')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actividad Reciente */}
      <div className="section" style={{ padding: '0 16px', marginBottom: '16px' }}>
        <div className="section-head"><div className="section-title">{t('home.recentActivity')}</div></div>
        {actividad.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: '14px', padding: '8px 0' }}>
            {t('home.noActivity')}
          </div>
        ) : (
          <div className="activity-list">
            {actividad.map((item, i) => {
              const isNavigable = item.materia_id && item.unidad_id;
              return (
                <div
                  key={i}
                  className="act-item"
                  onClick={isNavigable ? () => navigate(`/materia/${item.materia_id}/unidad/${item.unidad_id}`) : undefined}
                  style={isNavigable ? { cursor: 'pointer' } : undefined}
                >
                  <div style={{ fontSize: '20px', flexShrink: 0 }}>{TIPO_ICON[item.tipo] || '📌'}</div>
                  <div className="act-info">
                    <div className="act-text">{item.titulo}</div>
                    <div className="act-sub">{item.detalle} · {item.hace}</div>
                  </div>
                  {isNavigable && <div style={{ fontSize: '16px', color: 'var(--text2)', flexShrink: 0 }}>›</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>}
    </div>
  );
};

export default Home;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { toggleSeguirMateria, deleteProgresoMateria, createOrUpdateUser, getProgresoUnidad, updateMateria } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useMaterias, useVistasMateria, useSeguidoresMateria, useInvalidate } from '../hooks/useQueryHooks';
import VistaBadge from '../components/VistaBadge';
import ConfirmModal from '../components/ConfirmModal';

// ─── Avatar stack shown in header ─────────────────────────────────────────────
const MAX_AVATARS = 4;

const AvatarStack = ({ seguidores, total, onClick }) => {
  const { t } = useTranslation();
  if (total === 0) return null;
  const shown = seguidores.slice(0, MAX_AVATARS);
  const extra = total - MAX_AVATARS;
  const circleStyle = {
    width: 28, height: 28, borderRadius: '50%',
    border: '2px solid var(--bg)', overflow: 'hidden',
    background: 'var(--s3)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px',
  };
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
    >
      {shown.map((s, i) => (
        <div key={s.id_telegram} style={{ ...circleStyle, marginLeft: i === 0 ? 0 : -8, zIndex: MAX_AVATARS - i }}>
          {s.foto_url
            ? <img src={s.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👤'}
        </div>
      ))}
      {extra > 0 && (
        <div style={{ ...circleStyle, marginLeft: -8, background: 'var(--s3)', fontSize: '10px', color: 'var(--text2)', fontWeight: 700 }}>
          +{extra}
        </div>
      )}
      <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text2)' }}>
        {t('materia.follower', { count: total })}
      </span>
    </div>
  );
};

// ─── Seguidores modal ─────────────────────────────────────────────────────────
const SeguidoresModal = ({ seguidores, onClose, onClickUser }) => {
  const { t } = useTranslation();
  return (
  <div className="overlay show" id="seg-overlay" onClick={e => { if (e.target.id === 'seg-overlay') onClose(); }}>
    <div className="sheet">
      <div className="sheet-handle" />
      <div className="sheet-title">{t('materia.followers')}</div>
      {seguidores.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px 0' }}>{t('materia.noFollowers')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {seguidores.map(s => (
            <div
              key={s.id_telegram}
              onClick={() => onClickUser(s.id_telegram)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 4px', cursor: 'pointer', borderRadius: '8px',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--s3)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>
                {s.foto_url
                  ? <img src={s.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '👤'}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{s.first_name}</span>
              <span style={{ fontSize: '16px', color: 'var(--text2)' }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useTelegram();
  const { t } = useTranslation();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  // Cached queries
  const { data: allMaterias } = useMaterias(user?.id);
  const { data: vistasRes } = useVistasMateria(parseInt(id));
  const { data: seguidoresRes } = useSeguidoresMateria(parseInt(id));

  // Prefer fresh data from cache; fall back to location.state while loading
  const materia = allMaterias?.find(m => m.id === parseInt(id)) || location.state?.materia || null;
  const vistasMateria = vistasRes?.total ?? null;
  const seguidores = seguidoresRes?.seguidores || [];
  const totalSeguidores = seguidoresRes?.total_seguidores || 0;

  const [siguiendo, setSiguiendo] = useState(location.state?.materia?.siguiendo ?? location.state?.siguiendo ?? false);
  const [esPublica, setEsPublica] = useState(location.state?.materia?.es_publica ?? true);
  const [unidadProgresos, setUnidadProgresos] = useState({});
  const [showSeguidores, setShowSeguidores] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);

  // Sync siguiendo from seguidores data
  useEffect(() => {
    if (seguidoresRes && user?.id) {
      setSiguiendo(seguidoresRes.seguidores.some(s => s.id_telegram === user.id));
    }
  }, [seguidoresRes, user?.id]);

  // Sync esPublica from fresh cache data
  useEffect(() => {
    if (materia?.es_publica !== undefined) setEsPublica(materia.es_publica);
  }, [materia?.es_publica]);

  // Fetch progreso per unit
  useEffect(() => {
    if (!materia || !user?.id) return;
    Promise.all(
      materia.unidades.map(async (u) => {
        try {
          const res = await getProgresoUnidad(u.id, user.id);
          return [u.id, res.porcentaje_total ?? 0];
        } catch { return [u.id, 0]; }
      })
    ).then(entries => setUnidadProgresos(Object.fromEntries(entries)));
  }, [materia, user?.id]);

  const handleLockedClick = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setShowToast(true);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 2500);
  };

  const handleToggleSeguir = () => {
    if (!user?.id) return;
    if (siguiendo) {
      setShowUnfollowConfirm(true);
    } else {
      doFollow();
    }
  };

  const doFollow = async () => {
    const prev = siguiendo;
    setSiguiendo(true);
    try {
      try {
        await toggleSeguirMateria(materia.id, user.id, true);
      } catch (err) {
        if (err.detail === 'user_not_registered') {
          await createOrUpdateUser({
            id_telegram: user.id,
            first_name: user.first_name || 'Desconocido',
            last_name: user.last_name || null,
            username: user.username || null,
            foto_url: user.photo_url || null,
          });
          await toggleSeguirMateria(materia.id, user.id, true);
        } else {
          throw err;
        }
      }
      invalidate.seguidas(user.id);
      invalidate.seguidores(materia.id);
    } catch {
      setSiguiendo(prev);
    }
  };

  const doUnfollow = async () => {
    setShowUnfollowConfirm(false);
    const prev = siguiendo;
    setSiguiendo(false);
    try {
      await deleteProgresoMateria(user.id, materia.id);
      await toggleSeguirMateria(materia.id, user.id, false);
      setUnidadProgresos({});
      invalidate.seguidas(user.id);
      invalidate.seguidores(materia.id);
      invalidate.allProgreso();
    } catch {
      setSiguiendo(prev);
    }
  };

  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>{t('materia.loadingSubject')}</div>;

  const isOwner = user?.id && String(materia.creador_id) === String(user.id);

  const handleToggleVisibility = async () => {
    const next = !esPublica;
    setEsPublica(next); // optimistic
    try {
      await updateMateria(materia.id, { es_publica: next });
      queryClient.invalidateQueries({ queryKey: ['materias'] });
    } catch {
      setEsPublica(!next); // revert on error
    }
  };

  const totalUnits = materia.unidades.length;
  let overallPct = 0;
  if (totalUnits > 0) {
    const sum = materia.unidades.reduce((acc, u) => acc + (unidadProgresos[u.id] ?? 0), 0);
    overallPct = Math.round(sum / totalUnits);
  }

  return (
    <>
      <div className="screen active screen-container" id="screen-materia">
        <div className="fab-back-btn">
          <div className="btn-back" onClick={() => navigate('/study')}>‹</div>
        </div>
        <div className="detail-body detail-body-pad">

          <div className="detail-prog">
            <div className="detail-prog-top">
              <span className="detail-prog-label">{t('materia.generalProgress')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="detail-prog-pct">{overallPct}%</span>
                {siguiendo && user?.id && (
                  <button
                    onClick={handleToggleSeguir}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      border: '1px solid var(--gold)',
                      background: 'rgba(255,255,240,0.15)',
                      color: 'var(--gold)',
                      cursor: 'pointer',
                    }}
                  >
                    {t('materia.following')}
                  </button>
                )}
              </div>
            </div>
            <div className="detail-bar-wrap">
              <div className="detail-bar" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${materia.color || 'var(--gold)'}, var(--gold2))` }}></div>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {vistasMateria !== null && <VistaBadge vistas={vistasMateria} />}
              <AvatarStack seguidores={seguidores} total={totalSeguidores} onClick={() => setShowSeguidores(true)} />
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {materia.creador_nombre && (
                <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                  {t('materia.createdBy', { name: materia.creador_nombre })}
                </span>
              )}
              {isOwner && (
                <button
                  onClick={handleToggleVisibility}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: `1px solid ${esPublica ? 'rgba(255,255,240,0.3)' : 'rgba(255,255,240,0.15)'}`,
                    background: esPublica ? 'rgba(255,255,240,0.12)' : 'rgba(255,255,240,0.05)',
                    color: esPublica ? 'var(--text)' : 'var(--text2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.2s',
                  }}
                >
                  {esPublica ? '👁' : '🔒'} {esPublica ? t('materia.public') : t('materia.private')}
                </button>
              )}
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: '10px' }}>
            <div className="section-title">{t('materia.syllabus')}</div>
          </div>

          {!siguiendo && (
            <div style={{
              background: 'rgba(255,255,240,0.08)', border: '1px solid rgba(255,255,240,0.3)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.4 }}>
                🔒 {t('materia.followToUnlock')}
              </span>
              {user?.id && (
                <button
                  onClick={handleToggleSeguir}
                  style={{
                    flexShrink: 0, padding: '7px 14px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 700,
                    background: 'var(--gold)', border: 'none', color: '#000', cursor: 'pointer',
                  }}
                >
                  {t('materia.follow')}
                </button>
              )}
            </div>
          )}

          <div className="unidades-list">
            {materia.unidades.map((u) => {
              const userPct = Math.round(unidadProgresos[u.id] ?? 0);
              let statusClass = 'pend';
              if (userPct === 100) statusClass = 'done';
              else if (userPct > 0) statusClass = 'cur';
              const badgeText = userPct === 100 ? t('materia.complete') : `${userPct}%`;
              const displayTemas = u.temas.slice(0, 3);
              const hasMore = u.temas.length > 3;

              const cardContent = (
                <>
                  <div className="pu-left">
                    <div className="pu-name" style={{ marginBottom: '0' }}>{u.nombre}</div>
                    <div className="pu-topics-chips">
                      {displayTemas.map((t) => (
                        <span key={t.id} className="topic-chip">{t.nombre}</span>
                      ))}
                      {hasMore && <span className="topic-chip">...</span>}
                      {u.flashcard_count > 0 && (
                        <span className="topic-chip" style={{ background: 'var(--gold)', color: '#000' }}>
                          {t('materia.cards', { n: u.flashcard_count })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`pu-badge ${siguiendo ? statusClass : 'pend'}`}>
                    {siguiendo ? badgeText : '🔒'}
                  </span>
                </>
              );

              if (!siguiendo) {
                return (
                  <div
                    key={u.id}
                    className="unit-item pend"
                    onClick={handleLockedClick}
                    style={{ cursor: 'pointer', opacity: 0.75 }}
                  >
                    {cardContent}
                  </div>
                );
              }

              return (
                <Link
                  to={`/materia/${id}/unidad/${u.id}`}
                  state={{ unidad: u, materia, unitProgress: userPct }}
                  key={u.id}
                  className={`unit-item ${statusClass}`}
                  style={{ textDecoration: 'none', color: 'inherit', WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {cardContent}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {showSeguidores && (
        <SeguidoresModal
          seguidores={seguidores}
          onClose={() => setShowSeguidores(false)}
          onClickUser={(uid) => { setShowSeguidores(false); navigate(`/perfil/${uid}`); }}
        />
      )}

      {showUnfollowConfirm && (
        <ConfirmModal
          title={t('study.unfollowTitle')}
          message={t('study.unfollowMessage')}
          confirmLabel={t('study.unfollowConfirm')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={doUnfollow}
          onCancel={() => setShowUnfollowConfirm(false)}
        />
      )}

      {showToast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '10px 18px',
          fontSize: '13px', color: 'var(--text)', fontWeight: 500,
          zIndex: 100, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {t('materia.followToAccess')}
        </div>
      )}
    </>
  );
};

export default MateriaDetail;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { toggleSeguirMateria, deleteProgresoMateria, createOrUpdateUser, getProgresoUnidad, updateMateria, deleteMateria, createUnidad, updateUnidad, deleteUnidad } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useMaterias, useVistasMateria, useSeguidoresMateria, useInvalidate } from '../hooks/useQueryHooks';
import VistaBadge from '../components/VistaBadge';
import ConfirmModal from '../components/ConfirmModal';

// ─── Help bubble component ──────────────────────────────────────────────────
const HelpBubble = ({ message }) => (
  <div style={{
    background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '12px 16px', marginBottom: '12px',
    position: 'relative', fontSize: '13px', color: 'var(--text2)',
    lineHeight: 1.5,
  }}>
    <div style={{
      position: 'absolute', top: '-6px', left: '24px',
      width: '12px', height: '12px', background: 'var(--s2)',
      border: '1px solid var(--border)', borderRight: 'none', borderBottom: 'none',
      transform: 'rotate(45deg)',
    }} />
    {message}
  </div>
);

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

  // Unit CRUD state
  const [showCreateUnidad, setShowCreateUnidad] = useState(false);
  const [newUnidadNombre, setNewUnidadNombre] = useState('');
  const [creatingUnidad, setCreatingUnidad] = useState(false);
  const [editingUnidadId, setEditingUnidadId] = useState(null);
  const [editingUnidadNombre, setEditingUnidadNombre] = useState('');
  const [deleteUnidadId, setDeleteUnidadId] = useState(null);
  const [showDeleteMateriaConfirm, setShowDeleteMateriaConfirm] = useState(false);

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

  // ─── Unit CRUD handlers ───────────────────────────────────────────────
  const handleCreateUnidad = async () => {
    if (!newUnidadNombre.trim() || creatingUnidad) return;
    setCreatingUnidad(true);
    try {
      await createUnidad(materia.id, newUnidadNombre.trim());
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setShowCreateUnidad(false);
      setNewUnidadNombre('');
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingUnidad(false);
    }
  };

  const handleEditUnidad = async (unidadId) => {
    if (!editingUnidadNombre.trim()) return;
    try {
      await updateUnidad(unidadId, { nombre: editingUnidadNombre.trim() });
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setEditingUnidadId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUnidad = async () => {
    if (!deleteUnidadId) return;
    try {
      await deleteUnidad(deleteUnidadId);
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      setDeleteUnidadId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMateria = async () => {
    try {
      await deleteMateria(materia.id);
      queryClient.invalidateQueries({ queryKey: ['materias'] });
      navigate('/study', { replace: true });
    } catch (err) {
      alert(err.message);
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
                  {t('materia.createdBy', { name: '' })}
                  <span
                    onClick={() => navigate(`/perfil/${materia.creador_id}`)}
                    style={{ color: 'var(--blue)', cursor: 'pointer' }}
                  >
                    {materia.creador_nombre}
                  </span>
                </span>
              )}
              {isOwner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <button
                    onClick={() => setShowDeleteMateriaConfirm(true)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', fontSize: '14px',
                      border: '1px solid rgba(220,53,69,0.3)', background: 'rgba(220,53,69,0.08)',
                      color: '#e07070', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title={t('materia.deleteSubject')}
                  >
                    🗑
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title">{t('materia.syllabus')}</div>
            {isOwner && (
              <button
                onClick={() => setShowCreateUnidad(true)}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'var(--s2)',
                  color: 'var(--text)', fontSize: '18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={t('materia.addUnit')}
              >
                +
              </button>
            )}
          </div>

          {/* Help bubble for empty units */}
          {isOwner && materia.unidades.length === 0 && (
            <HelpBubble message={t('materia.noUnitsHint')} />
          )}

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
              const isEditing = editingUnidadId === u.id;

              const cardContent = (
                <>
                  <div className="pu-left" style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }} onClick={e => e.preventDefault()}>
                        <input
                          type="text"
                          value={editingUnidadNombre}
                          onChange={e => setEditingUnidadNombre(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditUnidad(u.id); if (e.key === 'Escape') setEditingUnidadId(null); }}
                          autoFocus
                          style={{
                            flex: 1, background: 'var(--s2)', border: '1px solid var(--border)',
                            borderRadius: '6px', padding: '6px 8px', fontSize: '13px',
                            color: 'var(--text)', outline: 'none',
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditUnidad(u.id); }}
                          style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                            background: 'var(--gold)', border: 'none', color: '#000',
                            cursor: 'pointer', fontWeight: 600,
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingUnidadId(null); }}
                          style={{
                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
                            background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--text2)', cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="pu-name" style={{ marginBottom: '0' }}>{u.nombre}</div>
                    )}
                    <div className="pu-topics-chips">
                      {displayTemas.map((tema) => (
                        <span key={tema.id} className="topic-chip">{tema.nombre}</span>
                      ))}
                      {hasMore && <span className="topic-chip">...</span>}
                      {u.flashcard_count > 0 && (
                        <span className="topic-chip" style={{ background: 'var(--gold)', color: '#000' }}>
                          {t('materia.cards', { n: u.flashcard_count })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isOwner && !isEditing && (
                      <>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingUnidadId(u.id); setEditingUnidadNombre(u.nombre); }}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text2)', fontSize: '13px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          title={t('materia.editUnit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteUnidadId(u.id); }}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            border: '1px solid rgba(255,80,80,0.3)', background: 'transparent',
                            color: 'var(--text2)', fontSize: '13px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          title={t('materia.deleteUnit')}
                        >
                          🗑
                        </button>
                      </>
                    )}
                    <span className={`pu-badge ${siguiendo ? statusClass : 'pend'}`}>
                      {siguiendo ? badgeText : '🔒'}
                    </span>
                  </div>
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

      {/* Create unit modal */}
      {showCreateUnidad && (
        <div className="overlay show" id="create-unidad-overlay" onClick={e => { if (e.target.id === 'create-unidad-overlay') setShowCreateUnidad(false); }}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-title">{t('materia.addUnit')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 4px' }}>
              <input
                type="text"
                placeholder={t('materia.unitName')}
                value={newUnidadNombre}
                onChange={e => setNewUnidadNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateUnidad(); }}
                maxLength={100}
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--s2)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '12px 14px',
                  fontSize: '14px', color: 'var(--text)', outline: 'none',
                }}
              />
              <button
                onClick={handleCreateUnidad}
                disabled={!newUnidadNombre.trim() || creatingUnidad}
                style={{
                  padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  background: newUnidadNombre.trim() ? 'var(--gold)' : 'var(--s3)',
                  color: newUnidadNombre.trim() ? '#000' : 'var(--text2)',
                  border: 'none', cursor: newUnidadNombre.trim() ? 'pointer' : 'default',
                  opacity: creatingUnidad ? 0.6 : 1,
                }}
              >
                {creatingUnidad ? '...' : t('study.create')}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {deleteUnidadId && (
        <ConfirmModal
          title={t('materia.deleteUnit')}
          message={t('materia.deleteUnitMessage')}
          confirmLabel={t('materia.deleteUnitConfirm')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={handleDeleteUnidad}
          onCancel={() => setDeleteUnidadId(null)}
        />
      )}

      {showDeleteMateriaConfirm && (
        <ConfirmModal
          title={t('materia.deleteSubject')}
          message={t('materia.deleteSubjectMessage')}
          confirmLabel={t('materia.deleteSubjectConfirm')}
          cancelLabel={t('common.cancel')}
          dangerous
          onConfirm={handleDeleteMateria}
          onCancel={() => setShowDeleteMateriaConfirm(false)}
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

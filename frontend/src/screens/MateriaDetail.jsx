import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import api, { getProgresoUnidad, getVistasMateria, toggleSeguirMateria, getSeguidoresMateria, deleteProgresoMateria, createOrUpdateUser } from '../services/api';
import VistaBadge from '../components/VistaBadge';
import ConfirmModal from '../components/ConfirmModal';

// ─── Avatar stack shown in header ─────────────────────────────────────────────
const MAX_AVATARS = 4;

const AvatarStack = ({ seguidores, onClick }) => {
  if (seguidores.length === 0) return null;
  const shown = seguidores.slice(0, MAX_AVATARS);
  const extra = seguidores.length - MAX_AVATARS;
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
        {seguidores.length} {seguidores.length === 1 ? 'seguidor' : 'seguidores'}
      </span>
    </div>
  );
};

// ─── Seguidores modal ─────────────────────────────────────────────────────────
const SeguidoresModal = ({ seguidores, onClose, onClickUser }) => (
  <div className="overlay show" id="seg-overlay" onClick={e => { if (e.target.id === 'seg-overlay') onClose(); }}>
    <div className="sheet">
      <div className="sheet-handle" />
      <div className="sheet-title">Seguidores</div>
      {seguidores.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: '24px 0' }}>Sin seguidores aún</div>
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

// ─── Main component ───────────────────────────────────────────────────────────
const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useTelegram();

  const [materia, setMateria] = useState(location.state?.materia || null);
  const [loading, setLoading] = useState(!location.state?.materia);
  const [unidadProgresos, setUnidadProgresos] = useState({});
  const [vistasMateria, setVistasMateria] = useState(null);
  const [siguiendo, setSiguiendo] = useState(location.state?.materia?.siguiendo ?? location.state?.siguiendo ?? false);
  const [seguidores, setSeguidores] = useState([]);
  const [showSeguidores, setShowSeguidores] = useState(false);
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);
  // Generation counter: incremented on every follow/unfollow action to invalidate
  // any in-flight getSeguidoresMateria call from the useEffect (prevents stale data
  // from overwriting the state set by the toggle response).
  const seguidoresGenRef = useRef(0);

  useEffect(() => {
    const fetchMateriaData = async () => {
      if (!materia) {
        try {
          const response = await api.get('/materias');
          const found = response.data.find(m => m.id === parseInt(id));
          if (found) setMateria(found);
        } catch(e) { console.error(e); }
      }
      setLoading(false);
    };
    fetchMateriaData();
  }, [id]);

  // Fetch progreso, vistas, and seguidores once materia is ready
  useEffect(() => {
    if (!materia) return;

    getVistasMateria(materia.id)
      .then(res => setVistasMateria(res.total ?? 0))
      .catch(() => setVistasMateria(0));

    const gen = ++seguidoresGenRef.current;
    getSeguidoresMateria(materia.id)
      .then(list => {
        if (seguidoresGenRef.current !== gen) return; // stale — a follow/unfollow started, ignore
        setSeguidores(list);
        if (user?.id) setSiguiendo(list.some(s => s.id_telegram === user.id));
      })
      .catch(() => {});

    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (!userId) return;

    const fetchProgresos = async () => {
      const entries = await Promise.all(
        materia.unidades.map(async (u) => {
          try {
            const res = await getProgresoUnidad(u.id, userId);
            return [u.id, res.porcentaje_total ?? 0];
          } catch { return [u.id, 0]; }
        })
      );
      setUnidadProgresos(Object.fromEntries(entries));
    };
    fetchProgresos();
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
    seguidoresGenRef.current++; // invalidate any pending getSeguidoresMateria from useEffect
    const prev = siguiendo;
    console.log('[doFollow] START — siguiendo antes:', prev, '| user.id:', user?.id, '| materia:', materia?.id);
    console.log('[doFollow] initData present:', !!window.Telegram?.WebApp?.initData);
    setSiguiendo(true);
    // Optimistic: add user to avatar list only if not already present (prevents duplicate display)
    setSeguidores(prev =>
      prev.some(s => s.id_telegram === user.id)
        ? prev
        : [{ id_telegram: user.id, first_name: user.first_name, foto_url: user.photo_url }, ...prev]
    );
    try {
      let res;
      try {
        res = await toggleSeguirMateria(materia.id, user.id, true); // explicit follow (idempotent)
        console.log('[doFollow] toggle response (1st attempt):', res);
      } catch (err) {
        console.warn('[doFollow] toggle error (1st attempt):', err.message, '| detail:', err.detail);
        // If user doesn't exist yet in DB (race between app load and first follow),
        // register them first and retry once.
        if (err.detail === 'user_not_registered') {
          console.log('[doFollow] user_not_registered — registering and retrying');
          await createOrUpdateUser({
            id_telegram: user.id,
            first_name: user.first_name || 'Desconocido',
            last_name: user.last_name || null,
            username: user.username || null,
            foto_url: user.photo_url || null,
          });
          res = await toggleSeguirMateria(materia.id, user.id, true);
          console.log('[doFollow] toggle response (retry):', res);
        } else {
          throw err;
        }
      }
      console.log('[doFollow] siguiendo después:', res.siguiendo);
      setSiguiendo(res.siguiendo);
      const list = await getSeguidoresMateria(materia.id);
      setSeguidores(list);
    } catch (err) {
      console.error('[doFollow] FATAL error — revirtiendo a', prev, '| error:', err);
      setSiguiendo(prev);
    }
  };

  const doUnfollow = async () => {
    seguidoresGenRef.current++; // invalidate any pending getSeguidoresMateria from useEffect
    setShowUnfollowConfirm(false);
    const prev = siguiendo;
    setSiguiendo(false);
    setSeguidores(seguidores.filter(s => s.id_telegram !== user.id));
    try {
      await deleteProgresoMateria(user.id, materia.id);
      await toggleSeguirMateria(materia.id, user.id, false); // explicit unfollow (idempotent)
      setUnidadProgresos({});
      const list = await getSeguidoresMateria(materia.id);
      setSeguidores(list);
    } catch {
      setSiguiendo(prev);
    }
  };

  if (loading) return <div className="screen active" style={{ padding: '20px' }}>Cargando materia...</div>;
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;

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
              <span className="detail-prog-label">Progreso general</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="detail-prog-pct">{overallPct}%</span>
                {siguiendo && user?.id && (
                  <button
                    onClick={handleToggleSeguir}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                      border: '1px solid var(--gold)',
                      background: 'rgba(212,168,71,0.15)',
                      color: 'var(--gold)',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Siguiendo
                  </button>
                )}
              </div>
            </div>
            <div className="detail-bar-wrap">
              <div className="detail-bar" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${materia.color || 'var(--gold)'}, var(--gold2))` }}></div>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {vistasMateria !== null && <VistaBadge vistas={vistasMateria} />}
              <AvatarStack seguidores={seguidores} onClick={() => setShowSeguidores(true)} />
            </div>
          </div>

          <div className="section-head" style={{ marginBottom: '10px' }}>
            <div className="section-title">Programa</div>
          </div>

          {!siguiendo && (
            <div style={{
              background: 'rgba(212,168,71,0.08)', border: '1px solid rgba(212,168,71,0.3)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.4 }}>
                🔒 Seguí esta materia para desbloquear el contenido
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
                  ➕ Seguir
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
              const badgeText = userPct === 100 ? '✓ Completa' : `${userPct}%`;
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
                          {u.flashcard_count} tarjetas
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
                  style={{ textDecoration: 'none', color: 'inherit' }}
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
          title="⚠️ ¿Dejar de seguir?"
          message="Se borrará todo tu progreso en esta materia incluyendo flashcards, cuestionarios y vistas. Esta acción no se puede deshacer."
          confirmLabel="Sí, dejar de seguir"
          cancelLabel="Cancelar"
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
          zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          Seguí esta materia para acceder al contenido
        </div>
      )}
    </>
  );
};

export default MateriaDetail;

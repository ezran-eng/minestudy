import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toggleSeguirMateria, deleteProgresoMateria, createOrUpdateUser, getProgresoUnidad, getVistasMateria } from '../services/api';
import { useMaterias, useMateriasSeguidas, useInvalidate } from '../hooks/useQueryHooks';
import { useMascotaUpdate } from '../context/MascotaContext';
import VistaBadge from '../components/VistaBadge';
import ConfirmModal from '../components/ConfirmModal';

const Study = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [confirmUnfollowId, setConfirmUnfollowId] = useState(null);

  const tg = window.Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;

  const { data: rawMaterias, isLoading: loadingMaterias } = useMaterias();
  const { data: seguidasRes, isLoading: loadingSeguidas } = useMateriasSeguidas(userId);
  const invalidate = useInvalidate();
  const updateMascota = useMascotaUpdate();
  const [hoveredMateriaId, setHoveredMateriaId] = useState(null);

  // Fetch progreso + vistas per materia (still parallel but with dedup)
  const [progresoMap, setProgresoMap] = useState({});  // { materiaId: { avg, vistas } }
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    if (!rawMaterias || !userId) return;
    const toFetch = rawMaterias.filter(m => !fetchedRef.current.has(m.id));
    if (toFetch.length === 0) return;

    toFetch.forEach(m => fetchedRef.current.add(m.id));

    Promise.all(
      toFetch.map(async (materia) => {
        const [pcts, vistasRes] = await Promise.all([
          materia.unidades.length === 0
            ? Promise.resolve([0])
            : Promise.all(
                materia.unidades.map(async (u) => {
                  try {
                    const res = await getProgresoUnidad(u.id, userId);
                    return res.porcentaje_total ?? 0;
                  } catch { return 0; }
                })
              ),
          getVistasMateria(materia.id).catch(() => ({ total: 0 })),
        ]);
        const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
        return { id: materia.id, avg, vistas: vistasRes.total ?? 0 };
      })
    ).then((results) => {
      setProgresoMap(prev => {
        const next = { ...prev };
        for (const r of results) next[r.id] = { avg: r.avg, vistas: r.vistas };
        return next;
      });
    });
  }, [rawMaterias, userId]);

  useEffect(() => {
    if (!updateMascota) return;
    updateMascota({ pantalla: 'study', datos: {} });
    window.dispatchEvent(new CustomEvent('mascota:event', {
      detail: { accion: 'enter', pantalla: 'study', datos: {} },
    }));
  }, []); // eslint-disable-line

  useEffect(() => {
    const onHover = (e) => setHoveredMateriaId(String(e.detail.id));
    const onNone = () => setHoveredMateriaId(null);
    window.addEventListener('mascota:hover-materia', onHover);
    window.addEventListener('mascota:hover-none', onNone);
    return () => {
      window.removeEventListener('mascota:hover-materia', onHover);
      window.removeEventListener('mascota:hover-none', onNone);
    };
  }, []);

  const seguidasSet = useMemo(
    () => new Set(seguidasRes?.materia_ids || []),
    [seguidasRes]
  );

  const materias = useMemo(() => {
    if (!rawMaterias) return [];
    const processed = rawMaterias.map(m => ({
      ...m,
      pct: progresoMap[m.id]?.avg ?? 0,
      vistas: progresoMap[m.id]?.vistas ?? 0,
      siguiendo: seguidasSet.has(m.id),
    }));
    processed.sort((a, b) => (b.siguiendo ? 1 : 0) - (a.siguiendo ? 1 : 0));
    return processed;
  }, [rawMaterias, progresoMap, seguidasSet]);

  const loading = loadingMaterias || (userId && loadingSeguidas);

  const handleMateriaClick = (materia) => {
    navigate(`/materia/${materia.id}`, { state: { materia } });
  };

  const handleToggleSeguir = (e, materiaId) => {
    e.stopPropagation();
    if (!userId) return;
    const materia = materias.find(m => m.id === materiaId);
    if (materia?.siguiendo) {
      setConfirmUnfollowId(materiaId);
    } else {
      doFollow(materiaId, userId);
    }
  };

  const doFollow = async (materiaId, uid) => {
    try {
      try {
        await toggleSeguirMateria(materiaId, uid, true);
      } catch (err) {
        if (err.detail === 'user_not_registered') {
          const tgUser = tg?.initDataUnsafe?.user;
          if (tgUser) {
            await createOrUpdateUser({
              id_telegram: tgUser.id,
              first_name: tgUser.first_name || 'Desconocido',
              last_name: tgUser.last_name || null,
              username: tgUser.username || null,
              foto_url: tgUser.photo_url || null,
            });
          }
          await toggleSeguirMateria(materiaId, uid, true);
        } else {
          throw err;
        }
      }
      invalidate.seguidas(uid);
    } catch {
      // silently fail — seguidas query stays as is
    }
  };

  const doUnfollow = async () => {
    const materiaId = confirmUnfollowId;
    setConfirmUnfollowId(null);
    try {
      await deleteProgresoMateria(userId, materiaId);
      await toggleSeguirMateria(materiaId, userId, false);
      invalidate.seguidas(userId);
      invalidate.allProgreso();
      // Reset local progreso for the materia
      setProgresoMap(prev => ({ ...prev, [materiaId]: { avg: 0, vistas: prev[materiaId]?.vistas ?? 0 } }));
    } catch {
      // revert nothing — cache will refetch
    }
  };

  if (loading) {
    return (
      <div className="screen active screen-container" id="screen-study">
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text2)' }}>
          Cargando materias...
        </div>
      </div>
    );
  }

  const filtered = query.trim()
    ? materias.filter(m => m.nombre.toLowerCase().includes(query.toLowerCase()))
    : materias;

  return (
    <>
    <div className="screen active screen-container" id="screen-study">
      <div className="study-body-pad" style={{ paddingBottom: '8px' }}>
        <input
          type="text"
          placeholder="Buscar materia..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '14px', color: 'var(--text)',
            outline: 'none',
          }}
        />
      </div>
      <div className="materias-list study-body-pad" style={{ paddingTop: 0 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', marginTop: '32px' }}>
            No se encontraron materias
          </div>
        )}
        {filtered.map((materia) => {
          const color = materia.color || 'var(--gold)';
          return (
            <div
              key={materia.id}
              className="materia-row"
              data-materia-id={materia.id}
              data-materia-nombre={materia.nombre}
              data-materia-progreso={materia.pct}
              data-materia-unidades={materia.unidades.length}
              style={{
                borderLeftColor: color,
                ...(hoveredMateriaId
                  ? String(materia.id) === hoveredMateriaId
                    ? {
                        border: '1px solid rgba(255, 200, 50, 0.8)',
                        borderLeft: '4px solid rgba(255, 200, 50, 0.8)',
                        boxShadow: '0 0 20px rgba(255, 200, 50, 0.3)',
                        transform: 'scale(1.01)',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        zIndex: 2,
                      }
                    : {
                        filter: 'blur(3px)',
                        opacity: 0.4,
                        transition: 'all 0.2s ease',
                      }
                  : { transition: 'all 0.2s ease' }),
              }}
              onClick={() => handleMateriaClick(materia)}
            >
              <div className="materia-emoji-big">{materia.emoji}</div>
              <div className="materia-info">
                <div className="materia-name-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {materia.nombre}
                  {materia.siguiendo && (
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 6px',
                      borderRadius: '6px', background: 'rgba(212,168,71,0.15)',
                      color: 'var(--gold)', border: '1px solid var(--gold)',
                    }}>Siguiendo</span>
                  )}
                </div>
                <div className="materia-bottom">
                  <span className="materia-pct">{materia.pct}%</span>
                  <div className="mini-bar-wrap">
                    <div className="mini-bar" style={{ width: `${materia.pct}%`, background: color }}></div>
                  </div>
                  <VistaBadge vistas={materia.vistas ?? 0} style={{ marginLeft: '6px' }} />
                </div>
              </div>
              <button
                onClick={(e) => handleToggleSeguir(e, materia.id)}
                style={{
                  padding: '5px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                  border: materia.siguiendo ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: materia.siguiendo ? 'rgba(212,168,71,0.15)' : 'transparent',
                  color: materia.siguiendo ? 'var(--gold)' : 'var(--text2)',
                  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                }}
              >
                {materia.siguiendo ? '✓' : '➕'}
              </button>
            </div>
          );
        })}
      </div>
    </div>

    {confirmUnfollowId !== null && (
      <ConfirmModal
        title="⚠️ ¿Dejar de seguir?"
        message="Se borrará todo tu progreso en esta materia incluyendo flashcards, cuestionarios y vistas. Esta acción no se puede deshacer."
        confirmLabel="Sí, dejar de seguir"
        cancelLabel="Cancelar"
        dangerous
        onConfirm={doUnfollow}
        onCancel={() => setConfirmUnfollowId(null)}
      />
    )}
    </>
  );
};

export default Study;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getProgresoUnidad, getVistasMateria, getMateriasSeguidas, toggleSeguirMateria } from '../services/api';
import VistaBadge from '../components/VistaBadge';

const Study = () => {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const userIdRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await api.get('/materias');
        const rawMaterias = response.data;

        const tg = window.Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id;
        userIdRef.current = userId;

        if (!userId) {
          setMaterias(rawMaterias.map(m => ({ ...m, pct: 0, vistas: 0, siguiendo: false })));
          return;
        }

        const [seguidasRes, ...materiaResults] = await Promise.all([
          getMateriasSeguidas(userId).catch(() => ({ materia_ids: [] })),
          ...rawMaterias.map(async (materia) => {
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
            return { avg, vistas: vistasRes.total ?? 0 };
          }),
        ]);

        const seguidasSet = new Set(seguidasRes.materia_ids || []);
        const processed = rawMaterias.map((m, i) => ({
          ...m,
          pct: materiaResults[i].avg,
          vistas: materiaResults[i].vistas,
          siguiendo: seguidasSet.has(m.id),
        }));

        // Followed materias first, then rest (preserve original order within each group)
        processed.sort((a, b) => (b.siguiendo ? 1 : 0) - (a.siguiendo ? 1 : 0));
        setMaterias(processed);
      } catch (error) {
        console.error('Error fetching materias:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleMateriaClick = (materia) => {
    navigate(`/materia/${materia.id}`, { state: { materia } });
  };

  const handleToggleSeguir = async (e, materiaId) => {
    e.stopPropagation();
    const userId = userIdRef.current;
    if (!userId) return;
    // Optimistic toggle
    setMaterias(prev => {
      const updated = prev.map(m =>
        m.id === materiaId ? { ...m, siguiendo: !m.siguiendo } : m
      );
      return [...updated].sort((a, b) => (b.siguiendo ? 1 : 0) - (a.siguiendo ? 1 : 0));
    });
    try {
      await toggleSeguirMateria(materiaId, userId);
    } catch {
      // Revert on error
      setMaterias(prev => {
        const reverted = prev.map(m =>
          m.id === materiaId ? { ...m, siguiendo: !m.siguiendo } : m
        );
        return [...reverted].sort((a, b) => (b.siguiendo ? 1 : 0) - (a.siguiendo ? 1 : 0));
      });
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
              style={{ borderLeftColor: color }}
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
  );
};

export default Study;

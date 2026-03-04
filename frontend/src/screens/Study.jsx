import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getProgresoUnidad, getVistasMateria } from '../services/api';
import VistaBadge from '../components/VistaBadge';

const Study = () => {
  const navigate = useNavigate();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await api.get('/materias');
        const rawMaterias = response.data;

        const tg = window.Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id;

        if (!userId) {
          setMaterias(rawMaterias.map(m => ({ ...m, pct: 0 })));
          return;
        }

        const materiasWithPct = await Promise.all(
          rawMaterias.map(async (materia) => {
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
            return { ...materia, pct: avg, vistas: vistasRes.total ?? 0 };
          })
        );

        setMaterias(materiasWithPct);
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
                <div className="materia-name-row">{materia.nombre}</div>
                <div className="materia-bottom">
                  <span className="materia-pct">{materia.pct}%</span>
                  <div className="mini-bar-wrap">
                    <div className="mini-bar" style={{ width: `${materia.pct}%`, background: color }}></div>
                  </div>
                  <VistaBadge vistas={materia.vistas ?? 0} style={{ marginLeft: '6px' }} />
                </div>
              </div>
              <div className="materia-arrow">›</div>
            </div>
          );
        })}
      </div>
    </div>
  );

};

export default Study;

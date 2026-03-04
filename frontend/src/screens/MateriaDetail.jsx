import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { getProgresoUnidad, getVistasMateria } from '../services/api';
import VistaBadge from '../components/VistaBadge';

const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [materia, setMateria] = useState(location.state?.materia || null);
  const [loading, setLoading] = useState(!location.state?.materia);
  const [unidadProgresos, setUnidadProgresos] = useState({}); // { [unidad.id]: porcentaje_total }
  const [vistasMateria, setVistasMateria] = useState(null);

  useEffect(() => {
    const fetchMateriaData = async () => {
      if (!materia) {
        try {
          const response = await api.get('/materias');
          const found = response.data.find(m => m.id === parseInt(id));
          if (found) setMateria(found);
        } catch(e) {
          console.error(e);
        }
      }
      setLoading(false);
    };
    fetchMateriaData();
  }, [id]);

  // Fetch real progreso for each unidad once materia is ready
  useEffect(() => {
    if (!materia) return;
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (!userId) return;

    const fetchProgresos = async () => {
      const entries = await Promise.all(
        materia.unidades.map(async (u) => {
          try {
            const res = await getProgresoUnidad(u.id, userId);
            return [u.id, res.porcentaje_total ?? 0];
          } catch {
            return [u.id, 0];
          }
        })
      );
      setUnidadProgresos(Object.fromEntries(entries));
    };
    fetchProgresos();
  }, [materia]);

  useEffect(() => {
    if (!materia) return;
    getVistasMateria(materia.id)
      .then(res => setVistasMateria(res.total ?? 0))
      .catch(() => setVistasMateria(0));
  }, [materia]);

  if (loading) {
    return <div className="screen active" style={{ padding: '20px' }}>Cargando materia...</div>;
  }

  if (!materia) {
    return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  }

  const totalUnits = materia.unidades.length;
  let overallPct = 0;
  if (totalUnits > 0) {
    const sum = materia.unidades.reduce((acc, u) => acc + (unidadProgresos[u.id] ?? 0), 0);
    overallPct = Math.round(sum / totalUnits);
  }

  return (
    <div className="screen active screen-container" id="screen-materia">
      <div className="fab-back-btn">
        <div className="btn-back" onClick={() => navigate('/study')}>‹</div>
      </div>
      <div className="detail-body detail-body-pad">
        <div className="detail-prog">
          <div className="detail-prog-top">
            <span className="detail-prog-label">Progreso general</span>
            <span className="detail-prog-pct">{overallPct}%</span>
          </div>
          <div className="detail-bar-wrap">
            <div className="detail-bar" style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${materia.color || 'var(--gold)'}, var(--gold2))` }}></div>
          </div>
          {vistasMateria !== null && (
            <div style={{ marginTop: '6px' }}>
              <VistaBadge vistas={vistasMateria} />
            </div>
          )}
        </div>

        <div className="section-head" style={{ marginBottom: '10px' }}>
          <div className="section-title">Programa</div>
        </div>
        <div className="unidades-list">
          {materia.unidades.map((u) => {
            const userPct = Math.round(unidadProgresos[u.id] ?? 0);

            let statusClass = 'pend';
            if (userPct === 100) statusClass = 'done';
            else if (userPct > 0) statusClass = 'cur';

            const badgeText = userPct === 100 ? '✓ Completa' : `${userPct}%`;

            const displayTemas = u.temas.slice(0, 3);
            const hasMore = u.temas.length > 3;

            const topicsChips = (
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
            );

            return (
              <Link
                to={`/materia/${id}/unidad/${u.id}`}
                state={{ unidad: u, materia, unitProgress: userPct }}
                key={u.id}
                className={`unit-item ${statusClass}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="pu-left">
                  <div className="pu-name" style={{ marginBottom: '0' }}>{u.nombre}</div>
                  {topicsChips}
                </div>
                <span className={`pu-badge ${statusClass}`}>{badgeText}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MateriaDetail;

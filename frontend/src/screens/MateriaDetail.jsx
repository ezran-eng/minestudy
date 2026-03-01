import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../services/api';

const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [materia, setMateria] = useState(location.state?.materia || null);
  const [loading, setLoading] = useState(!location.state?.materia);
  const [progresos, setProgresos] = useState([]);

  useEffect(() => {
    // If not passed via state, we would fetch it.
    // Assuming Study.jsx always passes it. If refreshed, we might need a fallback.
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

        // Fetch user progress for these units
        try {
            const tg = window.Telegram?.WebApp;
            const userId = tg?.initDataUnsafe?.user?.id || 1;
            const userRes = await api.get(`/users/${userId}`);
            setProgresos(userRes.data.progresos || []);
        } catch(e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchMateriaData();
  }, [id, materia]);

  if (loading) {
    return <div className="screen active" style={{ padding: '20px' }}>Cargando materia...</div>;
  }

  if (!materia) {
    return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  }

  // Calculate overall pct dynamically
  const totalUnits = materia.unidades.length;
  let overallPct = 0;
  if (totalUnits > 0) {
    const sumPct = materia.unidades.reduce((acc, u) => {
        const p = progresos.find(prog => prog.id_unidad === u.id);
        return acc + (p ? p.porcentaje : 0);
    }, 0);
    overallPct = Math.round(sumPct / totalUnits);
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
        </div>

        <div className="section-head" style={{ marginBottom: '10px' }}>
          <div className="section-title">Programa</div>
        </div>
        <div className="unidades-list">
          {materia.unidades.map((u) => {
            const p = progresos.find(prog => prog.id_unidad === u.id);
            const userPct = p ? p.porcentaje : 0;

            // Logic for status based on real progress
            let currentStatus = u.estado_default;
            if (userPct === 100) {
               currentStatus = 'done';
            } else if (userPct > 0 || currentStatus === 'active') {
               currentStatus = 'cur';
            } else {
               currentStatus = 'pend';
            }

            const isPending = currentStatus === 'pending' || currentStatus === 'pend';
            const statusClass = currentStatus === 'done' ? 'done' : currentStatus === 'cur' ? 'cur' : 'pend';
            const badgeClass = currentStatus === 'done' ? 'done' : currentStatus === 'cur' ? 'cur' : 'pend';
            const badgeText = currentStatus === 'done' ? '✓ Completa' : currentStatus === 'cur' ? 'En curso' : 'Pendiente';

            const topicsText = u.temas.map(t => t.nombre).join(' • ');

            if (isPending) {
              return (
                <div key={u.id} className={`unit-item ${statusClass}`}>
                  <div className="pu-left">
                    <div className="pu-name" style={{ marginBottom: '4px' }}>{u.nombre}</div>
                    <div className="pu-topics">{topicsText}</div>
                  </div>
                  <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
                </div>
              );
            }

            return (
              <Link to={`/materia/${id}/unidad/${u.id}`} state={{ unidad: u, materia, unitProgress: userPct }} key={u.id} className={`unit-item ${statusClass}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="pu-left">
                  <div className="pu-name" style={{ marginBottom: '4px' }}>{u.nombre}</div>
                  <div className="pu-topics">{topicsText}</div>
                </div>
                <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MateriaDetail;

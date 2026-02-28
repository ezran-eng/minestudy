import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { materiasData } from '../data/materias';

const MateriaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const materia = materiasData[id];

  if (!materia) {
    return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;
  }

  return (
    <div className="screen active" id="screen-detail">
      <div className="detail-header">
        <div className="btn-back" onClick={() => navigate('/study')}>‹</div>
        <div className="detail-title">{materia.emoji} {materia.name}</div>
      </div>
      <div className="detail-body">
        <div className="detail-prog">
          <div className="detail-prog-top">
            <span className="detail-prog-label">Progreso general</span>
            <span className="detail-prog-pct">{materia.pct}%</span>
          </div>
          <div className="detail-bar-wrap">
            <div className="detail-bar" style={{ width: `${materia.pct}%` }}></div>
          </div>
        </div>

        <div className="section-head">
          <div className="section-title">Programa</div>
        </div>
        <div className="program-units">
          {materia.unidades.map((u, i) => {
            const isPending = u.status === 'pending';
            const statusClass = u.status === 'done' ? 'done' : u.status === 'active' ? 'active-unit' : 'pending-unit';
            const badgeClass = u.status === 'done' ? 'done' : u.status === 'active' ? 'active' : 'pending';
            const badgeText = u.status === 'done' ? '✓ Completa' : u.status === 'active' ? 'En curso' : 'Pendiente';

            if (isPending) {
              return (
                <div key={i} className={`pu-item ${statusClass}`}>
                  <div className="pu-left">
                    <div className="pu-header">
                      <span className="pu-name">{u.name}</span>
                      <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
                    </div>
                    <div className="pu-topics">{u.topics}</div>
                  </div>
                </div>
              );
            }

            return (
              <Link to={`/materia/${id}/unidad/${i}`} key={i} className={`pu-item ${statusClass}`}>
                <div className="pu-left">
                  <div className="pu-header">
                    <span className="pu-name">{u.name}</span>
                    <span className={`pu-badge ${badgeClass}`}>{badgeText}</span>
                  </div>
                  <div className="pu-topics">{u.topics}</div>
                </div>
                <div className="pu-arrow">›</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MateriaDetail;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { materiasData } from '../data/materias';
import ProgressRing from '../components/ProgressRing';

const Study = () => {
  const navigate = useNavigate();

  const handleMateriaClick = (id) => {
    navigate(`/materia/${id}`);
  };

  const materiaStyles = {
    'm1': { color: 'var(--gold)' },
    'm2': { color: 'var(--rust)' },
    'm3': { color: 'var(--blue)' },
    'm4': { color: 'var(--green)' },
    'm5': { color: '#c47dd4' },
    'm6': { color: 'var(--stone)' },
  };

  return (
    <div className="screen active" id="screen-study">
      <div className="study-header">
        <div className="study-title">Mis Materias</div>
        <button className="btn-add">+ Nueva</button>
      </div>
      <div className="materias-list">

        {Object.entries(materiasData).map(([id, materia]) => (
          <div key={id} className={`materia-row ${id}`} onClick={() => handleMateriaClick(id)}>
            <div className="materia-emoji-big">{materia.emoji}</div>
            <div className="materia-info">
              <div className="materia-name-row">{materia.name}</div>
              <div className="materia-bottom">
                <span className="materia-pct">{materia.pct}%</span>
                <div className="mini-bar-wrap">
                  <div className="mini-bar" style={{ width: `${materia.pct}%`, background: materiaStyles[id].color }}></div>
                </div>
              </div>
            </div>

            <ProgressRing
              radius={24}
              stroke={3}
              progress={materia.pct}
              color={materiaStyles[id].color}
            />

            <div className="materia-arrow">›</div>
          </div>
        ))}

      </div>
    </div>
  );
};

export default Study;

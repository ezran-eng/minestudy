import React from 'react';
import { useNavigate } from 'react-router-dom';

const Study = () => {
  const navigate = useNavigate();

  const handleMateriaClick = (id) => {
    navigate(`/materia/${id}`);
  };

  return (
    <div className="screen active" id="screen-study">
      <div className="study-header">
        <div className="study-title">Mis Materias</div>
        <button className="btn-add">+ Nueva</button>
      </div>
      <div className="materias-list">

        <div className="materia-row m1" onClick={() => handleMateriaClick('m1')}>
          <div className="materia-emoji-big">⚙️</div>
          <div className="materia-info">
            <div className="materia-name-row">Prácticas Profesionalizantes</div>
            <div className="materia-bottom">
              <span className="materia-pct">38%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '38%', background: 'var(--gold)' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

        <div className="materia-row m2" onClick={() => handleMateriaClick('m2')}>
          <div className="materia-emoji-big">💥</div>
          <div className="materia-info">
            <div className="materia-name-row">Perforación y Voladura</div>
            <div className="materia-bottom">
              <span className="materia-pct">62%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '62%', background: 'var(--rust)' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

        <div className="materia-row m3" onClick={() => handleMateriaClick('m3')}>
          <div className="materia-emoji-big">🗺️</div>
          <div className="materia-info">
            <div className="materia-name-row">Topografía Minera</div>
            <div className="materia-bottom">
              <span className="materia-pct">15%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '15%', background: 'var(--blue)' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

        <div className="materia-row m4" onClick={() => handleMateriaClick('m4')}>
          <div className="materia-emoji-big">🧪</div>
          <div className="materia-info">
            <div className="materia-name-row">Mineralogía y Petrografía</div>
            <div className="materia-bottom">
              <span className="materia-pct">75%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '75%', background: 'var(--green)' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

        <div className="materia-row m5" onClick={() => handleMateriaClick('m5')}>
          <div className="materia-emoji-big">🏗️</div>
          <div className="materia-info">
            <div className="materia-name-row">Geomecánica</div>
            <div className="materia-bottom">
              <span className="materia-pct">44%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '44%', background: '#c47dd4' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

        <div className="materia-row m6" onClick={() => handleMateriaClick('m6')}>
          <div className="materia-emoji-big">🌊</div>
          <div className="materia-info">
            <div className="materia-name-row">Hidrogeología</div>
            <div className="materia-bottom">
              <span className="materia-pct">20%</span>
              <div className="mini-bar-wrap">
                <div className="mini-bar" style={{ width: '20%', background: 'var(--stone)' }}></div>
              </div>
            </div>
          </div>
          <div className="materia-arrow">›</div>
        </div>

      </div>
    </div>
  );
};

export default Study;

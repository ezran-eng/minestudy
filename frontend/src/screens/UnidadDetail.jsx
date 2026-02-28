import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materiasData } from '../data/materias';
import Flashcard from '../components/Flashcard';
import Quiz from '../components/Quiz';

const UnidadDetail = () => {
  const { id, idx } = useParams();
  const navigate = useNavigate();

  const [isFlashOpen, setIsFlashOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [customFlashcards, setCustomFlashcards] = useState(null);

  const fileInputRef = useRef(null);

  const materia = materiasData[id];
  if (!materia) return <div className="screen active" style={{ padding: '20px' }}>Materia no encontrada</div>;

  const unidad = materia.unidades[parseInt(idx, 10)];
  if (!unidad) return <div className="screen active" style={{ padding: '20px' }}>Unidad no encontrada</div>;

  const topicsArray = unidad.topics.split(' · ');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target.result;
      const lines = csv.split('\n');

      const parsedCards = [];
      // Start from 1 assuming header is 'question,answer'
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          // A very basic CSV parser that splits by comma.
          // In a real app, you might want to handle quoted strings with commas inside.
          const [q, ...aRest] = line.split(',');
          const a = aRest.join(','); // Rejoin in case answer has commas
          if (q && a) {
            parsedCards.push({ q: q.trim(), a: a.trim() });
          }
        }
      }

      if (parsedCards.length > 0) {
        setCustomFlashcards(parsedCards);
        alert(`Importadas ${parsedCards.length} flashcards exitosamente.`);
      } else {
        alert('No se encontraron flashcards válidas en el CSV.');
      }
    };
    reader.readAsText(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="screen active" id="screen-unidad">
        <div className="detail-header">
          <div className="btn-back" onClick={() => navigate(`/materia/${id}`)}>‹</div>
          <div className="detail-title">{unidad.name}</div>
        </div>
        <div className="detail-body">
          <div className="pu-topics-box">
            {topicsArray.map((t, i) => (
              <span key={i} style={{ display: 'inline-block', background: 'var(--s3)', borderRadius: '6px', padding: '3px 10px', margin: '3px 3px', fontSize: '12px', color: 'var(--text2)' }}>
                {t}
              </span>
            ))}
          </div>
          <div className="section-head" style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title">Recursos</div>
            <button
              className="btn-add"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              Importar Flashcards
            </button>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
          <div className="resources-grid">
            <div className="resource-card flash" onClick={() => setIsFlashOpen(true)}>
              <div className="resource-icon-wrap">🃏</div>
              <div className="resource-info">
                <div className="resource-name">Flashcards</div>
                <div className="resource-sub">Repaso con tarjetas · spaced repetition</div>
              </div>
              <div className="resource-badge">
                {customFlashcards ? `${customFlashcards.length} tarjetas` : '12 tarjetas'}
              </div>
            </div>
            <div className="resource-card quiz" onClick={() => setIsQuizOpen(true)}>
              <div className="resource-icon-wrap">🎯</div>
              <div className="resource-info">
                <div className="resource-name">Quiz IA</div>
                <div className="resource-sub">Preguntas generadas desde tus PDFs</div>
              </div>
              <div className="resource-badge">Nuevo</div>
            </div>
          </div>
        </div>
      </div>

      <Flashcard
        isOpen={isFlashOpen}
        onClose={() => setIsFlashOpen(false)}
        materiaName={materia.name}
        customCards={customFlashcards}
      />
      <Quiz
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
      />
    </>
  );
};

export default UnidadDetail;

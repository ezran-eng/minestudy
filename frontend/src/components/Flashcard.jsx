import React, { useState, useEffect } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { registrarActividad } from '../services/api';
import { useToast } from './Toast';

const Flashcard = ({ isOpen, onClose, materiaName, customCards = null, userId = null }) => {
  const { user } = useTelegram();
  const { showToast } = useToast();
  const defaultCards = [
    { q: '¿Cuál es la dureza del cuarzo en la escala de Mohs?', a: 'Dureza 7 — es uno de los minerales más comunes y resistentes de la corteza terrestre.' },
    { q: '¿Qué significa RQD en geomecánica?', a: 'Rock Quality Designation — mide la calidad de la roca según el porcentaje de testigos intactos mayores a 10 cm.' },
    { q: '¿Qué es la Ley de Corte?', a: 'La ley mínima de mineral para que sea económicamente rentable su extracción, considerando costos operativos y precio del metal.' },
    { q: '¿Qué mineral tiene estructura cúbica y clivaje perfecto en 3 direcciones?', a: 'La galena (PbS) — mineral principal del plomo, con clivaje cúbico perfecto y brillo metálico característico.' },
  ];

  const cards = customCards && customCards.length > 0 ? customCards : defaultCards;

  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCardIdx(0);
      setFlipped(false);
    }
  }, [isOpen]);

  const flipCard = () => setFlipped(f => !f);

  const nextCard = async (knew) => {
    const currentCard = cards[cardIdx];
    const isLastCard = cardIdx === cards.length - 1;

    // Submit SRS review if card has an id and user is logged in
    if (currentCard.id && userId) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        await fetch(`${API_URL}/flashcards/${currentCard.id}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_usuario: userId, knew }),
        });
      } catch (err) {
        console.error('Error submitting review:', err);
      }
    }

    if (isLastCard && user && user.id) {
      try {
        const fechaLocal = new Date().toISOString().split('T')[0];
        const res = await registrarActividad(user.id, 'flashcard', fechaLocal);

        if (res.primer_dia) {
          showToast('⚡ ¡Comenzaste tu racha! Estudia cada día para mantenerla viva.');
        } else if (res.nueva_racha) {
          showToast(`🔥 ¡Racha de ${res.racha} días! ¡Sigue así!`);
        }
      } catch (err) {
        console.error('Error registering activity:', err);
      }
    }

    setCardIdx((prev) => (prev + 1) % cards.length);
    setFlipped(false);
  };

  const closeBg = (e) => {
    if (e.target.id === 'flash-overlay') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="overlay show" id="flash-overlay" onClick={closeBg}>
      <div className="sheet">
        <div className="sheet-handle"></div>
        <div className="sheet-title">Flashcards</div>
        <div className="sheet-sub" id="flash-sub">{materiaName} · {cards.length} tarjetas</div>

        <div
          className="flashcard"
          id="flashcard"
          onClick={flipCard}
          style={{ background: flipped ? 'rgba(212,168,71,0.07)' : 'var(--s2)' }}
        >
          <div className="fc-question" style={{ display: flipped ? 'none' : '' }}>
            {cards[cardIdx].q}
          </div>
          <div className="fc-answer" style={{ display: flipped ? 'block' : 'none' }}>
            {cards[cardIdx].a}
          </div>
          <div className="fc-hint" style={{ display: flipped ? 'none' : '' }}>
            Toca para ver la respuesta
          </div>
        </div>

        <div className="fc-dots">
          {cards.map((_, i) => (
            <div key={i} className={`fc-dot ${i === cardIdx ? 'active' : ''}`}></div>
          ))}
        </div>

        <div className="fc-actions">
          <button className="btn-wrong" onClick={() => nextCard(false)}>✗ No sabía</button>
          <button className="btn-correct" onClick={() => nextCard(true)}>✓ Lo sabía</button>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;

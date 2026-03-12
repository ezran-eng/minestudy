import React, { useState, useEffect } from 'react';

const Flashcard = ({ isOpen, onClose, materiaName, customCards = null, userId = null, onFirstAction = null, onCardReviewed = null }) => {
  const defaultCards = [
    { q: '¿Cuál es la dureza del cuarzo en la escala de Mohs?', a: 'Dureza 7 — es uno de los minerales más comunes y resistentes de la corteza terrestre.' },
    { q: '¿Qué significa RQD en geomecánica?', a: 'Rock Quality Designation — mide la calidad de la roca según el porcentaje de testigos intactos mayores a 10 cm.' },
    { q: '¿Qué es la Ley de Corte?', a: 'La ley mínima de mineral para que sea económicamente rentable su extracción, considerando costos operativos y precio del metal.' },
    { q: '¿Qué mineral tiene estructura cúbica y clivaje perfecto en 3 direcciones?', a: 'La galena (PbS) — mineral principal del plomo, con clivaje cúbico perfecto y brillo metálico característico.' },
  ];

  const cards = customCards && customCards.length > 0 ? customCards : defaultCards;

  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const correctStreak = React.useRef(0);

  useEffect(() => {
    if (isOpen) {
      setCardIdx(0);
      setFlipped(false);
      correctStreak.current = 0;
      window.dispatchEvent(new CustomEvent('mascota:event', {
        detail: { accion: 'enter', pantalla: 'flashcards', datos: { cards_restantes: cards.length } },
      }));
    }
  }, [isOpen]); // eslint-disable-line

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

    if (cardIdx === 0) {
      onFirstAction?.();
    }

    onCardReviewed?.();

    // Mid-session mascot events
    if (knew) {
      correctStreak.current += 1;
      if (correctStreak.current >= 3) {
        window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'racha' } }));
      }
    } else {
      correctStreak.current = 0;
      window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'error' } }));
    }

    const remaining = cards.length - cardIdx - 1;
    if (remaining > 0 && remaining < 5) {
      window.dispatchEvent(new CustomEvent('mascota:event', {
        detail: { accion: 'pocas_cards', datos: { cards_restantes: remaining } },
      }));
    }

    if (cardIdx === cards.length - 1) {
      window.dispatchEvent(new CustomEvent('mascota:flashcard-complete'));
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

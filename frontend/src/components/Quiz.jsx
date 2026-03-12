import React, { useState, useEffect, useRef } from 'react';

const LETTER = ['A', 'B', 'C', 'D'];
const OPTS = ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'];

const Quiz = ({ isOpen, onClose, customQuestions, onFirstAnswer = null, onQuizFinish = null }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // Ref to avoid stale closure in goNext and onQuizFinish
  const correctCountRef = useRef(0);
  const correctStreakRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedOpt(null);
      setIsAnswered(false);
      setCorrectCount(0);
      correctCountRef.current = 0;
      correctStreakRef.current = 0;
      window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'enter' } }));
    }
  }, [isOpen, customQuestions]);

  const closeBg = (e) => {
    if (e.target.id === 'quiz-overlay') onClose();
  };

  const hasQuestions = customQuestions && customQuestions.length > 0;
  const currentQ = hasQuestions ? customQuestions[currentIndex] : null;

  const getCorrectIndex = () => {
    if (!currentQ) return -1;
    const c = currentQ.respuesta_correcta.toLowerCase();
    if (c === 'a') return 0;
    if (c === 'b') return 1;
    if (c === 'c') return 2;
    if (c === 'd') return 3;
    return -1;
  };
  const correctOpt = getCorrectIndex();

  const answerQuiz = (index) => {
    if (isAnswered) return;
    const isCorrect = index === correctOpt;
    console.log(`[Quiz] Q${currentIndex + 1}: selected=${index}, correctOpt=${correctOpt}, isCorrect=${isCorrect}, respuesta_correcta="${currentQ?.respuesta_correcta}", countBefore=${correctCountRef.current}`);
    setSelectedOpt(index);
    setIsAnswered(true);
    if (isCorrect) {
      correctCountRef.current += 1;
      correctStreakRef.current += 1;
      setCorrectCount(correctCountRef.current);
      console.log(`[Quiz] correctCount → ${correctCountRef.current}`);
      if (currentIndex === 0) {
        window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'primera_correcta' } }));
      } else if (correctStreakRef.current >= 3) {
        window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'racha' } }));
      }
    } else {
      correctStreakRef.current = 0;
      window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'incorrecta' } }));
    }
    if (currentIndex === 0) onFirstAnswer?.();
  };

  const goNext = () => {
    const isLast = currentIndex === customQuestions.length - 1;
    if (isLast) {
      const pct = Math.round((correctCountRef.current / customQuestions.length) * 100);
      window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'completado', datos: { porcentaje_correcto: pct } } }));
      onQuizFinish?.(correctCountRef.current, customQuestions.length);
      onClose();
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex === customQuestions.length - 1) {
        window.dispatchEvent(new CustomEvent('mascota:event', { detail: { accion: 'ultima_pregunta' } }));
      }
      setCurrentIndex(nextIndex);
      setSelectedOpt(null);
      setIsAnswered(false);
    }
  };

  const optClass = (i) => {
    if (!isAnswered) return '';
    if (i === correctOpt) return 'correct';
    if (i === selectedOpt) return 'wrong';
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="overlay show" id="quiz-overlay" onClick={closeBg}>
      <div className="sheet">
        <div className="sheet-handle"></div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 4px' }}>
          <div className="sheet-title" style={{ margin: 0 }}>Cuestionario</div>
          {hasQuestions && (
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text2)' }}>
              ✅ {correctCount} / {customQuestions.length}
            </div>
          )}
        </div>

        {!hasQuestions ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '15px' }}>Sin preguntas cargadas aún</div>
          </div>
        ) : (<>
          <div className="sheet-sub">
            {`Pregunta ${currentIndex + 1} de ${customQuestions.length}`}
          </div>
          <div className="quiz-question">{currentQ.pregunta}</div>
          <div className="quiz-options">
            {OPTS.map((key, i) => (
              <div
                key={i}
                className={`quiz-opt ${optClass(i)}`}
                onClick={() => answerQuiz(i)}
                style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
              >
                <div className="opt-letter">{LETTER[i]}</div>{currentQ[key]}
              </div>
            ))}
          </div>

          {isAnswered && (
            <div style={{ marginTop: '12px' }}>
              {currentQ.justificacion && (
                <div style={{
                  background: 'var(--s2)', borderRadius: '10px',
                  padding: '10px 14px', fontSize: '13px',
                  color: 'var(--text2)', marginBottom: '10px',
                  lineHeight: 1.5,
                }}>
                  💡 {currentQ.justificacion}
                </div>
              )}
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '15px', fontWeight: 600 }}
                onClick={goNext}
              >
                {currentIndex === customQuestions.length - 1 ? 'Finalizar' : 'Siguiente →'}
              </button>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
};

export default Quiz;

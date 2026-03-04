import React, { useState, useEffect } from 'react';

const Quiz = ({ isOpen, onClose, customQuestions, onFirstAnswer = null }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setSelectedOpt(null);
      setIsAnswered(false);
    }
  }, [isOpen, customQuestions]);

  const closeBg = (e) => {
    if (e.target.id === 'quiz-overlay') {
      onClose();
    }
  };

  const hasQuestions = customQuestions && customQuestions.length > 0;
  const currentQ = hasQuestions ? customQuestions[currentIndex] : null;

  const getCorrectIndex = () => {
      if (!currentQ) return -1;
      const correct = currentQ.respuesta_correcta.toLowerCase();
      if (correct === 'a') return 0;
      if (correct === 'b') return 1;
      if (correct === 'c') return 2;
      if (correct === 'd') return 3;
      return -1;
  };
  const correctOpt = getCorrectIndex();

  const answerQuiz = async (index, isCorrect) => {
    if (isAnswered) return;

    setSelectedOpt(index);
    setIsAnswered(true);

    const isLast = !hasQuestions || currentIndex === customQuestions.length - 1;

    if (currentIndex === 0) {
      onFirstAnswer?.();
    }

    setTimeout(() => {
      if (isLast) {
          onClose();
      } else {
          setCurrentIndex(prev => prev + 1);
          setIsAnswered(false);
          setSelectedOpt(null);
      }
    }, 1600);
  };

  if (!isOpen) return null;

  return (
    <div className="overlay show" id="quiz-overlay" onClick={closeBg}>
      <div className="sheet">
        <div className="sheet-handle"></div>
        <div className="sheet-title">Cuestionario</div>
        {!hasQuestions ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '15px' }}>Sin preguntas cargadas aún</div>
          </div>
        ) : (<>
        <div className="sheet-sub">
            {`Pregunta ${currentIndex + 1} de ${customQuestions.length}`}
        </div>
        <div className="quiz-question">
          {currentQ.pregunta}
        </div>
        <div className="quiz-options">
          <div
            className={`quiz-opt ${isAnswered && 0 === correctOpt ? 'correct' : isAnswered && selectedOpt === 0 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(0, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">A</div>{currentQ.opcion_a}
          </div>

          <div
            className={`quiz-opt ${isAnswered && 1 === correctOpt ? 'correct' : isAnswered && selectedOpt === 1 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(1, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">B</div>{currentQ.opcion_b}
          </div>

          <div
            className={`quiz-opt ${isAnswered && 2 === correctOpt ? 'correct' : isAnswered && selectedOpt === 2 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(2, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">C</div>{currentQ.opcion_c}
          </div>

          <div
            className={`quiz-opt ${isAnswered && 3 === correctOpt ? 'correct' : isAnswered && selectedOpt === 3 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(3, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">D</div>{currentQ.opcion_d}
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
};

export default Quiz;

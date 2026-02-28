import React, { useState, useEffect } from 'react';

const Quiz = ({ isOpen, onClose }) => {
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [correctOpt] = useState(2); // C is correct index
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedOpt(null);
      setIsAnswered(false);
    }
  }, [isOpen]);

  const closeBg = (e) => {
    if (e.target.id === 'quiz-overlay') {
      onClose();
    }
  };

  const answerQuiz = (index, isCorrect) => {
    if (isAnswered) return;

    setSelectedOpt(index);
    setIsAnswered(true);

    setTimeout(() => {
      onClose();
    }, 1600);
  };

  if (!isOpen) return null;

  return (
    <div className="overlay show" id="quiz-overlay" onClick={closeBg}>
      <div className="sheet">
        <div className="sheet-handle"></div>
        <div className="sheet-title">Quiz IA</div>
        <div className="sheet-sub">Generado desde tus materiales</div>
        <div className="quiz-question">
          ¿Cuál es el EPP obligatorio en toda operación subterránea según normativa vigente?
        </div>
        <div className="quiz-options">
          <div
            className={`quiz-opt ${isAnswered && 0 === correctOpt ? 'correct' : isAnswered && selectedOpt === 0 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(0, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">A</div>Chaleco reflectante solamente
          </div>

          <div
            className={`quiz-opt ${isAnswered && 1 === correctOpt ? 'correct' : isAnswered && selectedOpt === 1 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(1, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">B</div>Guantes y lentes de seguridad
          </div>

          <div
            className={`quiz-opt ${isAnswered && 2 === correctOpt ? 'correct' : isAnswered && selectedOpt === 2 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(2, true)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">C</div>Casco, lámpara, botas con puntera de acero y autorescatador
          </div>

          <div
            className={`quiz-opt ${isAnswered && 3 === correctOpt ? 'correct' : isAnswered && selectedOpt === 3 ? 'wrong' : ''}`}
            onClick={() => answerQuiz(3, false)}
            style={{ pointerEvents: isAnswered ? 'none' : 'auto' }}
          >
            <div className="opt-letter">D</div>Solo casco y botas
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;

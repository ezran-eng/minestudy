import { useState, useEffect, useCallback } from 'react';

export function useTypewriter(bubble, speed = 40) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    const text = bubble?.text ?? '';
    if (!text) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [bubble?.id]); // eslint-disable-line

  const skip = useCallback(() => setDisplayed(bubble?.text ?? ''), [bubble]);

  return { displayed, skip };
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import { useNavigate } from 'react-router-dom';
import mascotaData from '../assets/lotties/mascota.json';
import { useMascotaHint } from '../hooks/useQueryHooks';

const STORAGE_KEY = 'mascota_v1';
const IDLE_MS = 30_000;
const BUBBLE_MS = 4_500;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const MSGS = {
  grab:  ['¡Ey! 😮', '¡Me agarraste!', '¡Cuidado! 😅'],
  drag:  ['¡Wheee! 🎉', '¡Me movés!', 'Volando 🚀'],
  drop:  ['¡Gracias! 😊', 'Nueva vista 🎯', 'Aquí me quedo 🏠'],
  open:  ['¡Hola! 💪 A estudiar', '¡Bienvenido! 🌟', '¡Listo para aprender! 🚀'],
  done:  ['¡Excelente! 🌟', '¡Sos una máquina! 💪', '¡Gran trabajo! 🔥'],
  sleep: ['Zzz... 😴', '¿Seguís ahí? 👀', 'Descansando 🌙'],
  back:  ['¡De vuelta! 👋', '¿Qué me perdí? 👀', '¡Bienvenido de vuelta! 🎉'],
};

const loadStorage = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

export default function Mascota({ userId }) {
  const navigate = useNavigate();
  const { data: hint } = useMascotaHint(userId);

  const [visible, setVisible] = useState(() => loadStorage().visible !== false);
  const [pos, setPos] = useState(() => {
    const p = loadStorage().pos;
    return p || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
  });
  const [bubble, setBubble] = useState(null);
  const [sleeping, setSleeping] = useState(false);

  const posRef = useRef(pos);
  posRef.current = pos;

  const dragging = useRef(false);
  const wasDragging = useRef(false);
  const dragStart = useRef({});
  const idleTimer = useRef(null);
  const bubbleTimer = useRef(null);
  const greeted = useRef(false);

  // Persist visible + pos
  useEffect(() => {
    const prev = loadStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, visible, pos }));
  }, [visible, pos]);

  const showBubble = useCallback((text) => {
    setSleeping(false);
    clearTimeout(bubbleTimer.current);
    setBubble({ text, id: Date.now() });
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
  }, []);

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    setSleeping(false);
    idleTimer.current = setTimeout(() => {
      setSleeping(true);
      setBubble({ text: pick(MSGS.sleep), id: Date.now() });
    }, IDLE_MS);
  }, []);

  // One-time greeting on first visible mount
  useEffect(() => {
    if (!visible || greeted.current) return;
    greeted.current = true;
    showBubble(pick(MSGS.open));
    resetIdle();
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(bubbleTimer.current);
    };
  }, [visible]); // eslint-disable-line

  // Hint bubble — show flashcard reminder 5s after mount if there are due cards
  const hintDue = hint?.flashcards_due ?? 0;
  useEffect(() => {
    if (!visible || hintDue <= 0) return;
    const t = setTimeout(() => {
      showBubble(`Tenés ${hintDue} flashcard${hintDue !== 1 ? 's' : ''} para repasar 🃏`);
    }, 5000);
    return () => clearTimeout(t);
  }, [hintDue, visible]); // eslint-disable-line

  // Return from background
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && visible) {
        showBubble(pick(MSGS.back));
        resetIdle();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [visible, showBubble, resetIdle]);

  // Flashcard complete
  useEffect(() => {
    const handler = () => { if (visible) showBubble(pick(MSGS.done)); };
    window.addEventListener('mascota:flashcard-complete', handler);
    return () => window.removeEventListener('mascota:flashcard-complete', handler);
  }, [visible, showBubble]);

  // Show from Profile
  useEffect(() => {
    const handler = () => {
      setVisible(true);
      showBubble(pick(MSGS.open));
      resetIdle();
    };
    window.addEventListener('mascota:show', handler);
    return () => window.removeEventListener('mascota:show', handler);
  }, [showBubble, resetIdle]);

  // Drag with pointer events
  const onPointerDown = useCallback((e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wasDragging.current = false;
    dragging.current = false;
    dragStart.current = {
      px: e.clientX,
      py: e.clientY,
      ox: posRef.current.x,
      oy: posRef.current.y,
    };
    showBubble(pick(MSGS.grab));
    resetIdle();

    const onMove = (ev) => {
      const dx = ev.clientX - dragStart.current.px;
      const dy = ev.clientY - dragStart.current.py;
      if (!dragging.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragging.current = true;
        wasDragging.current = true;
        showBubble(pick(MSGS.drag));
      }
      if (dragging.current) {
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - 64, dragStart.current.ox + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 64, dragStart.current.oy + dy)),
        });
      }
    };

    const onUp = () => {
      if (dragging.current) showBubble(pick(MSGS.drop));
      dragging.current = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [showBubble, resetIdle]);

  const onTap = useCallback(() => {
    if (wasDragging.current) { wasDragging.current = false; return; }
    resetIdle();
    if (!hint || hint.materia_id == null || hint.unidad_id == null) return;
    navigate(`/materia/${hint.materia_id}/unidad/${hint.unidad_id}`);
  }, [hint, navigate, resetIdle]);

  if (!visible) return null;

  const bubbleAbove = pos.y > 120;
  const bubbleLeft = pos.x > window.innerWidth * 0.55;

  return (
    <div style={{
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      zIndex: 1000,
      touchAction: 'none',
      userSelect: 'none',
    }}>
      {/* Speech bubble */}
      {bubble && (
        <div
          key={bubble.id}
          style={{
            position: 'absolute',
            [bubbleAbove ? 'bottom' : 'top']: '72px',
            [bubbleLeft ? 'right' : 'left']: '0',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
            padding: '8px 12px',
            fontSize: '13px',
            color: '#fff',
            maxWidth: '180px',
            lineHeight: 1.4,
            animation: 'mascota-pop 0.18s ease-out',
            pointerEvents: 'none',
            whiteSpace: 'normal',
          }}
        >
          {bubble.text}
          {hint && hint.flashcards_due > 0 && bubble.text.includes('flashcard') && (
            <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
              Tocame →
            </div>
          )}
        </div>
      )}

      {/* X button */}
      <button
        onClick={(e) => { e.stopPropagation(); setVisible(false); }}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: 'var(--text2)',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          padding: 0,
          lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        ×
      </button>

      {/* Lottie mascot */}
      <div
        onPointerDown={onPointerDown}
        onClick={onTap}
        style={{
          width: 64,
          height: 64,
          cursor: 'grab',
          opacity: sleeping ? 0.5 : 1,
          transition: 'opacity 0.5s, filter 0.5s',
          filter: sleeping ? 'grayscale(60%)' : 'none',
        }}
      >
        <Lottie
          animationData={mascotaData}
          loop={!sleeping}
          autoplay={!sleeping}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

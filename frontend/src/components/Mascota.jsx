import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import { useNavigate } from 'react-router-dom';
import mascotaData from '../assets/lotties/mascota.json';
import { useMascotaHint, useMateriaResumen } from '../hooks/useQueryHooks';
import { useMascotaContext } from '../hooks/useMascotaContext';

const STORAGE_KEY = 'mascota_v1';
const IDLE_MS = 30_000;
const BUBBLE_MS = 4_500;
const BLUR_MS = 3_000;

const loadStorage = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

function useTypewriter(bubble, speed = 40) {
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

export default function Mascota({ userId }) {
  const navigate = useNavigate();
  const { data: hint } = useMascotaHint(userId);
  const { getMascotaResponse } = useMascotaContext();

  const getMascotaResponseRef = useRef(getMascotaResponse);
  getMascotaResponseRef.current = getMascotaResponse;

  const [pos, setPos] = useState(() => {
    const p = loadStorage().pos;
    return p || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
  });
  const [bubble, setBubble] = useState(null);
  const [sleeping, setSleeping] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [draggingOverMateria, setDraggingOverMateria] = useState(false);
  const [resumenMateriaId, setResumenMateriaId] = useState(null);

  const { data: resumenData } = useMateriaResumen(resumenMateriaId, userId);

  const { displayed, skip } = useTypewriter(bubble);

  // Assign directly — no useEffect needed to keep a ref in sync with render data
  const resumenDataRef = useRef(null);
  resumenDataRef.current = resumenData ?? null;

  // posRef tracks the latest position for use inside closures and bubble positioning
  const posRef = useRef(pos);
  posRef.current = pos;

  const mascotaRef = useRef(null); // DOM ref for zero-rerender drag via CSS transform

  const hoveredMateriaIdRef = useRef(null);
  const hoveredMateriaDataRef = useRef(null);
  const hoverDebounceRef = useRef(null);

  const dragging = useRef(false);
  const wasDragging = useRef(false);
  const dragStart = useRef({});
  const idleTimer = useRef(null);
  const bubbleTimer = useRef(null);
  const blurTimer = useRef(null);
  const greeted = useRef(false);

  const showBubble = useCallback((text) => {
    if (!text) return;
    setSleeping(false);
    clearTimeout(bubbleTimer.current);
    clearTimeout(blurTimer.current);
    setBubble({ text, id: Date.now() });
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
    setIsBlurActive(true);
    blurTimer.current = setTimeout(() => setIsBlurActive(false), BLUR_MS);
  }, []);

  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    setSleeping(false);
    idleTimer.current = setTimeout(() => {
      setSleeping(true);
      const msg = getMascotaResponseRef.current('idle') || 'Zzz... 😴';
      setBubble({ text: msg, id: Date.now() });
    }, IDLE_MS);
  }, []);

  // One-time greeting on first mount
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    showBubble(getMascotaResponseRef.current('app_open'));
    resetIdle();
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(bubbleTimer.current);
    };
  }, []); // eslint-disable-line

  // Hint bubble — flashcard reminder 5s after mount
  const hintDue = hint?.flashcards_due ?? 0;
  useEffect(() => {
    if (hintDue <= 0) return;
    const t = setTimeout(() => {
      showBubble(getMascotaResponseRef.current('enter', { flashcards_vencidas: hintDue }));
    }, 5000);
    return () => clearTimeout(t);
  }, [hintDue]); // eslint-disable-line

  // Return from background
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        showBubble(getMascotaResponseRef.current('return_from_bg'));
        resetIdle();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [showBubble, resetIdle]);

  // Flashcard session complete
  useEffect(() => {
    const handler = () => showBubble(getMascotaResponseRef.current('flashcard_complete'));
    window.addEventListener('mascota:flashcard-complete', handler);
    return () => window.removeEventListener('mascota:flashcard-complete', handler);
  }, [showBubble]);

  // Mid-session events from Quiz / Flashcard / screens
  useEffect(() => {
    const handler = (e) => {
      const { accion, datos = {}, pantalla: eventPantalla } = e.detail;
      const msg = getMascotaResponseRef.current(accion, datos, eventPantalla || null);
      if (msg) { showBubble(msg); resetIdle(); }
    };
    window.addEventListener('mascota:event', handler);
    return () => window.removeEventListener('mascota:event', handler);
  }, [showBubble, resetIdle]);

  // Drag — zero React re-renders during movement via CSS transform
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
    showBubble(getMascotaResponseRef.current('grab'));
    resetIdle();

    // Cache card rects once at drag start — no querySelectorAll/getBoundingClientRect per frame
    const cardCache = [];
    document.querySelectorAll('[data-materia-id]').forEach(card => {
      cardCache.push({
        rect: card.getBoundingClientRect(),
        id: card.dataset.materiaId,
        nombre: card.dataset.materiaNombre,
        progreso: parseInt(card.dataset.materiaProgreso || '0'),
        unidades: parseInt(card.dataset.materiaUnidades || '0'),
      });
    });

    const onMove = (ev) => {
      const dx = ev.clientX - dragStart.current.px;
      const dy = ev.clientY - dragStart.current.py;

      if (!dragging.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        dragging.current = true;
        wasDragging.current = true;
        showBubble(getMascotaResponseRef.current('drag'));
      }

      if (!dragging.current) return;

      // Move via CSS transform — React state never touched during drag
      const newX = Math.max(0, Math.min(window.innerWidth - 64, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 64, dragStart.current.oy + dy));
      mascotaRef.current.style.transform = `translate(${newX - dragStart.current.ox}px, ${newY - dragStart.current.oy}px)`;
      posRef.current = { x: newX, y: newY };

      // Hit-test against cached rects
      let foundId = null;
      let foundData = null;
      for (const item of cardCache) {
        const { rect } = item;
        if (ev.clientX >= rect.left && ev.clientX <= rect.right &&
            ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          foundId = item.id;
          foundData = { id: item.id, nombre: item.nombre, progreso: item.progreso, unidades: item.unidades };
          break;
        }
      }

      if (foundId !== hoveredMateriaIdRef.current) {
        hoveredMateriaIdRef.current = foundId;
        hoveredMateriaDataRef.current = foundData;
        clearTimeout(hoverDebounceRef.current);
        if (foundId) {
          setDraggingOverMateria(true);
          window.dispatchEvent(new CustomEvent('mascota:hover-materia', { detail: foundData }));
          showBubble(getMascotaResponseRef.current('hover_materia', foundData, 'study'));
          hoverDebounceRef.current = setTimeout(() => setResumenMateriaId(foundId), 200);
        } else {
          setDraggingOverMateria(false);
          window.dispatchEvent(new CustomEvent('mascota:hover-none'));
        }
      }
    };

    const onUp = () => {
      if (dragging.current) {
        // Single state update + single localStorage write at drop
        const finalPos = posRef.current;
        mascotaRef.current.style.transform = 'none';
        setPos(finalPos);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ pos: finalPos }));

        if (hoveredMateriaIdRef.current) {
          const datos = {
            ...(hoveredMateriaDataRef.current ?? {}),
            ...(resumenDataRef.current ?? {}),
          };
          showBubble(getMascotaResponseRef.current('drop_materia', datos, 'study'));
          window.dispatchEvent(new CustomEvent('mascota:hover-none'));
          hoveredMateriaIdRef.current = null;
          hoveredMateriaDataRef.current = null;
          clearTimeout(hoverDebounceRef.current);
          setResumenMateriaId(null);
          setTimeout(() => setDraggingOverMateria(false), BUBBLE_MS);
        } else {
          showBubble(getMascotaResponseRef.current('drop'));
        }
      }
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

  // Bubble position uses posRef — current even when pos state is stale during drag
  const bubbleAbove = posRef.current.y > 150;
  const bubbleLeft = posRef.current.x > window.innerWidth / 2;

  return (
    <>
    {/* Blur overlay — suppressed during materia drag (Study.jsx handles card blur) */}
    {isBlurActive && !draggingOverMateria && (
      <div
        onClick={() => { clearTimeout(blurTimer.current); setIsBlurActive(false); }}
        style={{
          position: 'fixed',
          inset: 0,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 999,
          animation: 'mascota-blur-in 0.3s ease-out',
        }}
      />
    )}

    <div
      ref={mascotaRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 1001,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {/* Speech bubble */}
      {bubble && (
        <div
          key={bubble.id}
          onClick={skip}
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
            padding: '14px 18px',
            fontSize: '13px',
            fontFamily: "'Silkscreen', cursive",
            color: '#fff',
            maxWidth: 'min(320px, 80vw)',
            minWidth: '200px',
            width: 'fit-content',
            lineHeight: 1.6,
            animation: 'mascota-pop 0.18s ease-out',
            cursor: 'pointer',
            whiteSpace: 'normal',
          }}
        >
          {displayed}
          {hint && hint.flashcards_due > 0 && bubble.text.includes('flashcard') && displayed === bubble.text && (
            <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>
              Tocame →
            </div>
          )}
        </div>
      )}

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
          filter: sleeping
            ? 'grayscale(60%)'
            : isBlurActive
              ? undefined
              : 'none',
          animation: isBlurActive && !sleeping ? 'aurora-pulse 1.5s ease-in-out infinite alternate' : 'none',
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
    </>
  );
}

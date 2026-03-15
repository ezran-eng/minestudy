import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';
import tamagadgetIconData from '../assets/lotties/tamagadgetIcon.json';
import { useMascotaHint, useMateriaResumen } from '../hooks/useQueryHooks';
import { useMascotaContext } from '../hooks/useMascotaContext';

const STORAGE_KEY = 'mascota_v1';
const IDLE_MS = 30_000;
const BUBBLE_MS = 4_500;
const BLUR_MS = 3_000;

// Adjust these if segments don't align perfectly with the animation
const SEG_FULL  = [60, 240]; // sit → head → wave (full)
const SEG_IDLE  = [67, 89];  // head tilt 0°→12.4° — ping-pong for breathing
const SEG_GRAB  = [130, 131]; // arm at -117.8° (fully raised) — 1-frame freeze

const loadStorage = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

const saveStorage = (patch) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadStorage(), ...patch })); } catch { /* ignore */ }
};

// ── Transition effects ──────────────────────────────────────────────────
const EFFECT_TYPES = ['thanos', 'pokeball', 'portal', 'teleport'];
const EFFECT_DURATION = 850;
const pickRandomEffect = () => EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];

function _p(parent, styles, keyframes, opts) {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'absolute', ...styles });
  parent.appendChild(el);
  el.animate(keyframes, { fill: 'forwards', ...opts });
}

function _effectThanos(c) {
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const d = 50 + Math.random() * 120, s = 2 + Math.random() * 6;
    const h = 35 + Math.random() * 25;
    _p(c, {
      width: `${s}px`, height: `${s}px`, left: '32px', top: '32px',
      borderRadius: Math.random() > 0.4 ? '50%' : '2px',
      background: `hsl(${h},${75 + Math.random() * 25}%,${55 + Math.random() * 20}%)`,
      boxShadow: `0 0 ${s + 2}px hsl(${h},80%,60%)`,
    }, [
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(0) rotate(${180 + Math.random() * 360}deg)`, opacity: 0 },
    ], { duration: 500 + Math.random() * 400, delay: Math.random() * 200, easing: 'cubic-bezier(.25,.46,.45,.94)' });
  }
}

function _effectPokeball(c) {
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    background: 'radial-gradient(circle,#fff 0%,rgba(255,255,255,.8) 40%,transparent 70%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(6)', opacity: 0 },
  ], { duration: 500, easing: 'ease-out' });
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    border: '3px solid #ff4444', background: 'transparent',
    boxShadow: '0 0 15px rgba(255,68,68,.5),inset 0 0 10px rgba(255,68,68,.3)',
  }, [
    { transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(4)', opacity: 0, borderWidth: '1px' },
  ], { duration: 600, delay: 50, easing: 'ease-out' });
  _p(c, {
    left: '50%', top: '50%', width: '15px', height: '15px', borderRadius: '50%',
    border: '2px solid #fff', background: 'transparent', boxShadow: '0 0 10px rgba(255,255,255,.5)',
  }, [
    { transform: 'translate(-50%,-50%) scale(.5)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(5)', opacity: 0, borderWidth: '.5px' },
  ], { duration: 700, delay: 100, easing: 'ease-out' });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, d = 50 + Math.random() * 40, s = 3 + Math.random() * 3;
    const color = i % 2 ? '#fff' : '#ff4444';
    _p(c, {
      left: '32px', top: '32px', width: `${s}px`, height: `${s}px`,
      borderRadius: '50%', background: color, boxShadow: `0 0 ${s + 2}px ${color}`,
    }, [
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
    ], { duration: 400 + Math.random() * 200, delay: 100 + Math.random() * 150, easing: 'ease-out' });
  }
}

function _effectPortal(c) {
  _p(c, {
    left: '50%', top: '50%', width: '10px', height: '12px', borderRadius: '50%',
    background: 'conic-gradient(from 0deg,#00ff41,#00cc33,#39ff14,#00ff41)',
    boxShadow: '0 0 30px rgba(0,255,65,.6),0 0 60px rgba(0,255,65,.3)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0) rotate(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(4) rotate(360deg)', opacity: 1, offset: 0.3 },
    { transform: 'translate(-50%,-50%) scale(3.5) rotate(720deg)', opacity: 1, offset: 0.7 },
    { transform: 'translate(-50%,-50%) scale(0) rotate(1080deg)', opacity: 0 },
  ], { duration: 800, easing: 'ease-in-out' });
  _p(c, {
    left: '50%', top: '50%', width: '6px', height: '7px', borderRadius: '50%',
    background: 'conic-gradient(from 180deg,#39ff14,transparent,#00ff41,transparent,#39ff14)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0) rotate(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(3) rotate(-720deg)', opacity: .8, offset: 0.3 },
    { transform: 'translate(-50%,-50%) scale(2.5) rotate(-1440deg)', opacity: .8, offset: 0.7 },
    { transform: 'translate(-50%,-50%) scale(0) rotate(-2160deg)', opacity: 0 },
  ], { duration: 800, easing: 'ease-in-out' });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, d = 30 + Math.random() * 50, s = 2 + Math.random() * 3;
    _p(c, {
      left: '32px', top: '32px', width: `${s}px`, height: `${s}px`,
      borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 4px #00ff41',
    }, [
      { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * .5}px),calc(-50% + ${Math.sin(a) * d * .5}px)) scale(1)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) scale(0)`, opacity: 0 },
    ], { duration: 600 + Math.random() * 200, delay: 100 + Math.random() * 200, easing: 'ease-out' });
  }
}

function _effectTeleport(c) {
  _p(c, {
    left: '50%', top: '50%', width: '40px', height: '80px', borderRadius: '20px',
    background: 'linear-gradient(180deg,transparent,rgba(0,200,255,.4),rgba(0,200,255,.8),rgba(0,200,255,.4),transparent)',
  }, [
    { transform: 'translate(-50%,-50%) scaleY(0) scaleX(2)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scaleY(1.5) scaleX(1)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-50%) scaleY(1.2) scaleX(.8)', opacity: .8, offset: 0.6 },
    { transform: 'translate(-50%,-50%) scaleY(3) scaleX(0)', opacity: 0 },
  ], { duration: 700, easing: 'ease-in-out' });
  _p(c, {
    left: '50%', width: '60px', height: '2px',
    background: 'linear-gradient(90deg,transparent,#00d4ff,#fff,#00d4ff,transparent)',
    boxShadow: '0 0 10px #00d4ff',
  }, [
    { top: '-20px', opacity: 0, transform: 'translateX(-50%)' },
    { top: '10px', opacity: 1, transform: 'translateX(-50%)', offset: 0.1 },
    { top: '54px', opacity: 1, transform: 'translateX(-50%)', offset: 0.9 },
    { top: '84px', opacity: 0, transform: 'translateX(-50%)' },
  ], { duration: 500, delay: 100, easing: 'linear' });
  _p(c, {
    left: '50%', top: '50%', width: '30px', height: '30px', borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(0,212,255,.8) 0%,transparent 70%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(2)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-50%) scale(1.5)', opacity: .6, offset: 0.7 },
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
  ], { duration: 600, delay: 50, easing: 'ease-in-out' });
  for (let i = 0; i < 14; i++) {
    const w = 3 + Math.random() * 15, h = 1 + Math.random() * 3;
    const ox = (Math.random() - 0.5) * 50, oy = (Math.random() - 0.5) * 70;
    const color = Math.random() > .5 ? '#00d4ff' : '#fff';
    _p(c, {
      left: `${32 + ox}px`, top: `${32 + oy}px`, width: `${w}px`, height: `${h}px`,
      background: color, boxShadow: `0 0 4px ${color}`,
    }, [
      { opacity: 0, transform: 'scaleX(0)' },
      { opacity: 1, transform: 'scaleX(1)', offset: 0.1 + Math.random() * 0.2 },
      { opacity: 1, transform: `scaleX(1) translateX(${(Math.random() - 0.5) * 30}px)`, offset: 0.5 + Math.random() * 0.2 },
      { opacity: 0, transform: 'scaleX(0)' },
    ], { duration: 400 + Math.random() * 300, delay: Math.random() * 200, easing: 'ease-in-out' });
  }
}

const EFFECT_MAP = { thanos: _effectThanos, pokeball: _effectPokeball, portal: _effectPortal, teleport: _effectTeleport };

function TransitionEffect({ type, x, y, onComplete }) {
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(onComplete, EFFECT_DURATION); return () => clearTimeout(t); }, [onComplete]);
  useEffect(() => { if (ref.current) EFFECT_MAP[type]?.(ref.current); }, [type]);
  return <div ref={ref} style={{ position: 'fixed', left: x, top: y, width: 64, height: 64, zIndex: 1100, pointerEvents: 'none' }} />;
}

// ── Typewriter hook ─────────────────────────────────────────────────────
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
  const { data: hint } = useMascotaHint(userId);
  const { getMascotaResponse } = useMascotaContext();

  const getMascotaResponseRef = useRef(getMascotaResponse);
  getMascotaResponseRef.current = getMascotaResponse;

  const [activa, setActiva] = useState(() => loadStorage().mascota_activa !== false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [pos, setPos] = useState(() => {
    const p = loadStorage().pos;
    return p || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
  });
  const [bubble, setBubble] = useState(null);
  const [sleeping, setSleeping] = useState(false);
  const [isBlurActive, setIsBlurActive] = useState(false);
  const [draggingOverMateria, setDraggingOverMateria] = useState(false);
  const [resumenMateriaId, setResumenMateriaId] = useState(null);
  const [transition, setTransition] = useState(null);

  const { data: resumenData } = useMateriaResumen(resumenMateriaId, userId);

  const { displayed, skip } = useTypewriter(bubble);

  const resumenDataRef = useRef(null);
  resumenDataRef.current = resumenData ?? null;

  const posRef = useRef(pos);

  const mascotaRef = useRef(null);
  const bubbleRef = useRef(null);
  const mascotaLottieRef = useRef(null);
  // 'intro' | 'idle-loop' | 'outro'
  const mascotaModeRef = useRef('intro');
  const idleDirectionRef = useRef(1); // ping-pong direction: 1 = forward, -1 = backward
  const isDraggingRef = useRef(false); // blocks ping-pong onComplete while dragging

  // Key-only counter — forces Lottie remount; mode read from mascotaModeRef in useEffect
  const [lottieKey, setLottieKey] = useState(0);

  // Icon refs — declared before any callback that references them
  const iconModeRef = useRef('idle'); // 'idle' | 'sleeping' | 'waking'
  const lottieIconRef = useRef(null);
  const [iconKey, setIconKey] = useState(0); // forces clean Lottie remount for icon

  const hoveredMateriaIdRef = useRef(null);
  const hoveredMateriaDataRef = useRef(null);
  const hoverDebounceRef = useRef(null);

  const dragging = useRef(false);
  // Only sync posRef from state when not dragging — during drag, onMove owns posRef
  if (!dragging.current) posRef.current = pos;
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

  // Reset to intro animation whenever mascota (re)activates
  useEffect(() => {
    if (!activa) return;
    mascotaModeRef.current = 'intro';
    setLottieKey(k => k + 1);
  }, [activa]);

  // Single effect handles all playback — autoplay=false so this is the only trigger
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (mascotaModeRef.current === 'idle-loop') {
        mascotaLottieRef.current?.setSpeed(0.22);
        mascotaLottieRef.current?.playSegments(SEG_IDLE, true);
      } else {
        // intro or outro
        mascotaLottieRef.current?.setSpeed(1);
        mascotaLottieRef.current?.playSegments(SEG_FULL, true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [lottieKey]); // eslint-disable-line

  // Pause/resume lottie when sleeping state changes
  useEffect(() => {
    if (sleeping) {
      mascotaLottieRef.current?.pause();
    } else if (mascotaModeRef.current === 'idle-loop') {
      mascotaLottieRef.current?.play();
    }
  }, [sleeping]);

  // Sync transform after pos commits — eliminates the 1-frame window where
  // mascota appears at the old position (transform cleared, new left/top not painted yet)
  useLayoutEffect(() => {
    if (mascotaRef.current) mascotaRef.current.style.transform = '';
  }, [pos]);

  // When intro or outro finishes: switch to idle loop or execute apagar
  // During idle-loop: ping-pong by flipping direction each complete
  const onMascotaComplete = useCallback(() => {
    if (mascotaModeRef.current === 'outro') {
      saveStorage({ mascota_activa: false });
      iconModeRef.current = 'sleeping';
      // Transition effect at mascota position — mascota stays visible 150ms behind the effect
      setTransition({ type: pickRandomEffect(), x: posRef.current.x, y: posRef.current.y });
      setTimeout(() => setActiva(false), 150);
      return;
    }
    if (mascotaModeRef.current === 'intro') {
      mascotaModeRef.current = 'idle-loop';
      idleDirectionRef.current = 1;
      setLottieKey(k => k + 1);
      return;
    }
    if (mascotaModeRef.current === 'idle-loop' && !isDraggingRef.current) {
      // Ping-pong: flip direction only — DO NOT reset segment with playSegments(forceFlag)
      // playhead is already at the end of the segment, play() continues from there
      idleDirectionRef.current *= -1;
      mascotaLottieRef.current?.setDirection(idleDirectionRef.current);
      mascotaLottieRef.current?.play();
    }
  }, []); // eslint-disable-line

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
    isDraggingRef.current = false;

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
        isDraggingRef.current = true;
        setMenuOpen(false);
        showBubble(getMascotaResponseRef.current('drag'));
        // Freeze at raised-arm frame — held by the hand during drag
        // playSegments([130,131]) escapes the current active segment, then pause()
        if (mascotaModeRef.current === 'idle-loop') {
          mascotaLottieRef.current?.playSegments(SEG_GRAB, true);
          mascotaLottieRef.current?.pause();
        }
      }

      if (!dragging.current) return;

      // Move via CSS transform — React state never touched during drag
      const newX = Math.max(0, Math.min(window.innerWidth - 64, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 64, dragStart.current.oy + dy));
      mascotaRef.current.style.transform = `translate(${newX - dragStart.current.ox}px, ${newY - dragStart.current.oy}px)`;
      posRef.current = { x: newX, y: newY };

      // Reposition bubble via DOM — no re-render, stays within screen midpoints
      if (bubbleRef.current) {
        const above = newY > 150;
        const toLeft = newX > window.innerWidth / 2;
        bubbleRef.current.style.bottom = above ? '72px' : '';
        bubbleRef.current.style.top    = above ? '' : '72px';
        bubbleRef.current.style.right  = toLeft ? '0' : '';
        bubbleRef.current.style.left   = toLeft ? '' : '0';
      }

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
        // transform is cleared synchronously by useLayoutEffect([pos]) after React commits
        const finalPos = posRef.current;
        setPos(finalPos);
        saveStorage({ pos: finalPos });

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
      // Resume idle ping-pong only if we actually dragged
      isDraggingRef.current = false;
      if (dragging.current && mascotaModeRef.current === 'idle-loop') {
        idleDirectionRef.current = 1;
        mascotaLottieRef.current?.setDirection(1);
        mascotaLottieRef.current?.playSegments(SEG_IDLE, true);
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
    setMenuOpen(prev => !prev);
  }, [resetIdle]);

  const apagar = useCallback(() => {
    setMenuOpen(false);
    // Play full animation, then hide in onMascotaComplete
    mascotaModeRef.current = 'outro';
    setLottieKey(k => k + 1);
  }, []);

  const activar = useCallback(() => {
    saveStorage({ mascota_activa: true });
    setActiva(true);
    // useEffect [activa] will fire and play intro animation
  }, []);

  const clearTransition = useCallback(() => setTransition(null), []);

  // --- Icon logic ---
  // Strategy: use autoplay prop + key remount instead of imperative playSegments.
  // This avoids all the lottie-web edge cases with playSegments/goToAndStop/onComplete
  // in Telegram WebView. The icon has 3 visual states:
  //   'idle'     → static at frame 0 (autoplay=false, no animation)
  //   'sleeping' → plays once automatically (autoplay=true, set by outro completing)
  //   'waking'   → plays once automatically (autoplay=true, set by user tap)
  // After sleeping/waking animation completes, onIconComplete handles transition.

  // Whether the icon Lottie should autoplay (true for sleeping & waking animations)
  const iconShouldAutoplay = iconModeRef.current === 'sleeping' || iconModeRef.current === 'waking';

  const onIconDOMLoaded = useCallback(() => {
    const lottie = lottieIconRef.current;
    if (!lottie) return;
    lottie.setSpeed(2.5);
    // If idle, freeze at first visible frame
    if (iconModeRef.current === 'idle') {
      lottie.goToAndStop(0, true);
    }
  }, []);

  const onIconTap = useCallback(() => {
    if (iconModeRef.current !== 'idle') return;
    iconModeRef.current = 'waking';
    setIconKey(k => k + 1); // remount Lottie with autoplay=true → plays waking animation
  }, []);

  const onIconComplete = useCallback(() => {
    if (iconModeRef.current === 'waking') {
      iconModeRef.current = 'idle';
      // Transition effect at mascota position as it materializes
      const p = loadStorage().pos || { x: window.innerWidth - 84, y: window.innerHeight - 144 };
      setTransition({ type: pickRandomEffect(), x: p.x, y: p.y });
      activar();
    } else {
      // sleeping animation finished — icon should stay visible at frame 0
      iconModeRef.current = 'idle';
      setIconKey(k => k + 1); // remount as idle (autoplay=false) → frozen at frame 0
    }
  }, [activar]);

  // Bubble position uses posRef — current even when pos state is stale during drag
  const bubbleAbove = posRef.current.y > 150;
  const bubbleLeft = posRef.current.x > window.innerWidth / 2;

  // Menu position: same edge-detection as bubble
  const menuAbove = posRef.current.y > window.innerHeight / 2;
  const menuLeft = posRef.current.x > window.innerWidth / 2;

  // Single return — TransitionEffect stays mounted across activa changes
  return (
    <>
    {/* Minimized icon — shown when mascota is off */}
    {!activa && (
      <div
        onClick={onIconTap}
        style={{
          position: 'fixed',
          right: 16,
          bottom: 80,
          zIndex: 1001,
          width: 48,
          height: 48,
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          animation: 'mascota-pop 0.2s ease-out',
        }}
      >
        <Lottie
          key={iconKey}
          lottieRef={lottieIconRef}
          animationData={tamagadgetIconData}
          loop={false}
          autoplay={iconShouldAutoplay}
          onDOMLoaded={onIconDOMLoaded}
          onComplete={onIconComplete}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )}

    {/* Active mascota */}
    {activa && (
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

      {/* Menu backdrop — closes menu when tapping outside */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
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
            ref={bubbleRef}
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

        {/* Floating menu */}
        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              [menuAbove ? 'bottom' : 'top']: '72px',
              [menuLeft ? 'right' : 'left']: '0',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
              padding: '6px',
              minWidth: '160px',
              zIndex: 1002,
              animation: 'mascota-pop 0.18s ease-out',
            }}
          >
            <button
              onClick={apagar}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                fontFamily: "'Silkscreen', cursive",
                color: '#ff6b6b',
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🔴 Apagar asistente
            </button>
          </div>
        )}

        {/* Lottie mascot — controlled via mascotaLottieRef */}
        <div
          onPointerDown={onPointerDown}
          onClick={onTap}
          style={{
            width: 64,
            height: 64,
            cursor: 'grab',
            touchAction: 'none',
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
            key={lottieKey}
            lottieRef={mascotaLottieRef}
            animationData={mascotaData}
            initialSegment={SEG_FULL}
            loop={false}
            autoplay={false}
            onComplete={onMascotaComplete}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
      </>
    )}

    {/* Transition effect — persists across activa changes */}
    {transition && (
      <TransitionEffect
        type={transition.type}
        x={transition.x}
        y={transition.y}
        onComplete={clearTransition}
      />
    )}
    </>
  );
}

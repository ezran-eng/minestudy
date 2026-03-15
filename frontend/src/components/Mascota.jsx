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
const EFFECT_DURATION = 950;
const pickRandomEffect = () => EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];

function _p(parent, styles, keyframes, opts) {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'absolute', ...styles });
  parent.appendChild(el);
  el.animate(keyframes, { fill: 'forwards', ...opts });
}

// Thanos snap — dust/ash particles drifting to the right like disintegration
function _effectThanos(c) {
  for (let i = 0; i < 50; i++) {
    const startX = 16 + Math.random() * 32;
    const startY = 8 + Math.random() * 48;
    const driftX = 30 + Math.random() * 110;
    const driftY = (Math.random() - 0.6) * 60;
    const s = 1 + Math.random() * 4;
    const h = 25 + Math.random() * 30;
    const l = 40 + Math.random() * 30;
    _p(c, {
      left: `${startX}px`, top: `${startY}px`,
      width: `${s}px`, height: `${s}px`,
      borderRadius: Math.random() > 0.3 ? '1px' : '50%',
      background: `hsl(${h},${60 + Math.random() * 30}%,${l}%)`,
      boxShadow: `0 0 ${s}px hsl(${h},70%,${l + 10}%)`,
    }, [
      { opacity: 0, transform: 'translate(0,0) scale(0)' },
      { opacity: 1, transform: 'translate(0,0) scale(1)', offset: 0.1 },
      { opacity: .8, transform: `translate(${driftX * .5}px,${driftY * .5}px) scale(.8)`, offset: 0.5 },
      { opacity: 0, transform: `translate(${driftX}px,${driftY}px) scale(0)` },
    ], {
      duration: 600 + Math.random() * 600,
      delay: (i / 50) * 300 + Math.random() * 100,
      easing: 'cubic-bezier(0.4,0,0.2,1)',
    });
  }
}

// Pokéball — white/golden energy flash + expanding golden rings + star sparkles (no red)
function _effectPokeball(c) {
  // Bright white flash expanding from center
  _p(c, {
    left: '50%', top: '50%', width: '10px', height: '10px', borderRadius: '50%',
    background: 'radial-gradient(circle,#fff 0%,rgba(255,255,255,.9) 30%,rgba(212,168,71,.6) 60%,transparent 80%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(8)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%,-50%) scale(10)', opacity: 0 },
  ], { duration: 600, easing: 'ease-out' });
  // Golden energy ring
  _p(c, {
    left: '50%', top: '50%', width: '30px', height: '30px', borderRadius: '50%',
    border: '2px solid #d4a847', background: 'transparent',
    boxShadow: '0 0 15px rgba(212,168,71,.6),inset 0 0 8px rgba(212,168,71,.3)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(3)', opacity: .8, offset: 0.4 },
    { transform: 'translate(-50%,-50%) scale(5)', opacity: 0, borderWidth: '.5px' },
  ], { duration: 650, delay: 50, easing: 'ease-out' });
  // White energy ring
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    border: '2px solid #fff', background: 'transparent',
    boxShadow: '0 0 12px rgba(255,255,255,.5)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(4)', opacity: .6, offset: 0.5 },
    { transform: 'translate(-50%,-50%) scale(6)', opacity: 0, borderWidth: '.5px' },
  ], { duration: 700, delay: 100, easing: 'ease-out' });
  // Star sparkles radiating outward
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, d = 40 + Math.random() * 50;
    _p(c, {
      left: '32px', top: '32px', width: '4px', height: '4px',
      background: '#fff', borderRadius: '1px',
      boxShadow: '0 0 6px #fff,0 0 12px rgba(212,168,71,.5)',
    }, [
      { transform: 'translate(-50%,-50%) rotate(0deg) scale(0)', opacity: 0 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d * .3}px),calc(-50% + ${Math.sin(a) * d * .3}px)) rotate(45deg) scale(1.5)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * d}px),calc(-50% + ${Math.sin(a) * d}px)) rotate(90deg) scale(0)`, opacity: 0 },
    ], { duration: 500 + Math.random() * 200, delay: 50 + i * 30, easing: 'ease-out' });
  }
}

// Rick & Morty portal — glowing green oval with dark center, concentric spinning rings
function _effectPortal(c) {
  // Outer glowing ring
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    border: '4px solid #39ff14',
    boxShadow: '0 0 20px #00ff41,0 0 40px rgba(0,255,65,.4),inset 0 0 20px rgba(0,255,65,.3)',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg)' },
    { width: '80px', height: '90px', opacity: 1, transform: 'translate(-50%,-50%) rotate(180deg)', offset: 0.25 },
    { width: '75px', height: '85px', opacity: 1, transform: 'translate(-50%,-50%) rotate(540deg)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(720deg)' },
  ], { duration: 900, easing: 'ease-in-out' });
  // Inner counter-rotating ring
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    border: '2px solid #00ff41', boxShadow: '0 0 10px #39ff14',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg)' },
    { width: '50px', height: '56px', opacity: .8, transform: 'translate(-50%,-50%) rotate(-360deg)', offset: 0.25 },
    { width: '46px', height: '52px', opacity: .8, transform: 'translate(-50%,-50%) rotate(-720deg)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(-1080deg)' },
  ], { duration: 900, easing: 'ease-in-out' });
  // Dark center hole
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(0,20,0,.9) 0%,rgba(0,40,0,.6) 60%,transparent 100%)',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%)' },
    { width: '40px', height: '45px', opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.25 },
    { width: '36px', height: '40px', opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%)' },
  ], { duration: 900, easing: 'ease-in-out' });
  // Swirling inner pattern
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    background: 'conic-gradient(from 0deg,transparent,rgba(57,255,20,.3),transparent,rgba(57,255,20,.3),transparent)',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg)' },
    { width: '60px', height: '67px', opacity: .6, transform: 'translate(-50%,-50%) rotate(720deg)', offset: 0.25 },
    { width: '55px', height: '62px', opacity: .6, transform: 'translate(-50%,-50%) rotate(1440deg)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(2160deg)' },
  ], { duration: 900, easing: 'ease-in-out' });
  // Electric sparks orbiting the portal edge
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 40 + Math.random() * 15;
    const s = 1 + Math.random() * 2;
    _p(c, {
      left: '32px', top: '32px', width: `${s}px`, height: `${s}px`,
      borderRadius: '50%', background: '#7fff00',
      boxShadow: '0 0 6px #39ff14,0 0 12px rgba(57,255,20,.4)',
    }, [
      { transform: `translate(-50%,-50%) translate(${Math.cos(a) * r * .3}px,${Math.sin(a) * r * .3}px)`, opacity: 0 },
      { transform: `translate(-50%,-50%) translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px)`, opacity: 1, offset: 0.3 },
      { transform: `translate(-50%,-50%) translate(${Math.cos(a + .5) * r * 1.2}px,${Math.sin(a + .5) * r * 1.2}px)`, opacity: .5, offset: 0.7 },
      { transform: `translate(-50%,-50%) translate(${Math.cos(a + 1) * r * .5}px,${Math.sin(a + 1) * r * .5}px)`, opacity: 0 },
    ], { duration: 500 + Math.random() * 300, delay: Math.random() * 200, easing: 'ease-out' });
  }
}

// Sci-fi teleport beam — vertical column + horizontal rings traveling up + sparkles
function _effectTeleport(c) {
  // Main vertical beam
  _p(c, {
    left: '50%', top: '50%', width: '50px', height: '120px', borderRadius: '25px',
    background: 'linear-gradient(180deg,transparent 0%,rgba(0,200,255,.2) 20%,rgba(0,200,255,.7) 40%,rgba(100,220,255,.9) 50%,rgba(0,200,255,.7) 60%,rgba(0,200,255,.2) 80%,transparent 100%)',
  }, [
    { transform: 'translate(-50%,-50%) scaleX(0) scaleY(.3)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scaleX(1.2) scaleY(.5)', opacity: .8, offset: 0.1 },
    { transform: 'translate(-50%,-50%) scaleX(.8) scaleY(1)', opacity: 1, offset: 0.25 },
    { transform: 'translate(-50%,-50%) scaleX(.6) scaleY(1)', opacity: .9, offset: 0.6 },
    { transform: 'translate(-50%,-50%) scaleX(0) scaleY(1.5)', opacity: 0 },
  ], { duration: 750, easing: 'ease-in-out' });
  // Horizontal rings traveling up the beam
  for (let i = 0; i < 5; i++) {
    _p(c, {
      left: '50%', width: '40px', height: '3px', borderRadius: '50%',
      background: 'rgba(100,220,255,.8)',
      boxShadow: '0 0 8px #00d4ff,0 0 16px rgba(0,212,255,.4)',
    }, [
      { top: '60px', opacity: 0, transform: 'translateX(-50%) scaleX(.3)' },
      { top: '45px', opacity: 1, transform: 'translateX(-50%) scaleX(1)', offset: 0.2 },
      { top: '20px', opacity: .8, transform: 'translateX(-50%) scaleX(.8)', offset: 0.6 },
      { top: '0px', opacity: 0, transform: 'translateX(-50%) scaleX(.2)' },
    ], { duration: 450, delay: i * 100, easing: 'ease-in' });
  }
  // Bright center flash
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    background: 'radial-gradient(circle,#fff 0%,rgba(0,212,255,.8) 40%,transparent 70%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(2.5)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%,-50%) scale(2)', opacity: .7, offset: 0.5 },
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
  ], { duration: 650, easing: 'ease-in-out' });
  // Sparkles floating upward along the beam
  for (let i = 0; i < 10; i++) {
    const sx = (Math.random() - 0.5) * 30, sy = 10 + Math.random() * 44;
    _p(c, {
      left: `${32 + sx}px`, top: `${sy}px`, width: '2px', height: '2px',
      borderRadius: '50%', background: '#fff', boxShadow: '0 0 4px #00d4ff',
    }, [
      { opacity: 0, transform: 'translateY(0) scale(0)' },
      { opacity: 1, transform: `translateY(-${20 + Math.random() * 30}px) scale(1)`, offset: 0.3 },
      { opacity: 0, transform: `translateY(-${40 + Math.random() * 40}px) scale(0)` },
    ], { duration: 500 + Math.random() * 300, delay: 100 + Math.random() * 200, easing: 'ease-out' });
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
  const [isBlurFading, setIsBlurFading] = useState(false);
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

  // Smooth blur fade-out: keeps element mounted, plays exit animation, then unmounts
  const fadeOutBlur = useCallback(() => {
    clearTimeout(blurTimer.current);
    setIsBlurFading(true);
    blurTimer.current = setTimeout(() => {
      setIsBlurActive(false);
      setIsBlurFading(false);
    }, 550); // matches mascota-blur-out duration
  }, []);

  const showBubble = useCallback((text) => {
    if (!text) return;
    setSleeping(false);
    clearTimeout(bubbleTimer.current);
    clearTimeout(blurTimer.current);
    setIsBlurFading(false);
    setBubble({ text, id: Date.now() });
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
    setIsBlurActive(true);
    blurTimer.current = setTimeout(fadeOutBlur, BLUR_MS);
  }, [fadeOutBlur]);

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
          width: 58,
          height: 58,
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          animation: 'mascota-pop 0.2s ease-out',
        }}
      >
        {/* Star aura — two counter-rotating orbits of silver particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Outer orbit: 6 stars, clockwise 9s */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', width: 0, height: 0,
            animation: 'icon-orbit 9s linear infinite',
          }}>
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: `${2 + (i % 2)}px`, height: `${2 + (i % 2)}px`,
                borderRadius: '1px',
                background: '#c8d4e8',
                boxShadow: '0 0 3px rgba(180,200,255,.7),0 0 7px rgba(150,170,255,.3)',
                transform: `rotate(${deg}deg) translateX(35px) rotate(45deg)`,
                opacity: 0.5 + (i % 3) * 0.15,
              }} />
            ))}
          </div>
          {/* Inner orbit: 4 smaller dots, counter-clockwise 14s */}
          <div style={{
            position: 'absolute', left: '50%', top: '50%', width: 0, height: 0,
            animation: 'icon-orbit-reverse 14s linear infinite',
          }}>
            {[45, 135, 225, 315].map((deg, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: '2px', height: '2px',
                borderRadius: '50%',
                background: '#dde6f4',
                boxShadow: '0 0 4px rgba(200,215,255,.8)',
                transform: `rotate(${deg}deg) translateX(24px)`,
                opacity: 0.4,
              }} />
            ))}
          </div>
        </div>

        <Lottie
          key={iconKey}
          lottieRef={lottieIconRef}
          animationData={tamagadgetIconData}
          loop={false}
          autoplay={iconShouldAutoplay}
          onDOMLoaded={onIconDOMLoaded}
          onComplete={onIconComplete}
          style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
        />
      </div>
    )}

    {/* Active mascota */}
    {activa && (
      <>
      {/* Blur overlay — suppressed during materia drag (Study.jsx handles card blur) */}
      {(isBlurActive || isBlurFading) && !draggingOverMateria && (
        <div
          onClick={fadeOutBlur}
          style={{
            position: 'fixed',
            inset: 0,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 999,
            animation: isBlurFading
              ? 'mascota-blur-out 0.55s ease-out forwards'
              : 'mascota-blur-in 0.3s ease-out',
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

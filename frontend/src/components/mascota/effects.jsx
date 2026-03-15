import React, { useRef, useEffect } from 'react';

const EFFECT_TYPES = ['thanos', 'pokeball', 'portal', 'teleport'];
export const EFFECT_DURATION = 950;

export const pickRandomEffect = () =>
  EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];

// Helper: create an absolutely-positioned particle with Web Animation
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
  _p(c, {
    left: '50%', top: '50%', width: '10px', height: '10px', borderRadius: '50%',
    background: 'radial-gradient(circle,#fff 0%,rgba(255,255,255,.9) 30%,rgba(212,168,71,.6) 60%,transparent 80%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(8)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%,-50%) scale(10)', opacity: 0 },
  ], { duration: 600, easing: 'ease-out' });
  _p(c, {
    left: '50%', top: '50%', width: '30px', height: '30px', borderRadius: '50%',
    border: '2px solid #d4a847', background: 'transparent',
    boxShadow: '0 0 15px rgba(212,168,71,.6),inset 0 0 8px rgba(212,168,71,.3)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(3)', opacity: .8, offset: 0.4 },
    { transform: 'translate(-50%,-50%) scale(5)', opacity: 0, borderWidth: '.5px' },
  ], { duration: 650, delay: 50, easing: 'ease-out' });
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    border: '2px solid #fff', background: 'transparent',
    boxShadow: '0 0 12px rgba(255,255,255,.5)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 1 },
    { transform: 'translate(-50%,-50%) scale(4)', opacity: .6, offset: 0.5 },
    { transform: 'translate(-50%,-50%) scale(6)', opacity: 0, borderWidth: '.5px' },
  ], { duration: 700, delay: 100, easing: 'ease-out' });
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
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    border: '2px solid #00ff41', boxShadow: '0 0 10px #39ff14',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg)' },
    { width: '50px', height: '56px', opacity: .8, transform: 'translate(-50%,-50%) rotate(-360deg)', offset: 0.25 },
    { width: '46px', height: '52px', opacity: .8, transform: 'translate(-50%,-50%) rotate(-720deg)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(-1080deg)' },
  ], { duration: 900, easing: 'ease-in-out' });
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(0,20,0,.9) 0%,rgba(0,40,0,.6) 60%,transparent 100%)',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%)' },
    { width: '40px', height: '45px', opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.25 },
    { width: '36px', height: '40px', opacity: 1, transform: 'translate(-50%,-50%)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%)' },
  ], { duration: 900, easing: 'ease-in-out' });
  _p(c, {
    left: '50%', top: '50%', width: '0', height: '0', borderRadius: '50%',
    background: 'conic-gradient(from 0deg,transparent,rgba(57,255,20,.3),transparent,rgba(57,255,20,.3),transparent)',
  }, [
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(0deg)' },
    { width: '60px', height: '67px', opacity: .6, transform: 'translate(-50%,-50%) rotate(720deg)', offset: 0.25 },
    { width: '55px', height: '62px', opacity: .6, transform: 'translate(-50%,-50%) rotate(1440deg)', offset: 0.7 },
    { width: '0', height: '0', opacity: 0, transform: 'translate(-50%,-50%) rotate(2160deg)' },
  ], { duration: 900, easing: 'ease-in-out' });
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
  _p(c, {
    left: '50%', top: '50%', width: '20px', height: '20px', borderRadius: '50%',
    background: 'radial-gradient(circle,#fff 0%,rgba(0,212,255,.8) 40%,transparent 70%)',
  }, [
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
    { transform: 'translate(-50%,-50%) scale(2.5)', opacity: 1, offset: 0.15 },
    { transform: 'translate(-50%,-50%) scale(2)', opacity: .7, offset: 0.5 },
    { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
  ], { duration: 650, easing: 'ease-in-out' });
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

export function TransitionEffect({ type, x, y, onComplete }) {
  const ref = useRef(null);
  useEffect(() => { const t = setTimeout(onComplete, EFFECT_DURATION); return () => clearTimeout(t); }, [onComplete]);
  useEffect(() => { if (ref.current) EFFECT_MAP[type]?.(ref.current); }, [type]);
  return <div ref={ref} style={{ position: 'fixed', left: x, top: y, width: 64, height: 64, zIndex: 1100, pointerEvents: 'none' }} />;
}

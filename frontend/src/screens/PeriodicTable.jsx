import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Lottie from 'lottie-react';

/* ── Element data: symbol → { Z, name, category, row, col } ── */
const ELEMENTS = [
  // Period 1
  { symbol: 'H',  Z: 1,   name: 'Hidrógeno',    cat: 'nonmetal',    row: 1, col: 1 },
  { symbol: 'He', Z: 2,   name: 'Helio',         cat: 'noble-gas',   row: 1, col: 18 },
  // Period 2
  { symbol: 'Li', Z: 3,   name: 'Litio',         cat: 'alkali',      row: 2, col: 1 },
  { symbol: 'Be', Z: 4,   name: 'Berilio',       cat: 'alkaline',    row: 2, col: 2 },
  { symbol: 'B',  Z: 5,   name: 'Boro',          cat: 'metalloid',   row: 2, col: 13 },
  { symbol: 'C',  Z: 6,   name: 'Carbono',       cat: 'nonmetal',    row: 2, col: 14 },
  { symbol: 'N',  Z: 7,   name: 'Nitrógeno',     cat: 'nonmetal',    row: 2, col: 15 },
  { symbol: 'O',  Z: 8,   name: 'Oxígeno',       cat: 'nonmetal',    row: 2, col: 16 },
  { symbol: 'F',  Z: 9,   name: 'Flúor',         cat: 'halogen',     row: 2, col: 17 },
  { symbol: 'Ne', Z: 10,  name: 'Neón',          cat: 'noble-gas',   row: 2, col: 18 },
  // Period 3
  { symbol: 'Na', Z: 11,  name: 'Sodio',         cat: 'alkali',      row: 3, col: 1 },
  { symbol: 'Mg', Z: 12,  name: 'Magnesio',      cat: 'alkaline',    row: 3, col: 2 },
  { symbol: 'Al', Z: 13,  name: 'Aluminio',      cat: 'post-trans',  row: 3, col: 13 },
  { symbol: 'Si', Z: 14,  name: 'Silicio',       cat: 'metalloid',   row: 3, col: 14 },
  { symbol: 'P',  Z: 15,  name: 'Fósforo',       cat: 'nonmetal',    row: 3, col: 15 },
  { symbol: 'S',  Z: 16,  name: 'Azufre',        cat: 'nonmetal',    row: 3, col: 16 },
  { symbol: 'Cl', Z: 17,  name: 'Cloro',         cat: 'halogen',     row: 3, col: 17 },
  { symbol: 'Ar', Z: 18,  name: 'Argón',         cat: 'noble-gas',   row: 3, col: 18 },
  // Period 4
  { symbol: 'K',  Z: 19,  name: 'Potasio',       cat: 'alkali',      row: 4, col: 1 },
  { symbol: 'Ca', Z: 20,  name: 'Calcio',        cat: 'alkaline',    row: 4, col: 2 },
  { symbol: 'Sc', Z: 21,  name: 'Escandio',      cat: 'transition',  row: 4, col: 3 },
  { symbol: 'Ti', Z: 22,  name: 'Titanio',       cat: 'transition',  row: 4, col: 4 },
  { symbol: 'V',  Z: 23,  name: 'Vanadio',       cat: 'transition',  row: 4, col: 5 },
  { symbol: 'Cr', Z: 24,  name: 'Cromo',         cat: 'transition',  row: 4, col: 6 },
  { symbol: 'Mn', Z: 25,  name: 'Manganeso',     cat: 'transition',  row: 4, col: 7 },
  { symbol: 'Fe', Z: 26,  name: 'Hierro',        cat: 'transition',  row: 4, col: 8 },
  { symbol: 'Co', Z: 27,  name: 'Cobalto',       cat: 'transition',  row: 4, col: 9 },
  { symbol: 'Ni', Z: 28,  name: 'Níquel',        cat: 'transition',  row: 4, col: 10 },
  { symbol: 'Cu', Z: 29,  name: 'Cobre',         cat: 'transition',  row: 4, col: 11 },
  { symbol: 'Zn', Z: 30,  name: 'Zinc',          cat: 'transition',  row: 4, col: 12 },
  { symbol: 'Ga', Z: 31,  name: 'Galio',         cat: 'post-trans',  row: 4, col: 13 },
  { symbol: 'Ge', Z: 32,  name: 'Germanio',      cat: 'metalloid',   row: 4, col: 14 },
  { symbol: 'As', Z: 33,  name: 'Arsénico',      cat: 'metalloid',   row: 4, col: 15 },
  { symbol: 'Se', Z: 34,  name: 'Selenio',       cat: 'nonmetal',    row: 4, col: 16 },
  { symbol: 'Br', Z: 35,  name: 'Bromo',         cat: 'halogen',     row: 4, col: 17 },
  { symbol: 'Kr', Z: 36,  name: 'Kriptón',       cat: 'noble-gas',   row: 4, col: 18 },
  // Period 5
  { symbol: 'Rb', Z: 37,  name: 'Rubidio',       cat: 'alkali',      row: 5, col: 1 },
  { symbol: 'Sr', Z: 38,  name: 'Estroncio',     cat: 'alkaline',    row: 5, col: 2 },
  { symbol: 'Y',  Z: 39,  name: 'Itrio',         cat: 'transition',  row: 5, col: 3 },
  { symbol: 'Zr', Z: 40,  name: 'Circonio',      cat: 'transition',  row: 5, col: 4 },
  { symbol: 'Nb', Z: 41,  name: 'Niobio',        cat: 'transition',  row: 5, col: 5 },
  { symbol: 'Mo', Z: 42,  name: 'Molibdeno',     cat: 'transition',  row: 5, col: 6 },
  { symbol: 'Tc', Z: 43,  name: 'Tecnecio',      cat: 'transition',  row: 5, col: 7 },
  { symbol: 'Ru', Z: 44,  name: 'Rutenio',       cat: 'transition',  row: 5, col: 8 },
  { symbol: 'Rh', Z: 45,  name: 'Rodio',         cat: 'transition',  row: 5, col: 9 },
  { symbol: 'Pd', Z: 46,  name: 'Paladio',       cat: 'transition',  row: 5, col: 10 },
  { symbol: 'Ag', Z: 47,  name: 'Plata',         cat: 'transition',  row: 5, col: 11 },
  { symbol: 'Cd', Z: 48,  name: 'Cadmio',        cat: 'transition',  row: 5, col: 12 },
  { symbol: 'In', Z: 49,  name: 'Indio',         cat: 'post-trans',  row: 5, col: 13 },
  { symbol: 'Sn', Z: 50,  name: 'Estaño',        cat: 'post-trans',  row: 5, col: 14 },
  { symbol: 'Sb', Z: 51,  name: 'Antimonio',     cat: 'metalloid',   row: 5, col: 15 },
  { symbol: 'Te', Z: 52,  name: 'Telurio',       cat: 'metalloid',   row: 5, col: 16 },
  { symbol: 'I',  Z: 53,  name: 'Yodo',          cat: 'halogen',     row: 5, col: 17 },
  { symbol: 'Xe', Z: 54,  name: 'Xenón',         cat: 'noble-gas',   row: 5, col: 18 },
  // Period 6
  { symbol: 'Cs', Z: 55,  name: 'Cesio',         cat: 'alkali',      row: 6, col: 1 },
  { symbol: 'Ba', Z: 56,  name: 'Bario',         cat: 'alkaline',    row: 6, col: 2 },
  { symbol: 'La', Z: 57,  name: 'Lantano',       cat: 'lanthanide',  row: 9, col: 3 },
  { symbol: 'Ce', Z: 58,  name: 'Cerio',         cat: 'lanthanide',  row: 9, col: 4 },
  { symbol: 'Pr', Z: 59,  name: 'Praseodimio',   cat: 'lanthanide',  row: 9, col: 5 },
  { symbol: 'Nd', Z: 60,  name: 'Neodimio',      cat: 'lanthanide',  row: 9, col: 6 },
  { symbol: 'Pm', Z: 61,  name: 'Prometio',      cat: 'lanthanide',  row: 9, col: 7 },
  { symbol: 'Sm', Z: 62,  name: 'Samario',       cat: 'lanthanide',  row: 9, col: 8 },
  { symbol: 'Eu', Z: 63,  name: 'Europio',       cat: 'lanthanide',  row: 9, col: 9 },
  { symbol: 'Gd', Z: 64,  name: 'Gadolinio',     cat: 'lanthanide',  row: 9, col: 10 },
  { symbol: 'Tb', Z: 65,  name: 'Terbio',        cat: 'lanthanide',  row: 9, col: 11 },
  { symbol: 'Dy', Z: 66,  name: 'Disprosio',     cat: 'lanthanide',  row: 9, col: 12 },
  { symbol: 'Ho', Z: 67,  name: 'Holmio',        cat: 'lanthanide',  row: 9, col: 13 },
  { symbol: 'Er', Z: 68,  name: 'Erbio',         cat: 'lanthanide',  row: 9, col: 14 },
  { symbol: 'Tm', Z: 69,  name: 'Tulio',         cat: 'lanthanide',  row: 9, col: 15 },
  { symbol: 'Yb', Z: 70,  name: 'Iterbio',       cat: 'lanthanide',  row: 9, col: 16 },
  { symbol: 'Lu', Z: 71,  name: 'Lutecio',       cat: 'lanthanide',  row: 9, col: 17 },
  { symbol: 'Hf', Z: 72,  name: 'Hafnio',        cat: 'transition',  row: 6, col: 4 },
  { symbol: 'Ta', Z: 73,  name: 'Tantalio',      cat: 'transition',  row: 6, col: 5 },
  { symbol: 'W',  Z: 74,  name: 'Wolframio',     cat: 'transition',  row: 6, col: 6 },
  { symbol: 'Re', Z: 75,  name: 'Renio',         cat: 'transition',  row: 6, col: 7 },
  { symbol: 'Os', Z: 76,  name: 'Osmio',         cat: 'transition',  row: 6, col: 8 },
  { symbol: 'Ir', Z: 77,  name: 'Iridio',        cat: 'transition',  row: 6, col: 9 },
  { symbol: 'Pt', Z: 78,  name: 'Platino',       cat: 'transition',  row: 6, col: 10 },
  { symbol: 'Au', Z: 79,  name: 'Oro',           cat: 'transition',  row: 6, col: 11 },
  { symbol: 'Hg', Z: 80,  name: 'Mercurio',      cat: 'transition',  row: 6, col: 12 },
  { symbol: 'Tl', Z: 81,  name: 'Talio',         cat: 'post-trans',  row: 6, col: 13 },
  { symbol: 'Pb', Z: 82,  name: 'Plomo',         cat: 'post-trans',  row: 6, col: 14 },
  { symbol: 'Bi', Z: 83,  name: 'Bismuto',       cat: 'post-trans',  row: 6, col: 15 },
  { symbol: 'Po', Z: 84,  name: 'Polonio',       cat: 'post-trans',  row: 6, col: 16 },
  { symbol: 'At', Z: 85,  name: 'Astato',        cat: 'halogen',     row: 6, col: 17 },
  { symbol: 'Rn', Z: 86,  name: 'Radón',         cat: 'noble-gas',   row: 6, col: 18 },
  // Period 7
  { symbol: 'Fr', Z: 87,  name: 'Francio',       cat: 'alkali',      row: 7, col: 1 },
  { symbol: 'Ra', Z: 88,  name: 'Radio',         cat: 'alkaline',    row: 7, col: 2 },
  { symbol: 'Ac', Z: 89,  name: 'Actinio',       cat: 'actinide',    row: 10, col: 3 },
  { symbol: 'Th', Z: 90,  name: 'Torio',         cat: 'actinide',    row: 10, col: 4 },
  { symbol: 'Pa', Z: 91,  name: 'Protactinio',   cat: 'actinide',    row: 10, col: 5 },
  { symbol: 'U',  Z: 92,  name: 'Uranio',        cat: 'actinide',    row: 10, col: 6 },
  { symbol: 'Np', Z: 93,  name: 'Neptunio',      cat: 'actinide',    row: 10, col: 7 },
  { symbol: 'Pu', Z: 94,  name: 'Plutonio',      cat: 'actinide',    row: 10, col: 8 },
  { symbol: 'Am', Z: 95,  name: 'Americio',      cat: 'actinide',    row: 10, col: 9 },
  { symbol: 'Cm', Z: 96,  name: 'Curio',         cat: 'actinide',    row: 10, col: 10 },
  { symbol: 'Bk', Z: 97,  name: 'Berkelio',      cat: 'actinide',    row: 10, col: 11 },
  { symbol: 'Cf', Z: 98,  name: 'Californio',    cat: 'actinide',    row: 10, col: 12 },
  { symbol: 'Es', Z: 99,  name: 'Einstenio',     cat: 'actinide',    row: 10, col: 13 },
  { symbol: 'Fm', Z: 100, name: 'Fermio',        cat: 'actinide',    row: 10, col: 14 },
  { symbol: 'Md', Z: 101, name: 'Mendelevio',    cat: 'actinide',    row: 10, col: 15 },
  { symbol: 'No', Z: 102, name: 'Nobelio',       cat: 'actinide',    row: 10, col: 16 },
  { symbol: 'Lr', Z: 103, name: 'Lawrencio',     cat: 'actinide',    row: 10, col: 17 },
  { symbol: 'Rf', Z: 104, name: 'Rutherfordio',  cat: 'transition',  row: 7, col: 4 },
  { symbol: 'Db', Z: 105, name: 'Dubnio',        cat: 'transition',  row: 7, col: 5 },
  { symbol: 'Sg', Z: 106, name: 'Seaborgio',     cat: 'transition',  row: 7, col: 6 },
  { symbol: 'Bh', Z: 107, name: 'Bohrio',        cat: 'transition',  row: 7, col: 7 },
  { symbol: 'Hs', Z: 108, name: 'Hasio',         cat: 'transition',  row: 7, col: 8 },
  { symbol: 'Mt', Z: 109, name: 'Meitnerio',     cat: 'transition',  row: 7, col: 9 },
  { symbol: 'Ds', Z: 110, name: 'Darmstatio',    cat: 'transition',  row: 7, col: 10 },
  { symbol: 'Rg', Z: 111, name: 'Roentgenio',    cat: 'transition',  row: 7, col: 11 },
  { symbol: 'Cn', Z: 112, name: 'Copernicio',    cat: 'transition',  row: 7, col: 12 },
  { symbol: 'Nh', Z: 113, name: 'Nihonio',       cat: 'post-trans',  row: 7, col: 13 },
  { symbol: 'Fl', Z: 114, name: 'Flerovio',      cat: 'post-trans',  row: 7, col: 14 },
  { symbol: 'Mc', Z: 115, name: 'Moscovio',      cat: 'post-trans',  row: 7, col: 15 },
  { symbol: 'Lv', Z: 116, name: 'Livermorio',    cat: 'post-trans',  row: 7, col: 16 },
  { symbol: 'Ts', Z: 117, name: 'Teneso',        cat: 'halogen',     row: 7, col: 17 },
  { symbol: 'Og', Z: 118, name: 'Oganesón',      cat: 'noble-gas',   row: 7, col: 18 },
];

/* ── Category colors ── */
const CAT_COLORS = {
  'alkali':     { bg: 'rgba(255, 85, 85, 0.15)',  border: 'rgba(255, 85, 85, 0.4)',  text: '#ff6b6b', label: 'Alcalinos' },
  'alkaline':   { bg: 'rgba(255, 165, 0, 0.15)',   border: 'rgba(255, 165, 0, 0.4)',   text: '#ffa500', label: 'Alcalinotérreos' },
  'transition': { bg: 'rgba(100, 180, 255, 0.12)', border: 'rgba(100, 180, 255, 0.35)', text: '#64b4ff', label: 'Transición' },
  'post-trans':  { bg: 'rgba(80, 200, 160, 0.12)',  border: 'rgba(80, 200, 160, 0.35)',  text: '#50c8a0', label: 'Post-transición' },
  'metalloid':  { bg: 'rgba(0, 210, 200, 0.12)',   border: 'rgba(0, 210, 200, 0.35)',   text: '#00d2c8', label: 'Metaloides' },
  'nonmetal':   { bg: 'rgba(130, 120, 255, 0.15)', border: 'rgba(130, 120, 255, 0.4)',  text: '#8278ff', label: 'No metales' },
  'halogen':    { bg: 'rgba(200, 100, 255, 0.15)', border: 'rgba(200, 100, 255, 0.4)',  text: '#c864ff', label: 'Halógenos' },
  'noble-gas':  { bg: 'rgba(255, 200, 60, 0.12)',  border: 'rgba(255, 200, 60, 0.35)',  text: '#ffc83c', label: 'Gases nobles' },
  'lanthanide': { bg: 'rgba(255, 140, 180, 0.12)', border: 'rgba(255, 140, 180, 0.35)', text: '#ff8cb4', label: 'Lantánidos' },
  'actinide':   { bg: 'rgba(220, 130, 130, 0.12)', border: 'rgba(220, 130, 130, 0.35)', text: '#dc8282', label: 'Actínidos' },
};

/* ── Lazy-load Lottie JSON files ── */
const lottieModules = import.meta.glob('../assets/lotties/elements/*.json');

function useLottieData(symbol) {
  const [data, setData] = useState(null);
  useEffect(() => {
    const key = `../assets/lotties/elements/${symbol}.json`;
    if (lottieModules[key]) {
      lottieModules[key]().then(mod => setData(mod.default || mod));
    }
  }, [symbol]);
  return data;
}

/* ── Single element cell ── */
const ElementCell = React.memo(({ el, cellSize, onSelect, isActive }) => {
  const lottieData = useLottieData(el.symbol);
  const lottieRef = useRef(null);
  const cat = CAT_COLORS[el.cat] || CAT_COLORS['nonmetal'];

  useEffect(() => {
    if (!lottieRef.current) return;
    if (isActive) {
      lottieRef.current.goToAndPlay(0);
    } else {
      lottieRef.current.goToAndStop(0);
    }
  }, [isActive]);

  return (
    <div
      className={`pt-cell ${isActive ? 'pt-cell-active' : ''}`}
      style={{
        gridRow: el.row,
        gridColumn: el.col,
        width: cellSize,
        height: cellSize,
        background: cat.bg,
        borderColor: cat.border,
      }}
      onPointerEnter={() => onSelect(el)}
      onPointerLeave={() => onSelect(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(el); }}
    >
      {lottieData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={lottieData}
          loop
          autoplay={false}
          style={{ width: '80%', height: '80%', position: 'absolute', top: '10%', left: '10%' }}
        />
      ) : (
        <span className="pt-cell-symbol">{el.symbol}</span>
      )}
    </div>
  );
});

/* ── Pinch-zoom + pan hook for mobile ── */
function usePinchPan(ref, { minScale = 0.5, maxScale = 3 } = {}) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const stateRef = useRef({ x: 0, y: 0, scale: 1 });
  const gestureRef = useRef(null);

  // Clamp position so grid stays partially visible
  const clamp = useCallback((x, y, scale) => {
    const el = ref.current;
    if (!el) return { x, y };
    const parent = el.parentElement;
    if (!parent) return { x, y };
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const gw = el.scrollWidth * scale;
    const gh = el.scrollHeight * scale;
    // Allow panning but keep at least 30% visible
    const margin = 0.3;
    const minX = pw - gw * (1 - margin);
    const maxX = gw * margin - gw + pw * margin;
    const minY = ph - gh * (1 - margin);
    const maxY = gh * margin - gh + ph * margin;
    return {
      x: gw > pw ? Math.min(Math.max(x, minX), Math.max(maxX, 0)) : (pw - gw) / 2,
      y: gh > ph ? Math.min(Math.max(y, minY), Math.max(maxY, 0)) : (ph - gh) / 2,
    };
  }, [ref]);

  const apply = useCallback((x, y, scale) => {
    const clamped = clamp(x, y, scale);
    stateRef.current = { x: clamped.x, y: clamped.y, scale };
    setTransform({ x: clamped.x, y: clamped.y, scale });
  }, [clamp]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        gestureRef.current = {
          type: 'pan',
          startX: t.clientX - stateRef.current.x,
          startY: t.clientY - stateRef.current.y,
        };
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const cx = (t1.clientX + t2.clientX) / 2;
        const cy = (t1.clientY + t2.clientY) / 2;
        gestureRef.current = {
          type: 'pinch',
          initialDist: dist,
          initialScale: stateRef.current.scale,
          cx, cy,
          startX: stateRef.current.x,
          startY: stateRef.current.y,
        };
      }
    };

    const handleTouchMove = (e) => {
      const g = gestureRef.current;
      if (!g) return;

      if (g.type === 'pan' && e.touches.length === 1) {
        const t = e.touches[0];
        const x = t.clientX - g.startX;
        const y = t.clientY - g.startY;
        apply(x, y, stateRef.current.scale);
      } else if (g.type === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        let newScale = g.initialScale * (dist / g.initialDist);
        newScale = Math.min(maxScale, Math.max(minScale, newScale));

        // Zoom towards pinch center
        const ratio = newScale / g.initialScale;
        const parentRect = parent.getBoundingClientRect();
        const cx = g.cx - parentRect.left;
        const cy = g.cy - parentRect.top;
        const x = cx - ratio * (cx - g.startX);
        const y = cy - ratio * (cy - g.startY);
        apply(x, y, newScale);
      }
    };

    const handleTouchEnd = () => {
      gestureRef.current = null;
    };

    parent.addEventListener('touchstart', handleTouchStart, { passive: false });
    parent.addEventListener('touchmove', handleTouchMove, { passive: false });
    parent.addEventListener('touchend', handleTouchEnd);
    parent.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      parent.removeEventListener('touchstart', handleTouchStart);
      parent.removeEventListener('touchmove', handleTouchMove);
      parent.removeEventListener('touchend', handleTouchEnd);
      parent.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref, minScale, maxScale, apply]);

  return { transform, setTransform: apply };
}

/* ── Main screen ── */
const CELL_BASE = 50; // fixed cell size for the grid, zoom handles scaling

const PeriodicTable = () => {
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const viewportRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Telegram safe areas
  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);
  const safeBottom = (tg?.contentSafeAreaInset?.bottom ?? 0) + (tg?.safeAreaInset?.bottom ?? 0);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Grid natural size: 18 cols * (50+2) + 2 = ~938px wide, ~490px tall
  const gridW = 18 * (CELL_BASE + 2);
  const gridH = 9.4 * (CELL_BASE + 2); // 7 rows + 0.4 gap + 2 f-block rows

  const { transform, setTransform } = usePinchPan(gridRef, {
    minScale: 0.3,
    maxScale: 4,
  });

  // On mount: fit the whole table in the viewport
  useEffect(() => {
    if (!isMobile) return;
    const vp = viewportRef.current;
    if (!vp) return;
    // Small delay to let layout settle
    const timer = setTimeout(() => {
      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      const scaleX = vpW / gridW;
      const scaleY = vpH / gridH;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      const x = (vpW - gridW * fitScale) / 2;
      const y = (vpH - gridH * fitScale) / 2;
      setTransform(x, y, fitScale);
    }, 50);
    return () => clearTimeout(timer);
  }, [isMobile]); // eslint-disable-line

  const selCat = selected ? CAT_COLORS[selected.cat] : null;

  // Desktop: same as before (scroll-based, auto cell sizing)
  if (!isMobile) {
    return (
      <div className="pt-screen-root">
        <div className="pt-header">
          <button className="pt-back" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="pt-title">Tabla Periódica</div>
          <div style={{ width: 32 }} />
        </div>
        <DesktopInfoBar selected={selected} selCat={selCat} />
        <div className="pt-scroll-wrapper">
          <DesktopGrid selected={selected} setSelected={setSelected} />
        </div>
        <Legend />
      </div>
    );
  }

  // Mobile: pinch-zoom + pan experience
  return (
    <div className="pt-screen-root" style={{ paddingTop: safeTop + 4, paddingBottom: safeBottom + 4 }}>
      {/* Header */}
      <div className="pt-header">
        <button className="pt-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="pt-title">Tabla Periódica</div>
        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="pt-zoom-btn" onClick={() => {
            const vp = viewportRef.current;
            if (!vp) return;
            const vpW = vp.clientWidth;
            const vpH = vp.clientHeight;
            const fitScale = Math.min(vpW / gridW, vpH / gridH) * 0.95;
            setTransform((vpW - gridW * fitScale) / 2, (vpH - gridH * fitScale) / 2, fitScale);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="12" x2="15" y2="12" />
            </svg>
          </button>
          <button className="pt-zoom-btn" onClick={() => {
            const ns = Math.min(4, transform.scale * 1.5);
            const vp = viewportRef.current;
            if (!vp) return;
            const cx = vp.clientWidth / 2;
            const cy = vp.clientHeight / 2;
            const ratio = ns / transform.scale;
            setTransform(cx - ratio * (cx - transform.x), cy - ratio * (cy - transform.y), ns);
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="8" y1="11" x2="14" y2="11" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="pt-info-bar" style={{ opacity: selected ? 1 : 0.4 }}>
        {selected ? (
          <>
            <span className="pt-info-z" style={{ color: selCat?.text }}>{selected.Z}</span>
            <span className="pt-info-symbol" style={{ color: selCat?.text }}>{selected.symbol}</span>
            <span className="pt-info-name">{selected.name}</span>
            <span className="pt-info-cat" style={{ background: selCat?.bg, borderColor: selCat?.border, color: selCat?.text }}>
              {selCat?.label}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text2)', fontStyle: 'italic' }}>
            Pellizca para hacer zoom · Toca un elemento
          </span>
        )}
      </div>

      {/* Viewport (touch zone) */}
      <div className="pt-viewport" ref={viewportRef} onClick={() => setSelected(null)}>
        <div
          ref={gridRef}
          className="pt-grid"
          style={{
            gridTemplateColumns: `repeat(18, ${CELL_BASE}px)`,
            gridTemplateRows: `repeat(7, ${CELL_BASE}px) ${CELL_BASE * 0.4}px repeat(2, ${CELL_BASE}px)`,
            gap: '2px',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {ELEMENTS.map(el => (
            <ElementCell
              key={el.symbol}
              el={el}
              cellSize={CELL_BASE}
              onSelect={setSelected}
              isActive={selected?.symbol === el.symbol}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Legend />
    </div>
  );
};

/* ── Desktop subcomponents ── */
function DesktopInfoBar({ selected, selCat }) {
  return (
    <div className="pt-info-bar" style={{ opacity: selected ? 1 : 0 }}>
      {selected && (
        <>
          <span className="pt-info-z" style={{ color: selCat?.text }}>{selected.Z}</span>
          <span className="pt-info-symbol" style={{ color: selCat?.text }}>{selected.symbol}</span>
          <span className="pt-info-name">{selected.name}</span>
          <span className="pt-info-cat" style={{ background: selCat?.bg, borderColor: selCat?.border, color: selCat?.text }}>
            {selCat?.label}
          </span>
        </>
      )}
    </div>
  );
}

function DesktopGrid({ selected, setSelected }) {
  const [cellSize, setCellSize] = useState(42);
  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth - 16;
      const size = Math.floor((w - 17 * 2) / 18);
      setCellSize(Math.max(16, Math.min(size, 52)));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div
      className="pt-grid"
      style={{
        gridTemplateColumns: `repeat(18, ${cellSize}px)`,
        gridTemplateRows: `repeat(7, ${cellSize}px) ${cellSize * 0.4}px repeat(2, ${cellSize}px)`,
        gap: '2px',
      }}
    >
      {ELEMENTS.map(el => (
        <ElementCell
          key={el.symbol}
          el={el}
          cellSize={cellSize}
          onSelect={setSelected}
          isActive={selected?.symbol === el.symbol}
        />
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="pt-legend">
      {Object.entries(CAT_COLORS).map(([key, val]) => (
        <div key={key} className="pt-legend-item">
          <div className="pt-legend-dot" style={{ background: val.text }} />
          <span className="pt-legend-label">{val.label}</span>
        </div>
      ))}
    </div>
  );
}

export default PeriodicTable;

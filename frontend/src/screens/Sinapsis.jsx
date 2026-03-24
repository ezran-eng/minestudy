import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Categories ──────────────────────────────────────────────────────────── */

const CATEGORIES = {
  core:     { color: '#a78bfa', label: 'Núcleo IA' },
  backend:  { color: '#60a5fa', label: 'Backend' },
  frontend: { color: '#34d399', label: 'Frontend' },
  external: { color: '#f472b6', label: 'Externo' },
  data:     { color: '#fbbf24', label: 'Datos' },
  screen:   { color: '#fb923c', label: 'Pantallas' },
};

/* ─── Canvas size — large enough to scroll around ─────────────────────────── */
const CW = 900;  // canvas width
const CH = 1100; // canvas height

/* ─── Nodes — absolute pixel positions on the virtual canvas ──────────────── */
/* Organized in clear groups: External → Backend → Core → Frontend → Screens → Data */

const NODES = [
  // ── External (top center) ──
  { id: 'deepseek',       label: 'DeepSeek API',     cat: 'external', x: 450, y: 80,   size: 56, icon: '🧠' },

  // ── Backend (upper ring) ──
  { id: 'llm',            label: 'LLM Client',       cat: 'backend',  x: 250, y: 210,  size: 50, icon: '⚡' },
  { id: 'tutor_chat',     label: 'Tutor Chat',       cat: 'backend',  x: 450, y: 210,  size: 50, icon: '💬' },
  { id: 'tutor_actions',  label: 'Tutor Actions',    cat: 'backend',  x: 650, y: 210,  size: 50, icon: '🎯' },

  // ── Core (center) ──
  { id: 'redo',           label: 'Redo AI',          cat: 'core',     x: 450, y: 420,  size: 72, icon: '🤖' },

  // ── Backend (flanks of center) ──
  { id: 'periodic',       label: 'Tabla Periódica',  cat: 'backend',  x: 140, y: 400,  size: 50, icon: '⚗️' },
  { id: 'ai_generate',    label: 'AI Generate',      cat: 'backend',  x: 760, y: 400,  size: 50, icon: '✨' },
  { id: 'memoria',        label: 'RedoMemoria',      cat: 'backend',  x: 700, y: 570,  size: 50, icon: '🧬' },

  // ── Frontend (lower area) ──
  { id: 'tutor_chat_ui',  label: 'TutorChat UI',     cat: 'frontend', x: 350, y: 580,  size: 46, icon: '🖥️' },
  { id: 'mascota_fe',     label: 'Mascota.jsx',      cat: 'frontend', x: 200, y: 580,  size: 46, icon: '🎭' },
  { id: 'speech_bubble',  label: 'SpeechBubble',     cat: 'frontend', x: 100, y: 660,  size: 42, icon: '💭' },
  { id: 'mascota_menu',   label: 'MascotaMenu',      cat: 'frontend', x: 260, y: 700,  size: 42, icon: '📋' },
  { id: 'mascota_ctx',    label: 'MascotaContext',   cat: 'frontend', x: 420, y: 710,  size: 42, icon: '🔗' },
  { id: 'pomodoro',       label: 'Pomodoro',         cat: 'frontend', x: 570, y: 680,  size: 42, icon: '🍅' },

  // ── Screens (right side) ──
  { id: 'home',           label: 'Home',             cat: 'screen',   x: 100, y: 250,  size: 44, icon: '🏠' },
  { id: 'study',          label: 'Study',            cat: 'screen',   x: 800, y: 250,  size: 44, icon: '📚' },
  { id: 'unidad',         label: 'UnidadDetail',     cat: 'screen',   x: 820, y: 540,  size: 44, icon: '📖' },

  // ── Data (bottom) ──
  { id: 'postgres',       label: 'PostgreSQL',       cat: 'data',     x: 450, y: 900,  size: 54, icon: '🗄️' },
  { id: 'api_endpoints',  label: 'API Endpoints',    cat: 'data',     x: 640, y: 880,  size: 44, icon: '🔌' },
  { id: 'r2_storage',     label: 'Cloudflare R2',    cat: 'data',     x: 260, y: 880,  size: 44, icon: '☁️' },
];

/* ─── Category zones — subtle background regions ──────────────────────────── */
const ZONES = [
  { cat: 'external', label: 'EXTERNO',    x: 340, y: 30,   w: 220, h: 110 },
  { cat: 'backend',  label: 'BACKEND',    x: 100, y: 155,  w: 710, h: 130 },
  { cat: 'core',     label: 'NÚCLEO IA',  x: 340, y: 345,  w: 220, h: 150 },
  { cat: 'frontend', label: 'FRONTEND',   x: 50,  y: 530,  w: 600, h: 240 },
  { cat: 'screen',   label: 'PANTALLAS',  x: 700, y: 195,  w: 170, h: 440 },
  { cat: 'data',     label: 'DATOS',      x: 180, y: 830,  w: 540, h: 130 },
];

const CONNECTIONS = [
  { from: 'redo', to: 'llm',            label: 'prompts' },
  { from: 'redo', to: 'tutor_chat',     label: 'conversación' },
  { from: 'redo', to: 'tutor_actions',  label: 'acciones' },
  { from: 'redo', to: 'ai_generate',    label: 'genera contenido' },
  { from: 'redo', to: 'memoria',        label: 'recuerdos' },
  { from: 'redo', to: 'mascota_fe',     label: 'renderiza' },
  { from: 'redo', to: 'periodic',       label: 'elementos' },
  { from: 'llm',  to: 'deepseek',       label: 'API calls' },
  { from: 'tutor_chat',    to: 'llm',           label: 'genera respuesta' },
  { from: 'tutor_actions', to: 'llm',           label: 'decide acción' },
  { from: 'tutor_actions', to: 'ai_generate',   label: 'flashcards/quiz' },
  { from: 'tutor_chat',    to: 'periodic',      label: 'contexto elementos' },
  { from: 'mascota_fe',    to: 'speech_bubble',  label: 'muestra texto' },
  { from: 'mascota_fe',    to: 'mascota_menu',   label: 'abre menú' },
  { from: 'mascota_fe',    to: 'tutor_chat_ui',  label: 'abre chat' },
  { from: 'mascota_fe',    to: 'mascota_ctx',    label: 'contexto' },
  { from: 'mascota_fe',    to: 'pomodoro',       label: 'timer' },
  { from: 'tutor_chat_ui', to: 'tutor_chat',     label: 'fetch' },
  { from: 'mascota_fe',    to: 'home',           label: 'navega' },
  { from: 'tutor_actions', to: 'study',          label: 'redirige' },
  { from: 'tutor_actions', to: 'unidad',         label: 'redirige' },
  { from: 'ai_generate',   to: 'unidad',         label: 'contenido' },
  { from: 'memoria',       to: 'postgres',       label: 'persiste' },
  { from: 'ai_generate',   to: 'postgres',       label: 'guarda' },
  { from: 'tutor_chat',    to: 'postgres',       label: 'historial' },
  { from: 'api_endpoints', to: 'postgres',       label: 'CRUD' },
  { from: 'unidad',        to: 'r2_storage',     label: 'infografías' },
  { from: 'periodic',      to: 'api_endpoints',  label: 'GET /elementos' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function getConnectedIds(nodeId) {
  const ids = new Set();
  CONNECTIONS.forEach(c => {
    if (c.from === nodeId) ids.add(c.to);
    if (c.to === nodeId) ids.add(c.from);
  });
  return ids;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function Sinapsis() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [animPhase, setAnimPhase] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimPhase(1), 50);
    return () => clearTimeout(t);
  }, []);

  // Center scroll on Redo node initially
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const redo = NODES.find(n => n.id === 'redo');
    const t = setTimeout(() => {
      el.scrollTo({
        left: redo.x - el.clientWidth / 2,
        top: redo.y - el.clientHeight / 2 + 30,
        behavior: 'instant',
      });
    }, 10);
    return () => clearTimeout(t);
  }, []);

  const connectedSet = useMemo(() => selected ? getConnectedIds(selected) : new Set(), [selected]);

  // Animated canvas lines — redraws on scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    let offset = 0;
    let lastTime = 0;

    const draw = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      offset -= dt * 0.015;

      ctx.clearRect(0, 0, CW, CH);

      CONNECTIONS.forEach(conn => {
        const fromNode = NODES.find(n => n.id === conn.from);
        const toNode = NODES.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const cat = CATEGORIES[fromNode.cat];
        const color = cat?.color || '#666';
        const isHL = !selected || conn.from === selected || conn.to === selected;

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = isHL ? 0.35 : 0.05;
        ctx.lineWidth = isHL ? 2 : 0.8;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = offset;
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        if (isHL && selected && conn.label) {
          const mx = (fromNode.x + toNode.x) / 2;
          const my = (fromNode.y + toNode.y) / 2;
          ctx.globalAlpha = 0.5;
          ctx.font = "10px 'Silkscreen', monospace";
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(conn.label, mx, my - 6);
        }
        ctx.globalAlpha = 1;
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selected]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050510',
      zIndex: 9999, fontFamily: "'Silkscreen', cursive",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — fixed */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(5,5,16,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: '10px',
        zIndex: 10, flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', padding: '7px 12px',
            color: '#fff', cursor: 'pointer',
            fontFamily: "'Silkscreen', cursive", fontSize: '10px',
          }}
        >
          ← VOLVER
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px', fontWeight: 700,
            letterSpacing: '2px',
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            SINAPSIS
          </div>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', marginTop: '1px', letterSpacing: '1px' }}>
            MAPA NEURAL DE REDO
          </div>
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
          {NODES.length} nodos<br />{CONNECTIONS.length} conex.
        </div>
      </div>

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        onClick={() => setSelected(null)}
        style={{
          flex: 1,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Virtual canvas — larger than viewport */}
        <div style={{
          position: 'relative',
          width: CW,
          height: CH,
          minWidth: CW,
          minHeight: CH,
        }}>
          {/* Background grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              radial-gradient(circle at 450px 420px, rgba(139,92,246,0.06) 0%, transparent 50%),
              linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 50px 50px, 50px 50px',
          }} />

          {/* Canvas for connection lines */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: CW, height: CH,
              pointerEvents: 'none',
            }}
          />

          {/* Category zones — subtle bordered regions */}
          {ZONES.map(zone => {
            const cat = CATEGORIES[zone.cat];
            return (
              <div key={zone.cat} style={{
                position: 'absolute',
                left: zone.x, top: zone.y,
                width: zone.w, height: zone.h,
                borderRadius: '20px',
                border: `1px solid ${cat.color}15`,
                background: `${cat.color}06`,
                pointerEvents: 'none',
              }}>
                <span style={{
                  position: 'absolute', top: 6, left: 12,
                  fontSize: '7px', letterSpacing: '2px',
                  color: `${cat.color}50`,
                  fontWeight: 700,
                }}>
                  {zone.label}
                </span>
              </div>
            );
          })}

          {/* Nodes */}
          {NODES.map((node, i) => {
            const cat = CATEGORIES[node.cat];
            const isSelected = selected === node.id;
            const isCenter = node.id === 'redo';
            const highlighted = !selected || node.id === selected || connectedSet.has(node.id);

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(prev => prev === node.id ? null : node.id);
                }}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                  width: node.size,
                  height: node.size,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: animPhase ? (highlighted ? 1 : 0.2) : 0,
                  transition: 'opacity 0.4s ease',
                  animation: animPhase ? `sinapsis-node-in 0.5s ease-out ${i * 0.04}s both` : 'none',
                  zIndex: isSelected ? 5 : 2,
                }}
              >
                {/* Glow */}
                <div style={{
                  position: 'absolute',
                  width: node.size * 1.2,
                  height: node.size * 1.2,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${cat.color}${isSelected ? '28' : '10'} 0%, transparent 70%)`,
                  filter: isCenter ? 'blur(10px)' : 'blur(5px)',
                  animation: isCenter && !selected ? 'sinapsis-pulse 2.5s ease-in-out infinite' : 'none',
                }} />

                {/* Circle */}
                <div style={{
                  position: 'absolute',
                  width: node.size * 0.72,
                  height: node.size * 0.72,
                  borderRadius: '50%',
                  border: `${isCenter ? 2.5 : 1.5}px solid ${isSelected ? cat.color : `${cat.color}88`}`,
                  background: isSelected ? `${cat.color}18` : `${cat.color}08`,
                  boxShadow: isSelected ? `0 0 24px ${cat.color}30, inset 0 0 12px ${cat.color}10` : 'none',
                  transition: 'all 0.3s ease',
                }} />

                {/* Selected ring */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    width: node.size * 0.9,
                    height: node.size * 0.9,
                    borderRadius: '50%',
                    border: `1.5px dashed ${cat.color}66`,
                    animation: 'sinapsis-rotate 8s linear infinite',
                  }} />
                )}

                {/* Emoji */}
                <span style={{
                  fontSize: isCenter ? 28 : 20,
                  zIndex: 1,
                  filter: highlighted ? 'none' : 'grayscale(0.8)',
                  transition: 'filter 0.3s',
                }}>
                  {node.icon}
                </span>

                {/* Label */}
                <span style={{
                  position: 'absolute',
                  bottom: isCenter ? -6 : -2,
                  whiteSpace: 'nowrap',
                  fontSize: isCenter ? '9px' : '7px',
                  fontWeight: isCenter ? 700 : 400,
                  color: highlighted ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)',
                  textShadow: '0 0 10px rgba(0,0,0,0.9)',
                  letterSpacing: '0.3px',
                  transition: 'color 0.3s',
                  zIndex: 1,
                }}>
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — fixed bottom */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(5,5,16,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center',
        zIndex: 10, flexShrink: 0,
      }}>
        {Object.entries(CATEGORIES).map(([key, { color, label }]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px',
            background: `${color}0a`,
            border: `1px solid ${color}22`,
            borderRadius: '6px',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: color, boxShadow: `0 0 4px ${color}80`,
            }} />
            <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Detail panel — fixed */}
      {selected && (() => {
        const node = NODES.find(n => n.id === selected);
        if (!node) return null;
        const cat = CATEGORIES[node.cat];
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 48, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,10,30,0.94)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${cat.color}44`,
              borderRadius: '14px',
              padding: '11px 16px',
              maxWidth: '300px', width: '85%',
              zIndex: 30,
              animation: 'sinapsis-pop 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
              <span style={{ fontSize: '20px' }}>{node.icon}</span>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: cat.color }}>{node.label}</div>
                <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{cat.label}</div>
              </div>
            </div>
            <div style={{
              fontSize: '8px', color: 'rgba(255,255,255,0.45)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '5px', lineHeight: 1.5,
            }}>
              {connectedSet.size} conexión{connectedSet.size !== 1 ? 'es' : ''} →{' '}
              {[...connectedSet].map(id => NODES.find(n => n.id === id)?.label).filter(Boolean).join(', ')}
            </div>
          </div>
        );
      })()}

      {/* Keyframes */}
      <style>{`
        @keyframes sinapsis-node-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes sinapsis-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes sinapsis-rotate {
          to { transform: rotate(360deg); }
        }
        @keyframes sinapsis-pop {
          from { opacity: 0; transform: translateX(-50%) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}

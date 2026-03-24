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

/* ─── Nodes — positions as % of container (0-100) ─────────────────────────── */

const NODES = [
  { id: 'redo',           label: 'Redo AI',          cat: 'core',     px: 50,  py: 42,  size: 64, icon: '🤖' },

  { id: 'deepseek',       label: 'DeepSeek API',     cat: 'external', px: 14,  py: 14,  size: 52, icon: '🧠' },
  { id: 'llm',            label: 'LLM Client',       cat: 'backend',  px: 32,  py: 18,  size: 48, icon: '⚡' },

  { id: 'tutor_chat',     label: 'Tutor Chat',       cat: 'backend',  px: 62,  py: 12,  size: 48, icon: '💬' },
  { id: 'tutor_actions',  label: 'Tutor Actions',    cat: 'backend',  px: 82,  py: 22,  size: 48, icon: '🎯' },
  { id: 'ai_generate',    label: 'AI Generate',      cat: 'backend',  px: 84,  py: 48,  size: 48, icon: '✨' },

  { id: 'periodic',       label: 'Tabla Periódica',  cat: 'backend',  px: 12,  py: 44,  size: 48, icon: '⚗️' },
  { id: 'memoria',        label: 'RedoMemoria',      cat: 'backend',  px: 68,  py: 68,  size: 48, icon: '🧬' },

  { id: 'mascota_fe',     label: 'Mascota.jsx',      cat: 'frontend', px: 36,  py: 55,  size: 44, icon: '🎭' },
  { id: 'mascota_menu',   label: 'MascotaMenu',      cat: 'frontend', px: 18,  py: 68,  size: 40, icon: '📋' },
  { id: 'tutor_chat_ui',  label: 'TutorChat UI',     cat: 'frontend', px: 48,  py: 22,  size: 40, icon: '🖥️' },
  { id: 'speech_bubble',  label: 'SpeechBubble',     cat: 'frontend', px: 26,  py: 40,  size: 40, icon: '💭' },
  { id: 'mascota_ctx',    label: 'MascotaContext',   cat: 'frontend', px: 40,  py: 76,  size: 40, icon: '🔗' },
  { id: 'pomodoro',       label: 'Pomodoro',         cat: 'frontend', px: 86,  py: 68,  size: 40, icon: '🍅' },

  { id: 'home',           label: 'Home',             cat: 'screen',   px: 8,   py: 26,  size: 40, icon: '🏠' },
  { id: 'study',          label: 'Study',            cat: 'screen',   px: 90,  py: 12,  size: 40, icon: '📚' },
  { id: 'unidad',         label: 'UnidadDetail',     cat: 'screen',   px: 92,  py: 36,  size: 40, icon: '📖' },

  { id: 'postgres',       label: 'PostgreSQL',       cat: 'data',     px: 50,  py: 88,  size: 52, icon: '🗄️' },
  { id: 'api_endpoints',  label: 'API Endpoints',    cat: 'data',     px: 72,  py: 84,  size: 40, icon: '🔌' },
  { id: 'r2_storage',     label: 'Cloudflare R2',    cat: 'data',     px: 28,  py: 88,  size: 40, icon: '☁️' },
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
  const containerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [animPhase, setAnimPhase] = useState(0);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const rafRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimPhase(1), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const connectedSet = useMemo(() => selected ? getConnectedIds(selected) : new Set(), [selected]);

  // Get pixel position of a node
  const getPos = useCallback((node) => ({
    x: (node.px / 100) * dims.w,
    y: (node.py / 100) * dims.h,
  }), [dims]);

  // Canvas connection lines
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = dims.w * window.devicePixelRatio;
    canvas.height = dims.h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let offset = 0;
    let lastTime = 0;

    const draw = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      offset -= dt * 0.02;

      ctx.clearRect(0, 0, dims.w, dims.h);

      CONNECTIONS.forEach(conn => {
        const fromNode = NODES.find(n => n.id === conn.from);
        const toNode = NODES.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return;

        const from = getPos(fromNode);
        const to = getPos(toNode);
        const cat = CATEGORIES[fromNode.cat];
        const color = cat?.color || '#666';

        const isHighlighted = !selected ||
          conn.from === selected || conn.to === selected;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = isHighlighted ? 0.4 : 0.06;
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = offset;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Draw connection label when selected
        if (isHighlighted && selected && conn.label) {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          ctx.font = "9px 'Silkscreen', monospace";
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.textAlign = 'center';
          ctx.fillText(conn.label, mx, my - 5);
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dims, selected, getPos]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, background: '#050510',
        overflow: 'hidden', zIndex: 9999,
        fontFamily: "'Silkscreen', cursive",
      }}
      onClick={() => setSelected(null)}
    >
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 50% 42%, rgba(139,92,246,0.08) 0%, transparent 60%),
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 50px 50px, 50px 50px',
        opacity: animPhase ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }} />

      {/* Canvas for animated connection lines */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: dims.w, height: dims.h,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '14px 20px 20px',
        background: 'linear-gradient(to bottom, rgba(5,5,16,0.95) 50%, transparent)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', padding: '8px 14px',
            color: '#fff', cursor: 'pointer',
            fontFamily: "'Silkscreen', cursive", fontSize: '11px',
          }}
        >
          ← VOLVER
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px', fontWeight: 700,
            letterSpacing: '2px',
            background: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            SINAPSIS
          </div>
          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', letterSpacing: '1px' }}>
            MAPA NEURAL DE REDO
          </div>
        </div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
          {NODES.length} nodos<br />{CONNECTIONS.length} conexiones
        </div>
      </div>

      {/* Nodes — HTML divs at percentage positions */}
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
              left: `${node.px}%`,
              top: `${node.py}%`,
              transform: 'translate(-50%, -50%)',
              width: node.size,
              height: node.size,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: animPhase ? (highlighted ? 1 : 0.2) : 0,
              transition: 'opacity 0.4s ease, transform 0.3s ease',
              animation: animPhase ? `sinapsis-enter 0.6s ease-out ${i * 0.05}s both` : 'none',
              zIndex: isSelected ? 5 : 2,
            }}
          >
            {/* Glow background */}
            <div style={{
              position: 'absolute',
              width: node.size,
              height: node.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${cat.color}${isSelected ? '30' : '12'} 0%, transparent 70%)`,
              filter: isCenter ? 'blur(8px)' : (isSelected ? 'blur(6px)' : 'blur(4px)'),
              animation: isCenter && !selected ? 'sinapsis-pulse 2.5s ease-in-out infinite' : 'none',
            }} />

            {/* Circle border */}
            <div style={{
              position: 'absolute',
              width: node.size * 0.75,
              height: node.size * 0.75,
              borderRadius: '50%',
              border: `${isCenter ? 2.5 : 1.5}px solid ${cat.color}`,
              borderColor: isSelected ? cat.color : `${cat.color}99`,
              background: `${cat.color}10`,
              boxShadow: isSelected
                ? `0 0 20px ${cat.color}40, inset 0 0 15px ${cat.color}15`
                : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }} />

            {/* Rotating dashed ring when selected */}
            {isSelected && (
              <div style={{
                position: 'absolute',
                width: node.size * 0.92,
                height: node.size * 0.92,
                borderRadius: '50%',
                border: `1.5px dashed ${cat.color}88`,
                animation: 'sinapsis-rotate 8s linear infinite',
              }} />
            )}

            {/* Icon */}
            <span style={{
              fontSize: isCenter ? 26 : 20,
              zIndex: 1,
              filter: highlighted ? 'none' : 'grayscale(0.8)',
              transition: 'filter 0.3s',
            }}>
              {node.icon}
            </span>

            {/* Label below */}
            <span style={{
              position: 'absolute',
              bottom: -4,
              whiteSpace: 'nowrap',
              fontSize: isCenter ? '9px' : '7px',
              fontWeight: isCenter ? 700 : 400,
              color: highlighted ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              textShadow: highlighted ? '0 0 8px rgba(0,0,0,0.8)' : 'none',
              letterSpacing: '0.5px',
              transition: 'color 0.3s',
              zIndex: 1,
            }}>
              {node.label}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, right: 12,
        display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center',
        zIndex: 10,
        opacity: animPhase ? 1 : 0,
        transition: 'opacity 0.8s ease 0.6s',
      }}>
        {Object.entries(CATEGORIES).map(([key, { color, label }]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            background: 'rgba(5,5,16,0.7)',
            border: `1px solid ${color}33`,
            borderRadius: '8px',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, boxShadow: `0 0 6px ${color}80`,
            }} />
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (() => {
        const node = NODES.find(n => n.id === selected);
        if (!node) return null;
        const cat = CATEGORIES[node.cat];
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,10,30,0.92)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${cat.color}44`,
              borderRadius: '16px',
              padding: '12px 18px',
              maxWidth: '320px', width: '88%',
              zIndex: 20,
              animation: 'sinapsis-enter 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '22px' }}>{node.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: cat.color }}>{node.label}</div>
                <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{cat.label}</div>
              </div>
            </div>
            <div style={{
              fontSize: '9px', color: 'rgba(255,255,255,0.5)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '6px', lineHeight: 1.5,
            }}>
              {connectedSet.size} conexión{connectedSet.size !== 1 ? 'es' : ''} →{' '}
              {[...connectedSet].map(id => NODES.find(n => n.id === id)?.label).filter(Boolean).join(', ')}
            </div>
          </div>
        );
      })()}

      {/* Keyframes */}
      <style>{`
        @keyframes sinapsis-enter {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes sinapsis-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes sinapsis-rotate {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

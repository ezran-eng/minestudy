import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Node & connection data ──────────────────────────────────────────────── */

const CATEGORIES = {
  core:     { color: '#a78bfa', label: 'Núcleo IA' },
  backend:  { color: '#60a5fa', label: 'Backend' },
  frontend: { color: '#34d399', label: 'Frontend' },
  external: { color: '#f472b6', label: 'Externo' },
  data:     { color: '#fbbf24', label: 'Datos' },
  screen:   { color: '#fb923c', label: 'Pantallas' },
};

const NODES = [
  // Center
  { id: 'redo',           label: 'Redo AI',          cat: 'core',     x: 0,    y: 0,    r: 28, icon: '🤖' },
  // Inner ring — core systems
  { id: 'deepseek',       label: 'DeepSeek API',     cat: 'external', x: -160, y: -120, r: 20, icon: '🧠' },
  { id: 'llm',            label: 'LLM Client',       cat: 'backend',  x: -80,  y: -160, r: 18, icon: '⚡' },
  { id: 'tutor_chat',     label: 'Tutor Chat',       cat: 'backend',  x: 100,  y: -140, r: 18, icon: '💬' },
  { id: 'tutor_actions',  label: 'Tutor Actions',    cat: 'backend',  x: 180,  y: -60,  r: 18, icon: '🎯' },
  { id: 'ai_generate',    label: 'AI Generate',      cat: 'backend',  x: 170,  y: 60,   r: 18, icon: '✨' },
  { id: 'memoria',        label: 'RedoMemoria',      cat: 'backend',  x: 80,   y: 160,  r: 18, icon: '🧬' },
  { id: 'periodic',       label: 'Tabla Periódica',  cat: 'backend',  x: -170, y: 40,   r: 18, icon: '⚗️' },
  // Frontend components
  { id: 'mascota_fe',     label: 'Mascota.jsx',      cat: 'frontend', x: -60,  y: 100,  r: 16, icon: '🎭' },
  { id: 'mascota_menu',   label: 'MascotaMenu',      cat: 'frontend', x: -140, y: 140,  r: 14, icon: '📋' },
  { id: 'tutor_chat_ui',  label: 'TutorChat UI',     cat: 'frontend', x: 20,   y: -90,  r: 14, icon: '🖥️' },
  { id: 'speech_bubble',  label: 'SpeechBubble',     cat: 'frontend', x: -100, y: 60,   r: 14, icon: '💭' },
  { id: 'mascota_ctx',    label: 'MascotaContext',   cat: 'frontend', x: -30,  y: 170,  r: 14, icon: '🔗' },
  { id: 'pomodoro',       label: 'Pomodoro',         cat: 'frontend', x: 140,  y: 140,  r: 14, icon: '🍅' },
  // Screens
  { id: 'home',           label: 'Home',             cat: 'screen',   x: -200, y: -60,  r: 14, icon: '🏠' },
  { id: 'study',          label: 'Study',            cat: 'screen',   x: 200,  y: -120, r: 14, icon: '📚' },
  { id: 'unidad',         label: 'UnidadDetail',     cat: 'screen',   x: 210,  y: 10,   r: 14, icon: '📖' },
  // Data layer
  { id: 'postgres',       label: 'PostgreSQL',       cat: 'data',     x: 0,    y: 220,  r: 18, icon: '🗄️' },
  { id: 'api_endpoints',  label: 'API Endpoints',    cat: 'data',     x: 120,  y: 200,  r: 14, icon: '🔌' },
  { id: 'r2_storage',     label: 'Cloudflare R2',    cat: 'data',     x: -120, y: 210,  r: 14, icon: '☁️' },
];

const CONNECTIONS = [
  // Redo core connections
  { from: 'redo', to: 'llm',            label: 'prompts' },
  { from: 'redo', to: 'tutor_chat',     label: 'conversación' },
  { from: 'redo', to: 'tutor_actions',  label: 'acciones' },
  { from: 'redo', to: 'ai_generate',    label: 'genera contenido' },
  { from: 'redo', to: 'memoria',        label: 'recuerdos' },
  { from: 'redo', to: 'mascota_fe',     label: 'renderiza' },
  { from: 'redo', to: 'periodic',       label: 'elementos' },
  // LLM → DeepSeek
  { from: 'llm',  to: 'deepseek',       label: 'API calls' },
  // Tutor system
  { from: 'tutor_chat',    to: 'llm',           label: 'genera respuesta' },
  { from: 'tutor_actions', to: 'llm',           label: 'decide acción' },
  { from: 'tutor_actions', to: 'ai_generate',   label: 'flashcards/quiz' },
  { from: 'tutor_chat',    to: 'periodic',      label: 'contexto elementos' },
  // Frontend wiring
  { from: 'mascota_fe',    to: 'speech_bubble',  label: 'muestra texto' },
  { from: 'mascota_fe',    to: 'mascota_menu',   label: 'abre menú' },
  { from: 'mascota_fe',    to: 'tutor_chat_ui',  label: 'abre chat' },
  { from: 'mascota_fe',    to: 'mascota_ctx',    label: 'contexto' },
  { from: 'mascota_fe',    to: 'pomodoro',       label: 'timer' },
  { from: 'tutor_chat_ui', to: 'tutor_chat',     label: 'fetch' },
  // Screens
  { from: 'mascota_fe',    to: 'home',           label: 'navega' },
  { from: 'tutor_actions', to: 'study',          label: 'redirige' },
  { from: 'tutor_actions', to: 'unidad',         label: 'redirige' },
  { from: 'ai_generate',   to: 'unidad',         label: 'contenido' },
  // Data
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
  const svgRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [animPhase, setAnimPhase] = useState(0); // 0=entering, 1=ready
  const touchRef = useRef({ startX: 0, startY: 0, ox: 0, oy: 0, pinchDist: 0, pinchScale: 1 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isPanning = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimPhase(1), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cx = dimensions.w / 2;
  const cy = dimensions.h / 2;

  // Scale nodes to fit screen
  const nodeScale = useMemo(() => Math.min(dimensions.w, dimensions.h) / 520, [dimensions]);

  const connectedSet = useMemo(() => selected ? getConnectedIds(selected) : new Set(), [selected]);

  const isHighlighted = useCallback((id) => {
    if (!selected) return true;
    return id === selected || connectedSet.has(id);
  }, [selected, connectedSet]);

  const isConnectionHighlighted = useCallback((from, to) => {
    if (!selected) return true;
    return (from === selected || to === selected);
  }, [selected]);

  /* ── Touch / mouse pan & zoom ─────────────────────────────────────────── */

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.sinapsis-node')) return;
    isPanning.current = true;
    touchRef.current.startX = e.clientX;
    touchRef.current.startY = e.clientY;
    touchRef.current.ox = pan.x;
    touchRef.current.oy = pan.y;
  }, [pan]);

  const onPointerMove = useCallback((e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - touchRef.current.startX;
    const dy = e.clientY - touchRef.current.startY;
    setPan({ x: touchRef.current.ox + dx, y: touchRef.current.oy + dy });
  }, []);

  const onPointerUp = useCallback(() => { isPanning.current = false; }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setScale(s => Math.max(0.4, Math.min(2.5, s - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  /* ── Pinch zoom ───────────────────────────────────────────────────────── */

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current.pinchDist = Math.sqrt(dx * dx + dy * dy);
      touchRef.current.pinchScale = scale;
    }
  }, [scale]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / touchRef.current.pinchDist;
      setScale(Math.max(0.4, Math.min(2.5, touchRef.current.pinchScale * ratio)));
    }
  }, []);

  const selectedNode = selected ? NODES.find(n => n.id === selected) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#050510',
      overflow: 'hidden', zIndex: 9999,
      fontFamily: "'Silkscreen', cursive",
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%),
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        opacity: animPhase ? 1 : 0,
        transition: 'opacity 1s ease',
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        padding: '16px 20px 12px',
        background: 'linear-gradient(to bottom, rgba(5,5,16,0.95) 60%, transparent)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
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
            fontSize: '14px', fontWeight: 700, color: '#fff',
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

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.w}
        height={dimensions.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClick={(e) => { if (!e.target.closest('.sinapsis-node')) setSelected(null); }}
        style={{ touchAction: 'none', cursor: isPanning.current ? 'grabbing' : 'grab' }}
      >
        <defs>
          {/* Glow filters */}
          {Object.entries(CATEGORIES).map(([key, { color }]) => (
            <filter key={key} id={`glow-${key}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor={color} floodOpacity="0.6" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Pulse glow for center */}
          <filter id="glow-pulse" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor="#a78bfa" floodOpacity="0.8" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Animated dash */}
          <style>{`
            @keyframes dash-flow {
              to { stroke-dashoffset: -20; }
            }
            @keyframes pulse-ring {
              0% { r: 28; opacity: 0.6; }
              100% { r: 44; opacity: 0; }
            }
            @keyframes node-enter {
              from { opacity: 0; transform: scale(0); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </defs>

        <g transform={`translate(${cx + pan.x}, ${cy + pan.y}) scale(${scale * nodeScale})`}>
          {/* Connections */}
          {CONNECTIONS.map((conn, i) => {
            const fromNode = NODES.find(n => n.id === conn.from);
            const toNode = NODES.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            const highlighted = isConnectionHighlighted(conn.from, conn.to);
            const color = CATEGORIES[fromNode.cat]?.color || '#666';

            return (
              <g key={i}>
                <line
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x} y2={toNode.y}
                  stroke={color}
                  strokeWidth={highlighted ? 1.5 : 0.5}
                  strokeOpacity={highlighted ? 0.5 : 0.08}
                  strokeDasharray="6 4"
                  style={{
                    animation: highlighted ? 'dash-flow 1s linear infinite' : 'none',
                    transition: 'stroke-opacity 0.4s ease',
                  }}
                />
                {/* Connection label on hover */}
                {highlighted && selected && conn.label && (
                  <text
                    x={(fromNode.x + toNode.x) / 2}
                    y={(fromNode.y + toNode.y) / 2 - 6}
                    fill="rgba(255,255,255,0.5)"
                    fontSize="7"
                    textAnchor="middle"
                    fontFamily="'Silkscreen', cursive"
                    style={{ pointerEvents: 'none' }}
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Pulse rings on center node */}
          {!selected && (
            <>
              <circle cx={0} cy={0} r={28} fill="none" stroke="#a78bfa" strokeWidth="1.5"
                style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
              <circle cx={0} cy={0} r={28} fill="none" stroke="#a78bfa" strokeWidth="1"
                style={{ animation: 'pulse-ring 2s ease-out infinite 1s' }} />
            </>
          )}

          {/* Nodes */}
          {NODES.map((node, i) => {
            const cat = CATEGORIES[node.cat];
            const highlighted = isHighlighted(node.id);
            const isSelected = selected === node.id;
            const isCenter = node.id === 'redo';

            return (
              <g
                key={node.id}
                className="sinapsis-node"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={(e) => { e.stopPropagation(); setSelected(prev => prev === node.id ? null : node.id); }}
                style={{
                  cursor: 'pointer',
                  opacity: animPhase ? (highlighted ? 1 : 0.15) : 0,
                  transition: 'opacity 0.4s ease',
                  animation: animPhase ? `node-enter 0.5s ease-out ${i * 0.04}s both` : 'none',
                }}
              >
                {/* Outer glow ring when selected */}
                {isSelected && (
                  <circle r={node.r + 6} fill="none" stroke={cat.color} strokeWidth="2"
                    strokeOpacity="0.6" strokeDasharray="4 3"
                    style={{ animation: 'dash-flow 2s linear infinite' }}
                  />
                )}
                {/* Main circle */}
                <circle
                  r={node.r}
                  fill={`${cat.color}18`}
                  stroke={cat.color}
                  strokeWidth={isCenter ? 2 : 1.2}
                  strokeOpacity={highlighted ? 0.8 : 0.2}
                  filter={isCenter ? 'url(#glow-pulse)' : (isSelected ? `url(#glow-${node.cat})` : 'none')}
                />
                {/* Icon */}
                <text
                  y={node.r > 18 ? -3 : -1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={node.r > 20 ? 18 : 13}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.icon}
                </text>
                {/* Label */}
                <text
                  y={node.r + 10}
                  textAnchor="middle"
                  fill={highlighted ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'}
                  fontSize={isCenter ? 8 : 6.5}
                  fontFamily="'Silkscreen', cursive"
                  fontWeight={isCenter ? 700 : 400}
                  style={{ pointerEvents: 'none', transition: 'fill 0.3s ease' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16,
        display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
        opacity: animPhase ? 1 : 0,
        transition: 'opacity 0.8s ease 0.5s',
      }}>
        {Object.entries(CATEGORIES).map(([key, { color, label }]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${color}33`,
            borderRadius: '8px',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: color, boxShadow: `0 0 6px ${color}80`,
            }} />
            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Silkscreen', cursive" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,30,0.92)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${CATEGORIES[selectedNode.cat]?.color}44`,
          borderRadius: '16px',
          padding: '14px 20px',
          maxWidth: '320px', width: '90%',
          animation: 'mascota-pop 0.2s ease-out',
          zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '22px' }}>{selectedNode.icon}</span>
            <div>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: CATEGORIES[selectedNode.cat]?.color,
                fontFamily: "'Silkscreen', cursive",
              }}>
                {selectedNode.label}
              </div>
              <div style={{
                fontSize: '8px', color: 'rgba(255,255,255,0.4)',
                fontFamily: "'Silkscreen', cursive", marginTop: '2px',
              }}>
                {CATEGORIES[selectedNode.cat]?.label}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '9px', color: 'rgba(255,255,255,0.5)',
            fontFamily: "'Silkscreen', cursive",
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '8px',
          }}>
            {connectedSet.size} conexión{connectedSet.size !== 1 ? 'es' : ''} →{' '}
            {[...connectedSet].map(id => NODES.find(n => n.id === id)?.label).filter(Boolean).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

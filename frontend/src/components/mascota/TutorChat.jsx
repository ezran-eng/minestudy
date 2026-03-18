import React, { useState, useRef, useEffect, useCallback } from 'react';
import { tutorChat } from '../../services/api';

// ── Typing indicator ─────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{
      display: 'flex', gap: '4px', padding: '10px 14px',
      alignSelf: 'flex-start',
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'rgba(167,139,250,0.6)',
          animation: `ob-fade-up 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
        }} />
      ))}
    </div>
  );
}

// ── Single message bubble ────────────────────────────────────────────────────
function ChatMessage({ role, content, isLatest }) {
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'ob-fade-up 0.25s ease-out',
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'rgba(139,92,246,0.2)'
          : 'rgba(255,255,255,0.06)',
        border: `1px solid ${isUser ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
        fontFamily: "'Outfit', sans-serif",
        fontSize: '13px',
        lineHeight: 1.55,
        color: isUser ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.85)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {!isUser && (
          <div style={{
            fontSize: '10px', fontWeight: 600, color: 'rgba(167,139,250,0.7)',
            marginBottom: '4px', letterSpacing: '0.04em',
          }}>REDO</div>
        )}
        {content}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TutorChat — full-screen chat panel
// ═════════════════════════════════════════════════════════════════════════════
export default function TutorChat({ userId, unidadId, unidadNombre, materiaNombre, onClose }) {
  const [messages, setMessages] = useState([]); // { role, content, id }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Handle viewport resize (keyboard open/close)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  const sendMessage = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', content: q, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history for API (exclude the id field)
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { respuesta } = await tutorChat(userId, unidadId, history.slice(0, -1), q);

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: respuesta, id: Date.now() + 1 },
      ]);
    } catch (e) {
      console.error('[TutorChat]', e);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Perdón, hubo un error. Intentá de nuevo.', id: Date.now() + 1 },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, userId, unidadId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const contextLabel = materiaNombre && unidadNombre
    ? `${materiaNombre} → ${unidadNombre}`
    : materiaNombre || 'General';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#050510',
      zIndex: 2500,
      display: 'flex', flexDirection: 'column',
      animation: 'ob-fade-up 0.25s ease-out',
    }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: `${safeTop + 12}px 16px 12px`,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '18px', lineHeight: 1,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 600,
            color: '#fff',
          }}>Preguntale a Redo</div>
          <div style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '11px',
            color: 'rgba(167,139,250,0.7)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{contextLabel}</div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: '10px',
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.25)',
          fontFamily: "'Outfit', sans-serif", fontSize: '10px', fontWeight: 600,
          color: 'rgba(167,139,250,0.8)', letterSpacing: '0.04em',
        }}>IA</div>
      </div>

      {/* ── Messages area ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Welcome message */}
        {messages.length === 0 && !loading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', flex: 1, gap: '12px',
            padding: '20px',
          }}>
            <div style={{ fontSize: '32px' }}>🐾</div>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: '14px',
              color: 'rgba(255,255,255,0.4)', textAlign: 'center',
              lineHeight: 1.5, maxWidth: '260px',
            }}>
              {unidadNombre
                ? `Preguntame cualquier cosa sobre ${unidadNombre}. Conozco las flashcards, quizzes y temas.`
                : 'Preguntame lo que necesites sobre tus materias. Cuanto más específico, mejor te ayudo.'
              }
            </div>
            {/* Suggested questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '280px', marginTop: '8px' }}>
              {(unidadNombre ? [
                `Explicame los temas de ${unidadNombre}`,
                '¿Qué debería repasar primero?',
                'Haceme un resumen rápido',
              ] : [
                '¿Qué debería estudiar hoy?',
                '¿En qué materias estoy más flojo?',
                '¿Cómo funciona el sistema de flashcards?',
              ]).map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.15)',
                    borderRadius: '12px',
                    padding: '9px 14px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '12px', color: 'rgba(167,139,250,0.7)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isLatest={i === messages.length - 1}
          />
        ))}

        {loading && <TypingDots />}
      </div>

      {/* ── Input area ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: '8px',
        padding: '12px 16px',
        paddingBottom: `max(12px, env(safe-area-inset-bottom, 12px))`,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(5,5,16,0.95)',
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu pregunta..."
          disabled={loading}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '11px 16px',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '14px',
            color: '#fff',
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            width: '44px', height: '44px',
            borderRadius: '14px',
            background: input.trim() && !loading
              ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
              : 'rgba(255,255,255,0.06)',
            border: 'none',
            color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: '18px',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↑</button>
      </div>
    </div>
  );
}

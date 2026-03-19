import React, { useState } from 'react';
import RedoMini from '../components/RedoMini';

const SLIDES = [
  { mode: 'full', text: 'Bienvenido a la Zona Libre.' },
  { mode: 'idle', text: 'En internet, cualquier archivo puede desaparecer. Un servidor se cae, alguien lo censura, un link se rompe.' },
  { mode: 'idle', text: 'Acá es diferente. Los archivos que subas viajan a la red TON — miles de nodos en todo el mundo los guardan.' },
  { mode: 'idle', text: 'Nadie puede borrarlos. Ni yo, ni DaathApp, ni ningún gobierno. Son tuyos para siempre.' },
  { mode: 'idle', text: 'Una sola regla: respetá a la comunidad. Podés reportar contenido inapropiado. Yo me encargo del resto.' },
  { mode: 'full', text: '¿Listo para la resistencia digital? 👁', isFinal: true },
];

export default function ZonaLibreOnboarding({ onEnter }) {
  const [step, setStep] = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  const slide = SLIDES[step];
  const isLast = slide.isFinal;

  const handleNext = () => {
    if (isLast) {
      if (noMostrar) {
        localStorage.setItem('zona_libre_onboarding_visto', 'true');
      }
      onEnter();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      zIndex: 2500,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: `${safeTop + 20}px 24px 40px`,
      animation: 'ob-fade-up 0.3s ease-out',
    }}>
      {/* Step dots */}
      <div style={{
        display: 'flex', gap: '6px',
        position: 'absolute', top: `${safeTop + 16}px`,
      }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === step ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i === step ? '#f0f0f0' : '#333',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      {/* Redo */}
      <div style={{
        marginBottom: '32px',
        animation: 'ob-fade-up 0.4s ease-out',
      }}>
        <RedoMini key={step} size={120} mode={slide.mode} />
      </div>

      {/* Text */}
      <div
        key={`text-${step}`}
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '18px',
          fontWeight: 500,
          color: '#e0e0e0',
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: '300px',
          animation: 'ob-fade-up 0.4s ease-out',
        }}
      >
        {slide.text}
      </div>

      {/* Bottom area */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '24px', right: '24px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px',
      }}>
        {/* Checkbox on last slide */}
        {isLast && (
          <div
            onClick={() => setNoMostrar(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '18px', height: '18px', borderRadius: '5px',
              border: `1px solid ${noMostrar ? '#f0f0f0' : '#333'}`,
              background: noMostrar ? '#f0f0f0' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              fontSize: '11px', color: '#0a0a0a', fontWeight: 700,
            }}>
              {noMostrar && '✓'}
            </div>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '12px', color: '#666',
            }}>
              No mostrar otra vez
            </span>
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: isLast ? '#f0f0f0' : 'rgba(240,240,240,0.08)',
            color: isLast ? '#0a0a0a' : '#e0e0e0',
            fontFamily: "'Silkscreen', cursive",
            fontSize: '12px', fontWeight: 700,
            letterSpacing: '0.06em',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {isLast ? 'ENTRAR A ZONA LIBRE' : 'SIGUIENTE'}
        </button>
      </div>
    </div>
  );
}

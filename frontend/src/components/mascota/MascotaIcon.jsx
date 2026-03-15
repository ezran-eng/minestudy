import React from 'react';
import Lottie from 'lottie-react';
import tamagadgetIconData from '../../assets/lotties/tamagadgetIcon.json';

const OUTER_STARS = [0, 60, 120, 180, 240, 300];
const INNER_DOTS = [45, 135, 225, 315];

export default function MascotaIcon({ iconKey, lottieIconRef, autoplay, onDOMLoaded, onComplete, onTap }) {
  return (
    <div
      onClick={onTap}
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
          {OUTER_STARS.map((deg, i) => (
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
          {INNER_DOTS.map((deg, i) => (
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
        autoplay={autoplay}
        onDOMLoaded={onDOMLoaded}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
      />
    </div>
  );
}

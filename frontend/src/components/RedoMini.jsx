import React, { useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';

const SEG_IDLE = [67, 89];
const SEG_FULL = [60, 240];

/**
 * Mini Redo Lottie that loops a segment correctly.
 * mode: 'idle' (default) or 'full'
 */
export default function RedoMini({ size = 40, mode = 'idle', style }) {
  const lottieRef = useRef(null);
  const seg = mode === 'full' ? SEG_FULL : SEG_IDLE;

  const onComplete = useCallback(() => {
    lottieRef.current?.playSegments(seg, true);
  }, [seg]);

  const onDOMLoaded = useCallback(() => {
    lottieRef.current?.playSegments(seg, true);
  }, [seg]);

  return (
    <div style={{ width: size, height: size, flexShrink: 0, ...style }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={mascotaData}
        loop={false}
        autoplay={false}
        onDOMLoaded={onDOMLoaded}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

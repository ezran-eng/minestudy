import React, { useRef, useCallback } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';

const SEG_IDLE = [67, 89];
const SEG_FULL = [60, 240];

/**
 * Mini Redo Lottie that replicates the main Mascota idle breathing:
 * - idle mode: ping-pong SEG_IDLE at speed 0.22 (slow breathing)
 * - full mode: loops SEG_FULL at normal speed
 */
export default function RedoMini({ size = 40, mode = 'idle', style }) {
  const lottieRef = useRef(null);
  const directionRef = useRef(1);
  const isIdle = mode === 'idle';
  const seg = isIdle ? SEG_IDLE : SEG_FULL;

  const start = useCallback(() => {
    if (isIdle) {
      lottieRef.current?.setSpeed(0.22);
      directionRef.current = 1;
      lottieRef.current?.setDirection(1);
    }
    lottieRef.current?.playSegments(seg, true);
  }, [seg, isIdle]);

  const onComplete = useCallback(() => {
    if (isIdle) {
      // ping-pong: reverse direction and play again
      directionRef.current *= -1;
      lottieRef.current?.setDirection(directionRef.current);
      lottieRef.current?.play();
    } else {
      lottieRef.current?.playSegments(seg, true);
    }
  }, [seg, isIdle]);

  return (
    <div style={{ width: size, height: size, flexShrink: 0, ...style }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={mascotaData}
        loop={false}
        autoplay={false}
        onDOMLoaded={start}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

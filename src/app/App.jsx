/**
 * App.jsx
 * Abdul Saboor — Interactive Hero & Portfolio Application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import HeroTypography from '../features/hero/HeroTypography.jsx';
import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import { NEUTRAL_YAW, NEUTRAL_PITCH } from '../features/portrait/frameData.js';
import '../styles/App.css';

export default function App() {
  // Ref to PortraitCanvas imperative handle (for recenter)
  const canvasRef = useRef(null);

  // Detect reduced-motion accessibility preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Shared ref for continuous 60fps pose and canvas element (no React re-renders)
  const poseRef = useRef({
    yaw: NEUTRAL_YAW,
    pitch: NEUTRAL_PITCH,
    canvas: null,
  });

  const { getImage, loadedSet, isCenterLoaded } = useFramePreloader();

  // Intro coordination states
  const [heroTypoDone, setHeroTypoDone] = useState(prefersReducedMotion);
  const [portraitRevealed, setPortraitRevealed] = useState(prefersReducedMotion);

  const handleHeroReady = useCallback(() => {
    setHeroTypoDone(true);
  }, []);

  // Reveal portrait once typography construction completes AND center neutral frame is ready
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (heroTypoDone && isCenterLoaded) {
      // Smooth cinematic reveal of the portrait
      const timer = setTimeout(() => {
        setPortraitRevealed(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [heroTypoDone, isCenterLoaded, prefersReducedMotion]);

  const handleFrameChange = useCallback((_info) => {
    // Underlying frame info callback preserved
  }, []);

  return (
    <div className="app">
      {/* ── Background Editorial Typography Layer ── */}
      <HeroTypography
        onHeroReady={handleHeroReady}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* ── Centerpiece Portrait Stage ── */}
      <div
        className={`portrait-stage ${portraitRevealed ? 'is-revealed' : 'is-hidden'}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PortraitCanvas
          ref={canvasRef}
          poseRef={poseRef}
          getImage={getImage}
          loadedSet={loadedSet}
          isCenterLoaded={isCenterLoaded}
          onFrameChange={handleFrameChange}
        />
      </div>
    </div>
  );
}

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

  // Intro sequence state machine:
  // 1. Typography pixel construction: active initially
  // 2. Portrait pixel formation: begins strictly when typography finishes AND neutral frame 189 is loaded
  // 3. Interactive hero: unlocked once portrait pixel formation completes
  const [heroTypoDone, setHeroTypoDone] = useState(prefersReducedMotion);
  const [portraitFormed, setPortraitFormed] = useState(prefersReducedMotion);

  const handleHeroReady = useCallback(() => {
    setHeroTypoDone(true);
  }, []);

  const handleFormationComplete = useCallback(() => {
    setPortraitFormed(true);
  }, []);

  // Formation starts when typography is completely done and neutral frame 189 is loaded
  const isFormationActive = (heroTypoDone && isCenterLoaded) || prefersReducedMotion;

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
        className={`portrait-stage ${portraitFormed ? 'is-interactive' : 'is-forming'}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PortraitCanvas
          ref={canvasRef}
          poseRef={poseRef}
          getImage={getImage}
          loadedSet={loadedSet}
          isCenterLoaded={isCenterLoaded}
          onFrameChange={handleFrameChange}
          formationActive={isFormationActive}
          onFormationComplete={handleFormationComplete}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>
    </div>
  );
}

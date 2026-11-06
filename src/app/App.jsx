/**
 * App.jsx
 * Abdul Saboor — Interactive Hero & Portfolio Application
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import HeroTypography from '../features/hero/HeroTypography.jsx';
import StartupLoader from '../features/startup/StartupLoader.jsx';
import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import { NEUTRAL_YAW, NEUTRAL_PITCH } from '../features/portrait/frameData.js';
import { MIN_WAITING_RUN_MS } from '../features/startup/startupTiming.js';
import '../styles/App.css';

// Explicit Startup Lifecycle — the dinosaur runs on every load, cached or not
const STARTUP_LIFECYCLE = {
  ENTERING: 'ENTERING',
  WAITING: 'WAITING',
  EXITING: 'EXITING',
  DUST_FINISHING: 'DUST_FINISHING',
  COMPLETED: 'COMPLETED',
};

function removeStartupShell() {
  if (typeof document !== 'undefined') {
    const shell = document.getElementById('startup-shell');
    if (shell) {
      shell.remove();
    }
  }
}

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

  const {
    getImage,
    loadedSet,
    isCenterLoaded,
    centerLoadError,
    retryCenter,
  } = useFramePreloader();

  // ── Genuine Startup Readiness Detection ──
  const [fontsReady, setFontsReady] = useState(() => {
    if (typeof document !== 'undefined' && document.fonts) {
      return document.fonts.status === 'loaded';
    }
    return true;
  });

  useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => setFontsReady(true))
        .catch(() => setFontsReady(true));
    }
  }, []);

  const isEssentialReady = fontsReady && isCenterLoaded;

  // ── Explicit Lifecycle State Machine ──
  // The dinosaur is part of the experience rather than a conditional loading
  // indicator: every load enters the same lifecycle, and reduced motion gets an
  // abbreviated presentation instead of being skipped.
  const [startupState, setStartupState] = useState(STARTUP_LIFECYCLE.ENTERING);

  const essentialReadyRef = useRef(false);
  const dinoArrivedAtRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    essentialReadyRef.current = isEssentialReady;
  }, [isEssentialReady]);

  // Runs in the same commit that mounts the loader and before paint, so the
  // pre-React shell dinosaur and the React dinosaur swap without a blank frame.
  useLayoutEffect(() => {
    removeStartupShell();
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  // Readiness never cuts the sequence short: the minimum waiting period is
  // measured from the moment the dinosaur reaches the centre. Reduced motion
  // waits for readiness only, since there is no run to watch.
  const scheduleExit = useCallback(() => {
    if (exitTimerRef.current !== null) return;
    const arrivedAt = dinoArrivedAtRef.current;
    if (arrivedAt === null) return;

    const remaining = prefersReducedMotion
      ? 0
      : Math.max(0, MIN_WAITING_RUN_MS - (performance.now() - arrivedAt));
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setStartupState((prev) =>
        prev === STARTUP_LIFECYCLE.WAITING ? STARTUP_LIFECYCLE.EXITING : prev,
      );
    }, remaining);
  }, [prefersReducedMotion]);

  // 1. Readiness handler: an already-warm cache still runs the full visible
  //    sequence — readiness only decides when the centre wait may end.
  useEffect(() => {
    if (!isEssentialReady) return;
    if (startupState === STARTUP_LIFECYCLE.WAITING) scheduleExit();
    // ENTERING: the centre-arrival effect schedules the exit instead.
  }, [isEssentialReady, startupState, scheduleExit]);

  // 2. Centre arrival starts the minimum waiting period.
  const handleEntranceComplete = useCallback(() => {
    setStartupState((prev) =>
      prev === STARTUP_LIFECYCLE.ENTERING ? STARTUP_LIFECYCLE.WAITING : prev,
    );
  }, []);

  useEffect(() => {
    if (startupState !== STARTUP_LIFECYCLE.WAITING) return;
    if (dinoArrivedAtRef.current === null) {
      dinoArrivedAtRef.current = performance.now();
    }
    if (essentialReadyRef.current) scheduleExit();
  }, [startupState, scheduleExit]);

  useEffect(() => clearExitTimer, [clearExitTimer]);

  // 3. Departure & Dust Lifecycle Handlers
  const handleDinosaurDeparted = useCallback(() => {
    setStartupState((prev) => {
      if (prev === STARTUP_LIFECYCLE.EXITING) {
        return STARTUP_LIFECYCLE.DUST_FINISHING;
      }
      return prev;
    });
  }, []);

  const handleDustFinished = useCallback(() => {
    setStartupState((prev) => {
      if (prev === STARTUP_LIFECYCLE.DUST_FINISHING) {
        return STARTUP_LIFECYCLE.COMPLETED;
      }
      return prev;
    });
  }, []);

  // ── Sequence Continuation ──
  // 1. ABDUL SABOOR typography: starts strictly after dinosaur departure completes
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
  const isFormationActive =
    startupState === STARTUP_LIFECYCLE.COMPLETED &&
    ((heroTypoDone && isCenterLoaded) || prefersReducedMotion);

  const handleFrameChange = useCallback((_info) => {
    // Preserved
  }, []);

  const isDinosaurActive = startupState !== STARTUP_LIFECYCLE.COMPLETED;

  const isTypographyActive = startupState === STARTUP_LIFECYCLE.COMPLETED;

  return (
    <div className="app">
      {/* ── Startup: Uiverse Dinosaur Entrance → Waiting → Departure → Dust ── */}
      {isDinosaurActive && (
        <StartupLoader
          phase={startupState}
          error={centerLoadError}
          onRetry={retryCenter}
          onEntranceComplete={handleEntranceComplete}
          onDinosaurDeparted={handleDinosaurDeparted}
          onDustFinished={handleDustFinished}
          prefersReducedMotion={prefersReducedMotion}
        />
      )}

      {/* ── Phase 8: Background Editorial Typography Layer (starts strictly after dinosaur exit) ── */}
      <HeroTypography
        onHeroReady={handleHeroReady}
        prefersReducedMotion={prefersReducedMotion}
        active={isTypographyActive}
      />

      {/* ── Phase 9: Centerpiece Portrait Stage ── */}
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

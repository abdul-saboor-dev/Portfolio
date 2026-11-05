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
import {
  LOADER_THRESHOLD_MS,
  MIN_WAITING_RUN_MS,
  elapsedSinceBootMs,
} from '../features/startup/startupTiming.js';
import '../styles/App.css';

// 6-State Explicit Startup Lifecycle
const STARTUP_LIFECYCLE = {
  HIDDEN: 'HIDDEN',
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

  // ── 6-State Explicit Lifecycle State Machine ──
  const [startupState, setStartupState] = useState(() => {
    if (prefersReducedMotion) return STARTUP_LIFECYCLE.COMPLETED;
    return STARTUP_LIFECYCLE.HIDDEN;
  });

  const essentialReadyRef = useRef(false);
  const dinoArrivedAtRef = useRef(null);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    essentialReadyRef.current = isEssentialReady;
  }, [isEssentialReady]);

  // Runs in the same commit that mounts the loader and before paint, so the
  // pre-React shell dinosaur and the React dinosaur swap without a blank frame.
  useLayoutEffect(() => {
    if (startupState !== STARTUP_LIFECYCLE.HIDDEN) removeStartupShell();
  }, [startupState]);

  const clearExitTimer = useCallback(() => {
    if (exitTimerRef.current !== null) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  // Readiness never cuts the sequence short: the minimum waiting period is
  // measured from the moment the dinosaur reaches the centre.
  const scheduleExit = useCallback(() => {
    if (exitTimerRef.current !== null) return;
    const arrivedAt = dinoArrivedAtRef.current;
    if (arrivedAt === null) return;

    const remaining = Math.max(0, MIN_WAITING_RUN_MS - (performance.now() - arrivedAt));
    exitTimerRef.current = setTimeout(() => {
      exitTimerRef.current = null;
      setStartupState((prev) =>
        prev === STARTUP_LIFECYCLE.WAITING ? STARTUP_LIFECYCLE.EXITING : prev,
      );
    }, remaining);
  }, []);

  // 1. Visibility threshold: ready in time → no dinosaur at all, otherwise run the entrance.
  useEffect(() => {
    if (startupState !== STARTUP_LIFECYCLE.HIDDEN) return;

    const remaining = Math.max(0, LOADER_THRESHOLD_MS - elapsedSinceBootMs());
    const timer = setTimeout(() => {
      setStartupState(
        essentialReadyRef.current ? STARTUP_LIFECYCLE.COMPLETED : STARTUP_LIFECYCLE.ENTERING,
      );
    }, remaining);

    return () => clearTimeout(timer);
  }, [startupState]);

  // 2. Readiness handler: fast path skips the loader, visible path must finish its sequence.
  useEffect(() => {
    if (!isEssentialReady) return;

    if (startupState === STARTUP_LIFECYCLE.HIDDEN) {
      queueMicrotask(() => setStartupState(STARTUP_LIFECYCLE.COMPLETED));
    } else if (startupState === STARTUP_LIFECYCLE.WAITING) {
      scheduleExit();
    }
    // ENTERING: the centre-arrival effect schedules the exit instead.
  }, [isEssentialReady, startupState, scheduleExit]);

  // 3. Centre arrival starts the minimum waiting period.
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

  // 4. Departure & Dust Lifecycle Handlers
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
  const isFormationActive = (heroTypoDone && isCenterLoaded) || prefersReducedMotion;

  const handleFrameChange = useCallback((_info) => {
    // Preserved
  }, []);

  const isDinosaurActive =
    startupState === STARTUP_LIFECYCLE.ENTERING ||
    startupState === STARTUP_LIFECYCLE.WAITING ||
    startupState === STARTUP_LIFECYCLE.EXITING ||
    startupState === STARTUP_LIFECYCLE.DUST_FINISHING;

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

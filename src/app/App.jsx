/**
 * App.jsx
 * Abdul Saboor — Interactive Hero & Portfolio Application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import HeroTypography from '../features/hero/HeroTypography.jsx';
import StartupLoader from '../features/startup/StartupLoader.jsx';
import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import { NEUTRAL_YAW, NEUTRAL_PITCH } from '../features/portrait/frameData.js';
import '../styles/App.css';

// 5-State Explicit Startup Lifecycle
const STARTUP_LIFECYCLE = {
  HIDDEN: 'HIDDEN',
  WAITING: 'WAITING',
  EXITING: 'EXITING',
  DUST_FINISHING: 'DUST_FINISHING',
  COMPLETED: 'COMPLETED',
};

// 800ms threshold: if startup completes within 800ms (good internet), skip dinosaur entirely
const LOADER_THRESHOLD_MS = 800;

// When dinosaur appears, it stays for at least 3 seconds minimum, and maximum according to network loading
const MIN_WAITING_RUN_MS = 3000;

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

  // ── 5-State Explicit Lifecycle State Machine ──
  const [startupState, setStartupState] = useState(() => {
    if (prefersReducedMotion) return STARTUP_LIFECYCLE.COMPLETED;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now >= LOADER_THRESHOLD_MS) {
      return STARTUP_LIFECYCLE.WAITING;
    }
    return STARTUP_LIFECYCLE.HIDDEN;
  });

  const dinoVisibleTimeRef = useRef(null);
  const thresholdTimerRef = useRef(null);
  const minRunTimerRef = useRef(null);

  // If initial state was WAITING or COMPLETED on mount, clean up the shell
  useEffect(() => {
    if (startupState === STARTUP_LIFECYCLE.WAITING) {
      if (!dinoVisibleTimeRef.current) {
        dinoVisibleTimeRef.current = performance.now();
      }
      removeStartupShell();
    } else if (startupState === STARTUP_LIFECYCLE.COMPLETED) {
      removeStartupShell();
    }
  }, [startupState]);

  // 1. Threshold timer for HIDDEN state (800ms from navigation start)
  useEffect(() => {
    if (startupState !== STARTUP_LIFECYCLE.HIDDEN) return;

    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const remaining = Math.max(0, LOADER_THRESHOLD_MS - now);

    thresholdTimerRef.current = setTimeout(() => {
      setStartupState((prev) => {
        if (prev !== STARTUP_LIFECYCLE.HIDDEN) return prev;
        if (isEssentialReady) {
          removeStartupShell();
          return STARTUP_LIFECYCLE.COMPLETED;
        }
        removeStartupShell();
        dinoVisibleTimeRef.current = performance.now();
        return STARTUP_LIFECYCLE.WAITING;
      });
    }, remaining);

    return () => {
      if (thresholdTimerRef.current) clearTimeout(thresholdTimerRef.current);
    };
  }, [startupState, isEssentialReady]);

  // 2. Readiness handler: transitions from HIDDEN -> COMPLETED (fast) or WAITING -> EXITING (visible)
  useEffect(() => {
    if (!isEssentialReady) return;

    if (startupState === STARTUP_LIFECYCLE.HIDDEN) {
      // Ready within 800ms (good internet): skip visible loader entirely
      if (thresholdTimerRef.current) clearTimeout(thresholdTimerRef.current);
      removeStartupShell();
      queueMicrotask(() => {
        setStartupState(STARTUP_LIFECYCLE.COMPLETED);
      });
    } else if (startupState === STARTUP_LIFECYCLE.WAITING) {
      // Dinosaur is visible: MUST complete entire animation sequence
      if (prefersReducedMotion) {
        queueMicrotask(() => {
          setStartupState(STARTUP_LIFECYCLE.COMPLETED);
        });
        return;
      }

      const visibleSince = dinoVisibleTimeRef.current || performance.now();
      const elapsedVisible = performance.now() - visibleSince;
      const remainingRun = Math.max(0, MIN_WAITING_RUN_MS - elapsedVisible);

      if (minRunTimerRef.current) clearTimeout(minRunTimerRef.current);
      minRunTimerRef.current = setTimeout(() => {
        setStartupState(STARTUP_LIFECYCLE.EXITING);
      }, remainingRun);
    }
  }, [isEssentialReady, startupState, prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (minRunTimerRef.current) clearTimeout(minRunTimerRef.current);
    };
  }, []);

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

  // Dynamic Status Text reflecting genuine loading stages
  const getStatusText = useCallback(() => {
    if (!fontsReady) return 'INITIALIZING EXPERIENCE';
    if (!isCenterLoaded) return 'LOADING PORTRAIT ASSETS';
    return 'PREPARING INTERFACE';
  }, [fontsReady, isCenterLoaded]);

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
    startupState === STARTUP_LIFECYCLE.WAITING ||
    startupState === STARTUP_LIFECYCLE.EXITING ||
    startupState === STARTUP_LIFECYCLE.DUST_FINISHING;

  const isTypographyActive = startupState === STARTUP_LIFECYCLE.COMPLETED;

  return (
    <div className="app">
      {/* ── Phase 1-7: Uiverse Dinosaurio Startup Experience ── */}
      {isDinosaurActive && (
        <StartupLoader
          phase={startupState}
          statusText={getStatusText()}
          error={centerLoadError}
          onRetry={retryCenter}
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

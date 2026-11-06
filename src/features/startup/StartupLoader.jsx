/**
 * StartupLoader.jsx
 *
 * Uiverse Dinosaurio Startup Loading Experience.
 * Original component by 20essentials (https://github.com/20essentials/project-000-132 / https://uiverse.io/20essentials/dry-mayfly-12)
 *
 * Runs in from the left edge to the centre, runs in place while essential
 * resources load, accelerates off the right edge with directional pixel dust
 * upon readiness, and hands off to the existing portfolio introduction.
 *
 * Lifecycle: ENTERING -> WAITING -> EXITING -> DUST_FINISHING -> (unmounted upon COMPLETED)
 * Phase changes are driven by animationend/transitionend, never by a bare timer.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { footstepAudio } from './footstepAudio.js';
import {
  DINO_ENTRANCE_MS,
  DINO_RUN_CYCLE_MS,
  DINO_SPRINT_CYCLE_MS,
  readShellPhase,
} from './startupTiming.js';
import './StartupLoader.css';
// 10 pre-configured directional square pixel particles kicked up near rear feet/tail
const DUST_PARTICLES = [
  { id: 1,  x: -6,  y: 84, size: 4, dx: -45, dy: -8,  delay: '0.04s' },
  { id: 2,  x: -12, y: 78, size: 3, dx: -62, dy: 6,   delay: '0.10s' },
  { id: 3,  x: -8,  y: 90, size: 4, dx: -38, dy: -14, delay: '0.08s' },
  { id: 4,  x: -16, y: 82, size: 4, dx: -68, dy: 4,   delay: '0.16s' },
  { id: 5,  x: -10, y: 74, size: 3, dx: -52, dy: -10, delay: '0.12s' },
  { id: 6,  x: -18, y: 88, size: 4, dx: -58, dy: 8,   delay: '0.22s' },
  { id: 7,  x: -14, y: 70, size: 3, dx: -72, dy: -6,  delay: '0.25s' },
  { id: 8,  x: -20, y: 80, size: 4, dx: -64, dy: -12, delay: '0.15s' },
  { id: 9,  x: -24, y: 86, size: 3, dx: -78, dy: 10,  delay: '0.28s' },
  { id: 10, x: -15, y: 92, size: 4, dx: -46, dy: -4,  delay: '0.18s' },
];

// Longest dust particle: 0.5s animation + 0.28s stagger
const DUST_SETTLE_MS = 260;
const EXIT_FALLBACK_MS = 900;

// Dust accents ride the particle stagger, so each puff lands with a visible kick
// instead of on an unrelated timer.
const DUST_TICKS = [
  { delay: 60, strength: 1 },
  { delay: 150, strength: 0.8 },
  { delay: 240, strength: 0.6 },
];

export default function StartupLoader({
  phase = 'ENTERING',
  error = false,
  onRetry,
  onEntranceComplete,
  onDinosaurDeparted,
  onDustFinished,
  prefersReducedMotion = false,
}) {
  const dinoContainerRef = useRef(null);
  const dinoPixelRef = useRef(null);
  const departedCalledRef = useRef(false);
  const dustCalledRef = useRef(false);
  const entranceCalledRef = useRef(false);
  const dustEndCountRef = useRef(0);

  // Frozen at mount: how much of the entrance the pre-React shell had actually
  // painted, and where its leg cycle stood, so the React dinosaur resumes the
  // same frame instead of restarting or skipping ahead of what was on screen.
  const [shellPhase] = useState(() => readShellPhase());
  const entranceOffset = shellPhase.entranceMs;
  const entranceSettled = entranceOffset >= DINO_ENTRANCE_MS;

  const reportEntranceComplete = useCallback(() => {
    if (entranceCalledRef.current) return;
    entranceCalledRef.current = true;
    onEntranceComplete?.();
  }, [onEntranceComplete]);

  const reportDeparted = useCallback(() => {
    if (departedCalledRef.current) return;
    departedCalledRef.current = true;
    onDinosaurDeparted?.();
  }, [onDinosaurDeparted]);

  const reportDustFinished = useCallback(() => {
    if (dustCalledRef.current) return;
    dustCalledRef.current = true;
    footstepAudio.destroy();
    onDustFinished?.();
  }, [onDustFinished]);

  // 1. Audio is attempted as soon as this appearance exists, independently of the
  //    gait loop and long before the dinosaur reaches the centre. It never awaits
  //    anything, so a browser that refuses gesture-free playback cannot slow the run.
  useEffect(() => {
    if (prefersReducedMotion) return;
    footstepAudio.start();
  }, [prefersReducedMotion]);

  // 2. Footsteps read from the gait itself. The taps come from the same CSS
  //    animation that moves the legs, so the rhythm cannot drift away from what is
  //    on screen, and nothing is scheduled while the context is still suspended.
  useEffect(() => {
    if (prefersReducedMotion) return undefined;
    if (phase !== 'ENTERING' && phase !== 'WAITING' && phase !== 'EXITING') return undefined;

    const sprinting = phase === 'EXITING';
    const cycleMs = sprinting ? DINO_SPRINT_CYCLE_MS : DINO_RUN_CYCLE_MS;
    const poseMs = cycleMs / 3;
    let frame = 0;
    let gait = null;
    let lastPose = -1;

    const observeGait = () => {
      frame = requestAnimationFrame(observeGait);
      if (footstepAudio.isDisposed) return;

      // Captured once: getAnimations() allocates, and this runs every frame.
      if (gait === null) {
        const pixel = dinoPixelRef.current;
        const animations = pixel ? pixel.getAnimations() : [];
        gait = animations.length > 0 ? animations[0] : null;
        if (gait === null) return;
      }
      // startTime stays null until the sprite has been painted, which is the same
      // condition that keeps the animation clock behind the JS clock.
      if (gait.startTime === null || typeof gait.currentTime !== 'number') return;

      const pose = Math.floor((gait.currentTime % cycleMs) / poseMs);
      if (pose !== lastPose) {
        // Only the two single-leg poses plant a foot; the third is the double
        // contact, so tapping it would add a third step per cycle.
        if (lastPose !== -1 && (pose === 1 || pose === 2)) {
          footstepAudio.playFootstep(pose === 1 ? 0 : 1, sprinting ? 1.25 : 1);
        }
        lastPose = pose;
      }
    };

    frame = requestAnimationFrame(observeGait);

    const ticks = sprinting
      ? DUST_TICKS.map(({ delay, strength }) =>
          setTimeout(() => footstepAudio.playDustTick(strength), delay),
        )
      : [];

    return () => {
      cancelAnimationFrame(frame);
      ticks.forEach(clearTimeout);
    };
  }, [phase, prefersReducedMotion]);

  // 3. Entrance: animationend on the translate keyframe is the primary signal.
  const handleContainerAnimationEnd = useCallback((e) => {
    if (e.target !== dinoContainerRef.current) return;
    if (e.animationName !== 'dino-entrance') return;
    reportEntranceComplete();
  }, [reportEntranceComplete]);

  // Safety net only — covers suppressed animations so the loader can never stick.
  useEffect(() => {
    if (phase !== 'ENTERING') return undefined;

    if (prefersReducedMotion || entranceSettled) {
      const raf = requestAnimationFrame(reportEntranceComplete);
      return () => cancelAnimationFrame(raf);
    }

    const timer = setTimeout(
      reportEntranceComplete,
      DINO_ENTRANCE_MS - entranceOffset + 500,
    );
    return () => clearTimeout(timer);
  }, [phase, prefersReducedMotion, entranceSettled, entranceOffset, reportEntranceComplete]);

  // 4. Departure: transitionend on the exit transform.
  const handleTransitionEnd = useCallback((e) => {
    if (e.target !== dinoContainerRef.current) return;
    if (e.propertyName !== 'transform') return;
    reportDeparted();
  }, [reportDeparted]);

  useEffect(() => {
    if (phase !== 'EXITING') return undefined;
    const timer = setTimeout(reportDeparted, EXIT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [phase, reportDeparted]);

  // 5. Dust: every particle reports, the last one ends the sequence.
  const handleDustAnimationEnd = useCallback((e) => {
    if (e.animationName !== 'dust-scatter') return;
    dustEndCountRef.current += 1;
    // Counting starts with the sprint, but completion only counts once the departure
    // has been reported: firing earlier would latch while App is still in EXITING,
    // where the callback is ignored, and the loader could then never finish.
    if (dustEndCountRef.current >= DUST_PARTICLES.length && phase === 'DUST_FINISHING') {
      reportDustFinished();
    }
  }, [phase, reportDustFinished]);

  useEffect(() => {
    if (phase !== 'DUST_FINISHING') return undefined;
    const timer = setTimeout(reportDustFinished, DUST_SETTLE_MS);
    // A slow exit transition can let every particle land before this phase starts,
    // so report on the next frame instead of holding an empty stage for the fallback.
    const raf = dustEndCountRef.current >= DUST_PARTICLES.length
      ? requestAnimationFrame(reportDustFinished)
      : null;
    return () => {
      clearTimeout(timer);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [phase, reportDustFinished]);

  // 6. Reduced motion keeps the loader visible but static. With the run, travel and
  //    dust animations suppressed there are no animationend/transitionend events to
  //    wait for, so departure and dust hand off on the next frame rather than on a
  //    fallback timer that would stall on a still image.
  useEffect(() => {
    if (!prefersReducedMotion) return undefined;
    if (phase !== 'EXITING' && phase !== 'DUST_FINISHING') return undefined;

    const raf = requestAnimationFrame(() => {
      if (phase === 'EXITING') reportDeparted();
      else reportDustFinished();
    });
    return () => cancelAnimationFrame(raf);
  }, [phase, prefersReducedMotion, reportDeparted, reportDustFinished]);

  const isEntering = phase === 'ENTERING' && !entranceSettled && !prefersReducedMotion;
  const isExiting = phase === 'EXITING';
  const isDustFinishing = phase === 'DUST_FINISHING';
  const isLeavingOrLeft = isExiting || isDustFinishing;

  // Negative delay on the sprite itself keeps the pose React paints with identical
  // to the last pose the shell showed, so the handoff cannot change the rhythm.
  const pixelStyle = shellPhase.runMs > 0
    ? { animationDelay: `-${Math.round(shellPhase.runMs)}ms` }
    : undefined;

  return (
    <aside
      className="startup-loader"
      aria-label="Application loading screen"
      role="status"
      aria-live="polite"
    >
      <div className="startup-loader-content">
        {/* Dinosaur Character & Directional Pixel Dust */}
        <div className="dino-stage">
          <div
            ref={dinoContainerRef}
            className={`dino-container ${isEntering ? 'is-entering' : ''} ${isExiting ? 'is-exiting' : ''} ${isDustFinishing ? 'is-dust-finishing' : ''}`}
            style={
              isEntering && entranceOffset > 0
                ? { animationDelay: `-${Math.round(entranceOffset)}ms` }
                : undefined
            }
            onTransitionEnd={handleTransitionEnd}
            onAnimationEnd={handleContainerAnimationEnd}
          >
            <div ref={dinoPixelRef} className="dino-pixel" style={pixelStyle} />

            {/* Directional Pixel Dust Particles kicking backwards, parented to the
                dinosaur so the trail leaves with it instead of hanging in the
                centre of the screen. */}
            <div
              className={`dino-dust-container ${isLeavingOrLeft ? 'is-active' : ''}`}
              onAnimationEnd={handleDustAnimationEnd}
            >
              {DUST_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  className="dino-dust-particle"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    left: `${p.x}px`,
                    top: `${p.y}px`,
                    animationDelay: p.delay,
                    '--dust-x': `${p.dx}px`,
                    '--dust-y': `${p.dy}px`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Error Action only — loading progress is conveyed by the dinosaur itself */}
        {error && (
          <div className="startup-error-container">
            <span className="startup-error-msg">COULD NOT LOAD PORTRAIT ASSETS</span>
            {onRetry && (
              <button
                type="button"
                className="startup-retry-btn"
                onClick={onRetry}
                aria-label="Retry loading assets"
              >
                RETRY
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

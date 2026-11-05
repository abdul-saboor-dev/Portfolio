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
import { DINO_ENTRANCE_MS, entranceOffsetMs } from './startupTiming.js';
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

export default function StartupLoader({
  phase = 'ENTERING',
  statusText = 'INITIALIZING EXPERIENCE',
  error = false,
  onRetry,
  onEntranceComplete,
  onDinosaurDeparted,
  onDustFinished,
  prefersReducedMotion = false,
}) {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const dinoContainerRef = useRef(null);
  const departedCalledRef = useRef(false);
  const dustCalledRef = useRef(false);
  const entranceCalledRef = useRef(false);
  const dustEndCountRef = useRef(0);

  // Frozen at mount: how far the pre-React shell entrance had already travelled,
  // so the React dinosaur resumes mid-flight instead of restarting or skipping it.
  const [entranceOffset] = useState(() => entranceOffsetMs());
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

  // 1. Synchronized footstep audio loop (silent until the visitor enables sound)
  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    let interval = null;
    if (phase === 'ENTERING' || phase === 'WAITING') {
      interval = setInterval(() => footstepAudio.playFootstep(1.0), 100);
    } else if (phase === 'EXITING') {
      interval = setInterval(() => footstepAudio.playFootstep(1.25), 65);
    }

    const tick1 = phase === 'EXITING' ? setTimeout(() => footstepAudio.playDustTick(), 160) : null;
    const tick2 = phase === 'EXITING' ? setTimeout(() => footstepAudio.playDustTick(), 280) : null;

    return () => {
      if (interval) clearInterval(interval);
      if (tick1) clearTimeout(tick1);
      if (tick2) clearTimeout(tick2);
    };
  }, [phase, prefersReducedMotion]);

  // 2. Entrance: animationend on the translate keyframe is the primary signal.
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

  // 3. Departure: transitionend on the exit transform.
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

  // 4. Dust: every particle reports, the last one ends the sequence.
  const handleDustAnimationEnd = useCallback((e) => {
    if (e.animationName !== 'dust-scatter') return;
    dustEndCountRef.current += 1;
    if (dustEndCountRef.current >= DUST_PARTICLES.length) reportDustFinished();
  }, [reportDustFinished]);

  useEffect(() => {
    if (phase !== 'DUST_FINISHING') return undefined;
    const timer = setTimeout(reportDustFinished, DUST_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase, reportDustFinished]);

  // Audio unlocks only from an explicit click, honouring autoplay policies.
  const handleToggleSound = useCallback(async () => {
    const active = await footstepAudio.toggleAudio();
    setSoundEnabled(active);
  }, []);

  const isEntering = phase === 'ENTERING' && !entranceSettled && !prefersReducedMotion;
  const isExiting = phase === 'EXITING';
  const isDustFinishing = phase === 'DUST_FINISHING';
  const isLeavingOrLeft = isExiting || isDustFinishing;

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
            style={isEntering ? { animationDelay: `-${entranceOffset}ms` } : undefined}
            onTransitionEnd={handleTransitionEnd}
            onAnimationEnd={handleContainerAnimationEnd}
          >
            <div className="dino-pixel" />
          </div>

          {/* Directional Pixel Dust Particles kicking backwards */}
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

        {/* Dynamic Status Display or Error Action */}
        {!error ? (
          <div className={`startup-status-container ${isLeavingOrLeft ? 'is-leaving' : ''}`}>
            <span className="startup-status-dot" aria-hidden="true" />
            <span className="startup-status-text">{statusText}</span>
          </div>
        ) : (
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

      {/* Understated Accessible Sound Toggle Button */}
      <button
        type="button"
        className={`startup-sound-toggle ${soundEnabled ? 'is-active' : ''} ${isLeavingOrLeft ? 'is-leaving' : ''}`}
        onClick={handleToggleSound}
        aria-label={soundEnabled ? 'Mute startup sound' : 'Enable startup footstep sounds'}
        aria-pressed={soundEnabled}
        title={soundEnabled ? 'Sound: On' : 'Sound: Off'}
      >
        <svg
          className="startup-sound-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {soundEnabled ? (
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          ) : (
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          )}
        </svg>
        <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
      </button>
    </aside>
  );
}

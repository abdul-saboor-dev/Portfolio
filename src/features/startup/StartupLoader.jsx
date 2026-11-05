/**
 * StartupLoader.jsx
 *
 * Uiverse Dinosaurio Startup Loading Experience.
 * Original component by 20essentials (https://github.com/20essentials/project-000-132 / https://uiverse.io/20essentials/dry-mayfly-12)
 *
 * Runs in place while essential resources load, accelerates to the right with
 * directional pixel dust upon readiness, and seamlessly hands off to the
 * existing portfolio introduction.
 *
 * Lifecycle: WAITING -> EXITING -> DUST_FINISHING -> (unmounted upon COMPLETED)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { footstepAudio } from './footstepAudio.js';
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

export default function StartupLoader({
  phase = 'WAITING',
  statusText = 'INITIALIZING EXPERIENCE',
  error = false,
  onRetry,
  onDinosaurDeparted,
  onDustFinished,
  prefersReducedMotion = false,
}) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const footstepIntervalRef = useRef(null);
  const dinoContainerRef = useRef(null);
  const departedCalledRef = useRef(false);
  const dustCalledRef = useRef(false);

  // Auto-enable audio on mount
  useEffect(() => {
    footstepAudio.enableAudio().then((active) => {
      setSoundEnabled(active);
    });
  }, []);

  // 1. Synchronized footstep audio loop
  useEffect(() => {
    if (prefersReducedMotion) {
      if (footstepIntervalRef.current) clearInterval(footstepIntervalRef.current);
      return;
    }

    if (phase === 'WAITING') {
      // Steady running cadence: alternating legs every 100ms
      footstepIntervalRef.current = setInterval(() => {
        footstepAudio.playFootstep(1.0);
      }, 100);
    } else if (phase === 'EXITING') {
      // Faster cadence during departure sprint: 65ms
      if (footstepIntervalRef.current) clearInterval(footstepIntervalRef.current);
      footstepIntervalRef.current = setInterval(() => {
        footstepAudio.playFootstep(1.25);
      }, 65);

      // 2 subtle digital ticks when pixel dust scatters
      const t1 = setTimeout(() => footstepAudio.playDustTick(), 160);
      const t2 = setTimeout(() => footstepAudio.playDustTick(), 280);

      return () => {
        if (footstepIntervalRef.current) clearInterval(footstepIntervalRef.current);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (phase === 'DUST_FINISHING') {
      // Dinosaur has cleared screen; stop footstep audio
      if (footstepIntervalRef.current) {
        clearInterval(footstepIntervalRef.current);
        footstepIntervalRef.current = null;
      }
    }

    return () => {
      if (footstepIntervalRef.current) {
        clearInterval(footstepIntervalRef.current);
        footstepIntervalRef.current = null;
      }
    };
  }, [phase, prefersReducedMotion]);

  // 2. Transition event handler for dinosaur departure
  const handleTransitionEnd = useCallback((e) => {
    if (e.target !== dinoContainerRef.current) return;
    if (e.propertyName !== 'transform') return;
    if (departedCalledRef.current) return;
    departedCalledRef.current = true;
    onDinosaurDeparted?.();
  }, [onDinosaurDeparted]);

  // Fallback safety timer for EXITING (850ms) in case transitionend is suppressed
  useEffect(() => {
    if (phase !== 'EXITING') return;
    const timer = setTimeout(() => {
      if (!departedCalledRef.current) {
        departedCalledRef.current = true;
        onDinosaurDeparted?.();
      }
    }, 850);
    return () => clearTimeout(timer);
  }, [phase, onDinosaurDeparted]);

  // 3. Settling timer for DUST_FINISHING (220ms after dinosaur has left screen)
  useEffect(() => {
    if (phase !== 'DUST_FINISHING') return;
    const timer = setTimeout(() => {
      if (!dustCalledRef.current) {
        dustCalledRef.current = true;
        footstepAudio.destroy();
        onDustFinished?.();
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [phase, onDustFinished]);

  // Audio toggle handler (safe, non-blocking)
  const handleToggleSound = useCallback(async () => {
    const active = await footstepAudio.toggleAudio();
    setSoundEnabled(active);
  }, []);

  const isExiting = phase === 'EXITING';
  const isDustFinishing = phase === 'DUST_FINISHING';
  const isLeavingOrLeft = isExiting || isDustFinishing;

  return (
    <aside
      className={`startup-loader ${isLeavingOrLeft ? 'is-departing' : ''}`}
      aria-label="Application loading screen"
      role="status"
      aria-live="polite"
    >
      <div className="startup-loader-content">
        {/* Dinosaur Character & Directional Pixel Dust */}
        <div className="dino-stage">
          <div
            ref={dinoContainerRef}
            className={`dino-container ${isExiting ? 'is-exiting' : ''} ${isDustFinishing ? 'is-dust-finishing' : ''}`}
            onTransitionEnd={handleTransitionEnd}
          >
            <div className="dino-pixel" />
          </div>

          {/* Directional Pixel Dust Particles kicking backwards */}
          <div className={`dino-dust-container ${isLeavingOrLeft ? 'is-active' : ''}`}>
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

/**
 * PortraitCanvas.jsx
 *
 * Mouse/touch/pen-controlled portrait using 340 transparent frames.
 *
 * ── State machine (animRef.current.mode) ────────────────────────────────────
 *
 *   TRACKING  Normal operation. curRef follows tgtRef with TAU_MS smoothing.
 *             tgtRef is updated directly from pointer events.
 *
 *   RETURNING Idle/recenter return. Cubic ease-in-out over RETURN_DURATION_MS
 *             from returnStartRef → neutral. No pointer involvement.
 *             Cancelled immediately by any pointer movement.
 *
 *   HANDOFF   First movement after a return. Cubic ease-in-out over
 *             HANDOFF_DURATION_MS from wherever curRef is now → the cursor's
 *             first post-return position. After completion, switches to TRACKING.
 *             Subsequent pointer movements during HANDOFF update tgtRef normally
 *             so the handoff always ends at the current cursor position.
 *
 * ── Coordinate mapping ───────────────────────────────────────────────────────
 *   Pointer events are captured on window (full viewport interactive).
 *   Normalisation is relative to the canvas bounding rect:
 *     nx ∈ [-1,1]: canvas left  → yaw -20°,    canvas right  → yaw +20°
 *     ny ∈ [-1,1]: canvas top   → pitch -20°,   canvas bottom → pitch +13.7°
 *   Pointer outside the canvas is clamped.
 *
 * ── Smoothing (TRACKING only) ────────────────────────────────────────────────
 *   alpha = 1 − exp(−Δt / TAU_MS)
 *   curRef += (tgtRef − curRef) × alpha
 *   Δt clamped to MAX_DELTA_MS after tab inactivity.
 *
 * ── Jitter filter ────────────────────────────────────────────────────────────
 *   Pointer displacement < JITTER_PX is ignored so sensor noise does not
 *   perpetually defer the idle reset.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  COLS, ROWS,
  YAW_VALUES, PITCH_VALUES,
  NEUTRAL_YAW, NEUTRAL_PITCH,
  normalizedToYawPitch,
  yawPitchToFractionalGrid,
  nearestLoadedIndex,
  clamp,
} from './frameData.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const FRAME_SIZE         = 512;
const TAU_MS             = 35;   // tracking smoothing τ (ms)
const MAX_DELTA_MS       = 100;  // clamp Δt after tab sleep
const IDLE_MS            = 2000; // inactivity before return begins
const JITTER_PX          = 2.5;  // min displacement to count as intentional
const RETURN_DURATION_MS = 500;  // fixed-duration return animation (ms)
const HANDOFF_DURATION_MS = 120; // first-movement-after-return transition (ms)

// Yaw / pitch extents
const YAW_MIN   = YAW_VALUES[0];
const YAW_MAX   = YAW_VALUES[COLS - 1];
const PITCH_MIN = PITCH_VALUES[0];
const PITCH_MAX = PITCH_VALUES[ROWS - 1];

// ── Easing ────────────────────────────────────────────────────────────────────
// Cubic ease-in-out: smooth S-curve, t ∈ [0,1] → [0,1]
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// ── Animation modes ───────────────────────────────────────────────────────────
const MODE_TRACKING  = 'tracking';
const MODE_RETURNING = 'returning';
const MODE_HANDOFF   = 'handoff';

// ── Component ──────────────────────────────────────────────────────────────────
export default function PortraitCanvas({ getImage, loadedSet, isCenterLoaded }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  // Current displayed yaw/pitch (mutated every RAF tick)
  const curRef = useRef({ yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH });

  // Target yaw/pitch from pointer (used during TRACKING and HANDOFF)
  const tgtRef = useRef({ yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH });

  // Animation state
  const animRef = useRef({
    mode:       MODE_TRACKING,
    // RETURNING / HANDOFF: start pose and start timestamp
    startYaw:   NEUTRAL_YAW,
    startPitch: NEUTRAL_PITCH,
    startTs:    null,
    duration:   0,
  });

  // Idle timer
  const idleTimerRef = useRef(null);

  // Last pointer coords (jitter filter)
  const lastPtrRef = useRef({ x: null, y: null });

  // Dirty-check: last rendered frame index
  const lastIdxRef = useRef(-1);

  // Previous RAF timestamp for Δt
  const lastTsRef = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function clearIdleTimer() {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function beginReturn() {
    const cur  = curRef.current;
    const anim = animRef.current;
    anim.mode       = MODE_RETURNING;
    anim.startYaw   = cur.yaw;
    anim.startPitch = cur.pitch;
    anim.startTs    = null;   // set on first tick so Δt doesn't include idle wait
    anim.duration   = RETURN_DURATION_MS;
    // tgtRef isn't used in RETURNING, but keep it at neutral for consistency
    tgtRef.current = { yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH };
  }

  function scheduleIdleReset() {
    clearIdleTimer();
    if (animRef.current.mode === MODE_RETURNING || animRef.current.mode === MODE_HANDOFF) {
      // Already animating — don't restart the countdown yet
      return;
    }
    idleTimerRef.current = setTimeout(beginReturn, IDLE_MS);
  }

  // ── Pointer handler ────────────────────────────────────────────────────────
  function handlePointer(clientX, clientY) {
    // Jitter filter
    const prev = lastPtrRef.current;
    if (prev.x !== null) {
      const dx = clientX - prev.x;
      const dy = clientY - prev.y;
      if (dx * dx + dy * dy < JITTER_PX * JITTER_PX) return;
    }
    lastPtrRef.current = { x: clientX, y: clientY };

    // Normalise to canvas rect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect  = canvas.getBoundingClientRect();
    const nx    = clamp((clientX - rect.left) / rect.width  * 2 - 1, -1, 1);
    const ny    = clamp((clientY - rect.top)  / rect.height * 2 - 1, -1, 1);
    const { yaw, pitch } = normalizedToYawPitch(nx, ny);
    const clampedYaw   = clamp(yaw,   YAW_MIN,   YAW_MAX);
    const clampedPitch = clamp(pitch, PITCH_MIN, PITCH_MAX);

    const anim = animRef.current;

    if (anim.mode === MODE_RETURNING) {
      // Cancel return: start a HANDOFF from wherever curRef is right now
      clearIdleTimer();
      anim.mode       = MODE_HANDOFF;
      anim.startYaw   = curRef.current.yaw;
      anim.startPitch = curRef.current.pitch;
      anim.startTs    = null;
      anim.duration   = HANDOFF_DURATION_MS;
      tgtRef.current  = { yaw: clampedYaw, pitch: clampedPitch };
      // No idle timer restart yet; will be scheduled when HANDOFF completes
      return;
    }

    if (anim.mode === MODE_HANDOFF) {
      // During handoff: update destination but don't restart the handoff clock
      tgtRef.current = { yaw: clampedYaw, pitch: clampedPitch };
      return;
    }

    // MODE_TRACKING — normal fast tracking
    tgtRef.current = { yaw: clampedYaw, pitch: clampedPitch };
    scheduleIdleReset();
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const onPointerMove = (e) => handlePointer(e.clientX, e.clientY);
    const onTouchMove   = (e) => {
      if (e.touches.length > 0)
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove',   onTouchMove,   { passive: true });

    // Start 2-second countdown immediately on mount
    scheduleIdleReset();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove',   onTouchMove);
      clearIdleTimer();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas resize & backing-store scaling ───────────────────────────────────
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // The portrait is kept square; use the measured rendered CSS dimension
    const cssSize = Math.round(Math.min(rect.width, rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetSize = Math.max(1, Math.round(cssSize * dpr));

    if (canvas.width !== targetSize || canvas.height !== targetSize) {
      canvas.width  = targetSize;
      canvas.height = targetSize;

      // Reapply canvas context settings after size modification
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      // Invalidate dirty-check so the current frame immediately redraws onto the new buffer
      lastIdxRef.current = -1;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    updateCanvasSize();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
      });
      resizeObserver.observe(canvas);
    }

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  // ── RAF draw loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    const draw = (ts) => {
      rafRef.current = requestAnimationFrame(draw);

      if (!isCenterLoaded && loadedSet.size === 0) {
        lastTsRef.current = ts;
        return;
      }

      // Δt — clamped to guard against tab-sleep spikes
      const rawDelta = lastTsRef.current !== null ? ts - lastTsRef.current : 16;
      const deltaMs  = Math.min(rawDelta, MAX_DELTA_MS);
      lastTsRef.current = ts;

      const cur  = curRef.current;
      const tgt  = tgtRef.current;
      const anim = animRef.current;

      // ── Animation state machine ──────────────────────────────────────────────

      if (anim.mode === MODE_RETURNING || anim.mode === MODE_HANDOFF) {
        // Fixed-duration eased interpolation
        if (anim.startTs === null) anim.startTs = ts;

        const elapsed = ts - anim.startTs;
        const t = Math.min(elapsed / anim.duration, 1);
        const e = easeInOut(t);

        if (anim.mode === MODE_RETURNING) {
          cur.yaw   = anim.startYaw   + (NEUTRAL_YAW   - anim.startYaw)   * e;
          cur.pitch = anim.startPitch + (NEUTRAL_PITCH - anim.startPitch) * e;
        } else {
          // HANDOFF: interpolate from startYaw/Pitch → tgtRef (cursor)
          cur.yaw   = anim.startYaw   + (tgt.yaw   - anim.startYaw)   * e;
          cur.pitch = anim.startPitch + (tgt.pitch - anim.startPitch) * e;
        }

        if (t >= 1) {
          if (anim.mode === MODE_RETURNING) {
            // Land exactly on neutral
            cur.yaw   = NEUTRAL_YAW;
            cur.pitch = NEUTRAL_PITCH;
            // Sync tgtRef so TRACKING starts from here (prevents jump)
            tgtRef.current = { yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH };
          } else {
            // HANDOFF complete: cur is already at tgt; just sync
            cur.yaw   = tgt.yaw;
            cur.pitch = tgt.pitch;
          }
          anim.mode = MODE_TRACKING;
          // Restart idle countdown now that we're back in normal tracking
          scheduleIdleReset();
        }

      } else {
        // MODE_TRACKING — frame-rate-independent exponential smoothing
        const alpha = 1 - Math.exp(-deltaMs / TAU_MS);
        cur.yaw   += (tgt.yaw   - cur.yaw)   * alpha;
        cur.pitch += (tgt.pitch - cur.pitch) * alpha;
      }

      // ── Frame selection ──────────────────────────────────────────────────────
      const { col: fCol, row: fRow } = yawPitchToFractionalGrid(cur.yaw, cur.pitch);
      const idx = nearestLoadedIndex(fCol, fRow, loadedSet);
      if (idx < 0) return;

      const img = getImage(idx);
      // If the target frame isn't loaded yet, keep the last valid frame displayed.
      // Do not skip — the animation clock still advances correctly.
      if (!img) return;

      // Dirty-check: only redraw when the frame actually changes.
      // We always update during animations; only suppress when truly settled.
      const isAnimating = (anim.mode !== MODE_TRACKING) ||
        Math.abs(cur.yaw   - tgt.yaw)   > 0.001 ||
        Math.abs(cur.pitch - tgt.pitch) > 0.001;

      if (idx === lastIdxRef.current && !isAnimating) return;
      lastIdxRef.current = idx;

      // ── Draw ──────────────────────────────────────────────────────────────────
      if (!ctx.imageSmoothingEnabled || ctx.imageSmoothingQuality !== 'high') {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [getImage, loadedSet, isCenterLoaded]);

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_SIZE}
      height={FRAME_SIZE}
      className="portrait-canvas"
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Interactive portrait — move your cursor to change the viewing angle"
    />
  );
}

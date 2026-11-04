/**
 * PortraitCanvas.jsx
 *
 * Mouse/touch/pen-controlled portrait using 340 transparent PNG frames with
 * the React Bits HalftoneReveal WebGL2 shader effect.
 *
 * ── Visual Behavior ──────────────────────────────────────────────────────────
 * - Default State: Portrait renders as a fine-grained monochrome halftone print.
 * - Cursor Inside: Reveals the sharp underlying monochrome photograph beneath the
 *   cursor, leaving a lingering, fading trail.
 * - Cursor Outside / Exit: Reveal halts and trail decays back to pure halftone while
 *   head tracking continues across the entire viewport.
 * - Mobile Touch: Touch-and-drag reveals around the touch point; release lets trail decay.
 * - Transparency: Alpha cutout is strictly preserved, keeping LightRays and GridCanvas visible.
 * - Fallback: Automatically falls back to standard 2D canvas drawing if WebGL2 is unavailable.
 *
 * ── State machine (animRef.current.mode) ────────────────────────────────────
 *   TRACKING  Normal operation. curRef follows tgtRef with TAU_MS smoothing.
 *   RETURNING Idle/recenter return. Cubic ease-in-out over RETURN_DURATION_MS.
 *   HANDOFF   First movement after return. Cubic ease-in-out over HANDOFF_DURATION_MS.
 */

import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import {
  COLS,
  YAW_VALUES,
  PITCH_VALUES,
  NEUTRAL_YAW,
  NEUTRAL_PITCH,
  normalizedToYawPitch,
  yawPitchToFractionalGrid,
  nearestLoadedIndex,
  clamp,
} from './frameData.js';
import { HalftonePipeline, HALFTONE_CONFIG } from './halftonePipeline.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const FRAME_SIZE          = 512;
const TAU_MS              = 35;   // tracking smoothing τ (ms)
const MAX_DELTA_MS        = 100;  // clamp Δt after tab sleep
const IDLE_MS             = 2000; // inactivity before return begins
const JITTER_PX           = 2.5;  // min displacement to count as intentional
const RETURN_DURATION_MS  = 500;  // fixed-duration return animation (ms)
const HANDOFF_DURATION_MS = 120;  // first-movement-after-return transition (ms)

// Yaw / pitch extents
const YAW_MIN   = YAW_VALUES[0];
const YAW_MAX   = YAW_VALUES[COLS - 1];
const PITCH_MIN = PITCH_VALUES[0];
const PITCH_MAX = PITCH_VALUES[PITCH_VALUES.length - 1];

// ── Easing ────────────────────────────────────────────────────────────────────
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// ── Animation modes ───────────────────────────────────────────────────────────
const MODE_TRACKING  = 'tracking';
const MODE_RETURNING = 'returning';
const MODE_HANDOFF   = 'handoff';

// Helper to probe WebGL2 support once before render
function checkWebGL2Supported() {
  if (typeof document === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
const PortraitCanvas = forwardRef(function PortraitCanvas(
  { getImage, loadedSet, isCenterLoaded, onFrameChange, poseRef },
  ref,
) {
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const lastMaskIdxRef = useRef(-1);
  const rafRef    = useRef(null);

  // Fallback to 2D canvas if WebGL2 is not supported or fails
  const [useFallback2D, setFallback2D] = useState(() => !checkWebGL2Supported());
  const [glGeneration, setGlGeneration] = useState(0);

  // WebGL pipeline reference
  const pipelineRef = useRef(null);

  // Current displayed yaw/pitch (mutated every RAF tick)
  const curRef = useRef({ yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH });

  // Target yaw/pitch from pointer (used during TRACKING and HANDOFF)
  const tgtRef = useRef({ yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH });

  // Animation state
  const animRef = useRef({
    mode:       MODE_TRACKING,
    startYaw:   NEUTRAL_YAW,
    startPitch: NEUTRAL_PITCH,
    startTs:    null,
    duration:   0,
  });

  // Idle timer
  const idleTimerRef = useRef(null);

  // Last pointer coords (jitter filter)
  const lastPtrRef = useRef({ x: null, y: null });

  // Halftone reveal pointer state (local canvas CSS coords)
  const revealPointerRef = useRef({
    x: 256,
    y: 256,
    inside: false,
    fresh: true,
  });

  // Trail timeout tracking
  const trailUntilRef = useRef(0);

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
    anim.startTs    = null;
    anim.duration   = RETURN_DURATION_MS;
    tgtRef.current  = { yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH };
  }

  function scheduleIdleReset() {
    clearIdleTimer();
    if (animRef.current.mode === MODE_RETURNING || animRef.current.mode === MODE_HANDOFF) {
      return;
    }
    idleTimerRef.current = setTimeout(beginReturn, IDLE_MS);
  }

  // ── Pointer handler ────────────────────────────────────────────────────────
  function handlePointer(clientX, clientY) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // 1. Check if pointer is within portrait canvas visible bounds for reveal
    const isInside = (
      rect.width > 0 && rect.height > 0 &&
      clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom
    );

    if (isInside) {
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      if (!revealPointerRef.current.inside) {
        revealPointerRef.current.fresh = true;
      }
      revealPointerRef.current.inside = true;
      revealPointerRef.current.x = localX;
      revealPointerRef.current.y = localY;
    } else {
      revealPointerRef.current.inside = false;
    }

    // 2. Jitter filter for head tracking idle deferral
    const prev = lastPtrRef.current;
    let intentional = true;
    if (prev.x !== null) {
      const dx = clientX - prev.x;
      const dy = clientY - prev.y;
      if (dx * dx + dy * dy < JITTER_PX * JITTER_PX) {
        intentional = false;
      }
    }
    if (intentional) {
      lastPtrRef.current = { x: clientX, y: clientY };
    }

    // 3. Head Tracking (interactive over full viewport)
    const nx = clamp((clientX - rect.left) / rect.width  * 2 - 1, -1, 1);
    const ny = clamp((clientY - rect.top)  / rect.height * 2 - 1, -1, 1);
    const { yaw, pitch } = normalizedToYawPitch(nx, ny);
    const clampedYaw   = clamp(yaw,   YAW_MIN,   YAW_MAX);
    const clampedPitch = clamp(pitch, PITCH_MIN, PITCH_MAX);

    const anim = animRef.current;

    if (anim.mode === MODE_RETURNING) {
      clearIdleTimer();
      anim.mode       = MODE_HANDOFF;
      anim.startYaw   = curRef.current.yaw;
      anim.startPitch = curRef.current.pitch;
      anim.startTs    = null;
      anim.duration   = HANDOFF_DURATION_MS;
      tgtRef.current  = { yaw: clampedYaw, pitch: clampedPitch };
      return;
    }

    if (anim.mode === MODE_HANDOFF) {
      tgtRef.current = { yaw: clampedYaw, pitch: clampedPitch };
      return;
    }

    // MODE_TRACKING
    tgtRef.current = { yaw: clampedYaw, pitch: clampedPitch };
    if (intentional) {
      scheduleIdleReset();
    }
  }

  function handlePointerLeave() {
    revealPointerRef.current.inside = false;
  }

  // ── Imperative API (recenter button) ─────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    recenter() {
      clearIdleTimer();
      beginReturn();
    },
  }), []);

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const onPointerMove = (e) => handlePointer(e.clientX, e.clientY);
    const onTouchStart  = (e) => {
      if (e.touches.length > 0) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchMove   = (e) => {
      if (e.touches.length > 0) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd    = () => handlePointerLeave();

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchstart',  onTouchStart,  { passive: true });
    window.addEventListener('touchmove',   onTouchMove,   { passive: true });
    window.addEventListener('touchend',    onTouchEnd,    { passive: true });
    window.addEventListener('touchcancel', onTouchEnd,    { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    scheduleIdleReset();

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchstart',  onTouchStart);
      window.removeEventListener('touchmove',   onTouchMove);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
      clearIdleTimer();
    };
  }, []);

  // ── Canvas resize & backing-store scaling ───────────────────────────────────
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const cssSize = Math.round(Math.min(rect.width, rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetSize = Math.max(1, Math.round(cssSize * dpr));

    if (canvas.width !== targetSize || canvas.height !== targetSize) {
      canvas.width  = targetSize;
      canvas.height = targetSize;

      if (pipelineRef.current) {
        pipelineRef.current.resize(cssSize, cssSize);
      } else if (useFallback2D) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }
      }

      lastIdxRef.current = -1;
    }

    if (maskCanvas && (maskCanvas.width !== targetSize || maskCanvas.height !== targetSize)) {
      maskCanvas.width = targetSize;
      maskCanvas.height = targetSize;
      lastMaskIdxRef.current = -1;
    }
  }, [useFallback2D]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    updateCanvasSize();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateCanvasSize());
      resizeObserver.observe(canvas);
    }

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [updateCanvasSize]);

  // ── WebGL2 Pipeline Initialization ───────────────────────────────────────────
  useEffect(() => {
    if (useFallback2D) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      });
    } catch {
      gl = null;
    }

    if (!gl) {
      console.warn('[PortraitCanvas] WebGL2 not supported, falling back to 2D Canvas');
      queueMicrotask(() => setFallback2D(true));
      return;
    }

    let pipeline = null;
    try {
      const rect = canvas.getBoundingClientRect();
      const cssSize = Math.max(1, Math.round(Math.min(rect.width || 512, rect.height || 512)));
      pipeline = new HalftonePipeline(gl, cssSize, cssSize);
      pipelineRef.current = pipeline;
    } catch (err) {
      console.error('[PortraitCanvas] HalftonePipeline initialization failed:', err);
      queueMicrotask(() => setFallback2D(true));
      return;
    }

    const onContextLost = (e) => {
      e.preventDefault();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pipelineRef.current?.destroy();
      pipelineRef.current = null;
    };

    const onContextRestored = () => {
      setGlGeneration((g) => g + 1);
    };

    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      pipeline?.destroy();
      pipelineRef.current = null;
    };
  }, [useFallback2D, glGeneration]);

  // ── Animation & Draw Loop ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = useFallback2D ? canvas.getContext('2d') : null;
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

      const rawDelta = lastTsRef.current !== null ? ts - lastTsRef.current : 16;
      const deltaMs  = Math.min(rawDelta, MAX_DELTA_MS);
      const dt       = deltaMs / 1000;
      lastTsRef.current = ts;

      const cur  = curRef.current;
      const tgt  = tgtRef.current;
      const anim = animRef.current;

      // ── Animation state machine ──────────────────────────────────────────────
      if (anim.mode === MODE_RETURNING || anim.mode === MODE_HANDOFF) {
        if (anim.startTs === null) anim.startTs = ts;

        const elapsed = ts - anim.startTs;
        const t = Math.min(elapsed / anim.duration, 1);
        const e = easeInOut(t);

        if (anim.mode === MODE_RETURNING) {
          cur.yaw   = anim.startYaw   + (NEUTRAL_YAW   - anim.startYaw)   * e;
          cur.pitch = anim.startPitch + (NEUTRAL_PITCH - anim.startPitch) * e;
        } else {
          cur.yaw   = anim.startYaw   + (tgt.yaw   - anim.startYaw)   * e;
          cur.pitch = anim.startPitch + (tgt.pitch - anim.startPitch) * e;
        }

        if (t >= 1) {
          if (anim.mode === MODE_RETURNING) {
            cur.yaw   = NEUTRAL_YAW;
            cur.pitch = NEUTRAL_PITCH;
            tgtRef.current = { yaw: NEUTRAL_YAW, pitch: NEUTRAL_PITCH };
          } else {
            cur.yaw   = tgt.yaw;
            cur.pitch = tgt.pitch;
          }
          anim.mode = MODE_TRACKING;
          scheduleIdleReset();
        }
      } else {
        // MODE_TRACKING
        const alpha = 1 - Math.exp(-deltaMs / TAU_MS);
        cur.yaw   += (tgt.yaw   - cur.yaw)   * alpha;
        cur.pitch += (tgt.pitch - cur.pitch) * alpha;
      }

      // Publish smooth continuous pose for background grid distortion
      if (poseRef?.current) {
        poseRef.current.yaw = cur.yaw;
        poseRef.current.pitch = cur.pitch;
        poseRef.current.canvas = canvas;
      }

      // ── Frame selection ──────────────────────────────────────────────────────
      const { col: fCol, row: fRow } = yawPitchToFractionalGrid(cur.yaw, cur.pitch);
      const idx = nearestLoadedIndex(fCol, fRow, loadedSet);
      if (idx < 0) return;

      const img = getImage(idx);
      if (!img) return;

      // ── Synchronize Occlusion Silhouette Mask ──
      // Uses original frame's alpha channel to render solid #050505 silhouette beneath
      // the halftone visual canvas. This completely occludes background typography
      // across the subject without altering the halftone dot appearance or full-colour reveal.
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas && idx !== lastMaskIdxRef.current) {
        const mctx = maskCanvas.getContext('2d');
        if (mctx) {
          mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          // Draw frame silhouette in solid background color (#050505)
          mctx.save();
          mctx.drawImage(img, 0, 0, maskCanvas.width, maskCanvas.height);
          mctx.globalCompositeOperation = 'source-in';
          mctx.fillStyle = '#050505';
          mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
          mctx.restore();
          lastMaskIdxRef.current = idx;
        }
      }

      // ── Render execution ──
      const pipeline = pipelineRef.current;
      const pointer = revealPointerRef.current;

      if (pipeline && !useFallback2D) {
        // Keep rendering while head is moving, pointer is inside, or reveal trail is decaying
        if (pointer.inside || pipeline.presence > 0.002) {
          trailUntilRef.current = ts + HALFTONE_CONFIG.linger * 1000 + 200;
        }

        const isHeadMoving = (anim.mode !== MODE_TRACKING) ||
          Math.abs(cur.yaw   - tgt.yaw)   > 0.001 ||
          Math.abs(cur.pitch - tgt.pitch) > 0.001;

        const isTrailActive = ts < trailUntilRef.current;
        const needsDraw = isHeadMoving || isTrailActive || pointer.inside || (idx !== lastIdxRef.current);

        if (!needsDraw) return;

        const rect = canvas.getBoundingClientRect();
        const viewWidth = Math.max(1, Math.round(rect.width || 512));
        const viewHeight = Math.max(1, Math.round(rect.height || 512));
        const dpr = canvas.width / viewWidth;

        pipeline.render(
          img,
          idx,
          pointer,
          dt,
          viewWidth,
          viewHeight,
          canvas.width,
          canvas.height,
          dpr
        );

        if (idx !== lastIdxRef.current) {
          lastIdxRef.current = idx;
          if (onFrameChange) {
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            onFrameChange({ idx, col, row, yaw: YAW_VALUES[col], pitch: PITCH_VALUES[row] });
          }
        }
      } else if (ctx) {
        // 2D Fallback Rendering (used only if WebGL2 is unavailable)
        const isHeadMoving = (anim.mode !== MODE_TRACKING) ||
          Math.abs(cur.yaw   - tgt.yaw)   > 0.001 ||
          Math.abs(cur.pitch - tgt.pitch) > 0.001;

        if (idx === lastIdxRef.current && !isHeadMoving && !pointer.inside) return;
        lastIdxRef.current = idx;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Base monochrome
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';

        // Full-colour reveal around pointer
        if (pointer.inside) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(pointer.x * (canvas.width / 512), pointer.y * (canvas.height / 512), HALFTONE_CONFIG.revealRadius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }

        if (onFrameChange) {
          const col = idx % COLS;
          const row = Math.floor(idx / COLS);
          onFrameChange({ idx, col, row, yaw: YAW_VALUES[col], pitch: PITCH_VALUES[row] });
        }
      }
    };

    if (poseRef?.current) {
      poseRef.current.canvas = canvas;
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [getImage, loadedSet, isCenterLoaded, onFrameChange, poseRef, useFallback2D, glGeneration]);

  return (
    <div className="portrait-container">
      {/* Occlusion silhouette mask — painted synchronously with current frame to block typography */}
      <canvas
        ref={maskCanvasRef}
        width={FRAME_SIZE}
        height={FRAME_SIZE}
        className="portrait-canvas portrait-occlusion-mask"
        aria-hidden="true"
      />
      {/* Interactive WebGL2 Halftone canvas */}
      <canvas
        key={useFallback2D ? 'portrait-canvas-2d' : 'portrait-canvas-webgl'}
        ref={canvasRef}
        width={FRAME_SIZE}
        height={FRAME_SIZE}
        className="portrait-canvas portrait-visual-canvas"
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Interactive portrait — move your cursor across the portrait to reveal the photograph beneath the halftone"
      />
    </div>
  );
});

export default PortraitCanvas;

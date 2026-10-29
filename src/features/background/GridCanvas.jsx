/**
 * GridCanvas.jsx
 *
 * Full-viewport canvas rendering the animated dark grid with dynamic
 * contraction/bending distortion around the interactive portrait.
 *
 * Requirements:
 * - Base background: #050505
 * - Charcoal grid lines: #252525, 1px
 * - Cell size: 24 × 24 CSS pixels
 * - Diagonal drift: 24s seamless loop (moving exactly 24px)
 * - Dynamic distortion: follows the portrait's rendered bounds, scale,
 *   head angle, face position, and shoulder silhouette across all poses
 * - Restrained contraction-and-release motion around the portrait
 * - Smooth 60fps tracking without jitter, flicker, or discrete pops
 * - Supports prefers-reduced-motion
 */

import { useEffect, useRef } from 'react';
import { NEUTRAL_YAW, NEUTRAL_PITCH } from '../portrait/frameData.js';

const CELL_SIZE        = 24;
const DRIFT_PERIOD_MS  = 24000; // 24 seconds per 24px cell
const SEGMENT_STEP     = 10;    // resolution for warped line segments (CSS px)
const INFLUENCE_PAD    = 160;   // px padding around portrait bounds for warp zone

export default function GridCanvas({ poseRef }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width  = window.innerWidth;
    let height = window.innerHeight;
    let dpr    = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      width  = window.innerWidth;
      height = window.innerHeight;
      dpr    = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;
    const onMotionChange = (e) => { prefersReducedMotion = e.matches; };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onMotionChange);
    } else {
      mediaQuery.addListener(onMotionChange);
    }

    /**
     * Calculates warped point (wx, wy) for a given grid coordinate (x, y).
     * Accounts for portrait bounds, scale, yaw, pitch, head rotation, and
     * shoulder asymmetry.
     */
    function warpPoint(x, y, rect, yaw, pitch) {
      const W = rect.width;
      const H = rect.height;
      if (W <= 0 || H <= 0) return { x, y };

      const yawNorm   = Math.max(-1, Math.min(1, yaw / 20.0));
      const pitchNorm = Math.max(-1, Math.min(1, (pitch - NEUTRAL_PITCH) / 20.0));

      // ── Head model ────────────────────────────────────────────────────────
      const uHead = 0.50 + yawNorm * 0.045;
      const vHead = 0.40 + pitchNorm * 0.035;
      const theta = yawNorm * 0.07; // head tilt angle (radians)
      const aHead = 0.22 * W;       // horizontal semi-axis
      const bHead = 0.26 * H;       // vertical semi-axis

      const headCenterX = rect.left + uHead * W;
      const headCenterY = rect.top + vHead * H;

      const dx = x - headCenterX;
      const dy = y - headCenterY;
      const cosT = Math.cos(-theta);
      const sinT = Math.sin(-theta);
      const dxRot = dx * cosT - dy * sinT;
      const dyRot = dx * sinT + dy * cosT;
      const qHead = Math.sqrt((dxRot / aHead) ** 2 + (dyRot / bHead) ** 2);

      // ── Torso & shoulder model ───────────────────────────────────────────
      const vRel = (y - rect.top) / H;
      let wNorm = 0.14;
      if (vRel < 0.65) {
        wNorm = 0.14 + Math.max(0, vRel - 0.55) * 0.10;
      } else if (vRel < 0.85) {
        const ts = (vRel - 0.65) / 0.20;
        wNorm = 0.15 + (0.42 - 0.15) * (3 * ts * ts - 2 * ts * ts * ts);
      } else {
        const tb = Math.min(1, (vRel - 0.85) / 0.15);
        wNorm = 0.42 + (0.50 - 0.42) * tb;
      }

      // Torso center and asymmetry with yaw
      const uTorso = 0.50 + yawNorm * 0.015 * Math.max(0, 1 - (vRel - 0.55) / 0.45)
                          - yawNorm * 0.01  * Math.max(0, (vRel - 0.55) / 0.45);
      const torsoCenterX = rect.left + uTorso * W;

      let asym = 1.0;
      if (x < torsoCenterX) {
        asym += yawNorm * 0.08;
      } else {
        asym -= yawNorm * 0.08;
      }
      const halfW = wNorm * W * Math.max(0.5, asym);
      const qTorso = Math.abs(x - torsoCenterX) / Math.max(1, halfW);

      // ── Blend head & torso Proximity ─────────────────────────────────────
      const tBlend = Math.max(0, Math.min(1, (y - (rect.top + 0.58 * H)) / (0.12 * H)));
      const q = (1 - tBlend) * qHead + tBlend * qTorso;

      // Influence extends up to q = 2.2
      if (q > 2.2) return { x, y };

      let falloff = 0;
      if (q >= 1.0) {
        const p = (q - 1.0) / 1.2;
        falloff = (1 - p * p) * (1 - p);
      } else {
        const p = (1.0 - q) / 0.5;
        falloff = Math.max(0, 1 - p);
      }

      // Contraction magnitude (restrained 10px base, expanding to ~13px at peak pose)
      const poseIntensity = 1.0 + 0.3 * (Math.abs(yawNorm) + Math.abs(pitchNorm));
      const dMax = 10.0 * poseIntensity;
      const dispMag = dMax * falloff;

      const targetCenterX = (1 - tBlend) * headCenterX + tBlend * torsoCenterX;
      const targetCenterY = (1 - tBlend) * headCenterY + tBlend * y;
      const toCenterX = targetCenterX - x;
      const toCenterY = targetCenterY - y;
      const dist = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
      if (dist < 0.01) return { x, y };

      return {
        x: x + (toCenterX / dist) * dispMag,
        y: y + (toCenterY / dist) * dispMag,
      };
    }

    // ── Main Render Loop ───────────────────────────────────────────────────
    const render = (ts) => {
      rafRef.current = requestAnimationFrame(render);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // 1. Fill base background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // 2. Diagonal drift offset
      const drift = prefersReducedMotion ? 0 : ((ts % DRIFT_PERIOD_MS) / DRIFT_PERIOD_MS) * CELL_SIZE;

      // 3. Obtain portrait screen bounds and current pose
      const portraitCanvas = poseRef?.current?.canvas;
      const rect = portraitCanvas ? portraitCanvas.getBoundingClientRect() : null;
      const yaw   = poseRef?.current?.yaw   ?? NEUTRAL_YAW;
      const pitch = poseRef?.current?.pitch ?? NEUTRAL_PITCH;

      ctx.strokeStyle = '#252525';
      ctx.lineWidth = 1;
      ctx.beginPath();

      const hasPortrait = rect && rect.width > 0 && rect.height > 0;
      const pLeft   = hasPortrait ? rect.left   - INFLUENCE_PAD : -9999;
      const pRight  = hasPortrait ? rect.right  + INFLUENCE_PAD : -9999;
      const pTop    = hasPortrait ? rect.top    - INFLUENCE_PAD : -9999;
      const pBottom = hasPortrait ? rect.bottom + INFLUENCE_PAD : -9999;

      // 4. Vertical grid lines
      const startX = (drift % CELL_SIZE) - CELL_SIZE;
      for (let x = startX; x <= width + CELL_SIZE; x += CELL_SIZE) {
        if (!hasPortrait || x < pLeft || x > pRight) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        } else {
          ctx.moveTo(x, 0);
          const minY = Math.max(0, pTop);
          const maxY = Math.min(height, pBottom);
          ctx.lineTo(x, minY);
          for (let y = minY; y <= maxY; y += SEGMENT_STEP) {
            const pt = warpPoint(x, y, rect, yaw, pitch);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.lineTo(x, height);
        }
      }

      // 5. Horizontal grid lines
      const startY = (drift % CELL_SIZE) - CELL_SIZE;
      for (let y = startY; y <= height + CELL_SIZE; y += CELL_SIZE) {
        if (!hasPortrait || y < pTop || y > pBottom) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        } else {
          ctx.moveTo(0, y);
          const minX = Math.max(0, pLeft);
          const maxX = Math.min(width, pRight);
          ctx.lineTo(minX, y);
          for (let x = minX; x <= maxX; x += SEGMENT_STEP) {
            const pt = warpPoint(x, y, rect, yaw, pitch);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.lineTo(width, y);
        }
      }

      ctx.stroke();
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('resize', updateSize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', onMotionChange);
      } else {
        mediaQuery.removeListener(onMotionChange);
      }
    };
  }, [poseRef]);

  return (
    <canvas
      ref={canvasRef}
      className="grid-canvas"
      aria-hidden="true"
    />
  );
}

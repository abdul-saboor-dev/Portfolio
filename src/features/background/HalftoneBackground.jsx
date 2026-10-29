/**
 * HalftoneBackground.jsx
 *
 * Monochromatic halftone atmosphere — replaces the LightRays WebGL background.
 * Renders a Canvas 2D composition of white circular dots on a deep-dark ground.
 *
 * Design goals
 * ─────────────
 * • Visible dot variation: fine texture near edges, larger feature dots at
 *   corners/sides, quiet central zone behind the portrait face.
 * • Three dot scales:
 *     – Fine  : radius 1.0–2.5 px, dense edge texture
 *     – Mid   : radius 3.0–5.5 px, transitional scatter
 *     – Feature: radius 6.0–13 px, sparse accent clusters
 * • Dots fade smoothly toward the viewport center via a radial mask so the
 *   portrait remains the unambiguous focal point.
 * • Very slow sinusoidal drift animation (≤ 0.4 px amplitude, skipped when
 *   prefers-reduced-motion is set).
 * • pointer-events: none — never intercepts portrait interaction.
 * • Deterministic layout: same seed → same composition every render.
 */

import { useEffect, useRef, useCallback } from 'react';
import './HalftoneBackground.css';

/* ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────── */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── smoothstep ────────────────────────────────────────────────────────────── */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/* ─── Radial fade mask: returns 0 at center, 1 at far edges ────────────────── */
function radialWeight(nx, ny, innerR, outerR) {
  const d = Math.sqrt(nx * nx + ny * ny); // [0..~1.41]
  return smoothstep(innerR, outerR, d);
}

/* ─── Build the full dot composition ───────────────────────────────────────── */
function buildDots(w, h) {
  const rng = mulberry32(0xdeadbeef);
  const cx = w / 2;
  const cy = h / 2;
  const dots = [];

  // Normalised [-1..1] coords
  const nx = (x) => (x - cx) / cx;
  const ny = (y) => (y - cy) / cy;

  /* ── LAYER A — Fine edge texture ── */
  // Dense stipple seeded across entire canvas; dots near center are suppressed
  // by their opacity weight.
  const fineCount = Math.round((w * h) / 1800);
  for (let i = 0; i < fineCount; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const w0 = radialWeight(nx(x), ny(y), 0.22, 0.75);
    if (w0 < 0.04) continue;
    const r = 1.0 + rng() * 1.5;
    const alpha = (0.10 + rng() * 0.18) * w0;
    dots.push({ x, y, r, alpha, driftX: (rng() - 0.5) * 2, driftY: (rng() - 0.5) * 2 });
  }

  /* ── LAYER B — Mid-scale scatter ── */
  // Concentrated in transitional bands between edge and center.
  const midCount = Math.round((w * h) / 7000);
  for (let i = 0; i < midCount; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const w0 = radialWeight(nx(x), ny(y), 0.28, 0.80);
    if (w0 < 0.12) continue;
    const r = 3.0 + rng() * 2.5;
    const alpha = (0.15 + rng() * 0.22) * w0;
    dots.push({ x, y, r, alpha, driftX: (rng() - 0.5) * 3, driftY: (rng() - 0.5) * 3 });
  }

  /* ── LAYER C — Feature accent dots ── */
  // Sparse large dots anchored near corners and mid-sides; never too central.
  const anchors = [
    // corners
    { ax: 0.05, ay: 0.05 }, { ax: 0.95, ay: 0.05 },
    { ax: 0.05, ay: 0.95 }, { ax: 0.95, ay: 0.95 },
    // mid-sides
    { ax: 0.02, ay: 0.50 }, { ax: 0.98, ay: 0.50 },
    { ax: 0.50, ay: 0.02 }, { ax: 0.50, ay: 0.98 },
    // off-center clusters
    { ax: 0.15, ay: 0.25 }, { ax: 0.85, ay: 0.25 },
    { ax: 0.15, ay: 0.75 }, { ax: 0.85, ay: 0.75 },
    { ax: 0.22, ay: 0.50 }, { ax: 0.78, ay: 0.50 },
    { ax: 0.40, ay: 0.08 }, { ax: 0.60, ay: 0.08 },
    { ax: 0.40, ay: 0.92 }, { ax: 0.60, ay: 0.92 },
  ];
  for (const { ax, ay } of anchors) {
    const clusterCount = 6 + Math.round(rng() * 10);
    for (let i = 0; i < clusterCount; i++) {
      const spread = 0.12 + rng() * 0.10;
      const x = (ax + (rng() - 0.5) * spread * 2) * w;
      const y = (ay + (rng() - 0.5) * spread * 2) * h;
      const w0 = radialWeight(nx(x), ny(y), 0.30, 0.72);
      if (w0 < 0.08) continue;
      const r = 6.0 + rng() * 7.0;
      const alpha = (0.10 + rng() * 0.20) * w0;
      dots.push({ x, y, r, alpha, driftX: (rng() - 0.5) * 4, driftY: (rng() - 0.5) * 4 });
    }
  }

  /* ── LAYER D — Edge-hug reinforcement ── */
  // A second pass of fine dots hugging the four screen edges to ensure the
  // periphery always has visible texture, regardless of viewport size.
  const edgeCount = Math.round((w + h) / 6);
  for (let i = 0; i < edgeCount; i++) {
    let x, y;
    const side = Math.floor(rng() * 4);
    const margin = 40 + rng() * 80;
    if (side === 0) { x = rng() * w; y = margin * rng(); }
    else if (side === 1) { x = rng() * w; y = h - margin * rng(); }
    else if (side === 2) { x = margin * rng(); y = rng() * h; }
    else { x = w - margin * rng(); y = rng() * h; }
    const w0 = radialWeight(nx(x), ny(y), 0.15, 0.60);
    if (w0 < 0.05) continue;
    const r = 1.2 + rng() * 2.8;
    const alpha = (0.14 + rng() * 0.20) * w0;
    dots.push({ x, y, r, alpha, driftX: (rng() - 0.5) * 2, driftY: (rng() - 0.5) * 2 });
  }

  return dots;
}

/* ─── Render one frame ──────────────────────────────────────────────────────── */
function renderFrame(ctx, dots, w, h, time, reducedMotion) {
  ctx.clearRect(0, 0, w, h);
  // Background fill
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, w, h);

  for (const d of dots) {
    // Slow sinusoidal drift (skip when reduced motion)
    const dx = reducedMotion ? 0 : Math.sin(time * 0.00038 + d.driftX) * 0.35;
    const dy = reducedMotion ? 0 : Math.cos(time * 0.00031 + d.driftY) * 0.35;
    const px = d.x + dx;
    const py = d.y + dy;

    ctx.beginPath();
    ctx.arc(px, py, d.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${d.alpha.toFixed(3)})`;
    ctx.fill();
  }
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function HalftoneBackground({ className }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      dots: [],
      width: 0,
      height: 0,
      dpr: 1,
      raf: null,
      startTime: 0,
      reducedMotion: false,
      dirty: true,
    };
  }

  /* Stable ref to the RAF callback — avoids the self-reference lint warning */
  const tickRef = useRef(null);

  /* Build / rebuild dot layout */
  const rebuild = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    s.dpr = dpr;
    s.width = w;
    s.height = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    s.dots = buildDots(w, h);
    s.dirty = true;
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    s.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    s.startTime = performance.now();

    rebuild();

    /* Named RAF callback stored in a ref — no self-reference during init */
    function loop(ts) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const elapsed = ts - s.startTime;
      if (s.dirty || !s.reducedMotion) {
        renderFrame(ctx, s.dots, s.width, s.height, elapsed, s.reducedMotion);
        s.dirty = false;
      }
      s.raf = requestAnimationFrame(loop);
    }
    tickRef.current = loop;

    /* ResizeObserver: recompute on layout change */
    const ro = new ResizeObserver(() => {
      rebuild();
    });
    if (canvasRef.current) ro.observe(canvasRef.current);

    /* IntersectionObserver: pause RAF when off-screen */
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !s.raf) {
        s.startTime = performance.now();
        s.raf = requestAnimationFrame(loop);
      } else if (!entry.isIntersecting && s.raf) {
        cancelAnimationFrame(s.raf);
        s.raf = null;
      }
    });
    if (canvasRef.current) io.observe(canvasRef.current);

    /* Start loop */
    s.raf = requestAnimationFrame(loop);

    return () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [rebuild]);

  return (
    <div className={`halftone-background${className ? ` ${className}` : ''}`}>
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

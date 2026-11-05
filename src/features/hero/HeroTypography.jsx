/**
 * HeroTypography.jsx
 *
 * Coordinates permanent, vertically elongated square-pixel typography
 * and the strict sequential interleaved preloader for ABDUL SABOOR.
 *
 * Exact Sequence:
 * A -> B -> D -> U -> L -> S -> A -> B -> O -> O -> R
 * Exactly ONE pixel drawn per step in strict round-robin order.
 * Permanent pixel typography: once 100% complete, stays on canvas permanently.
 */

import { useEffect, useRef, useCallback } from 'react';

// Character streams
const WORD1_CHARS = ['A', 'B', 'D', 'U', 'L'];
const WORD2_CHARS = ['S', 'A', 'B', 'O', 'O', 'R'];
const ALL_LETTERS = [...WORD1_CHARS, ...WORD2_CHARS]; // 11 letters

// Custom tall, condensed pixel font (6 cols x 16 rows)
// Height : Width ratio = 16 : 6 = 2.67 (2.67x as tall as wide, tall editorial appearance)
const TALL_PIXEL_FONT = {
  A: [
    '011110',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '111111',
    '111111',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
  ],
  B: [
    '111110',
    '110011',
    '110011',
    '110011',
    '110011',
    '111110',
    '111110',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '111110',
  ],
  D: [
    '111110',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '111110',
  ],
  U: [
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '011110',
  ],
  L: [
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '110000',
    '111111',
    '111111',
  ],
  S: [
    '011110',
    '110011',
    '110000',
    '110000',
    '110000',
    '111110',
    '011111',
    '000011',
    '000011',
    '000011',
    '000011',
    '000011',
    '000011',
    '000011',
    '110011',
    '011110',
  ],
  O: [
    '011110',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '011110',
  ],
  R: [
    '111110',
    '110011',
    '110011',
    '110011',
    '110011',
    '111110',
    '111100',
    '111100',
    '110110',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
    '110011',
  ],
};

const GLYPH_COLS = 6;
const GLYPH_ROWS = 16;
const GLYPH_GAP = 2; // in grid cells

// ABDUL grid width = 5 * 6 + 4 * 2 = 38
// SABOOR grid width = 6 * 6 + 5 * 2 = 46

// Step interval in milliseconds for drawing each single scheduled pixel
// 3.5ms * 682 pixels = ~2.38 seconds total
const STEP_INTERVAL_MS = 3.5;

export default function HeroTypography({
  onHeroReady,
  prefersReducedMotion = false,
  active = true,
}) {
  const canvasRef1 = useRef(null);
  const containerRef1 = useRef(null);
  const canvasRef2 = useRef(null);
  const containerRef2 = useRef(null);

  const animStateRef = useRef({
    active: false,
    startTime: null,
    stepIndex: 0,
    steps: [],
    dpr: 1,
    cellSize: 1,
    completedFired: false,
  });

  const rafRef = useRef(null);

  // Build the deterministic ordered list of points for each character
  const getOrderedPoints = useCallback((char) => {
    const grid = TALL_PIXEL_FONT[char];
    const points = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === '1') {
          // Deterministic ordering: sweep down with consistent pseudo-random dispersal
          const hash = ((x * 37 + y * 19) % 100) / 100;
          const sortKey = (y / grid.length) * 0.65 + hash * 0.35;
          points.push({ x, y, sortKey });
        }
      }
    }
    points.sort((a, b) => a.sortKey - b.sortKey);
    return points;
  }, []);

  // Schedule the strict round-robin interleaved sequence:
  // Exactly 1 pixel of A, then B, D, U, L, S, A, B, O, O, R
  const buildInterleavedSchedule = useCallback(() => {
    const letterStreams = ALL_LETTERS.map((char, index) => ({
      index,
      word: index < 5 ? 1 : 2,
      letterPosInWord: index < 5 ? index : index - 5,
      char,
      points: getOrderedPoints(char),
      ptr: 0,
    }));

    const schedule = [];
    let hasRemaining = true;

    while (hasRemaining) {
      hasRemaining = false;
      for (let i = 0; i < letterStreams.length; i++) {
        const stream = letterStreams[i];
        if (stream.ptr < stream.points.length) {
          hasRemaining = true;
          const pt = stream.points[stream.ptr++];
          schedule.push({
            word: stream.word,
            char: stream.char,
            gridX: stream.letterPosInWord * (GLYPH_COLS + GLYPH_GAP) + pt.x,
            gridY: pt.y,
          });
        }
      }
    }

    return schedule;
  }, [getOrderedPoints]);

  useEffect(() => {
    if (!active) return;
    const c1 = containerRef1.current;
    const c2 = containerRef2.current;
    const canvas1 = canvasRef1.current;
    const canvas2 = canvasRef2.current;
    if (!c1 || !c2 || !canvas1 || !canvas2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const r1 = c1.getBoundingClientRect();
    const r2 = c2.getBoundingClientRect();

    const w1 = Math.max(1, Math.round(r1.width));
    const h1 = Math.max(1, Math.round(r1.height));
    const w2 = Math.max(1, Math.round(r2.width));
    const h2 = Math.max(1, Math.round(r2.height));

    canvas1.width = Math.round(w1 * dpr);
    canvas1.height = Math.round(h1 * dpr);
    canvas2.width = Math.round(w2 * dpr);
    canvas2.height = Math.round(h2 * dpr);

    // Compute square cell size:
    // ABDUL has 38 grid cols and 16 rows
    const cellSize1 = Math.floor(Math.min(w1 / 38, h1 / GLYPH_ROWS));
    // SABOOR has 46 grid cols and 16 rows
    const cellSize2 = Math.floor(Math.min(w2 / 46, h2 / GLYPH_ROWS));

    // Ensure cell sizes are equal and individual pixels are strictly square
    let currentCellSize = Math.max(3, Math.min(cellSize1, cellSize2));

    const schedule = buildInterleavedSchedule();

    const ctx1 = canvas1.getContext('2d');
    const ctx2 = canvas2.getContext('2d');
    if (!ctx1 || !ctx2) return;

    // Draw a single square pixel on word 1 or word 2
    const drawSinglePixel = (step) => {
      const isWord1 = step.word === 1;
      const ctx = isWord1 ? ctx1 : ctx2;
      const px = Math.round(step.gridX * currentCellSize * dpr);
      const py = Math.round(step.gridY * currentCellSize * dpr);
      const pSize = Math.max(1, Math.round((currentCellSize - 0.5) * dpr));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, pSize, pSize);
    };

    const handleResize = () => {
      const nw1 = Math.max(1, Math.round(c1.getBoundingClientRect().width));
      const nh1 = Math.max(1, Math.round(c1.getBoundingClientRect().height));
      const nw2 = Math.max(1, Math.round(c2.getBoundingClientRect().width));
      const nh2 = Math.max(1, Math.round(c2.getBoundingClientRect().height));

      canvas1.width = Math.round(nw1 * dpr);
      canvas1.height = Math.round(nh1 * dpr);
      canvas2.width = Math.round(nw2 * dpr);
      canvas2.height = Math.round(nh2 * dpr);

      const nCell1 = Math.floor(Math.min(nw1 / 38, nh1 / GLYPH_ROWS));
      const nCell2 = Math.floor(Math.min(nw2 / 46, nh2 / GLYPH_ROWS));
      currentCellSize = Math.max(3, Math.min(nCell1, nCell2));

      ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);

      const state = animStateRef.current;
      const count = state.completedFired ? schedule.length : state.stepIndex;
      for (let i = 0; i < count; i++) {
        drawSinglePixel(schedule[i]);
      }
    };

    window.addEventListener('resize', handleResize);

    if (prefersReducedMotion) {
      ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
      ctx2.clearRect(0, 0, canvas2.width, canvas2.height);
      schedule.forEach(drawSinglePixel);
      if (onHeroReady) onHeroReady();
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    animStateRef.current = {
      active: true,
      startTime: null,
      stepIndex: 0,
      steps: schedule,
      totalSteps: schedule.length,
      completedFired: false,
    };

    let timeoutId = null;

    const render = (now) => {
      const state = animStateRef.current;
      if (!state.active) return;

      if (state.startTime === null) {
        state.startTime = now;
      }

      const elapsed = now - state.startTime;
      const targetStep = Math.min(Math.floor(elapsed / STEP_INTERVAL_MS), state.totalSteps);

      // Progressively reveal scheduled pixels strictly in round-robin order
      while (state.stepIndex < targetStep) {
        const step = state.steps[state.stepIndex];
        drawSinglePixel(step);
        state.stepIndex++;
      }

      if (state.stepIndex >= state.totalSteps) {
        // Complete! Typography permanently stays on canvas in pure pixel form.
        state.active = false;
        if (!state.completedFired && onHeroReady) {
          state.completedFired = true;
          onHeroReady();
        }
        return;
      }

      rafRef.current = requestAnimationFrame(render);
    };

    // Begin construction at t = 150ms
    timeoutId = setTimeout(() => {
      rafRef.current = requestAnimationFrame(render);
    }, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      animStateRef.current.active = false;
    };
  }, [buildInterleavedSchedule, prefersReducedMotion, onHeroReady, active]);

  return (
    <div className="hero-typography-layer" aria-label="Abdul Saboor — Portfolio">
      {/* Upper-Left: ABDUL (L partially behind head) */}
      <div className="hero-name-block hero-name-top">
        <div ref={containerRef1} className="pixel-typography-container hero-word-abdul">
          <canvas
            ref={canvasRef1}
            className="pixel-typography-canvas"
            aria-label="ABDUL"
          />
        </div>
      </div>

      {/* Lower-Right: SABOOR (small portion of S behind right body; A fully visible) */}
      <div className="hero-name-block hero-name-bottom">
        <div ref={containerRef2} className="pixel-typography-container hero-word-saboor">
          <canvas
            ref={canvasRef2}
            className="pixel-typography-canvas"
            aria-label="SABOOR"
          />
        </div>
      </div>
    </div>
  );
}

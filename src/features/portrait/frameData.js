/**
 * frameData.js
 * Grid metadata and helpers for all 340 portrait frames.
 *
 * Grid: 20 columns (yaw) × 17 rows (pitch)
 *   col 0  → yaw -20°  (head turned left)
 *   col 19 → yaw +20°  (head turned right)
 *   row 0  → pitch -20° (head tilted up)
 *   row 16 → pitch +13.7° (head tilted down)
 *   idx = row * 20 + col  (0–339)
 *
 * Neutral pose: col 9 (yaw -1.1°), row 9 (pitch -1.1°) — closest to 0°/0°.
 */

import { FRAME_FILENAMES } from './frameList.generated.js';

export const COLS = 20;
export const ROWS = 17;

// Yaw values by column index (degrees). col 0 = -20°, col 19 = +20°.
export const YAW_VALUES = [
  -20.0, -17.9, -15.8, -13.7, -11.6, -9.5, -7.4, -5.3, -3.2, -1.1,
   1.1,   3.2,   5.3,   7.4,   9.5, 11.6, 13.7, 15.8, 17.9, 20.0,
];

// Pitch values by row index (degrees). row 0 = -20° (up), row 16 = +13.7° (down).
export const PITCH_VALUES = [
  -20.0, -17.9, -15.8, -13.7, -11.6, -9.5, -7.4, -5.3, -3.2, -1.1,
   1.1,   3.2,   5.3,   7.4,   9.5, 11.6, 13.7,
];

// Default neutral: column and row whose yaw/pitch is closest to 0°.
export const NEUTRAL_COL = 9;   // yaw -1.1° — nearest available to 0°
export const NEUTRAL_ROW = 9;   // pitch -1.1° — nearest available to 0°
export const NEUTRAL_YAW   = YAW_VALUES[NEUTRAL_COL];   // -1.1°
export const NEUTRAL_PITCH = PITCH_VALUES[NEUTRAL_ROW];  // -1.1°

/** Returns the public URL for a given (col, row) grid coordinate. */
export function getFrameUrl(col, row) {
  const idx = row * COLS + col;
  return `/frames/${FRAME_FILENAMES[idx]}`;
}

/** Returns flat frame index for grid coordinate. */
export function gridToIndex(col, row) {
  return row * COLS + col;
}

/** Returns grid coordinate for a flat frame index. */
export function indexToGrid(idx) {
  return { col: idx % COLS, row: Math.floor(idx / COLS) };
}

/**
 * Maps a yaw/pitch value (degrees) to a fractional grid column/row.
 * Yaw  -20° → col 0,  +20°   → col 19
 * Pitch -20° → row 0, +13.7° → row 16
 */
export function yawPitchToFractionalGrid(yaw, pitch) {
  const yawMin   = YAW_VALUES[0];          // -20
  const yawMax   = YAW_VALUES[COLS - 1];   // +20
  const pitchMin = PITCH_VALUES[0];        // -20
  const pitchMax = PITCH_VALUES[ROWS - 1]; // +13.7

  const col = ((yaw   - yawMin)   / (yawMax   - yawMin))   * (COLS - 1);
  const row = ((pitch - pitchMin) / (pitchMax - pitchMin)) * (ROWS - 1);
  return { col, row };
}

/**
 * Maps a normalized pointer position to yaw/pitch (degrees).
 *
 * nx ∈ [-1, 1]: left edge = -1 → yaw -20°, right edge = +1 → yaw +20°
 * ny ∈ [-1, 1]: top edge  = -1 → pitch -20° (looking up)
 *               bottom edge = +1 → pitch +13.7° (looking down)
 *
 * The yaw range is symmetric (-20 to +20 = 40°).
 * The pitch range is asymmetric (-20 to +13.7 = 33.7°).
 * Both are mapped linearly within their own actual range.
 */
export function normalizedToYawPitch(nx, ny) {
  const yawMin   = YAW_VALUES[0];          // -20
  const yawMax   = YAW_VALUES[COLS - 1];   // +20
  const pitchMin = PITCH_VALUES[0];        // -20
  const pitchMax = PITCH_VALUES[ROWS - 1]; // +13.7

  const yaw   = yawMin   + (nx + 1) / 2 * (yawMax   - yawMin);
  const pitch = pitchMin + (ny + 1) / 2 * (pitchMax - pitchMin);
  return { yaw, pitch };
}

/** Clamps a value to [min, max] */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Finds the nearest loaded frame for a given fractional (col, row).
 * Fast path: if the rounded integer cell is already loaded, return it directly.
 * Fallback: linear scan over the loaded set (bounded by 340 frames).
 */
export function nearestLoadedIndex(fCol, fRow, loadedSet) {
  const tc = Math.round(clamp(fCol, 0, COLS - 1));
  const tr = Math.round(clamp(fRow, 0, ROWS - 1));
  const exact = gridToIndex(tc, tr);
  if (loadedSet.has(exact)) return exact;

  let bestIdx = -1;
  let bestDist = Infinity;
  for (const idx of loadedSet) {
    const c = idx % COLS;
    const r = Math.floor(idx / COLS);
    const d = (c - fCol) ** 2 + (r - fRow) ** 2;
    if (d < bestDist) { bestDist = d; bestIdx = idx; }
  }
  return bestIdx;
}

/**
 * Builds the progressive preload order: center-outward BFS.
 * Center is (NEUTRAL_COL, NEUTRAL_ROW) = (9, 9).
 */
export function buildPreloadOrder() {
  const visited = new Uint8Array(COLS * ROWS);
  const order   = [];
  const heap    = [[0, NEUTRAL_COL, NEUTRAL_ROW]];
  visited[gridToIndex(NEUTRAL_COL, NEUTRAL_ROW)] = 1;

  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0]);
    const [, col, row] = heap.shift();
    order.push(gridToIndex(col, row));
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        const ni = gridToIndex(nc, nr);
        if (!visited[ni]) {
          visited[ni] = 1;
          heap.push([(nc - NEUTRAL_COL) ** 2 + (nr - NEUTRAL_ROW) ** 2, nc, nr]);
        }
      }
    }
  }
  return order;
}

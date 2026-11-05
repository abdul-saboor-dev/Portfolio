/**
 * startupTiming.js
 *
 * Single source of truth for the startup dinosaur sequence timing.
 * LOADER_THRESHOLD_MS and DINO_ENTRANCE_MS must stay identical to the
 * inline pre-React shell in index.html, which animates on its own CSS clock.
 */

export const LOADER_THRESHOLD_MS = 800;
export const DINO_ENTRANCE_MS = 850;
export const MIN_WAITING_RUN_MS = 3000;

/** Inline shell script records this while parsing <head>; 0 falls back to navigationStart. */
export function bootTimeMs() {
  if (typeof window === 'undefined') return 0;
  return typeof window.__PORTFOLIO_BOOT__ === 'number' ? window.__PORTFOLIO_BOOT__ : 0;
}

export function elapsedSinceBootMs() {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return Math.max(0, now - bootTimeMs());
}

/**
 * How far the shell's entrance animation has already progressed when React takes over.
 * Keeps the loader mid-flight instead of restarting or skipping the entrance.
 */
export function entranceOffsetMs() {
  return Math.max(0, elapsedSinceBootMs() - LOADER_THRESHOLD_MS);
}

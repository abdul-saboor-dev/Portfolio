/**
 * startupTiming.js
 *
 * Single source of truth for the startup dinosaur sequence timing.
 *
 * The pre-React shell in index.html and the React loader animate the very same
 * entrance, so the only clock that may drive the handoff is the shell's own CSS
 * animation timeline. A CSSAnimation keeps startTime null and currentTime at 0
 * until the document has produced a frame for it, and only advances with
 * document.timeline afterwards — never with performance.now(). Measuring the
 * entrance with the JS clock therefore claims travel that was never painted.
 */

export const DINO_ENTRANCE_MS = 850;

/** One pass of the three-pose leg cycle, identical in the shell and in React. */
export const DINO_RUN_CYCLE_MS = 300;

/** Sprint cycle used by .dino-container.is-exiting .dino-pixel. */
export const DINO_SPRINT_CYCLE_MS = 140;

export const MIN_WAITING_RUN_MS = 3000;

function firstAnimation(selector) {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el || typeof el.getAnimations !== 'function') return null;
  const animations = el.getAnimations();
  return animations.length > 0 ? animations[0] : null;
}

/**
 * Rendered elapsed time of an animation, or null while it has never been
 * painted (pending animations report startTime null and currentTime 0).
 */
function renderedTimeMs(anim) {
  if (!anim || anim.startTime === null) return null;
  return typeof anim.currentTime === 'number' ? anim.currentTime : null;
}

let cachedPhase = null;

/**
 * How far the shell's entrance has actually been painted, plus the phase of its
 * leg cycle, when React takes over. Captured once: the shell is removed in the
 * same commit that mounts the loader, and a StrictMode remount must resume from
 * the phase the user saw rather than from a shell that is already gone.
 *
 * A shell that never painted reports 0, so React runs the full entrance from
 * outside the viewport instead of dropping the dinosaur in mid-flight.
 */
export function readShellPhase() {
  if (cachedPhase !== null) return cachedPhase;

  const entranceMs = renderedTimeMs(firstAnimation('#startup-shell .shell-dino-container'));
  const runMs = renderedTimeMs(firstAnimation('#startup-shell .shell-dino-pixel'));

  cachedPhase = {
    entranceMs: entranceMs === null ? 0 : Math.min(entranceMs, DINO_ENTRANCE_MS),
    runMs: runMs === null ? 0 : runMs % DINO_RUN_CYCLE_MS,
  };
  return cachedPhase;
}

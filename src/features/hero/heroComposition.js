/**
 * heroComposition.js
 *
 * Decides whether ABDUL / SABOOR can keep the diagonal editorial composition or
 * must switch to the stacked one.
 *
 * The decision is geometric rather than a conventional device breakpoint: the
 * diagonal arrangement only survives while the portrait silhouette leaves a
 * clear column for SABOOR. That is tested against the actual silhouette of the
 * neutral portrait frame (see SILHOUETTE_RIGHT_U below) and the live diagonal
 * layout boxes, so it follows the real constraints of the portrait stage.
 */

export const GLYPH_COLS = 6;
export const GLYPH_ROWS = 16;
export const GLYPH_GAP = 2;

// Grid-cell width of each word: 5 letters + 4 gaps, and 6 letters + 5 gaps.
export const ABDUL_CELLS = 5 * GLYPH_COLS + 4 * GLYPH_GAP; // 38
export const SABOOR_CELLS = 6 * GLYPH_COLS + 5 * GLYPH_GAP; // 46

/**
 * Silhouette right edge, normalised to the portrait canvas width, sampled every
 * 1/32 of the frame height (row 0 = top). Measured from the alpha channel of
 * neutral frame 189 (opacity > 128). The same sweep over the extreme pose frames
 * (0, 9, 180, 199, 339) differs by less than 0.02, so one profile covers the
 * whole tracking range.
 */
const SILHOUETTE_RIGHT_U = [
  0, 0, 0, 0, 0, 0, 0.593, 0.636, 0.656, 0.681, 0.705, 0.708, 0.706, 0.693,
  0.697, 0.697, 0.695, 0.687, 0.669, 0.642, 0.628, 0.628, 0.632, 0.695, 0.767,
  0.836, 0.896, 0.943, 0.965, 0.98, 0.994, 1,
];

// Keep both words clear of the viewport edge.
const EDGE_MARGIN_PX = 8;

// The diagonal design deliberately tucks the leading letters behind the
// silhouette; more than this is a composition failure, not a stylistic tuck.
const MAX_TUCKED_GLYPHS = 2;

// The shoulder rises into the baseline of the word; only the upper part of the
// letters decides whether the word is still readable.
const READABLE_FRACTION = 2 / 3;

function maxSilhouetteU(v0, v1) {
  const bands = SILHOUETTE_RIGHT_U.length;
  const from = Math.max(0, Math.floor(v0 * bands));
  const to = Math.min(bands - 1, Math.floor(v1 * bands));
  let peak = 0;
  for (let b = from; b <= to; b++) peak = Math.max(peak, SILHOUETTE_RIGHT_U[b]);
  return peak;
}

/**
 * Single source of truth for the pixel cell size, mirroring the glyph grid.
 * Both words share one cell so every drawn pixel stays strictly square.
 */
export function computeCellSize(abdulBox, saboorBox) {
  const cellA = Math.floor(Math.min(abdulBox.width / ABDUL_CELLS, abdulBox.height / GLYPH_ROWS));
  const cellS = Math.floor(Math.min(saboorBox.width / SABOOR_CELLS, saboorBox.height / GLYPH_ROWS));
  return Math.max(3, Math.min(cellA, cellS));
}

export function measureDiagonalMetrics() {
  const abdul = document.querySelector('.hero-word-abdul');
  const saboor = document.querySelector('.hero-word-saboor');
  const portrait = document.querySelector('.portrait-occlusion-mask');
  if (!abdul || !saboor || !portrait) return null;

  const abdulBox = abdul.getBoundingClientRect();
  const saboorBox = saboor.getBoundingClientRect();
  const portraitBox = portrait.getBoundingClientRect();
  if (abdulBox.width < 1 || saboorBox.width < 1 || portraitBox.width < 1) return null;

  return {
    viewportWidth: window.innerWidth,
    abdulBox,
    saboorBox,
    portraitBox,
  };
}

export function decideHeroComposition({ viewportWidth, abdulBox, saboorBox, portraitBox }) {
  const cell = computeCellSize(abdulBox, saboorBox);
  const saboorDrawnWidth = SABOOR_CELLS * cell;
  const abdulDrawnWidth = ABDUL_CELLS * cell;

  const clips =
    saboorBox.left + saboorDrawnWidth > viewportWidth - EDGE_MARGIN_PX ||
    abdulBox.left + abdulDrawnWidth > viewportWidth - EDGE_MARGIN_PX;
  if (clips) return 'stacked';

  const drawnHeight = GLYPH_ROWS * cell;
  const top = (saboorBox.top - portraitBox.top) / portraitBox.width;
  const readableBottom = (saboorBox.top + drawnHeight * READABLE_FRACTION - portraitBox.top) / portraitBox.width;
  const silhouetteRight = portraitBox.left + maxSilhouetteU(top, readableBottom) * portraitBox.width;

  const tuckedGlyphs = (silhouetteRight - saboorBox.left) / ((GLYPH_COLS + GLYPH_GAP) * cell);
  return tuckedGlyphs > MAX_TUCKED_GLYPHS ? 'stacked' : 'diagonal';
}

/**
 * Measures the diagonal layout (never the stacked one) and publishes the result
 * as html[data-hero-composition] so App.css can restyle both the typography
 * layer and the portrait stage from a single decision.
 */
export function resolveHeroComposition() {
  const root = document.documentElement;
  const previous = root.dataset.heroComposition;
  root.dataset.heroComposition = 'diagonal';

  const metrics = measureDiagonalMetrics();
  const mode = metrics ? decideHeroComposition(metrics) : 'diagonal';
  root.dataset.heroComposition = mode;

  return { mode, changed: previous !== mode };
}

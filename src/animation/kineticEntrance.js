import { gsap } from './gsap.js';
import { KINETIC_TIMING } from './kineticTiming.js';

const GLYPH_SELECTOR = '[data-glyph-id]';
const WORDMARK_SELECTOR = '[data-testid="kinetic-wordmark"]';
const SUPPORT_SELECTOR = '.kinetic-hero__support';
const STATEMENT_SELECTOR = '[data-hero-statement]';
const INTRODUCTION_SELECTOR = '.kinetic-hero__introduction';
const ACTION_SELECTOR = '.kinetic-hero__action';
const NAVIGATION_SELECTOR = '.hero-navigation';
const SCROLL_CUE_SELECTOR = '.kinetic-hero__scroll-cue';
const GLYPH_COUNT = 11;
const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const lerp = (start, end, progress) => start + (end - start) * progress;
const smoothstep = (value) => value * value * (3 - 2 * value);
const smootherstep = (value) => value * value * value * (value * (value * 6 - 15) + 10);

const centerOf = (rect) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const rotationOf = (element) => {
  const transform = getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  const matrix = new DOMMatrixReadOnly(transform);
  const rotation = Math.atan2(matrix.m12, matrix.m11) * (180 / Math.PI);
  return rotation < 0 ? rotation + 360 : rotation;
};

const clearGlyphPresentation = (glyphs) => {
  gsap.set(glyphs, {
    clearProps: 'transform,textShadow,willChange',
  });
};

const getVisibleViewport = () =>
  window.__kineticViewport?.read?.() ?? {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  };

const getCircleGeometry = (finalRects) => {
  const viewport = getVisibleViewport();
  const isCompact = window.matchMedia('(max-width: 600px)').matches;
  const isLandscapeMobile = window.matchMedia(
    '(max-height: 540px) and (orientation: landscape)',
  ).matches;
  const shortestSide = Math.min(viewport.width, viewport.height);
  const radius = isLandscapeMobile
    ? clamp(shortestSide * 0.1, 2.4 * 16, 2.6 * 16)
    : isCompact
      ? clamp(viewport.width * 0.102, 2.35 * 16, 2.5 * 16)
      : clamp(shortestSide * 0.049, 2.75 * 16, 2.95 * 16);
  const loaderGlyphHeight = isLandscapeMobile
    ? 1.2 * 16
    : isCompact
      ? 1.28 * 16
      : 1.4 * 16;

  return {
    compact: isCompact,
    center: {
      x: viewport.left + viewport.width / 2,
      y: viewport.top + viewport.height / 2,
    },
    radius,
    scales: finalRects.map((rect) => loaderGlyphHeight / rect.height),
  };
};

const getOrbitAngles = () => {
  const step = 360 / GLYPH_COUNT;
  return Array.from({ length: GLYPH_COUNT }, (_, index) => -90 + step * index);
};

const getOrbitRotations = (orbitAngles) => orbitAngles.map((angle) => angle + 90);

const buildReleaseRoutes = ({ circle, finalCenters, orbitAngles, rotation }) => {
  const groups = [
    { start: 0, end: 5, row: -1 },
    { start: 5, end: 11, row: 1 },
  ];

  return finalCenters.map((end, index) => {
    const group = groups[index < 5 ? 0 : 1];
    const groupCenters = finalCenters.slice(group.start, group.end);
    const wordCenterX =
      groupCenters.reduce((total, point) => total + point.x, 0) / groupCenters.length;
    const wordIndex = index - group.start;
    const normalizedOrder = (wordIndex / (groupCenters.length - 1)) * 2 - 1;
    const angle = (orbitAngles[index] + rotation) * (Math.PI / 180);
    const radial = { x: Math.cos(angle), y: Math.sin(angle) };
    const start = {
      x: circle.center.x + radial.x * circle.radius,
      y: circle.center.y + radial.y * circle.radius,
    };
    const separationAngle = angle + 28 * (Math.PI / 180);
    const separationRadius = circle.radius * (circle.compact ? 3 : 3.4);
    const separated = {
      x: circle.center.x + Math.cos(separationAngle) * separationRadius,
      y: circle.center.y + Math.sin(separationAngle) * separationRadius,
    };
    const rowOffset = circle.radius * (circle.compact ? 2.05 : 2.45);
    const arcDepth = circle.radius * (circle.compact ? 0.42 : 0.58);
    const wordSpread = index < 5 ? 1.12 : 0.82;
    const midpointCenterX = lerp(circle.center.x, wordCenterX, 0.45);
    const midpoint = {
      x: midpointCenterX + (end.x - wordCenterX) * wordSpread,
      y:
        circle.center.y +
        group.row * rowOffset +
        normalizedOrder * normalizedOrder * arcDepth,
    };
    return { angle, start, separated, midpoint, end };
  });
};

const pointOnReleaseRoute = (route, progress) => {
  const separationEnd = 0.2;

  if (progress <= separationEnd) {
    const separationProgress = smootherstep(progress / separationEnd);
    return {
      x: lerp(route.start.x, route.separated.x, separationProgress),
      y: lerp(route.start.y, route.separated.y, separationProgress),
    };
  }

  const travelProgress = Math.pow(
    smoothstep((progress - separationEnd) / (1 - separationEnd)),
    0.75,
  );
  const directMidpoint = {
    x: (route.separated.x + route.end.x) / 2,
    y: (route.separated.y + route.end.y) / 2,
  };
  const curveAmount = Math.sin(Math.PI * travelProgress);

  return {
    x:
      lerp(route.separated.x, route.end.x, travelProgress) +
      (route.midpoint.x - directMidpoint.x) * curveAmount,
    y:
      lerp(route.separated.y, route.end.y, travelProgress) +
      (route.midpoint.y - directMidpoint.y) * curveAmount,
  };
};

const glyphReleaseProgress = (progress, index) => {
  const delay = index < 5 ? index * 0.006 : 0.012 + (index - 5) * 0.006;
  return clamp((progress - delay) / (1 - delay), 0, 1);
};

const stageForProgress = (progress) => {
  if (progress <= 0) return 'orbit';
  if (progress < 0.34) return 'release-early';
  if (progress < 0.68) return 'release-mid';
  return 'release-late';
};

const resetTrailSamples = (samples, positions) => {
  const now = performance.now();
  samples.forEach((sample, index) => {
    sample.x = positions[index].x;
    sample.y = positions[index].y;
    sample.time = now;
    sample.length = 0;
    sample.directionX = 0;
    sample.directionY = 0;
    sample.ready = true;
  });
};

const trailForMovement = (sample, x, y, now, scale, suppressTrail) => {
  const elapsed = clamp(now - sample.time, 1, 64);
  const deltaX = x - sample.x;
  const deltaY = y - sample.y;
  const distance = Math.hypot(deltaX, deltaY);
  const speed = distance / elapsed;

  if (distance > 0.03) {
    sample.directionX = -deltaX / distance;
    sample.directionY = -deltaY / distance;
  }

  const targetLength = suppressTrail ? 0 : clamp(speed * 10, 0, 7);
  if (targetLength > sample.length) {
    sample.length = lerp(sample.length, targetLength, 0.58);
  } else {
    sample.length *= Math.exp(-elapsed / 74);
  }

  sample.x = x;
  sample.y = y;
  sample.time = now;
  sample.ready = true;

  if (sample.length < 0.34) {
    sample.length = 0;
    return 'none';
  }

  const localLength = sample.length / Math.max(scale, 0.24);
  const strength = clamp(sample.length / 7, 0, 1);
  const nearX = sample.directionX * localLength * 0.42;
  const nearY = sample.directionY * localLength * 0.42;
  const farX = sample.directionX * localLength;
  const farY = sample.directionY * localLength;
  const nearAlpha = 0.022 + strength * 0.04;
  const farAlpha = 0.007 + strength * 0.014;

  return `${nearX.toFixed(2)}px ${nearY.toFixed(2)}px 0.35px rgba(16, 16, 16, ${nearAlpha.toFixed(3)}), ${farX.toFixed(2)}px ${farY.toFixed(2)}px 0.8px rgba(16, 16, 16, ${farAlpha.toFixed(3)})`;
};

export function createKineticEntrance(root) {
  const glyphs = [...root.querySelectorAll(GLYPH_SELECTOR)];
  const wordmark = root.querySelector(WORDMARK_SELECTOR);
  const support = root.querySelector(SUPPORT_SELECTOR);
  const statementLines = [...root.querySelectorAll(STATEMENT_SELECTOR)];
  const introduction = root.querySelector(INTRODUCTION_SELECTOR);
  const actions = [...root.querySelectorAll(ACTION_SELECTOR)];
  const navigation = root.querySelector(NAVIGATION_SELECTOR);
  const scrollCue = root.querySelector(SCROLL_CUE_SELECTOR);
  const quietRevealTargets = [introduction, ...actions, navigation, scrollCue].filter(
    Boolean,
  );

  if (glyphs.length !== GLYPH_COUNT || !wordmark || !support) {
    root.dataset.entrance = 'complete';
    root.dataset.entranceStage = 'complete';
    return { destroy() {}, release() {} };
  }

  const preparedRotation = rotationOf(wordmark);
  root.dataset.entrance = 'measuring';
  clearGlyphPresentation(glyphs);
  let finalRects = glyphs.map((glyph) => glyph.getBoundingClientRect());
  let finalCenters = finalRects.map(centerOf);
  let circle = getCircleGeometry(finalRects);
  const orbitAngles = getOrbitAngles();
  const orbitRotations = getOrbitRotations(orbitAngles);
  const state = { progress: 0, rotation: preparedRotation };
  const samples = finalCenters.map(() => ({
    x: 0,
    y: 0,
    time: performance.now(),
    length: 0,
    directionX: 0,
    directionY: 0,
    ready: false,
  }));
  const currentPositions = finalCenters.map(() => ({ x: 0, y: 0 }));
  const currentCenters = finalCenters.map(({ x, y }) => ({ x, y }));
  const currentScales = [...circle.scales];
  let timeline;
  let resizeFrame = 0;
  let releaseRequested = false;
  let complete = false;
  let mode = 'orbit';
  let lastTickTime = performance.now();
  let settleStartedAt = 0;
  let releaseStartedAt = 0;
  let settleRotations = orbitRotations.map(() => 0);
  let releaseRoutes = [];

  root.dataset.controllerStartedAt = performance.now().toFixed(1);
  root.dataset.preparedRotation = preparedRotation.toFixed(2);

  const finish = () => {
    if (complete) return;
    complete = true;
    mode = 'complete';
    gsap.ticker.remove(tick);
    const completedAt = performance.now();
    root.dataset.entrance = 'complete';
    root.dataset.entranceStage = 'complete';
    root.dataset.entranceProgress = '1.000';
    root.dataset.motionReady = 'true';
    root.dataset.entranceCompletedAt = completedAt.toFixed(1);
    if (releaseStartedAt > 0) {
      root.dataset.releaseElapsedMs = (completedAt - releaseStartedAt).toFixed(1);
    }
    if (settleStartedAt > 0) {
      root.dataset.heroSettleMs = (completedAt - settleStartedAt).toFixed(1);
    }
    clearGlyphPresentation(glyphs);
    gsap.set([support, ...statementLines, ...quietRevealTargets], {
      clearProps: 'opacity,visibility,transform,willChange',
    });
    root.dispatchEvent(new CustomEvent('kinetic:entrance-complete'));
  };

  const render = ({ suppressTrails = false } = {}) => {
    const now = performance.now();
    const progress = clamp(state.progress, 0, 1);

    root.dataset.entranceStage = stageForProgress(progress);
    root.dataset.entranceProgress = progress.toFixed(3);

    glyphs.forEach((glyph, index) => {
      const glyphProgress = glyphReleaseProgress(progress, index);
      const clampedGlyphProgress = clamp(glyphProgress, 0, 1);
      const glyphScaleProgress = smootherstep(clampedGlyphProgress);
      const glyphRotationProgress = 1 - Math.pow(1 - clampedGlyphProgress, 3);
      const orbitAngle = orbitAngles[index] + state.rotation;
      const angle = orbitAngle * (Math.PI / 180);
      const orbitCenter = {
        x: circle.center.x + Math.cos(angle) * circle.radius,
        y: circle.center.y + Math.sin(angle) * circle.radius,
      };
      const route = releaseRoutes[index];
      const animatedCenter = route
        ? pointOnReleaseRoute(route, clampedGlyphProgress)
        : orbitCenter;
      const x = animatedCenter.x - finalCenters[index].x;
      const y = animatedCenter.y - finalCenters[index].y;
      const scale = lerp(circle.scales[index], 1, glyphScaleProgress);
      const liveRotation = orbitRotations[index] + state.rotation;
      const rotation = lerp(liveRotation, settleRotations[index], glyphRotationProgress);
      const sample = samples[index];

      currentPositions[index] = { x, y };
      currentCenters[index] = {
        x: finalCenters[index].x + x,
        y: finalCenters[index].y + y,
      };
      currentScales[index] = scale;

      gsap.set(glyph, {
        x,
        y,
        scale,
        rotation,
        force3D: true,
        textShadow: sample.ready
          ? trailForMovement(sample, x, y, now, scale, suppressTrails)
          : 'none',
      });

      if (!sample.ready) {
        sample.x = x;
        sample.y = y;
        sample.time = now;
        sample.ready = true;
      }
    });
  };

  function tick() {
    if (complete) return;
    const now = performance.now();
    const elapsed = clamp(now - lastTickTime, 0, 64);
    lastTickTime = now;

    if (mode === 'orbit') {
      state.rotation += elapsed * KINETIC_TIMING.orbitDegreesPerMillisecond;
    }

    if (mode === 'orbit' || mode === 'release' || mode === 'settling') {
      render();
    }

    if (mode === 'settling') {
      const trailsAtRest = samples.every((sample) => sample.length === 0);
      if (trailsAtRest || now - settleStartedAt > 260) finish();
    }
  }

  const remeasure = () => {
    const preservedRotation = state.rotation;
    gsap.set(glyphs, { clearProps: 'transform' });
    finalRects = glyphs.map((glyph) => glyph.getBoundingClientRect());
    finalCenters = finalRects.map(centerOf);
    circle = getCircleGeometry(finalRects);
    state.rotation = preservedRotation;
    render({ suppressTrails: true });
    resetTrailSamples(samples, currentPositions);
  };

  const release = () => {
    if (complete || releaseRequested) return;
    releaseRequested = true;
    remeasure();
    mode = 'release';
    releaseStartedAt = performance.now();
    root.dataset.releaseStartedAt = releaseStartedAt.toFixed(1);
    root.dataset.rotationAtRelease = state.rotation.toFixed(2);
    root.dataset.orbitTravelDegrees = (state.rotation - preparedRotation).toFixed(2);
    releaseRoutes = buildReleaseRoutes({
      circle,
      finalCenters,
      orbitAngles,
      rotation: state.rotation,
    });
    const releaseEndRotation = state.rotation + KINETIC_TIMING.releaseRotationDegrees;
    settleRotations = orbitRotations.map(
      (rotation) => Math.round((rotation + state.rotation) / 360) * 360,
    );

    timeline = gsap.timeline({
      onComplete: () => {
        mode = 'settling';
        settleStartedAt = performance.now();
      },
    });
    timeline.to(
      state,
      {
        progress: 1,
        duration: KINETIC_TIMING.releaseDurationSeconds,
        ease: 'sine.inOut',
      },
      KINETIC_TIMING.releaseLeadInSeconds,
    );
    timeline.to(
      state,
      {
        rotation: releaseEndRotation,
        duration: KINETIC_TIMING.releaseDurationSeconds,
        ease: 'power2.out',
      },
      KINETIC_TIMING.releaseLeadInSeconds,
    );
    timeline.addLabel('editorialReveal', 1.62);
    timeline.to(
      statementLines,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.56,
        stagger: 0.065,
        ease: 'power3.out',
      },
      'editorialReveal',
    );
    if (introduction) {
      timeline.to(
        introduction,
        { autoAlpha: 1, y: 0, duration: 0.44, ease: 'power2.out' },
        'editorialReveal+=0.22',
      );
    }
    if (actions.length > 0) {
      timeline.to(
        actions,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.055,
          ease: 'power2.out',
        },
        'editorialReveal+=0.34',
      );
    }
    if (navigation) {
      timeline.to(
        navigation,
        { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        'editorialReveal+=0.08',
      );
    }
    if (scrollCue) {
      timeline.to(
        scrollCue,
        { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        'editorialReveal+=0.42',
      );
    }
  };

  const settleAfterResize = () => {
    if (complete) return;

    const preservedCenters = currentCenters.map(({ x, y }) => ({ x, y }));
    const preservedScales = [...currentScales];
    timeline?.kill();
    gsap.set(glyphs, { clearProps: 'transform' });

    const resizedRects = glyphs.map((glyph) => glyph.getBoundingClientRect());
    const resizedCenters = resizedRects.map(centerOf);
    const viewportMargin = 24;
    const reflow = { progress: 0 };
    const starts = preservedCenters.map((point, index) => ({
      x:
        clamp(point.x, viewportMargin, window.innerWidth - viewportMargin) -
        resizedCenters[index].x,
      y:
        clamp(point.y, viewportMargin, window.innerHeight - viewportMargin) -
        resizedCenters[index].y,
      scale: preservedScales[index],
    }));

    finalRects = resizedRects;
    finalCenters = resizedCenters;
    circle = getCircleGeometry(resizedRects);
    state.progress = 1;
    releaseRequested = true;
    mode = 'resize';
    root.dataset.entranceStage = 'release-late';
    root.dataset.entranceProgress = '0.850';
    resetTrailSamples(samples, starts);

    timeline = gsap.timeline({
      onComplete: () => {
        mode = 'settling';
        settleStartedAt = performance.now();
      },
    });
    timeline.to(reflow, {
      progress: 1,
      duration: 0.78,
      ease: 'power3.out',
      onUpdate: () => {
        const progress = reflow.progress;
        const now = performance.now();
        glyphs.forEach((glyph, index) => {
          const x = starts[index].x * (1 - progress);
          const y = starts[index].y * (1 - progress);
          const scale = lerp(starts[index].scale, 1, progress);
          const sample = samples[index];

          currentPositions[index] = { x, y };
          currentCenters[index] = {
            x: resizedCenters[index].x + x,
            y: resizedCenters[index].y + y,
          };
          currentScales[index] = scale;
          gsap.set(glyph, {
            x,
            y,
            scale,
            rotation: 0,
            force3D: true,
            textShadow: trailForMovement(sample, x, y, now, scale, false),
          });
        });
      },
    });
    timeline.to(
      statementLines,
      { autoAlpha: 1, yPercent: 0, duration: 0.42, stagger: 0.04, ease: 'power2.out' },
      0,
    );
    timeline.to(
      [introduction, ...actions, navigation, scrollCue].filter(Boolean),
      { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.035, ease: 'power2.out' },
      0.1,
    );
  };

  const onResize = () => {
    if (complete) return;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      if (mode === 'orbit') {
        remeasure();
        return;
      }
      settleAfterResize();
    });
  };

  const onVisibilityChange = () => {
    if (!document.hidden || complete) return;
    timeline?.kill();
    finish();
  };

  root.dataset.entrance = 'running';
  root.dataset.entranceStage = 'orbit';
  root.dataset.entranceProgress = '0.000';
  gsap.set(glyphs, {
    transformOrigin: '50% 50%',
    willChange: 'transform,text-shadow',
  });
  gsap.set(support, { autoAlpha: 1 });
  gsap.set(statementLines, {
    autoAlpha: 0,
    yPercent: 108,
    willChange: 'transform,opacity',
  });
  gsap.set([introduction, ...actions].filter(Boolean), {
    autoAlpha: 0,
    y: 10,
    willChange: 'transform,opacity',
  });
  gsap.set([navigation].filter(Boolean), {
    autoAlpha: 0,
    y: -6,
    willChange: 'transform,opacity',
  });
  gsap.set([scrollCue].filter(Boolean), {
    autoAlpha: 0,
    y: 8,
    willChange: 'transform,opacity',
  });
  render({ suppressTrails: true });
  resetTrailSamples(samples, currentPositions);
  lastTickTime = performance.now();
  gsap.ticker.add(tick);

  window.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    release,
    remeasure() {
      if (!complete) remeasure();
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.cancelAnimationFrame(resizeFrame);
      timeline?.kill();
      gsap.ticker.remove(tick);
      clearGlyphPresentation(glyphs);
      gsap.set([support, ...statementLines, ...quietRevealTargets], {
        clearProps: 'opacity,visibility,transform,willChange',
      });
      root.dataset.entrance = 'preparing';
      root.dataset.entranceStage = 'orbit';
      root.dataset.entranceProgress = '0.000';
      delete root.dataset.motionReady;
    },
  };
}

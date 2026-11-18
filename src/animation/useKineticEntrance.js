import { useLayoutEffect } from 'react';

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const FONT_READINESS_TIMEOUT = 4000;

const getLoaderStartTime = () => {
  const now = performance.now();
  const recorded = Number(window.__kineticLoaderStartedAt);
  return Number.isFinite(recorded) && now - recorded < 5000 ? recorded : now;
};

const waitForMinimumPresentation = (startedAt, duration) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, startedAt + duration - performance.now()));
  });

const waitForDisplayFont = async () => {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(() => resolve('timeout'), FONT_READINESS_TIMEOUT);
  });
  const font = (async () => {
    try {
      await document.fonts.load('400 1em "League Gothic"');
      await document.fonts.ready;
      return document.fonts.check('400 1em "League Gothic"') ? 'loaded' : 'fallback';
    } catch {
      return 'fallback';
    }
  })();
  const status = await Promise.race([font, timeout]);
  window.clearTimeout(timeoutId);
  return status;
};

export function useKineticEntrance(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const loaderStartedAt = getLoaderStartTime();
    const minimumLoaderDuration = Number(root.dataset.loaderMinimumMs) || 0;
    let controller;
    let disposed = false;

    root.dataset.loaderStartedAt = loaderStartedAt.toFixed(1);

    const settleImmediately = ({ reduced = false } = {}) => {
      controller?.destroy();
      controller = undefined;
      root.dataset.entrance = 'complete';
      root.dataset.entranceStage = 'complete';
      root.dataset.entranceProgress = '1.000';
      root.dataset.motionReady = 'true';
      root.dataset.reducedMotion = String(reduced);
    };

    const start = async () => {
      if (reducedMotion.matches) {
        root.dataset.fontStatus = 'skipped';
        settleImmediately({ reduced: true });
        return;
      }

      root.dataset.reducedMotion = 'false';
      const entranceModule = import('./kineticEntrance.js');
      const fontReadiness = waitForDisplayFont();
      const minimumPresentation = waitForMinimumPresentation(
        loaderStartedAt,
        minimumLoaderDuration,
      );
      const { createKineticEntrance } = await entranceModule;
      if (disposed || reducedMotion.matches) return;

      controller = createKineticEntrance(root);
      const fontStatus = await fontReadiness;
      root.dataset.fontStatus = fontStatus;
      root.dataset.fontReady = String(fontStatus === 'loaded');

      if (fontStatus === 'loaded') controller.remeasure();
      await nextFrame();
      await nextFrame();
      if (disposed || reducedMotion.matches) return;

      if (fontStatus !== 'loaded') {
        settleImmediately();
        return;
      }

      controller.remeasure();
      await minimumPresentation;
      if (disposed || reducedMotion.matches) return;

      root.dataset.loaderVisibleMs = (performance.now() - loaderStartedAt).toFixed(1);
      controller.release();
    };

    const onReducedMotionChange = (event) => {
      if (event.matches) settleImmediately({ reduced: true });
    };

    reducedMotion.addEventListener('change', onReducedMotionChange);
    void start();

    return () => {
      disposed = true;
      reducedMotion.removeEventListener('change', onReducedMotionChange);
      controller?.destroy();
    };
  }, [rootRef]);
}

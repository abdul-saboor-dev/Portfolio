import { gsap } from './gsap.js';

export const EDUCATION_INTRO_END = 0.28;
export const EDUCATION_CAROUSEL_START = 0.32;
export const EDUCATION_CAROUSEL_END = 0.88;
export const EDUCATION_ACTIVE_THRESHOLD = 0.14;

const clamp = gsap.utils.clamp;

const visibleViewportHeight = () =>
  window.__kineticViewport?.read?.().height ??
  window.visualViewport?.height ??
  window.innerHeight;

export const getEducationScrollDistance = (recordCount) => {
  if (recordCount < 1) return 0;

  const compact = window.matchMedia('(max-width: 600px)').matches;
  const landscape = window.matchMedia(
    '(max-height: 540px) and (orientation: landscape)',
  ).matches;
  const perTransition = compact ? 0.82 : landscape ? 0.65 : 0.75;
  const framing = compact ? 1.2 : landscape ? 1 : 1.15;

  return Math.round(
    visibleViewportHeight() * (framing + Math.max(0, recordCount - 1) * perTransition),
  );
};

export function createEducationSequence({ aboutContent, root }) {
  const stage = root.querySelector('.education-stage');
  const content = stage?.querySelector('.education-stage__content');
  const track = stage?.querySelector('[data-education-track]');

  if (!stage || !content || !track) {
    return {
      available: false,
      applyReduced() {},
      destroy() {},
      getRecordCount: () => 0,
      getScrollDistance: () => 0,
      rebuild() {},
      resetBoundary() {},
      setProgress() {},
    };
  }

  const timeline = gsap.timeline({ paused: true });
  const hold = { progress: 0 };
  let records = [];
  let travel = 0;

  const measure = () => {
    records = [...track.querySelectorAll('[data-education-record]')];
    const first = records[0];
    const last = records.at(-1);
    travel = first && last ? Math.max(0, last.offsetLeft - first.offsetLeft) : 0;
    stage.dataset.recordCount = records.length.toString();
    stage.dataset.horizontalTravel = travel.toFixed(2);
    return { records, travel };
  };

  const syncState = (progress) => {
    const carouselProgress = clamp(
      0,
      1,
      (progress - EDUCATION_CAROUSEL_START) /
        (EDUCATION_CAROUSEL_END - EDUCATION_CAROUSEL_START),
    );
    const currentRecord = Math.min(
      Math.max(records.length - 1, 0),
      Math.round(carouselProgress * Math.max(records.length - 1, 0)),
    );

    stage.dataset.educationProgress = progress.toFixed(3);
    stage.dataset.carouselProgress = carouselProgress.toFixed(3);
    stage.dataset.currentRecord = currentRecord.toString();
    stage.dataset.educationState =
      progress <= 0.001
        ? 'pending'
        : progress < EDUCATION_INTRO_END
          ? 'emerging'
          : progress < EDUCATION_CAROUSEL_END
            ? 'exploring'
            : 'complete';
    root.dataset.educationProgress = progress.toFixed(3);
    root.dataset.educationState = stage.dataset.educationState;
  };

  const applyInitialBoundary = () => {
    gsap.set(stage, { autoAlpha: 0 });
    gsap.set(content, { clipPath: 'inset(0 100% 0 0)' });
    gsap.set(track, { x: 0 });
  };

  const rebuild = () => {
    timeline.clear();
    measure();
    hold.progress = 0;

    timeline
      .set(content, { clipPath: 'inset(0 100% 0 0)' }, 0)
      .set(track, { x: 0 }, 0)
      .fromTo(
        aboutContent,
        { clipPath: 'inset(0 0 0 0)' },
        {
          clipPath: 'inset(0 0 0 100%)',
          duration: EDUCATION_INTRO_END,
          ease: 'power2.inOut',
          immediateRender: false,
        },
        0,
      )
      .to(
        content,
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: EDUCATION_INTRO_END,
          ease: 'power2.inOut',
        },
        0.015,
      )
      .to(
        track,
        {
          duration: EDUCATION_CAROUSEL_END - EDUCATION_CAROUSEL_START,
          ease: 'none',
          x: () => -travel,
        },
        EDUCATION_CAROUSEL_START,
      )
      .to(
        hold,
        { progress: 1, duration: 1 - EDUCATION_CAROUSEL_END },
        EDUCATION_CAROUSEL_END,
      );

    timeline.progress(0, true);
    applyInitialBoundary();
    syncState(0);
  };

  const setProgress = (value) => {
    const progress = clamp(0, 1, value);
    timeline.progress(progress, true);
    gsap.set(stage, { autoAlpha: progress > 0.0001 ? 1 : 0 });
    syncState(progress);
  };

  const resetBoundary = () => {
    gsap.set(stage, { autoAlpha: 0 });
    syncState(0);
  };

  const applyReduced = () => {
    measure();
    stage.setAttribute('aria-hidden', 'false');
    stage.inert = false;
    gsap.set(stage, { autoAlpha: 1 });
    gsap.set(content, { clearProps: 'clipPath' });
    gsap.set(track, { clearProps: 'transform' });
    stage.dataset.educationProgress = '1.000';
    stage.dataset.carouselProgress = '1.000';
    stage.dataset.currentRecord = '0';
    stage.dataset.educationState = 'reduced';
    root.dataset.educationProgress = '1.000';
    root.dataset.educationState = 'reduced';
  };

  rebuild();

  return {
    available: true,
    applyReduced,
    destroy() {
      timeline.kill();
      gsap.set(stage, { clearProps: 'opacity,visibility' });
      gsap.set(content, { clearProps: 'clipPath' });
      gsap.set(track, { clearProps: 'transform' });
      stage.setAttribute('aria-hidden', 'true');
      stage.inert = true;
      delete root.dataset.educationProgress;
      delete root.dataset.educationState;
    },
    getRecordCount: () => records.length,
    getScrollDistance: () => getEducationScrollDistance(records.length),
    rebuild,
    resetBoundary,
    setProgress,
  };
}

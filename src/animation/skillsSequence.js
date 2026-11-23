import { gsap } from './gsap.js';

export const SKILLS_INTRO_END = 0.24;
export const SKILLS_FORMATION_START = 0.2;
export const SKILLS_FORMATION_END = 0.84;
export const SKILLS_CODE_START = 0.78;
export const SKILLS_ACTIVE_THRESHOLD = 0.12;

const clamp = gsap.utils.clamp;
const visibleViewportHeight = () =>
  window.__kineticViewport?.read?.().height ??
  window.visualViewport?.height ??
  window.innerHeight;

export const getSkillsScrollDistance = (skillCount) => {
  if (skillCount < 1) return 0;
  const compact = window.matchMedia('(max-width: 600px)').matches;
  const landscape = window.matchMedia(
    '(max-height: 540px) and (orientation: landscape)',
  ).matches;
  const density = Math.min(0.5, Math.max(0, skillCount - 12) * 0.025);
  return Math.round(
    visibleViewportHeight() * ((compact ? 2.1 : landscape ? 1.7 : 1.9) + density),
  );
};

export function createSkillsSequence({ educationStage, root }) {
  const stage = root.querySelector('.skills-stage');
  const content = stage?.querySelector('.skills-stage__content');
  const heading = stage?.querySelector('.skills-stage__header');
  let items = [...(stage?.querySelectorAll('[data-skill-index]') ?? [])];
  const code = stage?.querySelector('[data-skills-code]');
  const educationContent = educationStage?.querySelector('.education-stage__content');

  if (!stage || !content || !heading || !code || !educationStage || !educationContent) {
    return {
      applyReduced() {},
      destroy() {},
      getItemCount: () => 0,
      getScrollDistance: () => 0,
      rebuild() {},
      resetBoundary() {},
      setProgress() {},
    };
  }

  const timeline = gsap.timeline({ paused: true });
  let accessible = false;

  const syncAccessibility = (progress) => {
    const nextAccessible = progress > 0.03;
    if (accessible === nextAccessible) return;
    accessible = nextAccessible;
    stage.setAttribute('aria-hidden', String(!nextAccessible));
    stage.inert = !nextAccessible;
    educationStage.setAttribute('aria-hidden', String(nextAccessible));
    educationStage.inert = nextAccessible;
  };

  const syncState = (progress) => {
    stage.dataset.skillsProgress = progress.toFixed(3);
    stage.dataset.itemCount = items.length.toString();
    stage.dataset.skillsState =
      progress <= 0.001
        ? 'pending'
        : progress < SKILLS_INTRO_END
          ? 'emerging'
          : progress < SKILLS_FORMATION_END
            ? 'forming'
            : 'complete';
    root.dataset.skillsProgress = progress.toFixed(3);
    root.dataset.skillsState = stage.dataset.skillsState;
  };

  const rebuild = () => {
    timeline.clear();
    items = [...stage.querySelectorAll('[data-skill-index]')];
    const stageRect = stage.getBoundingClientRect();
    const itemRects = items.map((item) => item.getBoundingClientRect());
    const widestRow = Math.max(
      1,
      ...[...stage.querySelectorAll('.skills-stage__row')].map(
        (row) => row.children.length,
      ),
    );
    timeline
      .set(stage, { autoAlpha: 1 }, 0)
      .set(content, { clipPath: 'inset(0 0 100% 0)' }, 0)
      .set(items, { autoAlpha: 0 }, 0)
      .set(code, { autoAlpha: 0 }, 0)
      .fromTo(
        educationContent,
        { clipPath: 'inset(0 0 0 0)', xPercent: 0 },
        {
          clipPath: 'inset(0 50% 0 50%)',
          xPercent: -5,
          duration: SKILLS_INTRO_END,
          ease: 'power2.inOut',
          immediateRender: false,
        },
        0,
      )
      .to(
        content,
        { clipPath: 'inset(0 0 0% 0)', duration: SKILLS_INTRO_END, ease: 'power2.inOut' },
        0.01,
      )
      .fromTo(
        heading,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.16,
          ease: 'power2.out',
          immediateRender: false,
        },
        0.1,
      );

    items.forEach((item, index) => {
      const row = Number(item.dataset.skillRow || 0);
      const column = Number(item.dataset.skillColumn || 0);
      const rowItems = item.parentElement?.children.length || 1;
      const centerOffset = column - (rowItems - 1) / 2;
      const flowColumn = index % widestRow;
      const flowBand = Math.floor(index / widestRow);
      const rect = itemRects[index];
      const flowX = stageRect.left + stageRect.width * ((flowColumn + 0.5) / widestRow);
      const flowY = stageRect.top - rect.height * (0.55 + flowBand * 0.62);
      const fanX =
        stageRect.left +
        stageRect.width * (0.14 + (flowColumn / Math.max(widestRow - 1, 1)) * 0.72);
      const fanY = stageRect.top + stageRect.height * (0.3 + flowBand * 0.15);
      const enterStart = SKILLS_FORMATION_START + index * 0.008;
      const fanEnd = 0.44 + index * 0.006;
      const settleStart = fanEnd - 0.025;
      timeline
        .fromTo(
          item,
          {
            autoAlpha: 0,
            rotation: centerOffset * 7 + (row % 2 ? -5 : 5),
            scale: 0.74,
            transformOrigin: '50% 50%',
            x: flowX - (rect.left + rect.width / 2),
            y: flowY - (rect.top + rect.height / 2),
          },
          {
            autoAlpha: 1,
            rotation: centerOffset * 3.5,
            scale: 0.88,
            x: fanX - (rect.left + rect.width / 2),
            y: fanY - (rect.top + rect.height / 2),
            duration: fanEnd - enterStart,
            ease: 'power1.inOut',
            immediateRender: false,
          },
          enterStart,
        )
        .to(
          item,
          {
            rotation: 0,
            scale: 1,
            x: 0,
            y: 0,
            duration: SKILLS_FORMATION_END - settleStart,
            ease: 'power2.out',
          },
          settleStart,
        );
    });

    timeline
      .fromTo(
        code,
        { autoAlpha: 0, scale: 0.78, y: 88 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.12,
          ease: 'power2.out',
          immediateRender: false,
        },
        SKILLS_CODE_START,
      )
      .to({}, { duration: 1 - SKILLS_FORMATION_END }, SKILLS_FORMATION_END);
    timeline.progress(0, true);
    syncState(0);
  };

  const setProgress = (value) => {
    const progress = clamp(0, 1, value);
    timeline.progress(progress, true);
    syncAccessibility(progress);
    syncState(progress);
  };

  const resetBoundary = () => {
    timeline.progress(0, true);
    if (accessible) {
      accessible = false;
      educationStage.setAttribute('aria-hidden', 'false');
      educationStage.inert = false;
      stage.setAttribute('aria-hidden', 'true');
      stage.inert = true;
    }
    syncState(0);
  };

  const applyReduced = () => {
    accessible = true;
    stage.setAttribute('aria-hidden', 'false');
    stage.inert = false;
    educationStage.setAttribute('aria-hidden', 'false');
    educationStage.inert = false;
    gsap.set([stage, heading, items, code], { clearProps: 'all' });
    stage.dataset.skillsProgress = '1.000';
    stage.dataset.itemCount = items.length.toString();
    stage.dataset.skillsState = 'reduced';
    root.dataset.skillsProgress = '1.000';
    root.dataset.skillsState = 'reduced';
  };

  rebuild();
  return {
    applyReduced,
    destroy() {
      timeline.kill();
      gsap.set([stage, content, heading, items, code, educationContent], {
        clearProps: 'all',
      });
      stage.setAttribute('aria-hidden', 'true');
      stage.inert = true;
      delete root.dataset.skillsProgress;
      delete root.dataset.skillsState;
    },
    getItemCount: () => items.length,
    getScrollDistance: () => getSkillsScrollDistance(items.length),
    rebuild,
    resetBoundary,
    setProgress,
  };
}

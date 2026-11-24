import { gsap } from './gsap.js';

export const SKILLS_INTRO_END = 0.3;
export const SKILLS_FORMATION_START = 0.26;
export const SKILLS_FORMATION_END = 0.84;
export const SKILLS_ACTIVE_THRESHOLD = 0.16;

const EDUCATION_CLEAR_END = 0.22;

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
  const copy = stage?.querySelector('[data-skills-copy]');
  const formation = stage?.querySelector('[data-skills-formation]');
  let items = [...(stage?.querySelectorAll('[data-skill-index]') ?? [])];
  const educationContent = educationStage?.querySelector('.education-stage__content');

  if (
    !stage ||
    !content ||
    !heading ||
    !copy ||
    !formation ||
    !educationStage ||
    !educationContent
  ) {
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

  const applyInitialBoundary = () => {
    gsap.set(stage, { autoAlpha: 0 });
    gsap.set(content, { clipPath: 'none' });
    gsap.set(heading, { autoAlpha: 0, y: 16 });
    gsap.set(copy, { autoAlpha: 0, y: 22 });
    gsap.set(items, { autoAlpha: 0 });
  };

  const rebuild = () => {
    timeline.clear();
    items = [...stage.querySelectorAll('[data-skill-index]')];

    // Refreshes can occur while the paused sequence is between states. Always
    // measure the CSS destinations, never rectangles carrying an older GSAP transform.
    gsap.set([heading, copy, items], {
      clearProps: 'opacity,transform,visibility',
    });
    gsap.set(content, { clearProps: 'clipPath' });

    const stageRect = stage.getBoundingClientRect();
    const formationRect = formation.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    const itemRects = items.map((item) => item.getBoundingClientRect());
    const rows = [...stage.querySelectorAll('.skills-stage__row')];
    const rowCount = Math.max(1, rows.length);
    const compact = window.matchMedia('(max-width: 600px)').matches;
    const landscape = window.matchMedia(
      '(max-height: 540px) and (orientation: landscape)',
    ).matches;
    const stacked = window.matchMedia('(max-width: 960px)').matches && !landscape;
    const desiredFanSpread = 1.125;
    const rectByItem = new Map(items.map((item, index) => [item, itemRects[index]]));
    const safeEdge = compact ? 4 : 12;
    const safeLeft = stacked
      ? Math.max(stageRect.left, formationRect.left) + safeEdge
      : Math.max(stageRect.left + safeEdge, copyRect.right + 24);
    const safeRight = stageRect.right - safeEdge;
    const availableWidth = safeRight - safeLeft;
    const fanRows = new Map();

    rows.forEach((rowElement, rowIndex) => {
      const rowItems = [...rowElement.children];
      const center = (rowItems.length - 1) / 2;
      const boundsFor = (spread) => ({
        left: Math.min(
          ...rowItems.map((item, column) => {
            const rect = rectByItem.get(item);
            return rect.left + (column - center) * rect.width * spread;
          }),
        ),
        right: Math.max(
          ...rowItems.map((item, column) => {
            const rect = rectByItem.get(item);
            return rect.right + (column - center) * rect.width * spread;
          }),
        ),
      });
      const baseBounds = boundsFor(0);
      let spread = desiredFanSpread;
      let fanBounds = boundsFor(spread);
      const baseWidth = baseBounds.right - baseBounds.left;
      const expandedWidth = fanBounds.right - fanBounds.left;

      if (expandedWidth > availableWidth && expandedWidth > baseWidth) {
        spread *= clamp(0, 1, (availableWidth - baseWidth) / (expandedWidth - baseWidth));
        fanBounds = boundsFor(spread);
      }

      let shift = fanBounds.left < safeLeft ? safeLeft - fanBounds.left : 0;
      if (fanBounds.right + shift > safeRight) {
        shift += safeRight - (fanBounds.right + shift);
      }
      fanRows.set(rowIndex, { shift, spread });
    });

    timeline
      .set(content, { clipPath: 'none' }, 0)
      .set(heading, { autoAlpha: 0, y: 16 }, 0)
      .set(copy, { autoAlpha: 0, y: 22 }, 0)
      .set(items, { autoAlpha: 0 }, 0)
      .fromTo(
        educationContent,
        { clipPath: 'inset(0 0 0 0)', xPercent: 0 },
        {
          clipPath: 'inset(0 50% 0 50%)',
          xPercent: -5,
          duration: EDUCATION_CLEAR_END,
          ease: 'power2.inOut',
          immediateRender: false,
        },
        0,
      )
      .to(
        heading,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.13,
          ease: 'power2.out',
        },
        0.16,
      )
      .to(
        copy,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.17,
          ease: 'power2.out',
        },
        0.18,
      );

    items.forEach((item, index) => {
      const row = Number(item.dataset.skillRow || 0);
      const column = Number(item.dataset.skillColumn || 0);
      const rowItems = item.parentElement?.children.length || 1;
      const signedDistance = column - (rowItems - 1) / 2;
      const rowRatio = rowCount > 1 ? row / (rowCount - 1) : 0;
      const rect = itemRects[index];
      const fanRow = fanRows.get(row) ?? { shift: 0, spread: desiredFanSpread };
      const fanLift = 0.25;
      const fanRotation = 50;
      const enterStart = SKILLS_FORMATION_START + rowRatio * 0.1;
      const settleEnd = 0.75 + rowRatio * 0.045;
      const fanX = signedDistance * rect.width * fanRow.spread + fanRow.shift;
      const fanY = -Math.abs(signedDistance) * rect.height * fanLift;
      const fanScale = 0.75;

      item.dataset.fanStart = enterStart.toFixed(3);
      item.dataset.fanEnd = settleEnd.toFixed(3);

      timeline
        .fromTo(
          item,
          {
            rotation: signedDistance * fanRotation,
            scale: fanScale,
            transformOrigin: '50% 50%',
            x: fanX,
            y: fanY,
          },
          {
            rotation: 0,
            scale: 1,
            x: 0,
            y: 0,
            duration: settleEnd - enterStart,
            ease: 'power2.inOut',
            immediateRender: false,
          },
          enterStart,
        )
        .to(
          item,
          {
            autoAlpha: 1,
            duration: 0.09,
            ease: 'power1.out',
          },
          enterStart,
        );
    });

    timeline.to({}, { duration: 1 - SKILLS_FORMATION_END }, SKILLS_FORMATION_END);
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
    stage.setAttribute('aria-hidden', 'false');
    stage.inert = false;
    gsap.set([stage, heading, copy, items], { clearProps: 'all' });
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
      gsap.set([stage, content, heading, copy, items, educationContent], {
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

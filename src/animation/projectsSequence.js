import { gsap } from './gsap.js';

const clamp = gsap.utils.clamp;
const smooth = (value) => {
  const t = clamp(0, 1, value);
  return t * t * (3 - 2 * t);
};

/* Signed distance is the sole source of card transforms on both sides. */
export function perspectiveCard(relative, fieldWidth, fieldHeight, direction = 1) {
  const distance = Math.abs(relative);
  const side = Math.sign(relative) * direction;
  const mobile = fieldWidth < 620;
  // Open a clear passage at half progress, then settle into a compact side stack.
  // The same curve serves passed and upcoming cards, so neither crosses the other.
  const spread = Math.min(fieldWidth * (mobile ? 0.31 : 0.37), mobile ? 115 : 285);
  const lateral = Math.tanh(distance * 3) / Math.tanh(3);
  const baseTilt = -direction * 6;
  return {
    x: side * spread * lateral,
    y: distance * fieldHeight * (mobile ? 0.025 : 0.035),
    z: -distance * (mobile ? 170 : 260),
    rotationY: baseTilt + side * Math.min(40, distance * 17),
    rotationZ: -direction * 0.8 + side * Math.min(5, distance * 1.8),
    scale: Math.max(mobile ? 0.36 : 0.42, 1 - distance * (mobile ? 0.7 : 0.22)),
    opacity: Math.max(0, 1 - distance * 0.34),
    visible: distance < 2.95,
  };
}

export function createProjectsSequence(root) {
  const scene = root.querySelector('.projects');
  const skills = root.querySelector('.skills-stage');
  const skillsCopy = skills?.querySelector('.skills-stage__copy');
  const skillsHeader = skills?.querySelector('.skills-stage__header');
  const icons = [...(skills?.querySelectorAll('[data-skill-index]') ?? [])];
  const build = scene?.querySelector('.projects__chapter--build');
  const design = scene?.querySelector('.projects__chapter--design');
  const cards = [...(scene?.querySelectorAll('[data-project-card]') ?? [])];
  const arts = [...(scene?.querySelectorAll('[data-artwork]') ?? [])];
  const buildDetails = [...(scene?.querySelectorAll('[data-project-detail]') ?? [])];
  const artDetails = [...(scene?.querySelectorAll('[data-art-detail]') ?? [])];
  const buildField = scene?.querySelector('.projects__field--build');
  const artField = scene?.querySelector('.projects__field--design');
  const indicator = scene?.querySelector('.projects__indicator');
  const developmentLabel = indicator?.querySelector(
    '[data-projects-discipline="development"]',
  );
  const creativeLabel = indicator?.querySelector('[data-projects-discipline="creative"]');
  const buildCount = Math.max(0, cards.length - 1);
  const artCount = Math.max(0, arts.length - 1);
  const buildStart = 0.85;
  const handoffStart = buildStart + buildCount + 0.35;
  const designStart = handoffStart + 1;
  const total = designStart + artCount + 0.8;
  let progress = 0;
  let currentBuild = -1;
  let currentArt = -1;
  let buildSize = { width: 1, height: 1 };
  let artSize = { width: 1, height: 1 };
  if (!scene || !skills || !build || !design || !cards.length || !arts.length)
    return {
      setProgress() {},
      resetBoundary() {},
      applyReduced() {},
      destroy() {},
      getDistance: () => 0,
      getAnchor: () => 0,
      total: 1,
    };

  const measureFields = () => {
    buildSize = { width: buildField.clientWidth, height: buildField.clientHeight };
    artSize = { width: artField.clientWidth, height: artField.clientHeight };
  };
  measureFields();
  window.addEventListener('resize', measureFields);
  const controls = (kind, selected, max) => {
    const counter = scene.querySelector('[data-chapter-counter="' + kind + '"]');
    const previous = scene.querySelector('[data-chapter-previous="' + kind + '"]');
    const next = scene.querySelector('[data-chapter-next="' + kind + '"]');
    if (kind === 'build' && selected === currentBuild) return;
    if (kind === 'design' && selected === currentArt) return;
    counter.textContent =
      String(selected + 1).padStart(2, '0') + ' / ' + String(max + 1).padStart(2, '0');
    previous.disabled = selected === 0;
    next.disabled = selected === max;
    if (kind === 'build') currentBuild = selected;
    else currentArt = selected;
  };
  const details = (elements, position, reveal) => {
    elements.forEach((element, i) => {
      // The text withdraws before its neighbor arrives, while the cards keep
      // moving continuously. No two long descriptions occupy the same space.
      const opacity = reveal * smooth((0.5 - Math.abs(i - position)) * 2);
      gsap.set(element, {
        opacity,
        y: (i - position) * 14,
        visibility: opacity > 0.005 ? 'visible' : 'hidden',
      });
      element.inert = opacity < 0.7;
      element.setAttribute('aria-hidden', String(element.inert));
    });
  };
  const field = (elements, size, position, direction, reveal) => {
    elements.forEach((card, index) => {
      if (Math.abs(index - position) > 4.2) {
        if (card.style.visibility !== 'hidden') gsap.set(card, { visibility: 'hidden' });
        return;
      }
      const geometry = perspectiveCard(
        index - position,
        size.width,
        size.height,
        direction,
      );
      gsap.set(card, {
        xPercent: -50,
        yPercent: -50,
        x: geometry.x,
        y: geometry.y,
        z: geometry.z,
        rotationY: geometry.rotationY,
        rotationZ: geometry.rotationZ,
        scale: geometry.scale,
        opacity: reveal * geometry.opacity,
        visibility: geometry.visible && reveal > 0.005 ? 'visible' : 'hidden',
        force3D: true,
      });
      // Depth is resolved by the 3D field, not a rounded z-index that flips
      // abruptly when two cards exchange nearest status.
    });
  };
  const setProgress = (value) => {
    progress = clamp(0, 1, value);
    const u = progress * total;
    const exit = smooth(u / 0.76);
    const handoff = clamp(0, 1, u - handoffStart);
    const entrance = smooth((u - 0.34) / 0.46);
    const turn = smooth(handoff);
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const compactHandoff = window.innerWidth <= 600 || viewportHeight < 500;
    const chapterTravel = viewportHeight * (window.innerWidth <= 600 ? 0.3 : 0.55);
    const buildPosition = clamp(0, buildCount, u - buildStart);
    const artPosition = clamp(0, artCount, u - designStart);
    gsap.set(scene, { autoAlpha: u > 0.01 ? 1 : 0 });
    scene.dataset.projectsState =
      u < buildStart
        ? 'build-entrance'
        : u < handoffStart
          ? 'development'
          : u < designStart
            ? 'handoff'
            : 'design';
    scene.dataset.buildProgress = buildPosition.toFixed(3);
    scene.dataset.artProgress = artPosition.toFixed(3);
    scene.dataset.timelineUnits = String(total);
    scene.dataset.projectsDiscipline = handoff < 0.5 ? 'development' : 'creative';
    indicator.setAttribute(
      'aria-label',
      `Projects, ${handoff < 0.5 ? 'Development' : 'Creative'}`,
    );
    const indicatorVisibility =
      1 - smooth((handoff - 0.12) / 0.3) + smooth((handoff - 0.58) / 0.3);
    gsap.set(indicator, { opacity: entrance * indicatorVisibility });
    gsap.set(developmentLabel, {
      opacity: 1 - smooth(handoff / 0.5),
      y: -6 * handoff,
    });
    gsap.set(creativeLabel, {
      opacity: smooth((handoff - 0.5) / 0.5),
      y: 6 * (1 - handoff),
    });
    icons.forEach((icon) => {
      const col = Number(icon.dataset.skillColumn || 0);
      const siblings = icon.parentElement?.children.length || 1;
      const signed = col - (siblings - 1) / 2;
      gsap.set(icon, {
        x: signed * icon.offsetWidth * exit * 0.72,
        y:
          exit *
          ((window.visualViewport?.height || window.innerHeight) * 0.55 -
            Math.abs(signed) * icon.offsetHeight * 0.15),
        rotation: signed * exit * 24,
        scale: 1 - exit * 0.18,
        opacity: 1 - smooth(u / 0.64),
      });
    });
    gsap.set(skills, { autoAlpha: u < 0.76 ? 1 : 0 });
    gsap.set([skillsHeader, skillsCopy], {
      x: -window.innerWidth * 0.045 * exit,
      y: -18 * exit,
      opacity: 1 - smooth((u - 0.3) / 0.22),
    });
    gsap.set(build, {
      autoAlpha:
        entrance *
        (1 -
          smooth(
            (handoff - (compactHandoff ? 0.08 : 0.05)) / (compactHandoff ? 0.37 : 0.75),
          )),
      y: -chapterTravel * turn,
      z: -200 * turn,
      scale: 1 - 0.06 * turn,
      force3D: true,
    });
    gsap.set(design, {
      autoAlpha: compactHandoff
        ? smooth((handoff - 0.25) / 0.4)
        : smooth((handoff - 0.2) / 0.6),
      y: chapterTravel * (1 - turn),
      z: -200 * (1 - turn),
      scale: 0.94 + 0.06 * turn,
      force3D: true,
    });
    gsap.set(build.querySelector('.projects__editorial'), {
      x: (1 - entrance) * window.innerWidth * 0.075,
      y: (1 - entrance) * 22,
      scale: 0.96 + entrance * 0.04,
      transformOrigin: 'left center',
    });
    gsap.set(design.querySelector('.projects__editorial'), {
      x: 0,
      y: 0,
      scale: 1,
    });
    gsap.set(buildField, {
      x: (1 - entrance) * window.innerWidth * 0.2,
      y: 0,
      z: -(1 - entrance) * 220,
      scale: 1,
      rotationY: 0,
      opacity: 1,
    });
    gsap.set(artField, {
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      rotationY: 0,
    });
    build.inert = entrance < 0.7 || handoff > 0.4;
    design.inert = handoff < 0.7;
    build.setAttribute('aria-hidden', String(build.inert));
    design.setAttribute('aria-hidden', String(design.inert));
    field(cards, buildSize, buildPosition, 1, 1);
    field(arts, artSize, artPosition, -1, 1);
    details(buildDetails, buildPosition, 1);
    details(artDetails, artPosition, 1);
    controls('build', Math.round(buildPosition), buildCount);
    controls('design', Math.round(artPosition), artCount);
    scene.dataset.artIndex = String(Math.round(artPosition));
    scene.inert = u < 0.35;
    scene.setAttribute('aria-hidden', String(scene.inert));
  };
  return {
    setProgress,
    rebuild: measureFields,
    resetBoundary() {
      gsap.set(scene, { autoAlpha: 0 });
      scene.inert = true;
      scene.setAttribute('aria-hidden', 'true');
      if (progress > 0) {
        gsap.set(skills, { autoAlpha: 1 });
        gsap.set([skillsHeader, skillsCopy], { clearProps: 'x,y,opacity' });
        gsap.set(icons, { clearProps: 'x,y,rotation,scale,opacity' });
        progress = 0;
      }
    },
    applyReduced() {
      scene.inert = false;
      scene.setAttribute('aria-hidden', 'false');
      scene.querySelector('.projects__scene').inert = true;
      scene.querySelector('.projects__reduced').inert = false;
    },
    destroy() {
      window.removeEventListener('resize', measureFields);
      gsap.set(
        [
          scene,
          skills,
          skillsHeader,
          skillsCopy,
          ...icons,
          ...cards,
          ...arts,
          ...buildDetails,
          ...artDetails,
          build,
          design,
          indicator,
          developmentLabel,
          creativeLabel,
        ],
        { clearProps: 'all' },
      );
    },
    getDistance: () =>
      Math.round((window.visualViewport?.height || window.innerHeight) * total * 0.83),
    getAnchor: (destination) => {
      const u = progress * total;
      const p = clamp(0, buildCount, u - buildStart);
      if (destination === 'build') return buildStart + 0.05;
      if (destination === 'design') return designStart + 0.05;
      if (destination === 'end') return total - 0.03;
      if (destination === 'next')
        return buildStart + Math.min(buildCount, Math.floor(p + 0.18) + 1);
      if (destination === 'previous')
        return buildStart + Math.max(0, Math.ceil(p - 0.18) - 1);
      const a = clamp(0, artCount, u - designStart);
      if (destination === 'art-next')
        return designStart + Math.min(artCount, Math.floor(a + 0.18) + 1);
      if (destination === 'art-previous')
        return designStart + Math.max(0, Math.ceil(a - 0.18) - 1);
      return buildStart;
    },
    total,
  };
}

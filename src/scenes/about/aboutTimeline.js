import { gsap } from '../../animation/gsap.js';

const COLORS = {
  hero: {
    background: 'rgba(11, 10, 10, 0)',
    foreground: '#f4efe8',
    accent: '#c77b59',
    rule: '#37302b',
  },
  headline: {
    background: '#2e1915',
    foreground: '#f4e9dc',
    accent: '#da9475',
    rule: '#6d4135',
  },
  story: {
    background: '#8d513e',
    foreground: '#fff1e3',
    accent: '#221410',
    rule: '#c98268',
  },
  bridge: {
    background: '#b87860',
    foreground: '#fff1e3',
    accent: '#221410',
    rule: '#714334',
  },
  closing: {
    background: '#e7d7c4',
    foreground: '#211714',
    accent: '#9d4d34',
    rule: '#9d4d34',
  },
};

function colorVars(palette) {
  return {
    '--about-bg': palette.background,
    '--about-fg': palette.foreground,
    '--about-accent': palette.accent,
    '--about-rule': palette.rule,
  };
}

export function createAboutTimeline({ scene, conditions }) {
  const select = gsap.utils.selector(scene);
  const stage = select('.about-stage');
  const headline = select('.about-headline');
  const headlineLines = select('.about-headline__line > span');
  const stories = select('.about-story');
  const who = select('.about-story--who');
  const journey = select('.about-story--journey');
  const philosophy = select('.about-story--philosophy');
  const whoCopy = select('.about-story--who .about-story__copy');
  const journeyCopy = select('.about-story--journey .about-story__copy');
  const philosophyCopy = select('.about-story--philosophy .about-story__copy');
  const handoffRule = select('.about-rule--handoff');
  const closingRule = select('.about-rule--closing');
  const mobile = conditions.isMobile;

  gsap.set(stage, colorVars(COLORS.hero));
  gsap.set(headline, { autoAlpha: 1, transformOrigin: 'left top' });
  gsap.set(headlineLines, {
    autoAlpha: 0,
    yPercent: 110,
    scale: 1.04,
    transformOrigin: 'left bottom',
  });
  gsap.set(stories, { autoAlpha: 0, transformOrigin: 'left top' });
  gsap.set(who, { xPercent: mobile ? 8 : 12, yPercent: 8, scale: 1.025 });
  gsap.set(journey, { xPercent: mobile ? -8 : -10, yPercent: 8, scale: 1.025 });
  gsap.set(philosophy, { xPercent: mobile ? 7 : 10, yPercent: 8, scale: 1.025 });
  gsap.set(whoCopy, { color: COLORS.headline.foreground });
  gsap.set(journeyCopy, { color: COLORS.story.foreground });
  gsap.set(philosophyCopy, { color: COLORS.bridge.foreground });
  gsap.set(handoffRule, { scaleY: 1, transformOrigin: 'top center' });
  gsap.set(closingRule, { scaleX: 0, transformOrigin: 'left center' });

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .addLabel('handoff', 0)
    .to(stage, { ...colorVars(COLORS.headline), duration: 2.4 }, 0)
    .to(
      handoffRule,
      {
        x: mobile ? '-10vw' : '-8vw',
        scaleY: 0.72,
        duration: 2.4,
        ease: 'power2.inOut',
      },
      0,
    )
    .addLabel('headline', 1)
    .to(
      headlineLines,
      {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        duration: 1.4,
        stagger: 0.16,
        ease: 'power3.out',
      },
      1,
    )
    .to(
      headline,
      {
        autoAlpha: 0,
        y: mobile ? '-7vh' : '-9vh',
        scale: 0.86,
        duration: 0.9,
        ease: 'power3.inOut',
      },
      5.2,
    )
    .addLabel('who', 6.1)
    .to(
      whoCopy,
      {
        color: COLORS.headline.accent,
        duration: 3.2,
        ease: 'none',
      },
      7.3,
    )
    .to(
      who,
      {
        autoAlpha: 1,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
      },
      6.1,
    )
    .to(
      who,
      {
        autoAlpha: 0,
        xPercent: mobile ? -7 : -10,
        yPercent: -7,
        scale: 0.97,
        duration: 0.7,
        ease: 'power2.inOut',
      },
      10.8,
    )
    .addLabel('journey', 11.45)
    .to(stage, { ...colorVars(COLORS.story), duration: 1.8 }, 10.8)
    .to(
      journey,
      {
        autoAlpha: 1,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
      },
      11.45,
    )
    .to(
      journeyCopy,
      {
        color: '#f4c4ae',
        duration: 3.4,
        ease: 'none',
      },
      12.6,
    )
    .to(
      journey,
      {
        autoAlpha: 0,
        xPercent: mobile ? 7 : 10,
        yPercent: -7,
        scale: 0.97,
        duration: 0.7,
        ease: 'power2.inOut',
      },
      16.2,
    )
    .addLabel('philosophy', 16.9)
    .to(stage, { ...colorVars(COLORS.bridge), duration: 1.8 }, 16.2)
    .to(
      philosophy,
      {
        autoAlpha: 1,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        duration: 1.05,
        ease: 'power3.out',
      },
      16.9,
    )
    .to(
      philosophyCopy,
      {
        color: '#f5c9b5',
        duration: 4,
        ease: 'none',
      },
      18.1,
    )
    .addLabel('closing', 24)
    .to(stage, { ...colorVars(COLORS.closing), duration: 2.2 }, 24)
    .to(philosophyCopy, { color: COLORS.closing.foreground, duration: 2.2 }, 24)
    .to(
      philosophy,
      {
        x: conditions.isLandscape ? 0 : mobile ? '-2vw' : '-5vw',
        y:
          conditions.isShort || conditions.isLandscape
            ? 0
            : mobile
              ? '-7vh'
              : '-6vh',
        scale: mobile ? 0.94 : 0.9,
        duration: 2.2,
        ease: 'power2.inOut',
      },
      24,
    )
    .to(handoffRule, { scaleY: 0, duration: 1.6, ease: 'power2.in' }, 24)
    .to(closingRule, { scaleX: 1, duration: 1.6, ease: 'power3.inOut' }, 24.5);

  return () => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
  };
}

export function setAboutReducedMotionState(scene) {
  const select = gsap.utils.selector(scene);

  gsap.set(select('.about-stage'), colorVars(COLORS.closing));
  gsap.set(
    select(
      '.about-headline, .about-headline__line > span, .about-story, .about-rule',
    ),
    {
      autoAlpha: 1,
      clearProps: 'transform',
    },
  );
}

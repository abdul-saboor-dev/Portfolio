import { gsap } from '../../animation/gsap.js';

const CAMERA_PROFILES = {
  wide: {
    encounter: { scale: 3.12, x: '-4vw', y: '1vh' },
    approach: { scale: 2.34, x: '-2vw', y: '3vh' },
    pullback: { scale: 1.24, x: '3vw', y: '6vh' },
    identity: { scale: 0.8, x: '13vw', y: '8vh' },
    statement: { scale: 0.68, x: '19vw', y: '13vh' },
    exit: { scale: 0.57, x: '-23vw', y: '19vh' },
  },
  desktop: {
    encounter: { scale: 3.05, x: '-5vw', y: '2vh' },
    approach: { scale: 2.3, x: '-3vw', y: '4vh' },
    pullback: { scale: 1.26, x: '3vw', y: '6vh' },
    identity: { scale: 0.82, x: '13vw', y: '9vh' },
    statement: { scale: 0.7, x: '18vw', y: '14vh' },
    exit: { scale: 0.58, x: '-22vw', y: '20vh' },
  },
  tablet: {
    encounter: { scale: 2.86, x: '3vw', y: '2vh' },
    approach: { scale: 2.12, x: '2vw', y: '4vh' },
    pullback: { scale: 1.2, x: '2vw', y: '6vh' },
    identity: { scale: 0.8, x: '8vw', y: '10vh' },
    statement: { scale: 0.68, x: '14vw', y: '16vh' },
    exit: { scale: 0.58, x: '-18vw', y: '21vh' },
  },
  mobile: {
    encounter: { scale: 2.62, x: '31vw', y: '2vh' },
    approach: { scale: 2.12, x: '22vw', y: '4vh' },
    pullback: { scale: 1.2, x: '4vw', y: '7vh' },
    identity: { scale: 0.9, x: '6vw', y: '11vh' },
    statement: { scale: 0.68, x: '15vw', y: '19vh' },
    exit: { scale: 0.6, x: '-14vw', y: '22vh' },
  },
};

function getProfile(conditions) {
  const key = conditions.isWide
    ? 'wide'
    : conditions.isDesktop
      ? 'desktop'
      : conditions.isTablet
        ? 'tablet'
        : 'mobile';
  const profile = CAMERA_PROFILES[key];

  if (!conditions.isLandscape) return profile;

  return {
    encounter: { scale: 2.36, x: conditions.isMobile ? '24vw' : '10vw', y: '8vh' },
    approach: { scale: 1.8, x: conditions.isMobile ? '16vw' : '8vw', y: '9vh' },
    pullback: { scale: 1.02, x: '5vw', y: '11vh' },
    identity: { scale: 0.7, x: '19vw', y: '17vh' },
    statement: { scale: 0.56, x: '24vw', y: '19vh' },
    exit: { scale: 0.5, x: '-17vw', y: '23vh' },
  };
}

function setCamera(target, camera) {
  return {
    scale: camera.scale,
    x: camera.x,
    y: camera.y,
  };
}

export function createIntroTimeline({ scene, conditions }) {
  const select = gsap.utils.selector(scene);
  const profile = getProfile(conditions);
  const portrait = select('.intro-portrait--primary');
  const scrollCue = select('.intro-scroll-cue');
  const name = select('.intro-name');
  const nameLines = select('.intro-name__line > span');
  const roles = select('.intro-role');
  const webRole = select('.intro-role--web');
  const creativeRole = select('.intro-role--creative');
  const problemRole = select('.intro-role--problem');
  const statement = select('.intro-statement');
  const statementLines = select('.intro-statement__line > span');
  const exitRule = select('.intro-exit-rule');

  gsap.set(portrait, {
    autoAlpha: 1,
    ...setCamera(portrait, profile.encounter),
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 38%',
  });
  gsap.set(name, {
    autoAlpha: 0,
    xPercent: -10,
    x: 0,
    y: 0,
    scale: 1.06,
  });
  gsap.set(nameLines, { autoAlpha: 1, yPercent: 0 });
  gsap.set(roles, { autoAlpha: 0, transformOrigin: '50% 50%' });
  gsap.set(webRole, { xPercent: -125, scale: 1.24 });
  gsap.set(creativeRole, { yPercent: 135, scale: 1.2 });
  gsap.set(problemRole, { xPercent: 125, scale: 1.26 });
  gsap.set(statement, {
    autoAlpha: 0,
    xPercent: -8,
    x: 0,
    y: 0,
    scale: 1.04,
  });
  gsap.set(statementLines, { autoAlpha: 1, yPercent: 0 });
  gsap.set(exitRule, { scaleY: 0, transformOrigin: 'top center' });

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
    .addLabel('encounter', 0)
    .to(portrait, { ...setCamera(portrait, profile.approach), duration: 2.4 }, 0)
    .to(scrollCue, { autoAlpha: 0, y: '2vh', duration: 0.65 }, 0.95)
    .addLabel('pullback', 2.15)
    .to(portrait, { ...setCamera(portrait, profile.pullback), duration: 3 }, 2.15)
    .addLabel('identity', 5)
    .to(
      name,
      {
        autoAlpha: 1,
        xPercent: 0,
        scale: 1,
        duration: 1.1,
        ease: 'power3.out',
      },
      5.1,
    )
    .to(
      portrait,
      {
        ...setCamera(portrait, profile.identity),
        duration: 2.2,
        ease: 'power2.inOut',
      },
      4.85,
    )
    .addLabel('webDeveloper', 7)
    .to(
      webRole,
      {
        autoAlpha: 1,
        xPercent: 0,
        scale: 1,
        duration: 0.85,
        ease: 'power3.out',
      },
      7,
    )
    .to(
      webRole,
      {
        autoAlpha: 0,
        xPercent: 125,
        scale: 0.78,
        duration: 0.65,
        ease: 'power2.inOut',
      },
      9.25,
    )
    .addLabel('creativeDesigner', 9.85)
    .to(
      creativeRole,
      {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
        duration: 0.85,
        ease: 'power3.out',
      },
      9.85,
    )
    .to(
      creativeRole,
      {
        autoAlpha: 0,
        yPercent: -135,
        scale: 1.2,
        duration: 0.65,
        ease: 'power2.inOut',
      },
      12.1,
    )
    .addLabel('problemSolver', 12.7)
    .to(
      problemRole,
      {
        autoAlpha: 1,
        xPercent: 0,
        scale: 1,
        duration: 0.85,
        ease: 'power3.out',
      },
      12.7,
    )
    .to(
      problemRole,
      {
        autoAlpha: 0,
        xPercent: -115,
        scale: 0.8,
        duration: 0.68,
        ease: 'power2.inOut',
      },
      14.95,
    )
    .to(
      name,
      {
        autoAlpha: 0,
        x: conditions.isMobile ? '-8vw' : '-5vw',
        y: conditions.isMobile ? '-8vh' : '-10vh',
        scale: 1.08,
        duration: 0.9,
        ease: 'power2.inOut',
      },
      14.8,
    )
    .addLabel('statement', 15.3)
    .to(
      portrait,
      {
        ...setCamera(portrait, profile.statement),
        duration: 1.9,
        ease: 'power2.inOut',
      },
      15.05,
    )
    .to(
      statement,
      {
        autoAlpha: 1,
        xPercent: 0,
        scale: 1,
        duration: 1.05,
        ease: 'power3.out',
      },
      15.3,
    )
    .addLabel('exit', 17.2)
    .to(
      portrait,
      {
        ...setCamera(portrait, profile.exit),
        duration: 1.5,
        ease: 'power2.inOut',
      },
      17.2,
    )
    .to(
      statement,
      {
        x: conditions.isMobile ? '-4vw' : '5vw',
        y: conditions.isMobile ? '-12vh' : '-7vh',
        scale: conditions.isMobile ? 0.76 : 0.8,
        duration: 1.5,
        ease: 'power2.inOut',
      },
      17.2,
    )
    .to(exitRule, { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, 17.45);

  return () => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
  };
}

export function setReducedMotionState(scene, conditions) {
  const select = gsap.utils.selector(scene);
  const profile = getProfile(conditions);

  gsap.set(select('.intro-scroll-cue'), { display: 'none' });
  gsap.set(select('.intro-portrait--primary'), {
    autoAlpha: 1,
    ...setCamera(select('.intro-portrait--primary'), profile.statement),
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 38%',
  });
  gsap.set(select('.intro-name, .intro-name__line > span'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('.intro-role'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('.intro-statement, .intro-statement__line > span'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('.intro-exit-rule'), { display: 'none' });
}

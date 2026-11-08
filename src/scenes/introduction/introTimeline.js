import { gsap } from '../../animation/gsap.js';

function showShot(timeline, shots, shotNumber, position) {
  timeline
    .set(shots, { autoAlpha: 0 }, position)
    .set(shots[shotNumber - 1], { autoAlpha: 1 }, position);
}

export function createIntroTimeline({ scene, isMobile }) {
  const select = gsap.utils.selector(scene);
  const portrait = select('.intro-portrait--primary');
  const opening = select('.intro-opening');
  const scrollCue = select('.intro-scroll-cue');
  const nameLines = select('.intro-name__line > span');
  const name = select('.intro-name');
  const role = select('.intro-role');
  const exitRule = select('.intro-exit-rule');
  const shots = select('[data-shot]');

  gsap.set(portrait, {
    autoAlpha: 1,
    scale: isMobile ? 2.58 : 3.08,
    x: isMobile ? '-4vw' : '-5vw',
    y: isMobile ? '4vh' : '2vh',
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 38%',
  });
  gsap.set(nameLines, { yPercent: 112 });
  gsap.set(role, { autoAlpha: 0, yPercent: 120 });
  gsap.set(exitRule, { scaleY: 0, transformOrigin: 'top center' });
  gsap.set(shots, { autoAlpha: 0 });
  gsap.set(shots[0], { autoAlpha: 1 });

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
    .addLabel('opening', 0)
    .to(
      portrait,
      {
        scale: isMobile ? 2.12 : 2.38,
        x: isMobile ? '-2vw' : '-3vw',
        y: isMobile ? '5vh' : '4vh',
        duration: 1.5,
      },
      0,
    )
    .to(opening, { autoAlpha: 0, y: '-4vh', duration: 0.55 }, 0.65)
    .to(scrollCue, { autoAlpha: 0, y: '2vh', duration: 0.45 }, 0.72)
    .addLabel('pullback', 1.05)
    .to(
      portrait,
      {
        scale: isMobile ? 1.36 : 1.28,
        x: isMobile ? '1vw' : '3vw',
        y: isMobile ? '7vh' : '6vh',
        duration: 1.75,
      },
      1.05,
    );

  showShot(timeline, shots, 2, 1.05);

  timeline
    .addLabel('identity', 2.75)
    .to(
      nameLines,
      {
        yPercent: 0,
        duration: 0.78,
        stagger: 0.1,
        ease: 'power3.out',
      },
      2.75,
    )
    .to(
      role,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.58,
        ease: 'power3.out',
      },
      2.95,
    )
    .to(
      portrait,
      {
        scale: isMobile ? 0.94 : 0.82,
        x: isMobile ? '7vw' : '13vw',
        y: isMobile ? '10vh' : '9vh',
        duration: 1.55,
        ease: 'power2.inOut',
      },
      2.55,
    );

  showShot(timeline, shots, 3, 2.75);

  timeline
    .addLabel('exit', 5.1)
    .to(
      portrait,
      {
        scale: isMobile ? 0.78 : 0.68,
        x: isMobile ? '-17vw' : '-24vw',
        y: isMobile ? '18vh' : '17vh',
        duration: 1.65,
        ease: 'power2.inOut',
      },
      5.1,
    )
    .to(
      name,
      {
        scale: isMobile ? 0.62 : 0.56,
        x: isMobile ? '-10vw' : '-13vw',
        y: isMobile ? '-19vh' : '-24vh',
        duration: 1.65,
        ease: 'power2.inOut',
      },
      5.1,
    )
    .to(
      role,
      {
        x: isMobile ? '-8vw' : '-19vw',
        y: isMobile ? '-12vh' : '-18vh',
        duration: 1.65,
        ease: 'power2.inOut',
      },
      5.1,
    )
    .to(exitRule, { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, 5.38);

  showShot(timeline, shots, 4, 5.1);

  return () => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
  };
}

export function setReducedMotionState(scene, isMobile) {
  const select = gsap.utils.selector(scene);

  gsap.set(select('.intro-opening, .intro-scroll-cue'), { display: 'none' });
  gsap.set(select('.intro-portrait--primary'), {
    autoAlpha: 1,
    scale: isMobile ? 0.94 : 0.82,
    x: isMobile ? '7vw' : '13vw',
    y: isMobile ? '10vh' : '9vh',
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 38%',
  });
  gsap.set(select('.intro-name__line > span, .intro-role'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('[data-shot]'), { autoAlpha: 0 });
  gsap.set(select('[data-shot="3"]'), { autoAlpha: 1 });
}

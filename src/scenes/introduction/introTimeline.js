import { gsap } from '../../animation/gsap.js';

function showShot(timeline, shots, shotNumber, position) {
  timeline
    .set(shots, { autoAlpha: 0 }, position)
    .set(shots[shotNumber - 1], { autoAlpha: 1 }, position);
}

export function createIntroTimeline({ scene, isMobile }) {
  const select = gsap.utils.selector(scene);
  const closeup = select('.intro-portrait--closeup');
  const upperBody = select('.intro-portrait--upperbody');
  const opening = select('.intro-opening');
  const scrollCue = select('.intro-scroll-cue');
  const nameLines = select('.intro-name__line > span');
  const name = select('.intro-name');
  const role = select('.intro-role');
  const cut = select('.intro-cut');
  const cutLine = select('.intro-cut > span');
  const exitRule = select('.intro-exit-rule');
  const shots = select('[data-shot]');

  gsap.set(closeup, {
    autoAlpha: 1,
    scale: isMobile ? 1.68 : 1.45,
    x: isMobile ? '0vw' : '5vw',
    y: isMobile ? '9vh' : '12vh',
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 42%',
  });
  gsap.set(upperBody, {
    autoAlpha: 0,
    scale: isMobile ? 1.22 : 1.08,
    x: '0vw',
    y: isMobile ? '8vh' : '7vh',
    xPercent: -50,
    yPercent: -50,
    transformOrigin: '50% 38%',
  });
  gsap.set(nameLines, { yPercent: 112 });
  gsap.set(role, { autoAlpha: 0, yPercent: 120 });
  gsap.set(cut, { scaleX: 0, transformOrigin: 'left center' });
  gsap.set(cutLine, { scaleX: 0, transformOrigin: 'left center' });
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
      closeup,
      {
        scale: isMobile ? 1.28 : 1.08,
        x: isMobile ? '0vw' : '1vw',
        y: isMobile ? '5vh' : '6vh',
        duration: 1.6,
      },
      0,
    )
    .to(opening, { autoAlpha: 0, y: '-4vh', duration: 0.55 }, 0.65)
    .to(scrollCue, { autoAlpha: 0, y: '2vh', duration: 0.45 }, 0.72)
    .addLabel('pullback', 1.1)
    .to(
      closeup,
      {
        scale: isMobile ? 1.02 : 0.82,
        x: isMobile ? '-1vw' : '-8vw',
        y: isMobile ? '2vh' : '1vh',
        duration: 1.25,
      },
      1.1,
    );

  showShot(timeline, shots, 2, 1.1);

  timeline
    .to(cut, { scaleX: 1, duration: 0.34, ease: 'power4.inOut' }, 2.18)
    .to(cutLine, { scaleX: 1, duration: 0.25, ease: 'power3.in' }, 2.22)
    .set(closeup, { autoAlpha: 0 }, 2.52)
    .set(upperBody, { autoAlpha: 1 }, 2.52)
    .set(cut, { transformOrigin: 'right center' }, 2.52)
    .set(cutLine, { transformOrigin: 'right center' }, 2.52)
    .to(cut, { scaleX: 0, duration: 0.38, ease: 'power4.inOut' }, 2.52)
    .to(cutLine, { scaleX: 0, duration: 0.26, ease: 'power3.out' }, 2.55)
    .to(
      upperBody,
      {
        scale: isMobile ? 1.03 : 0.9,
        x: isMobile ? '1vw' : '8vw',
        y: isMobile ? '7vh' : '6vh',
        duration: 1.45,
      },
      2.58,
    )
    .addLabel('identity', 3.38)
    .to(
      nameLines,
      {
        yPercent: 0,
        duration: 0.78,
        stagger: 0.1,
        ease: 'power3.out',
      },
      3.38,
    )
    .to(
      role,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.58,
        ease: 'power3.out',
      },
      3.58,
    )
    .to(
      upperBody,
      {
        scale: isMobile ? 0.94 : 0.82,
        x: isMobile ? '7vw' : '13vw',
        y: isMobile ? '10vh' : '9vh',
        duration: 1.42,
        ease: 'power2.inOut',
      },
      3.28,
    );

  showShot(timeline, shots, 3, 3.38);

  timeline
    .addLabel('exit', 5.45)
    .to(
      upperBody,
      {
        scale: isMobile ? 0.78 : 0.68,
        x: isMobile ? '-17vw' : '-24vw',
        y: isMobile ? '18vh' : '17vh',
        duration: 1.65,
        ease: 'power2.inOut',
      },
      5.45,
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
      5.45,
    )
    .to(
      role,
      {
        x: isMobile ? '-8vw' : '-19vw',
        y: isMobile ? '-12vh' : '-18vh',
        duration: 1.65,
        ease: 'power2.inOut',
      },
      5.45,
    )
    .to(exitRule, { scaleY: 1, duration: 1.1, ease: 'power3.inOut' }, 5.72);

  showShot(timeline, shots, 4, 5.45);

  return () => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
  };
}

export function setReducedMotionState(scene) {
  const select = gsap.utils.selector(scene);

  gsap.set(select('.intro-opening, .intro-scroll-cue, .intro-portrait--closeup'), {
    display: 'none',
  });
  gsap.set(select('.intro-portrait--upperbody'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('.intro-name__line > span, .intro-role'), {
    autoAlpha: 1,
    clearProps: 'transform',
  });
  gsap.set(select('[data-shot]'), { autoAlpha: 0 });
  gsap.set(select('[data-shot="3"]'), { autoAlpha: 1 });
}

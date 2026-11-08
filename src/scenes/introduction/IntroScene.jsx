import { useLayoutEffect, useRef } from 'react';

import upperBodyPortrait from '../../assets/portraits/portrait-upperbody.png';
import { gsap, ScrollTrigger } from '../../animation/gsap.js';
import { createIntroTimeline, setReducedMotionState } from './introTimeline.js';

function IntroScene() {
  const sceneRef = useRef(null);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;

    let resizeFrame;
    const refreshOnResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    window.addEventListener('resize', refreshOnResize);

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add(
        {
          isWide: '(min-width: 1440px)',
          isDesktop: '(min-width: 1024px) and (max-width: 1439px)',
          isTablet: '(min-width: 768px) and (max-width: 1023px)',
          isMobile: '(max-width: 767px)',
          isShort: '(max-height: 650px)',
          isLandscape:
            '(max-width: 1023px) and (max-height: 600px) and (orientation: landscape)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          if (conditions.reduceMotion) {
            setReducedMotionState(scene, conditions);
            return undefined;
          }

          return createIntroTimeline({ scene, conditions });
        },
      );

      return () => media.revert();
    }, scene);

    return () => {
      window.cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', refreshOnResize);
      context.revert();
    };
  }, []);

  const refreshScrollTrigger = () => ScrollTrigger.refresh();

  return (
    <section
      ref={sceneRef}
      className="intro-sequence"
      aria-labelledby="intro-identity"
    >
      <div className="intro-stage">
        <div className="intro-stage__frame" aria-hidden="true" />

        <div className="intro-portrait intro-portrait--primary" aria-hidden="true">
          <img
            src={upperBodyPortrait}
            alt=""
            draggable="false"
            fetchPriority="high"
            onLoad={refreshScrollTrigger}
          />
        </div>

        <h1 id="intro-identity" className="intro-name" aria-label="Abdul Saboor">
          <span className="intro-name__line">
            <span>Abdul</span>
          </span>
          <span className="intro-name__line">
            <span>Saboor</span>
          </span>
        </h1>

        <div className="intro-role-stack" aria-label="Professional identities">
          <p className="intro-role intro-role--web">
            <span className="intro-role__word">Web</span>
            <span className="intro-role__word">Developer</span>
          </p>
          <p className="intro-role intro-role--creative">
            <span className="intro-role__word">Creative</span>
            <span className="intro-role__word">Designer</span>
          </p>
          <p className="intro-role intro-role--problem">
            <span className="intro-role__word">Problem</span>
            <span className="intro-role__word">Solver</span>
          </p>
        </div>

        <p className="intro-statement">
          <span className="intro-statement__line">
            <span>I build for the web.</span>
          </span>
          <span className="intro-statement__line">
            <span>I design for the experience.</span>
          </span>
        </p>

        <div className="intro-scroll-cue" aria-hidden="true">
          <span>Scroll to explore</span>
          <i />
        </div>

        <div className="intro-exit-rule" aria-hidden="true" />
      </div>

      <div id="intro-end" className="intro-sequence__end" tabIndex="-1" />
    </section>
  );
}

export default IntroScene;

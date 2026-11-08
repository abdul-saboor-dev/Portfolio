import { useLayoutEffect, useRef } from 'react';

import closeupPortrait from '../../assets/portraits/portrait-closeup.png';
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
          isDesktop: '(min-width: 768px)',
          isMobile: '(max-width: 767px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          if (conditions.reduceMotion) {
            setReducedMotionState(scene);
            return undefined;
          }

          return createIntroTimeline({
            scene,
            isMobile: conditions.isMobile,
          });
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
        <div className="intro-stage__frame" aria-hidden="true">
          <span />
          <span />
        </div>

        <header className="intro-topline" aria-label="Introduction sequence">
          <p>01 / Introduction</p>
          <p>Scroll / Control</p>
        </header>

        <div className="intro-opening">
          <p className="intro-opening__kicker">Opening frame</p>
          <p className="intro-opening__copy">
            The introduction
            <br />
            begins up close.
          </p>
        </div>

        <div className="intro-portrait intro-portrait--closeup" aria-hidden="true">
          <img
            src={closeupPortrait}
            alt=""
            draggable="false"
            fetchPriority="high"
            onLoad={refreshScrollTrigger}
          />
        </div>

        <div className="intro-portrait intro-portrait--upperbody" aria-hidden="true">
          <img
            src={upperBodyPortrait}
            alt=""
            draggable="false"
            decoding="async"
            onLoad={refreshScrollTrigger}
          />
        </div>

        <div className="intro-identity">
          <h1 id="intro-identity" className="intro-name" aria-label="Abdul Saboor">
            <span className="intro-name__line">
              <span>Abdul</span>
            </span>
            <span className="intro-name__line">
              <span>Saboor</span>
            </span>
          </h1>

          <p className="intro-role">Web Developer</p>
        </div>

        <div className="intro-scroll-cue" aria-hidden="true">
          <span>Scroll to pull back</span>
          <i />
        </div>

        <div className="intro-shot-index" aria-hidden="true">
          <span data-shot="1">01</span>
          <span data-shot="2">02</span>
          <span data-shot="3">03</span>
          <span data-shot="4">04</span>
        </div>

        <div className="intro-cut" aria-hidden="true">
          <span />
        </div>

        <div className="intro-exit-rule" aria-hidden="true" />
      </div>

      <div id="intro-end" className="intro-sequence__end" tabIndex="-1" />
    </section>
  );
}

export default IntroScene;

import { useLayoutEffect, useRef } from 'react';

import { gsap, ScrollTrigger } from '../../animation/gsap.js';
import { createAboutTimeline, setAboutReducedMotionState } from './aboutTimeline.js';

function AboutScene() {
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
          isDesktop: '(min-width: 1024px)',
          isTablet: '(min-width: 768px) and (max-width: 1023px)',
          isMobile: '(max-width: 767px)',
          isShort: '(max-height: 650px)',
          isLandscape:
            '(max-width: 1023px) and (max-height: 600px) and (orientation: landscape)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        ({ conditions }) => {
          if (conditions.reduceMotion) {
            setAboutReducedMotionState(scene);
            return undefined;
          }

          return createAboutTimeline({ scene, conditions });
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

  return (
    <section
      ref={sceneRef}
      id="about"
      className="about-sequence"
      aria-labelledby="about-heading"
    >
      <div className="about-stage">
        <div className="about-stage__frame" aria-hidden="true" />
        <div className="about-rule about-rule--handoff" aria-hidden="true" />
        <div className="about-rule about-rule--closing" aria-hidden="true" />

        <header className="about-headline-wrap">
          <h2 id="about-heading" className="about-headline">
            <span className="about-headline__line">
              <span>Building digital experiences{' '}</span>
            </span>
            <span className="about-headline__line">
              <span>through code, creativity,{' '}</span>
            </span>
            <span className="about-headline__line">
              <span>and thoughtful design.</span>
            </span>
          </h2>
        </header>

        <div className="about-stories">
          <p className="about-story about-story--who">
            I'm Abdul Saboor, a developer and aspiring designer passionate about
            building modern, functional, and visually engaging digital experiences. I
            enjoy turning ideas into practical solutions, blending development with
            creative thinking and thoughtful design to create products that are not
            only useful but also intuitive and aesthetically refined.
          </p>

          <p className="about-story about-story--journey">
            My journey started with exploring the fundamentals of web development and
            gradually expanded into full-stack development and UI design. I'm
            continuously learning, experimenting with new technologies, exploring
            design principles, and refining the way I approach problems.
          </p>

          <p className="about-story about-story--philosophy">
            I believe great digital experiences go beyond writing code, they're about
            understanding problems, crafting meaningful solutions, and bringing
            functionality and design together to build something that makes a
            difference.
          </p>
        </div>
      </div>

      <div id="about-end" className="about-sequence__end" tabIndex="-1" />
    </section>
  );
}

export default AboutScene;

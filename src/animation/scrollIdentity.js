import { getAsMonogramLayout } from '../identity/asMonogram.js';
import {
  createEducationSequence,
  EDUCATION_ACTIVE_THRESHOLD,
  EDUCATION_INTRO_END,
} from './educationSequence.js';
import { gsap, ScrollTrigger } from './gsap.js';
import {
  createSkillsSequence,
  SKILLS_ACTIVE_THRESHOLD,
  SKILLS_INTRO_END,
} from './skillsSequence.js';

const A_SOURCE_ID = 'glyph-a-01';
const S_SOURCE_ID = 'glyph-s-01';
const GLYPH_SELECTOR = '[data-glyph-id]';
const WORDMARK_SELECTOR = '[data-testid="kinetic-wordmark"]';
const SUPPORT_SELECTOR = '.kinetic-hero__support';
const CUE_SELECTOR = '.kinetic-hero__scroll-cue';
const ABOUT_SELECTOR = '.kinetic-about';
const ABOUT_CONTENT_SELECTOR = '.kinetic-about__content';
const ABOUT_NARRATIVE_SELECTOR = '[data-about-narrative]';
const ABOUT_WORD_SELECTOR = '[data-about-word]';

const IDENTITY_SOURCE_DURATION = 0.94;
const ABOUT_REVEAL_START = 0.12;
const IDENTITY_HANDOFF = 0.42;
const READING_START = 0.425;
const READING_END = 0.9;
const ACTIVE_ABOUT_THRESHOLD = 0.22;
const UNREAD_COLOR = '#666666';
const READ_COLOR = '#151515';

const identityTime = (sourceTime) =>
  (sourceTime / IDENTITY_SOURCE_DURATION) * IDENTITY_HANDOFF;

const getVisibleViewportHeight = () =>
  window.__kineticViewport?.read?.().height ??
  window.visualViewport?.height ??
  window.innerHeight;

const getIdentityScrollDistance = () => {
  const compact = window.matchMedia('(max-width: 600px)').matches;
  const landscape = window.matchMedia(
    '(max-height: 540px) and (orientation: landscape)',
  ).matches;
  const multiplier = compact ? 2.85 : landscape ? 2.45 : 2.55;
  return Math.round(getVisibleViewportHeight() * multiplier);
};

const relativeRect = (rect, rootRect) => ({
  height: rect.height,
  left: rect.left - rootRect.left,
  top: rect.top - rootRect.top,
  width: rect.width,
});

const measureInkRect = (glyph) => {
  const marker = document.createElement('span');
  marker.setAttribute('aria-hidden', 'true');
  marker.style.cssText =
    'display:inline-block;width:0;height:0;padding:0;margin:0;line-height:0;vertical-align:baseline;';
  glyph.append(marker);
  const baseline = marker.getBoundingClientRect().top;
  marker.remove();

  const glyphRect = glyph.getBoundingClientRect();
  const style = getComputedStyle(glyph);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const metrics = context.measureText(glyph.dataset.character ?? glyph.textContent);

  return {
    height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
    left: glyphRect.left - metrics.actualBoundingBoxLeft,
    top: baseline - metrics.actualBoundingBoxAscent,
    width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
  };
};

const createDestination = (root) => {
  const destination = document.createElement('span');
  destination.className = 'kinetic-monogram__destination';
  destination.setAttribute('role', 'img');
  destination.setAttribute('aria-label', 'Abdul Saboor monogram');
  destination.setAttribute('aria-hidden', 'true');
  root.append(destination);
  return destination;
};

const configureCue = (cue) => {
  cue.hidden = false;
  cue.href = '#about';
  cue.removeAttribute('aria-hidden');
  cue.removeAttribute('tabindex');
  gsap.set(cue, { autoAlpha: 1, y: 0 });
};

const getGlyphTransform = ({ element, ink, target }) => {
  const scale = target.height / ink.height;
  const origin = {
    x: element.left + element.width / 2,
    y: element.top + element.height / 2,
  };
  const inkCenter = {
    x: ink.left + ink.width / 2,
    y: ink.top + ink.height / 2,
  };
  const targetCenter = {
    x: target.left + target.width / 2,
    y: target.top + target.height / 2,
  };

  return {
    scale,
    x: targetCenter.x - (origin.x + (inkCenter.x - origin.x) * scale),
    y: targetCenter.y - (origin.y + (inkCenter.y - origin.y) * scale),
  };
};

export function createScrollIdentity(root) {
  const glyphs = [...root.querySelectorAll(GLYPH_SELECTOR)];
  const aGlyph = root.querySelector(`#${A_SOURCE_ID}`);
  const sGlyph = root.querySelector(`#${S_SOURCE_ID}`);
  const wordmark = root.querySelector(WORDMARK_SELECTOR);
  const support = root.querySelector(SUPPORT_SELECTOR);
  const cue = root.querySelector(CUE_SELECTOR);
  const about = root.querySelector(ABOUT_SELECTOR);
  const aboutContent = about?.querySelector(ABOUT_CONTENT_SELECTOR);
  const aboutNarrative = about?.querySelector(ABOUT_NARRATIVE_SELECTOR);
  const educationStage = root.querySelector('.education-stage');
  const skillsStage = root.querySelector('.skills-stage');

  if (
    !aGlyph ||
    !sGlyph ||
    !wordmark ||
    !support ||
    !cue ||
    !about ||
    !aboutContent ||
    !aboutNarrative ||
    !educationStage ||
    !skillsStage ||
    glyphs.length !== 11
  ) {
    root.dataset.scrollIdentity = 'unavailable';
    return { destroy() {} };
  }

  const nonLogoGlyphs = glyphs.filter((glyph) => glyph !== aGlyph && glyph !== sGlyph);
  const upperExitGlyphs = nonLogoGlyphs.filter(
    (glyph) => Number(glyph.dataset.glyphIndex) < 5,
  );
  const lowerExitGlyphs = nonLogoGlyphs.filter(
    (glyph) => Number(glyph.dataset.glyphIndex) > 5,
  );
  const destination = createDestination(root);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const geometry = { a: null, artwork: null, s: null };
  const phaseState = { hold: 0 };
  let aboutWords = [...about.querySelectorAll(ABOUT_WORD_SELECTOR)];
  let finalAccessibleState = false;
  let aboutAccessibleState = false;
  let activeSection = null;
  let refreshState = { education: 0, identity: 0, skills: 0 };
  let resizeFrame = 0;
  let resizeState = null;
  let contentFrame = 0;
  let cueRevealTween;
  let timeline;
  let trigger;
  let identityDistance = getIdentityScrollDistance();
  let educationDistance = 0;
  let skillsDistance = 0;
  let totalDistance = identityDistance;

  configureCue(cue);
  root.dataset.scrollIdentity = 'preparing';
  root.dataset.scrollProgress = '0.000';
  root.dataset.identityHandoffProgress = IDENTITY_HANDOFF.toFixed(3);

  const clearIdentityTransforms = () => {
    gsap.set([aGlyph, sGlyph], { clearProps: 'transform' });
    gsap.set(sGlyph, { clearProps: 'webkitTextStrokeWidth' });
  };

  const measure = () => {
    const rootRect = root.getBoundingClientRect();
    const destinationRect = relativeRect(destination.getBoundingClientRect(), rootRect);
    const layout = getAsMonogramLayout(destinationRect.height);
    const measureGlyph = (glyph) => ({
      element: relativeRect(glyph.getBoundingClientRect(), rootRect),
      ink: relativeRect(measureInkRect(glyph), rootRect),
    });
    const aSource = measureGlyph(aGlyph);
    const sSource = measureGlyph(sGlyph);
    const aTarget = {
      height: layout.a.height,
      left: destinationRect.left + layout.a.left,
      top: destinationRect.top + layout.a.top,
      width: layout.a.width,
    };
    const sTarget = {
      height: layout.s.height,
      left: destinationRect.left + layout.s.left,
      top: destinationRect.top + layout.s.top,
      width: layout.s.width,
    };

    geometry.a = {
      target: aTarget,
      transform: getGlyphTransform({ ...aSource, target: aTarget }),
    };
    geometry.s = {
      separation: layout.separation,
      target: sTarget,
      transform: getGlyphTransform({ ...sSource, target: sTarget }),
    };
    geometry.artwork = {
      height: layout.height,
      left: destinationRect.left,
      top: destinationRect.top,
      width: layout.width,
    };

    root.dataset.monogramVisibleHeight = layout.height.toFixed(2);
    root.dataset.monogramVisibleWidth = layout.width.toFixed(2);
    for (const [glyph, item] of [
      [aGlyph, geometry.a],
      [sGlyph, geometry.s],
    ]) {
      glyph.dataset.monogramTargetLeft = item.target.left.toFixed(2);
      glyph.dataset.monogramTargetTop = item.target.top.toFixed(2);
      glyph.dataset.monogramTargetWidth = item.target.width.toFixed(2);
      glyph.dataset.monogramTargetHeight = item.target.height.toFixed(2);
    }
  };

  const syncAccessibleState = (progress) => {
    const nextFinal = progress >= IDENTITY_HANDOFF - 0.01;
    if (nextFinal !== finalAccessibleState) {
      finalAccessibleState = nextFinal;
      destination.setAttribute('aria-hidden', String(!nextFinal));
      if (nextFinal) wordmark.setAttribute('aria-hidden', 'true');
      else wordmark.removeAttribute('aria-hidden');
    }

    const nextAboutAccessible = progress >= ABOUT_REVEAL_START;
    if (nextAboutAccessible !== aboutAccessibleState) {
      aboutAccessibleState = nextAboutAccessible;
      about.setAttribute('aria-hidden', String(!nextAboutAccessible));
      about.inert = !nextAboutAccessible;
    }
  };

  const syncActiveSection = (
    identityProgress,
    educationProgress = 0,
    skillsProgress = 0,
  ) => {
    const nextSection =
      skillsProgress >= SKILLS_ACTIVE_THRESHOLD
        ? 'skills'
        : educationProgress >= EDUCATION_ACTIVE_THRESHOLD
          ? 'education'
          : identityProgress >= ACTIVE_ABOUT_THRESHOLD
            ? 'about'
            : 'home';
    if (nextSection === activeSection) return;
    activeSection = nextSection;
    window.dispatchEvent(
      new CustomEvent('kinetic:section-change', { detail: { id: nextSection } }),
    );
  };

  const onProgress = (progress) => {
    if (progress > 0.001 && cueRevealTween) {
      cueRevealTween.kill();
      cueRevealTween = null;
      root.dataset.cueReveal = 'complete';
    }

    const identityProgress = gsap.utils.clamp(0, 1, progress / IDENTITY_HANDOFF);
    const revealProgress = gsap.utils.clamp(
      0,
      1,
      (progress - ABOUT_REVEAL_START) / (IDENTITY_HANDOFF - ABOUT_REVEAL_START),
    );
    const readingProgress = gsap.utils.clamp(
      0,
      1,
      (progress - READING_START) / (READING_END - READING_START),
    );

    if (!reducedMotion) {
      const cueProgress = gsap.utils.clamp(0, 1, progress / 0.07);
      gsap.set(cue, { autoAlpha: 1 - cueProgress, y: -6 * cueProgress });
    }
    if (progress <= 0.001 && !reducedMotion) {
      clearIdentityTransforms();
      gsap.set(nonLogoGlyphs, { clearProps: 'opacity,visibility,transform' });
      gsap.set(support, { clearProps: 'opacity,visibility,transform' });
    }

    root.dataset.scrollProgress = progress.toFixed(3);
    root.dataset.identityProgress = identityProgress.toFixed(3);
    root.dataset.aboutRevealProgress = revealProgress.toFixed(3);
    root.dataset.readingProgress = readingProgress.toFixed(3);
    root.dataset.identityState =
      progress <= 0.001
        ? 'hero'
        : progress < IDENTITY_HANDOFF
          ? 'transforming'
          : progress < READING_END
            ? 'reading'
            : 'about-complete';
    about.dataset.readingProgress = readingProgress.toFixed(3);
    syncAccessibleState(progress);
  };

  const buildTimeline = () => {
    if (!timeline) timeline = gsap.timeline({ paused: true });
    else timeline.clear();

    aboutWords = [...about.querySelectorAll(ABOUT_WORD_SELECTOR)];
    phaseState.hold = 0;
    const readingDuration = READING_END - READING_START;
    const wordDuration = Math.min(
      0.032,
      Math.max(0.014, (readingDuration / Math.max(aboutWords.length, 1)) * 4),
    );
    const wordStagger =
      aboutWords.length > 1
        ? (readingDuration - wordDuration) / (aboutWords.length - 1)
        : 0;

    timeline
      .set(about, { autoAlpha: 1 }, 0)
      .set(aboutContent, { clipPath: 'inset(0 0 100% 0)' }, 0)
      .set(aboutWords, { color: UNREAD_COLOR }, 0)
      .to(
        upperExitGlyphs,
        {
          autoAlpha: 0,
          duration: identityTime(0.5),
          ease: 'power2.inOut',
          stagger: identityTime(0.018),
          x: () => -Math.min(window.innerWidth * 0.085, 96),
          y: () => -Math.min(getVisibleViewportHeight() * 0.055, 48),
        },
        identityTime(0.06),
      )
      .to(
        lowerExitGlyphs,
        {
          autoAlpha: 0,
          duration: identityTime(0.52),
          ease: 'power2.inOut',
          stagger: identityTime(0.016),
          x: () => Math.min(window.innerWidth * 0.075, 88),
          y: () => Math.min(getVisibleViewportHeight() * 0.06, 52),
        },
        identityTime(0.07),
      )
      .to(
        support,
        {
          autoAlpha: 0,
          duration: identityTime(0.46),
          ease: 'power2.inOut',
          y: -12,
        },
        identityTime(0.08),
      )
      .to(
        aGlyph,
        {
          duration: identityTime(0.9),
          ease: 'power1.inOut',
          scale: () => geometry.a.transform.scale,
          x: () => geometry.a.transform.x,
          y: () => geometry.a.transform.y,
        },
        identityTime(0.04),
      )
      .to(
        sGlyph,
        {
          duration: identityTime(0.9),
          ease: 'power1.inOut',
          scale: () => geometry.s.transform.scale,
          x: () => geometry.s.transform.x,
          y: () => geometry.s.transform.y,
        },
        identityTime(0.04),
      )
      .to(
        sGlyph,
        {
          duration: identityTime(0.44),
          ease: 'power1.inOut',
          webkitTextStrokeWidth: () => geometry.s.separation / geometry.s.transform.scale,
        },
        identityTime(0.42),
      )
      .to(
        aboutContent,
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: IDENTITY_HANDOFF - ABOUT_REVEAL_START,
          ease: 'power2.inOut',
        },
        ABOUT_REVEAL_START,
      )
      .to(
        aboutWords,
        {
          color: READ_COLOR,
          duration: wordDuration,
          ease: 'none',
          stagger: wordStagger,
        },
        READING_START,
      )
      .to(phaseState, { hold: 1, duration: 1 - READING_END, ease: 'none' }, READING_END);

    root.dataset.aboutWordCount = aboutWords.length.toString();
    return timeline;
  };

  const applyReducedComposition = () => {
    aboutAccessibleState = true;
    about.setAttribute('aria-hidden', 'false');
    about.inert = false;
    wordmark.removeAttribute('aria-hidden');
    destination.setAttribute('aria-hidden', 'true');
    gsap.set(about, { autoAlpha: 1 });
    gsap.set(aboutContent, { clearProps: 'clipPath' });
    gsap.set(aboutWords, { color: READ_COLOR });
    root.dataset.identityState = 'reduced';
    root.dataset.scrollProgress = '0.000';
    root.dataset.identityProgress = '0.000';
    root.dataset.aboutRevealProgress = '1.000';
    root.dataset.readingProgress = '1.000';
    root.dataset.scrollStart = '0';
    root.dataset.scrollDistance = '0';
    root.dataset.aboutWordCount = aboutWords.length.toString();
    about.dataset.readingProgress = '1.000';
  };

  const navigateToSection = (id) => {
    if (reducedMotion || !trigger) {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
      return;
    }
    const targetOffset =
      id === 'skills'
        ? identityDistance + educationDistance + skillsDistance * SKILLS_INTRO_END
        : id === 'education'
          ? identityDistance + educationDistance * EDUCATION_INTRO_END
          : id === 'about'
            ? identityDistance * IDENTITY_HANDOFF
            : 0;
    window.scrollTo({
      top: trigger.start + targetOffset,
      behavior: 'smooth',
    });
  };

  const onNavigationRequest = (event) => {
    if (
      event.detail?.id === 'home' ||
      event.detail?.id === 'about' ||
      event.detail?.id === 'education' ||
      event.detail?.id === 'skills'
    ) {
      navigateToSection(event.detail.id);
    }
  };
  const onCueClick = (event) => {
    event.preventDefault();
    navigateToSection('about');
  };

  clearIdentityTransforms();
  measure();

  const educationSequence = createEducationSequence({
    about,
    aboutContent,
    root,
  });
  const skillsSequence = createSkillsSequence({
    educationStage,
    root,
  });

  const measureScrollDistances = () => {
    identityDistance = getIdentityScrollDistance();
    educationDistance = educationSequence.getScrollDistance();
    skillsDistance = skillsSequence.getScrollDistance();
    totalDistance = identityDistance + educationDistance + skillsDistance;
    root.dataset.scrollDistance = Math.round(identityDistance).toString();
    root.dataset.educationScrollDistance = Math.round(educationDistance).toString();
    root.dataset.skillsScrollDistance = Math.round(skillsDistance).toString();
    root.dataset.masterScrollDistance = Math.round(totalDistance).toString();
  };

  const readScrollState = (self) => {
    const offset = gsap.utils.clamp(0, totalDistance, self.scroll() - self.start);
    return {
      education:
        educationDistance > 0
          ? gsap.utils.clamp(0, 1, (offset - identityDistance) / educationDistance)
          : 0,
      identity:
        identityDistance > 0 ? gsap.utils.clamp(0, 1, offset / identityDistance) : 0,
      skills:
        skillsDistance > 0
          ? gsap.utils.clamp(
              0,
              1,
              (offset - identityDistance - educationDistance) / skillsDistance,
            )
          : 0,
    };
  };

  const applyScrollState = ({ education, identity, skills }) => {
    if (skills > 0.0001) {
      timeline.progress(identity, true);
      onProgress(identity);
      educationSequence.setProgress(education);
      skillsSequence.setProgress(skills);
    } else if (education > 0.0001) {
      skillsSequence.resetBoundary();
      timeline.progress(identity, true);
      onProgress(identity);
      educationSequence.setProgress(education);
    } else {
      skillsSequence.resetBoundary();
      educationSequence.resetBoundary();
      timeline.progress(identity, true);
      onProgress(identity);
    }
    root.dataset.masterScrollProgress = (
      totalDistance > 0
        ? (identity * identityDistance +
            education * educationDistance +
            skills * skillsDistance) /
          totalDistance
        : 0
    ).toFixed(3);
    syncActiveSection(identity, education, skills);
  };

  if (reducedMotion) {
    applyReducedComposition();
    educationSequence.applyReduced();
    skillsSequence.applyReduced();
    root.dataset.educationScrollDistance = '0';
    root.dataset.skillsScrollDistance = '0';
    root.dataset.masterScrollDistance = '0';
    root.dataset.masterScrollProgress = '0.000';
  } else {
    buildTimeline();
    measureScrollDistances();
    trigger = ScrollTrigger.create({
      anticipatePin: 1,
      end: () => `+=${totalDistance}`,
      invalidateOnRefresh: true,
      onRefreshInit: (self) => {
        refreshState = resizeState ?? readScrollState(self);
        timeline.progress(0, true);
        educationSequence.resetBoundary();
        skillsSequence.resetBoundary();
        clearIdentityTransforms();
        measure();
        timeline.invalidate();
        educationSequence.rebuild();
        skillsSequence.rebuild();
        measureScrollDistances();
      },
      onRefresh: (self) => {
        const restoredScroll =
          self.start +
          refreshState.identity * identityDistance +
          refreshState.education * educationDistance;
        const skillsRestoredScroll =
          restoredScroll + refreshState.skills * skillsDistance;
        if (Math.abs(self.scroll() - skillsRestoredScroll) > 1)
          self.scroll(skillsRestoredScroll);
        applyScrollState(refreshState);
        resizeState = null;
        root.dataset.scrollStart = Math.round(self.start).toString();
        measureScrollDistances();
      },
      onUpdate: (self) => applyScrollState(readScrollState(self)),
      pin: true,
      pinSpacing: true,
      scrub: true,
      start: 'top top',
      trigger: root,
    });
  }

  window.addEventListener('kinetic:navigate-section', onNavigationRequest);
  cue.addEventListener('click', onCueClick);

  const contentObserver = new MutationObserver(() => {
    aboutWords = [...about.querySelectorAll(ABOUT_WORD_SELECTOR)];
    if (reducedMotion) {
      gsap.set(aboutWords, { color: READ_COLOR });
      root.dataset.aboutWordCount = aboutWords.length.toString();
      return;
    }

    const preservedState = trigger
      ? readScrollState(trigger)
      : { education: 0, identity: 0, skills: 0 };
    window.cancelAnimationFrame(contentFrame);
    contentFrame = window.requestAnimationFrame(() => {
      timeline.progress(0, true);
      clearIdentityTransforms();
      buildTimeline();
      applyScrollState(preservedState);
      resizeState = preservedState;
      ScrollTrigger.refresh();
    });
  });
  contentObserver.observe(aboutNarrative, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  const educationTrack = root.querySelector('[data-education-track]');
  const educationObserver = new MutationObserver(() => {
    if (reducedMotion) {
      educationSequence.applyReduced();
      return;
    }

    const preservedState = trigger
      ? readScrollState(trigger)
      : { education: 0, identity: 0, skills: 0 };
    window.cancelAnimationFrame(contentFrame);
    contentFrame = window.requestAnimationFrame(() => {
      educationSequence.rebuild();
      measureScrollDistances();
      resizeState = preservedState;
      ScrollTrigger.refresh();
    });
  });
  if (educationTrack) {
    educationObserver.observe(educationTrack, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  }

  const skillsFormation = root.querySelector('[data-skills-formation]');
  const skillsObserver = new MutationObserver(() => {
    if (reducedMotion) {
      skillsSequence.applyReduced();
      return;
    }
    const preservedState = trigger
      ? readScrollState(trigger)
      : { education: 0, identity: 0, skills: 0 };
    window.cancelAnimationFrame(contentFrame);
    contentFrame = window.requestAnimationFrame(() => {
      skillsSequence.rebuild();
      measureScrollDistances();
      resizeState = preservedState;
      ScrollTrigger.refresh();
    });
  });
  if (skillsFormation) {
    skillsObserver.observe(skillsFormation, {
      childList: true,
      subtree: true,
    });
  }

  root.dataset.scrollIdentity = 'ready';
  if (reducedMotion) {
    root.dataset.cueReveal = 'complete';
  } else {
    root.dataset.cueReveal = 'revealing';
    cueRevealTween = gsap.fromTo(
      cue,
      { autoAlpha: 0, y: 6 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.34,
        ease: 'power2.out',
        onComplete: () => {
          cueRevealTween = null;
          root.dataset.cueReveal = 'complete';
        },
      },
    );
  }
  root.dispatchEvent(new CustomEvent('kinetic:scroll-identity-ready'));

  const onResize = () => {
    if (reducedMotion) return;
    resizeState = trigger
      ? readScrollState(trigger)
      : { education: 0, identity: 0, skills: 0 };
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
  };
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });

  return {
    destroy() {
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('kinetic:navigate-section', onNavigationRequest);
      cue.removeEventListener('click', onCueClick);
      contentObserver.disconnect();
      educationObserver.disconnect();
      skillsObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      window.cancelAnimationFrame(contentFrame);
      trigger?.kill();
      timeline?.kill();
      educationSequence.destroy();
      skillsSequence.destroy();
      cueRevealTween?.kill();
      destination.setAttribute('aria-hidden', 'true');
      wordmark.removeAttribute('aria-hidden');
      about.setAttribute('aria-hidden', 'true');
      about.inert = true;
      gsap.set(glyphs, {
        clearProps:
          'opacity,visibility,transform,color,zIndex,webkitTextFillColor,webkitTextStrokeColor,webkitTextStrokeWidth',
      });
      gsap.set(support, { clearProps: 'opacity,visibility,transform' });
      gsap.set(cue, { clearProps: 'opacity,visibility,transform' });
      gsap.set(about, { clearProps: 'opacity,visibility' });
      gsap.set(aboutContent, { clearProps: 'clipPath' });
      gsap.set(aboutWords, { clearProps: 'color' });
      cue.hidden = true;
      cue.removeAttribute('href');
      cue.setAttribute('aria-hidden', 'true');
      cue.tabIndex = -1;
      destination.remove();
      for (const glyph of [aGlyph, sGlyph]) {
        delete glyph.dataset.monogramTargetLeft;
        delete glyph.dataset.monogramTargetTop;
        delete glyph.dataset.monogramTargetWidth;
        delete glyph.dataset.monogramTargetHeight;
      }
      delete root.dataset.scrollIdentity;
      delete root.dataset.scrollProgress;
      delete root.dataset.scrollStart;
      delete root.dataset.scrollDistance;
      delete root.dataset.educationScrollDistance;
      delete root.dataset.skillsScrollDistance;
      delete root.dataset.masterScrollDistance;
      delete root.dataset.masterScrollProgress;
      delete root.dataset.identityState;
      delete root.dataset.identityProgress;
      delete root.dataset.identityHandoffProgress;
      delete root.dataset.aboutRevealProgress;
      delete root.dataset.readingProgress;
      delete root.dataset.aboutWordCount;
      delete root.dataset.cueReveal;
      delete root.dataset.monogramVisibleHeight;
      delete root.dataset.monogramVisibleWidth;
    },
  };
}

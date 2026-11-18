import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const HERO_SECTIONS = Object.freeze([
  { id: 'home', index: '01', label: 'Home' },
  { id: 'about', index: '02', label: 'About' },
  { id: 'education', index: '03', label: 'Education' },
  { id: 'skills', index: '04', label: 'Skills' },
  { id: 'projects', index: '05', label: 'Projects' },
  { id: 'contact', index: '06', label: 'Contact' },
]);

const INITIAL_AVAILABLE_SECTIONS = Object.freeze(['home']);

function SectionItem({ section, activeId, availableIds, onNavigate, mobile = false }) {
  const isAvailable = availableIds.includes(section.id);
  const isActive = activeId === section.id;
  const className = `hero-navigation__item${isActive ? ' is-active' : ''}${
    isAvailable ? '' : ' is-unavailable'
  }${mobile ? ' is-mobile' : ''}`;
  const content = mobile ? (
    <>
      <span className="hero-navigation__index" aria-hidden="true">
        {section.index}
      </span>
      <span>{section.label}</span>
    </>
  ) : (
    <>
      <span
        className="hero-navigation__index hero-navigation__weight-slot"
        aria-hidden="true"
      >
        <span className="hero-navigation__weight-layer">{section.index}</span>
        <span className="hero-navigation__weight-reserve">{section.index}</span>
      </span>
      <span className="hero-navigation__label hero-navigation__weight-slot">
        <span className="hero-navigation__weight-layer">{section.label}</span>
        <span className="hero-navigation__weight-reserve" aria-hidden="true">
          {section.label}
        </span>
      </span>
    </>
  );

  return (
    <li data-menu-item={mobile ? '' : undefined}>
      {isAvailable ? (
        <a
          className={className}
          href={`#${section.id}`}
          aria-current={isActive ? 'page' : undefined}
          onClick={onNavigate}
        >
          {content}
        </a>
      ) : (
        <span className={className} aria-disabled="true">
          {content}
        </span>
      )}
    </li>
  );
}

function MenuMark() {
  return (
    <span className="hero-navigation__trigger-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function HeroNavigation() {
  const [availableIds, setAvailableIds] = useState(INITIAL_AVAILABLE_SECTIONS);
  const [activeId, setActiveId] = useState('home');
  const [menuPhase, setMenuPhase] = useState('closed');
  const [gsapApi, setGsapApi] = useState(null);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const menuTimelineRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const previousOverflowRef = useRef('');
  const pageLockedRef = useRef(false);

  useEffect(() => {
    let isCurrent = true;
    import('../animation/gsap.js').then(({ gsap }) => {
      if (isCurrent) setGsapApi(gsap);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const syncAvailableSections = () => {
      const next = HERO_SECTIONS.filter(({ id }) => document.getElementById(id)).map(
        ({ id }) => id,
      );
      setAvailableIds((current) =>
        current.length === next.length && current.every((id, index) => id === next[index])
          ? current
          : next,
      );
    };

    syncAvailableSections();
    const observer = new MutationObserver(syncAvailableSections);
    observer.observe(document.querySelector('main'), { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionElements = availableIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (sectionElements.length === 0) return undefined;

    const visibility = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          visibility.set(entry.target.id, entry.intersectionRatio),
        );
        const next = [...visibility.entries()].sort((a, b) => b[1] - a[1])[0];
        if (next?.[1] > 0) setActiveId(next[0]);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.15, 0.5] },
    );
    sectionElements.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [availableIds]);

  useEffect(() => {
    const syncActiveSection = (event) => {
      const nextId = event.detail?.id;
      if (HERO_SECTIONS.some(({ id }) => id === nextId)) setActiveId(nextId);
    };

    window.addEventListener('kinetic:section-change', syncActiveSection);
    return () => window.removeEventListener('kinetic:section-change', syncActiveSection);
  }, []);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !gsapApi || menuPhase === 'closed') return undefined;
    const gsap = gsapApi;

    const surface = dialog.querySelector('.hero-navigation__surface');
    const panel = dialog.querySelector('.hero-navigation__panel');
    const items = [...dialog.querySelectorAll('[data-menu-item]')];
    const menuLabel = dialog.querySelector('.hero-navigation__control-label--menu');
    const closeLabel = dialog.querySelector('.hero-navigation__control-label--close');
    const markLines = [...dialog.querySelectorAll('.hero-navigation__trigger-mark span')];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    menuTimelineRef.current?.kill();

    if (menuPhase === 'opening') {
      if (!pageLockedRef.current) {
        scrollPositionRef.current = window.scrollY;
        previousOverflowRef.current = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        pageLockedRef.current = true;
      }

      dialog.inert = false;
      if (!dialog.open) dialog.showModal();
      gsap.set(surface, { scaleY: 0 });
      gsap.set(panel, { y: -8 });
      gsap.set(items, { autoAlpha: 0, y: -14 });
      gsap.set(menuLabel, { autoAlpha: 1, y: 0 });
      gsap.set(closeLabel, { autoAlpha: 0, y: 5 });
      gsap.set(markLines[0], { rotation: 0, y: -3.5, width: '100%' });
      gsap.set(markLines[1], { rotation: 0, y: 3.5, width: '64%' });
      closeRef.current?.focus({ preventScroll: true });

      if (reducedMotion) {
        gsap.set(surface, { scaleY: 1 });
        gsap.set(panel, { y: 0 });
        gsap.set(items, { autoAlpha: 1, y: 0 });
        gsap.set(menuLabel, { autoAlpha: 0, y: -5 });
        gsap.set(closeLabel, { autoAlpha: 1, y: 0 });
        gsap.set(markLines[0], { rotation: 45, y: 0, width: '100%' });
        gsap.set(markLines[1], { rotation: -45, y: 0, width: '100%' });
        window.requestAnimationFrame(() => setMenuPhase('open'));
        return undefined;
      }

      const timeline = gsap.timeline({ onComplete: () => setMenuPhase('open') });
      menuTimelineRef.current = timeline;
      timeline
        .to(surface, {
          scaleY: 1,
          duration: 0.44,
          ease: 'power3.out',
        })
        .to(panel, { y: 0, duration: 0.34, ease: 'power3.out' }, 0.04)
        .to(
          items,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.24,
            stagger: 0.025,
            ease: 'power2.out',
          },
          0.1,
        )
        .to(menuLabel, { autoAlpha: 0, y: -5, duration: 0.16, ease: 'power2.out' }, 0.1)
        .to(closeLabel, { autoAlpha: 1, y: 0, duration: 0.18, ease: 'power2.out' }, 0.13)
        .to(markLines[0], { rotation: 45, y: 0, duration: 0.22, ease: 'power2.out' }, 0.1)
        .to(
          markLines[1],
          { rotation: -45, y: 0, width: '100%', duration: 0.22, ease: 'power2.out' },
          0.1,
        );

      return () => timeline.kill();
    }

    if (menuPhase === 'closing') {
      dialog.inert = true;
      const finishClose = () => {
        if (dialog.open) dialog.close();
        dialog.inert = false;
        gsap.set([surface, panel, ...items, menuLabel, closeLabel, ...markLines], {
          clearProps: 'all',
        });
        if (pageLockedRef.current) {
          document.documentElement.style.overflow = previousOverflowRef.current;
          window.scrollTo(0, scrollPositionRef.current);
          pageLockedRef.current = false;
        }
        setMenuPhase('closed');
        window.requestAnimationFrame(() =>
          triggerRef.current?.focus({ preventScroll: true }),
        );
      };

      if (reducedMotion) {
        finishClose();
        return undefined;
      }

      const timeline = gsap.timeline({ onComplete: finishClose });
      menuTimelineRef.current = timeline;
      timeline
        .to(items, {
          autoAlpha: 0,
          y: -10,
          duration: 0.16,
          stagger: { each: 0.018, from: 'end' },
          ease: 'power2.in',
        })
        .to(closeLabel, { autoAlpha: 0, y: -5, duration: 0.12 }, 0.02)
        .to(menuLabel, { autoAlpha: 1, y: 0, duration: 0.15 }, 0.06)
        .to(markLines[0], { rotation: 0, y: -3.5, duration: 0.18 }, 0.03)
        .to(markLines[1], { rotation: 0, y: 3.5, width: '64%', duration: 0.18 }, 0.03)
        .to(panel, { y: -6, duration: 0.24, ease: 'power2.inOut' }, 0.1)
        .to(
          surface,
          {
            scaleY: 0,
            duration: 0.28,
            ease: 'power2.inOut',
          },
          0.1,
        );

      return () => timeline.kill();
    }

    return undefined;
  }, [gsapApi, menuPhase]);

  useEffect(
    () => () => {
      menuTimelineRef.current?.kill();
      const dialog = dialogRef.current;
      if (dialog?.open) dialog.close();
      if (pageLockedRef.current) {
        document.documentElement.style.overflow = previousOverflowRef.current;
        window.scrollTo(0, scrollPositionRef.current);
        pageLockedRef.current = false;
      }
    },
    [],
  );

  const openMenu = () => {
    if (menuPhase === 'closed') setMenuPhase('opening');
  };
  const closeMenu = () => {
    if (menuPhase === 'opening' || menuPhase === 'open') setMenuPhase('closing');
  };
  const navigateToSection = (section, event) => {
    const isTimelineSection =
      section.id === 'home' || section.id === 'about' || section.id === 'education';
    if (!isTimelineSection && menuPhase === 'closed') return;

    event.preventDefault();
    const completeNavigation = () => {
      if (isTimelineSection) {
        window.dispatchEvent(
          new CustomEvent('kinetic:navigate-section', { detail: { id: section.id } }),
        );
      } else {
        document.getElementById(section.id)?.scrollIntoView({ block: 'start' });
      }
    };

    if (menuPhase === 'closed') {
      completeNavigation();
      return;
    }

    dialogRef.current?.addEventListener('close', completeNavigation, { once: true });
    closeMenu();
  };
  const isMenuActive = menuPhase !== 'closed';

  return (
    <div className="hero-navigation">
      <nav className="hero-navigation__desktop" aria-label="Portfolio sections">
        <ol>
          {HERO_SECTIONS.map((section) => (
            <SectionItem
              key={section.id}
              section={section}
              activeId={activeId}
              availableIds={availableIds}
              onNavigate={(event) => navigateToSection(section, event)}
            />
          ))}
        </ol>
      </nav>

      <button
        ref={triggerRef}
        className="hero-navigation__trigger"
        type="button"
        aria-controls="hero-mobile-navigation"
        aria-expanded={isMenuActive}
        onClick={openMenu}
      >
        <span>Menu</span>
        <MenuMark />
      </button>

      <dialog
        ref={dialogRef}
        id="hero-mobile-navigation"
        className="hero-navigation__dialog"
        data-menu-state={menuPhase}
        aria-labelledby="hero-mobile-navigation-title"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
      >
        <div className="hero-navigation__surface" aria-hidden="true" />
        <div className="hero-navigation__panel">
          <header className="hero-navigation__panel-header">
            <p id="hero-mobile-navigation-title">Portfolio</p>
            <button
              ref={closeRef}
              className="hero-navigation__close"
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMenu}
            >
              <span className="hero-navigation__control-label" aria-hidden="true">
                <span className="hero-navigation__control-label--menu">Menu</span>
                <span className="hero-navigation__control-label--close">Close</span>
              </span>
              <MenuMark />
            </button>
          </header>

          <nav aria-label="Mobile portfolio sections">
            <ol>
              {HERO_SECTIONS.map((section) => (
                <SectionItem
                  key={section.id}
                  section={section}
                  activeId={activeId}
                  availableIds={availableIds}
                  onNavigate={(event) => navigateToSection(section, event)}
                  mobile
                />
              ))}
            </ol>
          </nav>
        </div>
      </dialog>
    </div>
  );
}

export default HeroNavigation;

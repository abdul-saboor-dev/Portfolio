import { useLayoutEffect, useState } from 'react';

const NEXT_SECTION_IDS = Object.freeze([
  'about',
  'education',
  'skills',
  'projects',
  'contact',
]);

function HeroScrollCue() {
  const [targetId, setTargetId] = useState(null);

  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;

    const syncTarget = () => {
      const nextTarget = NEXT_SECTION_IDS.find((id) => document.getElementById(id));
      setTargetId((current) => (current === nextTarget ? current : nextTarget || null));
    };

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const isAvailable = Boolean(targetId);

  return (
    <a
      className="kinetic-hero__scroll-cue"
      href={isAvailable ? `#${targetId}` : undefined}
      hidden={!isAvailable}
      aria-hidden={isAvailable ? undefined : 'true'}
      tabIndex={isAvailable ? undefined : -1}
    >
      Scroll to Explore <span aria-hidden="true">↓</span>
    </a>
  );
}

export default HeroScrollCue;

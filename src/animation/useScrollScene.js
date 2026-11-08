import { useLayoutEffect } from 'react';

import { gsap } from './gsap.js';

export function useScrollScene(scope, setup) {
  useLayoutEffect(() => {
    if (!scope?.current || !setup) return undefined;

    const context = gsap.context(() => setup(), scope);
    return () => context.revert();
  }, [scope, setup]);
}

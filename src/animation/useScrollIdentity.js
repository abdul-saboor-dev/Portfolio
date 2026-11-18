import { useLayoutEffect } from 'react';

export function useScrollIdentity(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let controller;
    let disposed = false;
    const dialog = root.querySelector('.hero-navigation__dialog');

    const start = async () => {
      if (controller || disposed || root.dataset.entrance !== 'complete') return;
      const { createScrollIdentity } = await import('./scrollIdentity.js');
      if (disposed || root.dataset.entrance !== 'complete') return;
      if (dialog?.open) {
        dialog.addEventListener('close', start, { once: true });
        return;
      }
      controller = createScrollIdentity(root);
    };

    const onEntranceComplete = () => void start();
    root.addEventListener('kinetic:entrance-complete', onEntranceComplete);
    void start();

    return () => {
      disposed = true;
      root.removeEventListener('kinetic:entrance-complete', onEntranceComplete);
      dialog?.removeEventListener('close', start);
      controller?.destroy();
    };
  }, [rootRef]);
}

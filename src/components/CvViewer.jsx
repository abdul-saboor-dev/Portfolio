import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '../animation/gsap.js';
import ViewerCloseButton from './ViewerCloseButton.jsx';

function CvViewer({ document: cvDocument, label }) {
  const [phase, setPhase] = useState('closed');
  const [zoom, setZoom] = useState(1);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const previousOverflowRef = useRef('');
  const pageLockedRef = useRef(false);
  const timelineRef = useRef(null);
  const titleId = useId();

  const closeViewer = () => {
    if (phase === 'opening' || phase === 'open') setPhase('closing');
  };

  useLayoutEffect(() => {
    if (phase === 'closed') return undefined;
    const dialog = dialogRef.current;
    const root = document.documentElement;
    const panel = dialog.querySelector('.cv-viewer__panel');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    timelineRef.current?.kill();
    const finishClose = () => {
      if (dialog.open) dialog.close();
      gsap.set([dialog, panel], { clearProps: 'all' });
      if (pageLockedRef.current) {
        root.style.overflow = previousOverflowRef.current;
        window.scrollTo(0, scrollPositionRef.current);
        pageLockedRef.current = false;
      }
      setPhase('closed');
      requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
    };

    if (phase === 'opening') {
      if (!pageLockedRef.current) {
        scrollPositionRef.current = window.scrollY;
        previousOverflowRef.current = root.style.overflow;
        root.style.overflow = 'hidden';
        pageLockedRef.current = true;
      }
      if (!dialog.open) dialog.showModal();
      dialog.inert = false;
      gsap.set(dialog, { clipPath: 'inset(0 0 100% 0 round 16px)', y: -8 });
      gsap.set(panel, { y: -8 });
      closeRef.current?.focus({ preventScroll: true });
      if (reduced) {
        gsap.set(dialog, { clipPath: 'inset(0 0 0% 0 round 16px)', y: 0 });
        gsap.set(panel, { y: 0 });
        requestAnimationFrame(() => setPhase('open'));
        return undefined;
      }
      const timeline = gsap.timeline({ onComplete: () => setPhase('open') });
      timelineRef.current = timeline;
      timeline
        .to(dialog, {
          clipPath: 'inset(0 0 0% 0 round 16px)',
          y: 0,
          duration: 0.44,
          ease: 'power3.out',
        })
        .to(panel, { y: 0, duration: 0.34, ease: 'power3.out' }, 0.04);
      return () => timeline.kill();
    }
    if (phase === 'closing') {
      dialog.inert = true;
      if (reduced) {
        finishClose();
        return undefined;
      }
      const timeline = gsap.timeline({ onComplete: finishClose });
      timelineRef.current = timeline;
      timeline.to(panel, { y: -6, duration: 0.24, ease: 'power2.inOut' }).to(
        dialog,
        {
          clipPath: 'inset(0 0 100% 0 round 16px)',
          y: -8,
          duration: 0.28,
          ease: 'power2.inOut',
        },
        0.1,
      );
      return () => timeline.kill();
    }
    return undefined;
  }, [phase]);

  useEffect(
    () => () => {
      timelineRef.current?.kill();
      if (dialogRef.current?.open) dialogRef.current.close();
      if (pageLockedRef.current) {
        document.documentElement.style.overflow = previousOverflowRef.current;
        window.scrollTo(0, scrollPositionRef.current);
      }
    },
    [],
  );

  return (
    <>
      <button
        ref={triggerRef}
        className="kinetic-hero__action"
        type="button"
        onClick={() => phase === 'closed' && setPhase('opening')}
      >
        <span>{label}</span>
        <span className="kinetic-hero__action-arrow" aria-hidden="true">
          ↗
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="cv-viewer"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          closeViewer();
        }}
        onClose={() => setPhase('closed')}
      >
        <div className="cv-viewer__panel">
          <header className="cv-viewer__header">
            <div>
              <p className="cv-viewer__eyebrow">Curriculum vitae</p>
              <h2 id={titleId}>{cvDocument.demo ? 'CV' : cvDocument.title}</h2>
            </div>
            <ViewerCloseButton
              ref={closeRef}
              label="Close CV viewer"
              onClick={closeViewer}
            />
          </header>

          <div className="cv-viewer__document">
            {cvDocument.previewImageUrl ? (
              <img
                src={cvDocument.previewImageUrl}
                alt={`${cvDocument.title} document preview`}
                style={{ width: `${zoom * 100}%`, maxWidth: `${zoom * 46}rem` }}
              />
            ) : (
              <iframe src={cvDocument.url} title={cvDocument.title} />
            )}
          </div>

          <footer className="cv-viewer__footer">
            <p>A4 PDF</p>
            {cvDocument.previewImageUrl && (
              <div className="cv-viewer__zoom" aria-label="Document zoom">
                <button
                  type="button"
                  aria-label="Zoom out"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                >
                  −
                </button>
                <output>{Math.round(zoom * 100)}%</output>
                <button
                  type="button"
                  aria-label="Zoom in"
                  disabled={zoom >= 2}
                  onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
                >
                  +
                </button>
              </div>
            )}
            {cvDocument.downloadAvailable !== false && (
              <a
                className="cv-viewer__download"
                href={cvDocument.url}
                download={cvDocument.filename || undefined}
              >
                Download PDF <span aria-hidden="true">↓</span>
              </a>
            )}
          </footer>
        </div>
      </dialog>
    </>
  );
}

export default CvViewer;

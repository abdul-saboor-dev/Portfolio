import { useEffect, useId, useRef, useState } from 'react';

function CvViewer({ document: cvDocument, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const previousOverflowRef = useRef('');
  const titleId = useId();

  const closeViewer = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const root = document.documentElement;
    scrollPositionRef.current = window.scrollY;
    previousOverflowRef.current = root.style.overflow;
    root.style.overflow = 'hidden';
    dialog.showModal();
    window.requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = previousOverflowRef.current;
      window.scrollTo(0, scrollPositionRef.current);
      window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        className="kinetic-hero__action"
        type="button"
        onClick={() => setIsOpen(true)}
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
        onClose={() => setIsOpen(false)}
      >
        <div className="cv-viewer__panel">
          <header className="cv-viewer__header">
            <div>
              <p className="cv-viewer__eyebrow">Curriculum vitae</p>
              <h2 id={titleId}>{cvDocument.title}</h2>
            </div>
            <button
              ref={closeRef}
              className="cv-viewer__close"
              type="button"
              aria-label="Close CV viewer"
              onClick={closeViewer}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="cv-viewer__document">
            <object data={cvDocument.url} type="application/pdf" title={cvDocument.title}>
              <p>
                This browser cannot display the PDF preview. Use the download action to
                view the document.
              </p>
            </object>
          </div>

          <footer className="cv-viewer__footer">
            <a
              className="cv-viewer__download"
              href={cvDocument.url}
              download={cvDocument.filename || undefined}
            >
              Download PDF <span aria-hidden="true">↓</span>
            </a>
          </footer>
        </div>
      </dialog>
    </>
  );
}

export default CvViewer;

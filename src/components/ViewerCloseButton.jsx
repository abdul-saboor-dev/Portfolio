import { forwardRef } from 'react';

const ViewerCloseButton = forwardRef(function ViewerCloseButton({ label, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="portfolio-viewer__close"
      aria-label={label}
      onClick={onClick}
    >
      <span aria-hidden="true" />
    </button>
  );
});

export default ViewerCloseButton;

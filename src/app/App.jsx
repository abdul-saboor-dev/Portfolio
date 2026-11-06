/**
 * App.jsx
 * Mouse-controlled portrait — 340 frames chasing the cursor.
 */

import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import '../styles/App.css';

export default function App() {
  const { getImage, loadedSet, isCenterLoaded } = useFramePreloader();

  return (
    <div className="app">
      {/* ── Loading indicator (shown only until the center frame is ready) ── */}
      {!isCenterLoaded && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p className="loading-text">Loading portrait…</p>
        </div>
      )}

      {/* ── Portrait Stage ── */}
      <div className="portrait-stage" onContextMenu={(e) => e.preventDefault()}>
        <PortraitCanvas
          getImage={getImage}
          loadedSet={loadedSet}
          isCenterLoaded={isCenterLoaded}
        />
      </div>
    </div>
  );
}

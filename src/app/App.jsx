/**
 * App.jsx
 * Mouse-controlled Portrait Demo — Main Application
 */

import { useCallback, useRef } from 'react';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import { NEUTRAL_YAW, NEUTRAL_PITCH } from '../features/portrait/frameData.js';
import '../styles/App.css';

export default function App() {
  // Ref to PortraitCanvas imperative handle (for recenter)
  const canvasRef = useRef(null);

  // Shared ref for continuous 60fps pose and canvas element (no React re-renders)
  const poseRef = useRef({
    yaw: NEUTRAL_YAW,
    pitch: NEUTRAL_PITCH,
    canvas: null,
  });

  const { getImage, loadedSet, isCenterLoaded } = useFramePreloader();

  const handleFrameChange = useCallback((_info) => {
    // Underlying frame info callback preserved
  }, []);

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
      <div
        className="portrait-stage"
        onContextMenu={(e) => e.preventDefault()}
      >
        <PortraitCanvas
          ref={canvasRef}
          poseRef={poseRef}
          getImage={getImage}
          loadedSet={loadedSet}
          isCenterLoaded={isCenterLoaded}
          onFrameChange={handleFrameChange}
        />
      </div>
    </div>
  );
}

/**
 * App.jsx
 * Mouse-controlled Portrait Demo — Main Application
 */

import { useState, useCallback, useRef } from 'react';
import PortraitCanvas from '../features/portrait/PortraitCanvas.jsx';
import LightRays from '../features/background/LightRays.jsx';
import { useFramePreloader } from '../features/portrait/useFramePreloader.js';
import { gridToIndex, NEUTRAL_YAW, NEUTRAL_PITCH } from '../features/portrait/frameData.js';
import '../styles/App.css';

const CENTER_IDX = gridToIndex(9, 9);

export default function App() {

  const [debugMode,  setDebugMode]  = useState(false);
  const [debugInfo,  setDebugInfo]  = useState({
    idx: CENTER_IDX, col: 9, row: 9, yaw: -1.1, pitch: -1.1,
  });

  // Ref to PortraitCanvas imperative handle (for recenter)
  const canvasRef = useRef(null);

  // Shared ref for continuous 60fps pose and canvas element (no React re-renders)
  const poseRef = useRef({
    yaw: NEUTRAL_YAW,
    pitch: NEUTRAL_PITCH,
    canvas: null,
  });

  const { getImage, loadedSet, loadedCount, total, isCenterLoaded } = useFramePreloader();

  const handleFrameChange = useCallback((info) => {
    setDebugInfo(info);
  }, []);

  // Trigger smooth recenter via the canvas imperative handle
  const handleRecenter = useCallback(() => {
    canvasRef.current?.recenter();
  }, []);

  const loadProgress = total > 0 ? Math.round((loadedCount / total) * 100) : 0;

  return (
    <div className="app">
      {/* ── Background: LightRays ── */}
      <LightRays
        className="background-rays"
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.5}
        lightSpread={0.85}
        rayLength={2.5}
        rayDensity={1}
        glow={0.35}
        haze={0.2}
        intensity={0.65}
        followMouse={true}
        mouseInfluence={0.06}
        cursorShadow={true}
        shadowRadius={75}
        shadowStrength={0.45}
        clickPulse={false}
        opacity={0.45}
        maxDevicePixelRatio={1.5}
      />

      {/* ── Controls ── */}
      <div className="controls">
        <button
          className="control-btn"
          onClick={handleRecenter}
          title="Return gaze to center"
          aria-label="Recenter portrait"
        >
          ◎
        </button>

        <button
          className={`control-btn ${debugMode ? 'active' : ''}`}
          onClick={() => setDebugMode(d => !d)}
          title="Toggle debug info"
          aria-label="Toggle debug"
        >
          ⚙
        </button>
      </div>

      {/* ── Debug Panel ── */}
      {debugMode && (
        <div className="debug-panel">
          <div className="debug-row">
            <span className="debug-label">Frame</span>
            <span className="debug-value">{String(debugInfo.idx).padStart(3, '0')}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Grid</span>
            <span className="debug-value">col {debugInfo.col} / row {debugInfo.row}</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Yaw</span>
            <span className="debug-value">{debugInfo.yaw?.toFixed(1)}°</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Pitch</span>
            <span className="debug-value">{debugInfo.pitch?.toFixed(1)}°</span>
          </div>
          <div className="debug-row">
            <span className="debug-label">Loaded</span>
            <span className="debug-value">{loadedCount} / {total}</span>
          </div>
          <div className="debug-progress">
            <div
              className="debug-progress-fill"
              style={{ width: `${loadProgress}%` }}
            />
          </div>
        </div>
      )}

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

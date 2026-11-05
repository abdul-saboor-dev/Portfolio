/**
 * useFramePreloader.js
 * Progressive frame preloader with concurrency control.
 *
 * Tier 1: Center frame (idx 189) — loaded synchronously first
 * Tier 2: Remaining frames in radial order from center
 * Concurrency: max 6 parallel image loads at a time
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildPreloadOrder, getFrameUrl, gridToIndex, COLS, ROWS } from './frameData.js';

const CENTER_IDX = gridToIndex(9, 9); // idx 189
const CONCURRENCY = 6;

export function useFramePreloader() {
  // images[idx] = HTMLImageElement (loaded) or undefined
  const imagesRef = useRef(new Array(COLS * ROWS).fill(null));
  const loadedSetRef = useRef(new Set());
  const [loadedCount, setLoadedCount] = useState(0);
  const [centerLoadError, setCenterLoadError] = useState(false);

  const loadedCountRef = useRef(0);
  const queueRef = useRef([]);
  const activeRef = useRef(0);

  const processQueue = useCallback(() => {
    while (activeRef.current < CONCURRENCY && queueRef.current.length > 0) {
      const idx = queueRef.current.shift();
      const { col, row } = { col: idx % COLS, row: Math.floor(idx / COLS) };
      const img = new Image();
      activeRef.current++;

      img.onload = () => {
        imagesRef.current[idx] = img;
        loadedSetRef.current.add(idx);
        loadedCountRef.current++;
        activeRef.current--;
        setLoadedCount(loadedCountRef.current);
        processQueue();
      };

      img.onerror = () => {
        // Mark as failed but continue
        activeRef.current--;
        processQueue();
      };

      img.src = getFrameUrl(col, row);
    }
  }, []);

  useEffect(() => {
    const preloadOrder = buildPreloadOrder();

    // Tier 1: Load center frame immediately
    const centerImg = new Image();
    let centerHandled = false;
    activeRef.current++;

    const onCenterSuccess = () => {
      if (centerHandled) return;
      centerHandled = true;
      imagesRef.current[CENTER_IDX] = centerImg;
      loadedSetRef.current.add(CENTER_IDX);
      loadedCountRef.current++;
      activeRef.current--;
      setLoadedCount(loadedCountRef.current);
      setCenterLoadError(false);
      processQueue();
    };

    centerImg.onload = onCenterSuccess;
    centerImg.onerror = () => {
      if (centerHandled) return;
      centerHandled = true;
      activeRef.current--;
      setCenterLoadError(true);
      processQueue();
    };

    const centerCol = CENTER_IDX % COLS;
    const centerRow = Math.floor(CENTER_IDX / COLS);
    centerImg.src = getFrameUrl(centerCol, centerRow);

    if (centerImg.complete && centerImg.naturalWidth > 0) {
      onCenterSuccess();
    }

    // Enqueue remaining frames in radial order (skip center)
    queueRef.current = preloadOrder.filter(idx => idx !== CENTER_IDX);
    // Don't start queue yet — wait for center to load and call processQueue
  }, [processQueue]);

  const retryCenter = useCallback(() => {
    setCenterLoadError(false);
    const centerImg = new Image();
    activeRef.current++;
    centerImg.onload = () => {
      imagesRef.current[CENTER_IDX] = centerImg;
      loadedSetRef.current.add(CENTER_IDX);
      loadedCountRef.current++;
      activeRef.current--;
      setLoadedCount(loadedCountRef.current);
      setCenterLoadError(false);
      processQueue();
    };
    centerImg.onerror = () => {
      activeRef.current--;
      setCenterLoadError(true);
      processQueue();
    };
    const centerCol = CENTER_IDX % COLS;
    const centerRow = Math.floor(CENTER_IDX / COLS);
    centerImg.src = getFrameUrl(centerCol, centerRow);
  }, [processQueue]);

  const getImage = useCallback((idx) => {
    return imagesRef.current[idx] || null;
  }, []);

  return {
    getImage,
    loadedSet: loadedSetRef.current,
    loadedCount,
    total: COLS * ROWS,
    isCenterLoaded: loadedSetRef.current.has(CENTER_IDX),
    centerLoadError,
    retryCenter,
  };
}

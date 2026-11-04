/**
 * useFramePreloader.js
 * Progressive frame preloader with concurrency control and PNG fallback.
 *
 * Tier 1: Center frame (idx 189) — loaded synchronously first
 * Tier 2: Remaining frames in radial order from center
 * Concurrency: max 6 parallel image loads at a time
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildPreloadOrder, getFrameUrl, gridToIndex, COLS, ROWS } from './frameData.js';

const CENTER_IDX = gridToIndex(9, 9); // idx 189
const CONCURRENCY = 6;

function loadFrameImage(url, onSuccess, onError) {
  const img = new Image();
  img.onload = () => onSuccess(img);
  img.onerror = () => {
    // If WebP is unavailable or fails, gracefully fall back to existing PNG
    if (url.endsWith('.webp')) {
      const pngUrl = url.replace(/\.webp$/, '.png');
      const fallbackImg = new Image();
      fallbackImg.onload = () => onSuccess(fallbackImg);
      fallbackImg.onerror = onError;
      fallbackImg.src = pngUrl;
    } else {
      onError();
    }
  };
  img.src = url;
}

export function useFramePreloader() {
  const imagesRef = useRef(new Array(COLS * ROWS).fill(null));
  const [loadedSet, setLoadedSet] = useState(() => new Set());
  const [loadedCount, setLoadedCount] = useState(0);
  const [isCenterLoaded, setIsCenterLoaded] = useState(false);

  const loadedCountRef = useRef(0);
  const queueRef = useRef([]);
  const activeRef = useRef(0);

  const processQueue = useCallback(() => {
    function dequeue() {
      while (activeRef.current < CONCURRENCY && queueRef.current.length > 0) {
        const idx = queueRef.current.shift();
        const { col, row } = { col: idx % COLS, row: Math.floor(idx / COLS) };
        activeRef.current++;

        loadFrameImage(
          getFrameUrl(col, row),
          (img) => {
            imagesRef.current[idx] = img;
            setLoadedSet((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
            loadedCountRef.current++;
            activeRef.current--;
            setLoadedCount(loadedCountRef.current);
            dequeue();
          },
          () => {
            activeRef.current--;
            dequeue();
          }
        );
      }
    }
    dequeue();
  }, []);

  useEffect(() => {
    const preloadOrder = buildPreloadOrder();

    // Tier 1: Load center frame immediately
    activeRef.current++;
    const centerCol = CENTER_IDX % COLS;
    const centerRow = Math.floor(CENTER_IDX / COLS);

    loadFrameImage(
      getFrameUrl(centerCol, centerRow),
      (centerImg) => {
        imagesRef.current[CENTER_IDX] = centerImg;
        setLoadedSet((prev) => {
          const next = new Set(prev);
          next.add(CENTER_IDX);
          return next;
        });
        loadedCountRef.current++;
        activeRef.current--;
        setIsCenterLoaded(true);
        setLoadedCount(loadedCountRef.current);
        processQueue();
      },
      () => {
        activeRef.current--;
        processQueue();
      }
    );

    // Enqueue remaining frames in radial order (skip center)
    queueRef.current = preloadOrder.filter((idx) => idx !== CENTER_IDX);
  }, [processQueue]);

  const getImage = useCallback((idx) => {
    return imagesRef.current[idx] || null;
  }, []);

  return {
    getImage,
    loadedSet,
    loadedCount,
    total: COLS * ROWS,
    isCenterLoaded,
  };
}

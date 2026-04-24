// frontend/src/hooks/useGazeTracker.ts
import { useEffect, useRef, useState } from 'react';

// Types exposed to the rest of the app
export type GazePoint = {
  x: number;
  y: number;
  t: number; // timestamp (ms)
};

export type GazeCalibrationBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type UseGazeTrackerConfig = {
  interviewId: string;
  enabled: boolean;                 // Should tracking run?
  minAwayDurationMs?: number;       // How long user must look away before we flag
  smoothingWindowMs?: number;       // Rolling window for smoothing gaze samples
  minConfidence?: number;           // Ignore predictions below this
  marginPx?: number;                // Extra margin added to calibration box
  onAwayChange?: (isAway: boolean) => void; // Called when away status flips
  onFaceChange?: (isMissing: boolean) => void; // Called when face missing status flips
  onReadingDetected?: () => void;
  onHighCognitiveLoad?: () => void;
};

export type UseGazeTrackerState = {
  supported: boolean; // webgazer loaded?
  ready: boolean;     // at least one valid sample received
  isAway: boolean;    // currently outside safe zone for long enough
  lastGaze: GazePoint | null;
  calibrationBounds: GazeCalibrationBounds | null;
  isReading: boolean;
  isFaceMissing: boolean;
};

// ---- Module-level singletons so webgazer only starts once per page ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    webgazer?: any;
  }
}

let webgazerInitPromise: Promise<void> | null = null;

// Only start webgazer once. All hooks share this.
async function ensureWebgazerStarted(): Promise<void> {
  if (webgazerInitPromise) return webgazerInitPromise;

  if (!window.webgazer) {
    webgazerInitPromise = Promise.reject(
      new Error('WebGazer not available on window')
    );
    return webgazerInitPromise;
  }

  webgazerInitPromise = (async () => {
    const wg = window.webgazer;

    // Basic production-ready configuration
    wg.setRegression('ridge');
    wg.setTracker('clmtrackr');
    wg.showVideo(false);
    wg.showFaceOverlay(false);
    wg.showFaceFeedbackBox(false);
    wg.showPredictionPoints(false);

    // Start camera
    await wg.begin();
  })();

  return webgazerInitPromise;
}

// -------------------- Hook implementation --------------------

export function useGazeTracker(config: UseGazeTrackerConfig): UseGazeTrackerState {
  const {
    interviewId,
    enabled,
    minAwayDurationMs = 1500,
    smoothingWindowMs = 800,
    minConfidence = 0.5,
    marginPx = 60,
    onAwayChange,
    onFaceChange,
    onReadingDetected,
  } = config;

  const [supported, setSupported] = useState<boolean>(!!window.webgazer);
  const [ready, setReady] = useState(false);

  // ── Use refs for the "is currently X" booleans that live inside the gaze
  //    listener closure.  State variables captured in the closure go stale
  //    after the first render; refs always hold the latest value.
  const isAwayRef = useRef(false);
  const isFaceMissingRef = useRef(false);
  const isReadingRef = useRef(false);

  // Mirror refs to state so the component can re-render when they change
  const [isAway, setIsAway] = useState(false);
  const [isFaceMissing, setIsFaceMissing] = useState(false);
  const [isReading, setIsReading] = useState(false);

  const [calibrationBounds, setCalibrationBounds] =
    useState<GazeCalibrationBounds | null>(null);
  const [lastGaze, setLastGaze] = useState<GazePoint | null>(null);

  // rolling buffer of gaze samples
  const samplesRef = useRef<GazePoint[]>([]);
  const awaySinceRef = useRef<number | null>(null);
  const faceMissingSinceRef = useRef<number | null>(null);
  const listenerAttachedRef = useRef(false);

  // Keep callback refs fresh so the listener always calls the latest version
  const onAwayChangeRef = useRef(onAwayChange);
  const onFaceChangeRef = useRef(onFaceChange);
  const onReadingDetectedRef = useRef(onReadingDetected);
  useEffect(() => { onAwayChangeRef.current = onAwayChange; }, [onAwayChange]);
  useEffect(() => { onFaceChangeRef.current = onFaceChange; }, [onFaceChange]);
  useEffect(() => { onReadingDetectedRef.current = onReadingDetected; }, [onReadingDetected]);

  // calibration bounds ref (used inside listener closure)
  const calibrationBoundsRef = useRef<GazeCalibrationBounds | null>(null);
  const marginPxRef = useRef(marginPx);
  const minAwayDurationMsRef = useRef(minAwayDurationMs);
  const smoothingWindowMsRef = useRef(smoothingWindowMs);
  const minConfidenceRef = useRef(minConfidence);

  // Keep config refs fresh
  useEffect(() => { marginPxRef.current = marginPx; }, [marginPx]);
  useEffect(() => { minAwayDurationMsRef.current = minAwayDurationMs; }, [minAwayDurationMs]);
  useEffect(() => { smoothingWindowMsRef.current = smoothingWindowMs; }, [smoothingWindowMs]);
  useEffect(() => { minConfidenceRef.current = minConfidence; }, [minConfidence]);

  // Load calibration bounds from localStorage (written by BiometricSetup)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`gaze_calibration_${interviewId}`);
      if (!raw) {
        setCalibrationBounds(null);
        calibrationBoundsRef.current = null;
        return;
      }
      const parsed = JSON.parse(raw) as GazeCalibrationBounds;
      if (
        typeof parsed.minX === 'number' &&
        typeof parsed.maxX === 'number' &&
        typeof parsed.minY === 'number' &&
        typeof parsed.maxY === 'number'
      ) {
        setCalibrationBounds(parsed);
        calibrationBoundsRef.current = parsed;
      } else {
        setCalibrationBounds(null);
        calibrationBoundsRef.current = null;
      }
    } catch (e) {
      console.warn('Invalid gaze calibration data', e);
      setCalibrationBounds(null);
      calibrationBoundsRef.current = null;
    }
  }, [interviewId]);

  // Helper: uses refs so it is safe to call from any closure
  const isInsideSafeZone = (x: number, y: number): boolean => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = marginPxRef.current;
    const bounds = calibrationBoundsRef.current;

    if (!bounds) {
      return x >= margin && x <= vw - margin && y >= margin && y <= vh - margin;
    }

    return (
      x >= bounds.minX - margin &&
      x <= bounds.maxX + margin &&
      y >= bounds.minY - margin &&
      y <= bounds.maxY + margin
    );
  };

  // Reading detection using refs only — safe inside the gaze listener
  const analyzeGazeIntent = (samples: GazePoint[]) => {
    if (samples.length < 15) return;

    const yVals = samples.map(p => p.y);
    const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    const verticalVariance = yVals.reduce((a, b) => a + Math.pow(b - yMean, 2), 0) / yVals.length;

    let horizontalFlow = 0;
    for (let i = 1; i < samples.length; i++) {
      const dx = samples[i].x - samples[i - 1].x;
      if (dx > 5) horizontalFlow++;
      else if (dx < -100) horizontalFlow += 2;
    }

    const isScanning = horizontalFlow > samples.length * 0.6;
    const isStableLine = verticalVariance < 4000;
    const nowReading = isScanning && isStableLine;

    if (nowReading && !isReadingRef.current) {
      isReadingRef.current = true;
      setIsReading(true);
      onReadingDetectedRef.current?.();
    } else if (!nowReading && isReadingRef.current) {
      isReadingRef.current = false;
      setIsReading(false);
    }
  };

  // Core effect: start webgazer, attach gaze listener
  useEffect(() => {
    if (!enabled) {
      samplesRef.current = [];
      awaySinceRef.current = null;
      if (isAwayRef.current) {
        isAwayRef.current = false;
        setIsAway(false);
        onAwayChangeRef.current?.(false);
      }
      return;
    }

    if (!window.webgazer) {
      setSupported(false);
      console.warn('[GazeTracker] window.webgazer not found.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await ensureWebgazerStarted();
      } catch (e) {
        if (!cancelled) {
          console.error('[GazeTracker] Failed to start WebGazer', e);
          setSupported(false);
        }
        return;
      }
      if (cancelled) return;

      const wg = window.webgazer;
      setSupported(true);

      // Attach gaze listener only once — all mutable state accessed via refs
      if (!listenerAttachedRef.current) {
        wg.setGazeListener((data: any, timestamp: number) => {
          const now = timestamp || Date.now();

          // ── Face missing detection ──────────────────────────────────────
          if (!data) {
            if (faceMissingSinceRef.current === null) {
              faceMissingSinceRef.current = now;
            } else if (now - faceMissingSinceRef.current > 2000) {
              if (!isFaceMissingRef.current) {
                isFaceMissingRef.current = true;
                setIsFaceMissing(true);
                onFaceChangeRef.current?.(true);
                console.log('[GazeTracker] Face missing triggered');
              }
            }
            return;
          }

          // Face found → reset face-missing flag
          faceMissingSinceRef.current = null;
          if (isFaceMissingRef.current) {
            isFaceMissingRef.current = false;
            setIsFaceMissing(false);
            onFaceChangeRef.current?.(false);
            console.log('[GazeTracker] Face found again');
          }

          const x = data.x;
          const y = data.y;
          const confidence =
            typeof data.confidence === 'number' ? data.confidence : 1;

          // Ignore invalid or low-confidence samples
          if (
            typeof x !== 'number' ||
            typeof y !== 'number' ||
            x < 0 ||
            y < 0 ||
            x > window.innerWidth * 1.2 ||
            y > window.innerHeight * 1.2 ||
            confidence < minConfidenceRef.current
          ) {
            return;
          }

          // Push to rolling buffer
          const samples = samplesRef.current;
          samples.push({ x, y, t: now });

          const cutoff = now - smoothingWindowMsRef.current;
          while (samples.length && samples[0].t < cutoff) {
            samples.shift();
          }

          // Behavioral analysis every ~5 frames
          if (samples.length % 5 === 0) {
            analyzeGazeIntent(samples);
          }

          // Compute smoothed gaze point
          const len = samples.length;
          if (len === 0) return;
          const avgX = samples.reduce((s, p) => s + p.x, 0) / len;
          const avgY = samples.reduce((s, p) => s + p.y, 0) / len;

          const smoothedInside = isInsideSafeZone(avgX, avgY);

          setReady(true);
          setLastGaze({ x: avgX, y: avgY, t: now });

          // ── Away detection ──────────────────────────────────────────────
          if (!smoothedInside) {
            if (awaySinceRef.current == null) {
              awaySinceRef.current = now;
            }
            const elapsed = now - awaySinceRef.current;
            if (elapsed >= minAwayDurationMsRef.current && !isAwayRef.current) {
              isAwayRef.current = true;
              setIsAway(true);
              onAwayChangeRef.current?.(true);
              console.log('[GazeTracker] Gaze away triggered');
            }
          } else {
            awaySinceRef.current = null;
            if (isAwayRef.current) {
              isAwayRef.current = false;
              setIsAway(false);
              onAwayChangeRef.current?.(false);
              console.log('[GazeTracker] Gaze returned');
            }
          }
        });

        listenerAttachedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
      // We intentionally do NOT call webgazer.end() here to keep camera warm
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    supported,
    ready,
    isAway,
    isReading,
    isFaceMissing,
    lastGaze,
    calibrationBounds,
  };
}
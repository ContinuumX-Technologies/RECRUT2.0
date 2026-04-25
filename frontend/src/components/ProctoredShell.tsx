import React, { useEffect, useState, useCallback } from 'react';
import { useVisionProctor } from '../hooks/useVisionProctor';
import type { ProctorAlert } from '../hooks/useProctorAlert';
import { useRef } from 'react';

type Props = {
  interviewId: string;
  children: React.ReactNode; // your interview questions UI
  proctorAlert?: ProctorAlert | null;
  referenceFaceUrl?: string; // Local URL from BiometricSetup
};

type ProctorState = {
  fullscreen: boolean;
  focused: boolean;
  violationCount: number;
  locked: boolean;
  reason?: string;
};

const MAX_VIOLATIONS = 3; // after this, lock the test
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function sendEvent(interviewId: string, type: string, payload: any = {}) {
  try {
    await fetch(`${API_BASE}/api/interviews/${interviewId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        timestamp: new Date().toISOString(),
        payload,
      }),
    });
  } catch (e) {
    console.warn('proctor event failed', e);
  }
}

export const ProctoredShell: React.FC<Props> = ({ interviewId, children, proctorAlert, referenceFaceUrl }) => {
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [state, setState] = useState<ProctorState>({
    fullscreen: false,
    focused: true,
    violationCount: 0,
    locked: false,
  });

  const [gazeWarning, setGazeWarning] = useState(false);
  const [faceWarning, setFaceWarning] = useState(false);
  const [identityWarning, setIdentityWarning] = useState(false);

  const incrementViolation = useCallback(
    async (reason: string) => {
      setState((prev) => {
        if (prev.locked) return prev;
        const nextCount = prev.violationCount + 1;
        const locked = nextCount >= MAX_VIOLATIONS;

        if (locked) {
          sendEvent(interviewId, 'PROCTOR_LOCKED', {
            reason,
            violations: nextCount,
          });
        } else {
          sendEvent(interviewId, 'PROCTOR_VIOLATION', {
            reason,
            violations: nextCount,
          });
        }

        console.info(`[Proctor] Violation Registered: ${reason} (Total: ${nextCount}/${MAX_VIOLATIONS})`);

        return {
          ...prev,
          violationCount: nextCount,
          locked,
          reason,
        };
      });
    },
    [interviewId]
  );

  // -------------------------------------------

  // ----------- REAL-TIME VISION PROCTORING (MediaPipe) -----------
  const { faceMatchScore, isLookingAway, isFaceMissing, modelsLoaded } = useVisionProctor({
    enabled: started && !state.locked,
    videoRef,
    referenceImage: referenceFaceUrl,
    onViolation: (type, data) => {
      // deduplicate via state
      if (type === 'MULTIPLE_FACES_DETECTED') {
        incrementViolation('MULTIPLE_PEOPLE_DETECTED');
      } else if (type === 'FORBIDDEN_OBJECT') {
        incrementViolation(`FORBIDDEN_OBJECT_DETECTED: ${data.objects.join(', ')}`);
      }
    },
  });

  // Safe deduction for Identity Mismatch
  useEffect(() => {
    if (faceMatchScore !== null) {
      const mismatched = faceMatchScore < 0.7;
      if (mismatched && !identityWarning) {
        setIdentityWarning(true);
        incrementViolation('IDENTITY_MISMATCH (Internal AI)');
      } else if (!mismatched && identityWarning) {
        setIdentityWarning(false);
      }
    }
  }, [faceMatchScore, identityWarning]);

  // Safe deduction for Gaze Away
  useEffect(() => {
    if (isLookingAway && !gazeWarning) {
      setGazeWarning(true);
      incrementViolation('GAZE_AWAY (Head Pose)');
      sendEvent(interviewId, 'GAZE_AWAY_START', {});
    } else if (!isLookingAway && gazeWarning) {
      setGazeWarning(false);
      sendEvent(interviewId, 'GAZE_AWAY_END', {});
    }
  }, [isLookingAway, gazeWarning, interviewId]);

  // Safe deduction for Face Missing
  useEffect(() => {
    if (isFaceMissing && !faceWarning) {
      setFaceWarning(true);
      incrementViolation('FACE_MISSING');
      sendEvent(interviewId, 'FACE_MISSING_START', {});
    } else if (!isFaceMissing && faceWarning) {
      setFaceWarning(false);
      sendEvent(interviewId, 'FACE_MISSING_END', {});
    }
  }, [isFaceMissing, faceWarning, interviewId]);

  // Sync hidden video stream
  useEffect(() => {
    if (started && !state.locked) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('[Proctor] video play error', e));
        }
      });
    }
  }, [started, state.locked]);
  // -------------------------------------------

  const requestFullscreen = async () => {
    const el: any = document.documentElement;
    try {
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      await sendEvent(interviewId, 'FULLSCREEN_ENTER');
      setState((prev) => ({ ...prev, fullscreen: true }));
      setStarted(true);
    } catch (e: any) {
      console.error('fullscreen request failed', e);
      await sendEvent(interviewId, 'FULLSCREEN_FAIL', { error: e.message });
      alert(
        'We need fullscreen permission to start the interview. Please allow it and try again.'
      );
    }
  };

  // Core proctor listeners: focus / visibility / fullscreen / shortcuts
  useEffect(() => {
    if (!started) return;

    const handleVisibility = () => {
      const hidden = document.hidden;
      setState((prev) => ({ ...prev, focused: !hidden }));
      if (hidden) {
        incrementViolation('TAB_OR_WINDOW_SWITCH');
      }
    };

    const handleBlur = () => {
      setState((prev) => ({ ...prev, focused: false }));
      incrementViolation('WINDOW_BLUR');
    };

    const handleFocus = () => {
      setState((prev) => ({ ...prev, focused: true }));
    };

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setState((prev) => ({ ...prev, fullscreen: fs }));
      if (!fs) {
        incrementViolation('FULLSCREEN_EXIT');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Best-effort: block some shortcuts
      const combo = [
        e.ctrlKey ? 'Ctrl' : '',
        e.metaKey ? 'Meta' : '',
        e.altKey ? 'Alt' : '',
        e.key,
      ]
        .filter(Boolean)
        .join('+');

      const bannedCombos = ['Ctrl+L', 'Meta+L', 'Alt+Tab', 'Meta+Tab'];
      if (bannedCombos.includes(combo) || e.key === 'F11') {
        e.preventDefault();
        e.stopPropagation();
        incrementViolation('KEYBOARD_SHORTCUT');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);

    sendEvent(interviewId, 'PROCTOR_STARTED', { ua: navigator.userAgent });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [started, incrementViolation, interviewId]);

  // Warn on attempts to close/refresh
  useEffect(() => {
    if (!started) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started]);

  // Context menu, copy/paste, devtools / app-switch shortcuts
  useEffect(() => {
    if (!started) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      incrementViolation('RIGHT_CLICK_ATTEMPT');
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      incrementViolation('COPY_PASTE_ATTEMPT');
    };

    const handleRestrictedKeys = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || // DevTools
        (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
        (e.ctrlKey && e.key === 'c') || // Copy
        (e.ctrlKey && e.key === 'v') || // Paste
        (e.altKey && e.key === 'Tab')   // Switch App
      ) {
        e.preventDefault();
        e.stopPropagation();
        incrementViolation('RESTRICTED_KEY_ATTEMPT');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    window.addEventListener('keydown', handleRestrictedKeys);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      window.removeEventListener('keydown', handleRestrictedKeys);
    };
  }, [started, incrementViolation]);

  // ---------- PRE-START SCREEN ----------
  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 w-screen">
        <div className="max-w-md border border-slate-800 rounded-xl p-6 bg-slate-900 shadow-lg">
          <h1 className="text-lg font-semibold mb-2">Proctored Interview</h1>
          <p className="text-sm text-slate-300 mb-4">
            This interview will run in fullscreen and your activity will be
            monitored. Switching tabs, exiting fullscreen, or using shortcuts
            may lock the interview.
          </p>
          <ul className="text-xs text-slate-400 mb-4 list-disc pl-4 space-y-1">
            <li>Do not switch tabs or windows.</li>
            <li>Do not exit fullscreen mode.</li>
            <li>Do not refresh or close this page.</li>
            <li>
              <strong className="text-emerald-400">
                Keep your eyes on the screen. Eye tracking is active.
              </strong>
            </li>
          </ul>

          {!modelsLoaded ? (
            <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-900/40 rounded-lg border border-indigo-500/30">
              <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
              <p className="text-xs text-indigo-200">
                Wait... AI proctoring engines are loading...
              </p>
            </div>
          ) : (
            <p className="text-xs text-emerald-400 mb-4 flex items-center gap-2">
              <span>✅</span> AI Proctoring Ready
            </p>
          )}

          <button
            onClick={requestFullscreen}
            disabled={!modelsLoaded}
            className="w-full px-4 py-3 rounded-lg bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-sm font-bold hover:bg-emerald-500 transition-all shadow-lg"
          >
            {modelsLoaded ? 'I understand, start interview' : 'Initializing...'}
          </button>
        </div>

        {/* Show alerts even before starting */}
        {proctorAlert?.hasWarning && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
            <div className="bg-red-900 border border-red-500 rounded-lg p-4 shadow-2xl flex items-start gap-3">
              <div className="text-red-400 mt-1">⚠️</div>
              <div>
                <h3 className="text-sm font-bold text-white">Identity Verification Warning</h3>
                <p className="text-xs text-red-100">{proctorAlert.message || 'Suspicious activity detected.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const showOverlay = state.locked || !state.fullscreen || !state.focused;

  // ---------- MAIN WRAPPER ----------
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* MAIN CONTENT */}
      <div className={showOverlay ? 'pointer-events-none blur-sm' : ''}>
        {children}
      </div>

      {/* WARNING BANNERS (z-index ensure they are above content) */}
      <div className="fixed top-0 left-0 w-full z-40 pointer-events-none">
        {/* GAZE WARNING */}
        {gazeWarning && !showOverlay && !state.locked && (
          <div className="max-w-md mx-auto mt-3 px-4 py-3 bg-red-900/90 border border-red-500/70 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-2xl">⚠️</span>
            <div className="text-sm">
              <p className="font-semibold text-red-100">
                Please bring your eyes back to the screen
              </p>
              <p className="text-xs text-red-200 mt-1">
                Looking away for too long may lock your interview.
              </p>
            </div>
          </div>
        )}

        {/* FACE MISSING WARNING */}
        {faceWarning && !showOverlay && !state.locked && (
          <div className="max-w-md mx-auto mt-3 px-4 py-3 bg-red-900/90 border border-red-500/70 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-2xl">👤</span>
            <div className="text-sm">
              <p className="font-semibold text-red-100">
                Face not detected
              </p>
              <p className="text-xs text-red-200 mt-1">
                Ensure your face is clearly visible to the camera.
              </p>
            </div>
          </div>
        )}

        {/* IDENTITY MISMATCH WARNING */}
        {identityWarning && !showOverlay && !state.locked && (
          <div className="max-w-md mx-auto mt-3 px-4 py-3 bg-red-900/90 border border-red-500/70 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-2xl">🆔</span>
            <div className="text-sm">
              <p className="font-semibold text-red-100">
                Identity Mismatch
              </p>
              <p className="text-xs text-red-200 mt-1">
                The face on camera does not match our records.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* HIDDEN PROCTORING FEED — must NOT use display:none or frames won't render */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* OVERLAY WHEN NOT FULLSCREEN / NOT FOCUSED / LOCKED */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-center px-4">
          <h2 className="text-xl font-semibold mb-2">
            {state.locked ? 'Interview Locked' : 'Return to the Interview'}
          </h2>
          {!state.locked && (
            <>
              <p className="text-sm text-slate-300 mb-4 max-w-md">
                The interview requires your full attention in fullscreen mode.
                Please return to this tab and re-enter fullscreen to continue.
              </p>
              <button
                className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium"
                onClick={requestFullscreen}
              >
                Re-enter fullscreen
              </button>
            </>
          )}
          {state.locked && (
            <div className="text-sm text-red-300 max-w-md">
              <p className="mb-2">
                This interview has been locked due to multiple proctoring
                violations.
              </p>
              <p className="font-mono text-xs bg-red-900/20 p-2 rounded border border-red-500/20">
                Last Violation: {state.reason}
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            Violations: {state.violationCount} / {MAX_VIOLATIONS}
          </p>
        </div>
      )}

      {/* Optional tiny debug tag for AI proctoring status */}
      {started && !state.locked && (
        <div className="fixed bottom-2 right-2 text-[10px] text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-700/60 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${modelsLoaded ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
          AI: {modelsLoaded ? 'active' : 'loading…'}
        </div>
      )}
    </div>
  );
};
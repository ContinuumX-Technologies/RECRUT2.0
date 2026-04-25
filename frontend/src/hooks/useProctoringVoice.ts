// frontend/src/hooks/useProctoringVoice.ts
import { useRef, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Minimum gap between spoken alerts (ms) to avoid overlapping speech
const ALERT_COOLDOWN_MS = 8000;

// Pre-written natural-sounding interviewer phrases
const ALERT_PHRASES = {
  FACE_MISSING: [
    "I notice I can't see you on camera. Please make sure your face is clearly visible.",
    "Heads up — your face isn't visible. Please adjust your camera or position.",
    "It seems like you've moved out of frame. Please look into your camera to continue.",
  ],
  GAZE_AWAY: [
    "Please keep your eyes on the screen during the interview.",
    "I notice you're looking away. Kindly focus on the screen.",
    "Please direct your attention back to the screen. Thank you.",
    "Keep your gaze on the screen — it helps me assess your engagement.",
  ],
  IDENTITY_MISMATCH: [
    "The face on camera doesn't match our records. Please ensure it's you on the screen.",
    "I'm having trouble verifying your identity. Please look directly at the camera.",
  ],
  MULTIPLE_FACES: [
    "I can see more than one person on camera. Please ensure you're alone during the interview.",
    "It looks like there's someone else in the frame. This interview must be completed individually.",
  ],
  FORBIDDEN_OBJECT: [
    "I noticed a device or restricted item in your environment. Please remove it to continue.",
    "Please make sure no phones, books, or laptops are visible during the interview.",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useProctoringVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastAlertTimeRef = useRef<Record<string, number>>({});

  const speak = useCallback(async (text: string, alertType: string) => {
    const now = Date.now();
    const last = lastAlertTimeRef.current[alertType] || 0;

    // Enforce cooldown per alert type
    if (now - last < ALERT_COOLDOWN_MS) return;
    lastAlertTimeRef.current[alertType] = now;

    // Stop currently playing alert
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis?.cancel();

    console.info(`[ProctoringVoice] Speaking: "${text}"`);

    try {
      // Try Hume TTS via backend
      const res = await fetch(`${API_BASE}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Hume TTS failed');

      const data = await res.json();
      if (data.audioPath) {
        const audio = new Audio(`${API_BASE}${data.audioPath}`);
        audioRef.current = audio;
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('[ProctoringVoice] Hume failed, using browser TTS:', err);
    }

    // Fallback: Browser SpeechSynthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis?.getVoices() || [];
    const preferred = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Samantha') ||
      v.name.includes('Karen') ||
      v.name.includes('Daniel')
    );
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis?.speak(utterance);
  }, []);

  const alertFaceMissing = useCallback(() => {
    speak(pickRandom(ALERT_PHRASES.FACE_MISSING), 'FACE_MISSING');
  }, [speak]);

  const alertGazeAway = useCallback(() => {
    speak(pickRandom(ALERT_PHRASES.GAZE_AWAY), 'GAZE_AWAY');
  }, [speak]);

  const alertIdentityMismatch = useCallback(() => {
    speak(pickRandom(ALERT_PHRASES.IDENTITY_MISMATCH), 'IDENTITY_MISMATCH');
  }, [speak]);

  const alertMultipleFaces = useCallback(() => {
    speak(pickRandom(ALERT_PHRASES.MULTIPLE_FACES), 'MULTIPLE_FACES');
  }, [speak]);

  const alertForbiddenObject = useCallback(() => {
    speak(pickRandom(ALERT_PHRASES.FORBIDDEN_OBJECT), 'FORBIDDEN_OBJECT');
  }, [speak]);

  return {
    alertFaceMissing,
    alertGazeAway,
    alertIdentityMismatch,
    alertMultipleFaces,
    alertForbiddenObject,
  };
}

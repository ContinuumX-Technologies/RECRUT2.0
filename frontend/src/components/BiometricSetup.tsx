// frontend/src/components/BiometricSetup.tsx
import { useState, useRef, useEffect } from 'react';

type Props = {
  interviewId: string;
  // UPDATED: Now accepts an optional faceUrl
  onComplete: (faceUrl?: string) => void;
};

declare global {
  interface Window {
    webgazer?: any;
    localStream?: MediaStream;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function BiometricSetup({ interviewId, onComplete }: Props) {
  const [step, setStep] = useState<'face' | 'voice' | 'calibration' | 'done'>('face');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false); // NEW: specifically for WebGazer setup

  // NEW: Store the captured face URL locally
  const [capturedFaceUrl, setCapturedFaceUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // --- FACE CAPTURE ---
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      console.error('Failed to access camera:', err);
      alert('Could not access camera. Please allow permissions.');
    }
  };

  useEffect(() => {
    if (stream && (step === 'face' || step === 'calibration')) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

    // Stop camera if we move away from 'face' and aren't in 'calibration' yet
    // WebGazer will start its own stream later.
    if (stream && step === 'voice') {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream, step]);

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // NEW: Create local URL for immediate use in ProctorShell
        const url = URL.createObjectURL(blob);
        setCapturedFaceUrl(url);

        setLoading(true);
        const fd = new FormData();
        fd.append('photo', blob, 'reference-face.jpg');

        try {
          await fetch(`${API_BASE}/api/interviews/${interviewId}/reference/face`, {
            method: 'POST',
            body: fd,
          });
          setStep('voice');
        } catch (error) {
          console.error('Upload failed', error);
        } finally {
          setLoading(false);
        }
      },
      'image/jpeg'
    );
  };

  // --- VOICE CAPTURE ---
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(s);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setLoading(true);
        const fd = new FormData();
        fd.append('audio', blob, 'reference-voice.webm');

        try {
          await fetch(`${API_BASE}/api/interviews/${interviewId}/reference/voice`, {
            method: 'POST',
            body: fd,
          });
        } catch (err) {
          console.error('Voice upload failed', err);
        } finally {
          setLoading(false);
        }

        s.getTracks().forEach((t) => t.stop());
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
        }

        setStep('calibration');
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  // --- CALIBRATION ---
  const [calibPoints, setCalibPoints] = useState(0);
  const [calibReady, setCalibReady] = useState(false);
  const [samples, setSamples] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (step !== 'calibration') return;
    if (!window.webgazer) {
      alert('Eye tracking library failed to load.');
      return;
    }

    let cancelled = false;
    const initWebGazer = async () => {
      setInitializing(true);
      try {
        if (cancelled) return;

        // 1. Force stop any tracks left from the previous capture/voice steps
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
          setStream(null);
        }

        // 2. Clear any old state
        await window.webgazer.pause();
        await window.webgazer.clearData();

        // 3. Wait for OS/Camera to settle
        await new Promise(r => setTimeout(r, 1500));

        if (cancelled) return;

        // 4. Robust initialization
        // We set the tracker. Note: If clmtrackr fails, it might fallback to MediaPipe.
        await window.webgazer
          .setRegression('ridge')
          .setTracker('clmtrackr')
          .setGazeListener(() => { })
          .begin();

        // 5. Configure UI
        window.webgazer.showVideo(true);
        window.webgazer.showFaceOverlay(true);
        window.webgazer.showPredictionPoints(true);

        if (!cancelled) {
          setCalibReady(true);
          setInitializing(false);
        }
      } catch (e) {
        console.error('WebGazer init failed', e);
        setInitializing(false);
        if (!cancelled) {
          alert('Eye tracking failed to initialize. Please ensure your camera is not in use by another application.');
        }
      }
    };
    initWebGazer();

    return () => {
      cancelled = true;
      try {
        window.webgazer && window.webgazer.showVideo(false);
        window.webgazer && window.webgazer.showFaceOverlay(false);
        window.webgazer && window.webgazer.showPredictionPoints(false);
      } catch { }
    };
  }, [step]);

  const handleCalibClick = async (e: React.MouseEvent) => {
    if (!calibReady || !window.webgazer) return;
    const target = e.currentTarget as HTMLButtonElement;
    target.style.backgroundColor = '#10b981';
    target.style.borderColor = '#059669';
    target.disabled = true;

    try {
      const prediction = await window.webgazer.getCurrentPrediction();
      if (prediction?.x && prediction?.y) {
        setSamples((prev) => [...prev, { x: prediction.x, y: prediction.y }]);
      }
    } catch (err) { console.warn(err); }

    const newCount = calibPoints + 1;
    setCalibPoints(newCount);

    if (newCount >= 9) {
      setTimeout(() => {
        // Save calibration data
        if (samples.length > 0) {
          const xs = samples.map(s => s.x);
          const ys = samples.map(s => s.y);
          localStorage.setItem(`gaze_calibration_${interviewId}`, JSON.stringify({
            minX: Math.min(...xs), maxX: Math.max(...xs),
            minY: Math.min(...ys), maxY: Math.max(...ys),
            points: samples
          }));
        }

        try {
          window.webgazer.showVideo(false);
          window.webgazer.showFaceOverlay(false);
          window.webgazer.showPredictionPoints(false);
        } catch { }

        setStep('done');
        // UPDATED: Pass the captured face URL back to parent
        onComplete(capturedFaceUrl || undefined);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative">
        <h2 className="text-xl font-semibold text-white mb-2">Identity & Setup</h2>

        {step === 'face' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <p className="text-sm text-slate-400">Step 1/3: Reference Photo</p>
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-700">
              {!stream ? (
                <button onClick={startCamera} className="absolute inset-0 flex items-center justify-center text-emerald-500 hover:bg-white/5">Click to Enable Camera</button>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              )}
            </div>
            <button onClick={capturePhoto} disabled={!stream || loading} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors">
              {loading ? 'Uploading...' : 'Capture Photo'}
            </button>
          </div>
        )}

        {step === 'voice' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <p className="text-sm text-slate-400">Step 2/3: Voice Sample</p>
            <div className="p-4 bg-slate-800 rounded-lg text-center w-full">
              <p className="text-sm text-slate-300 mb-2">Please read aloud:</p>
              <blockquote className="text-lg font-medium text-white italic">"My name is [Name], and I consent to being recorded."</blockquote>
            </div>
            {!recording ? (
              <button onClick={startRecording} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">Start Recording</button>
            ) : (
              <button onClick={stopRecording} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium animate-pulse">Stop & Submit</button>
            )}
          </div>
        )}

        {step === 'calibration' && (
          <div className="fixed inset-0 z-60 bg-slate-950 flex flex-col items-center justify-center cursor-crosshair">
            <h3 className="text-2xl font-bold text-white mb-2 pointer-events-none">Eye Calibration</h3>

            {initializing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-slate-400 animate-pulse">Initializing Eye Tracking...</p>
              </div>
            ) : (
              <p className="text-slate-300 mb-8 pointer-events-none">Click the red dots.</p>
            )}

            {/* 9 Point Grid */}
            {[
              { top: '5%', left: '5%' }, { top: '5%', left: '50%' }, { top: '5%', left: '95%' },
              { top: '50%', left: '5%' }, { top: '50%', left: '50%' }, { top: '50%', left: '95%' },
              { top: '95%', left: '5%' }, { top: '95%', left: '50%' }, { top: '95%', left: '95%' },
            ].map((pos, i) => (
              <button
                key={i}
                onClick={handleCalibClick}
                disabled={!calibReady}
                className="absolute w-8 h-8 rounded-full border-4 border-white bg-red-500 hover:scale-125 transition-transform disabled:opacity-0"
                style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
// frontend/src/components/BiometricSetup.tsx
import { useState, useRef, useEffect } from 'react';

type Props = {
  interviewId: string;
  onComplete: (faceUrl?: string) => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function BiometricSetup({ interviewId, onComplete }: Props) {
  const [step, setStep] = useState<'face' | 'voice' | 'done'>('face');
  const [loading, setLoading] = useState(false);
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
    if (stream && step === 'face') {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    }

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
        setStep('done');
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative">
        <h2 className="text-xl font-semibold text-white mb-2">Identity & Setup</h2>

        {step === 'face' && (
          <div className="flex flex-col items-center gap-4 animate-in fade-in">
            <p className="text-sm text-slate-400">Step 1/2: Reference Photo</p>
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
            <p className="text-sm text-slate-400">Step 2/2: Voice Sample</p>
            <div className="p-4 bg-slate-800 rounded-lg text-center w-full">
              <p className="text-sm text-slate-300 mb-2">Please read aloud:</p>
              <blockquote className="text-lg font-medium text-white italic">"My name is candidate, and I consent to being recorded for this interview."</blockquote>
            </div>
            {!recording ? (
              <button onClick={startRecording} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium">Start Recording</button>
            ) : (
              <button onClick={stopRecording} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium animate-pulse">Stop & Submit</button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center p-4 bg-slate-800/30 rounded-xl border border-indigo-500/20 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-2xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Setup Complete</h2>
            <p className="text-sm text-slate-400 mb-6 font-medium">
              Your identity and voice profile have been verified. 
              The system is now ready for proctoring.
            </p>
            <button
              onClick={() => onComplete(capturedFaceUrl || undefined)}
              className="w-full py-3 bg-linear-to-r from-emerald-600 to-emerald-500 text-white rounded-lg font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg"
            >
              Continue to Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
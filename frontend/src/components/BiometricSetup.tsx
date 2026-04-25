import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Camera, Mic, CheckCircle2, AlertCircle, ScanFace } from 'lucide-react';

type Props = {
  interviewId: string;
  onComplete: (faceUrl?: string) => void;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function BiometricSetup({ interviewId, onComplete }: Props) {
  const [step, setStep] = useState<'face' | 'voice' | 'done'>('face');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedFaceUrl, setCapturedFaceUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // --- FACE CAPTURE ---
  const startCamera = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('Camera access denied. Please allow permissions in your browser.');
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
          const res = await fetch(`${API_BASE}/api/interviews/${interviewId}/reference/face`, {
            method: 'POST',
            body: fd,
          });

          if (!res.ok) throw new Error("Failed to upload face reference");

          setStep('voice');
          setError(null);
        } catch (error) {
          console.error('Upload failed', error);
          setError('Failed to securely upload identity reference. Please try again.');
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
    setError(null);
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
          const res = await fetch(`${API_BASE}/api/interviews/${interviewId}/reference/voice`, {
            method: 'POST',
            body: fd,
          });

          if (!res.ok) throw new Error("Voice reference upload failed");

          setStep('done');
        } catch (err) {
          console.error('Voice upload failed', err);
          setError('Failed to upload voice reference. Please try again.');
        } finally {
          setLoading(false);
        }

        s.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Microphone access denied. Please allow permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  // --- VARIANTS ---
  const variants: Variants = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6 bg-slate-950/90 sm:bg-slate-950/80 backdrop-blur-xl sm:overflow-hidden perspective-1000">
      <div className="w-full sm:max-w-md h-[100dvh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-slate-900 border-t sm:border border-slate-700/50 sm:rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden ring-1 ring-white/5 relative">
        
        {/* Mobile Handle (Optional) */}
        <div className="w-full h-1.5 flex justify-center pt-3 pb-5 sm:hidden shrink-0">
           <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Inner Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col">
          
          {/* Header Indicator */}
          <div className="flex justify-center mb-6 sm:mb-8 shrink-0">
          <div className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-700/50 shadow-xl">
            <span className={`text-sm font-semibold transition-colors duration-500 ${step === 'face' ? 'text-emerald-400' : (step === 'done' ? 'text-slate-500' : 'text-slate-200')}`}>
              FaceID
            </span>
            <div className="w-8 h-[2px] bg-slate-700/50 rounded-full overflow-hidden">
               <div className={`h-full bg-emerald-500 transition-all duration-700 ${step === 'face' ? 'w-0' : 'w-full'}`}/>
            </div>
            <span className={`text-sm font-semibold transition-colors duration-500 ${step === 'voice' ? 'text-indigo-400' : (step === 'done' ? 'text-slate-500' : 'text-slate-500')}`}>
              VoicePrint
            </span>
          </div>
        </div>
        
        <div className="flex-1 w-full flex flex-col">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: FACE CAPTURE */}
            {step === 'face' && (
              <motion.div key="face" variants={variants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center">
                <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400">
                  <ScanFace strokeWidth={1.5} size={28} />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center tracking-tight">Identity Setup</h2>
                <p className="text-slate-400 text-sm sm:text-base text-center mb-6 sm:mb-8 font-medium">Position your face within the frame to capture your reference photo.</p>

                <div className="relative w-[60vw] max-w-[240px] aspect-square mx-auto mb-8 sm:mb-10 rounded-full overflow-hidden bg-slate-950 border-[3px] sm:border-4 border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.5)] shadow-inner group shrink-0">
                  {!stream ? (
                    <button 
                      onClick={startCamera} 
                      className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-300"
                    >
                      <Camera size={32} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="text-sm font-medium">Enable Camera</span>
                    </button>
                  ) : (
                    <>
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                      {/* Scanning Reticle Overlay */}
                      <div className="absolute inset-0 border-[6px] border-emerald-500/30 rounded-full pointer-events-none" />
                      <div className="absolute inset-0 border-y-2 border-emerald-400/50 rounded-full animate-spin-slow pointer-events-none" style={{ animationDuration: '4s' }} />
                    </>
                  )}
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex items-start gap-3 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button 
                  onClick={capturePhoto} 
                  disabled={!stream || loading} 
                  className="relative w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all overflow-hidden shadow-lg hover:shadow-emerald-500/30"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                       <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                       Processing...
                    </span>
                  ) : 'Capture Identity'}
                </button>
              </motion.div>
            )}

            {/* STEP 2: VOICE CAPTURE */}
            {step === 'voice' && (
              <motion.div key="voice" variants={variants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center">
                <div className="mb-6 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400">
                  <Mic strokeWidth={1.5} size={28} />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center tracking-tight">Voice Enrollment</h2>
                <p className="text-slate-400 text-sm sm:text-base text-center mb-6 sm:mb-8 font-medium">Please read the consent phrase aloud clearly to register your voice footprint.</p>

                <div className="w-full p-5 sm:p-6 bg-slate-950/50 border border-slate-800/80 rounded-2xl mb-8 relative overflow-hidden flex-1 flex flex-col justify-center min-h-[140px]">
                  <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-purple-500" />
                  <p className="text-sm font-semibold text-indigo-400/80 uppercase tracking-wider mb-3">Read aloud:</p>
                  <blockquote className="text-xl font-medium text-white italic leading-relaxed text-transparent bg-clip-text bg-linear-to-br from-white to-slate-400">
                    "My name is candidate, and I consent to being recorded for this interview."
                  </blockquote>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full flex items-start gap-3 p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {!recording ? (
                  <button 
                    onClick={startRecording} 
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                  >
                    Start Recording
                  </button>
                ) : (
                  <div className="w-full flex flex-col items-center gap-4">
                    {/* Fake Audio Waveform Animation simulating recording */}
                    <div className="flex items-center justify-center gap-1.5 h-12 mb-2">
                       {[...Array(9)].map((_, i) => (
                         <motion.div 
                           key={i}
                           className="w-1.5 bg-indigo-400 rounded-full"
                           animate={{ height: ['20%', '100%', '30%', '80%', '20%'] }}
                           transition={{ 
                             duration: 1.5, 
                             repeat: Infinity, 
                             ease: "easeInOut",
                             delay: i * 0.1,
                             times: [0, 0.25, 0.5, 0.75, 1]
                           }}
                         />
                       ))}
                    </div>

                    <button 
                      onClick={stopRecording} 
                      disabled={loading}
                      className="w-full py-3.5 bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 rounded-xl font-semibold transition-all hover:border-red-500/50 hover:text-red-400"
                    >
                      {loading ? 'Uploading...' : 'Stop & Submit'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: DONE */}
            {step === 'done' && (
              <motion.div key="done" variants={variants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center text-center pt-4 pb-2">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 200, delay: 0.1 } }}
                  className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative"
                >
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}/>
                  <CheckCircle2 className="text-emerald-500 w-10 h-10" />
                </motion.div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">Identity Verified</h2>
                <p className="text-slate-400 text-sm sm:text-base mb-10 leading-relaxed max-w-[280px]">
                  Your biometric footprint is securely registered. The system is armed and ready for proctoring.
                </p>

                <motion.button
                   animate={{ 
                     boxShadow: ["0px 0px 0px rgba(16,185,129,0)", "0px 0px 20px rgba(16,185,129,0.4)", "0px 0px 0px rgba(16,185,129,0)"] 
                   }}
                   transition={{ duration: 2, repeat: Infinity }}
                   onClick={() => onComplete(capturedFaceUrl || undefined)}
                   className="w-full py-4 bg-linear-to-r from-emerald-600 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg"
                 >
                   Begin Interview
                 </motion.button>
              </motion.div>
            )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
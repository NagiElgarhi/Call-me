import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type RecordingState = 'idle' | 'requesting' | 'ready' | 'recording' | 'previewing' | 'submitting' | 'merging' | 'success' | 'error';

export default function VideoRecorderWidget() {
  const { t } = useLanguage();
  const [state, setState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [clips, setClips] = useState<Blob[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const requestCamera = async () => {
    try {
      setState('requesting');
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            facingMode: 'user'
        }, 
        audio: true 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.volume = 0; // Mute local feedback to prevent echo
      }
      setState('ready');
    } catch (err: any) {
      console.error("Camera access failed", err);
      setErrorMsg(err.message || 'Failed to access camera.');
      setState('error');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus' 
        : 'video/webm';
        
    const mediaRecorder = new MediaRecorder(streamRef.current, { 
        mimeType,
        videoBitsPerSecond: 8000000 // 8 Mbps for high quality
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setClips(prev => [...prev, blob]);
      
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.volume = 1; // Unmute for playback
        videoRef.current.loop = true;
        videoRef.current.play().catch(console.error);
      }
      setState('previewing');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // collect 100ms chunks
    setState('recording');
    setRecordingTime(0);
    
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const addAnotherClip = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.volume = 0;
      videoRef.current.play().catch(console.error);
    }
    setState('ready');
  };

  const retry = async () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setClips([]);
    setState('idle');
    stopCamera();
    setTimeout(requestCamera, 100);
  };

  const submitVideo = async () => {
    if (clips.length === 0) return;
    
    setState(clips.length > 1 ? 'merging' : 'submitting');
    
    try {
      const formData = new FormData();
      clips.forEach((clip, index) => {
        formData.append('videos', clip, `clip-${index}.webm`);
      });

      const response = await fetch('/api/merge', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Merging failed');

      const mergedBlob = await response.blob();
      const finalUrl = URL.createObjectURL(mergedBlob);
      const ext = mergedBlob.type.includes('mp4') ? 'mp4' : 'webm';

      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = `pitch-perfect-merged-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(finalUrl);

      setState('success');
      stopCamera();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to merge videos');
      setState('error');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative w-full h-full min-h-[500px] sm:min-h-[550px] aspect-[9/16] max-h-[75vh] md:max-h-[700px] bg-slate-950 rounded-[2.5rem] border-[6px] border-slate-800 overflow-hidden isolate">
        {/* Background Layer (z-0) */}
        <img 
            src="/custom-bg.jpg" 
            alt="Background" 
            className="absolute inset-0 w-full h-full object-cover z-0" 
            onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0';
            }}
        />

        {/* The Live Video / Preview Feed (z-10) */}
        <video
            ref={videoRef}
            className={`absolute left-0 top-[31%] w-full h-[37%] object-cover z-10 transition-opacity duration-300 ${
                 ['ready', 'recording', 'previewing'].includes(state) ? 'opacity-100 bg-black' : 'opacity-0'
            }`}
            autoPlay={state !== 'previewing'}
            playsInline
            muted={state !== 'previewing'}
        />

        {/* UI Overlay Grid - Adjusted to match image sections (z-20) */}
        <div className="absolute inset-0 flex flex-col z-20 pointer-events-none">
            
            {/* Top Area (~31%) - Header & Status */}
            <div className="h-[31%] p-6 flex flex-col justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center bg-black/40 backdrop-blur-md p-2 rounded-xl">
                        {state === 'recording' ? (
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 pointer-events-auto">{t('live')}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 pointer-events-auto">{t('ready')}</span>
                            </div>
                        )}
                        <span className="text-xs font-mono text-white/80 pointer-events-auto">{formatTime(recordingTime)}</span>
                    </div>
                    {clips.length > 0 && (
                        <div className="flex gap-1 justify-center pointer-events-auto">
                            {clips.map((_, idx) => (
                                <div key={idx} className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Middle Area (~37%) - Active Video Area Focus Bracket */}
            <div className="h-[37%] flex items-center justify-center relative">
                 {state === 'requesting' && (
                     <div className="text-center z-10 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-xs font-medium text-white">{t('cameraRequired')}</p>
                     </div>
                 )}
                 {(state === 'submitting' || state === 'merging') && (
                     <div className="text-center z-10 bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
                        </div>
                        <p className="text-xs font-medium text-white">
                            {state === 'merging' ? t('merging') : t('sending')}
                        </p>
                     </div>
                 )}
            </div>
            
            {/* Bottom Area (~32%) - Controls & Actions */}
            <div className="h-[32%] p-6 flex flex-col justify-end gap-2 pointer-events-auto">
                <Controls 
                    state={state}
                    errorMsg={errorMsg}
                    hasClips={clips.length > 0}
                    onRequestCamera={requestCamera}
                    onStart={startRecording}
                    onStop={stopRecording}
                    onAddAnother={addAnotherClip}
                    onRetry={retry}
                    onSubmit={submitVideo}
                    t={t}
                />
            </div>
        </div>
    </div>
  );
}

function Controls({ 
    state, errorMsg, hasClips, onRequestCamera, onStart, onStop, onAddAnother, onRetry, onSubmit, t 
}: {
    state: RecordingState,
    errorMsg: string,
    hasClips: boolean,
    onRequestCamera: () => void,
    onStart: () => void,
    onStop: () => void,
    onAddAnother: () => void,
    onRetry: () => void,
    onSubmit: () => void,
    t: (key: string) => string
}) {
    const Container = ({ children }: { children: React.ReactNode }) => (
        <>
            <div className="flex flex-col gap-2 w-full">
                {children}
            </div>
            <p className="text-[9px] text-center text-white/30 uppercase tracking-tighter mt-2">
                {t('poweredBy')}
            </p>
        </>
    );
    
    if (state === 'idle' || state === 'error') {
        return (
            <Container>
                <button 
                    onClick={onRequestCamera}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all pointer-events-auto"
                >
                    {state === 'error' ? t('retryCamera') : t('allowCamera')}
                </button>
                {errorMsg && (
                    <div className="text-center w-full">
                        <span className="text-[10px] text-red-500 uppercase font-bold tracking-widest">{t('cameraError')}</span>
                    </div>
                )}
            </Container>
        );
    }

    if (state === 'requesting' || state === 'submitting' || state === 'merging') {
         return (
            <Container>
                <div className="w-full py-3 bg-white/5 border border-white/10 text-white/50 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    {state === 'requesting' ? t('requesting') : (state === 'merging' ? t('merging') : t('uploading'))}
                </div>
            </Container>
        );
    }

    if (state === 'ready') {
        return (
            <Container>
                <button 
                    onClick={onStart}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
                >
                    {t('startRecording')}
                </button>
            </Container>
        );
    }

    if (state === 'recording') {
         return (
            <Container>
                 <button 
                    onClick={onStop}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all"
                >
                    {t('stopRecording')}
                </button>
            </Container>
        );
    }

    if (state === 'previewing') {
        return (
            <Container>
                <button 
                    onClick={onAddAnother}
                    className="w-full py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-xl text-[10px] font-bold uppercase transition-all mb-1"
                >
                    + {t('recordAnother')}
                </button>
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                        onClick={onRetry}
                        className="py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                        {t('retake')}
                    </button>
                    <button 
                        onClick={onSubmit}
                        className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-indigo-600/20 transition-all"
                    >
                        {hasClips ? t('mergeVideos') : t('submit')}
                    </button>
                </div>
            </Container>
        );
    }

    if (state === 'success') {
         return (
            <Container>
                <div className="w-full py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {t('sentSuccessfully')}
                </div>
                <button 
                    onClick={onRetry}
                    className="mt-2 text-[10px] text-white/50 hover:text-white uppercase font-bold tracking-widest text-center"
                >
                    {t('recordAnother')}
                </button>
            </Container>
         )
    }

    return null;
}

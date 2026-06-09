import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type RecordingState = 'idle' | 'requesting' | 'ready' | 'recording' | 'previewing' | 'submitting' | 'merging' | 'success' | 'error';

export default function VideoRecorderWidget() {
  const { t, lang } = useLanguage();
  const [state, setState] = useState<RecordingState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string, ext: string } | null>(null);
  
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
    
    // Find supported mime type for cross-browser support
    let mimeType = '';
    const types = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
    ];
    if (typeof MediaRecorder.isTypeSupported === 'function') {
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
            }
        }
    }
        
    const mediaRecorder = new MediaRecorder(streamRef.current, { 
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 8000000 // 8 Mbps for high quality
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setClips([blob]);
      
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
    if (downloadInfo) {
      URL.revokeObjectURL(downloadInfo.url);
      setDownloadInfo(null);
    }
    setClips([]);
    setState('idle');
    stopCamera();
    setTimeout(requestCamera, 100);
  };

  const shareFile = async () => {
    if (clips.length === 0) return false;
    const singleBlob = clips[0];
    
    let ext = 'webm';
    if (singleBlob.type.includes('mp4')) {
      ext = 'mp4';
    } else if (singleBlob.type.includes('ogg')) {
      ext = 'ogg';
    } else if (singleBlob.type.includes('mov')) {
      ext = 'mov';
    }
    
    const mimeType = singleBlob.type || `video/${ext}`;
    const filename = `my-story-${Date.now()}.${ext}`;
    
    try {
      const file = new File([singleBlob], filename, { type: mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: lang === 'ar' ? 'مبادرة كلمني عن نفسك' : 'Tell me about yourself',
          text: lang === 'ar' 
            ? 'مشاركتي في مبادرة "كلمني عن نفسك في دقيقتين"! 🎙️✨' 
            : 'My participation in the "Tell me about yourself in two minutes" initiative! 🎙️✨',
        });
        return true;
      }
    } catch (err) {
      console.error("Web Share failed or cancelled:", err);
    }
    return false;
  };

  const handleShareFileDirectly = async () => {
    await shareFile();
  };

  const submitVideo = async () => {
    if (clips.length === 0) return;
    
    const singleBlob = clips[0];
    const finalUrl = URL.createObjectURL(singleBlob);
    
    let ext = 'webm';
    if (singleBlob.type.includes('mp4')) {
      ext = 'mp4';
    } else if (singleBlob.type.includes('ogg')) {
      ext = 'ogg';
    } else if (singleBlob.type.includes('mov')) {
      ext = 'mov';
    }

    setDownloadInfo({ url: finalUrl, ext });
    setState('success');
    stopCamera();

    // Trigger native share prompt automatically as well when they click submit
    setTimeout(async () => {
      try {
        await shareFile();
      } catch (e) {
        console.error("Auto share failed", e);
      }
    }, 50);
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
                    downloadInfo={downloadInfo}
                    lang={lang}
                    onRequestCamera={requestCamera}
                    onStart={startRecording}
                    onStop={stopRecording}
                    onAddAnother={addAnotherClip}
                    onRetry={retry}
                    onSubmit={submitVideo}
                    onShareFile={handleShareFileDirectly}
                    t={t}
                />
            </div>
        </div>
    </div>
  );
}

function Controls({ 
    state, errorMsg, hasClips, downloadInfo, lang, onRequestCamera, onStart, onStop, onAddAnother, onRetry, onSubmit, onShareFile, t 
}: {
    state: RecordingState,
    errorMsg: string,
    hasClips: boolean,
    downloadInfo: { url: string, ext: string } | null,
    lang: string,
    onRequestCamera: () => void,
    onStart: () => void,
    onStop: () => void,
    onAddAnother: () => void,
    onRetry: () => void,
    onSubmit: () => void,
    onShareFile: () => void,
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
                <div className="grid grid-cols-2 gap-2 w-full">
                    <button 
                        onClick={onRetry}
                        className="py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                        {lang === 'ar' ? 'إعادة التسجيل' : 'Retake'}
                    </button>
                    <button 
                        onClick={onSubmit}
                        className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase shadow-lg shadow-indigo-600/20 transition-all font-cairo"
                    >
                        {lang === 'ar' ? 'مشاركة ملف الفيديو' : 'Share Video File'}
                    </button>
                </div>
            </Container>
        );
    }

    if (state === 'success') {
         return (
            <Container>
                <div className="w-full py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {t('sentSuccessfully')}
                </div>
                
                {/* Primary direct share button for file support */}
                <button 
                    onClick={onShareFile}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 mb-2 hover:scale-[1.02] pointer-events-auto shrink-0"
                >
                    <span>📤 {lang === 'ar' ? 'مشاركة الفيديو كملف مباشرة' : 'Share Video Directly'}</span>
                </button>

                {/* Secondary standard mechanisms */}
                <div className="grid grid-cols-2 gap-2 w-full mb-2">
                    <button 
                        onClick={() => {
                            if (downloadInfo) {
                                const a = document.createElement('a');
                                a.href = downloadInfo.url;
                                a.download = `my-video-${Date.now()}.${downloadInfo.ext}`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }
                            const whatsappMsg = lang === 'ar' 
                                ? 'السلام عليكم، لقد قمت بتسجيل مشاركتي في مبادرة "كلمني عن نفسك في دقيقتين" وهذا هو ملف الفيديو.' 
                                : 'Hello, I have recorded my video for the "Tell me about yourself in two minutes" initiative and this is the video file.';
                            setTimeout(() => {
                                window.open(`https://wa.me/201066802250?text=${encodeURIComponent(whatsappMsg)}`, '_blank');
                            }, 500);
                        }}
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
                    >
                        💬 {lang === 'ar' ? 'حفظ ومشاركة عبر واتساب' : 'Save & Share via WhatsApp'}
                    </button>
                    <button 
                        onClick={() => {
                            if (!downloadInfo) return;
                            const a = document.createElement('a');
                            a.href = downloadInfo.url;
                            a.download = `my-video-${Date.now()}.${downloadInfo.ext}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                        }}
                        className="py-3 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-900/10"
                    >
                        💾 {lang === 'ar' ? 'تحميل الفيديو' : 'Download'}
                    </button>
                </div>

                {/* Helpful explanatory tip for WhatsApp file upload constraints */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 mb-2 text-center">
                    <p className="text-[10px] text-white/80 leading-normal font-sans">
                        {lang === 'ar' 
                            ? '💡 تنويه: عند الضغط على "حفظ ومشاركة عبر واتساب" سيتم تنزيل الفيديو أولاً بجهازك ثم سيفتح تطبيق واتساب لتتمكن من إرفاقه في المحادثة بسهولة.' 
                            : '💡 Tip: Clicking "Save & Share via WhatsApp" will download the video first, then open WhatsApp so you can easily attach it to the chat.'}
                    </p>
                </div>

                <button 
                    onClick={onRetry}
                    className="w-full text-[10px] text-white/50 hover:text-white uppercase font-bold tracking-widest text-center py-1 mt-1"
                >
                    {t('recordAnother')}
                </button>
            </Container>
         )
    }

    return null;
}

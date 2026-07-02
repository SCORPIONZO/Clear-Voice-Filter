import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, FlaskConical, CheckCircle2, AlertCircle } from 'lucide-react';

interface TestRecordingProps {
  rawStream: MediaStream | null;
  processedStream: MediaStream | null;
  isActive: boolean;
}

type RecordingState = 'idle' | 'recording' | 'done';

const RECORD_SECONDS = 15;

export function TestRecording({ rawStream, processedStream, isActive }: TestRecordingProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [countdown, setCountdown] = useState(RECORD_SECONDS);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  const rawRecorderRef = useRef<MediaRecorder | null>(null);
  const processedRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rawChunks = useRef<Blob[]>([]);
  const processedChunks = useRef<Blob[]>([]);
  const doneCount = useRef(0);

  const handleFinished = useCallback(() => {
    doneCount.current += 1;
    if (doneCount.current < 2) return; // wait for both recorders
    const rawBlob = new Blob(rawChunks.current, { type: 'audio/webm' });
    const processedBlob = new Blob(processedChunks.current, { type: 'audio/webm' });
    setRawUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(rawBlob); });
    setProcessedUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(processedBlob); });
    setState('done');
  }, []);

  const startRecording = useCallback(() => {
    if (!rawStream || !processedStream) return;

    // reset
    rawChunks.current = [];
    processedChunks.current = [];
    doneCount.current = 0;
    setCountdown(RECORD_SECONDS);
    setState('recording');

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    const rawRec = new MediaRecorder(rawStream, { mimeType });
    const procRec = new MediaRecorder(processedStream, { mimeType });

    rawRec.ondataavailable = (e) => { if (e.data.size > 0) rawChunks.current.push(e.data); };
    procRec.ondataavailable = (e) => { if (e.data.size > 0) processedChunks.current.push(e.data); };
    rawRec.onstop = handleFinished;
    procRec.onstop = handleFinished;

    rawRec.start(100);
    procRec.start(100);

    rawRecorderRef.current = rawRec;
    processedRecorderRef.current = procRec;

    let remaining = RECORD_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        rawRec.stop();
        procRec.stop();
      }
    }, 1000);
  }, [rawStream, processedStream, handleFinished]);

  const stopEarly = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    rawRecorderRef.current?.stop();
    processedRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setRawUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setProcessedUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  // Cleanup on unmount: stop recorders, clear timer, revoke object URLs
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rawRecorderRef.current?.state === 'recording') rawRecorderRef.current.stop();
      if (processedRecorderRef.current?.state === 'recording') processedRecorderRef.current.stop();
      setRawUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setProcessedUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, []);

  const progress = ((RECORD_SECONDS - countdown) / RECORD_SECONDS) * 100;

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold tracking-widest text-white/90">ТЕСТ ШУМОПОДАВЛЕНИЯ</span>
      </div>

      <div className="p-5 space-y-4">
        {!isActive && (
          <div className="flex items-center gap-2 text-xs text-white/40 bg-white/[0.03] rounded-lg px-4 py-3 border border-white/5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Запустите движок, чтобы записать тест
          </div>
        )}

        {/* Idle / Record button */}
        {state === 'idle' && isActive && (
          <button
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-lg py-3 text-sm font-bold tracking-widest transition-colors"
          >
            <Mic className="w-4 h-4" />
            ЗАПИСАТЬ {RECORD_SECONDS} СЕКУНД
          </button>
        )}

        {/* Recording state */}
        {state === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-white/50">
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                ЗАПИСЬ...
              </span>
              <span className="text-primary">{countdown}с</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <button
              onClick={stopEarly}
              className="w-full flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 text-destructive rounded-lg py-2.5 text-xs font-bold tracking-widest transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              ОСТАНОВИТЬ
            </button>
          </div>
        )}

        {/* Done — playback */}
        <AnimatePresence>
          {state === 'done' && rawUrl && processedUrl && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Запись готова — сравните звучание
              </div>

              {/* Before */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="text-white/40">ДО — сырой микрофон</span>
                </div>
                <audio
                  controls
                  src={rawUrl}
                  className="w-full h-9 rounded-lg"
                  style={{ accentColor: 'rgba(255,255,255,0.5)' }}
                />
              </div>

              {/* After */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-primary">ПОСЛЕ — очищенный звук</span>
                </div>
                <audio
                  controls
                  src={processedUrl}
                  className="w-full h-9 rounded-lg"
                  style={{ accentColor: '#00d4d8' }}
                />
              </div>

              <button
                onClick={reset}
                className="w-full text-xs text-white/30 hover:text-white/60 transition-colors py-1 tracking-widest"
              >
                ЗАПИСАТЬ ЕЩЁ РАЗ
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

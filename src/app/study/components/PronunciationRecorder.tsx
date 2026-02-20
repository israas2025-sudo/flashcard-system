"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause, RotateCcw } from "lucide-react";

// ---------------------------------------------------------------------------
// PronunciationRecorder
// ---------------------------------------------------------------------------
// Audio recording widget for pronunciation practice. Features:
//  - Record button (mic icon, red ring when active)
//  - Real-time waveform visualizer on <canvas>
//  - Playback controls (play / pause reference, play / pause recording)
//  - Similarity percentage bar (mock comparison -- real implementation
//    would use a server-side model for phonetic similarity scoring)
//  - Uses navigator.mediaDevices.getUserMedia + AudioContext
// ---------------------------------------------------------------------------

interface PronunciationRecorderProps {
  /** Optional URL to the reference pronunciation audio. */
  referenceAudio?: string;
  /** Target language code (for display purposes). */
  language: string;
  /** Called with the recorded audio Blob when the user stops recording. */
  onRecordingComplete: (blob: Blob) => void;
}

type RecordingState = "idle" | "recording" | "recorded";

/** Simple language label map. */
const languageLabel: Record<string, string> = {
  arabic: "Arabic",
  ar: "Arabic",
  "ar-EG": "Egyptian Arabic",
  egyptian: "Egyptian Arabic",
  spanish: "Spanish",
  es: "Spanish",
  english: "English",
  en: "English",
  quran: "Quranic Arabic",
};

export function PronunciationRecorder({
  referenceAudio,
  language,
  onRecordingComplete,
}: PronunciationRecorderProps) {
  // ---- State ----
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const [isPlayingRec, setIsPlayingRec] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // ---- Refs ----
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const recAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Waveform drawing ----
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = recordingState === "recording" ? "#ef4444" : "#6366f1";
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }, [recordingState]);

  // ---- Start recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up AudioContext + analyser for waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        // Revoke previous URL
        if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);

        setRecordedBlobUrl(url);
        setRecordingState("recorded");
        onRecordingComplete(blob);

        // Mock similarity score (real impl would compare server-side)
        setSimilarity(Math.floor(Math.random() * 30) + 65);

        // Cleanup stream
        stream.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start();
      setRecordingState("recording");
      setPermissionDenied(false);
      setSimilarity(null);
      setElapsedTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      // Start waveform
      drawWaveform();
    } catch (err) {
      console.error("Microphone access denied:", err);
      setPermissionDenied(true);
    }
  }, [drawWaveform, onRecordingComplete, recordedBlobUrl]);

  // ---- Stop recording ----
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
  }, []);

  // ---- Re-record ----
  const resetRecording = useCallback(() => {
    if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
    setRecordedBlobUrl(null);
    setRecordingState("idle");
    setSimilarity(null);
    setElapsedTime(0);
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [recordedBlobUrl]);

  // ---- Reference audio playback ----
  const toggleReferencePlayback = useCallback(() => {
    if (!referenceAudio) return;

    if (!refAudioRef.current) {
      refAudioRef.current = new Audio(referenceAudio);
      refAudioRef.current.onended = () => setIsPlayingRef(false);
    }

    if (isPlayingRef) {
      refAudioRef.current.pause();
      refAudioRef.current.currentTime = 0;
      setIsPlayingRef(false);
    } else {
      refAudioRef.current.play().catch(() => {});
      setIsPlayingRef(true);
    }
  }, [referenceAudio, isPlayingRef]);

  // ---- Recording playback ----
  const toggleRecordingPlayback = useCallback(() => {
    if (!recordedBlobUrl) return;

    if (!recAudioRef.current || recAudioRef.current.src !== recordedBlobUrl) {
      recAudioRef.current = new Audio(recordedBlobUrl);
      recAudioRef.current.onended = () => setIsPlayingRec(false);
    }

    if (isPlayingRec) {
      recAudioRef.current.pause();
      recAudioRef.current.currentTime = 0;
      setIsPlayingRec(false);
    } else {
      recAudioRef.current.play().catch(() => {});
      setIsPlayingRec(true);
    }
  }, [recordedBlobUrl, isPlayingRec]);

  // ---- Helpers ----
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const similarityColor =
    similarity !== null
      ? similarity >= 85
        ? "bg-green-500"
        : similarity >= 65
          ? "bg-amber-500"
          : "bg-red-500"
      : "bg-[var(--surface-3)]";

  const similarityLabel =
    similarity !== null
      ? similarity >= 85
        ? "Excellent"
        : similarity >= 65
          ? "Good"
          : "Needs practice"
      : "";

  const displayLang = languageLabel[language] ?? language;

  return (
    <div
      className="w-full max-w-md mx-auto"
      role="region"
      aria-label={`Pronunciation recorder for ${displayLang}`}
    >
      <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--surface-3)] shadow-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-[var(--text-tertiary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Pronunciation Practice
            </span>
          </div>
          <span className="text-xs text-[var(--text-tertiary)] px-2 py-0.5 rounded-full bg-[var(--surface-2)]">
            {displayLang}
          </span>
        </div>

        {/* Waveform Canvas */}
        <div className="px-5 py-3">
          <div className="relative rounded-xl bg-[var(--surface-0)] border border-[var(--surface-3)] overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={80}
              className="w-full h-20"
              aria-label="Audio waveform visualization"
              role="img"
            />

            {/* Recording timer overlay */}
            <AnimatePresence>
              {recordingState === "recording" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/90 text-white text-xs font-medium"
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    aria-hidden="true"
                  />
                  {formatTime(elapsedTime)}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Idle state hint */}
            {recordingState === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-[var(--text-tertiary)]">
                  Tap record to begin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Permission denied warning */}
        {permissionDenied && (
          <div
            className="mx-5 mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            Microphone access was denied. Please enable it in your browser
            settings.
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 px-5 pb-4">
          {/* Reference audio */}
          {referenceAudio && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleReferencePlayback}
              disabled={recordingState === "recording"}
              className={`
                flex flex-col items-center gap-1
                p-3 rounded-xl transition-colors
                ${
                  isPlayingRef
                    ? "bg-primary-100 dark:bg-primary-900/40"
                    : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
              aria-label={
                isPlayingRef
                  ? "Pause reference audio"
                  : "Play reference audio"
              }
            >
              {isPlayingRef ? (
                <Pause className="w-5 h-5 text-primary-500" />
              ) : (
                <Play className="w-5 h-5 text-[var(--text-secondary)]" />
              )}
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Reference
              </span>
            </motion.button>
          )}

          {/* Record / Stop button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={
              recordingState === "recording" ? stopRecording : startRecording
            }
            disabled={recordingState === "recorded"}
            className="relative flex items-center justify-center"
            aria-label={
              recordingState === "recording"
                ? "Stop recording"
                : "Start recording"
            }
          >
            {/* Pulse ring while recording */}
            {recordingState === "recording" && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-red-400"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 0, 0.6],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
                aria-hidden="true"
              />
            )}
            <div
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                shadow-lg transition-colors
                ${
                  recordingState === "recording"
                    ? "bg-red-500 hover:bg-red-600"
                    : recordingState === "recorded"
                      ? "bg-[var(--surface-3)] cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600"
                }
              `}
            >
              {recordingState === "recording" ? (
                <Square className="w-5 h-5 text-white" fill="white" />
              ) : (
                <Mic
                  className={`w-6 h-6 ${
                    recordingState === "recorded"
                      ? "text-[var(--text-tertiary)]"
                      : "text-white"
                  }`}
                />
              )}
            </div>
          </motion.button>

          {/* Playback / Re-record */}
          {recordingState === "recorded" && recordedBlobUrl && (
            <>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleRecordingPlayback}
                className={`
                  flex flex-col items-center gap-1
                  p-3 rounded-xl transition-colors
                  ${
                    isPlayingRec
                      ? "bg-primary-100 dark:bg-primary-900/40"
                      : "bg-[var(--surface-2)] hover:bg-[var(--surface-3)]"
                  }
                `}
                aria-label={
                  isPlayingRec ? "Pause your recording" : "Play your recording"
                }
              >
                {isPlayingRec ? (
                  <Pause className="w-5 h-5 text-primary-500" />
                ) : (
                  <Play className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  Yours
                </span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={resetRecording}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors"
                aria-label="Re-record pronunciation"
              >
                <RotateCcw className="w-5 h-5 text-[var(--text-secondary)]" />
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  Retry
                </span>
              </motion.button>
            </>
          )}
        </div>

        {/* Similarity bar */}
        <AnimatePresence>
          {similarity !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="px-5 pb-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Similarity
                </span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {similarity}%{" "}
                  <span className="font-normal text-[var(--text-tertiary)]">
                    - {similarityLabel}
                  </span>
                </span>
              </div>
              <div
                className="w-full h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden"
                role="progressbar"
                aria-valuenow={similarity}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Pronunciation similarity: ${similarity}%`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${similarity}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full ${similarityColor}`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

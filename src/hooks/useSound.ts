import { useCallback, useRef, useEffect } from "react";
import { useUIStore } from "@/store/ui-store";

type SoundName = "tick" | "correct" | "wrong" | "celebration" | "flip" | "whoosh";

// Audio context and buffer cache for low-latency playback
interface SoundManager {
  audioContext: AudioContext | null;
  buffers: Map<SoundName, AudioBuffer>;
  initialized: boolean;
}

const soundManager: SoundManager = {
  audioContext: null,
  buffers: new Map(),
  initialized: false,
};

// Generate simple synthetic sounds using Web Audio API
function generateSound(
  ctx: AudioContext,
  type: SoundName
): AudioBuffer {
  const sampleRate = ctx.sampleRate;

  switch (type) {
    case "tick": {
      // Short click sound
      const duration = 0.05;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 80);
      }
      return buffer;
    }

    case "correct": {
      // Pleasant ascending two-tone
      const duration = 0.3;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = t < 0.15 ? 523.25 : 659.25; // C5 then E5
        data[i] =
          Math.sin(2 * Math.PI * freq * t) *
          Math.exp(-t * 8) *
          0.5;
      }
      return buffer;
    }

    case "wrong": {
      // Low buzz
      const duration = 0.25;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] =
          (Math.sin(2 * Math.PI * 200 * t) +
            Math.sin(2 * Math.PI * 240 * t) * 0.5) *
          Math.exp(-t * 10) *
          0.3;
      }
      return buffer;
    }

    case "celebration": {
      // Rising arpeggio
      const duration = 0.6;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const noteIndex = Math.min(Math.floor(t / 0.15), freqs.length - 1);
        const noteStart = noteIndex * 0.15;
        const noteT = t - noteStart;
        data[i] =
          Math.sin(2 * Math.PI * freqs[noteIndex] * t) *
          Math.exp(-noteT * 6) *
          0.4;
      }
      return buffer;
    }

    case "flip": {
      // Quick swoosh
      const duration = 0.12;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const freq = 400 + t * 2000; // Rising frequency
        data[i] =
          Math.sin(2 * Math.PI * freq * t) *
          Math.exp(-t * 30) *
          0.3;
      }
      return buffer;
    }

    case "whoosh": {
      // Gentle whoosh (noise-based)
      const duration = 0.2;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] =
          (Math.random() * 2 - 1) *
          Math.sin(Math.PI * t / duration) *
          0.15;
      }
      return buffer;
    }

    default: {
      const duration = 0.05;
      const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
      return buffer;
    }
  }
}

function initializeSoundManager() {
  if (soundManager.initialized) return;

  try {
    soundManager.audioContext = new (
      window.AudioContext ||
      (window as any).webkitAudioContext
    )();

    const ctx = soundManager.audioContext;
    if (!ctx) return;

    const soundNames: SoundName[] = [
      "tick",
      "correct",
      "wrong",
      "celebration",
      "flip",
      "whoosh",
    ];

    for (const name of soundNames) {
      const buffer = generateSound(ctx, name);
      soundManager.buffers.set(name, buffer);
    }

    soundManager.initialized = true;
  } catch (error) {
    console.warn("Web Audio API not available for sound effects");
  }
}

export function useSound() {
  const soundEnabled = useUIStore((s) => s.soundEnabled);
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      // Initialize on first user interaction
      const initOnInteraction = () => {
        initializeSoundManager();
        initRef.current = true;
        document.removeEventListener("click", initOnInteraction);
        document.removeEventListener("keydown", initOnInteraction);
      };
      document.addEventListener("click", initOnInteraction);
      document.addEventListener("keydown", initOnInteraction);

      return () => {
        document.removeEventListener("click", initOnInteraction);
        document.removeEventListener("keydown", initOnInteraction);
      };
    }
  }, []);

  const playSound = useCallback(
    (name: SoundName) => {
      if (!soundEnabled) return;
      if (!soundManager.initialized || !soundManager.audioContext) {
        initializeSoundManager();
      }

      const ctx = soundManager.audioContext;
      const buffer = soundManager.buffers.get(name);
      if (!ctx || !buffer) return;

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.5;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
      } catch (error) {
        // Fail silently
      }
    },
    [soundEnabled]
  );

  return { playSound };
}

import { useEffect, useCallback } from "react";
import { useUIStore } from "@/store/ui-store";

interface KeyboardShortcutsConfig {
  onFlip: () => void;
  onRate: (rating: "again" | "hard" | "good" | "easy") => void;
  onPause: () => void;
  onSkip: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onFlip,
  onRate,
  onPause,
  onSkip,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const shortcutsEnabled = useUIStore((s) => s.shortcutsEnabled);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !shortcutsEnabled) return;

      // Do not capture shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case " ": // Space = flip card
          event.preventDefault();
          onFlip();
          break;

        case "1": // 1 = Again
          event.preventDefault();
          onRate("again");
          break;

        case "2": // 2 = Hard
          event.preventDefault();
          onRate("hard");
          break;

        case "3": // 3 = Good
          event.preventDefault();
          onRate("good");
          break;

        case "4": // 4 = Easy
          event.preventDefault();
          onRate("easy");
          break;

        case "p": // P = Pause
        case "P":
          event.preventDefault();
          onPause();
          break;

        case "s": // S = Skip
        case "S":
          event.preventDefault();
          onSkip();
          break;

        case "Enter": // Enter = flip (alternative)
          event.preventDefault();
          onFlip();
          break;
      }
    },
    [enabled, shortcutsEnabled, onFlip, onRate, onPause, onSkip]
  );

  useEffect(() => {
    if (!enabled || !shortcutsEnabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, shortcutsEnabled, handleKeyDown]);
}

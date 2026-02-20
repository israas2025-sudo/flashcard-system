"use client";

import React, { useEffect, useRef } from "react";

interface ConfettiCelebrationProps {
  trigger: boolean;
  particleCount?: number;
  accentColor?: string;
}

export function ConfettiCelebration({
  trigger,
  particleCount = 40,
  accentColor,
}: ConfettiCelebrationProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!trigger || hasFired.current) return;
    hasFired.current = true;

    const loadAndFire = async () => {
      try {
        const confetti = (await import("canvas-confetti")).default;

        // Language accent colors
        const defaultColors = [
          "#6366F1", // Primary indigo
          "#F59E0B", // Arabic amber
          "#14B8A6", // Quran teal
          "#F97316", // Spanish coral
          "#8B5CF6", // Egyptian purple
          "#22C55E", // Success green
        ];

        const colors = accentColor
          ? [accentColor, "#FFFFFF", accentColor + "80"]
          : defaultColors;

        // Main burst
        confetti({
          particleCount,
          spread: 80,
          origin: { y: 0.6, x: 0.5 },
          colors,
          ticks: 200,
          gravity: 1.2,
          scalar: 1.1,
          shapes: ["circle", "square"],
          drift: 0,
        });

        // Side bursts after a short delay
        setTimeout(() => {
          confetti({
            particleCount: Math.floor(particleCount / 2),
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.65 },
            colors,
            ticks: 150,
          });
          confetti({
            particleCount: Math.floor(particleCount / 2),
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.65 },
            colors,
            ticks: 150,
          });
        }, 200);

        // Final gentle shower
        setTimeout(() => {
          confetti({
            particleCount: Math.floor(particleCount / 3),
            spread: 100,
            origin: { y: 0.3, x: 0.5 },
            colors,
            ticks: 100,
            gravity: 0.8,
            scalar: 0.8,
          });
        }, 500);
      } catch (error) {
        // canvas-confetti not available, fail silently
        console.warn("Confetti library not loaded");
      }
    };

    loadAndFire();
  }, [trigger, particleCount, accentColor]);

  // Reset hasFired when trigger goes false
  useEffect(() => {
    if (!trigger) {
      hasFired.current = false;
    }
  }, [trigger]);

  return null; // This component is invisible, it just fires confetti
}

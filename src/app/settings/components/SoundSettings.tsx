"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play } from "lucide-react";
import { Toggle } from "./AppearanceSettings";

interface SoundSettingsState {
  masterVolume: number;
  enabled: boolean;
  cardFlip: boolean;
  correct: boolean;
  incorrect: boolean;
  celebration: boolean;
  milestone: boolean;
  levelUp: boolean;
  achievement: boolean;
}

interface SoundSettingsProps {
  settings?: Partial<SoundSettingsState>;
  onSave?: (settings: SoundSettingsState) => void;
}

const SOUND_ITEMS: {
  key: keyof Omit<SoundSettingsState, "masterVolume" | "enabled">;
  label: string;
  description: string;
}[] = [
  { key: "cardFlip", label: "Card Flip", description: "Soft click when flipping a card" },
  { key: "correct", label: "Correct Answer", description: "Rising chime for correct recalls" },
  { key: "incorrect", label: "Incorrect Answer", description: "Muted tone for lapses" },
  { key: "celebration", label: "Session Complete", description: "Celebration arpeggio at session end" },
  { key: "milestone", label: "Streak Milestone", description: "Resonant chord for streak achievements" },
  { key: "levelUp", label: "Level Up", description: "Ascending arpeggio for leveling up" },
  { key: "achievement", label: "Achievement", description: "Bell chime for achievement unlocks" },
];

export function SoundSettings({ settings, onSave }: SoundSettingsProps) {
  const [state, setState] = useState<SoundSettingsState>({
    masterVolume: settings?.masterVolume ?? 50,
    enabled: settings?.enabled ?? true,
    cardFlip: settings?.cardFlip ?? true,
    correct: settings?.correct ?? true,
    incorrect: settings?.incorrect ?? true,
    celebration: settings?.celebration ?? true,
    milestone: settings?.milestone ?? true,
    levelUp: settings?.levelUp ?? true,
    achievement: settings?.achievement ?? true,
  });

  const update = <K extends keyof SoundSettingsState>(
    key: K,
    value: SoundSettingsState[K]
  ) => {
    const next = { ...state, [key]: value };
    setState(next);
    onSave?.(next);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sound</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Configure sound effects and volume. All sounds are synthesized -- no
          audio files needed.
        </p>
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)]">
        <div className="flex items-center gap-3">
          {state.enabled ? (
            <Volume2 className="w-5 h-5 text-primary-500" />
          ) : (
            <VolumeX className="w-5 h-5 text-[var(--text-tertiary)]" />
          )}
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Sound Effects
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {state.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
        </div>
        <Toggle checked={state.enabled} onChange={(v) => update("enabled", v)} />
      </div>

      {/* Master Volume */}
      <div className={state.enabled ? "" : "opacity-40 pointer-events-none"}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Master Volume
          </label>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {state.masterVolume}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={state.masterVolume}
          onChange={(e) => update("masterVolume", parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-3)] accent-primary-500"
        />
        <div className="flex justify-between mt-1">
          <VolumeX className="w-3 h-3 text-[var(--text-tertiary)]" />
          <Volume2 className="w-3 h-3 text-[var(--text-tertiary)]" />
        </div>
      </div>

      {/* Individual Sound Toggles */}
      <div className={`space-y-1 ${state.enabled ? "" : "opacity-40 pointer-events-none"}`}>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          Individual Sounds
        </label>
        {SOUND_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-2.5 px-1"
          >
            <div className="flex items-center gap-3 flex-1">
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  {item.label}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors"
                title={`Preview ${item.label}`}
              >
                <Play className="w-3 h-3 text-[var(--text-tertiary)]" />
              </motion.button>
              <Toggle
                checked={state[item.key] as boolean}
                onChange={(v) => update(item.key, v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

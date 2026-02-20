// @ts-nocheck
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Monitor, Palette, Eye } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

type ThemeMode = "light" | "dark" | "auto";

const ACCENT_COLORS = [
  { name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
  { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
  { name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
  { name: "Emerald", value: "#10b981", class: "bg-emerald-500" },
  { name: "Amber", value: "#f59e0b", class: "bg-amber-500" },
  { name: "Rose", value: "#f43f5e", class: "bg-rose-500" },
  { name: "Violet", value: "#8b5cf6", class: "bg-violet-500" },
  { name: "Slate", value: "#64748b", class: "bg-slate-500" },
];

interface AppearanceSettingsProps {
  onThemeChange?: (theme: ThemeMode) => void;
  onAccentChange?: (color: string) => void;
}

export function AppearanceSettings({
  onThemeChange,
  onAccentChange,
}: AppearanceSettingsProps) {
  const { darkMode, setDarkMode } = useUIStore();
  const [themeMode, setThemeMode] = useState<ThemeMode>(darkMode ? "dark" : "light");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [reducedMotion, setReducedMotion] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    if (mode === "dark") {
      setDarkMode(true);
    } else if (mode === "light") {
      setDarkMode(false);
    } else {
      // Auto: match system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDarkMode(prefersDark);
    }
    onThemeChange?.(mode);
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    onAccentChange?.(color);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Customize the look and feel of the application.
        </p>
      </div>

      {/* Theme Selection */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          Theme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { mode: "light" as const, label: "Light", icon: Sun },
              { mode: "dark" as const, label: "Dark", icon: Moon },
              { mode: "auto" as const, label: "System", icon: Monitor },
            ] as const
          ).map(({ mode, label, icon: Icon }) => (
            <motion.button
              key={mode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleThemeChange(mode)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${
                  themeMode === mode
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                    : "border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                }
              `}
            >
              <Icon
                className={`w-5 h-5 ${
                  themeMode === mode
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-[var(--text-tertiary)]"
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  themeMode === mode
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Accent Color
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((color) => (
            <motion.button
              key={color.value}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAccentChange(color.value)}
              className={`
                w-8 h-8 rounded-full transition-all
                ${color.class}
                ${
                  accentColor === color.value
                    ? "ring-2 ring-offset-2 ring-offset-[var(--surface-0)]"
                    : ""
                }
              `}
              style={
                accentColor === color.value
                  ? { ringColor: color.value }
                  : undefined
              }
              title={color.name}
            />
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
          Selected: {ACCENT_COLORS.find((c) => c.value === accentColor)?.name || "Custom"}
        </p>
      </div>

      {/* Reduced Motion */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--text-tertiary)]" />
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Reduced Motion
              </label>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Minimize animations and transitions
              </p>
            </div>
          </div>
          <Toggle checked={reducedMotion} onChange={setReducedMotion} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle Component
// ---------------------------------------------------------------------------

export function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${checked ? "bg-primary-500" : "bg-[var(--surface-3)]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow-sm
          ${checked ? "ml-6" : "ml-1"}
        `}
      />
    </button>
  );
}

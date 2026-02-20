"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  BookOpen,
  Palette,
  Volume2,
  VolumeX,
  Settings,
  Globe,
  Mail,
  Camera,
  Save,
  Clock,
  Target,
  Brain,
  Sun,
  Moon,
  Monitor,
  Eye,
  Download,
  Upload,
  Trash2,
  Info,
  Play,
  AlertTriangle,
  Check,
  Type,
} from "lucide-react";

// =============================================================================
// localStorage helpers
// =============================================================================

const STORAGE_KEY = "lughati-settings";

interface AllSettings {
  profile: ProfileData;
  study: StudyData;
  languages: LanguagesData;
  appearance: AppearanceData;
  sound: SoundData;
}

function loadSettings(): AllSettings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings(), ...parsed };
    }
  } catch {
    // ignore
  }
  return defaultSettings();
}

function saveSettings(settings: AllSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function defaultSettings(): AllSettings {
  return {
    profile: {
      displayName: "",
      email: "",
    },
    study: {
      dailyGoalCards: 50,
      newCardsPerDay: 20,
      sessionTimerMinutes: 25,
      algorithm: "fsrs",
      desiredRetention: 0.9,
      fsrsWeights: "0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61",
    },
    languages: {
      arabicMSA: true,
      egyptianArabic: true,
      spanish: true,
      showTashkeel: true,
      showTransliteration: true,
    },
    appearance: {
      theme: "system",
      fontSize: 16,
      cardAnimationSpeed: 300,
      reduceMotion: false,
    },
    sound: {
      masterVolume: 75,
      cardFlip: true,
      correctAnswer: true,
      wrongAnswer: true,
      sessionComplete: true,
    },
  };
}

// =============================================================================
// Data types
// =============================================================================

interface ProfileData {
  displayName: string;
  email: string;
}

interface StudyData {
  dailyGoalCards: number;
  newCardsPerDay: number;
  sessionTimerMinutes: number;
  algorithm: "fsrs" | "sm2";
  desiredRetention: number;
  fsrsWeights: string;
}

interface LanguagesData {
  arabicMSA: boolean;
  egyptianArabic: boolean;
  spanish: boolean;
  showTashkeel: boolean;
  showTransliteration: boolean;
}

interface AppearanceData {
  theme: "system" | "light" | "dark";
  fontSize: number;
  cardAnimationSpeed: number;
  reduceMotion: boolean;
}

interface SoundData {
  masterVolume: number;
  cardFlip: boolean;
  correctAnswer: boolean;
  wrongAnswer: boolean;
  sessionComplete: boolean;
}

// =============================================================================
// Toggle component (reusable)
// =============================================================================

function Toggle({
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
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0
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

// =============================================================================
// Section configuration
// =============================================================================

type SectionId =
  | "profile"
  | "study"
  | "languages"
  | "appearance"
  | "sound"
  | "more";

interface SectionConfig {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "profile",
    label: "Profile",
    icon: <User className="w-4 h-4" />,
    description: "Name, email, and account info",
  },
  {
    id: "study",
    label: "Study",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Daily goals, session timer, FSRS",
  },
  {
    id: "languages",
    label: "Languages",
    icon: <Globe className="w-4 h-4" />,
    description: "Language tracks, tashkeel, transliteration",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="w-4 h-4" />,
    description: "Theme, font size, animations",
  },
  {
    id: "sound",
    label: "Sound",
    icon: <Volume2 className="w-4 h-4" />,
    description: "Volume and sound effect toggles",
  },
  {
    id: "more",
    label: "More",
    icon: <Settings className="w-4 h-4" />,
    description: "Export, import, reset, about",
  },
];

// =============================================================================
// Profile Tab
// =============================================================================

function ProfileTab({
  data,
  onUpdate,
}: {
  data: ProfileData;
  onUpdate: (d: ProfileData) => void;
}) {
  const [displayName, setDisplayName] = useState(data.displayName);
  const [email, setEmail] = useState(data.email);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ displayName, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Profile
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Manage your account information.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center overflow-hidden">
            <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--surface-0)] border border-[var(--surface-3)] flex items-center justify-center shadow-sm hover:bg-[var(--surface-2)] transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {displayName || "Your Name"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {email || "you@example.com"}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Display Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="Your name"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sm"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Study Tab
// =============================================================================

function StudyTab({
  data,
  onUpdate,
}: {
  data: StudyData;
  onUpdate: (d: StudyData) => void;
}) {
  const [state, setState] = useState<StudyData>(data);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof StudyData>(key: K, value: StudyData[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(state);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Study
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Configure daily goals, session timing, and the FSRS scheduling
          algorithm.
        </p>
      </div>

      <div className="space-y-5">
        {/* Daily Goal */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Daily Goal (total cards)
          </label>
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="number"
              min="1"
              max="999"
              value={state.dailyGoalCards}
              onChange={(e) =>
                update("dailyGoalCards", parseInt(e.target.value) || 1)
              }
              className="w-24 h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-xs text-[var(--text-tertiary)]">cards</span>
          </div>
        </div>

        {/* New Cards Per Day */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            New Cards Per Day
          </label>
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="number"
              min="0"
              max="999"
              value={state.newCardsPerDay}
              onChange={(e) =>
                update("newCardsPerDay", parseInt(e.target.value) || 0)
              }
              className="w-24 h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-xs text-[var(--text-tertiary)]">cards</span>
          </div>
        </div>

        {/* Session Timer */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Session Timer
          </label>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <select
              value={state.sessionTimerMinutes}
              onChange={(e) =>
                update("sessionTimerMinutes", parseInt(e.target.value))
              }
              className="h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value={0}>No timer</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={20}>20 minutes</option>
              <option value={25}>25 minutes (Pomodoro)</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </div>
        </div>

        {/* Scheduling Algorithm */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Scheduling Algorithm
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["fsrs", "sm2"] as const).map((alg) => (
              <button
                key={alg}
                type="button"
                onClick={() => update("algorithm", alg)}
                className={`
                  flex items-center gap-2.5 p-3 rounded-lg border-2 text-left transition-all
                  ${
                    state.algorithm === alg
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                      : "border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                  }
                `}
              >
                <Brain
                  className={`w-4 h-4 flex-shrink-0 ${
                    state.algorithm === alg
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-[var(--text-tertiary)]"
                  }`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold ${
                      state.algorithm === alg
                        ? "text-primary-600 dark:text-primary-400"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {alg === "fsrs" ? "FSRS-5" : "SM-2"}
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {alg === "fsrs"
                      ? "Modern, adaptive (recommended)"
                      : "Classic Anki algorithm"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Desired Retention */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Desired Retention
            </label>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
              {Math.round(state.desiredRetention * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="70"
            max="97"
            value={Math.round(state.desiredRetention * 100)}
            onChange={(e) =>
              update("desiredRetention", parseInt(e.target.value) / 100)
            }
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-3)] accent-primary-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              70% (fewer reviews)
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              97% (more reviews)
            </span>
          </div>
        </div>

        {/* FSRS Weights */}
        {state.algorithm === "fsrs" && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              FSRS Parameters (advanced)
            </label>
            <textarea
              value={state.fsrsWeights}
              onChange={(e) => update("fsrsWeights", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-xs text-[var(--text-primary)] font-mono placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              placeholder="Comma-separated FSRS-5 weights"
            />
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
              Leave as default unless you know what you are doing. These weights
              are optimized per-user by the FSRS optimizer.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sm"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Languages Tab
// =============================================================================

interface LanguageItem {
  key: keyof Pick<LanguagesData, "arabicMSA" | "egyptianArabic" | "spanish">;
  name: string;
  description: string;
}

const LANGUAGE_ITEMS: LanguageItem[] = [
  {
    key: "arabicMSA",
    name: "Arabic (MSA / Quran)",
    description: "Modern Standard Arabic and Quranic vocabulary",
  },
  {
    key: "egyptianArabic",
    name: "Egyptian Arabic",
    description: "Colloquial Egyptian dialect",
  },
  {
    key: "spanish",
    name: "Spanish",
    description: "Latin American and Castilian Spanish",
  },
];

function LanguagesTab({
  data,
  onUpdate,
}: {
  data: LanguagesData;
  onUpdate: (d: LanguagesData) => void;
}) {
  const [state, setState] = useState<LanguagesData>(data);
  const [saved, setSaved] = useState(false);

  const toggle = <K extends keyof LanguagesData>(key: K) => {
    setState((s) => ({ ...s, [key]: !s[key] }));
  };

  const handleSave = () => {
    onUpdate(state);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Languages
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Enable or disable language tracks and configure Arabic display
          options.
        </p>
      </div>

      {/* Language toggles */}
      <div className="space-y-3">
        <label className="block text-xs font-medium text-[var(--text-secondary)]">
          Active Languages
        </label>
        {LANGUAGE_ITEMS.map((lang) => (
          <div
            key={lang.key}
            className={`
              flex items-center justify-between p-4 rounded-xl border transition-all
              ${
                state[lang.key]
                  ? "border-[var(--surface-3)] bg-[var(--surface-0)]"
                  : "border-[var(--surface-3)] bg-[var(--surface-1)] opacity-60"
              }
            `}
          >
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {lang.name}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                {lang.description}
              </p>
            </div>
            <Toggle
              checked={state[lang.key]}
              onChange={() => toggle(lang.key)}
            />
          </div>
        ))}
      </div>

      {/* Arabic display options */}
      <div className="space-y-4">
        <label className="block text-xs font-medium text-[var(--text-secondary)]">
          Arabic Display Options
        </label>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Show Tashkeel (diacritics)
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Display Arabic vowel marks:{" "}
              <span style={{ fontFamily: "'Amiri', serif" }}>
                كِتَابٌ
              </span>{" "}
              vs{" "}
              <span style={{ fontFamily: "'Amiri', serif" }}>كتاب</span>
            </p>
          </div>
          <Toggle
            checked={state.showTashkeel}
            onChange={() => toggle("showTashkeel")}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-xs font-medium text-[var(--text-primary)]">
              Show Transliteration
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Display romanized pronunciation beneath Arabic text (e.g.,
              &quot;kitaabun&quot;)
            </p>
          </div>
          <Toggle
            checked={state.showTransliteration}
            onChange={() => toggle("showTransliteration")}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sm"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Appearance Tab
// =============================================================================

function AppearanceTab({
  data,
  onUpdate,
}: {
  data: AppearanceData;
  onUpdate: (d: AppearanceData) => void;
}) {
  const [state, setState] = useState<AppearanceData>(data);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppearanceData>(
    key: K,
    value: AppearanceData[K]
  ) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(state);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themeOptions = [
    { mode: "system" as const, label: "System", icon: Monitor },
    { mode: "light" as const, label: "Light", icon: Sun },
    { mode: "dark" as const, label: "Dark", icon: Moon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Appearance
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Customize theme, font size, and animation preferences.
        </p>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
          Theme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => update("theme", mode)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${
                  state.theme === mode
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                    : "border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                }
              `}
            >
              <Icon
                className={`w-5 h-5 ${
                  state.theme === mode
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-[var(--text-tertiary)]"
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  state.theme === mode
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            Font Size
          </label>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {state.fontSize}px
          </span>
        </div>
        <input
          type="range"
          min="12"
          max="24"
          value={state.fontSize}
          onChange={(e) => update("fontSize", parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-3)] accent-primary-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            12px (compact)
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            24px (large)
          </span>
        </div>
      </div>

      {/* Card Animation Speed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Card Animation Speed
          </label>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {state.cardAnimationSpeed}ms
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="800"
          step="50"
          value={state.cardAnimationSpeed}
          onChange={(e) =>
            update("cardAnimationSpeed", parseInt(e.target.value))
          }
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-3)] accent-primary-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            0ms (instant)
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">
            800ms (slow)
          </span>
        </div>
      </div>

      {/* Reduce Motion */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-[var(--text-tertiary)]" />
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Reduce Motion
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Minimize animations and transitions for accessibility
            </p>
          </div>
        </div>
        <Toggle
          checked={state.reduceMotion}
          onChange={(v) => update("reduceMotion", v)}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors shadow-sm"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// Sound Tab
// =============================================================================

interface SoundToggleItem {
  key: keyof Omit<SoundData, "masterVolume">;
  label: string;
  description: string;
}

const SOUND_TOGGLE_ITEMS: SoundToggleItem[] = [
  {
    key: "cardFlip",
    label: "Card Flip",
    description: "Soft click when flipping a card",
  },
  {
    key: "correctAnswer",
    label: "Correct Answer",
    description: "Rising chime for correct recalls",
  },
  {
    key: "wrongAnswer",
    label: "Wrong Answer",
    description: "Muted tone for incorrect answers",
  },
  {
    key: "sessionComplete",
    label: "Session Complete",
    description: "Celebration sound at session end",
  },
];

function SoundTab({
  data,
  onUpdate,
}: {
  data: SoundData;
  onUpdate: (d: SoundData) => void;
}) {
  const [state, setState] = useState<SoundData>(data);

  const update = <K extends keyof SoundData>(key: K, value: SoundData[K]) => {
    const next = { ...state, [key]: value };
    setState(next);
    onUpdate(next);
  };

  const allSoundsEnabled = SOUND_TOGGLE_ITEMS.every(
    (item) => state[item.key]
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Sound
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Configure volume and sound effect preferences. Changes save
          automatically.
        </p>
      </div>

      {/* Master Volume */}
      <div className="p-4 rounded-xl bg-[var(--surface-0)] border border-[var(--surface-3)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {state.masterVolume > 0 ? (
              <Volume2 className="w-5 h-5 text-primary-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-[var(--text-tertiary)]" />
            )}
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Master Volume
            </label>
          </div>
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
      <div
        className={
          state.masterVolume === 0
            ? "opacity-40 pointer-events-none"
            : ""
        }
      >
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-3">
          Sound Effects
        </label>
        <div className="space-y-1">
          {SOUND_TOGGLE_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-2.5 px-1"
            >
              <div className="flex-1">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  {item.label}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)]">
                  {item.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors"
                  title={`Preview ${item.label}`}
                >
                  <Play className="w-3 h-3 text-[var(--text-tertiary)]" />
                </button>
                <Toggle
                  checked={state[item.key] as boolean}
                  onChange={(v) => update(item.key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// More Tab
// =============================================================================

function MoreTab() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleExport = async () => {
    setExportStatus("exporting");
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const blob = new Blob([raw || "{}"], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lughati-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("done");
      setTimeout(() => setExportStatus(null), 2000);
    } catch {
      setExportStatus("error");
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportStatus("importing");
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Merge with defaults so any missing keys get filled in
        const merged = { ...defaultSettings(), ...parsed };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        setImportStatus("done");
        setTimeout(() => {
          setImportStatus(null);
          window.location.reload();
        }, 1500);
      } catch {
        setImportStatus("error");
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    input.click();
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfirmReset(false);
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          More
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Export, import, reset, and app information.
        </p>
      </div>

      {/* Export */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Export Data
        </h4>
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Download all your settings as a JSON file.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportStatus === "exporting"}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--surface-3)] text-xs font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
        >
          {exportStatus === "exporting" ? (
            <>Exporting...</>
          ) : exportStatus === "done" ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              Downloaded
            </>
          ) : exportStatus === "error" ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Export failed
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Export Data
            </>
          )}
        </button>
      </div>

      <div className="border-t border-[var(--surface-3)]" />

      {/* Import */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Import Data
        </h4>
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Restore settings from a previously exported JSON file. This will
          overwrite your current settings.
        </p>
        <button
          type="button"
          onClick={handleImport}
          disabled={importStatus === "importing"}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--surface-1)] text-[var(--text-primary)] border border-[var(--surface-3)] text-xs font-medium hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50"
        >
          {importStatus === "importing" ? (
            <>Importing...</>
          ) : importStatus === "done" ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              Imported -- reloading...
            </>
          ) : importStatus === "error" ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Invalid file
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              Import Data
            </>
          )}
        </button>
      </div>

      <div className="border-t border-[var(--surface-3)]" />

      {/* Reset Progress */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          Reset Progress
        </h4>
        <p className="text-[10px] text-[var(--text-tertiary)]">
          Clear all saved settings and return to defaults. This cannot be
          undone.
        </p>
        {confirmReset ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Are you sure?
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Yes, reset everything
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="inline-flex items-center h-8 px-3 rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--surface-3)] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset All Settings
          </button>
        )}
      </div>

      <div className="border-t border-[var(--surface-3)]" />

      {/* About */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
          About Lughati
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">App</span>
            <span className="text-[var(--text-primary)] font-medium">
              Lughati
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Version</span>
            <span className="text-[var(--text-primary)] font-medium">
              1.0.0
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Algorithm</span>
            <span className="text-[var(--text-primary)] font-medium">
              FSRS-5
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface-0)] border border-[var(--surface-3)]">
          <Info className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">
            Lughati is a multilingual spaced repetition flashcard system built
            with Next.js, React, TypeScript, Tailwind CSS, and the FSRS-5
            algorithm. Designed for learners studying Arabic, Spanish, and
            more.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Settings Page (main)
// =============================================================================

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever settings change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveSettings(settings);
    }
  }, [settings, hydrated]);

  const updateProfile = useCallback(
    (profile: ProfileData) =>
      setSettings((s) => ({ ...s, profile })),
    []
  );

  const updateStudy = useCallback(
    (study: StudyData) =>
      setSettings((s) => ({ ...s, study })),
    []
  );

  const updateLanguages = useCallback(
    (languages: LanguagesData) =>
      setSettings((s) => ({ ...s, languages })),
    []
  );

  const updateAppearance = useCallback(
    (appearance: AppearanceData) =>
      setSettings((s) => ({ ...s, appearance })),
    []
  );

  const updateSound = useCallback(
    (sound: SoundData) =>
      setSettings((s) => ({ ...s, sound })),
    []
  );

  const renderSection = () => {
    if (!hydrated) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (activeSection) {
      case "profile":
        return (
          <ProfileTab data={settings.profile} onUpdate={updateProfile} />
        );
      case "study":
        return <StudyTab data={settings.study} onUpdate={updateStudy} />;
      case "languages":
        return (
          <LanguagesTab
            data={settings.languages}
            onUpdate={updateLanguages}
          />
        );
      case "appearance":
        return (
          <AppearanceTab
            data={settings.appearance}
            onUpdate={updateAppearance}
          />
        );
      case "sound":
        return <SoundTab data={settings.sound} onUpdate={updateSound} />;
      case "more":
        return <MoreTab />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your Lughati account, study preferences, and application
          configuration.
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:w-64 flex-shrink-0"
        >
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] overflow-hidden">
            {SECTIONS.map((section, index) => {
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                    ${
                      isActive
                        ? "bg-primary-50 dark:bg-primary-950/30 border-l-2 border-l-primary-500"
                        : "hover:bg-[var(--surface-2)] border-l-2 border-l-transparent"
                    }
                    ${index > 0 ? "border-t border-[var(--surface-3)]" : ""}
                  `}
                >
                  <div
                    className={`
                      flex-shrink-0
                      ${
                        isActive
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-[var(--text-tertiary)]"
                      }
                    `}
                  >
                    {section.icon}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`
                        text-xs font-semibold truncate
                        ${
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-[var(--text-primary)]"
                        }
                      `}
                    >
                      {section.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.nav>

        {/* Content Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 min-w-0"
        >
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

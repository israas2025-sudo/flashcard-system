"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Target, Brain, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface StudySettingsState {
  dayBoundaryHour: number;
  desiredRetention: number;
  algorithm: "fsrs" | "sm2";
  timezone: string;
  newCardsPerDay: number;
  reviewsPerDay: number;
}

interface StudySettingsProps {
  settings?: Partial<StudySettingsState>;
  onSave?: (settings: StudySettingsState) => void;
}

export function StudySettings({ settings, onSave }: StudySettingsProps) {
  const [state, setState] = useState<StudySettingsState>({
    dayBoundaryHour: settings?.dayBoundaryHour ?? 4,
    desiredRetention: settings?.desiredRetention ?? 0.9,
    algorithm: settings?.algorithm ?? "fsrs",
    timezone: settings?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    newCardsPerDay: settings?.newCardsPerDay ?? 20,
    reviewsPerDay: settings?.reviewsPerDay ?? 200,
  });
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof StudySettingsState>(
    key: K,
    value: StudySettingsState[K]
  ) => {
    setState((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    onSave?.(state);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Study</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Configure your scheduling algorithm, daily limits, and timing preferences.
        </p>
      </div>

      <div className="space-y-5">
        {/* Algorithm Choice */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
            Scheduling Algorithm
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["fsrs", "sm2"] as const).map((alg) => (
              <button
                key={alg}
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
            onChange={(e) => update("desiredRetention", parseInt(e.target.value) / 100)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--surface-3)] accent-primary-500"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[var(--text-tertiary)]">70% (fewer reviews)</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">97% (more reviews)</span>
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
              onChange={(e) => update("newCardsPerDay", parseInt(e.target.value) || 0)}
              className="w-24 h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-xs text-[var(--text-tertiary)]">cards</span>
          </div>
        </div>

        {/* Max Reviews Per Day */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Maximum Reviews Per Day
          </label>
          <div className="flex items-center gap-3">
            <Target className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <input
              type="number"
              min="0"
              max="9999"
              value={state.reviewsPerDay}
              onChange={(e) => update("reviewsPerDay", parseInt(e.target.value) || 0)}
              className="w-24 h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-xs text-[var(--text-tertiary)]">reviews</span>
          </div>
        </div>

        {/* Day Boundary */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Day Boundary Hour
          </label>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <select
              value={state.dayBoundaryHour}
              onChange={(e) => update("dayBoundaryHour", parseInt(e.target.value))}
              className="h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-tertiary)]">
              Reviews before this hour count as previous day
            </span>
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Timezone
          </label>
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            <select
              value={state.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="h-9 px-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent max-w-xs"
            >
              {[
                "America/New_York",
                "America/Chicago",
                "America/Denver",
                "America/Los_Angeles",
                "Europe/London",
                "Europe/Paris",
                "Europe/Berlin",
                "Asia/Dubai",
                "Asia/Riyadh",
                "Asia/Cairo",
                "Asia/Tokyo",
                "Australia/Sydney",
              ].map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSave}
        loading={saving}
        icon={<Save className="w-3.5 h-3.5" />}
      >
        Save Changes
      </Button>
    </div>
  );
}

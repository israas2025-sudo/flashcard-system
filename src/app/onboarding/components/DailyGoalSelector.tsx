"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Clock, Target, Flame } from "lucide-react";

export type StudyTimePreference = "morning" | "afternoon" | "evening";

const DAILY_GOALS = [
  {
    value: 10,
    label: "10 cards",
    description: "Light study",
    time: "~5 min/day",
    icon: <Clock className="w-5 h-5" />,
  },
  {
    value: 20,
    label: "20 cards",
    description: "Recommended",
    time: "~10 min/day",
    icon: <Target className="w-5 h-5" />,
    recommended: true,
  },
  {
    value: 30,
    label: "30 cards",
    description: "Moderate study",
    time: "~15 min/day",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    value: 50,
    label: "50 cards",
    description: "Intensive study",
    time: "~25 min/day",
    icon: <Flame className="w-5 h-5" />,
  },
];

const TIME_PREFERENCES: {
  value: StudyTimePreference;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    value: "morning",
    label: "Morning",
    icon: "🌅",
    description: "6 AM - 12 PM",
  },
  {
    value: "afternoon",
    label: "Afternoon",
    icon: "☀️",
    description: "12 PM - 6 PM",
  },
  {
    value: "evening",
    label: "Evening",
    icon: "🌙",
    description: "6 PM - 11 PM",
  },
];

interface DailyGoalSelectorProps {
  dailyGoal: number;
  studyTime: StudyTimePreference;
  onGoalChange: (goal: number) => void;
  onStudyTimeChange: (time: StudyTimePreference) => void;
}

export function DailyGoalSelector({
  dailyGoal,
  studyTime,
  onGoalChange,
  onStudyTimeChange,
}: DailyGoalSelectorProps) {
  return (
    <div className="space-y-10">
      {/* Daily Goal Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Set your daily goal
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            How many new cards would you like to learn each day?
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {DAILY_GOALS.map((goal, index) => {
            const isActive = dailyGoal === goal.value;

            return (
              <motion.button
                key={goal.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onGoalChange(goal.value)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2
                  transition-all duration-200
                  ${
                    isActive
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-sm"
                      : "border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--text-tertiary)]"
                  }
                `}
              >
                {goal.recommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-semibold rounded-full whitespace-nowrap">
                    Recommended
                  </span>
                )}

                <div
                  className={`
                    ${isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--text-tertiary)]"}
                  `}
                >
                  {goal.icon}
                </div>

                <span
                  className={`
                    text-lg font-bold
                    ${isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--text-primary)]"}
                  `}
                >
                  {goal.value}
                </span>

                <span className="text-xs text-[var(--text-secondary)] font-medium">
                  {goal.description}
                </span>

                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {goal.time}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Study Time Preference Section */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            When do you prefer to study?
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            We'll send reminders and optimize streak timing for your schedule.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
          {TIME_PREFERENCES.map((pref, index) => {
            const isActive = studyTime === pref.value;

            return (
              <motion.button
                key={pref.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.06 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onStudyTimeChange(pref.value)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2
                  transition-all duration-200
                  ${
                    isActive
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 shadow-sm"
                      : "border-[var(--surface-3)] bg-[var(--surface-1)] hover:border-[var(--text-tertiary)]"
                  }
                `}
              >
                <span className="text-2xl">{pref.icon}</span>
                <span
                  className={`
                    text-sm font-semibold
                    ${isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--text-primary)]"}
                  `}
                >
                  {pref.label}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {pref.description}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

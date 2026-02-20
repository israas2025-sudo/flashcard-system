"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, GraduationCap } from "lucide-react";

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced";
export type LanguageId = "arabic" | "egyptian" | "spanish" | "english";

interface LanguageLevelSelection {
  language: LanguageId;
  level: ProficiencyLevel;
}

const LANGUAGE_NAMES: Record<LanguageId, { name: string; flag: string }> = {
  arabic: { name: "Classical Arabic / Quran", flag: "🕌" },
  egyptian: { name: "Egyptian Arabic", flag: "🇪🇬" },
  spanish: { name: "Spanish", flag: "🇪🇸" },
  english: { name: "English", flag: "🇬🇧" },
};

const LEVELS: { id: ProficiencyLevel; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Just starting out",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Know the basics",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Refining my skills",
    icon: <GraduationCap className="w-4 h-4" />,
  },
];

interface LevelSelectorProps {
  languages: LanguageId[];
  selections: LanguageLevelSelection[];
  onChange: (selections: LanguageLevelSelection[]) => void;
}

export function LevelSelector({ languages, selections, onChange }: LevelSelectorProps) {
  const getLevel = (langId: LanguageId): ProficiencyLevel => {
    return selections.find((s) => s.language === langId)?.level || "beginner";
  };

  const setLevel = (langId: LanguageId, level: ProficiencyLevel) => {
    const existing = selections.filter((s) => s.language !== langId);
    onChange([...existing, { language: langId, level }]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          What's your level in each?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          This helps us choose the right starter cards for you.
        </p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {languages.map((langId, langIndex) => {
          const langInfo = LANGUAGE_NAMES[langId];
          const currentLevel = getLevel(langId);

          return (
            <motion.div
              key={langId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: langIndex * 0.1 }}
              className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5"
            >
              {/* Language header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{langInfo.flag}</span>
                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                  {langInfo.name}
                </h3>
              </div>

              {/* Level buttons */}
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((level) => {
                  const isActive = currentLevel === level.id;

                  return (
                    <motion.button
                      key={level.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setLevel(langId, level.id)}
                      className={`
                        relative flex flex-col items-center gap-1.5 py-3 px-3 rounded-lg
                        border-2 transition-all duration-200 text-center
                        ${
                          isActive
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                            : "border-[var(--surface-3)] bg-[var(--surface-0)] hover:border-[var(--text-tertiary)]"
                        }
                      `}
                    >
                      <div
                        className={`
                          ${isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--text-tertiary)]"}
                        `}
                      >
                        {level.icon}
                      </div>
                      <span
                        className={`
                          text-xs font-semibold
                          ${isActive ? "text-primary-600 dark:text-primary-400" : "text-[var(--text-primary)]"}
                        `}
                      >
                        {level.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {level.description}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

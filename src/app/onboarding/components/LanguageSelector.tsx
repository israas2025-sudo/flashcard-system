"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type LanguageId = "arabic" | "egyptian" | "spanish" | "english";

interface LanguageOption {
  id: LanguageId;
  name: string;
  nativeName: string;
  description: string;
  flag: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: "arabic",
    name: "Classical Arabic / Quran",
    nativeName: "العربية الفصحى",
    description: "Quranic Arabic, MSA vocabulary, grammar, and morphology",
    flag: "🕌",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    borderColor: "border-teal-300 dark:border-teal-700",
  },
  {
    id: "egyptian",
    name: "Egyptian Arabic",
    nativeName: "مصري",
    description: "Colloquial Egyptian dialect, expressions, and daily conversation",
    flag: "🇪🇬",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    borderColor: "border-violet-300 dark:border-violet-700",
  },
  {
    id: "spanish",
    name: "Spanish",
    nativeName: "Espanol",
    description: "Vocabulary, grammar, conjugation, and expressions",
    flag: "🇪🇸",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  {
    id: "english",
    name: "English",
    nativeName: "English",
    description: "Advanced vocabulary, idioms, phrasal verbs, and academic language",
    flag: "🇬🇧",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/30",
    borderColor: "border-slate-300 dark:border-slate-600",
  },
];

interface LanguageSelectorProps {
  selected: LanguageId[];
  onChange: (selected: LanguageId[]) => void;
}

export function LanguageSelector({ selected, onChange }: LanguageSelectorProps) {
  const toggle = (id: LanguageId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
          What languages do you want to study?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Select one or more languages. You can always add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {LANGUAGES.map((lang, index) => {
          const isSelected = selected.includes(lang.id);

          return (
            <motion.button
              key={lang.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => toggle(lang.id)}
              className={`
                relative flex items-start gap-4 p-5 rounded-xl border-2 text-left
                transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? `${lang.bgColor} ${lang.borderColor} shadow-sm`
                    : "bg-[var(--surface-1)] border-[var(--surface-3)] hover:border-[var(--text-tertiary)]"
                }
              `}
            >
              {/* Selection indicator */}
              <motion.div
                initial={false}
                animate={{
                  scale: isSelected ? 1 : 0.8,
                  opacity: isSelected ? 1 : 0,
                }}
                className={`
                  absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center
                  ${isSelected ? "bg-primary-500" : "bg-[var(--surface-3)]"}
                `}
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>

              {/* Flag */}
              <div className="text-3xl flex-shrink-0 mt-0.5">{lang.flag}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <h3 className={`font-semibold text-sm ${isSelected ? lang.color : "text-[var(--text-primary)]"}`}>
                    {lang.name}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                  {lang.nativeName}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5 leading-relaxed">
                  {lang.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-[var(--text-tertiary)]"
        >
          Please select at least one language to continue
        </motion.p>
      )}
    </div>
  );
}

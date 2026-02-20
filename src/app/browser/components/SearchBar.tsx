"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, X, Clock, Tag, Layers, Filter } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

type SuggestionType = "tag" | "deck" | "filter" | "recent";

interface Suggestion {
  type: SuggestionType;
  label: string;
  value: string;
  description?: string;
}

const tagSuggestions: Suggestion[] = [
  { type: "tag", label: "arabic::vocabulary", value: "tag:arabic::vocabulary" },
  { type: "tag", label: "arabic::grammar", value: "tag:arabic::grammar" },
  { type: "tag", label: "quran::memorized", value: "tag:quran::memorized" },
  { type: "tag", label: "spanish::verbs", value: "tag:spanish::verbs" },
  { type: "tag", label: "english::gre", value: "tag:english::gre" },
  { type: "tag", label: "egyptian::slang", value: "tag:egyptian::slang" },
];

const deckSuggestions: Suggestion[] = [
  { type: "deck", label: "Arabic::MSA", value: "deck:Arabic::MSA" },
  { type: "deck", label: "Arabic::Egyptian", value: "deck:Arabic::Egyptian" },
  { type: "deck", label: "Quran::Al-Fatiha", value: "deck:Quran::Al-Fatiha" },
  { type: "deck", label: "Spanish::Vocabulary", value: "deck:Spanish::Vocabulary" },
  { type: "deck", label: "English::GRE", value: "deck:English::GRE" },
];

const filterSuggestions: Suggestion[] = [
  { type: "filter", label: "is:due", value: "is:due", description: "Cards that are due for review" },
  { type: "filter", label: "is:new", value: "is:new", description: "New cards not yet studied" },
  { type: "filter", label: "is:learning", value: "is:learning", description: "Cards in learning phase" },
  { type: "filter", label: "is:review", value: "is:review", description: "Cards in review phase" },
  { type: "filter", label: "is:paused", value: "is:paused", description: "Suspended cards" },
  { type: "filter", label: "flag:red", value: "flag:red", description: "Red-flagged cards" },
  { type: "filter", label: "ease<2.0", value: "ease<2.0", description: "Low-ease (difficult) cards" },
  { type: "filter", label: "added:7", value: "added:7", description: "Added in last 7 days" },
  { type: "filter", label: "rated:1", value: "rated:1", description: "Rated today" },
];

const recentSearches: Suggestion[] = [
  { type: "recent", label: "tag:arabic deck:MSA", value: "tag:arabic deck:MSA" },
  { type: "recent", label: "flag:red is:due", value: "flag:red is:due" },
  { type: "recent", label: "ease<2.0 is:review", value: "ease<2.0 is:review" },
];

const iconMap: Record<SuggestionType, React.ReactNode> = {
  tag: <Tag className="w-3.5 h-3.5" />,
  deck: <Layers className="w-3.5 h-3.5" />,
  filter: <Filter className="w-3.5 h-3.5" />,
  recent: <Clock className="w-3.5 h-3.5" />,
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const getSuggestions = useCallback((): Suggestion[] => {
    if (!value) return recentSearches;

    const lower = value.toLowerCase();
    const lastWord = lower.split(" ").pop() || "";

    if (lastWord.startsWith("tag:")) {
      const partial = lastWord.slice(4);
      return tagSuggestions.filter((s) =>
        s.label.toLowerCase().includes(partial)
      );
    }

    if (lastWord.startsWith("deck:")) {
      const partial = lastWord.slice(5);
      return deckSuggestions.filter((s) =>
        s.label.toLowerCase().includes(partial)
      );
    }

    // Show all suggestion types for general queries
    const allSuggestions = [
      ...filterSuggestions,
      ...tagSuggestions,
      ...deckSuggestions,
    ];
    return allSuggestions
      .filter(
        (s) =>
          s.label.toLowerCase().includes(lower) ||
          s.value.toLowerCase().includes(lower)
      )
      .slice(0, 8);
  }, [value]);

  const suggestions = getSuggestions();

  const handleSelect = (suggestion: Suggestion) => {
    const words = value.split(" ");
    words[words.length - 1] = suggestion.value;
    onChange(words.join(" ") + " ");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={suggestionsRef}>
      {/* Input */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
          isFocused
            ? "border-primary-300 dark:border-primary-700 ring-2 ring-primary-100 dark:ring-primary-950/50"
            : "border-[var(--surface-3)]"
        } bg-[var(--surface-0)]`}
      >
        <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Search cards... (try tag: deck: or is:)"
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
        />
        {value && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-0.5 text-[10px] text-[var(--text-tertiary)]">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)] shadow-elevated overflow-hidden z-50"
          >
            {!value && (
              <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Recent Searches
              </div>
            )}
            {suggestions.map((suggestion, i) => (
              <button
                key={suggestion.value}
                onMouseDown={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-primary-50 dark:bg-primary-950/40"
                    : "hover:bg-[var(--surface-2)]"
                }`}
              >
                <span
                  className={`flex-shrink-0 ${
                    i === selectedIndex
                      ? "text-primary-500"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {iconMap[suggestion.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] font-mono truncate">
                    {suggestion.label}
                  </p>
                  {suggestion.description && (
                    <p className="text-xs text-[var(--text-tertiary)] truncate">
                      {suggestion.description}
                    </p>
                  )}
                </div>
              </button>
            ))}

            {/* Visual query builder hint */}
            <div className="border-t border-[var(--surface-3)] px-3 py-2 flex items-center gap-2">
              <Filter className="w-3 h-3 text-[var(--text-tertiary)]" />
              <span className="text-[10px] text-[var(--text-tertiary)]">
                Use <span className="font-mono">tag:</span>{" "}
                <span className="font-mono">deck:</span>{" "}
                <span className="font-mono">is:</span>{" "}
                <span className="font-mono">flag:</span> for precise search
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

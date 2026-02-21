"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Layers,
  ChevronDown,
  Trash2,
  Flag,
  Tag,
  Pause,
  Copy,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { CardTable } from "./components/CardTable";
import { TagTree } from "./components/TagTree";

type ViewMode = "cards" | "notes";
type StateFilter =
  | "all"
  | "due"
  | "new"
  | "learning"
  | "review"
  | "paused"
  | "flagged";

const flagColors = [
  { id: 0, label: "None", color: "" },
  { id: 1, label: "Red", color: "bg-red-500" },
  { id: 2, label: "Orange", color: "bg-orange-500" },
  { id: 3, label: "Green", color: "bg-green-500" },
  { id: 4, label: "Blue", color: "bg-blue-500" },
  { id: 5, label: "Purple", color: "bg-purple-500" },
];

const stateFilters: { key: StateFilter; label: string; count: number }[] = [
  { key: "all", label: "All Cards", count: 4000 },
  { key: "due", label: "Due", count: 132 },
  { key: "new", label: "New", count: 450 },
  { key: "learning", label: "Learning", count: 78 },
  { key: "review", label: "Review", count: 3200 },
  { key: "paused", label: "Paused", count: 42 },
  { key: "flagged", label: "Flagged", count: 15 },
];

const savedSearches = [
  "tag:arabic deck:MSA",
  "flag:red is:due",
  "added:7 deck:Quran",
  "tag:egyptian deck:Greetings",
  "ease<2.0 is:review",
];

const deckTree = [
  {
    id: "arabic",
    name: "Arabic (MSA / Quran)",
    children: [
      { id: "arabic-msa", name: "MSA Vocabulary", count: 1000 },
      { id: "arabic-quran", name: "Quranic Arabic", count: 1000 },
      { id: "quran-fatiha", name: "Quran: Al-Fatiha", count: 7 },
      { id: "quran-baqarah", name: "Quran: Al-Baqarah", count: 286 },
    ],
  },
  {
    id: "egyptian",
    name: "Egyptian Arabic",
    children: [
      { id: "egyptian-greetings", name: "Greetings", count: 50 },
      { id: "egyptian-daily", name: "Daily Life", count: 200 },
      { id: "egyptian-vocab", name: "Vocabulary", count: 750 },
    ],
  },
  {
    id: "spanish",
    name: "Spanish",
    children: [
      { id: "spanish-vocab", name: "Vocabulary", count: 600 },
      { id: "spanish-grammar", name: "Grammar", count: 350 },
    ],
  },
];

interface EditorCard {
  id: string;
  front: string;
  back: string;
  deck: string;
  tags: string[];
}

export default function BrowserPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCard, setEditingCard] = useState<EditorCard | null>(null);
  const [expandedDecks, setExpandedDecks] = useState<Set<string>>(
    new Set(["arabic", "egyptian", "spanish"])
  );

  const toggleDeck = (id: string) => {
    setExpandedDecks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }, []);

  const handleEditCard = useCallback((card: EditorCard) => {
    setEditingCard(card);
  }, []);

  const handleClearSelection = () => setSelectedCards(new Set());

  return (
    <div className="flex h-[calc(100vh-52px-64px)] -m-8">
      {/* Left sidebar - Filters */}
      <div className="w-64 border-r border-[var(--surface-3)] bg-[var(--surface-1)] flex flex-col overflow-hidden">
        {/* View mode toggle */}
        <div className="p-3 border-b border-[var(--surface-3)]">
          <div className="flex bg-[var(--surface-2)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("cards")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                viewMode === "cards"
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("notes")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                viewMode === "notes"
                  ? "bg-[var(--surface-0)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-tertiary)]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Notes
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* State filters */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-2">
              Status
            </p>
            {stateFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStateFilter(filter.key)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors ${
                  stateFilter === filter.key
                    ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span>{filter.label}</span>
                <span className="text-[var(--text-tertiary)] text-[10px]">
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Flag filters */}
          <div className="p-3 border-t border-[var(--surface-3)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-2">
              Flags
            </p>
            <div className="flex gap-1.5 px-2">
              {flagColors.slice(1).map((flag) => (
                <button
                  key={flag.id}
                  className={`w-5 h-5 rounded-full ${flag.color} hover:ring-2 ring-offset-1 ring-[var(--surface-3)] transition-all`}
                  aria-label={`Filter by ${flag.label} flag`}
                />
              ))}
            </div>
          </div>

          {/* Deck tree */}
          <div className="p-3 border-t border-[var(--surface-3)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-2">
              Decks
            </p>
            {deckTree.map((deck) => (
              <div key={deck.id}>
                <button
                  onClick={() => toggleDeck(deck.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      expandedDecks.has(deck.id) ? "" : "-rotate-90"
                    }`}
                  />
                  <span className="font-medium">{deck.name}</span>
                </button>
                <AnimatePresence>
                  {expandedDecks.has(deck.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      {deck.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedDeck(child.id)}
                          className={`w-full flex items-center justify-between pl-7 pr-2 py-1.5 rounded-md text-xs transition-colors ${
                            selectedDeck === child.id
                              ? "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400"
                              : "text-[var(--text-tertiary)] hover:bg-[var(--surface-2)]"
                          }`}
                        >
                          <span>{child.name}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {child.count}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Tag tree */}
          <div className="p-3 border-t border-[var(--surface-3)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-2">
              Tags
            </p>
            <TagTree compact />
          </div>

          {/* Saved searches */}
          <div className="p-3 border-t border-[var(--surface-3)]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 px-2">
              Saved Searches
            </p>
            {savedSearches.map((search) => (
              <button
                key={search}
                onClick={() => setSearchQuery(search)}
                className="w-full text-left px-2 py-1.5 rounded-md text-xs text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-secondary)] transition-colors font-mono"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-[var(--surface-3)]">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          <CardTable
            onSelect={handleSelectCard}
            onEdit={handleEditCard}
            selectedCards={selectedCards}
          />
        </div>

        {/* Batch action bar */}
        <AnimatePresence>
          {selectedCards.size > 0 && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="border-t border-[var(--surface-3)] bg-[var(--surface-1)] px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {selectedCards.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-primary-500 hover:text-primary-600"
                >
                  Clear
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <Tag className="w-3.5 h-3.5" />
                  Add Tag
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <Flag className="w-3.5 h-3.5" />
                  Flag
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Editor pane */}
      <AnimatePresence>
        {editingCard && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 360, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="border-l border-[var(--surface-3)] bg-[var(--surface-1)] overflow-hidden"
          >
            <div className="p-4 w-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Edit Card
                </h3>
                <button
                  onClick={() => setEditingCard(null)}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  Close
                </button>
              </div>

              {/* Front field */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Front
                </label>
                <textarea
                  value={editingCard.front}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      front: e.target.value,
                    })
                  }
                  className="w-full h-24 px-3 py-2 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Back field */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Back
                </label>
                <textarea
                  value={editingCard.back}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      back: e.target.value,
                    })
                  }
                  className="w-full h-24 px-3 py-2 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Deck */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Deck
                </label>
                <input
                  value={editingCard.deck}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      deck: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Tags */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {editingCard.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-xs"
                    >
                      {tag}
                      <button className="text-primary-400 hover:text-primary-600">
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    placeholder="Add tag..."
                    className="flex-1 min-w-[80px] text-xs text-[var(--text-primary)] bg-transparent border-none outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              </div>

              {/* Save button */}
              <button className="w-full py-2.5 rounded-xl bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors">
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

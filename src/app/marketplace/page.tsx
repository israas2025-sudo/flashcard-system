"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  Layers,
  Globe,
  BarChart3,
  X,
  SlidersHorizontal,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckListing {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  rating: number;
  reviewCount: number;
  downloadCount: number;
  cardCount: number;
  tags: string[];
  coverColor: string;
  createdAt: string;
}

type SortOption = "popular" | "rating" | "newest" | "downloads";
type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const SAMPLE_DECKS: DeckListing[] = [
  {
    id: "1",
    title: "Essential Arabic Vocabulary",
    author: "Israa S.",
    description: "500 most common MSA words with audio and example sentences.",
    language: "Arabic",
    difficulty: "beginner",
    rating: 4.8,
    reviewCount: 142,
    downloadCount: 3420,
    cardCount: 500,
    tags: ["MSA", "vocabulary", "audio"],
    coverColor: "bg-arabic-500",
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    title: "Quranic Vocabulary by Frequency",
    author: "Ahmed M.",
    description:
      "Top 300 Quranic words covering 70% of the Quran's vocabulary.",
    language: "Arabic",
    difficulty: "intermediate",
    rating: 4.9,
    reviewCount: 289,
    downloadCount: 5100,
    cardCount: 300,
    tags: ["Quran", "classical", "frequency"],
    coverColor: "bg-quran-500",
    createdAt: "2025-02-20",
  },
  {
    id: "3",
    title: "Egyptian Colloquial Phrases",
    author: "Nour K.",
    description: "200 everyday Egyptian Arabic phrases for conversations.",
    language: "Egyptian Arabic",
    difficulty: "beginner",
    rating: 4.6,
    reviewCount: 87,
    downloadCount: 1890,
    cardCount: 200,
    tags: ["Egyptian", "colloquial", "phrases"],
    coverColor: "bg-egyptian-500",
    createdAt: "2025-03-10",
  },
  {
    id: "4",
    title: "Spanish Verbs & Conjugations",
    author: "Maria L.",
    description: "Complete conjugation tables for 100 essential Spanish verbs.",
    language: "Spanish",
    difficulty: "intermediate",
    rating: 4.5,
    reviewCount: 63,
    downloadCount: 2100,
    cardCount: 600,
    tags: ["verbs", "conjugation", "grammar"],
    coverColor: "bg-spanish-500",
    createdAt: "2025-04-05",
  },
  {
    id: "5",
    title: "IELTS Academic Word List",
    author: "James W.",
    description: "570 academic words essential for IELTS band 7+.",
    language: "English",
    difficulty: "advanced",
    rating: 4.7,
    reviewCount: 201,
    downloadCount: 4200,
    cardCount: 570,
    tags: ["IELTS", "academic", "test-prep"],
    coverColor: "bg-english-500",
    createdAt: "2025-01-28",
  },
  {
    id: "6",
    title: "Arabic Morphology Patterns",
    author: "Dr. Fatima R.",
    description:
      "Root-pattern system (awzan) with examples from classical Arabic.",
    language: "Arabic",
    difficulty: "advanced",
    rating: 4.9,
    reviewCount: 55,
    downloadCount: 980,
    cardCount: 150,
    tags: ["morphology", "sarf", "advanced"],
    coverColor: "bg-arabic-700",
    createdAt: "2025-05-12",
  },
];

const LANGUAGES = ["All", "Arabic", "Egyptian Arabic", "Spanish", "English"];
const ITEMS_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Deck Card Component
// ---------------------------------------------------------------------------

function DeckCard({
  deck,
  index,
  onClick,
}: {
  deck: DeckListing;
  index: number;
  onClick: () => void;
}) {
  const difficultyColors = {
    beginner:
      "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400",
    intermediate:
      "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    advanced:
      "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400",
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        delay: 0.05 * index,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left flex flex-col rounded-2xl bg-[var(--surface-1)] border border-[var(--surface-3)] shadow-card overflow-hidden hover:border-[var(--surface-3)] transition-colors group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    >
      {/* Color stripe */}
      <div className={`h-2 w-full ${deck.coverColor}`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Title + Language */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)] leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {deck.title}
          </h3>
        </div>

        {/* Author */}
        <p className="text-xs text-[var(--text-tertiary)] mb-2">
          by {deck.author}
        </p>

        {/* Description */}
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-4">
          {deck.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)]">
            {deck.language}
          </span>
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
              difficultyColors[deck.difficulty]
            }`}
          >
            {deck.difficulty}
          </span>
          {deck.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-tertiary)]"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-auto pt-3 border-t border-[var(--surface-3)] flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {deck.rating}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              ({deck.reviewCount})
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              {deck.downloadCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              {deck.cardCount} cards
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MarketplacePage() {
  const router = useRouter();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filtered and sorted decks
  const filteredDecks = useMemo(() => {
    let result = [...SAMPLE_DECKS];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.author.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Language filter
    if (languageFilter !== "All") {
      result = result.filter((d) => d.language === languageFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== "all") {
      result = result.filter((d) => d.difficulty === difficultyFilter);
    }

    // Sort
    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "downloads":
        result.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
    }

    return result;
  }, [searchQuery, languageFilter, difficultyFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredDecks.length / ITEMS_PER_PAGE)
  );
  const pagedDecks = filteredDecks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const handleDeckClick = useCallback(
    (id: string) => {
      router.push(`/marketplace/${id}`);
    },
    [router]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setLanguageFilter("All");
    setDifficultyFilter("all");
    setSortBy("popular");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters =
    searchQuery || languageFilter !== "All" || difficultyFilter !== "all";

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Marketplace
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Browse and download shared decks from the community
          </p>
        </motion.div>

        {/* Search + Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search decks, authors, tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
              border transition-colors
              ${
                showFilters || hasActiveFilters
                  ? "bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400"
                  : "bg-[var(--surface-1)] border-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }
            `}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
            <option value="downloads">Most Downloads</option>
          </select>
        </motion.div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-6"
            >
              <div className="flex flex-wrap gap-6 p-5 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)]">
                {/* Language */}
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 block">
                    <Globe className="w-3.5 h-3.5 inline mr-1" />
                    Language
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguageFilter(lang);
                          setCurrentPage(1);
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${
                            languageFilter === lang
                              ? "bg-primary-500 text-white"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                          }
                        `}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2 block">
                    <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
                    Difficulty
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      ["all", "beginner", "intermediate", "advanced"] as const
                    ).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDifficultyFilter(d);
                          setCurrentPage(1);
                        }}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors
                          ${
                            difficultyFilter === d
                              ? "bg-primary-500 text-white"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                          }
                        `}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-[var(--text-tertiary)]">
            {filteredDecks.length} deck{filteredDecks.length !== 1 ? "s" : ""}{" "}
            found
          </p>
        </div>

        {/* Deck Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <AnimatePresence mode="popLayout">
            {pagedDecks.map((deck, i) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                index={i}
                onClick={() => handleDeckClick(deck.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredDecks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Search className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              No decks found
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Try adjusting your search or filters.
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              Clear all filters
            </button>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2"
          >
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`
                  w-8 h-8 rounded-lg text-sm font-medium transition-colors
                  ${
                    page === currentPage
                      ? "bg-primary-500 text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                  }
                `}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RelatedCard {
  cardId: string;
  arabicWord: string;
  englishMeaning: string;
  isQuranAyah: boolean;
  surahName?: string;
  ayahNumber?: number;
}

interface RootLinkData {
  rootLetters: string;
  relatedCards: RelatedCard[];
}

interface RootLinksProps {
  /** Root link data to display. */
  links: RootLinkData[];
  /** Whether to start expanded (default: false). */
  defaultExpanded?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RootLinks -- Expandable section shown below a flashcard during review.
 *
 * Displays related Arabic words sharing the same root across the user's
 * collection (Quran ayahs, Classical Arabic vocab, Egyptian Arabic).
 *
 * Design: Subtle, non-distracting. Collapsed by default with a small
 * toggle. When expanded, shows clickable chips for each related word.
 */
export function RootLinks({ links, defaultExpanded = false }: RootLinksProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!links || links.length === 0) {
    return null;
  }

  const totalRelated = links.reduce(
    (sum, link) => sum + link.relatedCards.length,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="w-full max-w-2xl mx-auto mt-3"
    >
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2 w-full rounded-lg
          text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
          hover:bg-[var(--surface-2)]/50 transition-all duration-150
          focus:outline-none focus:ring-1 focus:ring-primary-500/30"
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse root links" : "Expand root links"}
      >
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium">
          Related words
          {links.length > 0 && (
            <span className="ml-1 text-[var(--text-tertiary)]/70">
              ({totalRelated} from root{" "}
              <span className="arabic-text text-[13px] font-normal" dir="rtl">
                {links[0].rootLetters}
              </span>
              )
            </span>
          )}
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-3">
              {links.map((link) => (
                <div key={link.rootLetters}>
                  {/* Root header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Root:
                    </span>
                    <span
                      className="arabic-text text-sm text-arabic-600 dark:text-arabic-400"
                      dir="rtl"
                    >
                      {link.rootLetters.split("").join("-")}
                    </span>
                  </div>

                  {/* Vocab cards */}
                  {link.relatedCards.filter((c) => !c.isQuranAyah).length >
                    0 && (
                    <div className="mb-2">
                      <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">
                        Vocabulary
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {link.relatedCards
                          .filter((c) => !c.isQuranAyah)
                          .map((card) => (
                            <Link
                              key={card.cardId}
                              href={`/stats/card/${card.cardId}`}
                            >
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                  bg-[var(--surface-2)] hover:bg-[var(--surface-3)]
                                  border border-transparent hover:border-[var(--surface-3)]
                                  transition-all duration-150 cursor-pointer group"
                              >
                                <span
                                  className="arabic-text text-xs text-[var(--text-primary)] font-medium"
                                  dir="rtl"
                                >
                                  {card.arabicWord}
                                </span>
                                {card.englishMeaning && (
                                  <span className="text-[10px] text-[var(--text-tertiary)]">
                                    ({card.englishMeaning})
                                  </span>
                                )}
                                <ExternalLink className="w-2.5 h-2.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.div>
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Quran references */}
                  {link.relatedCards.filter((c) => c.isQuranAyah).length >
                    0 && (
                    <div>
                      <span className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5 block">
                        Quran References
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {link.relatedCards
                          .filter((c) => c.isQuranAyah)
                          .map((card) => (
                            <Link
                              key={card.cardId}
                              href={`/stats/card/${card.cardId}`}
                            >
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                  bg-quran-50 dark:bg-quran-950/30 hover:bg-quran-100 dark:hover:bg-quran-950/50
                                  text-quran-700 dark:text-quran-400
                                  border border-transparent hover:border-quran-200 dark:hover:border-quran-800
                                  transition-all duration-150 cursor-pointer group"
                              >
                                <span className="text-[10px] font-medium">
                                  {card.surahName || "Quran"}
                                  {card.ayahNumber
                                    ? ` ${card.ayahNumber}`
                                    : ""}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </motion.div>
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

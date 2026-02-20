// @ts-nocheck
"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ChevronRight, Tag, Search } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagInputProps {
  /** Currently selected tag strings (e.g., ["language::arabic", "grammar::verbs"]) */
  selectedTags: string[];
  /** Callback when the tag list changes */
  onTagsChange: (tags: string[]) => void;
  /** All available tag suggestions, including hierarchical paths */
  suggestions: string[];
  /** Placeholder text when no tags are entered */
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Separator for hierarchical tags (e.g., "parent::child") */
const HIERARCHY_SEPARATOR = "::";

/** Split a hierarchical tag into its parts */
function parseHierarchy(tag: string): string[] {
  return tag.split(HIERARCHY_SEPARATOR);
}

/** Get the leaf name of a hierarchical tag */
function getLeafName(tag: string): string {
  const parts = parseHierarchy(tag);
  return parts[parts.length - 1];
}

/** Get the parent path of a hierarchical tag, or null if root-level */
function getParentPath(tag: string): string | null {
  const parts = parseHierarchy(tag);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(HIERARCHY_SEPARATOR);
}

/** Build a grouped structure from flat tag list for display */
function groupSuggestions(
  tags: string[]
): Map<string | null, string[]> {
  const groups = new Map<string | null, string[]>();
  for (const tag of tags) {
    const parent = getParentPath(tag);
    const existing = groups.get(parent) ?? [];
    existing.push(tag);
    groups.set(parent, existing);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Tag Chip Component
// ---------------------------------------------------------------------------

interface TagChipProps {
  tag: string;
  onRemove: (tag: string) => void;
}

function TagChip({ tag, onRemove }: TagChipProps) {
  const parts = parseHierarchy(tag);
  const isHierarchical = parts.length > 1;

  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.15 }}
      className="
        inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full
        bg-[var(--primary)]/10 text-[var(--primary)]
        text-xs font-medium leading-none
      "
    >
      <Tag className="w-3 h-3 flex-shrink-0 opacity-60" />
      {isHierarchical ? (
        <span className="flex items-center gap-0.5">
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
              )}
              <span className={i < parts.length - 1 ? "opacity-60" : ""}>
                {part}
              </span>
            </React.Fragment>
          ))}
        </span>
      ) : (
        <span>{tag}</span>
      )}
      <button
        type="button"
        onClick={() => onRemove(tag)}
        className="
          ml-0.5 p-0.5 rounded-full
          hover:bg-[var(--primary)]/20
          transition-colors duration-100
        "
        aria-label={`Remove tag ${tag}`}
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Item Component
// ---------------------------------------------------------------------------

interface SuggestionItemProps {
  tag: string;
  isHighlighted: boolean;
  query: string;
  onSelect: (tag: string) => void;
  onMouseEnter: () => void;
}

function SuggestionItem({
  tag,
  isHighlighted,
  query,
  onSelect,
  onMouseEnter,
}: SuggestionItemProps) {
  const parts = parseHierarchy(tag);
  const leaf = parts[parts.length - 1];

  // Highlight the matching portion of the leaf name
  const matchIndex = leaf.toLowerCase().indexOf(query.toLowerCase());
  let leafContent: React.ReactNode = leaf;
  if (query && matchIndex >= 0) {
    const before = leaf.slice(0, matchIndex);
    const match = leaf.slice(matchIndex, matchIndex + query.length);
    const after = leaf.slice(matchIndex + query.length);
    leafContent = (
      <>
        {before}
        <span className="font-semibold text-[var(--primary)]">{match}</span>
        {after}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(tag)}
      onMouseEnter={onMouseEnter}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-left text-sm
        transition-colors duration-75
        ${
          isHighlighted
            ? "bg-[var(--primary)]/8 text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
        }
      `}
    >
      <Tag className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
      {parts.length > 1 ? (
        <span className="flex items-center gap-0.5">
          {parts.slice(0, -1).map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="w-2.5 h-2.5 opacity-30 flex-shrink-0" />
              )}
              <span className="opacity-50 text-xs">{part}</span>
            </React.Fragment>
          ))}
          <ChevronRight className="w-2.5 h-2.5 opacity-30 flex-shrink-0" />
          <span>{leafContent}</span>
        </span>
      ) : (
        <span>{leafContent}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TagInput Component
// ---------------------------------------------------------------------------

export function TagInput({
  selectedTags,
  onTagsChange,
  suggestions,
  placeholder = "Add tags...",
}: TagInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query and exclude already-selected tags
  const filteredSuggestions = useMemo(() => {
    const selectedSet = new Set(selectedTags);
    const available = suggestions.filter((s) => !selectedSet.has(s));

    if (!query.trim()) return available;

    const lowerQuery = query.toLowerCase().trim();
    return available.filter((tag) =>
      tag.toLowerCase().includes(lowerQuery)
    );
  }, [suggestions, selectedTags, query]);

  // Whether the current query can create a new tag
  const canCreateNew = useMemo(() => {
    if (!query.trim()) return false;
    const normalizedQuery = query.trim().toLowerCase();
    const exists = suggestions.some(
      (s) => s.toLowerCase() === normalizedQuery
    );
    const alreadySelected = selectedTags.some(
      (s) => s.toLowerCase() === normalizedQuery
    );
    return !exists && !alreadySelected;
  }, [query, suggestions, selectedTags]);

  // Total items in dropdown (filtered suggestions + "create new" option)
  const totalItems = filteredSuggestions.length + (canCreateNew ? 1 : 0);

  // Clamp highlight index when suggestions change
  useEffect(() => {
    setHighlightIndex((prev) => Math.min(prev, Math.max(0, totalItems - 1)));
  }, [totalItems]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-suggestion-item]");
    const target = items[highlightIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      if (selectedTags.includes(trimmed)) return;
      onTagsChange([...selectedTags, trimmed]);
      setQuery("");
      setHighlightIndex(0);
      inputRef.current?.focus();
    },
    [selectedTags, onTagsChange]
  );

  const removeTag = useCallback(
    (tag: string) => {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    },
    [selectedTags, onTagsChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setIsOpen(true);
      setHighlightIndex(0);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setIsOpen(true);
          setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1));
          break;

        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) => Math.max(prev - 1, 0));
          break;

        case "Enter":
          e.preventDefault();
          if (!isOpen || totalItems === 0) {
            // If nothing in dropdown but query exists, create inline
            if (canCreateNew) addTag(query.trim());
            return;
          }
          // If highlight is on the "create new" item (last item when canCreateNew)
          if (canCreateNew && highlightIndex === filteredSuggestions.length) {
            addTag(query.trim());
          } else if (filteredSuggestions[highlightIndex]) {
            addTag(filteredSuggestions[highlightIndex]);
          }
          break;

        case "Escape":
          setIsOpen(false);
          break;

        case "Backspace":
          // Remove last tag if input is empty
          if (!query && selectedTags.length > 0) {
            removeTag(selectedTags[selectedTags.length - 1]);
          }
          break;

        case "Tab":
          // Auto-complete if there is exactly one suggestion
          if (isOpen && filteredSuggestions.length === 1) {
            e.preventDefault();
            addTag(filteredSuggestions[0]);
          }
          break;
      }
    },
    [
      isOpen,
      totalItems,
      highlightIndex,
      filteredSuggestions,
      canCreateNew,
      query,
      selectedTags,
      addTag,
      removeTag,
    ]
  );

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      {/* Label */}
      <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide px-1">
        Tags
      </label>

      {/* Input container with tag chips */}
      <div
        className="
          flex flex-wrap items-center gap-1.5 px-3 py-2
          rounded-xl border border-[var(--surface-3)]
          bg-[var(--surface-0)]
          focus-within:border-[var(--primary)]
          focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
          transition-all duration-150 cursor-text
        "
        onClick={() => inputRef.current?.focus()}
      >
        {/* Selected tag chips */}
        <AnimatePresence mode="popLayout">
          {selectedTags.map((tag) => (
            <TagChip key={tag} tag={tag} onRemove={removeTag} />
          ))}
        </AnimatePresence>

        {/* Text input */}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={selectedTags.length === 0 ? placeholder : ""}
            aria-label="Tag search"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            role="combobox"
            className="
              w-full bg-transparent text-sm text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              outline-none
            "
          />
        </div>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && totalItems > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            className="
              absolute z-50 top-full left-0 right-0 mt-1
              max-h-[240px] overflow-y-auto
              rounded-xl border border-[var(--surface-3)]
              bg-[var(--surface-0)] shadow-lg
            "
          >
            {/* Filtered suggestions */}
            {filteredSuggestions.map((tag, index) => (
              <div key={tag} data-suggestion-item role="option">
                <SuggestionItem
                  tag={tag}
                  isHighlighted={index === highlightIndex}
                  query={query}
                  onSelect={addTag}
                  onMouseEnter={() => setHighlightIndex(index)}
                />
              </div>
            ))}

            {/* Create new tag option */}
            {canCreateNew && (
              <div data-suggestion-item role="option">
                <button
                  type="button"
                  onClick={() => addTag(query.trim())}
                  onMouseEnter={() =>
                    setHighlightIndex(filteredSuggestions.length)
                  }
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-sm
                    border-t border-[var(--surface-3)]
                    transition-colors duration-75
                    ${
                      highlightIndex === filteredSuggestions.length
                        ? "bg-[var(--primary)]/8 text-[var(--primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                    }
                  `}
                >
                  <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Create{" "}
                    <span className="font-medium">&ldquo;{query.trim()}&rdquo;</span>
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected count */}
      {selectedTags.length > 0 && (
        <p className="text-[10px] text-[var(--text-muted)] px-1">
          {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Plus,
  Star,
  Play,
  Pencil,
  Trash2,
  X,
  Tag,
  Layers,
  Sparkles,
  Filter,
  ChevronDown,
  Check,
  BookOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types and data imported from shared module
// ---------------------------------------------------------------------------

import {
  type StateFilter,
  type StudyPreset,
  type TagOption,
  type DeckOption,
  defaultTags,
  defaultDecks,
  builtInPresets as builtInPresetsList,
  loadPresetsFromStorage,
  savePresetsToStorage,
} from "@/lib/presets";

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

/** Tag pill with color dot */
function TagPill({ tag }: { tag: TagOption }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--surface-3)]">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color || "#6366F1" }}
      />
      {tag.name}
    </span>
  );
}

/** Card count badge */
function CardCountBadge({ count }: { count: number }) {
  const colorClass =
    count === 0
      ? "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
      : "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${colorClass}`}
    >
      {count}
      <span className="ml-1 text-xs font-normal opacity-70">cards</span>
    </span>
  );
}

/** State filter label chips */
function StateFilterChips({ stateFilter }: { stateFilter: StateFilter }) {
  const active: string[] = [];
  if (stateFilter.includeNew) active.push("New");
  if (stateFilter.includeReview) active.push("Review");
  if (stateFilter.includeLearning) active.push("Learning");

  if (active.length === 3) return null; // All included = no filter shown

  return (
    <div className="flex gap-1 mt-1">
      {active.map((label) => (
        <span
          key={label}
          className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-tertiary)]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset Card Component
// ---------------------------------------------------------------------------

interface PresetCardProps {
  preset: StudyPreset;
  tags: TagOption[];
  decks: DeckOption[];
  onEdit: (preset: StudyPreset) => void;
  onDelete: (preset: StudyPreset) => void;
  onTogglePin: (preset: StudyPreset) => void;
}

function PresetCard({
  preset,
  tags,
  decks,
  onEdit,
  onDelete,
  onTogglePin,
}: PresetCardProps) {
  const matchedTags = tags.filter((t) => preset.tagFilter.includes(t.id));
  const matchedDecks = decks.filter((d) => preset.deckFilter.includes(d.id));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
      className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] p-5 shadow-card hover:shadow-card-hover transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {preset.isPinned && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
              {preset.name}
            </h3>
          </div>
          <StateFilterChips stateFilter={preset.stateFilter} />
        </div>
        <CardCountBadge count={preset.cardCount ?? 0} />
      </div>

      {/* Tag pills */}
      {matchedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matchedTags.slice(0, 5).map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
          {matchedTags.length > 5 && (
            <span className="text-xs text-[var(--text-tertiary)] self-center">
              +{matchedTags.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Deck names */}
      {matchedDecks.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-[var(--text-tertiary)]">
          <Layers className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {matchedDecks.map((d) => d.name).join(", ")}
          </span>
        </div>
      )}

      {/* No filters message */}
      {matchedTags.length === 0 && matchedDecks.length === 0 && (
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          All cards (no filters applied)
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--surface-3)]">
        <Link href={`/study/all?preset=${preset.id}`} className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Study Now
          </motion.button>
        </Link>

        <button
          onClick={() => onTogglePin(preset)}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          title={preset.isPinned ? "Unpin from dashboard" : "Pin to dashboard"}
        >
          <Star
            className={`w-4 h-4 ${
              preset.isPinned
                ? "text-amber-500 fill-amber-500"
                : "text-[var(--text-tertiary)]"
            }`}
          />
        </button>

        {!preset.isBuiltIn && (
          <>
            <button
              onClick={() => onEdit(preset)}
              className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              title="Edit preset"
            >
              <Pencil className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
            <button
              onClick={() => onDelete(preset)}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Delete preset"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Multi-Select Dropdown
// ---------------------------------------------------------------------------

interface MultiSelectProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string; name: string; color?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

function MultiSelect({
  label,
  icon,
  options,
  selected,
  onChange,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors text-sm"
      >
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          {icon}
          <span>
            {selected.length === 0
              ? label
              : `${selected.length} selected`}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] shadow-lg"
          >
            {options.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                No options available
              </p>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected.includes(opt.id)
                        ? "bg-primary-500 border-primary-500"
                        : "border-[var(--surface-3)]"
                    }`}
                  >
                    {selected.includes(opt.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  {opt.color && (
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="truncate">{opt.name}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit Modal
// ---------------------------------------------------------------------------

interface PresetModalProps {
  isOpen: boolean;
  preset: StudyPreset | null; // null = create, object = edit
  tags: TagOption[];
  decks: DeckOption[];
  onClose: () => void;
  onSave: (
    data: {
      name: string;
      tagFilter: string[];
      deckFilter: string[];
      stateFilter: StateFilter;
      isPinned: boolean;
    },
    existingId?: string
  ) => Promise<void>;
}

function PresetModal({
  isOpen,
  preset,
  tags,
  decks,
  onClose,
  onSave,
}: PresetModalProps) {
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
  const [includeNew, setIncludeNew] = useState(true);
  const [includeReview, setIncludeReview] = useState(true);
  const [includeLearning, setIncludeLearning] = useState(true);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setSelectedTags(preset.tagFilter);
      setSelectedDecks(preset.deckFilter);
      setIncludeNew(preset.stateFilter.includeNew);
      setIncludeReview(preset.stateFilter.includeReview);
      setIncludeLearning(preset.stateFilter.includeLearning);
      setIsPinned(preset.isPinned);
    } else {
      setName("");
      setSelectedTags([]);
      setSelectedDecks([]);
      setIncludeNew(true);
      setIncludeReview(true);
      setIncludeLearning(true);
      setIsPinned(false);
    }
    setError(null);
  }, [preset, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please enter a preset name");
      return;
    }

    if (!includeNew && !includeReview && !includeLearning) {
      setError("At least one card state must be selected");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(
        {
          name: name.trim(),
          tagFilter: selectedTags,
          deckFilter: selectedDecks,
          stateFilter: { includeNew, includeReview, includeLearning },
          isPinned,
        },
        preset?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-[var(--surface-0)] rounded-2xl border border-[var(--surface-3)] shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-3)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {preset ? "Edit Preset" : "Create Study Preset"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Preset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Daily Quran Review"'
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
              autoFocus
              maxLength={200}
            />
          </div>

          {/* Tag picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Tags
            </label>
            <MultiSelect
              label="Select tags to filter..."
              icon={<Tag className="w-4 h-4" />}
              options={tags}
              selected={selectedTags}
              onChange={setSelectedTags}
            />
          </div>

          {/* Deck picker */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Decks
            </label>
            <MultiSelect
              label="Select decks to filter..."
              icon={<Layers className="w-4 h-4" />}
              options={decks}
              selected={selectedDecks}
              onChange={setSelectedDecks}
            />
          </div>

          {/* State toggles */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Card States
            </label>
            <div className="flex gap-3">
              {[
                { label: "New", value: includeNew, setter: setIncludeNew },
                {
                  label: "Review",
                  value: includeReview,
                  setter: setIncludeReview,
                },
                {
                  label: "Learning",
                  value: includeLearning,
                  setter: setIncludeLearning,
                },
              ].map(({ label, value, setter }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setter(!value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    value
                      ? "bg-primary-50 dark:bg-primary-950/20 border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-300"
                      : "bg-[var(--surface-0)] border-[var(--surface-3)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pin toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                isPinned ? "bg-amber-500" : "bg-[var(--surface-3)]"
              }`}
            >
              <motion.div
                animate={{ x: isPinned ? 18 : 2 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
            <span className="text-sm text-[var(--text-secondary)]">
              Pin to dashboard
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--surface-3)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? "Saving..." : preset ? "Save Changes" : "Create Preset"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  preset,
  onConfirm,
  onCancel,
}: {
  preset: StudyPreset | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!preset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm bg-[var(--surface-0)] rounded-2xl border border-[var(--surface-3)] shadow-xl p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Delete Preset
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          Are you sure you want to delete &quot;{preset.name}&quot;? This action
          cannot be undone. Your cards will not be affected.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Delete
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function StudyPresetsPage() {
  const [presets, setPresets] = useState<StudyPreset[]>([]);
  const [builtInPresets, setBuiltInPresets] = useState<StudyPreset[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<StudyPreset | null>(null);
  const [deletingPreset, setDeletingPreset] = useState<StudyPreset | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    const stored = loadPresetsFromStorage();
    setPresets(stored);
    setBuiltInPresets(builtInPresetsList);
    setTags(defaultTags);
    setDecks(defaultDecks);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (
    data: {
      name: string;
      tagFilter: string[];
      deckFilter: string[];
      stateFilter: StateFilter;
      isPinned: boolean;
    },
    existingId?: string
  ) => {
    const current = loadPresetsFromStorage();
    if (existingId) {
      const updated = current.map((p) =>
        p.id === existingId ? { ...p, ...data } : p
      );
      savePresetsToStorage(updated);
    } else {
      const newPreset: StudyPreset = {
        id: `preset-${Date.now()}`,
        userId: "local",
        ...data,
        cardCount: 0,
        createdAt: new Date().toISOString(),
      };
      savePresetsToStorage([...current, newPreset]);
    }
    loadData();
  };

  const handleDelete = async () => {
    if (!deletingPreset) return;
    const current = loadPresetsFromStorage();
    savePresetsToStorage(current.filter((p) => p.id !== deletingPreset.id));
    setDeletingPreset(null);
    loadData();
  };

  const handleTogglePin = async (preset: StudyPreset) => {
    if (preset.isBuiltIn) {
      // For built-in presets, copy to user presets with pin toggled
      const current = loadPresetsFromStorage();
      const existing = current.find((p) => p.id === preset.id);
      if (existing) {
        const updated = current.map((p) =>
          p.id === preset.id ? { ...p, isPinned: !p.isPinned } : p
        );
        savePresetsToStorage(updated);
      } else {
        savePresetsToStorage([...current, { ...preset, isPinned: true, isBuiltIn: false, id: `preset-${Date.now()}` }]);
      }
    } else {
      const current = loadPresetsFromStorage();
      const updated = current.map((p) =>
        p.id === preset.id ? { ...p, isPinned: !p.isPinned } : p
      );
      savePresetsToStorage(updated);
    }
    loadData();
  };

  const pinnedPresets = presets.filter((p) => p.isPinned);
  const unpinnedPresets = presets.filter((p) => !p.isPinned);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary-500" />
            Smart Study
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Save tag and deck combinations as presets for focused study sessions
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setEditingPreset(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Preset
        </motion.button>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-[var(--surface-1)] border border-[var(--surface-3)] animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Pinned Presets Section */}
          {pinnedPresets.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Pinned Presets
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pinnedPresets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      tags={tags}
                      decks={decks}
                      onEdit={(p) => {
                        setEditingPreset(p);
                        setModalOpen(true);
                      }}
                      onDelete={(p) => setDeletingPreset(p)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {/* All Presets Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              {pinnedPresets.length > 0 ? "Other Presets" : "Your Presets"}
            </h2>

            {unpinnedPresets.length === 0 && pinnedPresets.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-950/20 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                  No presets yet
                </h3>
                <p className="text-sm text-[var(--text-tertiary)] max-w-xs mb-5">
                  Create your first study preset to quickly start focused study
                  sessions with your preferred tag and deck combinations.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setEditingPreset(null);
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Preset
                </motion.button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {unpinnedPresets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      tags={tags}
                      decks={decks}
                      onEdit={(p) => {
                        setEditingPreset(p);
                        setModalOpen(true);
                      }}
                      onDelete={(p) => setDeletingPreset(p)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

          {/* Built-in Presets Section */}
          {builtInPresets.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Suggested Presets
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mb-4">
                System-provided presets based on popular study patterns. These
                are matched to your existing tags and decks.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {builtInPresets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      tags={tags}
                      decks={decks}
                      onEdit={(p) => {
                        setEditingPreset(p);
                        setModalOpen(true);
                      }}
                      onDelete={(p) => setDeletingPreset(p)}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <PresetModal
            isOpen={modalOpen}
            preset={editingPreset}
            tags={tags}
            decks={decks}
            onClose={() => {
              setModalOpen(false);
              setEditingPreset(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingPreset && (
          <DeleteConfirmModal
            preset={deletingPreset}
            onConfirm={handleDelete}
            onCancel={() => setDeletingPreset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

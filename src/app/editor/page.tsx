// @ts-nocheck
"use client";

/**
 * Note/Card Editor Page
 *
 * Full-featured editor for creating and editing flashcard notes:
 * - Note type selector dropdown
 * - Deck selector dropdown
 * - Dynamic field inputs based on the selected note type
 * - Tag input with autocomplete
 * - Live card preview showing how each template will render
 * - Duplicate warning when first field matches an existing note
 * - Keyboard shortcuts for efficient workflow
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronDown,
  AlertTriangle,
  Search,
  Save,
  Eye,
  EyeOff,
  Layers,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import FieldEditor from "./components/FieldEditor";
import CardPreview from "./components/CardPreview";
import TagInput from "./components/TagInput";

// ---------------------------------------------------------------------------
// Types (client-side mirrors of server types)
// ---------------------------------------------------------------------------

interface NoteType {
  id: string;
  name: string;
  kind: "standard" | "cloze";
  fields: NoteField[];
  templates: CardTemplate[];
  css: string;
}

interface NoteField {
  ordinal: number;
  name: string;
  required: boolean;
  font: string;
  fontSize: number;
  rtl: boolean;
  isUnique: boolean;
  description: string;
}

interface CardTemplate {
  ordinal: number;
  name: string;
  frontTemplate: string;
  backTemplate: string;
  css: string;
}

interface Deck {
  id: string;
  name: string;
  parentId: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
}

// ---------------------------------------------------------------------------
// Mock data for demonstration
// ---------------------------------------------------------------------------

const DEFAULT_NOTE_TYPES: NoteType[] = [
  {
    id: "basic",
    name: "Basic",
    kind: "standard",
    fields: [
      { ordinal: 0, name: "Front", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: true, description: "Question or prompt" },
      { ordinal: 1, name: "Back", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: false, description: "Answer" },
    ],
    templates: [
      { ordinal: 0, name: "Forward", frontTemplate: "{{Front}}", backTemplate: "{{FrontSide}}<hr>{{Back}}", css: "" },
    ],
    css: "",
  },
  {
    id: "basic-reversed",
    name: "Basic (and reversed card)",
    kind: "standard",
    fields: [
      { ordinal: 0, name: "Front", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: true, description: "Term" },
      { ordinal: 1, name: "Back", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: false, description: "Definition" },
    ],
    templates: [
      { ordinal: 0, name: "Forward", frontTemplate: "{{Front}}", backTemplate: "{{FrontSide}}<hr>{{Back}}", css: "" },
      { ordinal: 1, name: "Reverse", frontTemplate: "{{Back}}", backTemplate: "{{FrontSide}}<hr>{{Front}}", css: "" },
    ],
    css: "",
  },
  {
    id: "cloze",
    name: "Cloze",
    kind: "cloze",
    fields: [
      { ordinal: 0, name: "Text", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: true, description: "Text with {{c1::cloze}} deletions" },
      { ordinal: 1, name: "Extra", required: false, font: "Inter", fontSize: 14, rtl: false, isUnique: false, description: "Extra info shown on back" },
    ],
    templates: [
      { ordinal: 0, name: "Cloze", frontTemplate: "{{cloze:Text}}", backTemplate: "{{cloze:Text}}<br>{{Extra}}", css: "" },
    ],
    css: "",
  },
  {
    id: "arabic-vocab",
    name: "Arabic Vocabulary",
    kind: "standard",
    fields: [
      { ordinal: 0, name: "Arabic", required: true, font: "Amiri", fontSize: 24, rtl: true, isUnique: true, description: "Arabic word or phrase" },
      { ordinal: 1, name: "English", required: true, font: "Inter", fontSize: 16, rtl: false, isUnique: false, description: "English translation" },
      { ordinal: 2, name: "Example", required: false, font: "Amiri", fontSize: 20, rtl: true, isUnique: false, description: "Example sentence" },
      { ordinal: 3, name: "Audio", required: false, font: "Inter", fontSize: 14, rtl: false, isUnique: false, description: "Audio file" },
    ],
    templates: [
      { ordinal: 0, name: "Arabic > English", frontTemplate: "<div class=\"arabic-text\">{{Arabic}}</div>{{#Audio}}{{tts:Arabic}}{{/Audio}}", backTemplate: "{{FrontSide}}<hr>{{English}}{{#Example}}<br><div class=\"arabic-text\">{{Example}}</div>{{/Example}}", css: "" },
      { ordinal: 1, name: "English > Arabic", frontTemplate: "{{English}}", backTemplate: "{{FrontSide}}<hr><div class=\"arabic-text\">{{Arabic}}</div>{{#Example}}<br><div class=\"arabic-text\">{{Example}}</div>{{/Example}}", css: "" },
    ],
    css: ".arabic-text { font-family: 'Amiri', serif; direction: rtl; text-align: right; line-height: 2; }",
  },
];

const DEFAULT_DECKS: Deck[] = [
  { id: "default", name: "Default", parentId: null },
  { id: "arabic", name: "Arabic", parentId: null },
  { id: "arabic-vocab", name: "Arabic::Vocabulary", parentId: "arabic" },
  { id: "arabic-grammar", name: "Arabic::Grammar", parentId: "arabic" },
  { id: "quran", name: "Quran", parentId: null },
  { id: "spanish", name: "Spanish", parentId: null },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [noteTypes, setNoteTypes] = useState<NoteType[]>(DEFAULT_NOTE_TYPES);
  const [decks, setDecks] = useState<Deck[]>(DEFAULT_DECKS);
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType>(DEFAULT_NOTE_TYPES[0]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>("default");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [noteTypeDropdownOpen, setNoteTypeDropdownOpen] = useState(false);
  const [deckDropdownOpen, setDeckDropdownOpen] = useState(false);

  const noteTypeRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // Initialize fields when note type changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    const initialFields: Record<string, string> = {};
    for (const field of selectedNoteType.fields) {
      initialFields[field.name] = fields[field.name] || "";
    }
    setFields(initialFields);
    setDuplicateWarning(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteType.id]);

  // -------------------------------------------------------------------------
  // Duplicate detection on first field change
  // -------------------------------------------------------------------------

  useEffect(() => {
    const firstField = selectedNoteType.fields.find((f) => f.ordinal === 0);
    if (!firstField) return;

    const value = fields[firstField.name];
    if (!value || value.trim().length === 0) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/notes/check-duplicate?noteTypeId=${selectedNoteType.id}&value=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.duplicate) {
            setDuplicateWarning(`A note with this ${firstField.name} already exists.`);
          } else {
            setDuplicateWarning(null);
          }
        }
      } catch {
        // Silently ignore fetch errors in development
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [fields, selectedNoteType]);

  // -------------------------------------------------------------------------
  // Close dropdowns on outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (noteTypeRef.current && !noteTypeRef.current.contains(e.target as Node)) {
        setNoteTypeDropdownOpen(false);
      }
      if (deckRef.current && !deckRef.current.contains(e.target as Node)) {
        setDeckDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // -------------------------------------------------------------------------
  // Field updates
  // -------------------------------------------------------------------------

  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      setFields((prev) => ({ ...prev, [fieldName]: value }));
    },
    []
  );

  // -------------------------------------------------------------------------
  // Save (Add note)
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    // Validate required fields
    const missingFields = selectedNoteType.fields
      .filter((f) => f.required && (!fields[f.name] || fields[f.name].trim().length === 0))
      .map((f) => f.name);

    if (missingFields.length > 0) {
      alert(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTypeId: selectedNoteType.id,
          deckId: selectedDeckId,
          fields,
          tags: selectedTags.map((t) => t.id),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Clear fields for next note
      const cleared: Record<string, string> = {};
      for (const field of selectedNoteType.fields) {
        cleared[field.name] = "";
      }
      setFields(cleared);
      setSelectedTags([]);
      setDuplicateWarning(null);

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fields, selectedNoteType, selectedDeckId, selectedTags]);

  // -------------------------------------------------------------------------
  // Sorted fields
  // -------------------------------------------------------------------------

  const sortedFields = useMemo(
    () => [...selectedNoteType.fields].sort((a, b) => a.ordinal - b.ordinal),
    [selectedNoteType.fields]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--surface-3)]">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Add Note
          </h1>

          {/* Note type selector */}
          <div ref={noteTypeRef} className="relative">
            <button
              onClick={() => setNoteTypeDropdownOpen(!noteTypeDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Layers className="w-4 h-4 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-primary)]">{selectedNoteType.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>

            <AnimatePresence>
              {noteTypeDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-64 z-50 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-xl shadow-elevated overflow-hidden"
                >
                  {noteTypes.map((nt) => (
                    <button
                      key={nt.id}
                      onClick={() => {
                        setSelectedNoteType(nt);
                        setNoteTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        nt.id === selectedNoteType.id
                          ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <div className="font-medium">{nt.name}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {nt.fields.length} fields, {nt.templates.length} template{nt.templates.length !== 1 ? "s" : ""}
                        {nt.kind === "cloze" ? " (Cloze)" : ""}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Deck selector */}
          <div ref={deckRef} className="relative">
            <button
              onClick={() => setDeckDropdownOpen(!deckDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-primary)]">
                {decks.find((d) => d.id === selectedDeckId)?.name || "Select deck"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>

            <AnimatePresence>
              {deckDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-56 z-50 bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-xl shadow-elevated overflow-hidden"
                >
                  {decks.map((deck) => (
                    <button
                      key={deck.id}
                      onClick={() => {
                        setSelectedDeckId(deck.id);
                        setDeckDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        deck.id === selectedDeckId
                          ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      {deck.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Image Occlusion link */}
          <button
            onClick={() => router.push("/editor/image-occlusion")}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Image Occlusion
          </button>

          {/* Preview toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-2 rounded-lg transition-colors ${
              showPreview
                ? "bg-primary-500 text-white"
                : "hover:bg-[var(--surface-2)] text-[var(--text-secondary)]"
            }`}
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>

          {/* Browse button */}
          <button
            onClick={() => router.push("/browser")}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors"
          >
            <Search className="w-4 h-4" />
            Browse
          </button>

          {/* Add button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSaving ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isSaving ? "Adding..." : "Add"}
          </motion.button>
        </div>
      </div>

      {/* Success feedback */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-6 mt-3 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm"
          >
            Note added successfully. Ready for next note.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fields panel */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-4">
          {/* Duplicate warning */}
          <AnimatePresence>
            {duplicateWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  {duplicateWarning}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Field editors */}
          {sortedFields.map((field) => (
            <FieldEditor
              key={`${selectedNoteType.id}-${field.name}`}
              field={field}
              value={fields[field.name] || ""}
              onChange={(value) => handleFieldChange(field.name, value)}
              noteTypeKind={selectedNoteType.kind}
              allFieldText={Object.values(fields).join(" ")}
            />
          ))}

          {/* Tags */}
          <div className="pt-2">
            <label className="block text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Tags
            </label>
            <TagInput
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          {/* Keyboard shortcut hint */}
          <div className="pt-4 text-xs text-[var(--text-tertiary)]">
            <kbd className="px-1.5 py-0.5 rounded border border-[var(--surface-3)] bg-[var(--surface-2)] font-mono text-xs">
              Ctrl
            </kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 rounded border border-[var(--surface-3)] bg-[var(--surface-2)] font-mono text-xs">
              Enter
            </kbd>
            {" to add note"}
          </div>
        </div>

        {/* Preview panel */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-[var(--surface-3)] bg-[var(--surface-1)] overflow-hidden"
            >
              <div className="w-[400px] h-full overflow-auto">
                <CardPreview
                  noteType={selectedNoteType}
                  fields={fields}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// @ts-nocheck
"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  Brackets,
  Undo2,
  Redo2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldDefinition {
  /** Display name of the field (e.g., "Front", "Arabic") */
  name: string;
  /** Current HTML value of the field */
  value: string;
  /** Field content type hint */
  type: "text" | "rich" | "cloze";
}

interface FieldEditorProps {
  /** The field definition including name, value, and type */
  field: FieldDefinition;
  /** Language of the field content, used for RTL detection and tashkeel */
  language: "arabic" | "quran" | "spanish" | "english" | "egyptian";
  /** Callback fired when the field value changes */
  onChange: (value: string) => void;
}

// ---------------------------------------------------------------------------
// Arabic Tashkeel Characters
// ---------------------------------------------------------------------------

const TASHKEEL_MARKS = [
  { char: "\u064E", label: "Fatha", shortcut: "a" },
  { char: "\u064F", label: "Damma", shortcut: "u" },
  { char: "\u0650", label: "Kasra", shortcut: "i" },
  { char: "\u064B", label: "Tanwin Fath", shortcut: "A" },
  { char: "\u064C", label: "Tanwin Damm", shortcut: "U" },
  { char: "\u064D", label: "Tanwin Kasr", shortcut: "I" },
  { char: "\u0651", label: "Shadda", shortcut: "~" },
  { char: "\u0652", label: "Sukun", shortcut: "o" },
  { char: "\u0670", label: "Alef Khanjariya", shortcut: "'" },
] as const;

/** Arabic Unicode range used for RTL auto-detection */
const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// ---------------------------------------------------------------------------
// RTL detection helper
// ---------------------------------------------------------------------------

function detectDirection(text: string): "rtl" | "ltr" {
  const stripped = text.replace(/<[^>]*>/g, "").trim();
  if (!stripped) return "ltr";
  return ARABIC_RANGE.test(stripped.charAt(0)) ? "rtl" : "ltr";
}

// ---------------------------------------------------------------------------
// Language-specific styling
// ---------------------------------------------------------------------------

const languageFonts: Record<string, string> = {
  arabic: "arabic-text",
  quran: "quran-text",
  egyptian: "arabic-text",
  spanish: "",
  english: "",
};

const rtlLanguages = new Set(["arabic", "quran", "egyptian"]);

// ---------------------------------------------------------------------------
// Toolbar Button Component
// ---------------------------------------------------------------------------

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  shortcut?: string;
}

function ToolbarButton({
  icon,
  label,
  active = false,
  onClick,
  shortcut,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded-md
        transition-colors duration-100
        ${
          active
            ? "bg-[var(--primary)]/15 text-[var(--primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
        }
      `}
    >
      {icon}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tashkeel Button Component
// ---------------------------------------------------------------------------

interface TashkeelButtonProps {
  char: string;
  label: string;
  shortcut: string;
  onClick: (char: string) => void;
}

function TashkeelButton({ char, label, shortcut, onClick }: TashkeelButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(char)}
      title={`${label} (${shortcut})`}
      aria-label={label}
      className="
        flex items-center justify-center w-9 h-9 rounded-md
        text-lg font-semibold arabic-text leading-none
        text-[var(--text-secondary)] hover:bg-arabic-100 hover:text-arabic-700
        dark:hover:bg-arabic-900/30 dark:hover:text-arabic-400
        transition-colors duration-100
      "
    >
      <span className="relative">
        {/* Base letter (baa) to show diacritic placement */}
        <span className="opacity-40">{"\u0628"}</span>
        <span className="absolute inset-0">{"\u0628"}{char}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FieldEditor Component
// ---------------------------------------------------------------------------

export function FieldEditor({ field, language, onChange }: FieldEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [direction, setDirection] = useState<"rtl" | "ltr">(
    rtlLanguages.has(language) ? "rtl" : "ltr"
  );
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [showTashkeel, setShowTashkeel] = useState(
    rtlLanguages.has(language)
  );

  const isArabicField = rtlLanguages.has(language);

  // Sync external value into contentEditable on mount or when field.value
  // changes from outside (e.g., undo/redo at the parent level).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return; // don't clobber while user is typing
    if (el.innerHTML !== field.value) {
      el.innerHTML = field.value;
    }
  }, [field.value]);

  // Auto-detect direction when the content starts with Arabic characters
  const updateDirection = useCallback(
    (html: string) => {
      if (isArabicField) {
        setDirection("rtl");
        return;
      }
      setDirection(detectDirection(html));
    },
    [isArabicField]
  );

  // Query active formatting state from the browser
  const refreshActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState("bold")) formats.add("bold");
    if (document.queryCommandState("italic")) formats.add("italic");
    if (document.queryCommandState("underline")) formats.add("underline");
    setActiveFormats(formats);
  }, []);

  // ---------------------------------------------------------------------------
  // Input / Selection handlers
  // ---------------------------------------------------------------------------

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    onChange(html);
    updateDirection(html);
    refreshActiveFormats();
  }, [onChange, updateDirection, refreshActiveFormats]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    refreshActiveFormats();
  }, [refreshActiveFormats]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (!isFocused) return;
    refreshActiveFormats();
  }, [isFocused, refreshActiveFormats]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  // ---------------------------------------------------------------------------
  // Formatting commands
  // ---------------------------------------------------------------------------

  const execCommand = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleInput();
    },
    [handleInput]
  );

  const toggleBold = useCallback(() => execCommand("bold"), [execCommand]);
  const toggleItalic = useCallback(() => execCommand("italic"), [execCommand]);
  const toggleUnderline = useCallback(
    () => execCommand("underline"),
    [execCommand]
  );
  const undoAction = useCallback(() => execCommand("undo"), [execCommand]);
  const redoAction = useCallback(() => execCommand("redo"), [execCommand]);

  /** Wrap the current selection in a cloze deletion marker {{c1::...}} */
  const insertCloze = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText.trim()) return;

    // Determine the next cloze number by scanning existing cloze markers
    const el = editorRef.current;
    const existingContent = el?.innerHTML ?? "";
    const clozePattern = /\{\{c(\d+)::/g;
    let maxCloze = 0;
    let match: RegExpExecArray | null;
    while ((match = clozePattern.exec(existingContent)) !== null) {
      maxCloze = Math.max(maxCloze, parseInt(match[1], 10));
    }
    const nextCloze = maxCloze + 1;

    // Replace the selected text with the cloze wrapper
    range.deleteContents();
    const clozeNode = document.createTextNode(
      `{{c${nextCloze}::${selectedText}}}`
    );
    range.insertNode(clozeNode);

    // Move cursor after the inserted cloze
    const newRange = document.createRange();
    newRange.setStartAfter(clozeNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    handleInput();
  }, [handleInput]);

  /** Insert an Arabic tashkeel diacritic at the current cursor position */
  const insertTashkeel = useCallback(
    (char: string) => {
      editorRef.current?.focus();
      // Insert the diacritic directly via insertText so it combines with
      // the preceding letter.
      document.execCommand("insertText", false, char);
      handleInput();
    },
    [handleInput]
  );

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          toggleBold();
          break;
        case "i":
          e.preventDefault();
          toggleItalic();
          break;
        case "u":
          e.preventDefault();
          toggleUnderline();
          break;
        case "z":
          if (e.shiftKey) {
            e.preventDefault();
            redoAction();
          }
          // Let native undo (Cmd+Z) pass through
          break;
        case "shift": // Cmd+Shift+C for cloze
          break;
        case "c":
          if (e.shiftKey) {
            e.preventDefault();
            insertCloze();
          }
          break;
      }
    },
    [toggleBold, toggleItalic, toggleUnderline, redoAction, insertCloze]
  );

  // ---------------------------------------------------------------------------
  // Paste handler — strip external formatting to keep content clean
  // ---------------------------------------------------------------------------

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
      handleInput();
    },
    [handleInput]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-1">
      {/* Field label */}
      <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide px-1">
        {field.name}
      </label>

      {/* Editor container */}
      <motion.div
        animate={{
          borderColor: isFocused
            ? "var(--primary)"
            : "var(--surface-3)",
          boxShadow: isFocused
            ? "0 0 0 3px rgba(99, 102, 241, 0.12)"
            : "0 0 0 0px rgba(99, 102, 241, 0)",
        }}
        transition={{ duration: 0.15 }}
        className="
          rounded-xl border bg-[var(--surface-0)] overflow-hidden
          transition-colors duration-150
        "
      >
        {/* Formatting toolbar */}
        <div
          className="
            flex items-center gap-0.5 px-2 py-1.5
            border-b border-[var(--surface-3)] bg-[var(--surface-1)]
          "
        >
          <ToolbarButton
            icon={<Bold className="w-4 h-4" />}
            label="Bold"
            shortcut="Ctrl+B"
            active={activeFormats.has("bold")}
            onClick={toggleBold}
          />
          <ToolbarButton
            icon={<Italic className="w-4 h-4" />}
            label="Italic"
            shortcut="Ctrl+I"
            active={activeFormats.has("italic")}
            onClick={toggleItalic}
          />
          <ToolbarButton
            icon={<Underline className="w-4 h-4" />}
            label="Underline"
            shortcut="Ctrl+U"
            active={activeFormats.has("underline")}
            onClick={toggleUnderline}
          />

          {/* Cloze deletion button — only for cloze-type fields */}
          {field.type === "cloze" && (
            <>
              <div className="w-px h-5 bg-[var(--surface-3)] mx-1" />
              <ToolbarButton
                icon={<Brackets className="w-4 h-4" />}
                label="Cloze deletion"
                shortcut="Ctrl+Shift+C"
                onClick={insertCloze}
              />
            </>
          )}

          <div className="flex-1" />

          {/* Tashkeel toggle for Arabic fields */}
          {isArabicField && (
            <button
              type="button"
              onClick={() => setShowTashkeel((prev) => !prev)}
              className={`
                px-2 py-1 rounded-md text-xs font-medium transition-colors duration-100
                ${
                  showTashkeel
                    ? "bg-arabic-100 text-arabic-700 dark:bg-arabic-900/30 dark:text-arabic-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              Tashkeel
            </button>
          )}

          <div className="w-px h-5 bg-[var(--surface-3)] mx-1" />

          <ToolbarButton
            icon={<Undo2 className="w-4 h-4" />}
            label="Undo"
            shortcut="Ctrl+Z"
            onClick={undoAction}
          />
          <ToolbarButton
            icon={<Redo2 className="w-4 h-4" />}
            label="Redo"
            shortcut="Ctrl+Shift+Z"
            onClick={redoAction}
          />
        </div>

        {/* Tashkeel toolbar (Arabic fields only) */}
        <AnimatePresence>
          {isArabicField && showTashkeel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-[var(--surface-3)] bg-[var(--surface-1)]"
            >
              <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mr-2">
                  Harakat
                </span>
                {TASHKEEL_MARKS.map((mark) => (
                  <TashkeelButton
                    key={mark.label}
                    char={mark.char}
                    label={mark.label}
                    shortcut={mark.shortcut}
                    onClick={insertTashkeel}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ContentEditable editing surface */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir={direction}
          role="textbox"
          aria-label={`${field.name} editor`}
          aria-multiline="true"
          spellCheck
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={`Enter ${field.name.toLowerCase()}...`}
          className={`
            min-h-[120px] px-4 py-3 outline-none
            text-[var(--text-primary)] text-[15px] leading-relaxed
            ${languageFonts[language] ?? ""}
            ${isArabicField ? "text-[22px] leading-[2.0]" : ""}
            [&:empty]:before:content-[attr(data-placeholder)]
            [&:empty]:before:text-[var(--text-muted)]
            [&:empty]:before:pointer-events-none
          `}
          style={{
            wordBreak: "break-word",
            overflowWrap: "break-word",
            direction,
            textAlign: direction === "rtl" ? "right" : "left",
          }}
        />
      </motion.div>
    </div>
  );
}

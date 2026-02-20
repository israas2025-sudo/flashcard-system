// @ts-nocheck
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Eye } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardPreviewProps {
  /** Field values keyed by field name (e.g., { Front: "...", Back: "..." }) */
  fields: Record<string, string>;
  /**
   * Mustache-like template string. Supported syntax:
   * - {{FieldName}} — insert field value
   * - {{#FieldName}}...{{/FieldName}} — conditional block (render if non-empty)
   * - {{FrontSide}} — on back template, renders the evaluated front
   */
  template: string;
  /** Language of the card content, determines RTL and font */
  language: "arabic" | "quran" | "spanish" | "english" | "egyptian";
  /** Which side of the card to show */
  side: "front" | "back";
}

// ---------------------------------------------------------------------------
// Language-specific styling
// ---------------------------------------------------------------------------

const languageStyles: Record<
  string,
  {
    textClass: string;
    bgAccent: string;
    fontClass: string;
    isRTL: boolean;
    label: string;
  }
> = {
  arabic: {
    textClass: "text-arabic-600 dark:text-arabic-400",
    bgAccent: "bg-arabic-50 dark:bg-arabic-950/30",
    fontClass: "arabic-text",
    isRTL: true,
    label: "Arabic (MSA)",
  },
  quran: {
    textClass: "text-quran-600 dark:text-quran-400",
    bgAccent: "bg-quran-50 dark:bg-quran-950/30",
    fontClass: "quran-text",
    isRTL: true,
    label: "Quranic Arabic",
  },
  spanish: {
    textClass: "text-spanish-600 dark:text-spanish-400",
    bgAccent: "bg-spanish-50 dark:bg-spanish-950/30",
    fontClass: "",
    isRTL: false,
    label: "Spanish",
  },
  english: {
    textClass: "text-english-700 dark:text-english-300",
    bgAccent: "bg-english-50 dark:bg-english-900/30",
    fontClass: "",
    isRTL: false,
    label: "English",
  },
  egyptian: {
    textClass: "text-egyptian-600 dark:text-egyptian-400",
    bgAccent: "bg-egyptian-50 dark:bg-egyptian-950/30",
    fontClass: "arabic-text",
    isRTL: true,
    label: "Egyptian Arabic",
  },
};

// ---------------------------------------------------------------------------
// Template rendering engine
// ---------------------------------------------------------------------------

/**
 * Renders a Mustache-like template string with the given field values.
 *
 * Supported syntax:
 *   {{FieldName}}                          — value substitution
 *   {{#FieldName}}content{{/FieldName}}    — conditional block (non-empty)
 *   {{^FieldName}}content{{/FieldName}}    — inverted conditional (empty)
 *   {{FrontSide}}                          — insert pre-rendered front HTML
 *   {{cloze:FieldName}}                    — cloze rendering (shows blanks)
 */
function renderTemplate(
  template: string,
  fields: Record<string, string>,
  frontHtml?: string
): string {
  let output = template;

  // 1. Handle {{FrontSide}} substitution (back-side only)
  if (frontHtml !== undefined) {
    output = output.replace(/\{\{FrontSide\}\}/g, frontHtml);
  }

  // 2. Handle conditional blocks: {{#Field}}...{{/Field}}
  output = output.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, fieldName: string, content: string) => {
      const value = fields[fieldName] ?? "";
      const stripped = value.replace(/<[^>]*>/g, "").trim();
      return stripped.length > 0 ? content : "";
    }
  );

  // 3. Handle inverted conditional blocks: {{^Field}}...{{/Field}}
  output = output.replace(
    /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_match, fieldName: string, content: string) => {
      const value = fields[fieldName] ?? "";
      const stripped = value.replace(/<[^>]*>/g, "").trim();
      return stripped.length === 0 ? content : "";
    }
  );

  // 4. Handle cloze rendering: {{cloze:FieldName}}
  output = output.replace(
    /\{\{cloze:(\w+)\}\}/g,
    (_match, fieldName: string) => {
      const value = fields[fieldName] ?? "";
      // Replace {{c1::answer}} with [...] placeholder
      return value.replace(
        /\{\{c\d+::([^}]*)\}\}/g,
        '<span class="cloze-blank px-2 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] font-medium">[...]</span>'
      );
    }
  );

  // 5. Handle basic field substitution: {{FieldName}}
  output = output.replace(/\{\{(\w+)\}\}/g, (_match, fieldName: string) => {
    return fields[fieldName] ?? "";
  });

  return output;
}

// ---------------------------------------------------------------------------
// CardPreview Component
// ---------------------------------------------------------------------------

export function CardPreview({
  fields,
  template,
  language,
  side: initialSide,
}: CardPreviewProps) {
  const [currentSide, setCurrentSide] = useState<"front" | "back">(initialSide);
  const style = languageStyles[language] || languageStyles.english;

  // Split template into front/back portions delimited by --- or detect
  // {{FrontSide}} usage. If the template does not contain a separator,
  // treat the entire template as both sides.
  const { frontTemplate, backTemplate } = useMemo(() => {
    // Check for explicit front/back separator
    const separatorMatch = template.match(/^([\s\S]*?)(?:\n---\n)([\s\S]*)$/);
    if (separatorMatch) {
      return {
        frontTemplate: separatorMatch[1].trim(),
        backTemplate: separatorMatch[2].trim(),
      };
    }
    // If the template uses {{FrontSide}}, assume the entire template is the back
    // and the front is a plain render of all fields.
    if (template.includes("{{FrontSide}}")) {
      // Build a simple front from the first non-empty field
      const firstFieldName = Object.keys(fields)[0] ?? "";
      return {
        frontTemplate: firstFieldName ? `{{${firstFieldName}}}` : "",
        backTemplate: template,
      };
    }
    // Fallback: use the full template for both sides
    return { frontTemplate: template, backTemplate: template };
  }, [template, fields]);

  // Render both sides
  const renderedFront = useMemo(
    () => renderTemplate(frontTemplate, fields),
    [frontTemplate, fields]
  );
  const renderedBack = useMemo(
    () => renderTemplate(backTemplate, fields, renderedFront),
    [backTemplate, fields, renderedFront]
  );

  const activeHtml = currentSide === "front" ? renderedFront : renderedBack;

  const toggleSide = useCallback(() => {
    setCurrentSide((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  // Sync with parent-controlled side prop
  React.useEffect(() => {
    setCurrentSide(initialSide);
  }, [initialSide]);

  const isEmpty = !activeHtml.replace(/<[^>]*>/g, "").trim();

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Preview
          </span>
        </div>

        {/* Side toggle */}
        <button
          type="button"
          onClick={toggleSide}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            text-[var(--text-secondary)] hover:bg-[var(--surface-2)]
            transition-colors duration-100
          "
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {currentSide === "front" ? "Show Back" : "Show Front"}
        </button>
      </div>

      {/* Card preview surface */}
      <motion.div
        layout
        className="
          relative rounded-2xl border border-[var(--surface-3)]
          bg-[var(--surface-0)] shadow-card overflow-hidden
        "
        style={{ minHeight: "280px" }}
      >
        {/* Language badge */}
        <div className="absolute top-4 left-4 z-10">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${style.bgAccent} ${style.textClass}`}
          >
            {style.label}
          </span>
        </div>

        {/* Side indicator */}
        <div className="absolute top-4 right-4 z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--surface-2)] text-[var(--text-muted)]">
            {currentSide === "front" ? "Front" : "Back"}
          </span>
        </div>

        {/* Frosted glass top edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        {/* Content area with animated side transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSide}
            initial={{ opacity: 0, rotateY: currentSide === "back" ? -10 : 10 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: currentSide === "back" ? 10 : -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center px-8 py-16"
            style={{ minHeight: "280px" }}
          >
            {isEmpty ? (
              <p className="text-sm text-[var(--text-muted)] italic">
                {currentSide === "front"
                  ? "Front side is empty"
                  : "Back side is empty"}
              </p>
            ) : (
              <div
                dir={style.isRTL ? "rtl" : "ltr"}
                className={`
                  w-full text-center
                  text-[var(--text-primary)]
                  ${style.fontClass}
                  ${style.isRTL ? "text-[22px] leading-[2.0]" : "text-lg leading-relaxed"}
                  [&_.cloze-blank]:inline-block
                  [&_b]:font-semibold [&_i]:italic [&_u]:underline
                `}
                dangerouslySetInnerHTML={{ __html: activeHtml }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/**
 * Template Engine
 *
 * A Mustache-like template rendering engine for flashcard content.
 * Supports field substitution, conditionals, cloze deletions, type-in-answer,
 * hints, text-to-speech, and the special {{FrontSide}} directive.
 */

import type {
  NoteType,
  NoteTypeKind,
  RenderOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';

// ---------------------------------------------------------------------------
// Regex Patterns
// ---------------------------------------------------------------------------

/** Matches {{FieldName}} simple substitution tags. */
const FIELD_PATTERN = /\{\{([^#^/!:{][^}]*?)\}\}/g;

/** Matches {{#FieldName}}...{{/FieldName}} conditional blocks (including nested). */
const CONDITIONAL_PATTERN = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

/** Matches {{^FieldName}}...{{/FieldName}} inverse conditional blocks. */
const INVERSE_CONDITIONAL_PATTERN = /\{\{(\^)(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g;

/** Matches {{type:FieldName}} type-in-answer directives. */
const TYPE_ANSWER_PATTERN = /\{\{type:(\w+)\}\}/g;

/** Matches {{cloze:FieldName}} cloze rendering directives. */
const CLOZE_DIRECTIVE_PATTERN = /\{\{cloze:(\w+)\}\}/g;

/** Matches {{hint:FieldName}} hint directives. */
const HINT_PATTERN = /\{\{hint:(\w+)\}\}/g;

/** Matches {{tts:FieldName}} text-to-speech directives. */
const TTS_PATTERN = /\{\{tts:(\w+)\}\}/g;

/** Matches {{FrontSide}} directive. */
const FRONT_SIDE_PATTERN = /\{\{FrontSide\}\}/g;

/**
 * Matches individual cloze deletions within text content.
 * Format: {{c1::answer}} or {{c1::answer::hint}}
 * Groups: [1] = ordinal number, [2] = answer text, [3] = optional hint text
 */
const CLOZE_DELETION_PATTERN = /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g;

// ---------------------------------------------------------------------------
// TemplateEngine
// ---------------------------------------------------------------------------

export class TemplateEngine {
  /**
   * Render a card template with field values.
   *
   * Supports:
   * - {{FieldName}} -- simple field substitution
   * - {{FrontSide}} -- includes the rendered front template on the back
   * - {{#FieldName}}content{{/FieldName}} -- conditional: shown if field has content
   * - {{^FieldName}}content{{/FieldName}} -- inverse conditional: shown if field is empty
   * - {{type:FieldName}} -- type-in-the-answer input field
   * - {{cloze:FieldName}} -- cloze deletion rendering
   * - {{hint:FieldName}} -- toggleable hint (click to reveal)
   * - {{tts:FieldName}} -- text-to-speech button
   *
   * @param template - The template string to render
   * @param fields - Key-value map of field names to their content
   * @param options - Optional rendering configuration
   * @returns The rendered HTML string
   */
  render(
    template: string,
    fields: Record<string, string>,
    options?: RenderOptions
  ): string {
    let result = template;
    const opts = options || {};

    // 1. Handle {{FrontSide}} substitution (back side only)
    if (opts.frontHtml !== undefined) {
      result = result.replace(FRONT_SIDE_PATTERN, opts.frontHtml);
    }

    // 2. Handle conditionals (process nested from inside out)
    result = this.processConditionals(result, fields);

    // 3. Handle inverse conditionals
    result = this.processInverseConditionals(result, fields);

    // 4. Handle {{cloze:FieldName}} directives
    result = this.processClozeDirectives(result, fields, opts);

    // 5. Handle {{type:FieldName}} directives
    result = this.processTypeAnswer(result, fields, opts);

    // 6. Handle {{hint:FieldName}} directives
    result = this.processHints(result, fields);

    // 7. Handle {{tts:FieldName}} directives
    result = this.processTTS(result, fields);

    // 8. Handle simple {{FieldName}} substitution (last, so directives are resolved first)
    result = this.processFieldSubstitutions(result, fields);

    return result;
  }

  /**
   * Render the front side of a card.
   *
   * @param noteType - The note type definition
   * @param templateOrdinal - Which card template to use (0-based)
   * @param fields - The note's field values
   * @returns Rendered front HTML
   */
  renderFront(
    noteType: NoteType,
    templateOrdinal: number,
    fields: Record<string, string>
  ): string {
    const cardTemplate = noteType.templates[templateOrdinal];
    if (!cardTemplate) {
      throw new Error(
        `Template ordinal ${templateOrdinal} not found in note type "${noteType.name}"`
      );
    }

    const options: RenderOptions = {
      side: 'front',
      showClozeAnswer: false,
    };

    let html = this.render(cardTemplate.frontTemplate, fields, options);

    // Wrap with note type CSS + template CSS
    html = this.wrapWithCSS(html, noteType.css, cardTemplate.css);

    return html;
  }

  /**
   * Render the back side of a card.
   *
   * @param noteType - The note type definition
   * @param templateOrdinal - Which card template to use (0-based)
   * @param fields - The note's field values
   * @param frontHtml - The pre-rendered front HTML (for {{FrontSide}})
   * @returns Rendered back HTML
   */
  renderBack(
    noteType: NoteType,
    templateOrdinal: number,
    fields: Record<string, string>,
    frontHtml: string
  ): string {
    const cardTemplate = noteType.templates[templateOrdinal];
    if (!cardTemplate) {
      throw new Error(
        `Template ordinal ${templateOrdinal} not found in note type "${noteType.name}"`
      );
    }

    const options: RenderOptions = {
      frontHtml,
      side: 'back',
      showClozeAnswer: true,
    };

    let html = this.render(cardTemplate.backTemplate, fields, options);

    // Wrap with note type CSS + template CSS
    html = this.wrapWithCSS(html, noteType.css, cardTemplate.css);

    return html;
  }

  /**
   * Render cloze deletion text for a specific cloze ordinal.
   *
   * On the front side (showAnswer=false):
   * - The active cloze (matching clozeOrdinal) is replaced with [...] or [hint]
   * - All other clozes are shown with their answer text visible
   *
   * On the back side (showAnswer=true):
   * - The active cloze is shown with the answer highlighted
   * - All other clozes are shown with their answer text visible
   *
   * @param text - The raw text containing {{c1::answer::hint}} patterns
   * @param clozeOrdinal - The active cloze number (1-based)
   * @param showAnswer - Whether to reveal the answer (true for back side)
   * @returns The rendered cloze HTML
   */
  renderCloze(text: string, clozeOrdinal: number, showAnswer: boolean): string {
    return text.replace(
      CLOZE_DELETION_PATTERN,
      (match: string, ordStr: string, answer: string, hint?: string) => {
        const ord = parseInt(ordStr, 10);

        if (ord === clozeOrdinal) {
          // This is the active cloze for this card
          if (showAnswer) {
            // Back side: show highlighted answer
            return `<span class="cloze cloze-active">${this.escapeHtml(answer)}</span>`;
          } else {
            // Front side: show placeholder
            const placeholder = hint
              ? `[${this.escapeHtml(hint)}]`
              : '[...]';
            return `<span class="cloze cloze-blank">${placeholder}</span>`;
          }
        } else {
          // Inactive cloze: always show the answer text (not highlighted)
          return `<span class="cloze cloze-inactive">${this.escapeHtml(answer)}</span>`;
        }
      }
    );
  }

  /**
   * Validate template syntax against the available field names.
   *
   * Checks for:
   * - References to unknown fields
   * - Unclosed tags
   * - Mismatched conditional blocks
   * - General syntax errors
   *
   * @param template - The template string to validate
   * @param availableFields - List of valid field names
   * @returns Validation result with errors and warnings
   */
  validateTemplate(
    template: string,
    availableFields: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const fieldSet = new Set(availableFields);
    const usedFields = new Set<string>();

    // Check for unclosed/mismatched conditional blocks
    this.validateConditionalBlocks(template, errors);

    // Check all field references
    this.validateFieldReferences(template, fieldSet, usedFields, errors);

    // Check for unused fields (warning only)
    for (const field of availableFields) {
      if (!usedFields.has(field)) {
        warnings.push({
          type: 'unused_field',
          message: `Field "${field}" is defined but not used in this template`,
        });
      }
    }

    // Check for empty conditionals
    this.validateEmptyConditionals(template, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // -------------------------------------------------------------------------
  // Private: Substitution Processors
  // -------------------------------------------------------------------------

  /**
   * Process nested conditional blocks {{#FieldName}}...{{/FieldName}}.
   * Repeatedly processes from the innermost outward to handle nesting.
   */
  private processConditionals(
    template: string,
    fields: Record<string, string>
  ): string {
    let result = template;
    let previousResult = '';

    // Iterate until no more conditional patterns are found (handles nesting)
    while (result !== previousResult) {
      previousResult = result;
      result = result.replace(
        CONDITIONAL_PATTERN,
        (_match: string, fieldName: string, content: string) => {
          const fieldValue = fields[fieldName];
          if (fieldValue && fieldValue.trim().length > 0) {
            return content;
          }
          return '';
        }
      );
    }

    return result;
  }

  /**
   * Process inverse conditional blocks {{^FieldName}}...{{/FieldName}}.
   * Content is shown only if the field is empty or missing.
   */
  private processInverseConditionals(
    template: string,
    fields: Record<string, string>
  ): string {
    let result = template;
    let previousResult = '';

    while (result !== previousResult) {
      previousResult = result;
      result = result.replace(
        INVERSE_CONDITIONAL_PATTERN,
        (_match: string, _caret: string, fieldName: string, content: string) => {
          const fieldValue = fields[fieldName];
          if (!fieldValue || fieldValue.trim().length === 0) {
            return content;
          }
          return '';
        }
      );
    }

    return result;
  }

  /**
   * Process {{cloze:FieldName}} directives.
   * Replaces the directive with the cloze-rendered version of the field content.
   */
  private processClozeDirectives(
    template: string,
    fields: Record<string, string>,
    options: RenderOptions
  ): string {
    return template.replace(
      CLOZE_DIRECTIVE_PATTERN,
      (_match: string, fieldName: string) => {
        const fieldValue = fields[fieldName];
        if (!fieldValue) return '';

        const clozeOrdinal = options.clozeOrdinal || 1;
        const showAnswer = options.showClozeAnswer || false;

        return this.renderCloze(fieldValue, clozeOrdinal, showAnswer);
      }
    );
  }

  /**
   * Process {{type:FieldName}} directives.
   * Generates either an <input> element (for answering) or a comparison result.
   */
  private processTypeAnswer(
    template: string,
    fields: Record<string, string>,
    options: RenderOptions
  ): string {
    return template.replace(
      TYPE_ANSWER_PATTERN,
      (_match: string, fieldName: string) => {
        const correctAnswer = fields[fieldName] || '';

        if (options.typeAnswerMode === 'compare' && options.typedAnswer !== undefined) {
          // Compare mode: show the diff between typed and correct answer
          return this.generateAnswerComparison(options.typedAnswer, correctAnswer);
        }

        // Input mode: generate an input field
        return (
          `<div class="type-answer-container">` +
          `<input type="text" ` +
          `class="type-answer-input" ` +
          `id="type-answer-${this.escapeHtml(fieldName)}" ` +
          `placeholder="Type your answer..." ` +
          `data-field="${this.escapeHtml(fieldName)}" ` +
          `data-correct="${this.escapeAttr(correctAnswer)}" ` +
          `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />` +
          `</div>`
        );
      }
    );
  }

  /**
   * Process {{hint:FieldName}} directives.
   * Generates a click-to-reveal element.
   */
  private processHints(
    template: string,
    fields: Record<string, string>
  ): string {
    return template.replace(
      HINT_PATTERN,
      (_match: string, fieldName: string) => {
        const hintContent = fields[fieldName];
        if (!hintContent || hintContent.trim().length === 0) {
          return '';
        }

        return (
          `<a class="hint-toggle" href="#" ` +
          `onclick="this.style.display='none';this.nextElementSibling.style.display='block';return false;">` +
          `Show ${this.escapeHtml(fieldName)}</a>` +
          `<div class="hint-content" style="display:none;">` +
          `${hintContent}` +
          `</div>`
        );
      }
    );
  }

  /**
   * Process {{tts:FieldName}} directives.
   * Generates a speaker button that triggers the Web Speech API.
   */
  private processTTS(
    template: string,
    fields: Record<string, string>
  ): string {
    return template.replace(
      TTS_PATTERN,
      (_match: string, fieldName: string) => {
        const textContent = fields[fieldName];
        if (!textContent || textContent.trim().length === 0) {
          return '';
        }

        // Strip HTML tags for speech synthesis
        const plainText = this.stripHtml(textContent);
        const escapedText = this.escapeAttr(plainText);

        return (
          `<button class="tts-button" type="button" ` +
          `onclick="(function(){` +
          `var u=new SpeechSynthesisUtterance('${escapedText.replace(/'/g, "\\'")}');` +
          `window.speechSynthesis.cancel();` +
          `window.speechSynthesis.speak(u);` +
          `})()" ` +
          `aria-label="Read ${this.escapeAttr(fieldName)} aloud" ` +
          `title="Read aloud">` +
          `<span class="tts-icon">&#128264;</span>` +
          `</button>`
        );
      }
    );
  }

  /**
   * Process simple {{FieldName}} substitutions.
   * This is run last so that directive patterns are already resolved.
   */
  private processFieldSubstitutions(
    template: string,
    fields: Record<string, string>
  ): string {
    return template.replace(
      FIELD_PATTERN,
      (_match: string, fieldName: string) => {
        const trimmed = fieldName.trim();

        // Skip special directives that should have been processed already
        if (trimmed === 'FrontSide') return '';
        if (trimmed.startsWith('type:')) return '';
        if (trimmed.startsWith('cloze:')) return '';
        if (trimmed.startsWith('hint:')) return '';
        if (trimmed.startsWith('tts:')) return '';

        const value = fields[trimmed];
        return value !== undefined ? value : '';
      }
    );
  }

  // -------------------------------------------------------------------------
  // Private: Answer Comparison
  // -------------------------------------------------------------------------

  /**
   * Generate an HTML diff showing how the typed answer compares to the correct one.
   * Characters that match are shown in green; mismatches in red with strikethrough.
   */
  private generateAnswerComparison(typed: string, correct: string): string {
    const isCorrect =
      typed.trim().toLowerCase() === correct.trim().toLowerCase();

    if (isCorrect) {
      return (
        `<div class="type-answer-result type-answer-correct">` +
        `<span class="type-answer-good">${this.escapeHtml(correct)}</span>` +
        `</div>`
      );
    }

    // Character-by-character diff
    let givenHtml = '';
    let expectedHtml = '';
    const maxLen = Math.max(typed.length, correct.length);

    for (let i = 0; i < maxLen; i++) {
      const typedChar = i < typed.length ? typed[i] : '';
      const correctChar = i < correct.length ? correct[i] : '';

      if (typedChar === correctChar) {
        givenHtml += `<span class="type-answer-good">${this.escapeHtml(typedChar)}</span>`;
        expectedHtml += `<span class="type-answer-good">${this.escapeHtml(correctChar)}</span>`;
      } else {
        if (typedChar) {
          givenHtml += `<span class="type-answer-bad">${this.escapeHtml(typedChar)}</span>`;
        }
        if (correctChar) {
          expectedHtml += `<span class="type-answer-missed">${this.escapeHtml(correctChar)}</span>`;
        }
      }
    }

    return (
      `<div class="type-answer-result type-answer-incorrect">` +
      `<div class="type-answer-given">${givenHtml}</div>` +
      `<hr class="type-answer-divider" />` +
      `<div class="type-answer-expected">${expectedHtml}</div>` +
      `</div>`
    );
  }

  // -------------------------------------------------------------------------
  // Private: Validation Helpers
  // -------------------------------------------------------------------------

  /**
   * Validate that all conditional blocks are properly opened and closed.
   */
  private validateConditionalBlocks(
    template: string,
    errors: ValidationError[]
  ): void {
    const openPattern = /\{\{([#^])(\w+)\}\}/g;
    const closePattern = /\{\{\/(\w+)\}\}/g;

    const openStack: Array<{ type: string; name: string; position: number }> = [];
    const closePositions = new Map<string, number[]>();

    // Collect all close tags
    let closeMatch: RegExpExecArray | null;
    while ((closeMatch = closePattern.exec(template)) !== null) {
      const name = closeMatch[1];
      if (!closePositions.has(name)) {
        closePositions.set(name, []);
      }
      closePositions.get(name)!.push(closeMatch.index);
    }

    // Validate open tags have matching close tags
    let openMatch: RegExpExecArray | null;
    while ((openMatch = openPattern.exec(template)) !== null) {
      openStack.push({
        type: openMatch[1],
        name: openMatch[2],
        position: openMatch.index,
      });
    }

    // Simple check: count opens vs closes for each field name
    const openCounts = new Map<string, number>();
    const closeCounts = new Map<string, number>();

    for (const entry of openStack) {
      openCounts.set(entry.name, (openCounts.get(entry.name) || 0) + 1);
    }

    closePositions.forEach((positions, name) => {
      closeCounts.set(name, positions.length);
    });

    for (const [name, openCount] of openCounts) {
      const closeCount = closeCounts.get(name) || 0;
      if (openCount > closeCount) {
        errors.push({
          type: 'unclosed_tag',
          message: `Conditional block "{{#${name}}}" or "{{^${name}}}" is opened but not closed`,
        });
      }
    }

    for (const [name, closeCount] of closeCounts) {
      const openCount = openCounts.get(name) || 0;
      if (closeCount > openCount) {
        errors.push({
          type: 'mismatched_conditional',
          message: `Closing tag "{{/${name}}}" has no matching opening tag`,
        });
      }
    }
  }

  /**
   * Validate that all field references point to known fields.
   */
  private validateFieldReferences(
    template: string,
    fieldSet: Set<string>,
    usedFields: Set<string>,
    errors: ValidationError[]
  ): void {
    // Built-in references that are always valid
    const builtins = new Set(['FrontSide']);

    const allRefs = /\{\{([#^/]?)(\w[\w:]*)\}\}/g;
    let refMatch: RegExpExecArray | null;

    while ((refMatch = allRefs.exec(template)) !== null) {
      const prefix = refMatch[1];
      let fieldName = refMatch[2];

      // Skip closing tags
      if (prefix === '/') continue;

      // Extract field name from directive patterns
      if (fieldName.startsWith('type:')) fieldName = fieldName.substring(5);
      else if (fieldName.startsWith('cloze:')) fieldName = fieldName.substring(6);
      else if (fieldName.startsWith('hint:')) fieldName = fieldName.substring(5);
      else if (fieldName.startsWith('tts:')) fieldName = fieldName.substring(4);

      // Skip builtins
      if (builtins.has(fieldName)) continue;

      usedFields.add(fieldName);

      if (!fieldSet.has(fieldName)) {
        errors.push({
          type: 'unknown_field',
          message: `Reference to unknown field "${fieldName}"`,
          position: refMatch.index,
        });
      }
    }
  }

  /**
   * Check for conditional blocks with no content inside.
   */
  private validateEmptyConditionals(
    template: string,
    warnings: ValidationWarning[]
  ): void {
    const emptyConditional = /\{\{[#^](\w+)\}\}\s*\{\{\/\1\}\}/g;
    let emptyMatch: RegExpExecArray | null;

    while ((emptyMatch = emptyConditional.exec(template)) !== null) {
      warnings.push({
        type: 'empty_conditional',
        message: `Conditional block for "${emptyMatch[1]}" is empty`,
        position: emptyMatch.index,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Private: Utility Helpers
  // -------------------------------------------------------------------------

  /**
   * Wrap rendered content with CSS style blocks.
   */
  private wrapWithCSS(
    html: string,
    noteTypeCSS: string,
    templateCSS: string
  ): string {
    let css = '';
    if (noteTypeCSS) {
      css += `<style class="note-type-css">${noteTypeCSS}</style>`;
    }
    if (templateCSS) {
      css += `<style class="template-css">${templateCSS}</style>`;
    }
    return css + html;
  }

  /** Escape HTML special characters. */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Escape a string for use in an HTML attribute value. */
  private escapeAttr(text: string): string {
    return this.escapeHtml(text).replace(/\n/g, '&#10;').replace(/\r/g, '&#13;');
  }

  /** Strip HTML tags from a string. */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

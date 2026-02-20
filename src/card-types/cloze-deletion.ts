/**
 * Enhanced Cloze Deletion System
 *
 * Syntax: {{c1::answer::hint}} where:
 * - c1 is the cloze number (determines which card this deletion appears on)
 * - answer is the text that gets hidden
 * - hint is optional text shown in place of the hidden answer
 *
 * Supports nested cloze: {{c1::The {{c2::cat}} sat on the mat}}
 *   - Card 1 hides the entire phrase "The cat sat on the mat"
 *   - Card 2 hides only "cat" (while the outer c1 text is shown)
 *
 * One card is generated per unique cloze number.
 */

import type { Note, CardCreationData } from '../templates/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClozeData {
  /** Cloze number (1 for c1, 2 for c2, etc.) */
  number: number;
  /** The answer text that gets hidden. */
  answer: string;
  /** Optional hint shown in place of the hidden text. */
  hint: string | null;
  /** Start index in the source text. */
  startIndex: number;
  /** End index in the source text (exclusive). */
  endIndex: number;
}

export interface ClozeValidationResult {
  /** Whether the cloze syntax is valid. */
  valid: boolean;
  /** List of error messages. */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Regex Patterns
// ---------------------------------------------------------------------------

/**
 * Matches cloze deletions: {{c1::answer}} or {{c1::answer::hint}}
 *
 * Uses a non-greedy approach that handles nested braces by matching the
 * innermost cloze patterns first. For fully nested support the parser
 * processes iteratively from inside-out.
 *
 * Groups:
 *   [1] = cloze number (digits)
 *   [2] = answer text
 *   [3] = optional hint text
 */
const CLOZE_PATTERN = /\{\{c(\d+)::([^{}]*?)(?:::([^{}]*?))?\}\}/g;

/**
 * A broader pattern that also catches malformed cloze attempts
 * for validation purposes.
 */
const CLOZE_LIKE_PATTERN = /\{\{c\d+::/g;
const DOUBLE_BRACE_OPEN = /\{\{/g;
const DOUBLE_BRACE_CLOSE = /\}\}/g;

// ---------------------------------------------------------------------------
// ClozeService
// ---------------------------------------------------------------------------

export class ClozeService {
  /**
   * Parse all cloze deletions from a text string.
   *
   * Handles nested cloze by processing the innermost patterns first,
   * replacing them with placeholders, then continuing outward.
   *
   * @param text - The raw text containing cloze syntax
   * @returns Array of parsed cloze data objects, sorted by start index
   */
  parseClozes(text: string): ClozeData[] {
    const results: ClozeData[] = [];
    let match: RegExpExecArray | null;

    // Use a fresh regex each time to avoid stale state
    const pattern = new RegExp(CLOZE_PATTERN.source, 'g');

    while ((match = pattern.exec(text)) !== null) {
      const number = parseInt(match[1], 10);
      const answer = match[2];
      const hint = match[3] ?? null;
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      results.push({
        number,
        answer,
        hint,
        startIndex,
        endIndex,
      });
    }

    // For nested cloze, we also need to handle the outer cloze patterns
    // that may contain inner cloze patterns. We do a second pass with
    // a recursive approach.
    const nestedResults = this.parseNestedClozes(text);
    for (const nested of nestedResults) {
      // Only add if we don't already have a cloze at this position
      const exists = results.some(
        (r) => r.startIndex === nested.startIndex && r.number === nested.number
      );
      if (!exists) {
        results.push(nested);
      }
    }

    // Sort by start index
    results.sort((a, b) => a.startIndex - b.startIndex);

    return results;
  }

  /**
   * Parse nested cloze deletions.
   *
   * For nested patterns like {{c1::The {{c2::cat}} sat}}, the outer c1
   * contains the inner c2 in its answer text. We process these by
   * iteratively stripping inner cloze patterns.
   */
  private parseNestedClozes(text: string): ClozeData[] {
    const results: ClozeData[] = [];

    // Match the outermost patterns by counting brace depth
    let depth = 0;
    let outerStart = -1;
    let i = 0;

    while (i < text.length - 1) {
      if (text[i] === '{' && text[i + 1] === '{') {
        if (depth === 0) {
          // Check if this looks like a cloze opening
          const remaining = text.substring(i);
          if (/^\{\{c\d+::/.test(remaining)) {
            outerStart = i;
          }
        }
        depth++;
        i += 2;
        continue;
      }

      if (text[i] === '}' && text[i + 1] === '}') {
        depth--;
        if (depth === 0 && outerStart >= 0) {
          const fullMatch = text.substring(outerStart, i + 2);
          // Extract cloze number and content
          const headerMatch = fullMatch.match(/^\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}$/);
          if (headerMatch) {
            const number = parseInt(headerMatch[1], 10);
            const rawAnswer = headerMatch[2];
            const hint = headerMatch[3] ?? null;

            // Strip inner cloze markers to get the "true" answer text
            const cleanAnswer = this.stripClozeMarkers(rawAnswer);

            results.push({
              number,
              answer: cleanAnswer,
              hint,
              startIndex: outerStart,
              endIndex: i + 2,
            });
          }
          outerStart = -1;
        }
        i += 2;
        continue;
      }

      i++;
    }

    return results;
  }

  /**
   * Strip cloze markers from text, leaving just the answer text.
   * Converts {{c2::cat}} to just "cat".
   */
  private stripClozeMarkers(text: string): string {
    return text.replace(
      /\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\}\}/g,
      '$1'
    );
  }

  /**
   * Render the front side of a cloze card.
   *
   * The active cloze (matching clozeNumber) is shown as [...] or [hint].
   * All other cloze deletions display their answer text normally.
   *
   * @param text - Raw text with cloze syntax
   * @param clozeNumber - The active cloze number for this card
   * @returns HTML string with the active cloze replaced by a blank
   */
  renderClozeFront(text: string, clozeNumber: number): string {
    return this.renderCloze(text, clozeNumber, false);
  }

  /**
   * Render the back side of a cloze card.
   *
   * The active cloze is shown highlighted with its answer.
   * All other cloze deletions display their answer text normally.
   *
   * @param text - Raw text with cloze syntax
   * @param clozeNumber - The active cloze number for this card
   * @returns HTML string with the active cloze highlighted
   */
  renderClozeBack(text: string, clozeNumber: number): string {
    return this.renderCloze(text, clozeNumber, true);
  }

  /**
   * Core cloze rendering logic.
   *
   * Processes the text iteratively to handle nested cloze correctly:
   * first the innermost patterns, then outward.
   */
  private renderCloze(text: string, clozeNumber: number, showAnswer: boolean): string {
    // Process from innermost cloze outward
    let result = text;
    let changed = true;

    // Iterate until no more cloze patterns can be resolved
    while (changed) {
      changed = false;
      const pattern = new RegExp(CLOZE_PATTERN.source, 'g');
      const newResult = result.replace(
        pattern,
        (match: string, numStr: string, answer: string, hint?: string) => {
          changed = true;
          const num = parseInt(numStr, 10);

          if (num === clozeNumber) {
            if (showAnswer) {
              // Back side: highlighted answer
              return `<span class="cloze cloze-active">${this.escapeHtml(answer)}</span>`;
            } else {
              // Front side: placeholder
              const placeholder = hint
                ? `[${this.escapeHtml(hint)}]`
                : '[...]';
              return `<span class="cloze cloze-blank">${placeholder}</span>`;
            }
          } else {
            // Inactive cloze: show answer text (not highlighted)
            return `<span class="cloze cloze-inactive">${this.escapeHtml(answer)}</span>`;
          }
        }
      );
      result = newResult;
    }

    return result;
  }

  /**
   * Count the number of unique cloze numbers in the text.
   * This equals the number of cards that will be generated.
   *
   * @param text - Raw text with cloze syntax
   * @returns Number of unique cloze numbers found
   */
  countClozes(text: string): number {
    return this.getUniqueClozeNumbers(text).size;
  }

  /**
   * Get all unique cloze numbers found in the text.
   */
  getUniqueClozeNumbers(text: string): Set<number> {
    const numbers = new Set<number>();
    const pattern = new RegExp(CLOZE_PATTERN.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        numbers.add(num);
      }
    }

    // Also check for nested cloze in outer patterns
    let depth = 0;
    let i = 0;
    while (i < text.length - 1) {
      if (text[i] === '{' && text[i + 1] === '{') {
        if (depth === 0) {
          const remaining = text.substring(i);
          const headerMatch = remaining.match(/^\{\{c(\d+)::/);
          if (headerMatch) {
            const num = parseInt(headerMatch[1], 10);
            if (!isNaN(num) && num > 0) {
              numbers.add(num);
            }
          }
        }
        depth++;
        i += 2;
        continue;
      }
      if (text[i] === '}' && text[i + 1] === '}') {
        depth--;
        i += 2;
        continue;
      }
      i++;
    }

    return numbers;
  }

  /**
   * Validate cloze syntax in the given text.
   *
   * Checks for:
   * - Unmatched opening/closing braces
   * - Invalid cloze number (0 or negative)
   * - Empty answer text
   * - Malformed cloze syntax
   *
   * @param text - The text to validate
   * @returns Validation result with any errors found
   */
  validateCloze(text: string): ClozeValidationResult {
    const errors: string[] = [];

    // Check for balanced braces
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{' && i + 1 < text.length && text[i + 1] === '{') {
        depth++;
        i++;
      } else if (text[i] === '}' && i + 1 < text.length && text[i + 1] === '}') {
        depth--;
        i++;
        if (depth < 0) {
          errors.push(`Unexpected closing braces at position ${i - 1}`);
          depth = 0;
        }
      }
    }

    if (depth > 0) {
      errors.push(`${depth} unclosed double-brace opening(s) found`);
    }

    // Check for cloze-like patterns that are malformed
    const clozeAttempts = text.match(CLOZE_LIKE_PATTERN) || [];
    const validClozes = text.match(new RegExp(CLOZE_PATTERN.source, 'g')) || [];

    // Count cloze openings vs valid full cloze patterns
    // (this is approximate for nested but good enough for validation)
    if (clozeAttempts.length > 0 && validClozes.length === 0 && depth === 0) {
      errors.push('Cloze patterns found but none are properly formed. Expected format: {{c1::answer}} or {{c1::answer::hint}}');
    }

    // Validate individual cloze deletions
    const pattern = new RegExp(CLOZE_PATTERN.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const number = parseInt(match[1], 10);
      const answer = match[2];

      if (number <= 0) {
        errors.push(`Invalid cloze number ${number} at position ${match.index}. Cloze numbers must be positive.`);
      }

      if (!answer || answer.trim().length === 0) {
        errors.push(`Empty answer in cloze c${number} at position ${match.index}`);
      }
    }

    // Check for sequential numbering gaps (warning-level, included as error for simplicity)
    const numbers = this.getUniqueClozeNumbers(text);
    if (numbers.size > 0) {
      const sorted = Array.from(numbers).sort((a, b) => a - b);
      if (sorted[0] !== 1) {
        errors.push(`Cloze numbering should start at 1, but starts at c${sorted[0]}`);
      }
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) {
          errors.push(
            `Gap in cloze numbering: c${sorted[i - 1]} to c${sorted[i]}. ` +
            `Expected c${sorted[i - 1] + 1}.`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate card creation data for a cloze note.
   *
   * Scans all field values for cloze markers and creates one CardCreationData
   * entry per unique cloze number.
   *
   * @param note - The cloze note to generate cards for
   * @returns Array of card creation data objects
   */
  generateClozeCards(note: Note): CardCreationData[] {
    // Collect all unique cloze numbers from all fields
    const allNumbers = new Set<number>();

    for (const value of Object.values(note.fields)) {
      if (!value) continue;
      const fieldNumbers = this.getUniqueClozeNumbers(value);
      for (const num of fieldNumbers) {
        allNumbers.add(num);
      }
    }

    if (allNumbers.size === 0) {
      return [];
    }

    const sortedNumbers = Array.from(allNumbers).sort((a, b) => a - b);

    return sortedNumbers.map((clozeNumber) => ({
      noteId: note.id,
      deckId: note.deckId,
      templateOrdinal: 0,
      clozeOrdinal: clozeNumber,
    }));
  }

  /**
   * Get the next available cloze number for adding a new cloze to text.
   *
   * @param text - Current text content
   * @returns The next cloze number to use
   */
  getNextClozeNumber(text: string): number {
    const numbers = this.getUniqueClozeNumbers(text);
    if (numbers.size === 0) return 1;
    return Math.max(...numbers) + 1;
  }

  /**
   * Wrap selected text in a cloze deletion marker.
   *
   * @param text - The full text
   * @param selectionStart - Start of selection
   * @param selectionEnd - End of selection
   * @param clozeNumber - Optional cloze number (auto-assigned if omitted)
   * @param hint - Optional hint text
   * @returns The modified text with cloze marker
   */
  wrapInCloze(
    text: string,
    selectionStart: number,
    selectionEnd: number,
    clozeNumber?: number,
    hint?: string
  ): string {
    const selected = text.substring(selectionStart, selectionEnd);
    if (!selected) return text;

    const num = clozeNumber ?? this.getNextClozeNumber(text);
    const hintPart = hint ? `::${hint}` : '';
    const cloze = `{{c${num}::${selected}${hintPart}}}`;

    return text.substring(0, selectionStart) + cloze + text.substring(selectionEnd);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

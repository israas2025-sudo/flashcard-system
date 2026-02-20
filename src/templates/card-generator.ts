/**
 * Card Generator
 *
 * Generates card rows from notes based on their note type configuration.
 * Handles both standard note types (one card per template) and cloze
 * note types (one card per cloze deletion number).
 */

import { TemplateEngine } from './template-engine';
import type {
  Note,
  NoteType,
  NoteTypeKind,
  CardTemplate,
  CardCreationData,
} from './types';

// ---------------------------------------------------------------------------
// Cloze Deletion Detection
// ---------------------------------------------------------------------------

/**
 * Pattern to detect cloze deletions in field values.
 * Matches {{c1::answer}} and {{c1::answer::hint}} patterns.
 */
const CLOZE_DETECTION_PATTERN = /\{\{c(\d+)::[^}]+\}\}/g;

// ---------------------------------------------------------------------------
// CardGenerator
// ---------------------------------------------------------------------------

export class CardGenerator {
  private templateEngine: TemplateEngine;

  constructor(templateEngine?: TemplateEngine) {
    this.templateEngine = templateEngine || new TemplateEngine();
  }

  /**
   * Given a note and its note type, generate all card creation data.
   *
   * For standard note types:
   *   Each card template that has non-empty required fields generates one card.
   *
   * For cloze note types:
   *   Scans all field values for cloze deletion markers ({{c1::...}}).
   *   Generates one card per unique cloze ordinal number found.
   *
   * @param note - The note containing field values
   * @param noteType - The note type defining fields and templates
   * @returns Array of card creation data objects
   */
  generateCards(note: Note, noteType: NoteType): CardCreationData[] {
    if (noteType.kind === 'cloze') {
      return this.generateClozeCards(note, noteType);
    }
    return this.generateStandardCards(note, noteType);
  }

  /**
   * Regenerate cards after note type template changes.
   *
   * This is an async operation because it needs to interact with the database
   * to fetch the current state and update cards accordingly.
   *
   * In a real implementation, this would:
   * 1. Fetch the note and its current cards from the database
   * 2. Compute what cards should exist based on current templates
   * 3. Add cards for new templates
   * 4. Remove cards for deleted templates
   * 5. Update existing cards if templates changed
   *
   * @param noteId - The ID of the note to regenerate cards for
   */
  async regenerateCards(noteId: string): Promise<void> {
    // This method requires database access. In a full implementation it would:
    //
    // 1. Fetch the note by noteId
    // 2. Fetch the note type for the note
    // 3. Fetch all existing cards for this note
    // 4. Call generateCards() to get the expected cards
    // 5. Diff existing vs expected:
    //    - Cards that exist but shouldn't: mark for deletion
    //    - Cards that should exist but don't: create them
    //    - Cards that exist and should: update rendered content if needed
    // 6. Execute database operations
    //
    // The actual database operations are delegated to the API/service layer.
    // This method serves as a coordination point.

    throw new Error(
      `regenerateCards requires database access. ` +
      `Use the API service layer to regenerate cards for note "${noteId}".`
    );
  }

  /**
   * Check if a template would generate a non-empty card for the given fields.
   *
   * A card is considered non-empty if the front side template, when rendered
   * with the given field values, produces non-whitespace content.
   *
   * @param template - The card template to check
   * @param fields - The field values to test against
   * @returns true if the template would produce a non-empty card
   */
  shouldGenerateCard(
    template: CardTemplate,
    fields: Record<string, string>
  ): boolean {
    // Quick check: if the front template is empty, no card
    if (!template.frontTemplate || template.frontTemplate.trim().length === 0) {
      return false;
    }

    // Check if any field referenced in the front template has content
    const referencedFields = this.extractReferencedFields(template.frontTemplate);

    // If no fields are referenced, the template is static -- always generate
    if (referencedFields.length === 0) {
      return true;
    }

    // At least one referenced field must have non-empty content
    return referencedFields.some((fieldName) => {
      const value = fields[fieldName];
      return value !== undefined && value.trim().length > 0;
    });
  }

  // -------------------------------------------------------------------------
  // Private: Standard Card Generation
  // -------------------------------------------------------------------------

  /**
   * Generate cards for a standard (non-cloze) note type.
   * One card per template, provided the template's required fields are filled.
   */
  private generateStandardCards(
    note: Note,
    noteType: NoteType
  ): CardCreationData[] {
    const cards: CardCreationData[] = [];

    for (const template of noteType.templates) {
      if (this.shouldGenerateCard(template, note.fields)) {
        cards.push({
          noteId: note.id,
          deckId: note.deckId,
          templateOrdinal: template.ordinal,
          clozeOrdinal: 0,
        });
      }
    }

    return cards;
  }

  // -------------------------------------------------------------------------
  // Private: Cloze Card Generation
  // -------------------------------------------------------------------------

  /**
   * Generate cards for a cloze note type.
   * Scans all fields for cloze markers and creates one card per ordinal.
   */
  private generateClozeCards(
    note: Note,
    noteType: NoteType
  ): CardCreationData[] {
    const clozeOrdinals = this.findClozeOrdinals(note.fields);

    if (clozeOrdinals.size === 0) {
      return [];
    }

    const cards: CardCreationData[] = [];
    const sortedOrdinals = Array.from(clozeOrdinals).sort((a, b) => a - b);

    for (const ordinal of sortedOrdinals) {
      // For cloze types, we always use template ordinal 0
      cards.push({
        noteId: note.id,
        deckId: note.deckId,
        templateOrdinal: 0,
        clozeOrdinal: ordinal,
      });
    }

    return cards;
  }

  /**
   * Scan all field values to find unique cloze ordinal numbers.
   * Returns a Set of ordinal numbers (e.g., {1, 2, 3}).
   */
  private findClozeOrdinals(fields: Record<string, string>): Set<number> {
    const ordinals = new Set<number>();

    for (const value of Object.values(fields)) {
      if (!value) continue;

      let match: RegExpExecArray | null;
      // Reset regex state
      const pattern = new RegExp(CLOZE_DETECTION_PATTERN.source, 'g');

      while ((match = pattern.exec(value)) !== null) {
        const ordinal = parseInt(match[1], 10);
        if (!isNaN(ordinal) && ordinal > 0) {
          ordinals.add(ordinal);
        }
      }
    }

    return ordinals;
  }

  // -------------------------------------------------------------------------
  // Private: Field Extraction
  // -------------------------------------------------------------------------

  /**
   * Extract the names of all fields referenced in a template string.
   * Handles simple references, conditionals, and directives.
   */
  private extractReferencedFields(template: string): string[] {
    const fields = new Set<string>();

    // Simple field references: {{FieldName}}
    const simplePattern = /\{\{([^#^/!:{][^}]*?)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = simplePattern.exec(template)) !== null) {
      const name = match[1].trim();
      if (name !== 'FrontSide') {
        fields.add(name);
      }
    }

    // Conditional field references: {{#FieldName}} and {{^FieldName}}
    const conditionalPattern = /\{\{[#^](\w+)\}\}/g;
    while ((match = conditionalPattern.exec(template)) !== null) {
      fields.add(match[1]);
    }

    // Directive field references: {{type:Field}}, {{cloze:Field}}, etc.
    const directivePattern = /\{\{(?:type|cloze|hint|tts):(\w+)\}\}/g;
    while ((match = directivePattern.exec(template)) !== null) {
      fields.add(match[1]);
    }

    return Array.from(fields);
  }
}

/**
 * Image Occlusion Card Type
 *
 * Allows users to upload an image and draw rectangular, elliptical, or polygon
 * masks over regions. Two study modes are supported:
 *
 * - Hide-All-Guess-One (HAGO): All regions are masked. One card per mask;
 *   each card reveals only that mask's region while others remain hidden.
 *
 * - Hide-One-Guess-One (HOGO): Only one region is masked per card.
 *   The rest of the image is visible as context.
 *
 * One card is generated per mask region.
 */

import { v4 as uuidv4 } from 'crypto';
import { query, withTransaction } from '../db/connection';
import type { Note, CardCreationData } from '../templates/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcclusionMode = 'hide-all-guess-one' | 'hide-one-guess-one';

export interface OcclusionMask {
  /** Unique identifier for this mask region. */
  id: string;

  /** Shape type of the mask. */
  type: 'rectangle' | 'ellipse' | 'polygon';

  // Rectangle properties
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Ellipse properties
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;

  // Polygon properties — ordered list of vertices
  points?: { x: number; y: number }[];

  /** Optional text label describing the masked region. */
  label?: string;

  /** Mask fill colour (CSS-compatible). Defaults to a semi-transparent blue. */
  color?: string;
}

export interface OcclusionNoteData {
  imageUrl: string;
  masks: OcclusionMask[];
  mode: OcclusionMode;
  labels?: string[];
}

/**
 * Minimal Card interface used by this module.
 */
export interface Card {
  id: string;
  noteId: string;
  deckId: string;
  templateOrdinal: number;
  clozeOrdinal: number;
  frontHtml?: string;
  backHtml?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_MASK_COLOR = 'rgba(59, 130, 246, 0.65)';
const REVEAL_HIGHLIGHT_COLOR = 'rgba(34, 197, 94, 0.35)';

function generateId(): string {
  // Use crypto.randomUUID when available, fall-back to timestamp + random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// SVG Mask Rendering
// ---------------------------------------------------------------------------

/**
 * Generate the SVG element string for a single mask shape.
 */
function renderMaskShape(
  mask: OcclusionMask,
  fill: string
): string {
  const id = `mask-${mask.id}`;

  switch (mask.type) {
    case 'rectangle':
      return (
        `<rect id="${id}" ` +
        `x="${mask.x ?? 0}" y="${mask.y ?? 0}" ` +
        `width="${mask.width ?? 0}" height="${mask.height ?? 0}" ` +
        `fill="${fill}" rx="4" />`
      );

    case 'ellipse':
      return (
        `<ellipse id="${id}" ` +
        `cx="${mask.cx ?? 0}" cy="${mask.cy ?? 0}" ` +
        `rx="${mask.rx ?? 0}" ry="${mask.ry ?? 0}" ` +
        `fill="${fill}" />`
      );

    case 'polygon': {
      const pointsStr = (mask.points || [])
        .map((p) => `${p.x},${p.y}`)
        .join(' ');
      return (
        `<polygon id="${id}" ` +
        `points="${pointsStr}" ` +
        `fill="${fill}" />`
      );
    }

    default:
      return '';
  }
}

/**
 * Render a label centered inside a mask region.
 */
function renderMaskLabel(mask: OcclusionMask, label: string): string {
  let cx = 0;
  let cy = 0;

  switch (mask.type) {
    case 'rectangle':
      cx = (mask.x ?? 0) + (mask.width ?? 0) / 2;
      cy = (mask.y ?? 0) + (mask.height ?? 0) / 2;
      break;
    case 'ellipse':
      cx = mask.cx ?? 0;
      cy = mask.cy ?? 0;
      break;
    case 'polygon': {
      const pts = mask.points || [];
      if (pts.length > 0) {
        cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      }
      break;
    }
  }

  return (
    `<text x="${cx}" y="${cy}" ` +
    `text-anchor="middle" dominant-baseline="central" ` +
    `fill="white" font-size="14" font-weight="600" ` +
    `style="pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.6)">` +
    `${escapeXml(label)}</text>`
  );
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ---------------------------------------------------------------------------
// ImageOcclusionService
// ---------------------------------------------------------------------------

export class ImageOcclusionService {
  /**
   * Create an image occlusion note from an image and mask definitions.
   *
   * Generates one card per mask region. The card front shows the occluded
   * image (with the appropriate masks based on the mode), and the card back
   * reveals the hidden region and its label.
   *
   * @param userId  - Owner of the note
   * @param deckId  - Target deck
   * @param imageUrl - URL (or data-URL) of the source image
   * @param masks   - Array of mask region definitions
   * @param mode    - 'hide-all-guess-one' or 'hide-one-guess-one'
   * @param labels  - Optional text labels for each mask region (parallel to masks)
   * @returns The created note and its generated cards
   */
  async createOcclusionNote(
    userId: string,
    deckId: string,
    imageUrl: string,
    masks: OcclusionMask[],
    mode: OcclusionMode,
    labels?: string[]
  ): Promise<{ note: Note; cards: Card[] }> {
    // Merge labels into mask objects
    const mergedMasks = masks.map((m, i) => ({
      ...m,
      id: m.id || generateId(),
      label: labels?.[i] ?? m.label ?? '',
    }));

    // Build the note fields
    const noteId = generateId();
    const now = new Date();

    const noteFields: Record<string, string> = {
      ImageURL: imageUrl,
      Masks: JSON.stringify(mergedMasks),
      Mode: mode,
    };

    const note: Note = {
      id: noteId,
      noteTypeId: 'image-occlusion',
      deckId,
      fields: noteFields,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };

    // Generate one card per mask
    const cards: Card[] = mergedMasks.map((mask, index) => {
      const frontHtml = this.renderOccludedImage(imageUrl, mergedMasks, -1, mode, index);
      const backHtml = this.renderOccludedImage(imageUrl, mergedMasks, index, mode, index);

      return {
        id: generateId(),
        noteId,
        deckId,
        templateOrdinal: 0,
        clozeOrdinal: index + 1,
        frontHtml,
        backHtml,
      };
    });

    // Persist to database within a transaction
    await withTransaction(async (client) => {
      // Insert note
      await client.query(
        `INSERT INTO notes (id, user_id, note_type_id, deck_id, fields, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [noteId, userId, 'image-occlusion', deckId, JSON.stringify(noteFields), now, now]
      );

      // Insert cards
      for (const card of cards) {
        await client.query(
          `INSERT INTO cards (id, note_id, deck_id, template_ordinal, cloze_ordinal, front_html, back_html, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [card.id, noteId, deckId, card.templateOrdinal, card.clozeOrdinal, card.frontHtml, card.backHtml, now, now]
        );
      }
    });

    return { note, cards };
  }

  /**
   * Render the image with masks for a specific card.
   *
   * Returns an HTML string containing an SVG overlay on top of the image.
   *
   * @param imageUrl    - The source image URL
   * @param masks       - All mask definitions for this note
   * @param revealIndex - Index of the mask to reveal (-1 = all hidden)
   * @param mode        - HAGO or HOGO
   * @param cardIndex   - Which card is being rendered (determines active mask)
   * @returns HTML/SVG string
   */
  renderOccludedImage(
    imageUrl: string,
    masks: OcclusionMask[],
    revealIndex: number,
    mode: OcclusionMode,
    cardIndex?: number
  ): string {
    const activeIndex = cardIndex ?? revealIndex;

    const maskElements = masks.map((mask, i) => {
      const isActive = i === activeIndex;

      if (mode === 'hide-all-guess-one') {
        // HAGO: all masks are shown, the revealed one gets a different color
        if (revealIndex === i) {
          // Reveal this mask (back side) -- show a highlight border instead of a solid fill
          const highlight = renderMaskShape(mask, REVEAL_HIGHLIGHT_COLOR);
          const label = mask.label
            ? renderMaskLabel(mask, mask.label)
            : '';
          return highlight + label;
        }
        // All others remain masked
        const fill = mask.color || DEFAULT_MASK_COLOR;
        const maskSvg = renderMaskShape(mask, fill);
        const label = mask.label
          ? renderMaskLabel(mask, '?')
          : '';
        return maskSvg + label;
      } else {
        // HOGO: only the active mask is hidden on the front; on the back it is revealed
        if (isActive) {
          if (revealIndex === i) {
            // Back side: reveal with highlight
            const highlight = renderMaskShape(mask, REVEAL_HIGHLIGHT_COLOR);
            const label = mask.label
              ? renderMaskLabel(mask, mask.label)
              : '';
            return highlight + label;
          }
          // Front side: this one mask is hidden
          const fill = mask.color || DEFAULT_MASK_COLOR;
          const maskSvg = renderMaskShape(mask, fill);
          const label = '?';
          return maskSvg + renderMaskLabel(mask, label);
        }
        // All other masks are shown (visible, no occlusion)
        return '';
      }
    });

    return (
      `<div class="image-occlusion-container" style="position:relative;display:inline-block;">` +
      `<img src="${escapeXml(imageUrl)}" ` +
      `style="display:block;max-width:100%;height:auto;" ` +
      `alt="Occlusion image" />` +
      `<svg style="position:absolute;top:0;left:0;width:100%;height:100%;" ` +
      `preserveAspectRatio="xMidYMid meet" ` +
      `class="occlusion-overlay">` +
      maskElements.join('\n') +
      `</svg>` +
      `</div>`
    );
  }

  /**
   * Update the mask positions/shapes for an existing occlusion note.
   *
   * Re-renders all card front/back HTML and persists updates.
   *
   * @param noteId - The note to update
   * @param masks  - New mask definitions
   */
  async updateMasks(noteId: string, masks: OcclusionMask[]): Promise<void> {
    const now = new Date();

    await withTransaction(async (client) => {
      // Fetch the current note
      const noteResult = await client.query(
        `SELECT fields FROM notes WHERE id = $1`,
        [noteId]
      );

      if (noteResult.rows.length === 0) {
        throw new Error(`Note "${noteId}" not found`);
      }

      const fields = noteResult.rows[0].fields as Record<string, string>;
      const imageUrl = fields.ImageURL || '';
      const mode = (fields.Mode || 'hide-all-guess-one') as OcclusionMode;

      // Assign IDs to masks that don't have them
      const updatedMasks = masks.map((m) => ({
        ...m,
        id: m.id || generateId(),
      }));

      // Update note fields
      const updatedFields = {
        ...fields,
        Masks: JSON.stringify(updatedMasks),
      };

      await client.query(
        `UPDATE notes SET fields = $1, updated_at = $2 WHERE id = $3`,
        [JSON.stringify(updatedFields), now, noteId]
      );

      // Delete existing cards for this note
      await client.query(
        `DELETE FROM cards WHERE note_id = $1`,
        [noteId]
      );

      // Fetch the deck ID from the note
      const deckResult = await client.query(
        `SELECT deck_id FROM notes WHERE id = $1`,
        [noteId]
      );
      const deckId = deckResult.rows[0]?.deck_id || '';

      // Regenerate cards
      for (let i = 0; i < updatedMasks.length; i++) {
        const cardId = generateId();
        const frontHtml = this.renderOccludedImage(imageUrl, updatedMasks, -1, mode, i);
        const backHtml = this.renderOccludedImage(imageUrl, updatedMasks, i, mode, i);

        await client.query(
          `INSERT INTO cards (id, note_id, deck_id, template_ordinal, cloze_ordinal, front_html, back_html, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [cardId, noteId, deckId, 0, i + 1, frontHtml, backHtml, now, now]
        );
      }
    });
  }

  /**
   * Parse mask definitions from note fields.
   *
   * @param fields - The note's field values
   * @returns Parsed mask array
   */
  parseMasksFromFields(fields: Record<string, string>): OcclusionMask[] {
    try {
      return JSON.parse(fields.Masks || '[]') as OcclusionMask[];
    } catch {
      return [];
    }
  }

  /**
   * Get the mode from note fields.
   */
  getModeFromFields(fields: Record<string, string>): OcclusionMode {
    return (fields.Mode as OcclusionMode) || 'hide-all-guess-one';
  }
}

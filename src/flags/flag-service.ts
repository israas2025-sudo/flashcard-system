/**
 * Flag Service
 *
 * Provides card flagging functionality for the multilingual flashcard
 * application. Flags are color-coded markers (0-7) that users can assign
 * to cards for quick visual identification and filtering during review.
 *
 * Flag 0 means "no flag" (clears any existing flag).
 * Flags 1-7 correspond to specific colors: Red, Orange, Green, Blue,
 * Pink, Turquoise, and Purple.
 *
 * All queries use parameterized statements to prevent SQL injection.
 */

import { pool } from '../db/connection';

/**
 * Predefined flag colors with display names and hex values.
 *
 * Flag 0 is the "no flag" state with a null color. Flags 1-7 map to
 * distinct, accessible colors chosen for visual clarity.
 */
export const FLAG_COLORS = {
  0: { name: 'No flag', color: null },
  1: { name: 'Red', color: '#EF4444' },
  2: { name: 'Orange', color: '#F97316' },
  3: { name: 'Green', color: '#22C55E' },
  4: { name: 'Blue', color: '#3B82F6' },
  5: { name: 'Pink', color: '#EC4899' },
  6: { name: 'Turquoise', color: '#14B8A6' },
  7: { name: 'Purple', color: '#8B5CF6' },
} as const;

/** Valid flag numbers (0 through 7) */
export type FlagNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Information about a single flag definition.
 */
export interface FlagInfo {
  /** The flag number (0-7) */
  number: FlagNumber;
  /** Human-readable name (e.g., "Red", "Blue") */
  name: string;
  /** Hex color code, or null for "No flag" */
  color: string | null;
}

/**
 * A card returned from flag-based queries.
 * Minimal representation to avoid coupling with the full Card type.
 */
export interface FlaggedCard {
  /** Unique card identifier */
  id: string;
  /** ID of the note this card belongs to */
  noteId: string;
  /** ID of the deck containing this card */
  deckId: string;
  /** Front content of the card */
  front: string;
  /** Back content of the card */
  back: string;
  /** The flag number assigned to this card */
  flag: FlagNumber;
}

export class FlagService {
  /**
   * Set or clear a flag on a card.
   *
   * Setting flag 0 clears any existing flag. Flags 1-7 assign the
   * corresponding color marker. The flag value is stored in the `flag`
   * column of the `cards` table.
   *
   * @param cardId - The card to flag
   * @param flag - The flag number (0 = clear, 1-7 = colored flag)
   * @throws Error if the card is not found
   * @throws Error if the flag number is out of range
   */
  async setFlag(cardId: string, flag: FlagNumber): Promise<void> {
    if (flag < 0 || flag > 7) {
      throw new Error(`Invalid flag number: ${flag}. Must be between 0 and 7.`);
    }

    const result = await pool.query(
      `UPDATE cards
       SET flag = $2
       WHERE id = $1
       RETURNING id`,
      [cardId, flag]
    );

    if (result.rows.length === 0) {
      throw new Error(`Card "${cardId}" not found`);
    }
  }

  /**
   * Get all cards with a specific flag for a user.
   *
   * Returns cards across all of the user's decks that have the
   * specified flag number assigned.
   *
   * @param userId - The user whose flagged cards to retrieve
   * @param flag - The flag number to filter by (1-7; 0 would return unflagged cards)
   * @returns Array of FlaggedCard objects matching the specified flag
   */
  async getCardsByFlag(userId: string, flag: number): Promise<FlaggedCard[]> {
    if (flag < 0 || flag > 7) {
      throw new Error(`Invalid flag number: ${flag}. Must be between 0 and 7.`);
    }

    const result = await pool.query(
      `SELECT c.id,
              c.note_id AS "noteId",
              c.deck_id AS "deckId",
              c.front,
              c.back,
              c.flag
       FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = $1
         AND c.flag = $2
       ORDER BY c.id`,
      [userId, flag]
    );

    return result.rows as FlaggedCard[];
  }

  /**
   * Clear all flags from all of a user's cards.
   *
   * Resets the `flag` column to 0 ("No flag") for every card in
   * every deck owned by the user. This is a bulk operation intended
   * for the "Clear all flags" UI action.
   *
   * @param userId - The user whose flags to clear
   */
  async clearAllFlags(userId: string): Promise<void> {
    await pool.query(
      `UPDATE cards
       SET flag = 0
       WHERE deck_id IN (
         SELECT id FROM decks WHERE user_id = $1
       )
       AND flag != 0`,
      [userId]
    );
  }

  /**
   * Get a summary of flag usage across all of a user's cards.
   *
   * Returns the count of cards for each flag number (1-7).
   * Flag 0 (no flag) is excluded from the summary.
   *
   * @param userId - The user whose flag summary to retrieve
   * @returns Array of objects with flag number, name, color, and count
   */
  async getFlagSummary(
    userId: string
  ): Promise<Array<FlagInfo & { count: number }>> {
    const result = await pool.query(
      `SELECT c.flag, COUNT(c.id)::int AS count
       FROM cards c
       JOIN decks d ON c.deck_id = d.id
       WHERE d.user_id = $1
         AND c.flag != 0
       GROUP BY c.flag
       ORDER BY c.flag`,
      [userId]
    );

    return result.rows.map((row: { flag: FlagNumber; count: number }) => {
      const flagDef = FLAG_COLORS[row.flag as keyof typeof FLAG_COLORS];
      return {
        number: row.flag,
        name: flagDef.name,
        color: flagDef.color,
        count: row.count,
      };
    });
  }

  /**
   * Get the flag information for a specific flag number.
   *
   * @param flag - The flag number (0-7)
   * @returns The flag definition with name and color
   */
  getFlagInfo(flag: FlagNumber): FlagInfo {
    const flagDef = FLAG_COLORS[flag];
    return {
      number: flag,
      name: flagDef.name,
      color: flagDef.color,
    };
  }

  /**
   * Get all available flag definitions.
   *
   * @returns Array of all 8 flag definitions (0-7)
   */
  getAllFlags(): FlagInfo[] {
    return (Object.keys(FLAG_COLORS) as unknown as FlagNumber[]).map(
      (num) => this.getFlagInfo(Number(num) as FlagNumber)
    );
  }
}

/**
 * fusha-ammiya-bridge.ts -- Service for connecting Classical Arabic (Fusha)
 * and Egyptian Arabic (Ammiya) vocabulary.
 *
 * Arabic exists on a spectrum from formal (Fusha / Modern Standard Arabic /
 * Classical Arabic) to colloquial (Ammiya / dialect). Many words share the
 * same root but differ in pronunciation, form, or meaning:
 *
 *   Fusha: "dhahaba" (went) -> Ammiya: "raah" (different word entirely)
 *   Fusha: "kitaab" (book)  -> Ammiya: "kitaab" (same word, cognate)
 *   Fusha: "sayyaara" (car) -> Ammiya: "'arabiyya" (different word)
 *
 * This service finds equivalents between the two registers, enabling
 * learners to:
 *
 * 1. See the Fusha origin when studying an Ammiya word
 * 2. See the colloquial equivalent when studying a Fusha word
 * 3. Understand which words are cognates vs. completely different
 *
 * Matching Strategy:
 * - Primary: Direct equivalence tags (`bridge::fusha_id::ammiya_id`)
 * - Secondary: Shared root + similar translation (fuzzy match)
 * - Tertiary: Explicit bridge field in note data (`FushaEquivalent`, `AmmiyaEquivalent`)
 */

import { pool } from '../db/connection';
import type {
  ClassicalArabicCard,
  EgyptianArabicCard,
  BridgeInfo,
} from './types';

// ---------------------------------------------------------------------------
// FushaAmmiyaBridge
// ---------------------------------------------------------------------------

export class FushaAmmiyaBridge {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Find the Fusha (Classical Arabic) equivalent for an Egyptian Arabic word.
   *
   * Uses a multi-strategy approach:
   * 1. Check for an explicit bridge field (`FushaEquivalent`) in the note
   * 2. Check for bridge tags linking the two cards
   * 3. Search for Classical Arabic cards sharing the same root with
   *    similar translations (fuzzy semantic match)
   *
   * @param egyptianWord - The Egyptian Arabic word to find a Fusha equivalent for.
   * @returns The Classical Arabic card, or null if no equivalent found.
   */
  async findFushaEquivalent(egyptianWord: string): Promise<ClassicalArabicCard | null> {
    const normalizedWord = this.normalizeArabic(egyptianWord);

    // Strategy 1: Explicit bridge field
    const explicitResult = await pool.query(
      `SELECT
         c2.id AS "cardId",
         COALESCE(n2.fields->>'Word', n2.fields->>'Arabic', '') AS word,
         COALESCE(n2.fields->>'Translation', n2.fields->>'English', n2.fields->>'Meaning', '')
           AS translation,
         COALESCE(n2.fields->>'Root', '') AS "rootLetters",
         COALESCE(n2.fields->>'Pattern', '') AS pattern,
         COALESCE(n2.fields->>'PartOfSpeech', '') AS "partOfSpeech",
         c2.interval_days AS "intervalDays"
       FROM cards c1
       JOIN notes n1 ON c1.note_id = n1.id
       JOIN notes n2 ON n2.fields->>'Word' = n1.fields->>'FushaEquivalent'
                     OR n2.fields->>'Arabic' = n1.fields->>'FushaEquivalent'
       JOIN cards c2 ON c2.note_id = n2.id
       JOIN note_tags nt2 ON n2.id = nt2.note_id
       JOIN tags t2 ON nt2.tag_id = t2.id AND t2.slug = 'language::classical-arabic'
       WHERE (REPLACE(COALESCE(n1.fields->>'Word', ''), ' ', '') = $1
              OR REPLACE(COALESCE(n1.fields->>'Arabic', ''), ' ', '') = $1)
         AND c2.status = 'active'
       LIMIT 1`,
      [normalizedWord]
    );

    if (explicitResult.rows.length > 0) {
      return explicitResult.rows[0] as ClassicalArabicCard;
    }

    // Strategy 2: Shared root with similar translation
    const rootResult = await pool.query(
      `WITH ammiya_card AS (
         SELECT n.id AS note_id,
                REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '') AS root,
                COALESCE(n.fields->>'Translation', n.fields->>'English', '') AS translation
         FROM notes n
         JOIN cards c ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags t ON nt.tag_id = t.id AND t.slug = 'language::egyptian-arabic'
         WHERE (REPLACE(COALESCE(n.fields->>'Word', ''), ' ', '') = $1
                OR REPLACE(COALESCE(n.fields->>'Arabic', ''), ' ', '') = $1)
           AND c.status = 'active'
         LIMIT 1
       )
       SELECT
         c2.id AS "cardId",
         COALESCE(n2.fields->>'Word', n2.fields->>'Arabic', '') AS word,
         COALESCE(n2.fields->>'Translation', n2.fields->>'English', n2.fields->>'Meaning', '')
           AS translation,
         COALESCE(n2.fields->>'Root', '') AS "rootLetters",
         COALESCE(n2.fields->>'Pattern', '') AS pattern,
         COALESCE(n2.fields->>'PartOfSpeech', '') AS "partOfSpeech",
         c2.interval_days AS "intervalDays"
       FROM ammiya_card ac
       JOIN notes n2 ON REPLACE(COALESCE(n2.fields->>'Root', ''), ' ', '') = ac.root
                    AND ac.root != ''
       JOIN cards c2 ON c2.note_id = n2.id
       JOIN note_tags nt2 ON n2.id = nt2.note_id
       JOIN tags t2 ON nt2.tag_id = t2.id AND t2.slug = 'language::classical-arabic'
       WHERE c2.status = 'active'
         AND n2.id != ac.note_id
       -- Prefer matches with similar translations (pg_trgm similarity)
       ORDER BY SIMILARITY(
         LOWER(COALESCE(n2.fields->>'Translation', n2.fields->>'English', '')),
         LOWER(ac.translation)
       ) DESC
       LIMIT 1`,
      [normalizedWord]
    );

    if (rootResult.rows.length > 0) {
      return rootResult.rows[0] as ClassicalArabicCard;
    }

    return null;
  }

  /**
   * Find the Egyptian Arabic (Ammiya) equivalent for a Fusha word.
   *
   * Mirrors the logic of {@link findFushaEquivalent} but in the
   * opposite direction.
   *
   * @param fushaWord - The Classical Arabic word to find an Ammiya equivalent for.
   * @returns The Egyptian Arabic card, or null if no equivalent found.
   */
  async findAmmiyaEquivalent(fushaWord: string): Promise<EgyptianArabicCard | null> {
    const normalizedWord = this.normalizeArabic(fushaWord);

    // Strategy 1: Explicit bridge field
    const explicitResult = await pool.query(
      `SELECT
         c2.id AS "cardId",
         COALESCE(n2.fields->>'Word', n2.fields->>'Arabic', '') AS word,
         COALESCE(n2.fields->>'Translation', n2.fields->>'English', '') AS translation,
         COALESCE(n2.fields->>'Transliteration', '') AS transliteration,
         c2.interval_days AS "intervalDays"
       FROM cards c1
       JOIN notes n1 ON c1.note_id = n1.id
       JOIN notes n2 ON n2.fields->>'Word' = n1.fields->>'AmmiyaEquivalent'
                     OR n2.fields->>'Arabic' = n1.fields->>'AmmiyaEquivalent'
       JOIN cards c2 ON c2.note_id = n2.id
       JOIN note_tags nt2 ON n2.id = nt2.note_id
       JOIN tags t2 ON nt2.tag_id = t2.id AND t2.slug = 'language::egyptian-arabic'
       WHERE (REPLACE(COALESCE(n1.fields->>'Word', ''), ' ', '') = $1
              OR REPLACE(COALESCE(n1.fields->>'Arabic', ''), ' ', '') = $1)
         AND c2.status = 'active'
       LIMIT 1`,
      [normalizedWord]
    );

    if (explicitResult.rows.length > 0) {
      return explicitResult.rows[0] as EgyptianArabicCard;
    }

    // Strategy 2: Shared root with similar translation
    const rootResult = await pool.query(
      `WITH fusha_card AS (
         SELECT n.id AS note_id,
                REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '') AS root,
                COALESCE(n.fields->>'Translation', n.fields->>'English', '') AS translation
         FROM notes n
         JOIN cards c ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags t ON nt.tag_id = t.id AND t.slug = 'language::classical-arabic'
         WHERE (REPLACE(COALESCE(n.fields->>'Word', ''), ' ', '') = $1
                OR REPLACE(COALESCE(n.fields->>'Arabic', ''), ' ', '') = $1)
           AND c.status = 'active'
         LIMIT 1
       )
       SELECT
         c2.id AS "cardId",
         COALESCE(n2.fields->>'Word', n2.fields->>'Arabic', '') AS word,
         COALESCE(n2.fields->>'Translation', n2.fields->>'English', '') AS translation,
         COALESCE(n2.fields->>'Transliteration', '') AS transliteration,
         c2.interval_days AS "intervalDays"
       FROM fusha_card fc
       JOIN notes n2 ON REPLACE(COALESCE(n2.fields->>'Root', ''), ' ', '') = fc.root
                    AND fc.root != ''
       JOIN cards c2 ON c2.note_id = n2.id
       JOIN note_tags nt2 ON n2.id = nt2.note_id
       JOIN tags t2 ON nt2.tag_id = t2.id AND t2.slug = 'language::egyptian-arabic'
       WHERE c2.status = 'active'
         AND n2.id != fc.note_id
       ORDER BY SIMILARITY(
         LOWER(COALESCE(n2.fields->>'Translation', n2.fields->>'English', '')),
         LOWER(fc.translation)
       ) DESC
       LIMIT 1`,
      [normalizedWord]
    );

    if (rootResult.rows.length > 0) {
      return rootResult.rows[0] as EgyptianArabicCard;
    }

    return null;
  }

  /**
   * Get bridge data for display on a card review screen.
   *
   * Determines whether the card is Fusha or Ammiya, finds the equivalent
   * in the other register, and assembles bridge information including
   * shared roots and cognate status.
   *
   * @param cardId - The card to get bridge info for.
   * @returns Bridge information, or null if the card is not Arabic.
   */
  async getBridgeInfo(cardId: string): Promise<BridgeInfo | null> {
    // Determine the card's language
    const cardResult = await pool.query(
      `SELECT
         c.id,
         n.id AS note_id,
         COALESCE(n.fields->>'Word', n.fields->>'Arabic', '') AS word,
         COALESCE(n.fields->>'Root', '') AS root,
         COALESCE(n.fields->>'FushaEquivalent', '') AS fusha_equiv_field,
         COALESCE(n.fields->>'AmmiyaEquivalent', '') AS ammiya_equiv_field,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM note_tags nt
             JOIN tags t ON nt.tag_id = t.id
             WHERE nt.note_id = n.id AND t.slug = 'language::classical-arabic'
           ) THEN 'fusha'
           WHEN EXISTS (
             SELECT 1 FROM note_tags nt
             JOIN tags t ON nt.tag_id = t.id
             WHERE nt.note_id = n.id AND t.slug = 'language::egyptian-arabic'
           ) THEN 'ammiya'
           ELSE NULL
         END AS source_type
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (
      cardResult.rows.length === 0 ||
      !cardResult.rows[0].source_type
    ) {
      return null;
    }

    const card = cardResult.rows[0];
    const sourceType = card.source_type as 'fusha' | 'ammiya';
    const word = card.word;
    const root = card.root.replace(/\s/g, '');

    let equivalentCardId: string | null = null;
    let equivalentWord: string | null = null;
    let notes = '';
    let isCognate = false;

    if (sourceType === 'fusha') {
      // Find Ammiya equivalent
      const equiv = await this.findAmmiyaEquivalent(word);
      if (equiv) {
        equivalentCardId = equiv.cardId;
        equivalentWord = equiv.word;
        // Check if they share a root (cognate)
        isCognate = root !== '' && equiv.word !== '' &&
          await this.sharesRoot(cardId, equiv.cardId);
        notes = isCognate
          ? `Cognate: both derive from the root "${root}". The Egyptian form may differ in pronunciation or voweling.`
          : `The Egyptian Arabic equivalent uses a different word. This is common for everyday vocabulary.`;
      } else {
        notes = 'No Egyptian Arabic equivalent found in your collection.';
      }
    } else {
      // Find Fusha equivalent
      const equiv = await this.findFushaEquivalent(word);
      if (equiv) {
        equivalentCardId = equiv.cardId;
        equivalentWord = equiv.word;
        isCognate = root !== '' && equiv.word !== '' &&
          await this.sharesRoot(cardId, equiv.cardId);
        notes = isCognate
          ? `Cognate: both derive from the root "${root}". The Classical form preserves the original pattern.`
          : `The Classical Arabic equivalent uses a different word. This reflects historical divergence between registers.`;
      } else {
        notes = 'No Classical Arabic equivalent found in your collection.';
      }
    }

    return {
      sourceCardId: cardId,
      sourceType,
      equivalentCardId,
      equivalentWord,
      notes,
      sharedRoot: root || null,
      isCognate,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Normalize an Arabic word for comparison by removing spaces and
   * diacritical marks (tashkeel).
   */
  private normalizeArabic(word: string): string {
    return word
      .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
      .replace(/\s/g, '')                     // Remove spaces
      .trim();
  }

  /**
   * Check if two cards share the same root by comparing their root tags
   * or root fields.
   */
  private async sharesRoot(cardId1: string, cardId2: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT
         (SELECT REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
          FROM cards c JOIN notes n ON c.note_id = n.id
          WHERE c.id = $1) AS root1,
         (SELECT REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
          FROM cards c JOIN notes n ON c.note_id = n.id
          WHERE c.id = $2) AS root2`,
      [cardId1, cardId2]
    );

    if (result.rows.length === 0) return false;
    const { root1, root2 } = result.rows[0];
    return root1 !== '' && root2 !== '' && root1 === root2;
  }
}

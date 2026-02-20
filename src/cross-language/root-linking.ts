/**
 * root-linking.ts -- Arabic root cross-referencing service.
 *
 * Arabic is built on a trilateral root system where most words derive from
 * three-letter roots. For example, the root "k-t-b" (write) produces:
 *   - kitaab (book), kaatib (writer), maktaba (library), maktub (written)
 *
 * This service connects cards across the Quran, Classical Arabic vocabulary,
 * and Egyptian Arabic by their shared roots. This enables:
 *
 * 1. **Root exploration** -- When studying a Quran ayah, see all vocab words
 *    that share the same root, reinforcing morphological understanding.
 *
 * 2. **Contextual learning** -- When reviewing a vocab word, see which Quran
 *    ayahs use the same root, providing sacred textual context.
 *
 * 3. **Register bridging** -- Connect Classical Arabic roots to their
 *    Egyptian Arabic derivatives, showing how the language evolved.
 *
 * Root data is extracted from card fields tagged with `root::*` tags and
 * from note_type fields that store root information (the "Root" field in
 * Arabic-focused note types).
 */

import { pool } from '../db/connection';
import type {
  QuranReference,
  ClassicalArabicCard,
  EgyptianArabicCard,
  RootLink,
  RootIndexEntry,
} from './types';

// ---------------------------------------------------------------------------
// Additional Interfaces for the enriched API
// ---------------------------------------------------------------------------

export interface RootLinkResult {
  rootLetters: string;
  quranReferences: QuranReference[];
  classicalVocab: ClassicalArabicCard[];
  egyptianVocab: EgyptianArabicCard[];
  totalCards: number;
}

export interface VocabCard {
  cardId: string;
  word: string;
  translation: string;
  rootLetters: string;
  intervalDays: number;
  language: string;
}

export interface FormattedRootLink {
  rootLetters: string;
  relatedCards: {
    cardId: string;
    arabicWord: string;
    englishMeaning: string;
    isQuranAyah: boolean;
    surahName?: string;
    ayahNumber?: number;
  }[];
}

// ---------------------------------------------------------------------------
// RootLinkingService
// ---------------------------------------------------------------------------

export class RootLinkingService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Find Quran ayahs that contain a given Arabic root.
   *
   * Searches cards tagged with `quran` that also have a `root::*` tag
   * matching the given root letters. Additionally searches the note
   * fields for root information stored in dedicated "Root" fields.
   *
   * @param rootLetters - The Arabic root letters (e.g., "ك ت ب" or "كتب").
   * @returns Array of Quran references containing the root.
   */
  async findQuranByRoot(rootLetters: string): Promise<QuranReference[]> {
    const normalizedRoot = this.normalizeRoot(rootLetters);

    const result = await pool.query(
      `SELECT DISTINCT
         c.id AS "cardId",
         -- Extract surah/ayah from note fields
         COALESCE((n.fields->>'Surah')::int, 0) AS surah,
         COALESCE((n.fields->>'Ayah')::int, 0) AS ayah,
         COALESCE(n.fields->>'SurahNameAr', '') AS "surahNameAr",
         COALESCE(n.fields->>'SurahNameEn', '') AS "surahNameEn",
         COALESCE(n.fields->>'Text', n.fields->>'Arabic', '') AS text,
         $1 AS "rootLetters",
         COALESCE(n.fields->>'RootWord', '') AS "rootWord"
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       JOIN note_tags nt ON n.id = nt.note_id
       JOIN tags quran_tag ON nt.tag_id = quran_tag.id AND quran_tag.slug = 'quran'
       WHERE c.status = 'active'
         AND (
           -- Match via root tags
           EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags rt ON nt2.tag_id = rt.id
             WHERE nt2.note_id = n.id
               AND rt.slug = $2
           )
           -- Or match via root field content
           OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
              = REPLACE($1, ' ', '')
         )
       ORDER BY surah, ayah`,
      [normalizedRoot, `root::${normalizedRoot.replace(/\s/g, '')}`]
    );

    return result.rows as QuranReference[];
  }

  /**
   * Find Classical Arabic vocabulary words sharing a root with a given
   * root letters string.
   *
   * Searches cards tagged with `language::classical-arabic` that have
   * matching root tags or root field content.
   *
   * @param rootLetters - The Arabic root letters.
   * @returns Array of Classical Arabic cards with the root.
   */
  async findVocabByRoot(rootLetters: string): Promise<ClassicalArabicCard[]> {
    const normalizedRoot = this.normalizeRoot(rootLetters);

    const result = await pool.query(
      `SELECT DISTINCT
         c.id AS "cardId",
         COALESCE(n.fields->>'Word', n.fields->>'Arabic', '') AS word,
         COALESCE(n.fields->>'Translation', n.fields->>'English', n.fields->>'Meaning', '')
           AS translation,
         $1 AS "rootLetters",
         COALESCE(n.fields->>'Pattern', n.fields->>'Wazn', '') AS pattern,
         COALESCE(n.fields->>'PartOfSpeech', n.fields->>'POS', '') AS "partOfSpeech",
         c.interval_days AS "intervalDays"
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       JOIN note_tags nt ON n.id = nt.note_id
       JOIN tags lang_tag ON nt.tag_id = lang_tag.id
         AND lang_tag.slug = 'language::classical-arabic'
       WHERE c.status = 'active'
         AND (
           -- Match via root tags
           EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags rt ON nt2.tag_id = rt.id
             WHERE nt2.note_id = n.id
               AND rt.slug = $2
           )
           -- Or match via root field content
           OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
              = REPLACE($1, ' ', '')
         )
       ORDER BY c.interval_days DESC`,
      [normalizedRoot, `root::${normalizedRoot.replace(/\s/g, '')}`]
    );

    return result.rows as ClassicalArabicCard[];
  }

  /**
   * Get all root connections for a specific card.
   *
   * Looks up the card's root (from tags or fields), then finds all other
   * cards sharing that root across Quran, Classical Arabic, and Egyptian
   * Arabic collections.
   *
   * @param cardId - The card to find connections for.
   * @returns Array of root links to related cards.
   */
  async getRootLinks(cardId: string): Promise<RootLink[]> {
    // First, determine the root letters for this card
    const rootResult = await pool.query(
      `SELECT
         COALESCE(
           -- Try root tag first
           (SELECT SUBSTRING(t.slug FROM 'root::(.+)')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            JOIN cards c ON c.note_id = nt.note_id
            WHERE c.id = $1
              AND t.slug LIKE 'root::%'
            LIMIT 1),
           -- Fall back to Root field
           (SELECT REPLACE(n.fields->>'Root', ' ', '')
            FROM cards c
            JOIN notes n ON c.note_id = n.id
            WHERE c.id = $1
              AND n.fields->>'Root' IS NOT NULL)
         ) AS root_letters`,
      [cardId]
    );

    if (
      rootResult.rows.length === 0 ||
      !rootResult.rows[0].root_letters
    ) {
      return [];
    }

    const rootLetters = rootResult.rows[0].root_letters;
    const rootSlug = `root::${rootLetters.replace(/\s/g, '')}`;

    // Find all related cards (excluding the source card)
    const linksResult = await pool.query(
      `WITH root_cards AS (
         SELECT DISTINCT
           c.id AS card_id,
           -- Determine link type from language/quran tags
           CASE
             WHEN EXISTS (
               SELECT 1 FROM note_tags nt3
               JOIN tags qt ON nt3.tag_id = qt.id
               WHERE nt3.note_id = n.id AND qt.slug = 'quran'
             ) THEN 'quran_ayah'
             WHEN EXISTS (
               SELECT 1 FROM note_tags nt3
               JOIN tags lt ON nt3.tag_id = lt.id
               WHERE nt3.note_id = n.id AND lt.slug = 'language::egyptian-arabic'
             ) THEN 'egyptian_arabic'
             ELSE 'classical_vocab'
           END AS link_type,
           COALESCE(
             n.fields->>'Word',
             n.fields->>'Arabic',
             n.fields->>'Text',
             n.sort_field_value,
             ''
           ) AS front_content
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         WHERE c.id != $1
           AND c.status = 'active'
           AND (
             EXISTS (
               SELECT 1 FROM note_tags nt2
               JOIN tags rt ON nt2.tag_id = rt.id
               WHERE nt2.note_id = n.id AND rt.slug = $2
             )
             OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
                = REPLACE($3, ' ', '')
           )
       )
       SELECT
         card_id AS "linkedCardId",
         link_type AS "linkType",
         front_content AS "linkedCardFront"
       FROM root_cards
       ORDER BY link_type, front_content
       LIMIT 50`,
      [cardId, rootSlug, rootLetters]
    );

    return linksResult.rows.map((row: any) => ({
      rootLetters,
      linkType: row.linkType as RootLink['linkType'],
      linkedCardId: row.linkedCardId,
      linkedCardFront: row.linkedCardFront,
      relationship: this.describeRelationship(row.linkType, rootLetters),
    }));
  }

  /**
   * Build (or rebuild) the root index for a user.
   *
   * Scans all Arabic and Quran cards to extract root information and
   * ensures all roots have corresponding `root::*` tags. This is useful
   * for initial setup or after bulk card imports.
   *
   * The operation is idempotent -- running it multiple times produces
   * the same result.
   *
   * @param userId - The user whose root index to build.
   */
  async buildRootIndex(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find all cards with root information in their fields
      const cardsWithRoots = await client.query(
        `SELECT DISTINCT
           n.id AS note_id,
           REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '') AS root_letters
         FROM notes n
         JOIN cards c ON c.note_id = n.id
         WHERE n.user_id = $1
           AND n.fields->>'Root' IS NOT NULL
           AND n.fields->>'Root' != ''
           AND c.status = 'active'`,
        [userId]
      );

      for (const row of cardsWithRoots.rows) {
        const rootLetters = row.root_letters;
        if (!rootLetters) continue;

        const tagSlug = `root::${rootLetters}`;

        // Ensure the root tag exists
        const tagResult = await client.query(
          `INSERT INTO tags (user_id, name, slug, color, icon, description)
           VALUES ($1, $2, $3, '#8B5CF6', '', $4)
           ON CONFLICT (user_id, slug) DO NOTHING
           RETURNING id`,
          [
            userId,
            `Root: ${rootLetters}`,
            tagSlug,
            `Arabic root: ${rootLetters}`,
          ]
        );

        // Get the tag ID (either just created or already existing)
        let tagId: string;
        if (tagResult.rows.length > 0) {
          tagId = tagResult.rows[0].id;
        } else {
          const existingTag = await client.query(
            `SELECT id FROM tags WHERE user_id = $1 AND slug = $2`,
            [userId, tagSlug]
          );
          tagId = existingTag.rows[0].id;
        }

        // Associate the note with the root tag
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (note_id, tag_id) DO NOTHING`,
          [row.note_id, tagId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get the root index -- a mapping of all roots to their associated cards.
   *
   * Useful for building a root exploration UI or network graph.
   *
   * @param userId - The user whose root index to retrieve.
   * @returns Array of root index entries.
   */
  async getRootIndex(userId: string): Promise<RootIndexEntry[]> {
    const result = await pool.query(
      `WITH root_data AS (
         SELECT
           SUBSTRING(t.slug FROM 'root::(.+)') AS root_letters,
           c.id AS card_id,
           CASE
             WHEN EXISTS (
               SELECT 1 FROM note_tags nt2
               JOIN tags qt ON nt2.tag_id = qt.id
               WHERE nt2.note_id = n.id AND qt.slug = 'quran'
             ) THEN 'quran'
             WHEN EXISTS (
               SELECT 1 FROM note_tags nt2
               JOIN tags lt ON nt2.tag_id = lt.id
               WHERE nt2.note_id = n.id AND lt.slug = 'language::egyptian-arabic'
             ) THEN 'egyptian'
             ELSE 'classical'
           END AS card_category
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags t ON nt.tag_id = t.id
         WHERE n.user_id = $1
           AND t.slug LIKE 'root::%'
           AND c.status = 'active'
       )
       SELECT
         root_letters AS "rootLetters",
         ARRAY_AGG(DISTINCT card_id) FILTER (WHERE card_category = 'quran') AS "quranCardIds",
         ARRAY_AGG(DISTINCT card_id) FILTER (WHERE card_category = 'classical') AS "classicalCardIds",
         ARRAY_AGG(DISTINCT card_id) FILTER (WHERE card_category = 'egyptian') AS "egyptianCardIds",
         COUNT(DISTINCT card_id)::int AS "totalCards"
       FROM root_data
       WHERE root_letters IS NOT NULL
       GROUP BY root_letters
       ORDER BY "totalCards" DESC`,
      [userId]
    );

    return result.rows.map((row: any) => ({
      rootLetters: row.rootLetters,
      quranCardIds: row.quranCardIds ?? [],
      classicalCardIds: row.classicalCardIds ?? [],
      egyptianCardIds: row.egyptianCardIds ?? [],
      totalCards: row.totalCards,
    }));
  }

  // -------------------------------------------------------------------------
  // Extended API (Section 2.6 Cross-Language Features)
  // -------------------------------------------------------------------------

  /**
   * Find all cards sharing an Arabic root across Arabic/Quran collections.
   *
   * Returns a unified result combining Quran ayahs, Classical Arabic vocab,
   * and Egyptian Arabic words that share the given root.
   *
   * @param userId - The user whose cards to search.
   * @param rootLetters - The Arabic root letters (e.g., "ك ت ب").
   * @returns Combined root link result across all Arabic categories.
   */
  async findByRoot(userId: string, rootLetters: string): Promise<RootLinkResult> {
    const normalizedRoot = this.normalizeRoot(rootLetters);
    const rootSlug = `root::${normalizedRoot.replace(/\s/g, '')}`;

    const result = await pool.query(
      `SELECT
         c.id AS card_id,
         n.fields AS fields,
         c.interval_days,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags qt ON nt2.tag_id = qt.id
             WHERE nt2.note_id = n.id AND qt.slug = 'quran'
           ) THEN 'quran'
           WHEN EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags lt ON nt2.tag_id = lt.id
             WHERE nt2.note_id = n.id AND lt.slug = 'language::egyptian-arabic'
           ) THEN 'egyptian'
           ELSE 'classical'
         END AS category
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.status = 'active'
         AND (
           EXISTS (
             SELECT 1 FROM note_tags nt
             JOIN tags rt ON nt.tag_id = rt.id
             WHERE nt.note_id = n.id AND rt.slug = $2
           )
           OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
              = REPLACE($3, ' ', '')
         )
       ORDER BY category, c.interval_days DESC`,
      [userId, rootSlug, normalizedRoot]
    );

    const quranReferences: QuranReference[] = [];
    const classicalVocab: ClassicalArabicCard[] = [];
    const egyptianVocab: EgyptianArabicCard[] = [];

    for (const row of result.rows) {
      const fields = row.fields || {};
      if (row.category === 'quran') {
        quranReferences.push({
          cardId: row.card_id,
          surah: parseInt(fields.Surah || '0', 10),
          ayah: parseInt(fields.Ayah || '0', 10),
          surahNameAr: fields.SurahNameAr || '',
          surahNameEn: fields.SurahNameEn || '',
          text: fields.Text || fields.Arabic || '',
          rootLetters: normalizedRoot,
          rootWord: fields.RootWord || '',
        });
      } else if (row.category === 'egyptian') {
        egyptianVocab.push({
          cardId: row.card_id,
          word: fields.Word || fields.Arabic || '',
          translation: fields.Translation || fields.English || '',
          transliteration: fields.Transliteration || '',
          intervalDays: row.interval_days || 0,
        });
      } else {
        classicalVocab.push({
          cardId: row.card_id,
          word: fields.Word || fields.Arabic || '',
          translation: fields.Translation || fields.English || fields.Meaning || '',
          rootLetters: normalizedRoot,
          pattern: fields.Pattern || fields.Wazn || '',
          partOfSpeech: fields.PartOfSpeech || fields.POS || '',
          intervalDays: row.interval_days || 0,
        });
      }
    }

    return {
      rootLetters: normalizedRoot,
      quranReferences,
      classicalVocab,
      egyptianVocab,
      totalCards: result.rows.length,
    };
  }

  /**
   * Get Quran references for a vocabulary word's root.
   *
   * Convenience method that extracts the root from the card fields
   * and finds all Quran-tagged cards containing that root in their
   * key_vocabulary or root fields.
   *
   * @param userId - The user whose cards to search.
   * @param rootLetters - The Arabic root letters.
   * @returns Array of Quran references for this root.
   */
  async getQuranReferences(userId: string, rootLetters: string): Promise<QuranReference[]> {
    const normalizedRoot = this.normalizeRoot(rootLetters);
    const rootSlug = `root::${normalizedRoot.replace(/\s/g, '')}`;

    const result = await pool.query(
      `SELECT DISTINCT
         c.id AS "cardId",
         COALESCE((n.fields->>'Surah')::int, 0) AS surah,
         COALESCE((n.fields->>'Ayah')::int, 0) AS ayah,
         COALESCE(n.fields->>'SurahNameAr', '') AS "surahNameAr",
         COALESCE(n.fields->>'SurahNameEn', '') AS "surahNameEn",
         COALESCE(n.fields->>'Text', n.fields->>'Arabic', '') AS text,
         $2 AS "rootLetters",
         COALESCE(n.fields->>'RootWord', '') AS "rootWord"
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       JOIN note_tags nt ON n.id = nt.note_id
       JOIN tags quran_tag ON nt.tag_id = quran_tag.id AND quran_tag.slug = 'quran'
       WHERE n.user_id = $1
         AND c.status = 'active'
         AND (
           EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags rt ON nt2.tag_id = rt.id
             WHERE nt2.note_id = n.id AND rt.slug = $3
           )
           OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
              = REPLACE($2, ' ', '')
           OR n.fields->>'key_vocabulary' LIKE '%' || $2 || '%'
         )
       ORDER BY surah, ayah`,
      [userId, normalizedRoot, rootSlug]
    );

    return result.rows as QuranReference[];
  }

  /**
   * Get vocabulary words that appear in a specific Quran ayah.
   *
   * Cross-references the ayah's key_vocabulary field with vocabulary
   * cards to find matching words the user is learning.
   *
   * @param userId - The user whose cards to search.
   * @param surahNumber - The surah number (1-114).
   * @param ayahNumber - The ayah number within the surah.
   * @returns Array of vocabulary cards that match the ayah's key words.
   */
  async getVocabForAyah(
    userId: string,
    surahNumber: number,
    ayahNumber: number
  ): Promise<VocabCard[]> {
    const result = await pool.query(
      `WITH ayah_card AS (
         SELECT n.fields AS fields
         FROM cards c
         JOIN notes n ON c.note_id = n.id
         JOIN note_tags nt ON n.id = nt.note_id
         JOIN tags qt ON nt.tag_id = qt.id AND qt.slug = 'quran'
         WHERE n.user_id = $1
           AND c.status = 'active'
           AND (n.fields->>'Surah')::int = $2
           AND (n.fields->>'Ayah')::int = $3
         LIMIT 1
       ),
       ayah_roots AS (
         SELECT REPLACE(COALESCE(fields->>'Root', ''), ' ', '') AS root
         FROM ayah_card
         WHERE fields->>'Root' IS NOT NULL AND fields->>'Root' != ''
         UNION
         SELECT REPLACE(unnest(string_to_array(
           COALESCE(fields->>'key_vocabulary', ''), ','
         )), ' ', '') AS root
         FROM ayah_card
         WHERE fields->>'key_vocabulary' IS NOT NULL
       )
       SELECT DISTINCT
         c2.id AS "cardId",
         COALESCE(n2.fields->>'Word', n2.fields->>'Arabic', '') AS word,
         COALESCE(n2.fields->>'Translation', n2.fields->>'English', n2.fields->>'Meaning', '')
           AS translation,
         COALESCE(n2.fields->>'Root', '') AS "rootLetters",
         c2.interval_days AS "intervalDays",
         COALESCE(
           (SELECT SUBSTRING(t.slug FROM 'language::(.+)')
            FROM note_tags nt2
            JOIN tags t ON nt2.tag_id = t.id
            WHERE nt2.note_id = n2.id AND t.slug LIKE 'language::%'
            LIMIT 1),
           'classical-arabic'
         ) AS language
       FROM ayah_roots ar
       JOIN notes n2 ON REPLACE(COALESCE(n2.fields->>'Root', ''), ' ', '') = ar.root
       JOIN cards c2 ON c2.note_id = n2.id
       WHERE n2.user_id = $1
         AND c2.status = 'active'
         AND ar.root != ''
         AND NOT EXISTS (
           SELECT 1 FROM note_tags nt3
           JOIN tags qt2 ON nt3.tag_id = qt2.id AND qt2.slug = 'quran'
           WHERE nt3.note_id = n2.id
         )
       ORDER BY c2.interval_days DESC`,
      [userId, surahNumber, ayahNumber]
    );

    return result.rows as VocabCard[];
  }

  /**
   * Get root links to display on a card during review.
   *
   * Given a card, find its root, then find other cards with the same root.
   * Returns formatted links suitable for display in the review UI.
   *
   * Example output:
   *   "This root (k-t-b) also appears in: kitaab (book), maktaba (library),
   *    Surah Al-Baqarah 2:2"
   *
   * @param cardId - The card to get root links for.
   * @returns Formatted root links for display.
   */
  async getCardRootLinks(cardId: string): Promise<FormattedRootLink[]> {
    // First, determine the root letters for this card
    const rootResult = await pool.query(
      `SELECT
         COALESCE(
           (SELECT SUBSTRING(t.slug FROM 'root::(.+)')
            FROM note_tags nt
            JOIN tags t ON nt.tag_id = t.id
            JOIN cards c ON c.note_id = nt.note_id
            WHERE c.id = $1
              AND t.slug LIKE 'root::%'
            LIMIT 1),
           (SELECT REPLACE(n.fields->>'Root', ' ', '')
            FROM cards c
            JOIN notes n ON c.note_id = n.id
            WHERE c.id = $1
              AND n.fields->>'Root' IS NOT NULL)
         ) AS root_letters`,
      [cardId]
    );

    if (rootResult.rows.length === 0 || !rootResult.rows[0].root_letters) {
      return [];
    }

    const rootLetters = rootResult.rows[0].root_letters;
    const rootSlug = `root::${rootLetters.replace(/\s/g, '')}`;

    // Find all related cards (excluding the source card)
    const linksResult = await pool.query(
      `SELECT DISTINCT
         c.id AS card_id,
         COALESCE(n.fields->>'Word', n.fields->>'Arabic', '') AS arabic_word,
         COALESCE(n.fields->>'Translation', n.fields->>'English', n.fields->>'Meaning', '') AS english_meaning,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM note_tags nt3
             JOIN tags qt ON nt3.tag_id = qt.id
             WHERE nt3.note_id = n.id AND qt.slug = 'quran'
           ) THEN true
           ELSE false
         END AS is_quran_ayah,
         COALESCE(n.fields->>'SurahNameEn', '') AS surah_name,
         COALESCE((n.fields->>'Ayah')::int, 0) AS ayah_number
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE c.id != $1
         AND c.status = 'active'
         AND (
           EXISTS (
             SELECT 1 FROM note_tags nt2
             JOIN tags rt ON nt2.tag_id = rt.id
             WHERE nt2.note_id = n.id AND rt.slug = $2
           )
           OR REPLACE(COALESCE(n.fields->>'Root', ''), ' ', '')
              = REPLACE($3, ' ', '')
         )
       ORDER BY is_quran_ayah, arabic_word
       LIMIT 20`,
      [cardId, rootSlug, rootLetters]
    );

    if (linksResult.rows.length === 0) {
      return [];
    }

    return [{
      rootLetters,
      relatedCards: linksResult.rows.map((row: any) => ({
        cardId: row.card_id,
        arabicWord: row.arabic_word,
        englishMeaning: row.english_meaning,
        isQuranAyah: row.is_quran_ayah,
        surahName: row.is_quran_ayah ? row.surah_name : undefined,
        ayahNumber: row.is_quran_ayah && row.ayah_number ? row.ayah_number : undefined,
      })),
    }];
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Normalize root letters by removing spaces, diacritics, and
   * standardizing Unicode representation.
   *
   * Handles common input variations:
   * - "ك ت ب" -> "كتب"
   * - "k-t-b" -> preserved as-is (Latin transliteration)
   * - Diacritical marks (tashkeel) are stripped
   */
  private normalizeRoot(rootLetters: string): string {
    // Remove Arabic diacritical marks (tashkeel)
    const stripped = rootLetters.replace(/[\u064B-\u065F\u0670]/g, '');
    // Remove spaces for comparison, but preserve for display
    return stripped.trim();
  }

  /**
   * Generate a human-readable description of the relationship between
   * a card and a root-linked card.
   */
  private describeRelationship(
    linkType: string,
    rootLetters: string
  ): string {
    switch (linkType) {
      case 'quran_ayah':
        return `Quran ayah containing root "${rootLetters}"`;
      case 'classical_vocab':
        return `Classical Arabic word from root "${rootLetters}"`;
      case 'egyptian_arabic':
        return `Egyptian Arabic derivative of root "${rootLetters}"`;
      default:
        return `Related word sharing root "${rootLetters}"`;
    }
  }
}

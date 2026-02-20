/**
 * endowed-progress.ts -- Endowed Progress Effect implementation.
 *
 * When a user starts learning a new language, we pre-load 5 introductory
 * cards marked as "learned" during onboarding. This makes the progress bar
 * start at ~3-5% instead of 0%, leveraging the psychological principle that
 * people are more motivated to complete a task that appears already started.
 *
 * Research Reference:
 *   Nunes & Dreze (2006) - "The Endowed Progress Effect: How Artificial
 *   Advancement Increases Effort" - Journal of Consumer Research
 *
 * The effect is subtle but powerful: a user who sees "5 of 150 cards learned"
 * feels they have momentum, whereas "0 of 150" feels like a cold start.
 */

import { query, withTransaction } from '../db/connection';
import type { PoolClient } from 'pg';

// ---------------------------------------------------------------------------
// Seed Card Definitions
// ---------------------------------------------------------------------------

/**
 * Introductory cards seeded during onboarding, organized by language.
 *
 * These are deliberately chosen to be the simplest, most common words
 * that a complete beginner would recognize or learn within seconds.
 * The goal is NOT to teach -- it is to create a feeling of progress.
 */
const SEED_CARDS: Record<string, SeedCard[]> = {
  arabic: [
    { front: 'مرحبا', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'شكرا', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'نعم', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'لا', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'من فضلك', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  'classical-arabic': [
    { front: 'بسم الله', back: 'In the name of God', tags: ['quran', 'beginner'] },
    { front: 'الحمد لله', back: 'Praise be to God', tags: ['quran', 'beginner'] },
    { front: 'إن شاء الله', back: 'God willing', tags: ['expressions', 'beginner'] },
    { front: 'السلام عليكم', back: 'Peace be upon you', tags: ['greetings', 'beginner'] },
    { front: 'رحمة', back: 'Mercy', tags: ['quran', 'beginner'] },
  ],
  'egyptian-arabic': [
    { front: 'أهلا', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'شكرا', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'أيوه', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'لأ', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'إزيك', back: 'How are you?', tags: ['greetings', 'beginner'] },
  ],
  spanish: [
    { front: 'Hola', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'Gracias', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'Si', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'No', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'Por favor', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  french: [
    { front: 'Bonjour', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'Merci', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'Oui', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'Non', back: 'No', tags: ['basics', 'beginner'] },
    { front: "S'il vous plait", back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  german: [
    { front: 'Hallo', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'Danke', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'Ja', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'Nein', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'Bitte', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  japanese: [
    { front: 'こんにちは', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'ありがとう', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'はい', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'いいえ', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'お願いします', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  korean: [
    { front: '안녕하세요', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: '감사합니다', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: '네', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: '아니요', back: 'No', tags: ['basics', 'beginner'] },
    { front: '제발', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  turkish: [
    { front: 'Merhaba', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'Tesekkurler', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'Evet', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'Hayir', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'Lutfen', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
  urdu: [
    { front: 'السلام علیکم', back: 'Hello', tags: ['greetings', 'beginner'] },
    { front: 'شکریہ', back: 'Thank you', tags: ['greetings', 'beginner'] },
    { front: 'ہاں', back: 'Yes', tags: ['basics', 'beginner'] },
    { front: 'نہیں', back: 'No', tags: ['basics', 'beginner'] },
    { front: 'براہ کرم', back: 'Please', tags: ['greetings', 'beginner'] },
  ],
};

/** Number of cards seeded per language. */
export const ENDOWED_CARD_COUNT = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedCard {
  front: string;
  back: string;
  tags: string[];
}

export interface EndowedProgressResult {
  /** Number of seed cards created. */
  cardsCreated: number;

  /** IDs of the created cards. */
  cardIds: string[];

  /** The language that was seeded. */
  language: string;

  /** Whether the language was already seeded (no-op). */
  alreadySeeded: boolean;
}

// ---------------------------------------------------------------------------
// EndowedProgressService
// ---------------------------------------------------------------------------

export class EndowedProgressService {
  /**
   * Create the initial 5 "pre-learned" cards during onboarding.
   *
   * These cards are inserted directly into the review state with a 1-day
   * interval and 1 rep, so they appear as "learned" in progress tracking.
   * This gives the progress bar an immediate ~3-5% head start.
   *
   * The operation is idempotent: if seed cards already exist for this
   * user + language combination, it returns early without creating duplicates.
   *
   * @param userId - The user being onboarded.
   * @param language - The language being started (e.g., 'arabic', 'spanish').
   * @param deckId - The deck to add the seed cards to.
   * @returns Result describing what was created.
   */
  async seedInitialProgress(
    userId: string,
    language: string,
    deckId: string
  ): Promise<EndowedProgressResult> {
    // Check if already seeded
    const existing = await query(
      `SELECT COUNT(*)::int AS count
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.deck_id = $2
         AND c.custom_data->>'endowed_seed' = 'true'`,
      [userId, deckId]
    );

    if (existing.rows[0].count >= ENDOWED_CARD_COUNT) {
      return {
        cardsCreated: 0,
        cardIds: [],
        language,
        alreadySeeded: true,
      };
    }

    const seeds = SEED_CARDS[language] || SEED_CARDS['arabic'];
    const cardIds: string[] = [];

    await withTransaction(async (client: PoolClient) => {
      for (const seed of seeds) {
        // Create the note
        const noteResult = await client.query(
          `INSERT INTO notes (user_id, note_type_id, fields, created_at, updated_at)
           VALUES ($1, (SELECT id FROM note_types WHERE user_id = $1 LIMIT 1),
                   $2, NOW(), NOW())
           RETURNING id`,
          [
            userId,
            JSON.stringify({ front: seed.front, back: seed.back }),
          ]
        );

        const noteId = noteResult.rows[0].id;

        // Create the card in 'review' state with 1-day interval
        // This is the key to the endowed progress effect: the card
        // appears already learned, giving the user a head start.
        const cardResult = await client.query(
          `INSERT INTO cards (
             note_id, deck_id, template_ordinal, status,
             card_type, due, interval_days, stability,
             difficulty, reps, lapses, flag,
             custom_data, created_at, updated_at
           )
           VALUES (
             $1, $2, 0, 'active',
             'review', NOW() + INTERVAL '1 day', 1, 1.0,
             5.0, 1, 0, 0,
             '{"endowed_seed": "true"}'::jsonb, NOW(), NOW()
           )
           RETURNING id`,
          [noteId, deckId]
        );

        cardIds.push(cardResult.rows[0].id);

        // Create a synthetic review log entry so stats are consistent
        await client.query(
          `INSERT INTO review_logs (
             card_id, rating, interval_before, interval_after,
             stability_before, stability_after,
             difficulty_before, difficulty_after,
             time_spent_ms, review_type, reviewed_at
           )
           VALUES ($1, 'good', 0, 1, 0, 1.0, 5.0, 5.0, 3000, 'learning', NOW())`,
          [cardResult.rows[0].id]
        );

        // Tag the note with the language and seed tags
        for (const tagName of [...seed.tags, `language::${language}`, 'endowed-seed']) {
          await client.query(
            `INSERT INTO note_tags (note_id, tag_id)
             SELECT $1, t.id FROM tags t WHERE t.slug = $2
             ON CONFLICT DO NOTHING`,
            [noteId, tagName]
          );
        }
      }
    });

    return {
      cardsCreated: cardIds.length,
      cardIds,
      language,
      alreadySeeded: false,
    };
  }

  /**
   * Calculate progress percentage including endowed cards.
   *
   * The endowed cards are counted as part of the "reviewed" total,
   * which means the progress bar starts at a non-zero value even
   * before the user has studied any cards themselves.
   *
   * @param totalCards - Total number of cards in the deck/collection.
   * @param reviewedCards - Number of cards the user has actually reviewed.
   * @param endowedCards - Number of endowed (pre-seeded) cards.
   * @returns Progress percentage between 0 and 100.
   */
  calculateProgress(
    totalCards: number,
    reviewedCards: number,
    endowedCards: number
  ): number {
    if (totalCards <= 0) return 0;
    const effectiveReviewed = reviewedCards + endowedCards;
    return Math.min(100, (effectiveReviewed / totalCards) * 100);
  }

  /**
   * Get the number of endowed seed cards for a user in a specific deck.
   *
   * @param userId - The user to check.
   * @param deckId - The deck to check.
   * @returns The count of endowed seed cards.
   */
  async getEndowedCardCount(userId: string, deckId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM cards c
       JOIN notes n ON c.note_id = n.id
       WHERE n.user_id = $1
         AND c.deck_id = $2
         AND c.custom_data->>'endowed_seed' = 'true'`,
      [userId, deckId]
    );

    return result.rows[0].count;
  }

  /**
   * Get available seed card languages.
   *
   * @returns Array of language identifiers that have seed cards defined.
   */
  getAvailableLanguages(): string[] {
    return Object.keys(SEED_CARDS);
  }

  /**
   * Get the seed cards for a language without inserting them.
   * Useful for preview during onboarding.
   *
   * @param language - The language to preview.
   * @returns Array of seed card definitions, or null if language not supported.
   */
  getSeedCardsPreview(language: string): SeedCard[] | null {
    return SEED_CARDS[language] ?? null;
  }
}

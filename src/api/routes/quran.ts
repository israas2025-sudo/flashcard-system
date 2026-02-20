// @ts-nocheck
/**
 * Quran Routes
 *
 * Quran-specific study features including surah navigation,
 * ayah memorization tracking, and tajweed rule highlighting.
 *
 * Routes:
 * - GET  /api/quran/surah/:number              — Get surah info and memorization progress
 * - GET  /api/quran/surah/:number/ayahs        — Get ayahs for a surah
 * - POST /api/quran/memorization/mark           — Mark ayah as memorized
 * - GET  /api/quran/memorization/progress       — Get overall memorization progress
 * - GET  /api/quran/tajweed/rules               — Get all tajweed rules with explanations
 * - POST /api/quran/tajweed/highlight           — Highlight tajweed rules in Arabic text
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../db/connection';
import { ApiError, requireFields } from '../server';
import { authMiddleware, optionalAuthMiddleware } from '../../auth/middleware';
import { AuthService } from '../../auth/auth-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TajweedRule {
  id: string;
  name: string;
  nameArabic: string;
  category: string;
  description: string;
  example: string;
  colorCode: string;
}

interface TajweedHighlight {
  startIndex: number;
  endIndex: number;
  ruleId: string;
  ruleName: string;
  colorCode: string;
}

// ---------------------------------------------------------------------------
// Tajweed Rules Catalog
// ---------------------------------------------------------------------------

const TAJWEED_RULES: TajweedRule[] = [
  {
    id: 'ikhfa',
    name: 'Ikhfa',
    nameArabic: '\u0625\u062E\u0641\u0627\u0621',
    category: 'noon_sakinah',
    description:
      'Hiding of noon sakinah or tanween when followed by one of 15 letters. ' +
      'The sound is between izhar and idgham, with ghunnah (nasalization).',
    example: '\u0645\u0650\u0646 \u062A\u064E\u062D\u0652\u062A\u0650\u0647\u064E\u0627',
    colorCode: '#4CAF50',
  },
  {
    id: 'idgham_with_ghunnah',
    name: 'Idgham with Ghunnah',
    nameArabic: '\u0625\u062F\u063A\u0627\u0645 \u0628\u063A\u0646\u0629',
    category: 'noon_sakinah',
    description:
      'Merging of noon sakinah or tanween into the following letter (ya, nun, mim, waw) ' +
      'with nasal sound (ghunnah) lasting two counts.',
    example: '\u0645\u0650\u0646 \u064A\u064E\u0639\u0652\u0645\u064E\u0644\u0652',
    colorCode: '#2196F3',
  },
  {
    id: 'idgham_without_ghunnah',
    name: 'Idgham without Ghunnah',
    nameArabic: '\u0625\u062F\u063A\u0627\u0645 \u0628\u0644\u0627 \u063A\u0646\u0629',
    category: 'noon_sakinah',
    description:
      'Merging of noon sakinah or tanween into lam or ra without nasal sound.',
    example: '\u0645\u0650\u0646 \u0631\u064E\u0628\u0651\u0650\u0647\u0650\u0645\u0652',
    colorCode: '#9C27B0',
  },
  {
    id: 'iqlab',
    name: 'Iqlab',
    nameArabic: '\u0625\u0642\u0644\u0627\u0628',
    category: 'noon_sakinah',
    description:
      'Conversion of noon sakinah or tanween into a meem sound when followed by ba, ' +
      'with ghunnah lasting two counts.',
    example: '\u0645\u0650\u0646 \u0628\u064E\u0639\u0652\u062F\u0650',
    colorCode: '#FF9800',
  },
  {
    id: 'izhar',
    name: 'Izhar',
    nameArabic: '\u0625\u0638\u0647\u0627\u0631',
    category: 'noon_sakinah',
    description:
      'Clear pronunciation of noon sakinah or tanween when followed by a throat letter ' +
      '(hamza, ha, ain, ghayn, kha, ha).',
    example: '\u0645\u0650\u0646\u0652 \u0639\u064E\u0645\u064E\u0644\u064E',
    colorCode: '#F44336',
  },
  {
    id: 'ghunnah',
    name: 'Ghunnah',
    nameArabic: '\u063A\u0646\u0629',
    category: 'general',
    description:
      'Nasalization sound that accompanies noon and meem mushaddad (doubled). ' +
      'Held for approximately two counts.',
    example: '\u0625\u0650\u0646\u0651\u064E',
    colorCode: '#E91E63',
  },
  {
    id: 'madd_tabii',
    name: 'Madd Tabii (Natural Lengthening)',
    nameArabic: '\u0645\u062F \u0637\u0628\u064A\u0639\u064A',
    category: 'madd',
    description:
      'Natural lengthening of a vowel letter (alif, waw, ya) for exactly two counts. ' +
      'Occurs when there is no hamza or sukoon after the madd letter.',
    example: '\u0642\u064E\u0627\u0644\u064E',
    colorCode: '#00BCD4',
  },
  {
    id: 'madd_muttasil',
    name: 'Madd Muttasil (Connected Lengthening)',
    nameArabic: '\u0645\u062F \u0645\u062A\u0635\u0644',
    category: 'madd',
    description:
      'Obligatory lengthening (4-5 counts) when a madd letter is followed by a hamza ' +
      'in the same word.',
    example: '\u062C\u064E\u0627\u0621\u064E',
    colorCode: '#795548',
  },
  {
    id: 'madd_munfasil',
    name: 'Madd Munfasil (Separated Lengthening)',
    nameArabic: '\u0645\u062F \u0645\u0646\u0641\u0635\u0644',
    category: 'madd',
    description:
      'Permissible lengthening (2-5 counts) when a madd letter at the end of a word ' +
      'is followed by a hamza at the beginning of the next word.',
    example: '\u0628\u0650\u0645\u064E\u0627 \u0623\u064F\u0646\u0632\u0650\u0644\u064E',
    colorCode: '#607D8B',
  },
  {
    id: 'qalqalah',
    name: 'Qalqalah',
    nameArabic: '\u0642\u0644\u0642\u0644\u0629',
    category: 'general',
    description:
      'Echoing or bouncing sound produced when one of five letters (qaf, ta, ba, jim, dal) ' +
      'has sukoon. Minor qalqalah in the middle of a word, major at the end.',
    example: '\u0623\u064E\u062D\u064E\u062F\u0652',
    colorCode: '#FF5722',
  },
];

// ---------------------------------------------------------------------------
// Router Factory
// ---------------------------------------------------------------------------

/**
 * Create the Quran routes router.
 *
 * @param authService - The AuthService instance for token verification.
 * @returns Express Router with all Quran endpoints mounted.
 */
export function createQuranRouter(authService: AuthService): Router {
  const router = Router();
  const requireAuth = authMiddleware(authService);
  const optionalAuth = optionalAuthMiddleware(authService);

  // -------------------------------------------------------------------------
  // GET /surah/:number — Get surah info and memorization progress
  // -------------------------------------------------------------------------

  router.get(
    '/surah/:number',
    optionalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const surahNumber = parseInt(req.params.number, 10);

        if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
          throw ApiError.badRequest('Surah number must be between 1 and 114');
        }

        // Fetch surah info
        const surahResult = await query(
          `SELECT * FROM quran_surahs WHERE number = $1`,
          [surahNumber]
        );

        if (surahResult.rowCount === 0) {
          throw ApiError.notFound('Surah');
        }

        const surah = surahResult.rows[0];

        // If authenticated, fetch memorization progress for this surah
        let memorizationProgress = null;
        if (req.userId) {
          const progressResult = await query(
            `SELECT
               COUNT(*) as total_ayahs,
               COUNT(qm.id) as memorized_ayahs,
               CASE WHEN COUNT(*) > 0
                 THEN ROUND(COUNT(qm.id)::numeric / COUNT(*)::numeric * 100, 1)
                 ELSE 0
               END as percentage
             FROM quran_ayahs qa
             LEFT JOIN quran_memorization qm
               ON qa.id = qm.ayah_id AND qm.user_id = $1
             WHERE qa.surah_number = $2`,
            [req.userId, surahNumber]
          );

          const lastReviewResult = await query(
            `SELECT MAX(qm.last_reviewed_at) as last_reviewed
             FROM quran_memorization qm
             INNER JOIN quran_ayahs qa ON qm.ayah_id = qa.id
             WHERE qm.user_id = $1 AND qa.surah_number = $2`,
            [req.userId, surahNumber]
          );

          memorizationProgress = {
            ...progressResult.rows[0],
            lastReviewed: lastReviewResult.rows[0]?.last_reviewed || null,
          };
        }

        res.json({
          data: {
            surah,
            memorizationProgress,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /surah/:number/ayahs — Get ayahs for a surah
  // -------------------------------------------------------------------------

  router.get(
    '/surah/:number/ayahs',
    optionalAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const surahNumber = parseInt(req.params.number, 10);

        if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
          throw ApiError.badRequest('Surah number must be between 1 and 114');
        }

        // Verify surah exists
        const surahCheck = await query(
          'SELECT number FROM quran_surahs WHERE number = $1',
          [surahNumber]
        );
        if (surahCheck.rowCount === 0) {
          throw ApiError.notFound('Surah');
        }

        // Fetch ayahs with optional memorization status
        let ayahsQuery: string;
        let ayahsParams: unknown[];

        if (req.userId) {
          ayahsQuery = `
            SELECT qa.*,
                   CASE WHEN qm.id IS NOT NULL THEN true ELSE false END as is_memorized,
                   qm.confidence_level,
                   qm.last_reviewed_at,
                   qm.review_count
            FROM quran_ayahs qa
            LEFT JOIN quran_memorization qm
              ON qa.id = qm.ayah_id AND qm.user_id = $1
            WHERE qa.surah_number = $2
            ORDER BY qa.ayah_number ASC`;
          ayahsParams = [req.userId, surahNumber];
        } else {
          ayahsQuery = `
            SELECT qa.*,
                   false as is_memorized,
                   null as confidence_level,
                   null as last_reviewed_at,
                   0 as review_count
            FROM quran_ayahs qa
            WHERE qa.surah_number = $1
            ORDER BY qa.ayah_number ASC`;
          ayahsParams = [surahNumber];
        }

        const result = await query(ayahsQuery, ayahsParams);

        res.json({
          data: {
            surahNumber,
            ayahs: result.rows,
            totalAyahs: result.rows.length,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /memorization/mark — Mark ayah as memorized
  // -------------------------------------------------------------------------

  router.post(
    '/memorization/mark',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { ayahId, confidenceLevel } = req.body;

        requireFields(req.body, ['ayahId']);

        if (typeof ayahId !== 'string' && typeof ayahId !== 'number') {
          throw ApiError.badRequest('ayahId must be a string or number');
        }

        // Validate confidence level if provided (1-5 scale)
        const confidence = confidenceLevel !== undefined ? confidenceLevel : 3;
        if (typeof confidence !== 'number' || confidence < 1 || confidence > 5 || !Number.isInteger(confidence)) {
          throw ApiError.badRequest('confidenceLevel must be an integer between 1 and 5');
        }

        // Verify the ayah exists
        const ayahResult = await query(
          'SELECT * FROM quran_ayahs WHERE id = $1',
          [ayahId]
        );
        if (ayahResult.rowCount === 0) {
          throw ApiError.notFound('Ayah');
        }

        // Upsert memorization record
        const memResult = await query(
          `INSERT INTO quran_memorization
            (user_id, ayah_id, confidence_level, last_reviewed_at, review_count, created_at)
           VALUES ($1, $2, $3, NOW(), 1, NOW())
           ON CONFLICT (user_id, ayah_id)
           DO UPDATE SET
             confidence_level = $3,
             last_reviewed_at = NOW(),
             review_count = quran_memorization.review_count + 1
           RETURNING *`,
          [req.userId, ayahId, confidence]
        );

        const ayah = ayahResult.rows[0];

        res.json({
          data: {
            memorization: memResult.rows[0],
            ayah: {
              surahNumber: ayah.surah_number,
              ayahNumber: ayah.ayah_number,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /memorization/progress — Get overall memorization progress
  // -------------------------------------------------------------------------

  router.get(
    '/memorization/progress',
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Overall stats
        const overallResult = await query(
          `SELECT
             (SELECT COUNT(*) FROM quran_ayahs) as total_ayahs,
             COUNT(qm.id) as memorized_ayahs,
             CASE WHEN (SELECT COUNT(*) FROM quran_ayahs) > 0
               THEN ROUND(
                 COUNT(qm.id)::numeric /
                 (SELECT COUNT(*) FROM quran_ayahs)::numeric * 100, 2
               )
               ELSE 0
             END as overall_percentage,
             ROUND(AVG(qm.confidence_level)::numeric, 2) as avg_confidence,
             SUM(qm.review_count) as total_reviews
           FROM quran_memorization qm
           WHERE qm.user_id = $1`,
          [req.userId]
        );

        // Per-surah breakdown
        const surahProgressResult = await query(
          `SELECT
             qs.number as surah_number,
             qs.name,
             qs.name_arabic,
             (SELECT COUNT(*) FROM quran_ayahs WHERE surah_number = qs.number) as total_ayahs,
             COUNT(qm.id) as memorized_ayahs,
             CASE WHEN (SELECT COUNT(*) FROM quran_ayahs WHERE surah_number = qs.number) > 0
               THEN ROUND(
                 COUNT(qm.id)::numeric /
                 (SELECT COUNT(*) FROM quran_ayahs WHERE surah_number = qs.number)::numeric * 100, 1
               )
               ELSE 0
             END as percentage,
             ROUND(AVG(qm.confidence_level)::numeric, 2) as avg_confidence,
             MAX(qm.last_reviewed_at) as last_reviewed
           FROM quran_surahs qs
           LEFT JOIN quran_ayahs qa ON qa.surah_number = qs.number
           LEFT JOIN quran_memorization qm ON qm.ayah_id = qa.id AND qm.user_id = $1
           GROUP BY qs.number, qs.name, qs.name_arabic
           ORDER BY qs.number ASC`,
          [req.userId]
        );

        // Juz breakdown (30 parts)
        const juzProgressResult = await query(
          `SELECT
             qa.juz_number,
             COUNT(DISTINCT qa.id) as total_ayahs,
             COUNT(DISTINCT qm.ayah_id) as memorized_ayahs,
             CASE WHEN COUNT(DISTINCT qa.id) > 0
               THEN ROUND(
                 COUNT(DISTINCT qm.ayah_id)::numeric /
                 COUNT(DISTINCT qa.id)::numeric * 100, 1
               )
               ELSE 0
             END as percentage
           FROM quran_ayahs qa
           LEFT JOIN quran_memorization qm ON qm.ayah_id = qa.id AND qm.user_id = $1
           GROUP BY qa.juz_number
           ORDER BY qa.juz_number ASC`,
          [req.userId]
        );

        // Recent activity (last 30 days)
        const recentResult = await query(
          `SELECT
             DATE(qm.last_reviewed_at) as date,
             COUNT(*) as ayahs_reviewed
           FROM quran_memorization qm
           WHERE qm.user_id = $1
             AND qm.last_reviewed_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(qm.last_reviewed_at)
           ORDER BY date DESC`,
          [req.userId]
        );

        res.json({
          data: {
            overall: overallResult.rows[0],
            surahs: surahProgressResult.rows,
            juz: juzProgressResult.rows,
            recentActivity: recentResult.rows,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // GET /tajweed/rules — Get all tajweed rules with explanations
  // -------------------------------------------------------------------------

  router.get(
    '/tajweed/rules',
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        // Group rules by category
        const rulesByCategory: Record<string, TajweedRule[]> = {};
        for (const rule of TAJWEED_RULES) {
          if (!rulesByCategory[rule.category]) {
            rulesByCategory[rule.category] = [];
          }
          rulesByCategory[rule.category].push(rule);
        }

        res.json({
          data: {
            rules: TAJWEED_RULES,
            categories: rulesByCategory,
            totalRules: TAJWEED_RULES.length,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------------------------------------------------------
  // POST /tajweed/highlight — Highlight tajweed rules in Arabic text
  // -------------------------------------------------------------------------

  router.post(
    '/tajweed/highlight',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { text } = req.body;

        requireFields(req.body, ['text']);

        if (typeof text !== 'string' || text.trim().length === 0) {
          throw ApiError.badRequest('text must be a non-empty string');
        }

        if (text.length > 10000) {
          throw ApiError.badRequest('text must not exceed 10000 characters');
        }

        // Detect tajweed rules in the text
        const highlights = detectTajweedRules(text);

        res.json({
          data: {
            text,
            highlights,
            rulesFound: [...new Set(highlights.map((h) => h.ruleId))],
            totalHighlights: highlights.length,
          },
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Arabic Unicode character ranges and specific letters used in tajweed detection
const NOON_SAKINAH = '\u0646\u0652'; // nun + sukun
const TANWEEN_FATHATAN = '\u064B';
const TANWEEN_DAMMATAN = '\u064C';
const TANWEEN_KASRATAN = '\u064D';
const BA = '\u0628';
const SHADDA = '\u0651';
const NOON = '\u0646';
const MEEM = '\u0645';

// Letters for various tajweed rules
const IKHFA_LETTERS = '\u062A\u062B\u062C\u062F\u0630\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0641\u0642\u0643';
const IZHAR_LETTERS = '\u0621\u0647\u0639\u062D\u063A\u062E'; // hamza, ha, ain, ha, ghayn, kha
const IDGHAM_GHUNNAH_LETTERS = '\u064A\u0646\u0645\u0648'; // ya, nun, mim, waw
const IDGHAM_NO_GHUNNAH_LETTERS = '\u0644\u0631'; // lam, ra
const QALQALAH_LETTERS = '\u0642\u0637\u0628\u062C\u062F'; // qaf, ta, ba, jim, dal

/**
 * Detect tajweed rules in Arabic text and return highlight positions.
 *
 * This is a simplified rule detection engine. A production implementation
 * would use a full Arabic morphological analyzer and tajweed grammar.
 */
function detectTajweedRules(text: string): TajweedHighlight[] {
  const highlights: TajweedHighlight[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : '';
    const nextNextChar = i + 2 < text.length ? text[i + 2] : '';

    // Detect Noon Mushaddad / Meem Mushaddad (Ghunnah)
    if ((char === NOON || char === MEEM) && nextChar === SHADDA) {
      const rule = TAJWEED_RULES.find((r) => r.id === 'ghunnah')!;
      highlights.push({
        startIndex: i,
        endIndex: i + 2,
        ruleId: rule.id,
        ruleName: rule.name,
        colorCode: rule.colorCode,
      });
      continue;
    }

    // Detect Iqlab (noon sakinah/tanween before ba)
    if (
      (char === NOON && nextChar === '\u0652' && getNextLetter(text, i + 2) === BA) ||
      ([TANWEEN_FATHATAN, TANWEEN_DAMMATAN, TANWEEN_KASRATAN].includes(char) && getNextLetter(text, i + 1) === BA)
    ) {
      const rule = TAJWEED_RULES.find((r) => r.id === 'iqlab')!;
      highlights.push({
        startIndex: i,
        endIndex: Math.min(i + 3, text.length),
        ruleId: rule.id,
        ruleName: rule.name,
        colorCode: rule.colorCode,
      });
      continue;
    }

    // Detect Qalqalah
    if (QALQALAH_LETTERS.includes(char) && nextChar === '\u0652') {
      const rule = TAJWEED_RULES.find((r) => r.id === 'qalqalah')!;
      highlights.push({
        startIndex: i,
        endIndex: i + 2,
        ruleId: rule.id,
        ruleName: rule.name,
        colorCode: rule.colorCode,
      });
      continue;
    }
  }

  return highlights;
}

/**
 * Get the next Arabic letter in the text, skipping diacritics and whitespace.
 */
function getNextLetter(text: string, startIndex: number): string {
  const diacritics = '\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655';
  for (let i = startIndex; i < text.length; i++) {
    const c = text[i];
    if (c !== ' ' && !diacritics.includes(c)) {
      return c;
    }
  }
  return '';
}

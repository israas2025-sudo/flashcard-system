/**
 * bonus-cards.ts -- Variable Ratio Reinforcement via Bonus Cards.
 *
 * Approximately 7% of session cards are randomly designated as "bonus" cards
 * worth 3x XP. This leverages the variable ratio reinforcement schedule --
 * the same mechanism that makes slot machines compelling. The unpredictability
 * of when a bonus card will appear keeps users engaged through the entire
 * session rather than dropping off after the first few cards.
 *
 * Research Reference:
 *   Ferster & Skinner (1957) - "Schedules of Reinforcement"
 *   Variable ratio schedules produce the highest, most consistent response
 *   rates and are most resistant to extinction.
 *
 * Implementation Details:
 *   - Bonus selection happens once at session start (not per-card) to avoid
 *     mid-session manipulation or predictability.
 *   - Sessions with >= 10 cards are guaranteed at least 1 bonus card. This
 *     prevents the edge case where random selection yields 0 bonuses in a
 *     meaningful session, which would feel unrewarding.
 *   - Session state is held in memory (Map<string, Set<string>>) because
 *     bonus status is ephemeral and session-scoped -- it does not need to
 *     survive server restarts.
 */

import { pool } from '../db/connection';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default probability that any given card in a session becomes a bonus card. */
const DEFAULT_BONUS_RATIO = 0.07;

/** XP multiplier applied to bonus cards. */
const BONUS_XP_MULTIPLIER = 3;

/** Minimum session size that guarantees at least one bonus card. */
const MIN_SESSION_SIZE_FOR_GUARANTEED_BONUS = 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardReference {
  id: string;
  [key: string]: unknown;
}

export interface BonusSelectionResult {
  /** IDs of the cards selected as bonus cards for this session. */
  bonusCardIds: string[];

  /** Total number of cards in the session. */
  totalCards: number;

  /** The ratio that was used for selection. */
  appliedRatio: number;

  /** Whether the guaranteed-minimum rule was triggered. */
  guaranteeApplied: boolean;
}

export interface CardXPResult {
  /** The base XP before any multiplier. */
  baseXP: number;

  /** The multiplier applied (1 for normal, 3 for bonus). */
  multiplier: number;

  /** The final XP after applying the multiplier. */
  totalXP: number;

  /** Whether this card was a bonus card. */
  isBonus: boolean;
}

// ---------------------------------------------------------------------------
// BonusCardService
// ---------------------------------------------------------------------------

export class BonusCardService {
  /**
   * In-memory tracking of which cards are bonus cards within each session.
   *
   * Key: sessionId
   * Value: Set of cardIds that are designated as bonus cards
   *
   * This is intentionally ephemeral. If the server restarts mid-session,
   * users simply lose their bonus designations for that session -- a minor
   * UX hiccup that is far preferable to the complexity of persisting
   * short-lived session state in the database.
   */
  private sessionBonusCards: Map<string, Set<string>> = new Map();

  /**
   * Select which cards in a session will be bonus cards.
   *
   * This should be called once at the beginning of a study session. Each
   * card has an independent `ratio` probability of being selected. If the
   * session has >= 10 cards and random selection produced 0 bonuses, one
   * card is force-selected to maintain the reward expectation.
   *
   * Calling this again for the same sessionId will overwrite previous
   * selections (useful for session restarts).
   *
   * @param sessionId - Unique identifier for the current study session.
   * @param cards - Array of card objects; each must have an `id` property.
   * @param ratio - Probability per card (0-1). Defaults to 0.07 (~7%).
   * @returns Details about which cards were selected as bonus.
   */
  selectBonusCards(
    sessionId: string,
    cards: CardReference[],
    ratio: number = DEFAULT_BONUS_RATIO
  ): BonusSelectionResult {
    if (ratio < 0 || ratio > 1) {
      throw new RangeError(
        `Bonus ratio must be between 0 and 1, received ${ratio}`
      );
    }

    const bonusIds = new Set<string>();
    let guaranteeApplied = false;

    // Each card has an independent probability of being a bonus card.
    // This is the "variable ratio" -- the user cannot predict which card
    // will be the bonus, maintaining engagement throughout the session.
    for (const card of cards) {
      if (Math.random() < ratio) {
        bonusIds.add(card.id);
      }
    }

    // Guarantee at least 1 bonus card in sessions with enough cards.
    // Without this, ~48% of 10-card sessions would have 0 bonuses
    // (0.93^10 ≈ 0.484), which feels unrewarding.
    if (
      bonusIds.size === 0 &&
      cards.length >= MIN_SESSION_SIZE_FOR_GUARANTEED_BONUS
    ) {
      const randomIndex = Math.floor(Math.random() * cards.length);
      bonusIds.add(cards[randomIndex].id);
      guaranteeApplied = true;
    }

    this.sessionBonusCards.set(sessionId, bonusIds);

    return {
      bonusCardIds: Array.from(bonusIds),
      totalCards: cards.length,
      appliedRatio: ratio,
      guaranteeApplied,
    };
  }

  /**
   * Check whether a card is a bonus card in ANY active session.
   *
   * This is a convenience method for cases where the session context is
   * unknown (e.g., rendering card lists). For session-specific checks,
   * prefer `isBonusCardInSession`.
   *
   * @param cardId - The card to check.
   * @returns true if the card is a bonus card in any tracked session.
   */
  isBonusCard(cardId: string): boolean {
    for (const bonusSet of this.sessionBonusCards.values()) {
      if (bonusSet.has(cardId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check whether a specific card is a bonus card within a specific session.
   *
   * @param sessionId - The session to check.
   * @param cardId - The card to check.
   * @returns true if the card is a bonus card in the given session.
   */
  isBonusCardInSession(sessionId: string, cardId: string): boolean {
    const bonusSet = this.sessionBonusCards.get(sessionId);
    if (!bonusSet) {
      return false;
    }
    return bonusSet.has(cardId);
  }

  /**
   * Get the XP multiplier applied to bonus cards.
   *
   * @returns The multiplier value (currently 3).
   */
  getBonusXPMultiplier(): number {
    return BONUS_XP_MULTIPLIER;
  }

  /**
   * Get the count of bonus cards in a session.
   *
   * @param sessionId - The session to count.
   * @returns Number of bonus cards, or 0 if the session is not tracked.
   */
  getSessionBonusCount(sessionId: string): number {
    const bonusSet = this.sessionBonusCards.get(sessionId);
    return bonusSet ? bonusSet.size : 0;
  }

  /**
   * Calculate the XP earned for reviewing a specific card.
   *
   * Bonus cards earn 3x the base XP. Normal cards earn 1x. This also
   * records the XP event in the database for stats tracking.
   *
   * @param sessionId - The active session.
   * @param cardId - The card that was reviewed.
   * @param baseXP - The base XP for this review (e.g., 10 for correct).
   * @returns The calculated XP details.
   */
  async calculateCardXP(
    sessionId: string,
    cardId: string,
    baseXP: number
  ): Promise<CardXPResult> {
    const isBonus = this.isBonusCardInSession(sessionId, cardId);
    const multiplier = isBonus ? BONUS_XP_MULTIPLIER : 1;
    const totalXP = baseXP * multiplier;

    // Persist the bonus XP event so it can be reflected in stats and
    // the user can see a history of their bonus card rewards.
    if (isBonus) {
      try {
        await pool.query(
          `INSERT INTO xp_events (session_id, card_id, base_xp, multiplier, total_xp, event_type, created_at)
           VALUES ($1, $2, $3, $4, $5, 'bonus_card', NOW())`,
          [sessionId, cardId, baseXP, multiplier, totalXP]
        );
      } catch (err) {
        // XP tracking is non-critical; log and continue rather than
        // failing the review flow.
        console.error(
          '[BonusCardService] Failed to record bonus XP event:',
          err instanceof Error ? err.message : err
        );
      }
    }

    return {
      baseXP,
      multiplier,
      totalXP,
      isBonus,
    };
  }

  /**
   * Clear session tracking data when a session ends.
   *
   * This frees memory for completed sessions. If not called, sessions
   * will accumulate in memory until the process restarts. Callers should
   * invoke this in their session cleanup/finalization logic.
   *
   * @param sessionId - The session to clear.
   */
  clearSession(sessionId: string): void {
    this.sessionBonusCards.delete(sessionId);
  }

  /**
   * Get all active session IDs that have bonus card tracking.
   * Primarily useful for diagnostics and monitoring.
   *
   * @returns Array of session IDs with active bonus tracking.
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.sessionBonusCards.keys());
  }

  /**
   * Get the bonus card IDs for a specific session.
   *
   * @param sessionId - The session to query.
   * @returns Array of bonus card IDs, or empty array if session not found.
   */
  getSessionBonusCardIds(sessionId: string): string[] {
    const bonusSet = this.sessionBonusCards.get(sessionId);
    return bonusSet ? Array.from(bonusSet) : [];
  }
}

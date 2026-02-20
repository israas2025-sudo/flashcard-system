/**
 * display-order.ts -- Full control over card presentation order.
 *
 * Implements the Display Order configuration from Anki Section 1.10, which
 * gives users fine-grained control over how cards are gathered, sorted, and
 * interleaved during a study session.
 *
 * The ordering pipeline has several stages:
 *   1. **New card gather order:** determines *which* new cards are picked
 *      from the deck (e.g., by deck order, random, position).
 *   2. **New card sort order:** determines how the gathered new cards are
 *      sorted before being shown.
 *   3. **New/review interleaving:** determines whether new cards are mixed
 *      with reviews, shown first, or shown last.
 *   4. **Interday learning order:** determines where interday learning
 *      cards appear relative to reviews.
 *   5. **Review sort order:** determines how review cards are ordered
 *      (by due date, interval, ease, overdueness, etc.).
 */

import {
  CardState,
  CardSchedulingData,
} from './types';

import { retrievability } from './fsrs';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * A card prepared for study session ordering.
 *
 * This is a lightweight representation used by the display order service.
 * It includes the fields needed for all sorting algorithms.
 */
export interface StudyCard {
  /** Unique card ID. */
  id: string;

  /** Deck ID the card belongs to. */
  deckId: string;

  /** Deck name (for deck-based ordering). */
  deckName?: string;

  /** Note ID (for note-based random ordering). */
  noteId?: string;

  /** Card template index (for template ordering, e.g. 0 = front, 1 = back). */
  templateIndex: number;

  /** Position within the deck (for positional ordering). */
  position: number;

  /** Current scheduling data. */
  scheduling: CardSchedulingData;

  /** The card's due date. */
  due: Date;

  /** Whether this is an interday learning card (learning card due tomorrow+). */
  isInterdayLearning: boolean;
}

/**
 * Full display order configuration.
 *
 * Each setting controls a different aspect of how cards are presented.
 */
export interface DisplayOrderConfig {
  /**
   * How to gather (select) new cards from the deck.
   * - 'deck': in deck insertion order
   * - 'deck_random': gather from deck in random order
   * - 'ascending_position': lowest position first
   * - 'descending_position': highest position first
   * - 'random_notes': random note order (sibling cards stay together)
   * - 'random_cards': completely random individual cards
   */
  newCardGatherOrder:
    | 'deck'
    | 'deck_random'
    | 'deck_random'
    | 'ascending_position'
    | 'descending_position'
    | 'random_notes'
    | 'random_cards';

  /**
   * How to sort the gathered new cards before display.
   * - 'card_template': sort by card template index
   * - 'random': random order
   * - 'ascending_position': by position ascending
   * - 'descending_position': by position descending
   * - 'gather_order': keep the gather order
   * - 'reverse_gather': reverse the gather order
   */
  newCardSortOrder:
    | 'card_template'
    | 'random'
    | 'ascending_position'
    | 'descending_position'
    | 'gather_order'
    | 'reverse_gather';

  /**
   * How to interleave new cards with review cards.
   * - 'mix_with_reviews': intersperse new cards among reviews
   * - 'show_before_reviews': show all new cards first
   * - 'show_after_reviews': show all review cards first
   */
  newReviewMix:
    | 'mix_with_reviews'
    | 'show_before_reviews'
    | 'show_after_reviews';

  /**
   * Where interday learning cards appear relative to reviews.
   * - 'mix_with_reviews': intersperse with reviews
   * - 'show_before_reviews': show before reviews
   * - 'show_after_reviews': show after reviews
   */
  interdayLearningOrder:
    | 'mix_with_reviews'
    | 'show_before_reviews'
    | 'show_after_reviews';

  /**
   * How to sort review cards.
   * - 'due_date': oldest due first (classic Anki order)
   * - 'due_date_random': due date with random shuffle among same-day
   * - 'deck': by deck order
   * - 'ascending_intervals': shortest interval first
   * - 'descending_intervals': longest interval first
   * - 'ascending_ease': hardest cards first (lowest ease/difficulty)
   * - 'descending_ease': easiest cards first
   * - 'relative_overdueness': most overdue relative to interval first
   * - 'retrievability': lowest retrievability first (most likely to forget)
   */
  reviewSortOrder:
    | 'due_date'
    | 'due_date_random'
    | 'deck'
    | 'ascending_intervals'
    | 'descending_intervals'
    | 'ascending_ease'
    | 'descending_ease'
    | 'relative_overdueness'
    | 'retrievability';
}

/**
 * Persistence interface for display order configuration.
 */
export interface DisplayOrderStore {
  /** Get display order config for a deck. Returns null if not set. */
  getDisplayOrderConfig(deckId: string): Promise<DisplayOrderConfig | null>;

  /** Save display order config for a deck. */
  setDisplayOrderConfig(deckId: string, config: DisplayOrderConfig): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default display order matching standard Anki behavior. */
export const DEFAULT_DISPLAY_ORDER_CONFIG: DisplayOrderConfig = {
  newCardGatherOrder: 'deck',
  newCardSortOrder: 'gather_order',
  newReviewMix: 'mix_with_reviews',
  interdayLearningOrder: 'mix_with_reviews',
  reviewSortOrder: 'due_date',
};

// ---------------------------------------------------------------------------
// DisplayOrderService
// ---------------------------------------------------------------------------

/**
 * Service for configuring and applying card display ordering.
 *
 * The main method is {@link applyOrder}, which takes an unsorted array
 * of study cards and returns them in the correct presentation order
 * based on the display order configuration.
 */
export class DisplayOrderService {
  private readonly store: DisplayOrderStore | null;

  /** In-memory fallback. */
  private inMemoryConfigs: Map<string, DisplayOrderConfig> = new Map();

  constructor(store?: DisplayOrderStore) {
    this.store = store ?? null;
  }

  /**
   * Get the display order configuration for a deck.
   *
   * @param deckId - Deck identifier.
   * @returns The deck's display order config, or defaults.
   */
  async getConfig(deckId: string): Promise<DisplayOrderConfig> {
    if (this.store) {
      const config = await this.store.getDisplayOrderConfig(deckId);
      return config ?? DEFAULT_DISPLAY_ORDER_CONFIG;
    }
    return this.inMemoryConfigs.get(deckId) ?? DEFAULT_DISPLAY_ORDER_CONFIG;
  }

  /**
   * Set the display order configuration for a deck.
   *
   * @param deckId - Deck identifier.
   * @param config - The configuration to save.
   */
  async setConfig(deckId: string, config: DisplayOrderConfig): Promise<void> {
    if (this.store) {
      await this.store.setDisplayOrderConfig(deckId, config);
    } else {
      this.inMemoryConfigs.set(deckId, config);
    }
  }

  /**
   * Apply the display order configuration to sort cards for study.
   *
   * This is the core method that implements the full ordering pipeline:
   *   1. Separate cards into new, learning, interday-learning, and review groups.
   *   2. Sort new cards according to gather order and sort order.
   *   3. Sort review cards according to review sort order.
   *   4. Interleave the groups according to the interleaving settings.
   *
   * @param cards  - The unsorted array of study cards.
   * @param config - Display order configuration.
   * @returns The sorted array of study cards.
   */
  applyOrder(cards: StudyCard[], config: DisplayOrderConfig): StudyCard[] {
    // Step 1: Partition cards into groups
    const newCards: StudyCard[] = [];
    const learningCards: StudyCard[] = []; // Intraday learning/relearning
    const interdayLearningCards: StudyCard[] = [];
    const reviewCards: StudyCard[] = [];

    for (const card of cards) {
      if (card.scheduling.state === CardState.New) {
        newCards.push(card);
      } else if (
        card.scheduling.state === CardState.Learning ||
        card.scheduling.state === CardState.Relearning
      ) {
        if (card.isInterdayLearning) {
          interdayLearningCards.push(card);
        } else {
          learningCards.push(card);
        }
      } else {
        reviewCards.push(card);
      }
    }

    // Step 2: Sort new cards
    const sortedNewCards = this.sortNewCards(newCards, config);

    // Step 3: Sort review cards
    const sortedReviewCards = this.sortReviewCards(reviewCards, config);

    // Step 4: Sort learning cards by due date (most urgent first)
    const sortedLearningCards = learningCards.sort(
      (a, b) => a.due.getTime() - b.due.getTime(),
    );

    // Step 5: Sort interday learning cards by due date
    const sortedInterdayLearning = interdayLearningCards.sort(
      (a, b) => a.due.getTime() - b.due.getTime(),
    );

    // Step 6: Interleave groups according to configuration
    const result = this.interleaveGroups(
      sortedLearningCards,
      sortedInterdayLearning,
      sortedNewCards,
      sortedReviewCards,
      config,
    );

    return result;
  }

  // -----------------------------------------------------------------------
  // New card sorting
  // -----------------------------------------------------------------------

  /**
   * Sort new cards according to gather order and sort order.
   *
   * First applies the gather order (which simulates how cards would be
   * selected from the deck), then applies the sort order on top.
   */
  private sortNewCards(
    cards: StudyCard[],
    config: DisplayOrderConfig,
  ): StudyCard[] {
    if (cards.length === 0) return cards;

    // Step 1: Apply gather order
    let gathered = this.applyNewCardGatherOrder(cards.slice(), config.newCardGatherOrder);

    // Step 2: Apply sort order on top
    gathered = this.applyNewCardSortOrder(gathered, config.newCardSortOrder);

    return gathered;
  }

  /**
   * Apply the new card gather order.
   */
  private applyNewCardGatherOrder(
    cards: StudyCard[],
    order: DisplayOrderConfig['newCardGatherOrder'],
  ): StudyCard[] {
    switch (order) {
      case 'deck':
        // Sort by deck name then by position within deck
        return cards.sort((a, b) => {
          const deckCmp = (a.deckName ?? a.deckId).localeCompare(b.deckName ?? b.deckId);
          if (deckCmp !== 0) return deckCmp;
          return a.position - b.position;
        });

      case 'deck_random':
        // Sort by deck, then randomize within each deck
        return this.sortByDeckThenShuffle(cards);

      case 'ascending_position':
        return cards.sort((a, b) => a.position - b.position);

      case 'descending_position':
        return cards.sort((a, b) => b.position - a.position);

      case 'random_notes':
        return this.shuffleByNotes(cards);

      case 'random_cards':
        return this.shuffle(cards);

      default:
        return cards;
    }
  }

  /**
   * Apply the new card sort order on top of the gathered order.
   */
  private applyNewCardSortOrder(
    cards: StudyCard[],
    order: DisplayOrderConfig['newCardSortOrder'],
  ): StudyCard[] {
    switch (order) {
      case 'card_template':
        // Sort by template index (keeps sibling note types together)
        return cards.sort((a, b) => a.templateIndex - b.templateIndex);

      case 'random':
        return this.shuffle(cards);

      case 'ascending_position':
        return cards.sort((a, b) => a.position - b.position);

      case 'descending_position':
        return cards.sort((a, b) => b.position - a.position);

      case 'gather_order':
        // Keep as-is (already in gather order)
        return cards;

      case 'reverse_gather':
        return cards.reverse();

      default:
        return cards;
    }
  }

  // -----------------------------------------------------------------------
  // Review card sorting
  // -----------------------------------------------------------------------

  /**
   * Sort review cards according to the configured review sort order.
   */
  private sortReviewCards(
    cards: StudyCard[],
    config: DisplayOrderConfig,
  ): StudyCard[] {
    if (cards.length === 0) return cards;

    const now = new Date();

    switch (config.reviewSortOrder) {
      case 'due_date':
        return cards.sort((a, b) => a.due.getTime() - b.due.getTime());

      case 'due_date_random':
        return this.sortByDueDateWithSameDayShuffle(cards);

      case 'deck':
        return cards.sort((a, b) => {
          const deckCmp = (a.deckName ?? a.deckId).localeCompare(b.deckName ?? b.deckId);
          if (deckCmp !== 0) return deckCmp;
          return a.due.getTime() - b.due.getTime();
        });

      case 'ascending_intervals':
        return cards.sort(
          (a, b) => a.scheduling.scheduledDays - b.scheduling.scheduledDays,
        );

      case 'descending_intervals':
        return cards.sort(
          (a, b) => b.scheduling.scheduledDays - a.scheduling.scheduledDays,
        );

      case 'ascending_ease':
        // Lower difficulty = easier in FSRS (but ascending_ease = hardest first)
        // FSRS difficulty is 1-10 where higher = harder
        // "ascending ease" means lowest ease first = highest difficulty first
        return cards.sort(
          (a, b) => b.scheduling.difficulty - a.scheduling.difficulty,
        );

      case 'descending_ease':
        // Highest ease first = lowest difficulty first
        return cards.sort(
          (a, b) => a.scheduling.difficulty - b.scheduling.difficulty,
        );

      case 'relative_overdueness':
        return this.sortByRelativeOverdueness(cards, now);

      case 'retrievability':
        return this.sortByRetrievability(cards, now);

      default:
        return cards;
    }
  }

  /**
   * Sort by due date, but shuffle cards that share the same due date.
   *
   * This prevents predictable ordering among cards due on the same day.
   */
  private sortByDueDateWithSameDayShuffle(cards: StudyCard[]): StudyCard[] {
    // Group by due date (day-level granularity)
    const groups = new Map<string, StudyCard[]>();

    for (const card of cards) {
      const dayKey = card.due.toISOString().slice(0, 10);
      const group = groups.get(dayKey);
      if (group) {
        group.push(card);
      } else {
        groups.set(dayKey, [card]);
      }
    }

    // Sort groups by date, shuffle within each group
    const sortedKeys = Array.from(groups.keys()).sort();
    const result: StudyCard[] = [];

    for (const key of sortedKeys) {
      const group = groups.get(key)!;
      result.push(...this.shuffle(group));
    }

    return result;
  }

  /**
   * Sort by relative overdueness.
   *
   * Relative overdueness = (elapsed days since due) / scheduled interval.
   * A card that was due 10 days ago with a 20-day interval (50% overdue) is
   * considered less urgent than a card due 10 days ago with a 10-day
   * interval (100% overdue).
   *
   * Cards that are most overdue relative to their interval are shown first.
   */
  private sortByRelativeOverdueness(cards: StudyCard[], now: Date): StudyCard[] {
    return cards.sort((a, b) => {
      const overdueA = this.computeRelativeOverdueness(a, now);
      const overdueB = this.computeRelativeOverdueness(b, now);
      // Higher overdueness = more urgent = shown first
      return overdueB - overdueA;
    });
  }

  /**
   * Compute the relative overdueness of a card.
   *
   * Formula: overdue_days / scheduled_interval
   * where overdue_days = max(0, now - due_date) in days.
   */
  private computeRelativeOverdueness(card: StudyCard, now: Date): number {
    const overdueDays = Math.max(
      0,
      (now.getTime() - card.due.getTime()) / (1000 * 60 * 60 * 24),
    );
    const interval = Math.max(1, card.scheduling.scheduledDays);
    return overdueDays / interval;
  }

  /**
   * Sort by FSRS retrievability (lowest first = most likely to forget).
   *
   * Uses the FSRS power forgetting curve to compute each card's current
   * probability of recall. Cards with the lowest retrievability are shown
   * first, as they are most in need of review.
   */
  private sortByRetrievability(cards: StudyCard[], now: Date): StudyCard[] {
    return cards.sort((a, b) => {
      const rA = this.computeRetrievability(a, now);
      const rB = this.computeRetrievability(b, now);
      // Lower retrievability = more urgent = shown first
      return rA - rB;
    });
  }

  /**
   * Compute the current retrievability of a card using the FSRS formula.
   */
  private computeRetrievability(card: StudyCard, now: Date): number {
    const lastReview = card.scheduling.lastReview;
    if (!lastReview || card.scheduling.stability <= 0) return 0;

    const elapsedDays =
      (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

    return retrievability(elapsedDays, card.scheduling.stability);
  }

  // -----------------------------------------------------------------------
  // Interleaving
  // -----------------------------------------------------------------------

  /**
   * Interleave the sorted card groups according to the configuration.
   *
   * The interleaving order is:
   *   1. Intraday learning/relearning cards (always first -- they need
   *      immediate attention).
   *   2. The remaining groups interleaved according to settings.
   *
   * @param learningCards         - Intraday learning cards (always first).
   * @param interdayLearningCards - Interday learning cards.
   * @param newCards              - New cards.
   * @param reviewCards           - Review cards.
   * @param config                - Display order configuration.
   */
  private interleaveGroups(
    learningCards: StudyCard[],
    interdayLearningCards: StudyCard[],
    newCards: StudyCard[],
    reviewCards: StudyCard[],
    config: DisplayOrderConfig,
  ): StudyCard[] {
    // Intraday learning always comes first
    const result: StudyCard[] = [...learningCards];

    // Build the review group: reviews + potentially interday learning
    let reviewGroup: StudyCard[];
    switch (config.interdayLearningOrder) {
      case 'show_before_reviews':
        reviewGroup = [...interdayLearningCards, ...reviewCards];
        break;
      case 'show_after_reviews':
        reviewGroup = [...reviewCards, ...interdayLearningCards];
        break;
      case 'mix_with_reviews':
      default:
        reviewGroup = this.interleaveTwoGroups(interdayLearningCards, reviewCards);
        break;
    }

    // Now interleave new cards with the review group
    switch (config.newReviewMix) {
      case 'show_before_reviews':
        result.push(...newCards, ...reviewGroup);
        break;
      case 'show_after_reviews':
        result.push(...reviewGroup, ...newCards);
        break;
      case 'mix_with_reviews':
      default:
        result.push(...this.interleaveTwoGroups(newCards, reviewGroup));
        break;
    }

    return result;
  }

  /**
   * Interleave two arrays evenly.
   *
   * If array A has 3 items and B has 9, the result will be something like:
   *   B B B A B B B A B B B A
   *
   * This distributes the smaller group evenly across the larger group.
   */
  private interleaveTwoGroups(smaller: StudyCard[], larger: StudyCard[]): StudyCard[] {
    // Ensure 'smaller' is actually the smaller array
    if (smaller.length > larger.length) {
      [smaller, larger] = [larger, smaller];
    }

    if (smaller.length === 0) return larger.slice();
    if (larger.length === 0) return smaller.slice();

    const result: StudyCard[] = [];
    const total = smaller.length + larger.length;

    // Compute the spacing: insert one smaller item every N items
    const spacing = total / smaller.length;

    let smallIdx = 0;
    let largeIdx = 0;
    let nextSmallAt = spacing / 2; // Start halfway through the first interval

    for (let i = 0; i < total; i++) {
      if (smallIdx < smaller.length && i >= nextSmallAt) {
        result.push(smaller[smallIdx]);
        smallIdx++;
        nextSmallAt += spacing;
      } else if (largeIdx < larger.length) {
        result.push(larger[largeIdx]);
        largeIdx++;
      } else if (smallIdx < smaller.length) {
        result.push(smaller[smallIdx]);
        smallIdx++;
      }
    }

    return result;
  }

  // -----------------------------------------------------------------------
  // Shuffle utilities
  // -----------------------------------------------------------------------

  /**
   * Fisher-Yates shuffle (in-place, returns the same array).
   */
  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Sort by deck, then shuffle within each deck group.
   */
  private sortByDeckThenShuffle(cards: StudyCard[]): StudyCard[] {
    // Group by deck
    const byDeck = new Map<string, StudyCard[]>();
    for (const card of cards) {
      const key = card.deckName ?? card.deckId;
      const group = byDeck.get(key);
      if (group) {
        group.push(card);
      } else {
        byDeck.set(key, [card]);
      }
    }

    // Sort deck keys, shuffle within each
    const sortedKeys = Array.from(byDeck.keys()).sort();
    const result: StudyCard[] = [];
    for (const key of sortedKeys) {
      result.push(...this.shuffle(byDeck.get(key)!));
    }
    return result;
  }

  /**
   * Shuffle by notes: randomize the note order, but keep sibling cards
   * (cards from the same note) together and in template order.
   */
  private shuffleByNotes(cards: StudyCard[]): StudyCard[] {
    // Group by noteId
    const byNote = new Map<string, StudyCard[]>();
    const noNote: StudyCard[] = [];

    for (const card of cards) {
      if (card.noteId) {
        const group = byNote.get(card.noteId);
        if (group) {
          group.push(card);
        } else {
          byNote.set(card.noteId, [card]);
        }
      } else {
        noNote.push(card);
      }
    }

    // Sort siblings within each note by template index
    for (const group of byNote.values()) {
      group.sort((a, b) => a.templateIndex - b.templateIndex);
    }

    // Shuffle the note groups
    const noteGroups = Array.from(byNote.values());
    this.shuffle(noteGroups);

    // Also shuffle ungrouped cards
    this.shuffle(noNote);

    // Flatten: interleave ungrouped cards among the note groups
    const result: StudyCard[] = [];
    for (const group of noteGroups) {
      result.push(...group);
    }
    result.push(...noNote);

    return result;
  }
}

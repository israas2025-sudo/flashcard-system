/**
 * Decks Module
 *
 * Provides hierarchical deck management, deck preset configuration,
 * filtered/custom study decks, and card operations for the multilingual
 * flashcard application.
 *
 * Per Section 1.4 of the spec:
 *  - Decks are groups of cards. Each card belongs to exactly one deck.
 *  - Decks support hierarchy via parent_id.
 *  - Studying a parent deck includes all subdeck cards.
 *  - Each deck can have its own options preset.
 *  - Features: per-deck new/review limits, deck options presets (shareable),
 *    filtered/custom study decks (temporary from search queries),
 *    deck override on card templates.
 */

export { DeckService } from './deck-service';

export type {
  Deck,
  DeckTreeNode,
  DeckTreeRow,
  DeckPreset,
  DeckStudyInfo,
  DeckCard,
  FilteredDeckOrder,
} from './types';

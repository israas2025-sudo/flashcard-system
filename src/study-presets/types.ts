/**
 * Study Presets Type Definitions
 *
 * Defines the core data structures for the "Smart Study" feature (Section 2.4).
 * Study presets allow users to save tag + deck + card-state combinations as
 * named presets for one-click focused study sessions.
 */

import type { ScheduledCard } from '../scheduling/types';

// ---------------------------------------------------------------------------
// Card State Filter
// ---------------------------------------------------------------------------

/**
 * Filter configuration for card scheduling states.
 * Controls which card lifecycle states are included in a study preset.
 */
export interface StateFilter {
  /** Include cards that have never been reviewed. */
  includeNew: boolean;

  /** Include cards in the review state (graduated, due for spaced review). */
  includeReview: boolean;

  /** Include cards currently in learning or relearning steps. */
  includeLearning: boolean;
}

// ---------------------------------------------------------------------------
// Study Preset
// ---------------------------------------------------------------------------

/**
 * A saved study session filter combining tag, deck, and card-state criteria.
 *
 * Users create presets to quickly launch focused study sessions targeting
 * specific subsets of their card collection (e.g. "Daily Quran Review",
 * "Arabic Grammar Drill", "Exam Prep Spanish B2").
 */
export interface StudyPreset {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ID of the user who owns this preset. */
  userId: string;

  /** Human-readable display name (e.g. "Daily Quran Review"). */
  name: string;

  /** Array of tag IDs to include in the filter. Empty array means no tag filter. */
  tagFilter: string[];

  /** Array of deck IDs to include in the filter. Empty array means no deck filter. */
  deckFilter: string[];

  /** Card state filter controlling which lifecycle states are included. */
  stateFilter: StateFilter;

  /** Whether the preset is pinned to the dashboard for quick access. */
  isPinned: boolean;

  /**
   * Computed field: number of active cards currently matching the preset filters.
   * Not stored in the database; calculated on read.
   */
  cardCount?: number;

  /** Whether this is a built-in system preset (not user-created). */
  isBuiltIn?: boolean;

  /** Timestamp when the preset was created. */
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Create / Update Inputs
// ---------------------------------------------------------------------------

/**
 * Input for creating a new study preset.
 */
export interface CreatePresetInput {
  /** Display name for the preset. */
  name: string;

  /** Array of tag IDs to filter by. */
  tagFilter: string[];

  /** Array of deck IDs to filter by. */
  deckFilter: string[];

  /** Optional card state filter. Defaults to all states included. */
  stateFilter?: Partial<StateFilter>;

  /** Whether to pin the preset to the dashboard. Defaults to false. */
  isPinned?: boolean;
}

/**
 * Input for updating an existing study preset.
 * All fields are optional; only provided fields are modified.
 */
export interface UpdatePresetInput {
  /** Updated display name. */
  name?: string;

  /** Updated tag filter IDs. */
  tagFilter?: string[];

  /** Updated deck filter IDs. */
  deckFilter?: string[];

  /** Updated card state filter. */
  stateFilter?: Partial<StateFilter>;

  /** Updated pin status. */
  isPinned?: boolean;
}

// ---------------------------------------------------------------------------
// Preset Study Session
// ---------------------------------------------------------------------------

/**
 * A study session created from a preset.
 *
 * Contains the matching due cards ready for review, along with metadata
 * about the total number of matching cards.
 */
export interface PresetStudySession {
  /** The preset ID that initiated this session. */
  presetId: string;

  /** Array of due cards matching the preset filters, with FSRS scheduling data. */
  cards: ScheduledCard[];

  /** Total number of active cards matching the preset (including those not yet due). */
  totalMatching: number;
}

// ---------------------------------------------------------------------------
// Built-in Preset Definition
// ---------------------------------------------------------------------------

/**
 * Definition for a system-provided built-in preset.
 * Used as a template during onboarding to auto-create presets for new users.
 */
export interface BuiltInPresetDefinition {
  /** Stable identifier for the built-in preset (not a UUID). */
  key: string;

  /** Display name. */
  name: string;

  /** Tag slugs to match (resolved to IDs at creation time). */
  tagSlugs: string[];

  /** Deck name patterns to match (resolved to IDs at creation time). */
  deckNamePatterns: string[];

  /** Card state filter. */
  stateFilter: StateFilter;

  /** Whether pinned by default. */
  isPinned: boolean;
}

// ---------------------------------------------------------------------------
// Database Row
// ---------------------------------------------------------------------------

/**
 * Raw row shape returned from the study_presets table.
 * Maps directly to the database schema with snake_case column names.
 */
export interface StudyPresetRow {
  id: string;
  user_id: string;
  name: string;
  tag_filter: string[];
  deck_filter: string[];
  state_filter: StateFilter;
  is_pinned: boolean;
  created_at: Date;
}

/**
 * easy-days.ts -- Reduce workload on specific weekdays.
 *
 * Implements the "Easy Days" feature from Anki (Section 1.10), which allows
 * users to designate certain days of the week as lighter review days.
 *
 * Reviews that would normally fall on an easy day are redistributed to
 * adjacent non-easy days (preferring the nearest day that has the highest
 * multiplier, i.e. the "fullest" day).
 *
 * For example, a user might configure Friday as 50% and Saturday as 25%,
 * meaning those days will have reduced review counts and excess reviews
 * will be shifted to Thursday or Sunday.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Configuration for easy days.
 *
 * Each day of the week can have a multiplier between 0 and 1:
 *   - 1.0 = normal day (full reviews)
 *   - 0.5 = 50% of normal reviews
 *   - 0.25 = 25% of normal reviews
 *   - 0.0 = no reviews at all (everything shifted)
 *
 * Days not present in the map default to 1.0 (full reviews).
 */
export interface EasyDaysConfig {
  /** Whether the easy days feature is enabled. */
  enabled: boolean;

  /**
   * Multiplier for each day of the week.
   * Key: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
   * Value: multiplier in [0, 1]. Days not present default to 1.0.
   */
  dayMultipliers: Record<number, number>;
}

/**
 * Storage interface for persisting easy days configuration.
 */
export interface EasyDaysStore {
  /** Read the easy days config for a user. Returns null if not set. */
  getEasyDaysConfig(userId: string): Promise<EasyDaysConfig | null>;

  /** Write the easy days config for a user. */
  setEasyDaysConfig(userId: string, config: EasyDaysConfig): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default config: feature disabled, all days at full capacity. */
export const DEFAULT_EASY_DAYS_CONFIG: EasyDaysConfig = {
  enabled: false,
  dayMultipliers: {},
};

// ---------------------------------------------------------------------------
// EasyDaysService
// ---------------------------------------------------------------------------

/**
 * Service for managing and applying easy day configurations.
 *
 * The core logic is in {@link adjustDueDate}, which takes a computed due
 * date and shifts it if it falls on an easy day. The shifting algorithm:
 *
 *   1. Check if the due date's day-of-week has a multiplier < 1.
 *   2. If so, probabilistically decide whether to shift based on the
 *      multiplier (e.g., multiplier 0.25 means 75% chance of shifting).
 *   3. When shifting, search adjacent days (up to 3 days in either
 *      direction) and pick the nearest day with the highest multiplier.
 *   4. Prefer shifting forward (later) over backward (earlier) to avoid
 *      shortening intervals.
 */
export class EasyDaysService {
  private readonly store: EasyDaysStore | null;

  /**
   * Create an EasyDaysService.
   *
   * @param store - Optional persistence layer. If not provided, configs
   *                are managed in-memory only.
   */
  constructor(store?: EasyDaysStore) {
    this.store = store ?? null;
  }

  // Fallback in-memory storage when no store is provided
  private inMemoryConfigs: Map<string, EasyDaysConfig> = new Map();

  /**
   * Set the easy days configuration for a user.
   *
   * @param userId - The user's identifier.
   * @param config - The easy days configuration to save.
   */
  async setEasyDays(userId: string, config: EasyDaysConfig): Promise<void> {
    // Validate multipliers are in [0, 1]
    const validated: EasyDaysConfig = {
      enabled: config.enabled,
      dayMultipliers: {},
    };

    for (const [dayStr, multiplier] of Object.entries(config.dayMultipliers)) {
      const day = Number(dayStr);
      if (day >= 0 && day <= 6) {
        validated.dayMultipliers[day] = Math.max(0, Math.min(1, multiplier));
      }
    }

    if (this.store) {
      await this.store.setEasyDaysConfig(userId, validated);
    } else {
      this.inMemoryConfigs.set(userId, validated);
    }
  }

  /**
   * Get the easy days configuration for a user.
   *
   * @param userId - The user's identifier.
   * @returns The user's easy days configuration, or defaults if not set.
   */
  async getEasyDays(userId: string): Promise<EasyDaysConfig> {
    if (this.store) {
      const config = await this.store.getEasyDaysConfig(userId);
      return config ?? DEFAULT_EASY_DAYS_CONFIG;
    }
    return this.inMemoryConfigs.get(userId) ?? DEFAULT_EASY_DAYS_CONFIG;
  }

  /**
   * Adjust a card's due date to respect easy day configuration.
   *
   * If the due date falls on an easy day, this method may shift it to an
   * adjacent non-easy day. The decision is probabilistic based on the
   * multiplier: a 0.25 multiplier means there's a 75% chance the card
   * gets shifted.
   *
   * @param dueDate - The originally computed due date.
   * @param config  - The easy days configuration to apply.
   * @returns The adjusted due date (may be the same if no shift needed).
   */
  adjustDueDate(dueDate: Date, config: EasyDaysConfig): Date {
    if (!config.enabled) return dueDate;

    const dayOfWeek = dueDate.getDay(); // 0 = Sunday
    const multiplier = this.getMultiplier(dayOfWeek, config);

    // If the multiplier is 1.0, no adjustment needed
    if (multiplier >= 1.0) return dueDate;

    // Probabilistic shift: multiplier determines what fraction stays.
    // Use a deterministic hash based on the date to make this reproducible.
    const dateHash = this.hashDate(dueDate);
    const shouldShift = dateHash > multiplier;

    if (!shouldShift) return dueDate;

    // Find the best adjacent day to shift to
    return this.findBestAlternateDay(dueDate, config);
  }

  /**
   * Get the effective daily review limit for a given day of the week.
   *
   * Scales the base limit by the easy day multiplier.
   *
   * @param dayOfWeek - Day of week (0 = Sunday, 6 = Saturday).
   * @param baseLimit - The normal daily review limit.
   * @param config    - Easy days configuration.
   * @returns The adjusted limit (always at least 1 if baseLimit > 0).
   */
  getEffectiveLimit(
    dayOfWeek: number,
    baseLimit: number,
    config: EasyDaysConfig,
  ): number {
    if (!config.enabled) return baseLimit;

    const multiplier = this.getMultiplier(dayOfWeek, config);
    const adjusted = Math.round(baseLimit * multiplier);

    // Always allow at least 1 review if the base limit is positive and
    // the multiplier is non-zero
    if (baseLimit > 0 && multiplier > 0) {
      return Math.max(1, adjusted);
    }

    return adjusted;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Get the multiplier for a given day of the week, defaulting to 1.0
   * if not specified.
   */
  private getMultiplier(dayOfWeek: number, config: EasyDaysConfig): number {
    const m = config.dayMultipliers[dayOfWeek];
    return m !== undefined ? m : 1.0;
  }

  /**
   * Find the best alternate day to shift a review to.
   *
   * Searches up to 3 days forward and 2 days backward, preferring:
   *   1. Days with higher multipliers (fuller days absorb shifted reviews).
   *   2. Forward shifts over backward shifts (to preserve interval length).
   *   3. Closer days over farther days.
   *
   * @param dueDate - The original due date on an easy day.
   * @param config  - Easy days configuration.
   * @returns The best alternative date.
   */
  private findBestAlternateDay(dueDate: Date, config: EasyDaysConfig): Date {
    interface Candidate {
      date: Date;
      offset: number; // days from original (-2 to +3)
      multiplier: number;
    }

    const candidates: Candidate[] = [];

    // Search forward 1-3 days, then backward 1-2 days
    const offsets = [1, -1, 2, -2, 3];

    for (const offset of offsets) {
      const candidateDate = new Date(
        dueDate.getTime() + offset * 24 * 60 * 60 * 1000,
      );
      const dayOfWeek = candidateDate.getDay();
      const multiplier = this.getMultiplier(dayOfWeek, config);

      candidates.push({
        date: candidateDate,
        offset,
        multiplier,
      });
    }

    // Sort candidates: prefer higher multiplier, then forward, then closer
    candidates.sort((a, b) => {
      // Prefer higher multiplier (more available capacity)
      if (a.multiplier !== b.multiplier) return b.multiplier - a.multiplier;

      // Prefer forward shifts (positive offset)
      const aForward = a.offset > 0 ? 0 : 1;
      const bForward = b.offset > 0 ? 0 : 1;
      if (aForward !== bForward) return aForward - bForward;

      // Prefer closer days
      return Math.abs(a.offset) - Math.abs(b.offset);
    });

    // Pick the best candidate that is a non-easy day (multiplier >= 0.75)
    for (const candidate of candidates) {
      if (candidate.multiplier >= 0.75) {
        return candidate.date;
      }
    }

    // If all nearby days are easy days, just pick the one with the highest multiplier
    if (candidates.length > 0) {
      return candidates[0].date;
    }

    // Fallback: shift forward by 1 day
    return new Date(dueDate.getTime() + 24 * 60 * 60 * 1000);
  }

  /**
   * Generate a deterministic pseudo-random number in [0, 1) from a date.
   *
   * Uses a simple hash of the date string to produce a consistent result
   * for the same date, ensuring that easy-day decisions are reproducible
   * (the same card due on the same date will always get the same shift
   * decision).
   */
  private hashDate(date: Date): number {
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to [0, 1) range
    return (hash >>> 0) / 4294967296;
  }
}

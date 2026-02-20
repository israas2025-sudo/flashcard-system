// @ts-nocheck
/**
 * auth-service.ts -- Authentication service for user registration, login,
 * token management, password operations, and profile management.
 *
 * Security design:
 * - Passwords hashed with bcrypt (12 rounds)
 * - JWT access tokens expire in 15 minutes
 * - JWT refresh tokens expire in 7 days
 * - Password reset tokens expire in 1 hour and are single-use
 * - Account deletion requires password confirmation
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Pool } from 'pg';
import type {
  AuthResult,
  JWTPayload,
  RefreshTokenPayload,
  UserProfile,
  UserSettings,
  UserStats,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/** Default settings for new users. */
const DEFAULT_SETTINGS: UserSettings = {
  dayBoundaryHour: 4,
  defaultDesiredRetention: 0.9,
  theme: 'auto',
  accentColor: '#6366F1',
  reducedMotion: false,
  soundEnabled: true,
  soundVolume: 0.7,
  gamificationEnabled: true,
  languagePriorities: [],
  timezone: 'UTC',
};

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
  private pool: Pool;
  private jwtSecret: string;

  constructor(pool: Pool, jwtSecret: string) {
    this.pool = pool;
    this.jwtSecret = jwtSecret;
  }

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  /**
   * Register a new user account.
   *
   * 1. Validates that the email is not already in use.
   * 2. Hashes the password with bcrypt (12 rounds).
   * 3. Inserts the user row with default settings.
   * 4. Generates access and refresh JWT tokens.
   * 5. Returns the tokens and the user profile.
   *
   * @param email - The user's email address.
   * @param password - The plaintext password (min 8 characters).
   * @param displayName - The display name for the user's profile.
   * @returns AuthResult with tokens and user profile.
   * @throws Error if email is already registered or validation fails.
   */
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResult> {
    // Validate inputs
    if (!email || !this.isValidEmail(email)) {
      throw new AuthError('Invalid email address', 'INVALID_EMAIL', 400);
    }

    if (!password || password.length < 8) {
      throw new AuthError(
        'Password must be at least 8 characters',
        'WEAK_PASSWORD',
        400
      );
    }

    if (!displayName || displayName.trim().length === 0) {
      throw new AuthError(
        'Display name is required',
        'INVALID_DISPLAY_NAME',
        400
      );
    }

    if (displayName.trim().length > 100) {
      throw new AuthError(
        'Display name cannot exceed 100 characters',
        'INVALID_DISPLAY_NAME',
        400
      );
    }

    // Check for existing email
    const existingUser = await this.pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      throw new AuthError(
        'An account with this email already exists',
        'EMAIL_EXISTS',
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, display_name, settings, created_at)
       VALUES (LOWER($1), $2, $3, $4, NOW())
       RETURNING id, email, display_name, created_at, settings, xp_total, streak_current`,
      [email.trim(), passwordHash, displayName.trim(), JSON.stringify(DEFAULT_SETTINGS)]
    );

    const row = result.rows[0];
    const user = this.rowToProfile(row);

    // Generate tokens
    const token = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    return { token, refreshToken, user };
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  /**
   * Authenticate a user with email and password.
   *
   * 1. Finds the user by email (case-insensitive).
   * 2. Compares the provided password against the stored hash.
   * 3. Generates new access and refresh tokens.
   * 4. Returns the tokens and user profile.
   *
   * @param email - The user's email address.
   * @param password - The plaintext password.
   * @returns AuthResult with tokens and user profile.
   * @throws AuthError if credentials are invalid.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    if (!email || !password) {
      throw new AuthError(
        'Email and password are required',
        'MISSING_CREDENTIALS',
        400
      );
    }

    // Find user by email
    const result = await this.pool.query(
      `SELECT id, email, password_hash, display_name, created_at,
              settings, xp_total, streak_current
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      throw new AuthError(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401
      );
    }

    const row = result.rows[0];

    // Compare password
    const isValid = await bcrypt.compare(password, row.password_hash);
    if (!isValid) {
      throw new AuthError(
        'Invalid email or password',
        'INVALID_CREDENTIALS',
        401
      );
    }

    const user = this.rowToProfile(row);

    // Generate tokens
    const token = this.generateAccessToken(user.id, user.email);
    const refreshToken = this.generateRefreshToken(user.id);

    return { token, refreshToken, user };
  }

  // -------------------------------------------------------------------------
  // Token Management
  // -------------------------------------------------------------------------

  /**
   * Refresh an expired access token using a valid refresh token.
   *
   * Verifies the refresh token, looks up the user, and issues
   * a new access token and refresh token pair.
   *
   * @param token - The refresh token to validate.
   * @returns New AuthResult with fresh tokens and updated user profile.
   * @throws AuthError if the refresh token is invalid or expired.
   */
  async refreshToken(token: string): Promise<AuthResult> {
    let payload: RefreshTokenPayload;

    try {
      payload = jwt.verify(token, this.jwtSecret) as RefreshTokenPayload;
    } catch {
      throw new AuthError(
        'Invalid or expired refresh token',
        'INVALID_REFRESH_TOKEN',
        401
      );
    }

    if (payload.type !== 'refresh') {
      throw new AuthError(
        'Invalid token type',
        'INVALID_TOKEN_TYPE',
        401
      );
    }

    // Look up user (ensures they still exist and aren't deleted)
    const result = await this.pool.query(
      `SELECT id, email, display_name, created_at,
              settings, xp_total, streak_current
       FROM users
       WHERE id = $1`,
      [payload.userId]
    );

    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    const row = result.rows[0];
    const user = this.rowToProfile(row);

    // Issue new token pair
    const newAccessToken = this.generateAccessToken(user.id, user.email);
    const newRefreshToken = this.generateRefreshToken(user.id);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  /**
   * Verify a JWT access token and return its payload.
   *
   * Used by the auth middleware to authenticate API requests.
   *
   * @param token - The JWT access token to verify.
   * @returns The decoded JWT payload.
   * @throws Error if the token is invalid or expired.
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch {
      throw new AuthError(
        'Invalid or expired token',
        'INVALID_TOKEN',
        401
      );
    }
  }

  // -------------------------------------------------------------------------
  // Password Management
  // -------------------------------------------------------------------------

  /**
   * Change the authenticated user's password.
   *
   * Requires the current password for verification before allowing
   * the change. The new password must meet minimum length requirements.
   *
   * @param userId - The authenticated user's ID.
   * @param oldPassword - The current password for verification.
   * @param newPassword - The new password (min 8 characters).
   * @throws AuthError if the old password is incorrect or new password is weak.
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthError(
        'New password must be at least 8 characters',
        'WEAK_PASSWORD',
        400
      );
    }

    // Fetch current password hash
    const result = await this.pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Verify old password
    const isValid = await bcrypt.compare(
      oldPassword,
      result.rows[0].password_hash
    );

    if (!isValid) {
      throw new AuthError(
        'Current password is incorrect',
        'INVALID_PASSWORD',
        401
      );
    }

    // Hash and update new password
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newHash, userId]
    );
  }

  /**
   * Request a password reset for the given email address.
   *
   * Generates a cryptographic reset token, stores a hashed version
   * in the database, and would (in production) send an email with
   * the reset link. The token expires after 1 hour.
   *
   * Always returns void regardless of whether the email exists,
   * to prevent email enumeration attacks.
   *
   * @param email - The email address to send the reset to.
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Find user (silently return if not found to prevent enumeration)
    const result = await this.pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      // Return silently -- do not reveal whether the email exists
      return;
    }

    const userId = result.rows[0].id;

    // Generate a cryptographic reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Invalidate any existing reset tokens for this user
    await this.pool.query(
      `UPDATE password_reset_tokens
       SET used = true
       WHERE user_id = $1 AND used = false`,
      [userId]
    );

    // Store the hashed token
    await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    // In production, send email with reset link containing `resetToken`
    // For now, log it in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] Password reset token for ${email}: ${resetToken}`);
    }
  }

  /**
   * Reset a user's password using a valid reset token.
   *
   * Verifies the token hasn't expired or been used, then updates
   * the password and marks the token as consumed.
   *
   * @param resetToken - The plaintext reset token from the email link.
   * @param newPassword - The new password (min 8 characters).
   * @throws AuthError if the token is invalid, expired, or already used.
   */
  async resetPassword(
    resetToken: string,
    newPassword: string
  ): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new AuthError(
        'Password must be at least 8 characters',
        'WEAK_PASSWORD',
        400
      );
    }

    // Hash the provided token to look up the stored entry
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const result = await this.pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AuthError(
        'Invalid or expired reset token',
        'INVALID_RESET_TOKEN',
        400
      );
    }

    const tokenRow = result.rows[0];

    if (tokenRow.used) {
      throw new AuthError(
        'This reset token has already been used',
        'TOKEN_ALREADY_USED',
        400
      );
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      throw new AuthError(
        'This reset token has expired',
        'TOKEN_EXPIRED',
        400
      );
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, tokenRow.user_id]
      );

      // Mark token as used
      await client.query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [tokenRow.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // -------------------------------------------------------------------------
  // Profile Management
  // -------------------------------------------------------------------------

  /**
   * Get the complete user profile including stats and settings.
   *
   * Fetches the user row and computes derived stats (total cards,
   * total reviews, level from XP).
   *
   * @param userId - The user's ID.
   * @returns The complete user profile.
   * @throws AuthError if the user is not found.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.display_name, u.created_at,
              u.settings, u.xp_total, u.streak_current,
              (SELECT COUNT(*)::int FROM cards c
               JOIN notes n ON c.note_id = n.id
               WHERE n.user_id = u.id) AS total_cards,
              (SELECT COUNT(*)::int FROM review_logs rl
               JOIN cards c ON rl.card_id = c.id
               JOIN notes n ON c.note_id = n.id
               WHERE n.user_id = u.id) AS total_reviews
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    return this.rowToProfile(result.rows[0]);
  }

  /**
   * Update the user's profile fields (display name, avatar, settings).
   *
   * Only the provided fields are updated; omitted fields remain unchanged.
   * Settings are merged with existing settings (partial update).
   *
   * @param userId - The user's ID.
   * @param updates - The fields to update.
   * @returns The updated user profile.
   * @throws AuthError if the user is not found.
   */
  async updateProfile(
    userId: string,
    updates: Partial<{
      displayName: string;
      avatarUrl: string | null;
      settings: Partial<UserSettings>;
    }>
  ): Promise<UserProfile> {
    // Fetch current user to merge settings
    const current = await this.pool.query(
      `SELECT id, email, display_name, created_at,
              settings, xp_total, streak_current
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (current.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    const row = current.rows[0];
    const currentSettings =
      typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings || DEFAULT_SETTINGS;

    // Build dynamic UPDATE query
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      if (
        typeof updates.displayName !== 'string' ||
        updates.displayName.trim().length === 0
      ) {
        throw new AuthError(
          'Display name cannot be empty',
          'INVALID_DISPLAY_NAME',
          400
        );
      }
      setClauses.push(`display_name = $${paramIndex}`);
      values.push(updates.displayName.trim());
      paramIndex++;
    }

    if (updates.settings !== undefined) {
      const mergedSettings = { ...currentSettings, ...updates.settings };
      setClauses.push(`settings = $${paramIndex}`);
      values.push(JSON.stringify(mergedSettings));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      // No changes -- return existing profile
      return this.rowToProfile(row);
    }

    values.push(userId);
    const updateQuery = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, display_name, created_at,
                settings, xp_total, streak_current
    `;

    const result = await this.pool.query(updateQuery, values);
    return this.rowToProfile(result.rows[0]);
  }

  /**
   * Permanently delete a user account.
   *
   * Requires password confirmation as a safety measure. Cascading
   * deletes in the database schema will remove all related data
   * (notes, cards, review logs, achievements, etc.).
   *
   * @param userId - The user's ID.
   * @param password - The current password for confirmation.
   * @throws AuthError if the password is incorrect.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    // Verify password
    const result = await this.pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthError('User not found', 'USER_NOT_FOUND', 404);
    }

    const isValid = await bcrypt.compare(
      password,
      result.rows[0].password_hash
    );

    if (!isValid) {
      throw new AuthError(
        'Password is incorrect',
        'INVALID_PASSWORD',
        401
      );
    }

    // Delete user (cascading deletes handle related data)
    await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Generate a short-lived JWT access token.
   */
  private generateAccessToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email } as Omit<JWTPayload, 'iat' | 'exp'>,
      this.jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate a long-lived JWT refresh token.
   */
  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' } as Omit<RefreshTokenPayload, 'iat' | 'exp'>,
      this.jwtSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  }

  /**
   * Convert a database row to a UserProfile object.
   */
  private rowToProfile(row: Record<string, unknown>): UserProfile {
    const settings =
      typeof row.settings === 'string'
        ? JSON.parse(row.settings as string)
        : (row.settings as UserSettings) || DEFAULT_SETTINGS;

    const xpTotal = Number(row.xp_total) || 0;
    const level = this.calculateLevel(xpTotal);

    return {
      id: row.id as string,
      email: row.email as string,
      displayName: (row.display_name as string) || '',
      avatarUrl: (row.avatar_url as string) || null,
      createdAt: new Date(row.created_at as string),
      settings: {
        ...DEFAULT_SETTINGS,
        ...settings,
      },
      stats: {
        totalCards: Number(row.total_cards) || 0,
        totalReviews: Number(row.total_reviews) || 0,
        streakDays: Number(row.streak_current) || 0,
        level,
        xp: xpTotal,
      },
    };
  }

  /**
   * Calculate the user level from total XP.
   *
   * Uses the same formula as the XP service:
   *   level = floor((xp / 50) ^ (1 / 1.5))
   */
  private calculateLevel(xp: number): number {
    if (xp < 50) return 0;
    return Math.floor(Math.pow(xp / 50, 1 / 1.5));
  }

  /**
   * Validate an email address format.
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
}

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

/**
 * Custom error class for authentication-related errors.
 * Includes an error code and HTTP status code for API responses.
 */
export class AuthError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// @ts-nocheck
/**
 * PostgreSQL Connection Pool Setup
 *
 * Provides a centralized connection pool for the flashcard system,
 * with environment-based configuration, health checks, and graceful shutdown.
 */

import { Pool, PoolConfig, PoolClient, QueryResult } from 'pg';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Database configuration derived from environment variables with sensible defaults.
 */
function getPoolConfig(): PoolConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'flashcard_system',
    user: process.env.DB_USER || 'flashcard',
    password: process.env.DB_PASSWORD || '',

    // Pool sizing
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),

    // Timeouts (in milliseconds)
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),

    // SSL configuration
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,

    // Statement timeout to prevent runaway queries (30 seconds)
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
  };
}

// ---------------------------------------------------------------------------
// Pool Singleton
// ---------------------------------------------------------------------------

let pool: Pool | null = null;

/**
 * Get the shared connection pool, creating it on first call.
 * The pool is a singleton -- calling this repeatedly returns the same instance.
 *
 * @returns The PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getPoolConfig();
    pool = new Pool(config);

    // Log pool errors (connection drops, etc.)
    pool.on('error', (err: Error) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });

    // Optional: log pool connect events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('[DB Pool] New client connected');
      });
    }
  }

  return pool;
}

// ---------------------------------------------------------------------------
// Query Helpers
// ---------------------------------------------------------------------------

/**
 * Execute a parameterized SQL query using the shared pool.
 *
 * @param text - The SQL query text (use $1, $2, ... for parameters)
 * @param params - The parameter values
 * @returns The query result
 *
 * @example
 * const result = await query('SELECT * FROM notes WHERE id = $1', [noteId]);
 * const notes = result.rows;
 */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Query]', {
      text: text.substring(0, 100),
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
  }

  return result;
}

/**
 * Acquire a client from the pool for transaction support.
 *
 * IMPORTANT: Always release the client in a finally block.
 *
 * @returns A pool client that must be released after use
 *
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...', [...]);
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Execute a function within a database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 *
 * @param fn - Async function that receives a PoolClient and performs queries
 * @returns The return value of fn
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO notes ...', [...]);
 *   await client.query('INSERT INTO cards ...', [...]);
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * Check if the database is reachable and responding.
 *
 * @returns An object with connection status and latency
 */
export async function healthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await getPool().query('SELECT 1');
    return {
      ok: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ---------------------------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------------------------

/**
 * Close the connection pool and release all connections.
 * Call this during application shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    console.log('[DB Pool] Closing connection pool...');
    await pool.end();
    pool = null;
    console.log('[DB Pool] Connection pool closed.');
  }
}

// Handle process termination signals
function setupShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    console.log(`[DB Pool] Received ${signal}, shutting down...`);
    await closePool();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

setupShutdownHandlers();

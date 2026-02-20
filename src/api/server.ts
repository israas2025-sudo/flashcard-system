// @ts-nocheck
/**
 * Express Server Setup
 *
 * Configures and exports the Express application with middleware,
 * route mounting, error handling, and graceful shutdown.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { closePool, healthCheck } from '../db/connection';

// Route imports
import { notesRouter } from './routes/notes';
import { cardsRouter } from './routes/cards';
import { decksRouter } from './routes/decks';
import { tagsRouter } from './routes/tags';
import { searchRouter } from './routes/search';
import { statsRouter } from './routes/stats';
import { createStudyPresetsRouter } from './routes/study-presets';
import { createMarketplaceRouter } from './routes/marketplace';
import { createPronunciationRouter } from './routes/pronunciation';
import { createQuranRouter } from './routes/quran';
import { createGamificationRouter } from './routes/gamification';

// ---------------------------------------------------------------------------
// Application Error Class
// ---------------------------------------------------------------------------

/**
 * Custom error class for API errors with HTTP status codes.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  /** 400 Bad Request */
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  /** 401 Unauthorized */
  static unauthorized(message: string = 'Authentication required'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  /** 403 Forbidden */
  static forbidden(message: string = 'Access denied'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  /** 404 Not Found */
  static notFound(resource: string = 'Resource'): ApiError {
    return new ApiError(404, `${resource} not found`, 'NOT_FOUND');
  }

  /** 409 Conflict */
  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  /** 422 Unprocessable Entity (validation failure) */
  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  /** 429 Too Many Requests */
  static rateLimited(message: string = 'Too many requests'): ApiError {
    return new ApiError(429, message, 'RATE_LIMITED');
  }

  /** 500 Internal Server Error */
  static internal(message: string = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}

// ---------------------------------------------------------------------------
// Request Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that required fields exist in the request body.
 * Throws ApiError.badRequest if any are missing.
 */
export function requireFields(
  body: Record<string, unknown>,
  fields: string[]
): void {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null
  );
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate that a string parameter is a valid UUID v4 format.
 */
export function validateUUID(value: string, paramName: string): void {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    throw ApiError.badRequest(`Invalid ${paramName}: must be a valid UUID`);
  }
}

/**
 * Parse a positive integer from a string query parameter.
 * Returns the default value if the parameter is absent or invalid.
 */
export function parseIntParam(
  value: string | undefined,
  defaultValue: number,
  paramName: string
): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    throw ApiError.badRequest(`Invalid ${paramName}: must be a non-negative integer`);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// App Creation
// ---------------------------------------------------------------------------

/**
 * Create and configure the Express application.
 */
export function createApp(): express.Application {
  const app = express();

  // ---------------------------------------------------------------------------
  // Global Middleware
  // ---------------------------------------------------------------------------

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging (development)
  if (process.env.NODE_ENV === 'development') {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbHealth = await healthCheck();
    const status = dbHealth.ok ? 200 : 503;

    res.status(status).json({
      status: dbHealth.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
    });
  });

  // ---------------------------------------------------------------------------
  // API Routes
  // ---------------------------------------------------------------------------

  app.use('/api/notes', notesRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/decks', decksRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/stats', statsRouter);

  // -------------------------------------------------------------------------
  // Authenticated routes (marketplace, pronunciation, study-presets, quran, gamification)
  //
  // These routers use the AuthService for JWT verification internally.
  // Each factory function receives the shared AuthService instance so
  // that the authMiddleware can verify tokens.
  // -------------------------------------------------------------------------

  try {
    const { AuthService } = require('../auth/auth-service');
    const { getPool } = require('../db/connection');
    const authService = new AuthService(getPool());

    app.use('/api/marketplace', createMarketplaceRouter(authService));
    app.use('/api/pronunciation', createPronunciationRouter(authService));
    app.use('/api/study-presets', createStudyPresetsRouter(authService));
    app.use('/api/quran', createQuranRouter(authService));
    app.use('/api/gamification', createGamificationRouter(authService));
  } catch {
    // Auth module may not be fully configured in all environments.
    // Log a warning and skip authenticated routes so the server can
    // still start with the core unauthenticated routes available.
    console.warn(
      '[Server] AuthService not available -- marketplace, pronunciation, ' +
      'study-presets, quran, and gamification routes are disabled.'
    );
  }

  // ---------------------------------------------------------------------------
  // 404 Handler
  // ---------------------------------------------------------------------------

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(ApiError.notFound('Route'));
  });

  // ---------------------------------------------------------------------------
  // Error Handling Middleware
  // ---------------------------------------------------------------------------

  app.use(
    (err: Error | ApiError, _req: Request, res: Response, _next: NextFunction) => {
      // Determine status code and error info
      let statusCode = 500;
      let code = 'INTERNAL_ERROR';
      let message = 'Internal server error';
      let details: unknown = undefined;

      if (err instanceof ApiError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
      } else if (err.name === 'SyntaxError' && 'body' in err) {
        // JSON parse error
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Invalid JSON in request body';
      } else {
        // Log unexpected errors
        console.error('[Unhandled Error]', err);
      }

      // Never leak stack traces in production
      const response: Record<string, unknown> = {
        error: {
          code,
          message,
        },
      };

      if (details) {
        response.error = { ...response.error as object, details };
      }

      if (process.env.NODE_ENV === 'development' && statusCode === 500) {
        (response.error as Record<string, unknown>).stack = err.stack;
      }

      res.status(statusCode).json(response);
    }
  );

  return app;
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server.
 */
export function startServer(app: express.Application): void {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  const server = app.listen(port, host, () => {
    console.log(`[Server] Flashcard API running at http://${host}:${port}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await closePool();
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ---------------------------------------------------------------------------
// Main Entry Point (when run directly)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const app = createApp();
  startServer(app);
}

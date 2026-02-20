# Flashcard System -- Complete Architecture Overview

> **Version**: 1.0.0-draft
> **Last Updated**: 2026-02-19
> **Status**: Development Reference
> **Audience**: Engineers, architects, and contributors building this system

---

## Table of Contents

1. [1.1 Architecture Overview](#11-architecture-overview)
2. [1.2 Core Data Model](#12-core-data-model)
3. [1.3 Tagging System](#13-tagging-system)
4. [1.4 Deck System](#14-deck-system)
5. [1.5 Spaced Repetition Scheduling](#15-spaced-repetition-scheduling)
6. [1.6 Suspending, Burying, Flags, Card Management](#16-suspending-burying-flags-card-management)
7. [1.7 Browser, Search, Card Management](#17-browser-search-card-management)
8. [1.8 Media, Templates, Styling](#18-media-templates-styling)
9. [1.9 Statistics, Sync, Import/Export](#19-statistics-sync-importexport)
10. [1.10 Complete Feature Checklist](#110-complete-feature-checklist)

---

## 1.1 Architecture Overview

### Design Philosophy

This flashcard system is designed from the ground up as a **modern, cloud-native, multi-platform** spaced repetition platform. Unlike Anki's monolithic desktop application architecture (built on Python/Qt with a tightly coupled SQLite backend), this system embraces a **layered, service-oriented architecture** that separates concerns cleanly and enables independent scaling, testing, and deployment of each layer.

Key architectural principles:

- **Separation of Concerns**: Each layer has a single responsibility and communicates through well-defined interfaces.
- **Offline-First**: The system works without connectivity and syncs intelligently when online.
- **Algorithm Agnostic**: The scheduling engine is pluggable; SM-2 and FSRS-5 are built in, but custom algorithms can be registered.
- **Type Safety End-to-End**: TypeScript across the entire stack with shared type definitions.
- **Performance Where It Matters**: Rust-based WASM modules for computationally intensive paths (scheduling calculations, search indexing, bulk imports).

### High-Level System Diagram (Text)

```
+---------------------------------------------------------------------+
|                        CLIENT LAYER                                  |
|                                                                      |
|  +-------------------+  +-------------------+  +------------------+  |
|  |   Web Frontend    |  |  Mobile (React    |  |  Desktop (PWA /  |  |
|  |   (Next.js 14+    |  |   Native or PWA)  |  |   Electron)      |  |
|  |    React 18+)     |  |                   |  |                  |  |
|  +--------+----------+  +--------+----------+  +--------+---------+  |
|           |                      |                       |           |
+-----------+----------------------+-----------------------+-----------+
            |                      |                       |
            +----------+-----------+-----------+-----------+
                       |                       |
                       v                       v
+---------------------------------------------------------------------+
|                      API GATEWAY / BFF LAYER                         |
|                                                                      |
|  +----------------------------+  +--------------------------------+  |
|  |  REST API (Express/Fastify)|  |  WebSocket Server (Socket.io / |  |
|  |  - CRUD operations         |  |   native ws)                   |  |
|  |  - Authentication          |  |  - Real-time sync events       |  |
|  |  - Rate limiting           |  |  - Live collaboration          |  |
|  |  - Request validation      |  |  - Push notifications          |  |
|  +----------------------------+  +--------------------------------+  |
|                                                                      |
+---------------------------------------------------------------------+
            |                       |                      |
            v                       v                      v
+---------------------------------------------------------------------+
|                     SERVICE / BUSINESS LOGIC LAYER                   |
|                                                                      |
|  +----------------+ +----------------+ +------------------+          |
|  | Scheduling     | | Card/Note      | | Search Engine    |          |
|  | Engine         | | Manager        | | (Query Parser +  |          |
|  | (SM-2, FSRS-5) | | (CRUD, gen)    | |  Full-text)      |          |
|  +----------------+ +----------------+ +------------------+          |
|                                                                      |
|  +----------------+ +----------------+ +------------------+          |
|  | Sync Engine    | | Media Manager  | | Template Engine  |          |
|  | (USN-based)    | | (upload, CDN)  | | (Mustache-like)  |          |
|  +----------------+ +----------------+ +------------------+          |
|                                                                      |
|  +----------------+ +----------------+ +------------------+          |
|  | Statistics     | | Import/Export  | | Plugin/Add-on    |          |
|  | Aggregator     | | (apkg, csv)    | | Runtime          |          |
|  +----------------+ +----------------+ +------------------+          |
|                                                                      |
+---------------------------------------------------------------------+
            |                       |                      |
            v                       v                      v
+---------------------------------------------------------------------+
|                       DATA ACCESS LAYER                              |
|                                                                      |
|  +----------------------------+  +--------------------------------+  |
|  |  PostgreSQL (Primary)      |  |  SQLite (Offline / Local)      |  |
|  |  - Cloud / server DB       |  |  - Client-side storage         |  |
|  |  - Full relational model   |  |  - Subset mirror of server     |  |
|  |  - Full-text search (GIN)  |  |  - Handles offline reviews     |  |
|  +----------------------------+  +--------------------------------+  |
|                                                                      |
|  +----------------------------+  +--------------------------------+  |
|  |  Redis (Cache + Queues)    |  |  Object Storage (S3/R2)       |  |
|  |  - Session store           |  |  - Media files (images, audio) |  |
|  |  - Rate limit counters     |  |  - Backups and exports         |  |
|  |  - Job queues (BullMQ)     |  |  - Shared deck packages        |  |
|  +----------------------------+  +--------------------------------+  |
|                                                                      |
+---------------------------------------------------------------------+
```

### Technology Stack Detail

| Layer | Technology | Rationale |
|---|---|---|
| **Web Frontend** | Next.js 14+ (App Router), React 18+, TypeScript 5+ | SSR for initial load, RSC for server components, excellent DX |
| **Mobile** | React Native (iOS/Android) or Progressive Web App | Code sharing with web frontend via shared packages |
| **Desktop** | PWA or Electron (if native features needed) | PWA preferred for simpler distribution |
| **API Server** | Node.js 20+ with Fastify | High throughput, schema-based validation, excellent TypeScript support |
| **Performance Modules** | Rust compiled to WebAssembly | FSRS calculations, bulk card generation, search indexing |
| **Primary Database** | PostgreSQL 16+ | JSONB support, full-text search, excellent indexing, mature ecosystem |
| **Local Database** | SQLite (via better-sqlite3 or sql.js) | Zero-config, file-based, embedded in client apps |
| **Cache** | Redis 7+ | Sub-millisecond reads, pub/sub for real-time, job queues |
| **Object Storage** | AWS S3 / Cloudflare R2 | Cost-effective media storage with CDN integration |
| **Search** | PostgreSQL GIN indexes + ts_vector | No external dependency; Meilisearch optional for advanced use |
| **Auth** | JWT (access) + Refresh Tokens + OAuth 2.0 | Stateless auth with token rotation |
| **Monitoring** | OpenTelemetry, Prometheus, Grafana | Distributed tracing, metrics, alerting |

### Monorepo Structure

The project uses a monorepo managed by Turborepo (or Nx) with pnpm workspaces:

```
flashcard-system/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # App Router pages and layouts
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Client-side utilities
│   ├── mobile/                 # React Native application
│   │   ├── src/
│   │   ├── ios/
│   │   └── android/
│   ├── api/                    # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/         # Route handlers
│   │   │   ├── services/       # Business logic services
│   │   │   ├── repositories/   # Data access layer
│   │   │   ├── middleware/     # Auth, validation, rate limiting
│   │   │   └── websocket/     # WebSocket handlers
│   │   ├── migrations/         # Database migrations (Knex/Drizzle)
│   │   └── seeds/              # Seed data
│   └── desktop/                # Electron wrapper (optional)
├── packages/
│   ├── shared-types/           # TypeScript type definitions shared across apps
│   │   ├── src/
│   │   │   ├── models/         # Note, Card, Deck, Tag, etc.
│   │   │   ├── api/            # Request/Response types
│   │   │   └── scheduling/     # Scheduling algorithm types
│   │   └── package.json
│   ├── scheduling-engine/      # Scheduling algorithms (SM-2, FSRS-5)
│   │   ├── src/
│   │   │   ├── sm2.ts
│   │   │   ├── fsrs5.ts
│   │   │   └── engine.ts       # Unified interface
│   │   └── package.json
│   ├── template-engine/        # Mustache-like template renderer
│   │   ├── src/
│   │   │   ├── parser.ts
│   │   │   ├── renderer.ts
│   │   │   └── cloze.ts
│   │   └── package.json
│   ├── search-parser/          # Search query string to SQL compiler
│   │   ├── src/
│   │   │   ├── lexer.ts
│   │   │   ├── parser.ts
│   │   │   └── sql-compiler.ts
│   │   └── package.json
│   ├── sync-engine/            # Offline sync protocol
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── conflict.ts
│   │   └── package.json
│   └── rust-modules/           # Rust -> WASM modules
│       ├── scheduling-wasm/    # High-perf scheduling math
│       ├── search-index-wasm/  # Search indexing
│       └── Cargo.toml
├── docs/                       # Documentation (this file lives here)
├── tools/                      # Build scripts, code generators
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

### Communication Patterns

#### REST API

The primary communication protocol for all CRUD operations, authentication, and data retrieval. The API follows REST conventions with JSON request/response bodies.

**Base URL**: `https://api.flashcards.example.com/v1`

**Standard Response Envelope**:

```typescript
// packages/shared-types/src/api/response.ts

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

**Authentication Flow**:

```
Client                          API Server                      Database
  |                                |                                |
  |-- POST /auth/login ---------->|                                |
  |   { email, password }         |-- Verify credentials -------->|
  |                                |<-- User record ---------------|
  |                                |-- Generate JWT pair           |
  |<-- { accessToken,             |                                |
  |      refreshToken } ----------|                                |
  |                                |                                |
  |-- GET /cards/due              |                                |
  |   Authorization: Bearer <jwt> |                                |
  |                                |-- Validate JWT                |
  |                                |-- Query due cards ----------->|
  |                                |<-- Card records --------------|
  |<-- { cards: [...] } ----------|                                |
```

#### WebSocket (Real-Time Sync)

WebSocket connections maintain persistent bidirectional communication for:
- Real-time sync notifications when data changes on another device
- Live study session updates (for collaborative features)
- Push notifications for scheduled reminders

```typescript
// WebSocket message protocol
interface WsMessage {
  type: 'sync_push' | 'sync_pull' | 'sync_conflict' | 'notification' | 'heartbeat';
  payload: unknown;
  timestamp: number;       // Unix timestamp in milliseconds
  clientId: string;        // Unique client installation ID
  sequenceNumber: number;  // Monotonically increasing per client
}

// Example: Server notifies client of remote changes
interface SyncPushMessage extends WsMessage {
  type: 'sync_push';
  payload: {
    changes: Array<{
      entity: 'note' | 'card' | 'deck' | 'tag' | 'review_log';
      operation: 'insert' | 'update' | 'delete';
      id: string;
      usn: number;    // Update Sequence Number
      data?: Record<string, unknown>;
    }>;
    serverUsn: number;  // Current server USN after these changes
  };
}
```

### Error Handling Strategy

All layers follow a consistent error handling pattern:

```typescript
// packages/shared-types/src/api/errors.ts

enum ErrorCode {
  // Authentication (1xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_1001',
  AUTH_TOKEN_EXPIRED = 'AUTH_1002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_1003',

  // Validation (2xxx)
  VALIDATION_REQUIRED_FIELD = 'VAL_2001',
  VALIDATION_INVALID_FORMAT = 'VAL_2002',
  VALIDATION_CONSTRAINT_VIOLATION = 'VAL_2003',

  // Resource (3xxx)
  RESOURCE_NOT_FOUND = 'RES_3001',
  RESOURCE_ALREADY_EXISTS = 'RES_3002',
  RESOURCE_CONFLICT = 'RES_3003',

  // Sync (4xxx)
  SYNC_CONFLICT = 'SYNC_4001',
  SYNC_USN_MISMATCH = 'SYNC_4002',
  SYNC_FULL_SYNC_REQUIRED = 'SYNC_4003',

  // Scheduling (5xxx)
  SCHED_INVALID_STATE_TRANSITION = 'SCHED_5001',
  SCHED_ALGORITHM_ERROR = 'SCHED_5002',

  // Internal (9xxx)
  INTERNAL_SERVER_ERROR = 'INT_9001',
  INTERNAL_DATABASE_ERROR = 'INT_9002',
}

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Configuration Management

```typescript
// apps/api/src/config.ts

interface AppConfig {
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;       // From environment variable, never hardcoded
    pool: {
      min: number;
      max: number;
      idleTimeoutMs: number;
    };
    ssl: boolean;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  auth: {
    jwtSecret: string;      // From environment variable
    accessTokenTtl: string;  // e.g., '15m'
    refreshTokenTtl: string; // e.g., '7d'
  };
  storage: {
    provider: 's3' | 'r2' | 'local';
    bucket: string;
    region: string;
    cdnUrl: string;
    maxFileSizeMb: number;
  };
  scheduling: {
    defaultAlgorithm: 'sm2' | 'fsrs5';
    maxNewCardsPerDay: number;
    maxReviewsPerDay: number;
  };
  sync: {
    fullSyncThreshold: number; // USN gap that triggers full sync
    conflictStrategy: 'server_wins' | 'client_wins' | 'latest_wins';
  };
}
```

---

## 1.2 Core Data Model

### Conceptual Overview

The data model is inspired by Anki's proven note/card separation but redesigned for a relational database with proper normalization, referential integrity, and extensibility.

**Key Concepts**:

- **Note (Entry)**: A single unit of knowledge. A note contains one or more *fields* that hold the actual content (text, HTML, media references). A note belongs to exactly one *note type*.
- **Note Type (Card Template)**: Defines the structure of notes -- what fields they have and how cards are generated from those fields. A note type contains one or more *card templates* that define how the front and back of each generated card look.
- **Card**: A reviewable item generated from a note + a card template. If a note type has 3 card templates, each note of that type produces 3 cards. Cards carry all scheduling state (due date, interval, ease, stability, etc.).
- **Field**: A named data slot within a note type. Each note stores a value for every field defined in its note type.

**The One-Note-to-Many-Cards Relationship**:

```
                    Note Type: "Vocabulary"
                    Fields: [Word, Reading, Meaning, Example]
                    Card Templates:
                      1. Recognition: Front={{Word}}, Back={{Meaning}}
                      2. Recall:      Front={{Meaning}}, Back={{Word}}
                      3. Spelling:    Front={{Meaning}}, Back={{type:Word}}

                              |
                              v

                    Note (instance):
                      Word = "ephemeral"
                      Reading = ""
                      Meaning = "lasting for a very short time"
                      Example = "the ephemeral nature of fame"

                              |
            +-----------------+-----------------+
            |                 |                 |
            v                 v                 v

        Card #1           Card #2           Card #3
        (Recognition)     (Recall)          (Spelling)
        Front:            Front:            Front:
        "ephemeral"       "lasting for a    "lasting for a
                          very short time"   very short time"
        Back:             Back:             Back:
        "lasting for a    "ephemeral"       [type input for
        very short time"                     "ephemeral"]

        Each card has its own independent scheduling state.
        Reviewing Card #1 does NOT affect Card #2 or #3.
```

This separation is powerful because:
1. You enter information once (the note) and get multiple study angles (the cards).
2. Editing the note updates all generated cards automatically.
3. Different cards from the same note can be at different stages of learning.
4. Sibling cards (cards from the same note) can be buried to prevent seeing related content in the same session.

### User Account Schema

```sql
-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- bcrypt/argon2 hash
    display_name    VARCHAR(200),
    avatar_url      TEXT,
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale          VARCHAR(10) NOT NULL DEFAULT 'en-US',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    usn             BIGINT NOT NULL DEFAULT 0       -- Update Sequence Number for sync
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,    -- SHA-256 of the token
    device_name     VARCHAR(200),
    device_id       VARCHAR(255),
    ip_address      INET,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ                      -- NULL if still valid
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
```

### Note Types (Card Templates)

```sql
-- ============================================================================
-- NOTE TYPES (Card Template Definitions)
-- ============================================================================

CREATE TABLE note_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    css             TEXT NOT NULL DEFAULT '',         -- Shared CSS for all templates
    is_cloze        BOOLEAN NOT NULL DEFAULT FALSE,  -- Whether this is a cloze note type
    sort_field_id   UUID,                            -- Which field to sort by in browser
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, name)
);

CREATE INDEX idx_note_types_user ON note_types (user_id);

-- Fields define the structure of a note type
CREATE TABLE fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_type_id    UUID NOT NULL REFERENCES note_types(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    ordinal         SMALLINT NOT NULL,               -- Display/storage order (0-based)
    description     TEXT,
    is_rich_text    BOOLEAN NOT NULL DEFAULT TRUE,   -- Whether to show rich text editor
    is_rtl          BOOLEAN NOT NULL DEFAULT FALSE,  -- Right-to-left text direction
    font_family     VARCHAR(100) DEFAULT 'Arial',
    font_size       SMALLINT DEFAULT 16,             -- In pixels
    sticky          BOOLEAN NOT NULL DEFAULT FALSE,  -- Retain value when adding new notes
    placeholder     TEXT,                            -- Placeholder text in editor
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(note_type_id, name),
    UNIQUE(note_type_id, ordinal)
);

CREATE INDEX idx_fields_note_type ON fields (note_type_id);

-- Card templates define how cards are generated and rendered from note fields
CREATE TABLE card_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_type_id    UUID NOT NULL REFERENCES note_types(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    ordinal         SMALLINT NOT NULL,               -- Template order (0-based)
    question_format TEXT NOT NULL,                    -- Front template (HTML + {{FieldName}})
    answer_format   TEXT NOT NULL,                    -- Back template (HTML + {{FieldName}})
    question_css    TEXT DEFAULT '',                  -- Additional CSS for this template
    answer_css      TEXT DEFAULT '',
    browser_question_format TEXT,                     -- Shortened format for card browser
    browser_answer_format   TEXT,
    deck_override_id UUID,                           -- Optional: generate cards into this deck
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(note_type_id, name),
    UNIQUE(note_type_id, ordinal)
);

CREATE INDEX idx_card_templates_note_type ON card_templates (note_type_id);

-- Add foreign key for sort_field_id after fields table exists
ALTER TABLE note_types
    ADD CONSTRAINT fk_note_types_sort_field
    FOREIGN KEY (sort_field_id) REFERENCES fields(id) ON DELETE SET NULL;
```

### Notes (Entries)

```sql
-- ============================================================================
-- NOTES (Knowledge Entries)
-- ============================================================================

CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_type_id    UUID NOT NULL REFERENCES note_types(id) ON DELETE RESTRICT,
    guid            VARCHAR(64) NOT NULL,            -- Globally unique ID for sync/import
    checksum        BIGINT,                          -- CRC32 of sort field for dupe detection
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, guid)
);

CREATE INDEX idx_notes_user ON notes (user_id);
CREATE INDEX idx_notes_note_type ON notes (note_type_id);
CREATE INDEX idx_notes_checksum ON notes (user_id, checksum);
CREATE INDEX idx_notes_updated ON notes (updated_at);

-- Field values: the actual content of each note
CREATE TABLE note_field_values (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    field_id        UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    value           TEXT NOT NULL DEFAULT '',          -- HTML content
    stripped_value  TEXT NOT NULL DEFAULT '',          -- Plain text (for search indexing)

    UNIQUE(note_id, field_id)
);

CREATE INDEX idx_nfv_note ON note_field_values (note_id);
CREATE INDEX idx_nfv_field ON note_field_values (field_id);

-- Full-text search index on stripped field values
CREATE INDEX idx_nfv_fts ON note_field_values
    USING GIN (to_tsvector('english', stripped_value));
```

### Cards

```sql
-- ============================================================================
-- CARDS (Reviewable Items)
-- ============================================================================

-- Card queue determines when/how the card is presented
CREATE TYPE card_queue AS ENUM (
    'new',              -- Never reviewed, waiting in new queue
    'learning',         -- Currently in learning steps
    'review',           -- Graduated to review queue
    'relearning',       -- Lapsed, back in learning steps
    'day_learning',     -- Learning step spans days (>= 1 day step)
    'buried_sibling',   -- Auto-buried because sibling was reviewed today
    'buried_manual',    -- Manually buried by user
    'paused'            -- Suspended/paused (replaces Anki's "suspended")
);

-- Card status for the pause system
CREATE TYPE card_status AS ENUM (
    'active',           -- Normal, reviewable
    'paused',           -- Indefinitely paused (was: suspended)
    'skipped_today'     -- Buried for today only (was: buried)
);

CREATE TABLE cards (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id             UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    card_template_id    UUID NOT NULL REFERENCES card_templates(id) ON DELETE CASCADE,
    deck_id             UUID NOT NULL REFERENCES decks(id) ON DELETE RESTRICT,
    original_deck_id    UUID REFERENCES decks(id),    -- Set when card is in a filtered deck

    -- Scheduling state
    queue               card_queue NOT NULL DEFAULT 'new',
    status              card_status NOT NULL DEFAULT 'active',
    due                 BIGINT NOT NULL DEFAULT 0,    -- Due date: day number for reviews,
                                                       -- timestamp for learning cards
    interval_days       INTEGER NOT NULL DEFAULT 0,    -- Current interval in days
    ease_factor         INTEGER NOT NULL DEFAULT 2500, -- Ease factor * 1000 (2500 = 2.5)
    review_count        INTEGER NOT NULL DEFAULT 0,    -- Total number of reviews
    lapse_count         INTEGER NOT NULL DEFAULT 0,    -- Number of times card lapsed

    -- FSRS-specific fields
    stability           REAL,                          -- FSRS stability (S) in days
    difficulty          REAL,                          -- FSRS difficulty (D) 1-10
    last_review_at      TIMESTAMPTZ,                   -- Timestamp of last review

    -- Learning state
    learning_step       SMALLINT NOT NULL DEFAULT 0,   -- Current position in learning steps
    remaining_steps     SMALLINT NOT NULL DEFAULT 0,   -- Steps remaining in current session

    -- Flags and metadata
    flags               SMALLINT NOT NULL DEFAULT 0,   -- Bitmask for colored flags (7 flags)
    pause_resume_date   TIMESTAMPTZ,                   -- Auto-resume from pause at this date
    leech_flagged       BOOLEAN NOT NULL DEFAULT FALSE, -- Whether this card is a leech

    -- Sync
    usn                 BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(note_id, card_template_id)
);

CREATE INDEX idx_cards_note ON cards (note_id);
CREATE INDEX idx_cards_deck ON cards (deck_id);
CREATE INDEX idx_cards_queue ON cards (queue);
CREATE INDEX idx_cards_status ON cards (status);
CREATE INDEX idx_cards_due ON cards (deck_id, queue, due);
CREATE INDEX idx_cards_template ON cards (card_template_id);
CREATE INDEX idx_cards_flags ON cards (flags) WHERE flags > 0;
CREATE INDEX idx_cards_leech ON cards (leech_flagged) WHERE leech_flagged = TRUE;
CREATE INDEX idx_cards_updated ON cards (updated_at);
```

### Review Log

```sql
-- ============================================================================
-- REVIEW LOG (Complete History of All Reviews)
-- ============================================================================

CREATE TYPE review_answer AS ENUM ('again', 'hard', 'good', 'easy');

CREATE TABLE review_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id             UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Review details
    answer              review_answer NOT NULL,
    reviewed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_taken_ms       INTEGER NOT NULL,              -- Time to answer in milliseconds

    -- State BEFORE this review
    previous_queue      card_queue NOT NULL,
    previous_interval   INTEGER NOT NULL,              -- Interval before review (days)
    previous_ease       INTEGER NOT NULL,              -- Ease factor before review (*1000)
    previous_stability  REAL,                          -- FSRS stability before review
    previous_difficulty REAL,                          -- FSRS difficulty before review

    -- State AFTER this review
    new_queue           card_queue NOT NULL,
    new_interval        INTEGER NOT NULL,              -- Interval after review (days)
    new_ease            INTEGER NOT NULL,              -- Ease factor after review (*1000)
    new_stability       REAL,                          -- FSRS stability after review
    new_difficulty      REAL,                          -- FSRS difficulty after review

    -- Scheduling context
    algorithm_used      VARCHAR(20) NOT NULL,          -- 'sm2' or 'fsrs5'
    scheduled_days      INTEGER NOT NULL,              -- Originally scheduled interval
    elapsed_days        INTEGER NOT NULL,              -- Actual days since last review

    -- Sync
    usn                 BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT chk_time_taken CHECK (time_taken_ms >= 0)
);

CREATE INDEX idx_review_logs_card ON review_logs (card_id);
CREATE INDEX idx_review_logs_user ON review_logs (user_id);
CREATE INDEX idx_review_logs_date ON review_logs (user_id, reviewed_at);
CREATE INDEX idx_review_logs_card_date ON review_logs (card_id, reviewed_at DESC);
```

### Card Generation from Templates

When a note is created or a note type's templates change, cards must be generated (or regenerated). Here is the card generation logic:

```typescript
// packages/scheduling-engine/src/card-generator.ts

interface FieldValue {
  fieldName: string;
  value: string;          // HTML content
  strippedValue: string;  // Plain text
}

interface CardTemplate {
  id: string;
  noteTypeId: string;
  name: string;
  ordinal: number;
  questionFormat: string;
  answerFormat: string;
}

interface GeneratedCard {
  cardTemplateId: string;
  questionHtml: string;
  answerHtml: string;
  shouldGenerate: boolean;  // False if all referenced fields are empty
}

/**
 * Determines whether a card should be generated based on its template
 * and the available field values.
 *
 * A card is generated if and only if:
 * 1. For standard note types: at least one field referenced on the
 *    question side (front) has a non-empty value.
 * 2. For cloze note types: the note content contains a cloze deletion
 *    matching this template's ordinal.
 */
function shouldGenerateCard(
  template: CardTemplate,
  fieldValues: Map<string, string>,
  isCloze: boolean
): boolean {
  if (isCloze) {
    // For cloze types, check if any field contains {{c<ordinal+1>::...}}
    const clozePattern = new RegExp(`\\{\\{c${template.ordinal + 1}::`);
    for (const value of fieldValues.values()) {
      if (clozePattern.test(value)) {
        return true;
      }
    }
    return false;
  }

  // For standard types, check if any field referenced in the question
  // template has a non-empty value
  const fieldRefPattern = /\{\{([^#/}][^}]*)\}\}/g;
  let match: RegExpExecArray | null;
  const referencedFields = new Set<string>();

  while ((match = fieldRefPattern.exec(template.questionFormat)) !== null) {
    const fieldRef = match[1].trim();
    // Skip special fields
    if (!fieldRef.startsWith('cloze:') &&
        !fieldRef.startsWith('type:') &&
        !fieldRef.startsWith('hint:') &&
        fieldRef !== 'FrontSide' &&
        fieldRef !== 'Tags') {
      referencedFields.add(fieldRef);
    }
  }

  // At least one referenced field must have content
  for (const fieldName of referencedFields) {
    const value = fieldValues.get(fieldName);
    if (value && value.trim().length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Generates all cards for a given note.
 * Called when:
 *   - A new note is created
 *   - A note's fields are edited (regenerate to update content)
 *   - A note type's templates are modified (add/remove/edit templates)
 */
async function generateCardsForNote(
  noteId: string,
  noteTypeId: string,
  fieldValues: Map<string, string>,  // fieldName -> HTML value
  templates: CardTemplate[],
  isCloze: boolean,
  defaultDeckId: string
): Promise<GeneratedCard[]> {
  const results: GeneratedCard[] = [];

  for (const template of templates) {
    const shouldCreate = shouldGenerateCard(template, fieldValues, isCloze);

    if (shouldCreate) {
      const questionHtml = renderTemplate(
        template.questionFormat,
        fieldValues,
        isCloze,
        template.ordinal
      );
      const answerHtml = renderTemplate(
        template.answerFormat,
        fieldValues,
        isCloze,
        template.ordinal,
        questionHtml  // For {{FrontSide}} replacement
      );

      results.push({
        cardTemplateId: template.id,
        questionHtml,
        answerHtml,
        shouldGenerate: true,
      });
    } else {
      results.push({
        cardTemplateId: template.id,
        questionHtml: '',
        answerHtml: '',
        shouldGenerate: false,
      });
    }
  }

  return results;
}
```

### Template Engine Specification

The template engine uses a Mustache-like syntax with domain-specific extensions for flashcard rendering.

#### Basic Field Replacement

```
{{FieldName}}
```

Replaced with the HTML content of the named field. If the field does not exist or is empty, it is replaced with an empty string.

#### Conditional Sections

```
{{#FieldName}}
  This content is shown only if FieldName is non-empty.
  You can use {{FieldName}} inside here too.
{{/FieldName}}

{{^FieldName}}
  This content is shown only if FieldName IS empty.
{{/FieldName}}
```

#### Special Field: FrontSide

```
{{FrontSide}}
```

Available only in answer (back) templates. Replaced with the fully rendered question (front) HTML. This avoids duplicating the front template content in the answer template.

#### Special Field: Cloze Deletions

Cloze deletions allow hiding parts of text for fill-in-the-blank style cards.

**In the note field value**:
```
{{c1::Canberra}} is the capital of {{c2::Australia}}.
```

**In the template**:
```
{{cloze:FieldName}}
```

For card template ordinal 0 (c1), renders as:
```
[...] is the capital of Australia.
```
Answer shows: `Canberra is the capital of Australia.` (with Canberra highlighted).

For card template ordinal 1 (c2), renders as:
```
Canberra is the capital of [...].
```

Cloze also supports hints:
```
{{c1::Canberra::capital city}} is the capital of Australia.
```
Renders as: `[capital city] is the capital of Australia.`

#### Special Field: Type Answer

```
{{type:FieldName}}
```

Renders an input box on the question side. On the answer side, compares the user's typed input against the field value and shows a diff (correct characters in green, incorrect in red).

#### Special Field: Hint

```
{{hint:FieldName}}
```

Renders the field content hidden behind a clickable "Show Hint" button. When clicked, the content is revealed.

#### Special Field: Tags

```
{{Tags}}
```

Renders the note's tags as a space-separated string.

#### Template Rendering Implementation

```typescript
// packages/template-engine/src/renderer.ts

interface RenderContext {
  fields: Map<string, string>;    // fieldName -> HTML value
  isCloze: boolean;
  clozeOrdinal: number;           // Which cloze number (0-based)
  frontSideHtml?: string;         // Rendered front side for {{FrontSide}}
  tags: string[];                 // Note tags
}

/**
 * Renders a template string with the given context.
 */
function renderTemplate(context: RenderContext, templateStr: string): string {
  let result = templateStr;

  // 1. Process conditional sections (must be done first)
  result = processConditionals(result, context);

  // 2. Replace {{FrontSide}}
  if (context.frontSideHtml !== undefined) {
    result = result.replace(/\{\{FrontSide\}\}/gi, context.frontSideHtml);
  }

  // 3. Replace {{Tags}}
  result = result.replace(/\{\{Tags\}\}/gi, context.tags.join(' '));

  // 4. Process {{cloze:FieldName}}
  result = processClozeFields(result, context);

  // 5. Process {{type:FieldName}}
  result = processTypeFields(result, context);

  // 6. Process {{hint:FieldName}}
  result = processHintFields(result, context);

  // 7. Replace remaining {{FieldName}} references
  result = processBasicFields(result, context);

  return result;
}

/**
 * Processes {{#Field}}...{{/Field}} and {{^Field}}...{{/Field}} blocks.
 */
function processConditionals(template: string, context: RenderContext): string {
  // Positive conditional: show block if field is non-empty
  const positivePattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  let result = template.replace(positivePattern, (_, fieldName, content) => {
    const value = context.fields.get(fieldName) || '';
    const stripped = value.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0 ? content : '';
  });

  // Negative conditional: show block if field IS empty
  const negativePattern = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(negativePattern, (_, fieldName, content) => {
    const value = context.fields.get(fieldName) || '';
    const stripped = value.replace(/<[^>]*>/g, '').trim();
    return stripped.length === 0 ? content : '';
  });

  return result;
}

/**
 * Processes {{cloze:FieldName}} replacements.
 *
 * Cloze syntax in field values: {{c<N>::<text>}} or {{c<N>::<text>::<hint>}}
 * where N is a 1-based number matching the card template ordinal + 1.
 */
function processClozeFields(template: string, context: RenderContext): string {
  const clozeRefPattern = /\{\{cloze:(\w+)\}\}/g;

  return template.replace(clozeRefPattern, (_, fieldName) => {
    const fieldValue = context.fields.get(fieldName) || '';
    return renderCloze(fieldValue, context.clozeOrdinal);
  });
}

/**
 * Renders cloze deletions in a field value.
 *
 * For the active cloze (matching ordinal), the text is hidden (question side)
 * or highlighted (answer side).
 * For inactive clozes, the text is shown normally.
 */
function renderCloze(fieldValue: string, activeOrdinal: number): string {
  const clozePattern = /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g;

  return fieldValue.replace(clozePattern, (_, numStr, text, hint) => {
    const clozeNum = parseInt(numStr, 10);
    const isActive = clozeNum === activeOrdinal + 1; // ordinal is 0-based, cloze is 1-based

    if (isActive) {
      // This is the cloze being tested
      if (hint) {
        return `<span class="cloze-blank">[${hint}]</span>`;
      }
      return `<span class="cloze-blank">[...]</span>`;
    } else {
      // Show other clozes normally
      return text;
    }
  });
}

/**
 * Renders cloze answer (reveals the hidden text with highlighting).
 */
function renderClozeAnswer(fieldValue: string, activeOrdinal: number): string {
  const clozePattern = /\{\{c(\d+)::([^}]*?)(?:::([^}]*?))?\}\}/g;

  return fieldValue.replace(clozePattern, (_, numStr, text) => {
    const clozeNum = parseInt(numStr, 10);
    const isActive = clozeNum === activeOrdinal + 1;

    if (isActive) {
      return `<span class="cloze-reveal">${text}</span>`;
    } else {
      return text;
    }
  });
}

/**
 * Processes {{type:FieldName}} -- renders a text input for typed answers.
 */
function processTypeFields(template: string, context: RenderContext): string {
  const typePattern = /\{\{type:(\w+)\}\}/g;

  return template.replace(typePattern, (_, fieldName) => {
    return `<input type="text" class="type-answer-input"
                   data-field="${fieldName}"
                   id="type-answer-${fieldName}"
                   autocomplete="off"
                   autocapitalize="off"
                   placeholder="Type your answer..." />`;
  });
}

/**
 * Processes {{hint:FieldName}} -- renders a collapsible hint.
 */
function processHintFields(template: string, context: RenderContext): string {
  const hintPattern = /\{\{hint:(\w+)\}\}/g;

  return template.replace(hintPattern, (_, fieldName) => {
    const value = context.fields.get(fieldName) || '';
    if (!value.trim()) return '';

    return `<details class="hint-toggle">
              <summary class="hint-button">Show Hint</summary>
              <div class="hint-content">${value}</div>
            </details>`;
  });
}

/**
 * Replaces all remaining {{FieldName}} with their values.
 */
function processBasicFields(template: string, context: RenderContext): string {
  const fieldPattern = /\{\{([^#/^}][^}]*)\}\}/g;

  return template.replace(fieldPattern, (_, fieldName) => {
    const trimmed = fieldName.trim();
    return context.fields.get(trimmed) || '';
  });
}
```

### TypeScript Type Definitions

```typescript
// packages/shared-types/src/models/note.ts

export interface Note {
  id: string;
  userId: string;
  noteTypeId: string;
  guid: string;
  fieldValues: Record<string, string>;  // fieldName -> HTML value
  tags: string[];
  checksum: number;
  usn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteType {
  id: string;
  userId: string;
  name: string;
  description?: string;
  css: string;
  isCloze: boolean;
  fields: Field[];
  cardTemplates: CardTemplate[];
  sortFieldId?: string;
  usn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Field {
  id: string;
  noteTypeId: string;
  name: string;
  ordinal: number;
  description?: string;
  isRichText: boolean;
  isRtl: boolean;
  fontFamily: string;
  fontSize: number;
  sticky: boolean;
  placeholder?: string;
}

export interface CardTemplate {
  id: string;
  noteTypeId: string;
  name: string;
  ordinal: number;
  questionFormat: string;
  answerFormat: string;
  questionCss?: string;
  answerCss?: string;
  browserQuestionFormat?: string;
  browserAnswerFormat?: string;
  deckOverrideId?: string;
}

// packages/shared-types/src/models/card.ts

export type CardQueue =
  | 'new'
  | 'learning'
  | 'review'
  | 'relearning'
  | 'day_learning'
  | 'buried_sibling'
  | 'buried_manual'
  | 'paused';

export type CardStatus = 'active' | 'paused' | 'skipped_today';

export interface Card {
  id: string;
  noteId: string;
  cardTemplateId: string;
  deckId: string;
  originalDeckId?: string;

  // Scheduling
  queue: CardQueue;
  status: CardStatus;
  due: number;
  intervalDays: number;
  easeFactor: number;       // *1000, so 2500 = 2.5
  reviewCount: number;
  lapseCount: number;

  // FSRS
  stability?: number;
  difficulty?: number;
  lastReviewAt?: Date;

  // Learning
  learningStep: number;
  remainingSteps: number;

  // Metadata
  flags: number;
  pauseResumeDate?: Date;
  leechFlagged: boolean;

  usn: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewAnswer = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewLog {
  id: string;
  cardId: string;
  userId: string;
  answer: ReviewAnswer;
  reviewedAt: Date;
  timeTakenMs: number;
  previousQueue: CardQueue;
  previousInterval: number;
  previousEase: number;
  previousStability?: number;
  previousDifficulty?: number;
  newQueue: CardQueue;
  newInterval: number;
  newEase: number;
  newStability?: number;
  newDifficulty?: number;
  algorithmUsed: 'sm2' | 'fsrs5';
  scheduledDays: number;
  elapsedDays: number;
}
```

---

## 1.3 Tagging System

### Design Principles

Tags are applied at the **note level**, not the card level. This is a deliberate design decision: since cards are generated from notes, tagging the note automatically applies to all its generated cards. This avoids the complexity and inconsistency of tagging individual cards differently when they share the same source material.

The tagging system supports:
- **Hierarchical tags** via a parent-child relationship (e.g., `Science::Biology::Genetics`)
- **Tag metadata**: colors, icons, and descriptions for visual organization
- **Efficient querying**: proper relational model with junction table (not a denormalized string column)

### SQL Schema

```sql
-- ============================================================================
-- TAGGING SYSTEM
-- ============================================================================

CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,            -- Tag display name (leaf only)
    slug            VARCHAR(200) NOT NULL,            -- URL-safe version of name
    full_path       VARCHAR(1000) NOT NULL,           -- Full hierarchical path: "Science::Biology::Genetics"
    parent_id       UUID REFERENCES tags(id) ON DELETE CASCADE,
    depth           SMALLINT NOT NULL DEFAULT 0,      -- 0 = root, 1 = child, etc.
    description     TEXT,
    color           VARCHAR(7),                       -- Hex color: "#FF5733"
    icon            VARCHAR(100),                     -- Icon identifier: "flask", "book", "brain"
    card_count      INTEGER NOT NULL DEFAULT 0,       -- Denormalized count for performance
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, full_path)
);

CREATE INDEX idx_tags_user ON tags (user_id);
CREATE INDEX idx_tags_parent ON tags (parent_id);
CREATE INDEX idx_tags_path ON tags (user_id, full_path);
CREATE INDEX idx_tags_slug ON tags (user_id, slug);
CREATE INDEX idx_tags_depth ON tags (user_id, depth);

-- Full-text search on tag names
CREATE INDEX idx_tags_fts ON tags USING GIN (to_tsvector('simple', name));

-- Junction table: many-to-many relationship between notes and tags
CREATE TABLE note_tags (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_note ON note_tags (note_id);
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

### Hierarchical Tag Operations

**Creating a Hierarchical Tag**:

When a user creates the tag `Science::Biology::Genetics`, the system must ensure all ancestor tags exist:

```typescript
// apps/api/src/services/tag-service.ts

async function createHierarchicalTag(
  userId: string,
  fullPath: string,      // e.g., "Science::Biology::Genetics"
  metadata?: { color?: string; icon?: string; description?: string }
): Promise<Tag[]> {
  const parts = fullPath.split('::').map(p => p.trim()).filter(Boolean);
  const createdTags: Tag[] = [];

  await db.transaction(async (trx) => {
    let parentId: string | null = null;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const slug = slugify(name);
      currentPath = currentPath ? `${currentPath}::${name}` : name;

      // Try to find existing tag at this path
      let tag = await trx('tags')
        .where({ user_id: userId, full_path: currentPath })
        .first();

      if (!tag) {
        // Create the tag
        const isLeaf = i === parts.length - 1;
        const tagData = {
          user_id: userId,
          name,
          slug,
          full_path: currentPath,
          parent_id: parentId,
          depth: i,
          // Only apply metadata to the leaf (target) tag
          ...(isLeaf && metadata ? {
            color: metadata.color,
            icon: metadata.icon,
            description: metadata.description,
          } : {}),
        };

        [tag] = await trx('tags').insert(tagData).returning('*');
      }

      createdTags.push(tag);
      parentId = tag.id;
    }
  });

  return createdTags;
}
```

### Tag Query Examples

**Find all notes with a specific tag (including descendants)**:

```sql
-- Find all notes tagged with "Science" or any sub-tag of "Science"
SELECT DISTINCT n.*
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id
WHERE t.user_id = :userId
  AND (t.full_path = 'Science' OR t.full_path LIKE 'Science::%');
```

**Get tag tree for a user**:

```sql
-- Returns all tags organized as a tree (use recursive CTE for full tree)
WITH RECURSIVE tag_tree AS (
    -- Base case: root tags (no parent)
    SELECT id, name, full_path, parent_id, depth, color, icon, card_count, 0 as tree_order
    FROM tags
    WHERE user_id = :userId AND parent_id IS NULL

    UNION ALL

    -- Recursive case: children
    SELECT t.id, t.name, t.full_path, t.parent_id, t.depth, t.color, t.icon,
           t.card_count, tt.tree_order + 1
    FROM tags t
    JOIN tag_tree tt ON t.parent_id = tt.id
)
SELECT * FROM tag_tree
ORDER BY full_path;
```

**Find notes matching multiple tags (AND logic)**:

```sql
-- Notes that have BOTH "Science::Biology" AND "Exam::Final"
SELECT n.*
FROM notes n
WHERE n.user_id = :userId
  AND n.id IN (
    SELECT nt.note_id
    FROM note_tags nt
    JOIN tags t ON nt.tag_id = t.id
    WHERE t.full_path = 'Science::Biology' OR t.full_path LIKE 'Science::Biology::%'
  )
  AND n.id IN (
    SELECT nt.note_id
    FROM note_tags nt
    JOIN tags t ON nt.tag_id = t.id
    WHERE t.full_path = 'Exam::Final' OR t.full_path LIKE 'Exam::Final::%'
  );
```

**Find notes matching any of several tags (OR logic)**:

```sql
-- Notes that have "Science::Biology" OR "Science::Chemistry"
SELECT DISTINCT n.*
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id
WHERE n.user_id = :userId
  AND (
    t.full_path IN ('Science::Biology', 'Science::Chemistry')
    OR t.full_path LIKE 'Science::Biology::%'
    OR t.full_path LIKE 'Science::Chemistry::%'
  );
```

**Get tag usage statistics**:

```sql
-- Count notes per tag (including notes tagged with descendant tags)
WITH RECURSIVE tag_descendants AS (
    SELECT id, full_path, parent_id
    FROM tags WHERE user_id = :userId

    UNION ALL

    SELECT t.id, t.full_path, t.parent_id
    FROM tags t
    JOIN tag_descendants td ON t.parent_id = td.id
)
SELECT
    t.id,
    t.name,
    t.full_path,
    t.color,
    t.icon,
    COUNT(DISTINCT nt.note_id) as note_count
FROM tags t
LEFT JOIN tag_descendants td ON td.full_path LIKE t.full_path || '::%' OR td.id = t.id
LEFT JOIN note_tags nt ON nt.tag_id = td.id
WHERE t.user_id = :userId
GROUP BY t.id, t.name, t.full_path, t.color, t.icon
ORDER BY t.full_path;
```

### Tag Management API

```
Tag Management API Endpoints
==============================================================================

POST   /api/v1/tags                    Create a new tag (handles hierarchy)
GET    /api/v1/tags                    List all tags (flat or tree)
GET    /api/v1/tags/:id                Get a single tag with metadata
PUT    /api/v1/tags/:id                Update tag name, color, icon, description
DELETE /api/v1/tags/:id                Delete tag (and optionally descendants)
POST   /api/v1/tags/:id/merge          Merge this tag into another tag
GET    /api/v1/tags/:id/notes          List notes with this tag
GET    /api/v1/tags/search?q=          Search tags by name

POST   /api/v1/notes/:noteId/tags      Add tags to a note
DELETE /api/v1/notes/:noteId/tags/:tagId  Remove a tag from a note
PUT    /api/v1/notes/:noteId/tags       Replace all tags on a note
```

**Request/Response Examples**:

```typescript
// POST /api/v1/tags
// Request:
{
  "fullPath": "Science::Biology::Genetics",
  "color": "#4CAF50",
  "icon": "dna",
  "description": "Genetics and heredity topics"
}

// Response:
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Genetics",
    "slug": "genetics",
    "fullPath": "Science::Biology::Genetics",
    "parentId": "660e8400-e29b-41d4-a716-446655440000",
    "depth": 2,
    "color": "#4CAF50",
    "icon": "dna",
    "description": "Genetics and heredity topics",
    "cardCount": 0,
    "createdAt": "2026-02-19T10:00:00Z",
    "updatedAt": "2026-02-19T10:00:00Z",
    "ancestors": [
      { "id": "...", "name": "Science", "fullPath": "Science" },
      { "id": "...", "name": "Biology", "fullPath": "Science::Biology" }
    ]
  }
}

// GET /api/v1/tags?format=tree
// Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Science",
      "fullPath": "Science",
      "color": "#2196F3",
      "icon": "flask",
      "cardCount": 150,
      "children": [
        {
          "id": "...",
          "name": "Biology",
          "fullPath": "Science::Biology",
          "color": "#4CAF50",
          "icon": "leaf",
          "cardCount": 80,
          "children": [
            {
              "id": "...",
              "name": "Genetics",
              "fullPath": "Science::Biology::Genetics",
              "color": "#4CAF50",
              "icon": "dna",
              "cardCount": 30,
              "children": []
            }
          ]
        },
        {
          "id": "...",
          "name": "Chemistry",
          "fullPath": "Science::Chemistry",
          "cardCount": 70,
          "children": []
        }
      ]
    },
    {
      "id": "...",
      "name": "Languages",
      "fullPath": "Languages",
      "cardCount": 200,
      "children": [
        {
          "id": "...",
          "name": "Japanese",
          "fullPath": "Languages::Japanese",
          "cardCount": 200,
          "children": []
        }
      ]
    }
  ]
}
```

### Tag Renaming and Moving

When a tag is renamed or moved in the hierarchy, all descendant tags must have their `full_path` updated:

```typescript
async function renameTag(tagId: string, newName: string): Promise<void> {
  await db.transaction(async (trx) => {
    const tag = await trx('tags').where({ id: tagId }).first();
    if (!tag) throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Tag not found', 404);

    const oldPath = tag.full_path;
    const parentPath = oldPath.includes('::')
      ? oldPath.substring(0, oldPath.lastIndexOf('::'))
      : '';
    const newPath = parentPath ? `${parentPath}::${newName}` : newName;

    // Update this tag
    await trx('tags').where({ id: tagId }).update({
      name: newName,
      slug: slugify(newName),
      full_path: newPath,
      updated_at: new Date(),
    });

    // Update all descendant paths
    // Replace the old path prefix with the new one
    await trx.raw(`
      UPDATE tags
      SET full_path = :newPath || substring(full_path from :oldLen + 1),
          updated_at = NOW()
      WHERE full_path LIKE :oldPattern
        AND user_id = :userId
    `, {
      newPath,
      oldLen: oldPath.length,
      oldPattern: `${oldPath}::%`,
      userId: tag.user_id,
    });
  });
}
```

---

## 1.4 Deck System

### Overview

Decks organize cards into study collections. The deck system supports:

- **Hierarchical decks**: Decks can be nested (e.g., `Medical::Anatomy::Upper Limb`) with a parent-child tree structure similar to tags.
- **Deck presets**: Shared scheduling configuration sets that can be applied to multiple decks. This avoids duplicating settings across decks.
- **Filtered decks**: Dynamic decks that pull cards from other decks based on search queries. Cards remain in their home deck but appear temporarily in the filtered deck.

### SQL Schema

```sql
-- ============================================================================
-- DECK SYSTEM
-- ============================================================================

-- Deck presets: shared scheduling/behavior configuration
CREATE TABLE deck_presets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    VARCHAR(200) NOT NULL,
    is_default              BOOLEAN NOT NULL DEFAULT FALSE,

    -- New card settings
    new_cards_per_day       INTEGER NOT NULL DEFAULT 20,
    new_card_order          VARCHAR(20) NOT NULL DEFAULT 'added',
                            -- 'added' | 'random' | 'due_before_new' | 'new_before_due'
    new_card_gather_order   VARCHAR(20) NOT NULL DEFAULT 'deck',
                            -- 'deck' | 'position' | 'random'
    learning_steps          TEXT NOT NULL DEFAULT '1m 10m',
                            -- Space-separated steps, e.g., "1m 10m" = 1 min then 10 min
    graduating_interval     INTEGER NOT NULL DEFAULT 1,      -- Days
    easy_interval           INTEGER NOT NULL DEFAULT 4,      -- Days

    -- Review settings
    max_reviews_per_day     INTEGER NOT NULL DEFAULT 200,
    easy_bonus              REAL NOT NULL DEFAULT 1.3,
    interval_modifier       REAL NOT NULL DEFAULT 1.0,       -- Global multiplier on intervals
    maximum_interval        INTEGER NOT NULL DEFAULT 36500,   -- Max interval in days (100 years)
    hard_interval_modifier  REAL NOT NULL DEFAULT 1.2,

    -- Lapse settings
    relearning_steps        TEXT NOT NULL DEFAULT '10m',     -- Steps when card lapses
    minimum_interval        INTEGER NOT NULL DEFAULT 1,      -- Min interval after lapse (days)
    leech_threshold         INTEGER NOT NULL DEFAULT 8,      -- Lapse count to flag as leech
    leech_action            VARCHAR(20) NOT NULL DEFAULT 'tag_only',
                            -- 'tag_only' | 'pause' (was: 'suspend')

    -- Display settings
    show_remaining_due_count BOOLEAN NOT NULL DEFAULT TRUE,
    show_next_review_time    BOOLEAN NOT NULL DEFAULT TRUE,
    auto_play_audio          BOOLEAN NOT NULL DEFAULT TRUE,
    replay_question_audio    BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timer
    max_answer_seconds       INTEGER NOT NULL DEFAULT 60,    -- Cap on time recording
    show_timer               BOOLEAN NOT NULL DEFAULT FALSE,

    -- Burying
    bury_new_siblings        BOOLEAN NOT NULL DEFAULT TRUE,
    bury_review_siblings     BOOLEAN NOT NULL DEFAULT TRUE,
    bury_interday_siblings   BOOLEAN NOT NULL DEFAULT FALSE,

    -- FSRS-specific settings (used when algorithm is FSRS-5)
    desired_retention        REAL NOT NULL DEFAULT 0.9,       -- Target retention rate (0-1)
    fsrs_weights             TEXT,                            -- JSON array of FSRS-5 model weights

    -- Algorithm selection
    scheduling_algorithm     VARCHAR(20) NOT NULL DEFAULT 'fsrs5',
                             -- 'sm2' | 'fsrs5'

    usn                     BIGINT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, name)
);

CREATE INDEX idx_deck_presets_user ON deck_presets (user_id);

-- Decks
CREATE TABLE decks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,         -- Leaf name only
    full_name           VARCHAR(1000) NOT NULL,        -- Full path: "Medical::Anatomy::Upper Limb"
    slug                VARCHAR(200) NOT NULL,
    parent_id           UUID REFERENCES decks(id) ON DELETE CASCADE,
    depth               SMALLINT NOT NULL DEFAULT 0,
    preset_id           UUID NOT NULL REFERENCES deck_presets(id) ON DELETE RESTRICT,
    description         TEXT,
    color               VARCHAR(7),                    -- Hex color
    icon                VARCHAR(100),

    -- Filtered deck settings (NULL for regular decks)
    is_filtered         BOOLEAN NOT NULL DEFAULT FALSE,
    filter_query        TEXT,                          -- Search query for filtered decks
    filter_order        VARCHAR(20),                   -- 'oldest_due' | 'random' | 'added' | 'relative_overdue'
    filter_limit        INTEGER,                       -- Max cards to include
    filter_reschedule   BOOLEAN DEFAULT TRUE,          -- Whether to reschedule after filtered review

    -- Position tracking for new cards
    new_card_position   INTEGER NOT NULL DEFAULT 0,    -- Next position for new cards

    -- Denormalized counts (updated via triggers or application logic)
    total_card_count    INTEGER NOT NULL DEFAULT 0,
    new_count           INTEGER NOT NULL DEFAULT 0,
    learn_count         INTEGER NOT NULL DEFAULT 0,
    review_count        INTEGER NOT NULL DEFAULT 0,

    -- Collapse state in UI
    is_collapsed        BOOLEAN NOT NULL DEFAULT FALSE,

    usn                 BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, full_name)
);

CREATE INDEX idx_decks_user ON decks (user_id);
CREATE INDEX idx_decks_parent ON decks (parent_id);
CREATE INDEX idx_decks_preset ON decks (preset_id);
CREATE INDEX idx_decks_filtered ON decks (is_filtered) WHERE is_filtered = TRUE;
CREATE INDEX idx_decks_full_name ON decks (user_id, full_name);
```

### Deck Hierarchy Operations

```typescript
// apps/api/src/services/deck-service.ts

interface DeckTreeNode {
  id: string;
  name: string;
  fullName: string;
  depth: number;
  color?: string;
  icon?: string;
  newCount: number;
  learnCount: number;
  reviewCount: number;
  totalCardCount: number;
  isCollapsed: boolean;
  children: DeckTreeNode[];
}

/**
 * Builds the deck tree for display on the main screen.
 * Aggregates counts from child decks to parent decks.
 */
async function getDeckTree(userId: string): Promise<DeckTreeNode[]> {
  const allDecks = await db('decks')
    .where({ user_id: userId })
    .orderBy('full_name');

  // Build a map for quick lookup
  const deckMap = new Map<string, DeckTreeNode>();
  const roots: DeckTreeNode[] = [];

  for (const deck of allDecks) {
    const node: DeckTreeNode = {
      id: deck.id,
      name: deck.name,
      fullName: deck.full_name,
      depth: deck.depth,
      color: deck.color,
      icon: deck.icon,
      newCount: deck.new_count,
      learnCount: deck.learn_count,
      reviewCount: deck.review_count,
      totalCardCount: deck.total_card_count,
      isCollapsed: deck.is_collapsed,
      children: [],
    };
    deckMap.set(deck.id, node);

    if (deck.parent_id && deckMap.has(deck.parent_id)) {
      deckMap.get(deck.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Aggregate child counts into parents (bottom-up)
  function aggregateCounts(node: DeckTreeNode): void {
    for (const child of node.children) {
      aggregateCounts(child);
      node.newCount += child.newCount;
      node.learnCount += child.learnCount;
      node.reviewCount += child.reviewCount;
      node.totalCardCount += child.totalCardCount;
    }
  }

  for (const root of roots) {
    aggregateCounts(root);
  }

  return roots;
}
```

### Filtered Decks

Filtered decks dynamically collect cards from other decks based on a search query. When a user studies in a filtered deck, cards are temporarily "borrowed" from their home deck.

```typescript
/**
 * Rebuilds a filtered deck by executing its search query
 * and moving matching cards into the filtered deck.
 */
async function rebuildFilteredDeck(deckId: string): Promise<number> {
  const deck = await db('decks').where({ id: deckId }).first();

  if (!deck || !deck.is_filtered) {
    throw new AppError(ErrorCode.VALIDATION_CONSTRAINT_VIOLATION,
      'Not a filtered deck', 400);
  }

  return await db.transaction(async (trx) => {
    // 1. Return any currently borrowed cards to their home decks
    await trx('cards')
      .where({ deck_id: deckId })
      .whereNotNull('original_deck_id')
      .update({
        deck_id: trx.raw('original_deck_id'),
        original_deck_id: null,
        updated_at: new Date(),
      });

    // 2. Parse the filter query and find matching cards
    const searchAst = parseSearchQuery(deck.filter_query);
    const sqlWhere = compileSearchToSql(searchAst, deck.user_id);

    // 3. Build the query for matching cards
    let query = trx('cards')
      .join('notes', 'cards.note_id', 'notes.id')
      .where('notes.user_id', deck.user_id)
      .where('cards.status', 'active')
      .whereNot('cards.deck_id', deckId)       // Not already in this deck
      .whereRaw(sqlWhere.clause, sqlWhere.params);

    // Apply order
    switch (deck.filter_order) {
      case 'oldest_due':
        query = query.orderBy('cards.due', 'asc');
        break;
      case 'random':
        query = query.orderByRaw('RANDOM()');
        break;
      case 'added':
        query = query.orderBy('cards.created_at', 'asc');
        break;
      case 'relative_overdue':
        query = query.orderByRaw(
          '(EXTRACT(EPOCH FROM NOW()) - cards.due) / GREATEST(cards.interval_days, 1) DESC'
        );
        break;
    }

    // Apply limit
    if (deck.filter_limit) {
      query = query.limit(deck.filter_limit);
    }

    const matchingCards = await query.select('cards.id', 'cards.deck_id');

    // 4. Move cards into the filtered deck
    const cardIds = matchingCards.map((c: { id: string }) => c.id);
    if (cardIds.length > 0) {
      await trx('cards')
        .whereIn('id', cardIds)
        .update({
          original_deck_id: trx.raw('deck_id'),  // Save home deck
          deck_id: deckId,
          updated_at: new Date(),
        });
    }

    return cardIds.length;
  });
}
```

### Deck API Endpoints

```
Deck Management API
==============================================================================

POST   /api/v1/decks                      Create a new deck
GET    /api/v1/decks                      List all decks (tree structure)
GET    /api/v1/decks/:id                  Get deck details with counts
PUT    /api/v1/decks/:id                  Update deck properties
DELETE /api/v1/decks/:id                  Delete deck (move cards or delete)
POST   /api/v1/decks/:id/rename           Rename deck (updates hierarchy)
POST   /api/v1/decks/:id/move             Move deck to new parent

Filtered Deck Operations:
POST   /api/v1/decks/filtered             Create a filtered deck
POST   /api/v1/decks/:id/rebuild          Rebuild filtered deck
POST   /api/v1/decks/:id/empty            Return all cards to home decks

Deck Preset Operations:
POST   /api/v1/deck-presets               Create a new preset
GET    /api/v1/deck-presets               List all presets
GET    /api/v1/deck-presets/:id           Get preset details
PUT    /api/v1/deck-presets/:id           Update preset
DELETE /api/v1/deck-presets/:id           Delete preset (if not in use)
POST   /api/v1/deck-presets/:id/apply     Apply preset to deck(s)

Study Session:
GET    /api/v1/decks/:id/study            Get next card(s) for study
POST   /api/v1/decks/:id/study/answer     Submit an answer for current card
GET    /api/v1/decks/:id/counts           Get new/learn/review counts
```

**Study Session Request/Response**:

```typescript
// GET /api/v1/decks/:id/study
// Response:
{
  "success": true,
  "data": {
    "card": {
      "id": "card-uuid",
      "noteId": "note-uuid",
      "templateName": "Recognition",
      "questionHtml": "<div class='front'>ephemeral</div>",
      "deckName": "Vocabulary::English",
      "queue": "review",
      "flags": 0
    },
    "counts": {
      "new": 15,
      "learning": 3,
      "review": 42
    },
    "scheduling": {
      // Preview of what each answer button would do
      "again": { "interval": "10m", "description": "10 minutes" },
      "hard":  { "interval": "8d",  "description": "8 days" },
      "good":  { "interval": "15d", "description": "15 days" },
      "easy":  { "interval": "45d", "description": "45 days" }
    }
  }
}

// POST /api/v1/decks/:id/study/answer
// Request:
{
  "cardId": "card-uuid",
  "answer": "good",          // "again" | "hard" | "good" | "easy"
  "timeTakenMs": 4200        // Time spent viewing card
}

// Response:
{
  "success": true,
  "data": {
    "nextCard": { /* same structure as above, or null if session complete */ },
    "reviewLog": {
      "id": "log-uuid",
      "previousInterval": 10,
      "newInterval": 15,
      "answer": "good"
    },
    "counts": {
      "new": 15,
      "learning": 3,
      "review": 41
    }
  }
}
```

---

## 1.5 Spaced Repetition Scheduling

### Overview

The scheduling engine is the heart of the flashcard system. It determines when each card should be shown to the user for review, based on the user's past performance. The system supports two scheduling algorithms:

1. **SM-2 (SuperMemo 2)**: The classic algorithm used by Anki since its inception. Well-understood, battle-tested, but limited in its ability to model memory accurately.
2. **FSRS-5 (Free Spaced Repetition Scheduler v5)**: A modern, machine-learning-based algorithm that models memory more accurately using a three-component model of memory (stability, difficulty, retrievability).

Both algorithms are implemented behind a common interface, allowing users to switch between them or for the system to A/B test them.

### Card State Machine

Cards progress through a well-defined state machine:

```
                         +---------+
                         |   NEW   |
                         +----+----+
                              |
                   First review (any answer)
                              |
                              v
                       +-----------+
               +------>| LEARNING  |<------+
               |       +-----+-----+      |
               |             |             |
               |        Steps completed    |   Answer: Again
               |        (graduated)        |   (restart steps)
               |             |             |
               |             v             |
               |       +-----------+       |
               |       |  REVIEW   +-------+
               |       +-----+-----+
               |             |
               |        Answer: Again
               |        (lapsed)
               |             |
               |             v
               |      +-------------+
               +------| RELEARNING  |
                      +-------------+
                      (steps complete -> back to REVIEW)

    At any point, a card can be:
    - PAUSED (removed from all queues, indefinitely or until resume_date)
    - SKIPPED_TODAY (buried, removed for today only, auto-unburied next day)
    - BURIED_SIBLING (auto-buried because a sibling was reviewed)
```

**State Transitions Table**:

| Current State | Answer | Next State | Notes |
|---|---|---|---|
| New | Any | Learning | Enters first learning step |
| Learning | Again | Learning | Restarts at first step |
| Learning | Hard | Learning | Repeats current step (or slightly longer) |
| Learning | Good | Learning/Review | Advances to next step; if last step, graduates to Review |
| Learning | Easy | Review | Immediately graduates with easy interval |
| Review | Again | Relearning | Card has lapsed; enters relearning steps; lapse count incremented |
| Review | Hard | Review | Interval multiplied by hard modifier (typically 1.2x) |
| Review | Good | Review | Normal interval increase |
| Review | Easy | Review | Interval with easy bonus applied |
| Relearning | Again | Relearning | Restarts relearning steps |
| Relearning | Hard | Relearning | Repeats current step |
| Relearning | Good | Relearning/Review | Advances step; if last step, returns to Review |
| Relearning | Easy | Review | Immediately returns to Review with bonus |

### SM-2 Algorithm

SM-2 (SuperMemo 2) is the traditional scheduling algorithm. It uses an ease factor that adjusts based on performance and a simple interval calculation.

#### Core Formulas

**Ease Factor Update**:

```
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

Where:
  EF  = current ease factor (minimum 1.3)
  EF' = new ease factor
  q   = answer quality (mapped from button press):
        Again = 1, Hard = 2, Good = 3, Easy = 5
```

Note: The system stores ease factor as an integer multiplied by 1000 (e.g., 2500 = 2.5) to avoid floating-point issues.

**Interval Calculation**:

```
For new cards (first review):
  If Good: interval = graduating_interval (default: 1 day)
  If Easy: interval = easy_interval (default: 4 days)

For review cards:
  If Again: interval = max(minimum_interval, current_interval * 0.0)
            (reset to minimum; card enters relearning)
  If Hard:  interval = current_interval * 1.2 * interval_modifier
  If Good:  interval = current_interval * ease_factor * interval_modifier
  If Easy:  interval = current_interval * ease_factor * easy_bonus * interval_modifier

All intervals are capped at maximum_interval (default: 36500 days = 100 years).
```

**Fuzz Factor** (prevents cards from clumping on the same day):

```
fuzz_range = {
  interval < 2.5:   0 (no fuzz)
  interval < 7:     round(interval * 0.25)
  interval < 30:    max(2, round(interval * 0.15))
  else:             max(4, round(interval * 0.05))
}
fuzzed_interval = interval + random(-fuzz_range, +fuzz_range)
```

#### SM-2 TypeScript Implementation

```typescript
// packages/scheduling-engine/src/sm2.ts

interface SM2Config {
  learningSteps: number[];      // In minutes: [1, 10]
  graduatingInterval: number;   // Days
  easyInterval: number;         // Days
  relearningSteps: number[];    // In minutes: [10]
  minimumInterval: number;      // Days after lapse
  maximumInterval: number;      // Max days
  easyBonus: number;            // Multiplier (1.3)
  hardIntervalModifier: number; // Multiplier (1.2)
  intervalModifier: number;     // Global modifier (1.0)
  startingEase: number;         // Initial ease * 1000 (2500)
}

interface SM2CardState {
  queue: CardQueue;
  intervalDays: number;
  easeFactor: number;       // * 1000
  learningStep: number;
  lapseCount: number;
  due: number;              // Day number or timestamp
}

interface SchedulingResult {
  newState: SM2CardState;
  scheduledDays: number;
  nextReviewAt: Date;
}

type AnswerButton = 'again' | 'hard' | 'good' | 'easy';

const DEFAULT_SM2_CONFIG: SM2Config = {
  learningSteps: [1, 10],        // 1 minute, then 10 minutes
  graduatingInterval: 1,
  easyInterval: 4,
  relearningSteps: [10],
  minimumInterval: 1,
  maximumInterval: 36500,
  easyBonus: 1.3,
  hardIntervalModifier: 1.2,
  intervalModifier: 1.0,
  startingEase: 2500,
};

class SM2Scheduler {
  constructor(private config: SM2Config = DEFAULT_SM2_CONFIG) {}

  /**
   * Calculate the next state for a card given an answer.
   */
  schedule(card: SM2CardState, answer: AnswerButton, now: Date): SchedulingResult {
    switch (card.queue) {
      case 'new':
      case 'learning':
        return this.scheduleLearning(card, answer, now);
      case 'review':
        return this.scheduleReview(card, answer, now);
      case 'relearning':
        return this.scheduleRelearning(card, answer, now);
      default:
        throw new Error(`Cannot schedule card in queue: ${card.queue}`);
    }
  }

  /**
   * Preview what each answer button would produce (for UI display).
   */
  preview(card: SM2CardState, now: Date): Record<AnswerButton, { interval: string; days: number }> {
    const results: Record<string, { interval: string; days: number }> = {};
    for (const answer of ['again', 'hard', 'good', 'easy'] as AnswerButton[]) {
      const result = this.schedule({ ...card }, answer, now);
      results[answer] = {
        interval: formatInterval(result.scheduledDays),
        days: result.scheduledDays,
      };
    }
    return results as Record<AnswerButton, { interval: string; days: number }>;
  }

  private scheduleLearning(
    card: SM2CardState,
    answer: AnswerButton,
    now: Date
  ): SchedulingResult {
    const steps = this.config.learningSteps;
    const newState = { ...card };

    switch (answer) {
      case 'again': {
        // Reset to first step
        newState.learningStep = 0;
        newState.queue = 'learning';
        const delayMinutes = steps[0];
        newState.due = now.getTime() + delayMinutes * 60 * 1000;
        return {
          newState,
          scheduledDays: 0,
          nextReviewAt: new Date(newState.due),
        };
      }

      case 'hard': {
        // Repeat current step (or average of current and next)
        newState.queue = 'learning';
        const currentStep = steps[Math.min(card.learningStep, steps.length - 1)];
        const nextStep = steps[Math.min(card.learningStep + 1, steps.length - 1)];
        const delayMinutes = Math.round((currentStep + nextStep) / 2);
        newState.due = now.getTime() + delayMinutes * 60 * 1000;
        return {
          newState,
          scheduledDays: 0,
          nextReviewAt: new Date(newState.due),
        };
      }

      case 'good': {
        if (card.learningStep >= steps.length - 1) {
          // Graduate to review queue
          newState.queue = 'review';
          newState.intervalDays = this.config.graduatingInterval;
          newState.easeFactor = card.easeFactor || this.config.startingEase;
          newState.learningStep = 0;
          newState.due = dayNumber(now) + newState.intervalDays;
          return {
            newState,
            scheduledDays: newState.intervalDays,
            nextReviewAt: addDays(now, newState.intervalDays),
          };
        } else {
          // Move to next step
          newState.learningStep = card.learningStep + 1;
          newState.queue = 'learning';
          const delayMinutes = steps[newState.learningStep];
          newState.due = now.getTime() + delayMinutes * 60 * 1000;
          return {
            newState,
            scheduledDays: 0,
            nextReviewAt: new Date(newState.due),
          };
        }
      }

      case 'easy': {
        // Immediately graduate with easy interval
        newState.queue = 'review';
        newState.intervalDays = this.config.easyInterval;
        newState.easeFactor = card.easeFactor || this.config.startingEase;
        newState.learningStep = 0;
        newState.due = dayNumber(now) + newState.intervalDays;
        return {
          newState,
          scheduledDays: newState.intervalDays,
          nextReviewAt: addDays(now, newState.intervalDays),
        };
      }
    }
  }

  private scheduleReview(
    card: SM2CardState,
    answer: AnswerButton,
    now: Date
  ): SchedulingResult {
    const newState = { ...card };
    const ef = card.easeFactor / 1000;  // Convert from stored integer

    switch (answer) {
      case 'again': {
        // Card has lapsed
        newState.queue = 'relearning';
        newState.lapseCount = card.lapseCount + 1;
        newState.learningStep = 0;

        // Reduce ease factor
        newState.easeFactor = Math.max(1300, card.easeFactor - 200);

        // Set interval for after relearning completes
        newState.intervalDays = Math.max(
          this.config.minimumInterval,
          Math.round(card.intervalDays * 0.0) // Reset to minimum
        );

        // Schedule for first relearning step
        const delayMinutes = this.config.relearningSteps[0] || 10;
        newState.due = now.getTime() + delayMinutes * 60 * 1000;

        return {
          newState,
          scheduledDays: 0,
          nextReviewAt: new Date(newState.due),
        };
      }

      case 'hard': {
        const newInterval = this.constrainInterval(
          card.intervalDays * this.config.hardIntervalModifier * this.config.intervalModifier
        );
        newState.intervalDays = newInterval;
        newState.easeFactor = Math.max(1300, card.easeFactor - 150);
        newState.due = dayNumber(now) + newInterval;
        return {
          newState,
          scheduledDays: newInterval,
          nextReviewAt: addDays(now, newInterval),
        };
      }

      case 'good': {
        const newInterval = this.constrainInterval(
          card.intervalDays * ef * this.config.intervalModifier
        );
        newState.intervalDays = this.applyFuzz(newInterval);
        newState.due = dayNumber(now) + newState.intervalDays;
        // Ease stays the same for 'good'
        return {
          newState,
          scheduledDays: newState.intervalDays,
          nextReviewAt: addDays(now, newState.intervalDays),
        };
      }

      case 'easy': {
        const newInterval = this.constrainInterval(
          card.intervalDays * ef * this.config.easyBonus * this.config.intervalModifier
        );
        newState.intervalDays = this.applyFuzz(newInterval);
        newState.easeFactor = card.easeFactor + 150;
        newState.due = dayNumber(now) + newState.intervalDays;
        return {
          newState,
          scheduledDays: newState.intervalDays,
          nextReviewAt: addDays(now, newState.intervalDays),
        };
      }
    }
  }

  private scheduleRelearning(
    card: SM2CardState,
    answer: AnswerButton,
    now: Date
  ): SchedulingResult {
    const steps = this.config.relearningSteps;
    const newState = { ...card };

    switch (answer) {
      case 'again': {
        newState.learningStep = 0;
        const delayMinutes = steps[0] || 10;
        newState.due = now.getTime() + delayMinutes * 60 * 1000;
        return {
          newState,
          scheduledDays: 0,
          nextReviewAt: new Date(newState.due),
        };
      }

      case 'hard': {
        const currentStep = steps[Math.min(card.learningStep, steps.length - 1)];
        const nextStep = steps[Math.min(card.learningStep + 1, steps.length - 1)];
        const delayMinutes = Math.round((currentStep + nextStep) / 2);
        newState.due = now.getTime() + delayMinutes * 60 * 1000;
        return {
          newState,
          scheduledDays: 0,
          nextReviewAt: new Date(newState.due),
        };
      }

      case 'good': {
        if (card.learningStep >= steps.length - 1) {
          // Graduate back to review
          newState.queue = 'review';
          newState.intervalDays = Math.max(
            this.config.minimumInterval,
            card.intervalDays
          );
          newState.learningStep = 0;
          newState.due = dayNumber(now) + newState.intervalDays;
          return {
            newState,
            scheduledDays: newState.intervalDays,
            nextReviewAt: addDays(now, newState.intervalDays),
          };
        } else {
          newState.learningStep = card.learningStep + 1;
          const delayMinutes = steps[newState.learningStep];
          newState.due = now.getTime() + delayMinutes * 60 * 1000;
          return {
            newState,
            scheduledDays: 0,
            nextReviewAt: new Date(newState.due),
          };
        }
      }

      case 'easy': {
        newState.queue = 'review';
        newState.intervalDays = Math.max(
          this.config.minimumInterval + 1,
          card.intervalDays
        );
        newState.learningStep = 0;
        newState.due = dayNumber(now) + newState.intervalDays;
        return {
          newState,
          scheduledDays: newState.intervalDays,
          nextReviewAt: addDays(now, newState.intervalDays),
        };
      }
    }
  }

  private constrainInterval(interval: number): number {
    return Math.min(
      this.config.maximumInterval,
      Math.max(1, Math.round(interval))
    );
  }

  private applyFuzz(interval: number): number {
    if (interval < 2.5) return Math.round(interval);

    let fuzzRange: number;
    if (interval < 7) {
      fuzzRange = Math.round(interval * 0.25);
    } else if (interval < 30) {
      fuzzRange = Math.max(2, Math.round(interval * 0.15));
    } else {
      fuzzRange = Math.max(4, Math.round(interval * 0.05));
    }

    const fuzz = Math.floor(Math.random() * (2 * fuzzRange + 1)) - fuzzRange;
    return Math.max(1, Math.round(interval + fuzz));
  }
}

// Utility functions
function dayNumber(date: Date): number {
  // Days since Unix epoch, adjusted for user timezone
  return Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatInterval(days: number): string {
  if (days === 0) return '<1d';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${(days / 30).toFixed(1)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}
```

### FSRS-5 Algorithm

FSRS-5 (Free Spaced Repetition Scheduler, version 5) is a modern scheduling algorithm based on a three-component model of memory. It models:

- **Stability (S)**: How long a memory can be retained. Measured in days. A stability of 10 means the card has approximately a 90% chance of being recalled after 10 days.
- **Difficulty (D)**: How inherently hard the material is. Ranges from 1 (easiest) to 10 (hardest).
- **Retrievability (R)**: The current probability of successfully recalling the card. Decreases over time following a power-law forgetting curve.

#### FSRS-5 Mathematical Formulas

**Retrievability (Forgetting Curve)**:

The probability of recall at time `t` days since last review, given stability `S`:

```
R(t, S) = (1 + t / (9 * S))^(-1)
```

This is a power-law forgetting curve. When `t = S`, `R = (1 + 1/9)^(-1) = 9/10 = 0.9`, meaning at the stability interval, recall probability is 90%.

**Initial Stability (for new cards)**:

When a card is reviewed for the first time, initial stability is set based on the answer:

```
S_0(G) = w[G-1]

Where:
  G = grade (1=Again, 2=Hard, 3=Good, 4=Easy)
  w = model weights (17 parameters, w[0] through w[16])

Default initial stabilities:
  S_0(Again) = w[0] = 0.40
  S_0(Hard)  = w[1] = 0.60
  S_0(Good)  = w[2] = 1.00
  S_0(Easy)  = w[3] = 3.50
```

**Initial Difficulty**:

```
D_0(G) = w[4] - exp(w[5] * (G - 1)) + 1

Where G = grade (1-4), clamped to [1, 10]
```

**Difficulty Update (after a review)**:

```
D'(D, G) = w[7] * D_0(3) + (1 - w[7]) * (D - w[6] * (G - 3))

Clamped to [1, 10]

Where:
  D  = current difficulty
  G  = grade (1-4)
  w[6] controls how much the grade shifts difficulty
  w[7] is a mean reversion factor (pulls difficulty toward D_0(3))
```

**Stability Update After Successful Recall (R >= threshold)**:

```
S'_recall(D, S, R, G) = S * (e^(w[8]) *
                         (11 - D) *
                         S^(-w[9]) *
                         (e^(w[10] * (1 - R)) - 1) *
                         hard_penalty *
                         easy_bonus + 1)

Where:
  hard_penalty = w[15] if G = 2 (Hard), else 1
  easy_bonus   = w[16] if G = 4 (Easy), else 1
  S   = previous stability
  D   = current difficulty
  R   = retrievability at time of review
  w[8..10] shape the stability increase curve
```

**Stability Update After Failed Recall (lapse, G = Again)**:

```
S'_forget(D, S, R) = w[11] *
                      D^(-w[12]) *
                      ((S + 1)^(w[13]) - 1) *
                      e^(w[14] * (1 - R))
```

**Short-term Stability Update** (for learning/relearning steps):

```
S'_short(S, G) = S * e^(w[17] * (G - 3 + w[18]))
```

**Default FSRS-5 Weights** (17 parameters optimized from large-scale data):

```typescript
const DEFAULT_FSRS5_WEIGHTS: number[] = [
  0.40255,   // w[0]:  S_0(Again) - initial stability for Again
  0.6045,    // w[1]:  S_0(Hard)  - initial stability for Hard
  1.0000,    // w[2]:  S_0(Good)  - initial stability for Good
  3.5000,    // w[3]:  S_0(Easy)  - initial stability for Easy
  7.2102,    // w[4]:  D_0 intercept - initial difficulty baseline
  0.5345,    // w[5]:  D_0 slope - initial difficulty grade sensitivity
  1.0792,    // w[6]:  difficulty grade factor
  0.0000,    // w[7]:  difficulty mean reversion weight
  1.5500,    // w[8]:  stability increase base factor
  0.1150,    // w[9]:  stability increase S exponent (negative)
  1.0000,    // w[10]: stability increase R sensitivity
  0.5000,    // w[11]: post-lapse stability base
  0.1000,    // w[12]: post-lapse difficulty exponent
  0.2000,    // w[13]: post-lapse stability exponent
  0.0200,    // w[14]: post-lapse R sensitivity
  0.8900,    // w[15]: hard penalty multiplier
  2.2700,    // w[16]: easy bonus multiplier
  // Short-term weights (FSRS-5 addition):
  0.3200,    // w[17]: short-term stability exponent
  0.1500,    // w[18]: short-term stability shift
];
```

#### FSRS-5 TypeScript Implementation

```typescript
// packages/scheduling-engine/src/fsrs5.ts

interface FSRS5Config {
  weights: number[];              // 19 model parameters
  desiredRetention: number;       // Target retention rate (0.7 - 0.99)
  maximumInterval: number;        // Max interval in days
  learningSteps: number[];        // Learning steps in minutes
  relearningSteps: number[];      // Relearning steps in minutes
  enableFuzz: boolean;
  enableShortTerm: boolean;       // Use short-term stability for learning
}

interface FSRS5CardState {
  queue: CardQueue;
  stability: number;              // S in days
  difficulty: number;             // D (1-10)
  due: number;                    // Day number or timestamp
  intervalDays: number;
  lastReviewAt: Date | null;
  learningStep: number;
  lapseCount: number;
  reviewCount: number;
}

interface FSRS5SchedulingResult {
  newState: FSRS5CardState;
  scheduledDays: number;
  retrievability: number;          // R at time of review
  nextReviewAt: Date;
}

class FSRS5Scheduler {
  private w: number[];

  constructor(private config: FSRS5Config) {
    this.w = config.weights;
  }

  /**
   * Calculate retrievability (probability of recall) at time t.
   *
   * R(t, S) = (1 + t/(9*S))^(-1)
   */
  retrievability(elapsedDays: number, stability: number): number {
    if (stability <= 0) return 0;
    return Math.pow(1 + elapsedDays / (9 * stability), -1);
  }

  /**
   * Calculate the optimal interval for a desired retention rate.
   *
   * Derived from: R = (1 + t/(9*S))^(-1)
   * Solving for t: t = 9 * S * (R^(-1) - 1)
   */
  nextInterval(stability: number, desiredRetention?: number): number {
    const r = desiredRetention ?? this.config.desiredRetention;
    const interval = 9 * stability * (Math.pow(r, -1) - 1);
    return Math.min(
      this.config.maximumInterval,
      Math.max(1, Math.round(interval))
    );
  }

  /**
   * Initial stability for a new card based on first answer.
   * S_0(G) = w[G-1]
   */
  private initialStability(grade: number): number {
    return Math.max(0.01, this.w[grade - 1]);
  }

  /**
   * Initial difficulty for a new card based on first answer.
   * D_0(G) = w[4] - exp(w[5] * (G - 1)) + 1
   */
  private initialDifficulty(grade: number): number {
    const d = this.w[4] - Math.exp(this.w[5] * (grade - 1)) + 1;
    return this.clampDifficulty(d);
  }

  /**
   * Update difficulty after a review.
   * D'(D, G) = w[7] * D_0(3) + (1 - w[7]) * (D - w[6] * (G - 3))
   */
  private updateDifficulty(currentD: number, grade: number): number {
    const d0Good = this.initialDifficulty(3);
    const newD = this.w[7] * d0Good + (1 - this.w[7]) * (currentD - this.w[6] * (grade - 3));
    return this.clampDifficulty(newD);
  }

  /**
   * Stability update after successful recall.
   *
   * S'(D, S, R, G) = S * (e^w[8] * (11-D) * S^(-w[9]) *
   *                   (e^(w[10]*(1-R)) - 1) * penalty/bonus + 1)
   */
  private stabilityAfterRecall(
    d: number, s: number, r: number, grade: number
  ): number {
    const hardPenalty = grade === 2 ? this.w[15] : 1;
    const easyBonus = grade === 4 ? this.w[16] : 1;

    const newS = s * (
      Math.exp(this.w[8]) *
      (11 - d) *
      Math.pow(s, -this.w[9]) *
      (Math.exp(this.w[10] * (1 - r)) - 1) *
      hardPenalty *
      easyBonus
      + 1
    );

    return Math.max(0.01, newS);
  }

  /**
   * Stability update after failed recall (lapse).
   *
   * S'(D, S, R) = w[11] * D^(-w[12]) * ((S+1)^w[13] - 1) * e^(w[14]*(1-R))
   */
  private stabilityAfterForget(d: number, s: number, r: number): number {
    const newS = this.w[11] *
      Math.pow(d, -this.w[12]) *
      (Math.pow(s + 1, this.w[13]) - 1) *
      Math.exp(this.w[14] * (1 - r));

    return Math.max(0.01, Math.min(newS, s)); // Never increase stability on lapse
  }

  /**
   * Short-term stability update (for learning/relearning steps).
   * S'(S, G) = S * e^(w[17] * (G - 3 + w[18]))
   */
  private stabilityShortTerm(s: number, grade: number): number {
    if (!this.config.enableShortTerm || this.w.length < 19) return s;
    return s * Math.exp(this.w[17] * (grade - 3 + this.w[18]));
  }

  private clampDifficulty(d: number): number {
    return Math.min(10, Math.max(1, d));
  }

  /**
   * Map answer button to grade number.
   */
  private gradeFromAnswer(answer: AnswerButton): number {
    switch (answer) {
      case 'again': return 1;
      case 'hard': return 2;
      case 'good': return 3;
      case 'easy': return 4;
    }
  }

  /**
   * Main scheduling function.
   */
  schedule(
    card: FSRS5CardState,
    answer: AnswerButton,
    now: Date
  ): FSRS5SchedulingResult {
    const grade = this.gradeFromAnswer(answer);

    if (card.queue === 'new') {
      return this.scheduleNew(card, grade, now);
    } else if (card.queue === 'learning' || card.queue === 'relearning') {
      return this.scheduleLearning(card, grade, now);
    } else {
      return this.scheduleReview(card, grade, now);
    }
  }

  private scheduleNew(
    card: FSRS5CardState,
    grade: number,
    now: Date
  ): FSRS5SchedulingResult {
    const newState = { ...card };
    newState.stability = this.initialStability(grade);
    newState.difficulty = this.initialDifficulty(grade);
    newState.reviewCount = 1;

    if (grade === 1) {
      // Again: enter learning
      newState.queue = 'learning';
      newState.learningStep = 0;
      const delayMs = this.config.learningSteps[0] * 60 * 1000;
      newState.due = now.getTime() + delayMs;
      return {
        newState,
        scheduledDays: 0,
        retrievability: 0,
        nextReviewAt: new Date(newState.due),
      };
    } else if (grade <= 3) {
      // Hard or Good: enter learning steps
      newState.queue = 'learning';
      newState.learningStep = 0;
      const stepIndex = grade === 2 ? 0 : Math.min(1, this.config.learningSteps.length - 1);
      const delayMs = this.config.learningSteps[stepIndex] * 60 * 1000;
      newState.due = now.getTime() + delayMs;
      return {
        newState,
        scheduledDays: 0,
        retrievability: 0,
        nextReviewAt: new Date(newState.due),
      };
    } else {
      // Easy: skip learning, go directly to review
      newState.queue = 'review';
      newState.intervalDays = this.nextInterval(newState.stability);
      newState.due = dayNumber(now) + newState.intervalDays;
      newState.lastReviewAt = now;
      newState.learningStep = 0;
      return {
        newState,
        scheduledDays: newState.intervalDays,
        retrievability: 0,
        nextReviewAt: addDays(now, newState.intervalDays),
      };
    }
  }

  private scheduleLearning(
    card: FSRS5CardState,
    grade: number,
    now: Date
  ): FSRS5SchedulingResult {
    const newState = { ...card };
    const isRelearning = card.queue === 'relearning';
    const steps = isRelearning
      ? this.config.relearningSteps
      : this.config.learningSteps;

    // Update stability using short-term formula
    if (this.config.enableShortTerm) {
      newState.stability = this.stabilityShortTerm(card.stability, grade);
    }

    // Update difficulty
    newState.difficulty = this.updateDifficulty(card.difficulty, grade);
    newState.reviewCount = card.reviewCount + 1;

    if (grade === 1) {
      // Again: restart steps
      newState.learningStep = 0;
      newState.due = now.getTime() + steps[0] * 60 * 1000;
      return {
        newState,
        scheduledDays: 0,
        retrievability: card.lastReviewAt
          ? this.retrievability(
              (now.getTime() - card.lastReviewAt.getTime()) / 86400000,
              card.stability
            )
          : 0,
        nextReviewAt: new Date(newState.due),
      };
    } else if (grade === 4 || card.learningStep >= steps.length - 1) {
      // Easy or final step: graduate to review
      newState.queue = 'review';
      newState.intervalDays = this.nextInterval(newState.stability);
      newState.due = dayNumber(now) + newState.intervalDays;
      newState.lastReviewAt = now;
      newState.learningStep = 0;
      return {
        newState,
        scheduledDays: newState.intervalDays,
        retrievability: 0,
        nextReviewAt: addDays(now, newState.intervalDays),
      };
    } else {
      // Advance to next step
      const nextStep = grade === 2
        ? card.learningStep        // Hard: repeat current step
        : card.learningStep + 1;   // Good: advance

      newState.learningStep = nextStep;
      const delayMinutes = steps[Math.min(nextStep, steps.length - 1)];
      newState.due = now.getTime() + delayMinutes * 60 * 1000;
      return {
        newState,
        scheduledDays: 0,
        retrievability: 0,
        nextReviewAt: new Date(newState.due),
      };
    }
  }

  private scheduleReview(
    card: FSRS5CardState,
    grade: number,
    now: Date
  ): FSRS5SchedulingResult {
    const newState = { ...card };

    // Calculate elapsed days since last review
    const elapsedDays = card.lastReviewAt
      ? Math.max(0, (now.getTime() - card.lastReviewAt.getTime()) / 86400000)
      : card.intervalDays;

    // Calculate current retrievability
    const r = this.retrievability(elapsedDays, card.stability);

    // Update difficulty
    newState.difficulty = this.updateDifficulty(card.difficulty, grade);
    newState.reviewCount = card.reviewCount + 1;

    if (grade === 1) {
      // Again (lapse)
      newState.stability = this.stabilityAfterForget(
        card.difficulty, card.stability, r
      );
      newState.lapseCount = card.lapseCount + 1;
      newState.queue = 'relearning';
      newState.learningStep = 0;

      const delayMinutes = this.config.relearningSteps[0] || 10;
      newState.due = now.getTime() + delayMinutes * 60 * 1000;

      return {
        newState,
        scheduledDays: 0,
        retrievability: r,
        nextReviewAt: new Date(newState.due),
      };
    } else {
      // Hard, Good, or Easy (successful recall)
      newState.stability = this.stabilityAfterRecall(
        card.difficulty, card.stability, r, grade
      );
      newState.queue = 'review';
      newState.intervalDays = this.nextInterval(newState.stability);
      newState.due = dayNumber(now) + newState.intervalDays;
      newState.lastReviewAt = now;

      return {
        newState,
        scheduledDays: newState.intervalDays,
        retrievability: r,
        nextReviewAt: addDays(now, newState.intervalDays),
      };
    }
  }

  /**
   * Preview all four answer options for the UI.
   */
  preview(
    card: FSRS5CardState,
    now: Date
  ): Record<AnswerButton, { interval: string; days: number; retention: number }> {
    const answers: AnswerButton[] = ['again', 'hard', 'good', 'easy'];
    const result: Record<string, { interval: string; days: number; retention: number }> = {};

    for (const answer of answers) {
      const scheduled = this.schedule({ ...card }, answer, now);
      result[answer] = {
        interval: formatInterval(scheduled.scheduledDays),
        days: scheduled.scheduledDays,
        retention: scheduled.scheduledDays > 0
          ? this.retrievability(scheduled.scheduledDays, scheduled.newState.stability)
          : 1,
      };
    }

    return result as Record<AnswerButton, { interval: string; days: number; retention: number }>;
  }
}
```

### Unified Scheduling Interface

```typescript
// packages/scheduling-engine/src/engine.ts

interface SchedulerConfig {
  algorithm: 'sm2' | 'fsrs5';
  sm2?: SM2Config;
  fsrs5?: FSRS5Config;
}

interface UnifiedCardState {
  queue: CardQueue;
  intervalDays: number;
  easeFactor: number;
  stability?: number;
  difficulty?: number;
  due: number;
  lastReviewAt: Date | null;
  learningStep: number;
  lapseCount: number;
  reviewCount: number;
}

interface ScheduleResult {
  newState: UnifiedCardState;
  scheduledDays: number;
  nextReviewAt: Date;
  algorithmUsed: 'sm2' | 'fsrs5';
}

class SchedulingEngine {
  private sm2: SM2Scheduler;
  private fsrs5: FSRS5Scheduler;
  private algorithm: 'sm2' | 'fsrs5';

  constructor(config: SchedulerConfig) {
    this.algorithm = config.algorithm;
    this.sm2 = new SM2Scheduler(config.sm2);
    this.fsrs5 = new FSRS5Scheduler(config.fsrs5 ?? {
      weights: DEFAULT_FSRS5_WEIGHTS,
      desiredRetention: 0.9,
      maximumInterval: 36500,
      learningSteps: [1, 10],
      relearningSteps: [10],
      enableFuzz: true,
      enableShortTerm: true,
    });
  }

  schedule(card: UnifiedCardState, answer: AnswerButton, now: Date): ScheduleResult {
    if (this.algorithm === 'fsrs5') {
      const fsrsState: FSRS5CardState = {
        queue: card.queue,
        stability: card.stability ?? 0,
        difficulty: card.difficulty ?? 5,
        due: card.due,
        intervalDays: card.intervalDays,
        lastReviewAt: card.lastReviewAt,
        learningStep: card.learningStep,
        lapseCount: card.lapseCount,
        reviewCount: card.reviewCount,
      };
      const result = this.fsrs5.schedule(fsrsState, answer, now);
      return {
        newState: {
          queue: result.newState.queue,
          intervalDays: result.newState.intervalDays,
          easeFactor: card.easeFactor,     // Preserved but not used by FSRS
          stability: result.newState.stability,
          difficulty: result.newState.difficulty,
          due: result.newState.due,
          lastReviewAt: result.newState.lastReviewAt,
          learningStep: result.newState.learningStep,
          lapseCount: result.newState.lapseCount,
          reviewCount: result.newState.reviewCount,
        },
        scheduledDays: result.scheduledDays,
        nextReviewAt: result.nextReviewAt,
        algorithmUsed: 'fsrs5',
      };
    } else {
      const sm2State: SM2CardState = {
        queue: card.queue,
        intervalDays: card.intervalDays,
        easeFactor: card.easeFactor,
        learningStep: card.learningStep,
        lapseCount: card.lapseCount,
        due: card.due,
      };
      const result = this.sm2.schedule(sm2State, answer, now);
      return {
        newState: {
          ...card,
          queue: result.newState.queue,
          intervalDays: result.newState.intervalDays,
          easeFactor: result.newState.easeFactor,
          due: result.newState.due,
          learningStep: result.newState.learningStep,
          lapseCount: result.newState.lapseCount,
          reviewCount: card.reviewCount + 1,
          lastReviewAt: now,
        },
        scheduledDays: result.scheduledDays,
        nextReviewAt: result.nextReviewAt,
        algorithmUsed: 'sm2',
      };
    }
  }
}
```

### Queue Selection Logic

The order in which cards are presented to the user during a study session follows a specific priority system:

```typescript
// apps/api/src/services/study-service.ts

/**
 * Selects the next card for study from a deck.
 *
 * Priority order:
 * 1. Learning cards due now (intra-day learning steps)
 * 2. Review cards due today
 * 3. New cards (up to daily limit)
 * 4. Day-learning cards (learning steps >= 1 day)
 *
 * Within each category, ordering is determined by deck presets:
 * - 'due_before_new': reviews before new cards
 * - 'new_before_due': new cards before reviews
 * - 'random': interleave randomly
 */
async function getNextCard(
  userId: string,
  deckId: string,
  now: Date
): Promise<Card | null> {
  const deck = await db('decks').where({ id: deckId }).first();
  const preset = await db('deck_presets').where({ id: deck.preset_id }).first();
  const today = dayNumber(now);
  const nowTimestamp = now.getTime();

  // 1. Check for learning cards due now
  const learningCard = await db('cards')
    .where({ deck_id: deckId, queue: 'learning', status: 'active' })
    .where('due', '<=', nowTimestamp)
    .orderBy('due', 'asc')
    .first();

  if (learningCard) return learningCard;

  // Also check relearning
  const relearningCard = await db('cards')
    .where({ deck_id: deckId, queue: 'relearning', status: 'active' })
    .where('due', '<=', nowTimestamp)
    .orderBy('due', 'asc')
    .first();

  if (relearningCard) return relearningCard;

  // 2. Count today's reviews and new cards studied
  const todayStats = await getTodayStudyStats(userId, deckId, today);

  // 3. Select between review and new based on order preference
  const hasReviews = await db('cards')
    .where({ deck_id: deckId, queue: 'review', status: 'active' })
    .where('due', '<=', today)
    .first();

  const canShowNew = todayStats.newCount < preset.new_cards_per_day;
  const canShowReview = todayStats.reviewCount < preset.max_reviews_per_day && hasReviews;

  if (preset.new_card_order === 'due_before_new') {
    if (canShowReview) return getNextReviewCard(deckId, today);
    if (canShowNew) return getNextNewCard(deckId, preset);
  } else if (preset.new_card_order === 'new_before_due') {
    if (canShowNew) return getNextNewCard(deckId, preset);
    if (canShowReview) return getNextReviewCard(deckId, today);
  } else {
    // Random interleave
    const showNew = canShowNew && (!canShowReview || Math.random() < 0.5);
    if (showNew) return getNextNewCard(deckId, preset);
    if (canShowReview) return getNextReviewCard(deckId, today);
  }

  // 4. Check day-learning cards
  const dayLearningCard = await db('cards')
    .where({ deck_id: deckId, queue: 'day_learning', status: 'active' })
    .where('due', '<=', today)
    .orderBy('due', 'asc')
    .first();

  return dayLearningCard || null;
}
```

---

## 1.6 Suspending, Burying, Flags, Card Management

### The Pause System (Replacing "Suspend")

The traditional Anki terminology of "suspend" and "bury" can be confusing for new users. This system uses clearer terminology:

| Old Term (Anki) | New Term | Behavior |
|---|---|---|
| Suspend | **Pause** | Remove card from all queues indefinitely (or until a date) |
| Bury | **Skip Today** | Remove card for today only; auto-restores at start of next day |

### Card Status Enum

```typescript
type CardStatus = 'active' | 'paused' | 'skipped_today';
```

- **active**: Card is in its normal queue and eligible for review.
- **paused**: Card is removed from all queues. Will not appear in study sessions. Can have an optional `pause_resume_date` for timed pauses.
- **skipped_today**: Card is hidden for the current day only. Automatically returns to `active` at the start of the next study day (typically 4 AM in user's timezone).

### Pause Operations

```typescript
// apps/api/src/services/card-management-service.ts

/**
 * Pause one or more cards. They will not appear in study sessions
 * until unpaused (or until resume_date if specified).
 */
async function pauseCards(
  cardIds: string[],
  options?: { resumeDate?: Date; reason?: string }
): Promise<void> {
  await db('cards')
    .whereIn('id', cardIds)
    .update({
      status: 'paused',
      queue: 'paused',
      pause_resume_date: options?.resumeDate || null,
      updated_at: new Date(),
    });
}

/**
 * Unpause cards, returning them to their appropriate queue.
 */
async function unpauseCards(cardIds: string[]): Promise<void> {
  // We need to restore cards to their correct queue based on their
  // scheduling state
  const cards = await db('cards').whereIn('id', cardIds);

  for (const card of cards) {
    let newQueue: CardQueue;
    if (card.review_count === 0) {
      newQueue = 'new';
    } else if (card.interval_days > 0) {
      newQueue = 'review';
    } else {
      newQueue = 'learning';
    }

    await db('cards').where({ id: card.id }).update({
      status: 'active',
      queue: newQueue,
      pause_resume_date: null,
      updated_at: new Date(),
    });
  }
}

/**
 * Skip (bury) cards for today. They will auto-restore tomorrow.
 */
async function skipCardsToday(cardIds: string[]): Promise<void> {
  await db('cards')
    .whereIn('id', cardIds)
    .update({
      status: 'skipped_today',
      queue: 'buried_manual',
      updated_at: new Date(),
    });
}

/**
 * Called at the start of each day (or on app launch).
 * Restores all skipped_today cards and processes timed pauses.
 */
async function dailyCardMaintenance(userId: string): Promise<{
  unburied: number;
  resumed: number;
}> {
  // 1. Restore all skipped_today cards
  const unburiedResult = await db('cards')
    .join('notes', 'cards.note_id', 'notes.id')
    .where('notes.user_id', userId)
    .where('cards.status', 'skipped_today')
    .update({
      'cards.status': 'active',
      'cards.queue': db.raw(`
        CASE
          WHEN cards.review_count = 0 THEN 'new'::card_queue
          WHEN cards.interval_days > 0 THEN 'review'::card_queue
          ELSE 'learning'::card_queue
        END
      `),
      'cards.updated_at': new Date(),
    });

  // 2. Check timed pauses that should resume
  const resumedResult = await db('cards')
    .join('notes', 'cards.note_id', 'notes.id')
    .where('notes.user_id', userId)
    .where('cards.status', 'paused')
    .whereNotNull('cards.pause_resume_date')
    .where('cards.pause_resume_date', '<=', new Date())
    .update({
      'cards.status': 'active',
      'cards.queue': db.raw(`
        CASE
          WHEN cards.review_count = 0 THEN 'new'::card_queue
          WHEN cards.interval_days > 0 THEN 'review'::card_queue
          ELSE 'learning'::card_queue
        END
      `),
      'cards.pause_resume_date': null,
      'cards.updated_at': new Date(),
    });

  return { unburied: unburiedResult, resumed: resumedResult };
}
```

### Sibling Burying

When a card is reviewed, its "siblings" (other cards generated from the same note) can be automatically buried for the day to prevent seeing related content. This is controlled by the deck preset.

```typescript
/**
 * Bury sibling cards after a review.
 * A sibling is another card generated from the same note.
 */
async function burySiblings(
  reviewedCardId: string,
  noteId: string,
  deckPreset: DeckPreset
): Promise<void> {
  // Build conditions based on preset settings
  const conditions: string[] = [];

  if (deckPreset.bury_new_siblings) {
    conditions.push("cards.queue = 'new'");
  }
  if (deckPreset.bury_review_siblings) {
    conditions.push("cards.queue = 'review'");
  }
  if (deckPreset.bury_interday_siblings) {
    conditions.push("cards.queue = 'day_learning'");
  }

  if (conditions.length === 0) return;

  await db('cards')
    .where('note_id', noteId)
    .whereNot('id', reviewedCardId)
    .where('status', 'active')
    .whereRaw(`(${conditions.join(' OR ')})`)
    .update({
      queue: 'buried_sibling',
      status: 'skipped_today',
      updated_at: new Date(),
    });
}
```

### Flag System

Cards can be flagged with up to 7 colored flags. Flags are stored as a bitmask in the `flags` column for efficient storage and querying.

```typescript
// packages/shared-types/src/models/flags.ts

enum CardFlag {
  NONE    = 0,
  RED     = 1 << 0,   // 1  - Bit 0
  ORANGE  = 1 << 1,   // 2  - Bit 1
  GREEN   = 1 << 2,   // 4  - Bit 2
  BLUE    = 1 << 3,   // 8  - Bit 3
  PINK    = 1 << 4,   // 16 - Bit 4
  CYAN    = 1 << 5,   // 32 - Bit 5
  PURPLE  = 1 << 6,   // 64 - Bit 6
}

const FLAG_COLORS: Record<CardFlag, { name: string; hex: string }> = {
  [CardFlag.NONE]:   { name: 'None',   hex: '#000000' },
  [CardFlag.RED]:    { name: 'Red',    hex: '#FF3B30' },
  [CardFlag.ORANGE]: { name: 'Orange', hex: '#FF9500' },
  [CardFlag.GREEN]:  { name: 'Green',  hex: '#34C759' },
  [CardFlag.BLUE]:   { name: 'Blue',   hex: '#007AFF' },
  [CardFlag.PINK]:   { name: 'Pink',   hex: '#FF2D55' },
  [CardFlag.CYAN]:   { name: 'Cyan',   hex: '#5AC8FA' },
  [CardFlag.PURPLE]: { name: 'Purple', hex: '#AF52DE' },
};

function hasFlag(cardFlags: number, flag: CardFlag): boolean {
  return (cardFlags & flag) !== 0;
}

function addFlag(cardFlags: number, flag: CardFlag): number {
  return cardFlags | flag;
}

function removeFlag(cardFlags: number, flag: CardFlag): number {
  return cardFlags & ~flag;
}

function toggleFlag(cardFlags: number, flag: CardFlag): number {
  return cardFlags ^ flag;
}

function getFlagList(cardFlags: number): CardFlag[] {
  const flags: CardFlag[] = [];
  for (const flag of [
    CardFlag.RED, CardFlag.ORANGE, CardFlag.GREEN, CardFlag.BLUE,
    CardFlag.PINK, CardFlag.CYAN, CardFlag.PURPLE
  ]) {
    if (hasFlag(cardFlags, flag)) {
      flags.push(flag);
    }
  }
  return flags;
}
```

**Flag SQL queries**:

```sql
-- Find all cards with the red flag
SELECT * FROM cards WHERE flags & 1 > 0;

-- Find cards with red OR blue flags
SELECT * FROM cards WHERE flags & (1 | 8) > 0;

-- Find cards with red AND blue flags (both set)
SELECT * FROM cards WHERE flags & 1 > 0 AND flags & 8 > 0;

-- Set the green flag (bit 2) on a card without removing existing flags
UPDATE cards SET flags = flags | 4 WHERE id = :cardId;

-- Remove the green flag without affecting other flags
UPDATE cards SET flags = flags & ~4 WHERE id = :cardId;

-- Clear all flags
UPDATE cards SET flags = 0 WHERE id = :cardId;
```

### Leech Detection

A "leech" is a card that the user repeatedly fails. Leeches waste study time and often indicate the card needs to be reformulated.

```typescript
/**
 * Check if a card has become a leech after a lapse.
 * A card is a leech when its lapse count reaches the threshold.
 */
async function checkLeech(
  cardId: string,
  lapseCount: number,
  leechThreshold: number,
  leechAction: 'tag_only' | 'pause'
): Promise<boolean> {
  // Only trigger at the threshold and at half-intervals after
  // (e.g., threshold=8: triggers at 8, 12, 16, 20, ...)
  const halfThreshold = Math.floor(leechThreshold / 2);
  if (lapseCount < leechThreshold) return false;
  if ((lapseCount - leechThreshold) % halfThreshold !== 0) return false;

  // Flag the card as a leech
  await db('cards')
    .where({ id: cardId })
    .update({ leech_flagged: true, updated_at: new Date() });

  // Tag the note with "leech"
  const card = await db('cards').where({ id: cardId }).first();
  await ensureNoteHasTag(card.note_id, 'leech');

  if (leechAction === 'pause') {
    await pauseCards([cardId]);
  }

  // Emit event for notifications
  eventBus.emit('card:leech', { cardId, lapseCount });

  return true;
}
```

### Card Management API Endpoints

```
Card Management API
==============================================================================

POST   /api/v1/cards/:id/pause          Pause a card (optionally with resume date)
POST   /api/v1/cards/:id/unpause        Unpause a card
POST   /api/v1/cards/:id/skip-today     Skip card for today (bury)
POST   /api/v1/cards/:id/flags          Set flags on a card
DELETE /api/v1/cards/:id/flags/:flag     Remove a specific flag
POST   /api/v1/cards/:id/reschedule     Manually set card's due date
POST   /api/v1/cards/:id/reset          Reset card to new state
POST   /api/v1/cards/:id/move           Move card to another deck

Batch Operations:
POST   /api/v1/cards/batch/pause        Pause multiple cards
POST   /api/v1/cards/batch/unpause      Unpause multiple cards
POST   /api/v1/cards/batch/skip-today   Skip multiple cards for today
POST   /api/v1/cards/batch/flags        Set flags on multiple cards
POST   /api/v1/cards/batch/move         Move multiple cards to a deck
POST   /api/v1/cards/batch/reschedule   Reschedule multiple cards
POST   /api/v1/cards/batch/delete       Delete multiple cards

Request body for batch operations:
{
  "cardIds": ["uuid1", "uuid2", "uuid3"],
  ... operation-specific fields ...
}
```

---

## 1.7 Browser, Search, Card Management

### Overview

The Card Browser is the primary interface for finding, viewing, filtering, and performing bulk operations on cards and notes. It supports a powerful search syntax that is compiled to SQL queries. This section documents the complete search language, the query parser architecture, and the browser UI data model.

### Search Syntax Specification

The search language supports a rich set of operators for filtering cards and notes. Search queries are text strings that may combine multiple conditions with boolean operators.

#### Basic Text Search

| Query | Meaning |
|---|---|
| `dog` | Cards containing "dog" in any field |
| `"hot dog"` | Exact phrase "hot dog" in any field |
| `dog cat` | Cards containing both "dog" AND "cat" (implicit AND) |
| `dog OR cat` | Cards containing "dog" OR "cat" |
| `-dog` | Cards NOT containing "dog" |
| `(dog OR cat) fish` | Grouping with parentheses |
| `*` | All cards (matches everything) |

#### Field-Specific Search

| Query | Meaning |
|---|---|
| `front:dog` | "dog" in the front/question field specifically |
| `back:cat` | "cat" in the back/answer field |
| `field:Word:ephemeral` | "ephemeral" in the field named "Word" |

#### Deck Filters

| Query | Meaning |
|---|---|
| `deck:Vocabulary` | Cards in the "Vocabulary" deck |
| `deck:Vocabulary::English` | Cards in "Vocabulary::English" (exact match) |
| `deck:Vocabulary::*` | Cards in "Vocabulary" and all sub-decks |
| `deck:current` | Cards in the currently selected deck |
| `-deck:Default` | Cards NOT in the "Default" deck |

#### Note Type Filters

| Query | Meaning |
|---|---|
| `note:Basic` | Cards from the "Basic" note type |
| `note:"Basic (and reversed card)"` | Note type with spaces (quoted) |
| `mid:abc123` | Cards from note type with specific ID |

#### Tag Filters

| Query | Meaning |
|---|---|
| `tag:Science` | Notes tagged "Science" (exact tag) |
| `tag:Science::*` | Notes with "Science" tag or any descendant |
| `tag:none` | Notes with no tags |
| `-tag:leech` | Notes NOT tagged "leech" |
| `tag:Science tag:Biology` | Notes with both tags (AND) |
| `tag:Science OR tag:History` | Notes with either tag (OR) |

#### Card State Filters

| Query | Meaning |
|---|---|
| `is:new` | New cards (never reviewed) |
| `is:learn` | Cards in learning/relearning |
| `is:review` | Cards in review queue |
| `is:due` | Cards that are due today |
| `is:paused` | Paused (suspended) cards |
| `is:buried` | Buried (skipped_today) cards |
| `is:leech` | Cards flagged as leeches |

#### Flag Filters

| Query | Meaning |
|---|---|
| `flag:0` | No flag |
| `flag:1` | Red flag |
| `flag:2` | Orange flag |
| `flag:3` | Green flag |
| `flag:4` | Blue flag |
| `flag:5` | Pink flag |
| `flag:6` | Cyan flag |
| `flag:7` | Purple flag |

#### Date/Range Filters

| Query | Meaning |
|---|---|
| `added:7` | Cards added in the last 7 days |
| `edited:30` | Notes edited in the last 30 days |
| `reviewed:1` | Cards reviewed today (last 1 day) |
| `rated:7:again` | Cards rated "again" in the last 7 days |
| `rated:30:easy` | Cards rated "easy" in the last 30 days |
| `introduced:7` | Cards first studied in the last 7 days |

#### Interval and Scheduling Filters

| Query | Meaning |
|---|---|
| `interval:10` | Cards with interval of exactly 10 days |
| `interval:>30` | Cards with interval greater than 30 days |
| `interval:<7` | Cards with interval less than 7 days |
| `due:0` | Cards due today |
| `due:1` | Cards due tomorrow |
| `due:-1` | Cards that were due yesterday (overdue) |
| `due:>7` | Cards due more than 7 days from now |
| `ease:>2.5` | Cards with ease factor above 2.5 |
| `ease:<1.5` | Cards with low ease factor |
| `stability:>30` | Cards with FSRS stability above 30 days |
| `difficulty:>7` | Cards with FSRS difficulty above 7 |
| `lapses:>5` | Cards lapsed more than 5 times |
| `reviews:>20` | Cards reviewed more than 20 times |

#### Property Comparisons (General Syntax)

```
prop:<property><operator><value>

Operators: = (equals), != (not equals), > (greater), < (less),
           >= (greater or equal), <= (less or equal)

Properties: due, interval, ease, stability, difficulty, lapses,
            reviews, position, rated
```

| Query | Meaning |
|---|---|
| `prop:due=0` | Due today |
| `prop:interval>=30` | Interval 30+ days |
| `prop:ease<2.0` | Low ease |
| `prop:lapses>10` | High lapse count |

#### Duplicate Detection

| Query | Meaning |
|---|---|
| `dupe:NoteTypeName,FieldName` | Find notes with duplicate values in the specified field |

### Search Query Parser Architecture

The search engine follows a classic compiler pipeline: Lexer -> Parser -> AST -> SQL Compiler.

```
User Input String
       |
       v
  +---------+
  |  Lexer  |  Tokenizes the raw query string into typed tokens
  +---------+
       |
       v
  +---------+
  |  Parser |  Builds an Abstract Syntax Tree from the token stream
  +---------+
       |
       v
  +-----+
  | AST |   Tree representation of the search query
  +-----+
       |
       v
  +-----------+
  | Compiler  |  Converts the AST into a SQL WHERE clause
  +-----------+
       |
       v
  SQL WHERE clause + parameter bindings
```

#### Token Types

```typescript
// packages/search-parser/src/lexer.ts

enum TokenType {
  // Literals
  TEXT = 'TEXT',                   // Bare word: dog
  QUOTED_STRING = 'QUOTED_STRING', // "hot dog"
  REGEX = 'REGEX',                // re:pattern

  // Operators
  AND = 'AND',                    // Implicit or explicit AND
  OR = 'OR',                      // OR keyword
  NOT = 'NOT',                    // - prefix

  // Grouping
  LPAREN = 'LPAREN',             // (
  RPAREN = 'RPAREN',             // )

  // Filters (prefix:value)
  DECK_FILTER = 'DECK_FILTER',       // deck:name
  TAG_FILTER = 'TAG_FILTER',         // tag:name
  NOTE_FILTER = 'NOTE_FILTER',       // note:name
  STATE_FILTER = 'STATE_FILTER',     // is:state
  FLAG_FILTER = 'FLAG_FILTER',       // flag:N
  FIELD_FILTER = 'FIELD_FILTER',     // field:name:value or front: back:
  ADDED_FILTER = 'ADDED_FILTER',     // added:N
  EDITED_FILTER = 'EDITED_FILTER',   // edited:N
  REVIEWED_FILTER = 'REVIEWED_FILTER', // reviewed:N
  RATED_FILTER = 'RATED_FILTER',     // rated:N:answer
  INTERVAL_FILTER = 'INTERVAL_FILTER', // interval:op:value
  PROP_FILTER = 'PROP_FILTER',       // prop:name op value
  DUE_FILTER = 'DUE_FILTER',         // due:N
  DUPE_FILTER = 'DUPE_FILTER',       // dupe:NoteType,Field
  EASE_FILTER = 'EASE_FILTER',       // ease:op:value
  LAPSES_FILTER = 'LAPSES_FILTER',   // lapses:op:value
  STABILITY_FILTER = 'STABILITY_FILTER', // stability:op:value
  DIFFICULTY_FILTER = 'DIFFICULTY_FILTER', // difficulty:op:value

  // Special
  WILDCARD = 'WILDCARD',         // *
  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value: string;
  position: number;       // Character position in input
  raw: string;            // Original text from input
}
```

#### Lexer Implementation

```typescript
// packages/search-parser/src/lexer.ts

class SearchLexer {
  private pos = 0;
  private input: string;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input.trim();
  }

  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const char = this.input[this.pos];

      if (char === '(') {
        this.tokens.push({ type: TokenType.LPAREN, value: '(', position: this.pos, raw: '(' });
        this.pos++;
      } else if (char === ')') {
        this.tokens.push({ type: TokenType.RPAREN, value: ')', position: this.pos, raw: ')' });
        this.pos++;
      } else if (char === '-' && this.pos + 1 < this.input.length && this.input[this.pos + 1] !== ' ') {
        this.tokens.push({ type: TokenType.NOT, value: '-', position: this.pos, raw: '-' });
        this.pos++;
      } else if (char === '"') {
        this.readQuotedString();
      } else if (char === '*' && (this.pos + 1 >= this.input.length || this.input[this.pos + 1] === ' ')) {
        this.tokens.push({ type: TokenType.WILDCARD, value: '*', position: this.pos, raw: '*' });
        this.pos++;
      } else {
        this.readWord();
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', position: this.pos, raw: '' });
    return this.tokens;
  }

  private readQuotedString(): void {
    const start = this.pos;
    this.pos++; // skip opening quote
    let value = '';
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
        this.pos++; // skip backslash
      }
      value += this.input[this.pos];
      this.pos++;
    }
    if (this.pos < this.input.length) this.pos++; // skip closing quote
    this.tokens.push({
      type: TokenType.QUOTED_STRING,
      value,
      position: start,
      raw: this.input.substring(start, this.pos),
    });
  }

  private readWord(): void {
    const start = this.pos;
    let word = '';
    while (this.pos < this.input.length && !/[\s()]/.test(this.input[this.pos])) {
      word += this.input[this.pos];
      this.pos++;
    }

    // Check if this is a keyword or filter prefix
    if (word.toUpperCase() === 'OR') {
      this.tokens.push({ type: TokenType.OR, value: 'OR', position: start, raw: word });
      return;
    }
    if (word.toUpperCase() === 'AND') {
      this.tokens.push({ type: TokenType.AND, value: 'AND', position: start, raw: word });
      return;
    }

    // Check for filter prefix patterns
    const filterToken = this.parseFilterPrefix(word, start);
    if (filterToken) {
      this.tokens.push(filterToken);
      return;
    }

    // Plain text token
    this.tokens.push({ type: TokenType.TEXT, value: word, position: start, raw: word });
  }

  private parseFilterPrefix(word: string, position: number): Token | null {
    const colonIndex = word.indexOf(':');
    if (colonIndex === -1) return null;

    const prefix = word.substring(0, colonIndex).toLowerCase();
    const value = word.substring(colonIndex + 1);

    const filterMap: Record<string, TokenType> = {
      'deck': TokenType.DECK_FILTER,
      'tag': TokenType.TAG_FILTER,
      'note': TokenType.NOTE_FILTER,
      'is': TokenType.STATE_FILTER,
      'flag': TokenType.FLAG_FILTER,
      'front': TokenType.FIELD_FILTER,
      'back': TokenType.FIELD_FILTER,
      'field': TokenType.FIELD_FILTER,
      'added': TokenType.ADDED_FILTER,
      'edited': TokenType.EDITED_FILTER,
      'reviewed': TokenType.REVIEWED_FILTER,
      'rated': TokenType.RATED_FILTER,
      'interval': TokenType.INTERVAL_FILTER,
      'prop': TokenType.PROP_FILTER,
      'due': TokenType.DUE_FILTER,
      'dupe': TokenType.DUPE_FILTER,
      'ease': TokenType.EASE_FILTER,
      'lapses': TokenType.LAPSES_FILTER,
      'stability': TokenType.STABILITY_FILTER,
      'difficulty': TokenType.DIFFICULTY_FILTER,
    };

    const tokenType = filterMap[prefix];
    if (tokenType) {
      return { type: tokenType, value, position, raw: word };
    }

    return null;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }
}
```

#### AST Node Types

```typescript
// packages/search-parser/src/parser.ts

type ASTNode =
  | TextSearchNode
  | FieldSearchNode
  | DeckFilterNode
  | TagFilterNode
  | NoteTypeFilterNode
  | StateFilterNode
  | FlagFilterNode
  | DateFilterNode
  | PropertyFilterNode
  | DuplicateFilterNode
  | AndNode
  | OrNode
  | NotNode
  | WildcardNode;

interface TextSearchNode {
  type: 'text_search';
  value: string;
  isExact: boolean;      // true if it was a quoted string
}

interface FieldSearchNode {
  type: 'field_search';
  fieldName: string;     // 'front', 'back', or a custom field name
  value: string;
  isExact: boolean;
}

interface DeckFilterNode {
  type: 'deck_filter';
  deckName: string;
  includeChildren: boolean;  // true if ends with ::*
}

interface TagFilterNode {
  type: 'tag_filter';
  tagPath: string;
  includeDescendants: boolean; // true if ends with ::*
  isNone: boolean;             // true if "tag:none"
}

interface NoteTypeFilterNode {
  type: 'note_type_filter';
  noteTypeName: string;
}

interface StateFilterNode {
  type: 'state_filter';
  state: 'new' | 'learn' | 'review' | 'due' | 'paused' | 'buried' | 'leech';
}

interface FlagFilterNode {
  type: 'flag_filter';
  flagNumber: number;    // 0-7
}

interface DateFilterNode {
  type: 'date_filter';
  dateType: 'added' | 'edited' | 'reviewed' | 'rated' | 'introduced';
  days: number;
  answer?: 'again' | 'hard' | 'good' | 'easy';  // For rated: filter
}

interface PropertyFilterNode {
  type: 'property_filter';
  property: 'due' | 'interval' | 'ease' | 'stability' | 'difficulty' | 'lapses' | 'reviews';
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=';
  value: number;
}

interface DuplicateFilterNode {
  type: 'duplicate_filter';
  noteTypeName: string;
  fieldName: string;
}

interface AndNode {
  type: 'and';
  children: ASTNode[];
}

interface OrNode {
  type: 'or';
  children: ASTNode[];
}

interface NotNode {
  type: 'not';
  child: ASTNode;
}

interface WildcardNode {
  type: 'wildcard';
}
```

#### Parser Implementation

```typescript
// packages/search-parser/src/parser.ts

class SearchParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    const result = this.parseOrExpression();
    if (this.current().type !== TokenType.EOF) {
      throw new SearchParseError(
        `Unexpected token: ${this.current().raw}`,
        this.current().position
      );
    }
    return result;
  }

  private current(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: '', position: -1, raw: '' };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private parseOrExpression(): ASTNode {
    const children: ASTNode[] = [this.parseAndExpression()];

    while (this.current().type === TokenType.OR) {
      this.advance(); // consume OR
      children.push(this.parseAndExpression());
    }

    if (children.length === 1) return children[0];
    return { type: 'or', children };
  }

  private parseAndExpression(): ASTNode {
    const children: ASTNode[] = [this.parseUnary()];

    while (
      this.current().type !== TokenType.EOF &&
      this.current().type !== TokenType.OR &&
      this.current().type !== TokenType.RPAREN
    ) {
      if (this.current().type === TokenType.AND) {
        this.advance(); // consume optional AND
      }
      children.push(this.parseUnary());
    }

    if (children.length === 1) return children[0];
    return { type: 'and', children };
  }

  private parseUnary(): ASTNode {
    if (this.current().type === TokenType.NOT) {
      this.advance(); // consume -
      const child = this.parsePrimary();
      return { type: 'not', child };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    switch (token.type) {
      case TokenType.LPAREN: {
        this.advance(); // consume (
        const expr = this.parseOrExpression();
        if (this.current().type !== TokenType.RPAREN) {
          throw new SearchParseError('Missing closing parenthesis', token.position);
        }
        this.advance(); // consume )
        return expr;
      }

      case TokenType.TEXT:
        this.advance();
        return { type: 'text_search', value: token.value, isExact: false };

      case TokenType.QUOTED_STRING:
        this.advance();
        return { type: 'text_search', value: token.value, isExact: true };

      case TokenType.WILDCARD:
        this.advance();
        return { type: 'wildcard' };

      case TokenType.DECK_FILTER:
        this.advance();
        return this.parseDeckFilter(token.value);

      case TokenType.TAG_FILTER:
        this.advance();
        return this.parseTagFilter(token.value);

      case TokenType.NOTE_FILTER:
        this.advance();
        return { type: 'note_type_filter', noteTypeName: token.value };

      case TokenType.STATE_FILTER:
        this.advance();
        return this.parseStateFilter(token.value);

      case TokenType.FLAG_FILTER:
        this.advance();
        return { type: 'flag_filter', flagNumber: parseInt(token.value, 10) };

      case TokenType.ADDED_FILTER:
      case TokenType.EDITED_FILTER:
      case TokenType.REVIEWED_FILTER:
        this.advance();
        return this.parseDateFilter(token);

      case TokenType.RATED_FILTER:
        this.advance();
        return this.parseRatedFilter(token.value);

      case TokenType.INTERVAL_FILTER:
      case TokenType.DUE_FILTER:
      case TokenType.EASE_FILTER:
      case TokenType.LAPSES_FILTER:
      case TokenType.STABILITY_FILTER:
      case TokenType.DIFFICULTY_FILTER:
      case TokenType.PROP_FILTER:
        this.advance();
        return this.parsePropertyFilter(token);

      case TokenType.FIELD_FILTER:
        this.advance();
        return this.parseFieldFilter(token);

      case TokenType.DUPE_FILTER:
        this.advance();
        return this.parseDuplicateFilter(token.value);

      default:
        throw new SearchParseError(
          `Unexpected token: ${token.raw}`,
          token.position
        );
    }
  }

  private parseDeckFilter(value: string): DeckFilterNode {
    const includeChildren = value.endsWith('::*');
    const deckName = includeChildren ? value.slice(0, -3) : value;
    return { type: 'deck_filter', deckName, includeChildren };
  }

  private parseTagFilter(value: string): TagFilterNode {
    if (value === 'none') {
      return { type: 'tag_filter', tagPath: '', includeDescendants: false, isNone: true };
    }
    const includeDescendants = value.endsWith('::*');
    const tagPath = includeDescendants ? value.slice(0, -3) : value;
    return { type: 'tag_filter', tagPath, includeDescendants, isNone: false };
  }

  private parseStateFilter(value: string): StateFilterNode {
    const validStates = ['new', 'learn', 'review', 'due', 'paused', 'buried', 'leech'];
    if (!validStates.includes(value)) {
      throw new SearchParseError(`Invalid state: ${value}. Valid: ${validStates.join(', ')}`, 0);
    }
    return { type: 'state_filter', state: value as StateFilterNode['state'] };
  }

  private parseDateFilter(token: Token): DateFilterNode {
    const typeMap: Record<string, DateFilterNode['dateType']> = {
      [TokenType.ADDED_FILTER]: 'added',
      [TokenType.EDITED_FILTER]: 'edited',
      [TokenType.REVIEWED_FILTER]: 'reviewed',
    };
    return {
      type: 'date_filter',
      dateType: typeMap[token.type],
      days: parseInt(token.value, 10),
    };
  }

  private parseRatedFilter(value: string): DateFilterNode {
    const parts = value.split(':');
    return {
      type: 'date_filter',
      dateType: 'rated',
      days: parseInt(parts[0], 10),
      answer: parts[1] as ReviewAnswer | undefined,
    };
  }

  private parsePropertyFilter(token: Token): PropertyFilterNode {
    // Parse operator and value from token value
    const value = token.value;
    const operatorMatch = value.match(/^([<>!=]+)(.+)$/) || value.match(/^(.+?)([<>!=]+)(.+)$/);

    let operator: string;
    let numValue: number;
    let property: string;

    // Determine property from token type
    const propMap: Record<string, string> = {
      [TokenType.INTERVAL_FILTER]: 'interval',
      [TokenType.DUE_FILTER]: 'due',
      [TokenType.EASE_FILTER]: 'ease',
      [TokenType.LAPSES_FILTER]: 'lapses',
      [TokenType.STABILITY_FILTER]: 'stability',
      [TokenType.DIFFICULTY_FILTER]: 'difficulty',
    };

    if (token.type === TokenType.PROP_FILTER) {
      // prop:name>value format
      const propMatch = value.match(/^(\w+)([<>!=]+)(.+)$/);
      if (!propMatch) throw new SearchParseError(`Invalid prop filter: ${value}`, token.position);
      property = propMatch[1];
      operator = propMatch[2];
      numValue = parseFloat(propMatch[3]);
    } else {
      property = propMap[token.type] || 'interval';
      const opMatch = value.match(/^([<>!=]*)(\d+\.?\d*)$/);
      if (opMatch) {
        operator = opMatch[1] || '=';
        numValue = parseFloat(opMatch[2]);
      } else {
        operator = '=';
        numValue = parseFloat(value);
      }
    }

    return {
      type: 'property_filter',
      property: property as PropertyFilterNode['property'],
      operator: operator as PropertyFilterNode['operator'],
      value: numValue,
    };
  }

  private parseFieldFilter(token: Token): FieldSearchNode {
    const raw = token.raw;
    const firstColon = raw.indexOf(':');
    const prefix = raw.substring(0, firstColon).toLowerCase();
    const rest = raw.substring(firstColon + 1);

    if (prefix === 'front') {
      return { type: 'field_search', fieldName: '_front', value: rest, isExact: false };
    } else if (prefix === 'back') {
      return { type: 'field_search', fieldName: '_back', value: rest, isExact: false };
    } else {
      // field:FieldName:value
      const secondColon = rest.indexOf(':');
      if (secondColon === -1) {
        throw new SearchParseError(`Invalid field filter: ${raw}`, token.position);
      }
      return {
        type: 'field_search',
        fieldName: rest.substring(0, secondColon),
        value: rest.substring(secondColon + 1),
        isExact: false,
      };
    }
  }

  private parseDuplicateFilter(value: string): DuplicateFilterNode {
    const commaIndex = value.indexOf(',');
    if (commaIndex === -1) {
      throw new SearchParseError(`Invalid dupe filter: ${value}. Expected dupe:NoteType,FieldName`, 0);
    }
    return {
      type: 'duplicate_filter',
      noteTypeName: value.substring(0, commaIndex),
      fieldName: value.substring(commaIndex + 1),
    };
  }
}
```

#### SQL Compiler

```typescript
// packages/search-parser/src/sql-compiler.ts

interface SqlResult {
  clause: string;         // SQL WHERE clause fragment
  params: unknown[];      // Parameterized values
  joins: string[];        // Additional JOIN clauses needed
}

class SearchSqlCompiler {
  private paramIndex = 0;
  private joins = new Set<string>();
  private userId: string;
  private today: number;

  constructor(userId: string) {
    this.userId = userId;
    this.today = Math.floor(Date.now() / 86400000); // Day number
  }

  compile(ast: ASTNode): SqlResult {
    const clause = this.compileNode(ast);
    return {
      clause: clause || 'TRUE',
      params: [],
      joins: Array.from(this.joins),
    };
  }

  private compileNode(node: ASTNode): string {
    switch (node.type) {
      case 'text_search':
        return this.compileTextSearch(node);
      case 'field_search':
        return this.compileFieldSearch(node);
      case 'deck_filter':
        return this.compileDeckFilter(node);
      case 'tag_filter':
        return this.compileTagFilter(node);
      case 'note_type_filter':
        return this.compileNoteTypeFilter(node);
      case 'state_filter':
        return this.compileStateFilter(node);
      case 'flag_filter':
        return this.compileFlagFilter(node);
      case 'date_filter':
        return this.compileDateFilter(node);
      case 'property_filter':
        return this.compilePropertyFilter(node);
      case 'duplicate_filter':
        return this.compileDuplicateFilter(node);
      case 'and':
        return this.compileAnd(node);
      case 'or':
        return this.compileOr(node);
      case 'not':
        return this.compileNot(node);
      case 'wildcard':
        return 'TRUE';
    }
  }

  private compileTextSearch(node: TextSearchNode): string {
    this.joins.add('JOIN note_field_values nfv ON nfv.note_id = c.note_id');
    if (node.isExact) {
      return `nfv.stripped_value ILIKE '%' || '${this.escape(node.value)}' || '%'`;
    } else {
      // Use full-text search for non-exact queries
      const tsQuery = node.value.split(/\s+/).map(w => `${w}:*`).join(' & ');
      return `nfv.stripped_value @@ to_tsquery('english', '${this.escape(tsQuery)}')`;
    }
  }

  private compileFieldSearch(node: FieldSearchNode): string {
    this.joins.add('JOIN note_field_values nfv ON nfv.note_id = c.note_id');
    this.joins.add('JOIN fields f ON nfv.field_id = f.id');

    if (node.fieldName === '_front' || node.fieldName === '_back') {
      // Front/back maps to the card template, which we approximate via ordinal
      const ordinalCondition = node.fieldName === '_front' ? 'f.ordinal = 0' : 'f.ordinal = 1';
      return `(${ordinalCondition} AND nfv.stripped_value ILIKE '%${this.escape(node.value)}%')`;
    }

    return `(f.name = '${this.escape(node.fieldName)}' AND nfv.stripped_value ILIKE '%${this.escape(node.value)}%')`;
  }

  private compileDeckFilter(node: DeckFilterNode): string {
    this.joins.add('JOIN decks d ON c.deck_id = d.id');
    if (node.includeChildren) {
      return `(d.full_name = '${this.escape(node.deckName)}' OR d.full_name LIKE '${this.escape(node.deckName)}::%')`;
    }
    return `d.full_name = '${this.escape(node.deckName)}'`;
  }

  private compileTagFilter(node: TagFilterNode): string {
    if (node.isNone) {
      return `NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = c.note_id)`;
    }

    this.joins.add('JOIN note_tags nt_search ON nt_search.note_id = c.note_id');
    this.joins.add('JOIN tags t_search ON nt_search.tag_id = t_search.id');

    if (node.includeDescendants) {
      return `(t_search.full_path = '${this.escape(node.tagPath)}' OR t_search.full_path LIKE '${this.escape(node.tagPath)}::%')`;
    }
    return `t_search.full_path = '${this.escape(node.tagPath)}'`;
  }

  private compileNoteTypeFilter(node: NoteTypeFilterNode): string {
    this.joins.add('JOIN notes n ON c.note_id = n.id');
    this.joins.add('JOIN note_types nt_filter ON n.note_type_id = nt_filter.id');
    return `nt_filter.name = '${this.escape(node.noteTypeName)}'`;
  }

  private compileStateFilter(node: StateFilterNode): string {
    switch (node.state) {
      case 'new':     return `c.queue = 'new'`;
      case 'learn':   return `c.queue IN ('learning', 'relearning', 'day_learning')`;
      case 'review':  return `c.queue = 'review'`;
      case 'due':     return `(c.queue = 'review' AND c.due <= ${this.today})`;
      case 'paused':  return `c.status = 'paused'`;
      case 'buried':  return `c.status = 'skipped_today'`;
      case 'leech':   return `c.leech_flagged = TRUE`;
    }
  }

  private compileFlagFilter(node: FlagFilterNode): string {
    if (node.flagNumber === 0) {
      return `c.flags = 0`;
    }
    const flagBit = 1 << (node.flagNumber - 1);
    return `(c.flags & ${flagBit}) > 0`;
  }

  private compileDateFilter(node: DateFilterNode): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - node.days);
    const cutoffStr = cutoff.toISOString();

    switch (node.dateType) {
      case 'added':
        return `c.created_at >= '${cutoffStr}'`;
      case 'edited':
        this.joins.add('JOIN notes n_edited ON c.note_id = n_edited.id');
        return `n_edited.updated_at >= '${cutoffStr}'`;
      case 'reviewed':
        return `EXISTS (SELECT 1 FROM review_logs rl WHERE rl.card_id = c.id AND rl.reviewed_at >= '${cutoffStr}')`;
      case 'rated':
        const answerClause = node.answer ? ` AND rl.answer = '${node.answer}'` : '';
        return `EXISTS (SELECT 1 FROM review_logs rl WHERE rl.card_id = c.id AND rl.reviewed_at >= '${cutoffStr}'${answerClause})`;
      case 'introduced':
        return `EXISTS (SELECT 1 FROM review_logs rl WHERE rl.card_id = c.id AND rl.reviewed_at >= '${cutoffStr}' AND rl.previous_queue = 'new')`;
    }
  }

  private compilePropertyFilter(node: PropertyFilterNode): string {
    const columnMap: Record<string, string> = {
      'due': 'c.due',
      'interval': 'c.interval_days',
      'ease': `(c.ease_factor / 1000.0)`,
      'stability': 'c.stability',
      'difficulty': 'c.difficulty',
      'lapses': 'c.lapse_count',
      'reviews': 'c.review_count',
    };

    const column = columnMap[node.property];
    if (!column) return 'TRUE';

    // For 'due', adjust the value relative to today
    const value = node.property === 'due' ? this.today + node.value : node.value;

    return `${column} ${node.operator} ${value}`;
  }

  private compileDuplicateFilter(node: DuplicateFilterNode): string {
    return `c.note_id IN (
      SELECT nfv1.note_id
      FROM note_field_values nfv1
      JOIN fields f1 ON nfv1.field_id = f1.id
      JOIN note_types nt1 ON f1.note_type_id = nt1.id
      WHERE nt1.name = '${this.escape(node.noteTypeName)}'
        AND f1.name = '${this.escape(node.fieldName)}'
        AND nfv1.stripped_value IN (
          SELECT nfv2.stripped_value
          FROM note_field_values nfv2
          JOIN fields f2 ON nfv2.field_id = f2.id
          WHERE f2.note_type_id = nt1.id AND f2.name = f1.name
          GROUP BY nfv2.stripped_value
          HAVING COUNT(*) > 1
        )
    )`;
  }

  private compileAnd(node: AndNode): string {
    const clauses = node.children.map(c => this.compileNode(c));
    return `(${clauses.join(' AND ')})`;
  }

  private compileOr(node: OrNode): string {
    const clauses = node.children.map(c => this.compileNode(c));
    return `(${clauses.join(' OR ')})`;
  }

  private compileNot(node: NotNode): string {
    const clause = this.compileNode(node.child);
    return `NOT (${clause})`;
  }

  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}

/**
 * Full pipeline: parse search string and produce SQL.
 */
function compileSearchToSql(query: string, userId: string): SqlResult {
  const lexer = new SearchLexer(query);
  const tokens = lexer.tokenize();
  const parser = new SearchParser(tokens);
  const ast = parser.parse();
  const compiler = new SearchSqlCompiler(userId);
  return compiler.compile(ast);
}
```

### Browser API Endpoints

```
Card Browser API
==============================================================================

GET    /api/v1/browser/search?q=<query>&page=1&pageSize=50&sort=due&order=asc
       Search cards with full query syntax. Returns paginated results.

GET    /api/v1/browser/search/preview?q=<query>
       Returns just the count of matching cards (for UI preview).

GET    /api/v1/browser/cards/:id
       Get full card details including rendered HTML, note fields, etc.

GET    /api/v1/browser/notes/:id
       Get full note details with all field values and generated cards.

POST   /api/v1/browser/batch
       Perform batch operations on search results.
       Body: { "query": "search string", "action": "pause|flag|move|delete", ... }

GET    /api/v1/browser/columns
       Get available columns for the browser table view.

PUT    /api/v1/browser/columns
       Save the user's column preferences and widths.

Sort Options:
  - due          Card due date
  - interval     Current interval
  - ease         Ease factor
  - stability    FSRS stability
  - difficulty   FSRS difficulty
  - lapses       Lapse count
  - reviews      Review count
  - created      Date created
  - updated      Date modified
  - deck         Deck name
  - note_type    Note type name
  - sort_field   The note type's designated sort field
```

---

## 1.8 Media, Templates, Styling

### Media Storage Architecture

Media files (images, audio, video) are stored separately from the database. The database only stores references (filenames/URLs) while the actual binary files are stored in object storage.

#### Media Database Schema

```sql
-- ============================================================================
-- MEDIA FILES
-- ============================================================================

CREATE TABLE media_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        VARCHAR(500) NOT NULL,             -- Original filename
    storage_key     VARCHAR(500) NOT NULL,             -- Key in object storage
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,              -- For dedup and integrity
    width           INTEGER,                           -- For images/video
    height          INTEGER,                           -- For images/video
    duration_ms     INTEGER,                           -- For audio/video
    reference_count INTEGER NOT NULL DEFAULT 0,        -- How many fields reference this
    is_orphaned     BOOLEAN NOT NULL DEFAULT FALSE,    -- No fields reference it
    usn             BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, checksum_sha256)
);

CREATE INDEX idx_media_user ON media_files (user_id);
CREATE INDEX idx_media_filename ON media_files (user_id, filename);
CREATE INDEX idx_media_orphaned ON media_files (is_orphaned) WHERE is_orphaned = TRUE;
CREATE INDEX idx_media_checksum ON media_files (checksum_sha256);
```

#### Media Upload Flow

```typescript
// apps/api/src/services/media-service.ts

interface MediaUploadResult {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Upload a media file.
 *
 * 1. Validate file type and size
 * 2. Compute SHA-256 checksum
 * 3. Check for existing file with same checksum (dedup)
 * 4. Upload to object storage
 * 5. Create database record
 * 6. Return URL for embedding in note fields
 */
async function uploadMedia(
  userId: string,
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }
): Promise<MediaUploadResult> {
  // 1. Validate
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/mp4',
    'video/mp4', 'video/webm',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.mimeType)) {
    throw new AppError(ErrorCode.VALIDATION_INVALID_FORMAT,
      `File type ${file.mimeType} is not allowed`, 400);
  }

  const maxSize = config.storage.maxFileSizeMb * 1024 * 1024;
  if (file.buffer.length > maxSize) {
    throw new AppError(ErrorCode.VALIDATION_CONSTRAINT_VIOLATION,
      `File exceeds maximum size of ${config.storage.maxFileSizeMb}MB`, 400);
  }

  // 2. Compute checksum
  const checksum = crypto
    .createHash('sha256')
    .update(file.buffer)
    .digest('hex');

  // 3. Check for duplicate
  const existing = await db('media_files')
    .where({ user_id: userId, checksum_sha256: checksum })
    .first();

  if (existing) {
    // File already exists, just return the existing URL
    return {
      id: existing.id,
      filename: existing.filename,
      url: `${config.storage.cdnUrl}/${existing.storage_key}`,
      mimeType: existing.mime_type,
      sizeBytes: existing.size_bytes,
    };
  }

  // 4. Upload to object storage
  const ext = path.extname(file.originalName) || mimeToExt(file.mimeType);
  const storageKey = `media/${userId}/${uuidv4()}${ext}`;

  await objectStorage.put(storageKey, file.buffer, {
    contentType: file.mimeType,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  // 5. Extract metadata for images/audio/video
  const metadata = await extractMediaMetadata(file.buffer, file.mimeType);

  // 6. Create database record
  const [record] = await db('media_files').insert({
    user_id: userId,
    filename: file.originalName,
    storage_key: storageKey,
    mime_type: file.mimeType,
    size_bytes: file.buffer.length,
    checksum_sha256: checksum,
    width: metadata?.width,
    height: metadata?.height,
    duration_ms: metadata?.durationMs,
    reference_count: 0,
  }).returning('*');

  return {
    id: record.id,
    filename: record.filename,
    url: `${config.storage.cdnUrl}/${storageKey}`,
    mimeType: record.mime_type,
    sizeBytes: record.size_bytes,
  };
}
```

#### Media References in Fields

Media is embedded in note field HTML content using standard HTML tags with a special URL scheme:

```html
<!-- Images -->
<img src="media://image-uuid-or-filename.jpg" alt="Diagram of cell" />

<!-- Audio -->
<audio controls>
  <source src="media://pronunciation.mp3" type="audio/mpeg" />
</audio>

<!-- Video -->
<video controls width="400">
  <source src="media://demo.mp4" type="video/mp4" />
</video>
```

The `media://` protocol is resolved at render time by the template engine:

```typescript
/**
 * Resolve media:// URLs to actual CDN URLs for rendering.
 */
function resolveMediaUrls(html: string, cdnBaseUrl: string): string {
  return html.replace(
    /media:\/\/([^"'\s)]+)/g,
    (_, filename) => `${cdnBaseUrl}/media/${filename}`
  );
}
```

### Template Styling System

Each note type has an associated CSS stylesheet that controls the visual appearance of all cards generated from that note type. Individual card templates can also have their own additional CSS.

#### Default CSS Structure

```css
/* Base styles applied to all cards */
.card {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  line-height: 1.6;
  color: #1a1a2e;
  background-color: #ffffff;
  text-align: center;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

/* Dark mode support */
.card.dark-mode {
  color: #e0e0e0;
  background-color: #1a1a2e;
}

/* Question side */
.card .question {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
}

/* Answer side */
.card .answer {
  font-size: 20px;
}

/* Separator line between question and answer on the back */
.card hr#answer-divider {
  border: none;
  border-top: 2px solid #e0e0e0;
  margin: 20px 0;
}

/* Cloze deletion styles */
.cloze-blank {
  font-weight: bold;
  color: #2196F3;
  background-color: #E3F2FD;
  padding: 2px 8px;
  border-radius: 4px;
}

.cloze-reveal {
  font-weight: bold;
  color: #4CAF50;
  background-color: #E8F5E9;
  padding: 2px 8px;
  border-radius: 4px;
}

/* Type-answer input */
.type-answer-input {
  font-size: 20px;
  padding: 8px 16px;
  border: 2px solid #ccc;
  border-radius: 8px;
  text-align: center;
  width: 80%;
  max-width: 400px;
}

.type-answer-input:focus {
  border-color: #2196F3;
  outline: none;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
}

/* Type-answer comparison result */
.type-answer-correct {
  color: #4CAF50;
  background-color: #E8F5E9;
}

.type-answer-incorrect {
  color: #F44336;
  background-color: #FFEBEE;
  text-decoration: line-through;
}

.type-answer-missing {
  color: #FF9800;
  background-color: #FFF3E0;
}

/* Hint toggle */
.hint-toggle {
  margin: 12px 0;
}

.hint-button {
  cursor: pointer;
  color: #2196F3;
  font-size: 14px;
  user-select: none;
}

.hint-content {
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
  font-size: 16px;
}

/* Image styling */
.card img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 8px 0;
}

/* MathJax container */
.mathjax-container {
  overflow-x: auto;
  padding: 8px 0;
}
```

### MathJax Integration

The system supports LaTeX mathematical notation via MathJax. Both inline and display math are supported.

**Syntax in field content**:

```
Inline math: \( E = mc^2 \) or $E = mc^2$
Display math: \[ \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2} \]
or: $$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
```

**MathJax Configuration**:

```typescript
// apps/web/lib/mathjax-config.ts

const MATHJAX_CONFIG = {
  tex: {
    inlineMath: [['\\(', '\\)'], ['$', '$']],
    displayMath: [['\\[', '\\]'], ['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined', 'color', 'boldsymbol'],
  },
  svg: {
    fontCache: 'global',
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'no-mathjax',
  },
};

/**
 * After rendering a card, trigger MathJax typesetting.
 */
async function typesetMath(element: HTMLElement): Promise<void> {
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([element]);
  }
}
```

### Text-to-Speech (TTS) Integration

TTS allows automatic pronunciation of card content. It can be triggered automatically when a card is shown or manually by the user.

**TTS Markup in Templates**:

```html
<!-- Auto-play TTS when card is shown -->
{{tts en_US:Front}}

<!-- TTS with specific voice and speed -->
{{tts ja_JP voices=Google_ja-JP-Standard-A speed=0.8:Reading}}

<!-- TTS with multiple language fallbacks -->
{{tts en_US,en_GB:Word}}
```

**TTS Service**:

```typescript
// apps/web/lib/tts-service.ts

interface TTSOptions {
  lang: string;
  voice?: string;
  rate?: number;          // 0.5 - 2.0
  pitch?: number;         // 0 - 2
  volume?: number;        // 0 - 1
}

class TTSService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isPlaying = false;

  constructor() {
    this.synth = window.speechSynthesis;
    this.synth.onvoiceschanged = () => {
      this.voices = this.synth.getVoices();
    };
  }

  async speak(text: string, options: TTSOptions): Promise<void> {
    if (this.isPlaying) {
      this.synth.cancel();
    }

    return new Promise((resolve, reject) => {
      // Strip HTML tags from text
      const plainText = text.replace(/<[^>]*>/g, '').trim();
      if (!plainText) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = options.lang;
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      // Find matching voice
      if (options.voice) {
        const voice = this.voices.find(v => v.name === options.voice);
        if (voice) utterance.voice = voice;
      } else {
        // Auto-select best voice for language
        const voice = this.voices.find(v => v.lang.startsWith(options.lang));
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        this.isPlaying = false;
        resolve();
      };
      utterance.onerror = (event) => {
        this.isPlaying = false;
        reject(new Error(`TTS error: ${event.error}`));
      };

      this.isPlaying = true;
      this.synth.speak(utterance);
    });
  }

  stop(): void {
    this.synth.cancel();
    this.isPlaying = false;
  }
}
```

**Processing TTS tags in templates**:

```typescript
/**
 * Extract TTS directives from rendered card HTML.
 * Returns the HTML with TTS tags removed and a list of TTS instructions.
 */
interface TTSDirective {
  lang: string;
  fieldName: string;
  text: string;
  voice?: string;
  speed?: number;
}

function extractTTSDirectives(
  html: string,
  fields: Map<string, string>
): { cleanHtml: string; directives: TTSDirective[] } {
  const directives: TTSDirective[] = [];
  const ttsPattern = /\{\{tts\s+([a-zA-Z_,]+)(?:\s+([^:]*?))?:(\w+)\}\}/g;

  const cleanHtml = html.replace(ttsPattern, (_, langs, optionsStr, fieldName) => {
    const text = fields.get(fieldName) || '';
    const options = parseTTSOptions(optionsStr || '');

    directives.push({
      lang: langs.split(',')[0],
      fieldName,
      text,
      voice: options.voice,
      speed: options.speed,
    });

    return ''; // Remove TTS tag from visible HTML
  });

  return { cleanHtml, directives };
}

function parseTTSOptions(optStr: string): { voice?: string; speed?: number } {
  const result: { voice?: string; speed?: number } = {};
  const parts = optStr.trim().split(/\s+/);
  for (const part of parts) {
    if (part.startsWith('voices=')) {
      result.voice = part.substring(7);
    } else if (part.startsWith('speed=')) {
      result.speed = parseFloat(part.substring(6));
    }
  }
  return result;
}
```

### Media API Endpoints

```
Media API
==============================================================================

POST   /api/v1/media/upload             Upload a media file
GET    /api/v1/media/:id                Get media file metadata
GET    /api/v1/media/:id/download       Download the actual file
DELETE /api/v1/media/:id                Delete a media file
GET    /api/v1/media                    List all media files for user
GET    /api/v1/media/orphaned           List media files not referenced by any note
POST   /api/v1/media/cleanup            Delete all orphaned media files
GET    /api/v1/media/usage              Get total media storage usage
```

---

## 1.9 Statistics, Sync, Import/Export

### Statistics and Analytics

The system collects detailed review log data to provide comprehensive learning analytics. Statistics are computed from the `review_logs` table and can be aggregated at the deck, tag, or user level.

#### Core Statistics Queries

**Daily Review Count (last 30 days)**:

```sql
-- Reviews per day for the last 30 days
SELECT
    DATE(reviewed_at AT TIME ZONE :userTimezone) AS review_date,
    COUNT(*) AS total_reviews,
    COUNT(*) FILTER (WHERE answer = 'again') AS again_count,
    COUNT(*) FILTER (WHERE answer = 'hard') AS hard_count,
    COUNT(*) FILTER (WHERE answer = 'good') AS good_count,
    COUNT(*) FILTER (WHERE answer = 'easy') AS easy_count,
    SUM(time_taken_ms) / 1000.0 AS total_seconds,
    AVG(time_taken_ms) AS avg_time_ms,
    COUNT(DISTINCT card_id) AS unique_cards
FROM review_logs
WHERE user_id = :userId
  AND reviewed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(reviewed_at AT TIME ZONE :userTimezone)
ORDER BY review_date DESC;
```

**Card State Distribution**:

```sql
-- Current card state distribution for a user (or filtered by deck)
SELECT
    c.queue,
    c.status,
    COUNT(*) AS count
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  -- Optionally filter by deck:
  -- AND c.deck_id = :deckId
GROUP BY c.queue, c.status
ORDER BY c.queue;
```

**Review Forecast (upcoming due cards for next 30 days)**:

```sql
-- Forecast of cards due each day for the next 30 days
SELECT
    (c.due - :todayDayNumber) AS days_from_now,
    COUNT(*) AS due_count
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  AND c.queue = 'review'
  AND c.status = 'active'
  AND c.due BETWEEN :todayDayNumber AND :todayDayNumber + 30
GROUP BY days_from_now
ORDER BY days_from_now;
```

**Retention Rate (percentage of successful recalls)**:

```sql
-- Retention rate over the last N days
SELECT
    COUNT(*) FILTER (WHERE answer != 'again') * 100.0 / NULLIF(COUNT(*), 0)
        AS retention_rate,
    COUNT(*) AS total_reviews,
    COUNT(*) FILTER (WHERE answer = 'again') AS failed_reviews
FROM review_logs
WHERE user_id = :userId
  AND reviewed_at >= NOW() - INTERVAL '30 days'
  AND previous_queue = 'review';  -- Only count reviews, not learning steps
```

**Interval Distribution**:

```sql
-- Distribution of card intervals (how mature is the collection)
SELECT
    CASE
        WHEN interval_days = 0 THEN 'New/Learning'
        WHEN interval_days BETWEEN 1 AND 7 THEN '1-7 days'
        WHEN interval_days BETWEEN 8 AND 30 THEN '8-30 days'
        WHEN interval_days BETWEEN 31 AND 90 THEN '1-3 months'
        WHEN interval_days BETWEEN 91 AND 365 THEN '3-12 months'
        ELSE '1+ year'
    END AS interval_bucket,
    COUNT(*) AS card_count
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  AND c.status = 'active'
GROUP BY
    CASE
        WHEN interval_days = 0 THEN 'New/Learning'
        WHEN interval_days BETWEEN 1 AND 7 THEN '1-7 days'
        WHEN interval_days BETWEEN 8 AND 30 THEN '8-30 days'
        WHEN interval_days BETWEEN 31 AND 90 THEN '1-3 months'
        WHEN interval_days BETWEEN 91 AND 365 THEN '3-12 months'
        ELSE '1+ year'
    END
ORDER BY MIN(interval_days);
```

**Time Spent Studying**:

```sql
-- Total study time per day for the last 30 days
SELECT
    DATE(reviewed_at AT TIME ZONE :userTimezone) AS study_date,
    SUM(time_taken_ms) / 60000.0 AS total_minutes,
    COUNT(*) AS review_count,
    AVG(time_taken_ms) / 1000.0 AS avg_seconds_per_card
FROM review_logs
WHERE user_id = :userId
  AND reviewed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(reviewed_at AT TIME ZONE :userTimezone)
ORDER BY study_date DESC;
```

**Ease Factor Distribution (SM-2) and Difficulty Distribution (FSRS)**:

```sql
-- Ease factor distribution (SM-2 users)
SELECT
    ROUND(ease_factor / 100.0) * 100 AS ease_bucket,  -- Round to nearest 0.1
    COUNT(*) AS card_count
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  AND c.queue = 'review'
  AND c.status = 'active'
GROUP BY ROUND(ease_factor / 100.0) * 100
ORDER BY ease_bucket;

-- FSRS difficulty distribution
SELECT
    ROUND(difficulty) AS diff_bucket,
    COUNT(*) AS card_count
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  AND c.queue = 'review'
  AND c.status = 'active'
  AND c.difficulty IS NOT NULL
GROUP BY ROUND(difficulty)
ORDER BY diff_bucket;
```

**Hourly Review Pattern (when does the user typically study)**:

```sql
SELECT
    EXTRACT(HOUR FROM reviewed_at AT TIME ZONE :userTimezone)::INTEGER AS hour_of_day,
    COUNT(*) AS review_count
FROM review_logs
WHERE user_id = :userId
  AND reviewed_at >= NOW() - INTERVAL '90 days'
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

**Lapse Analysis (most-lapsed cards)**:

```sql
-- Top 20 most-lapsed (hardest) cards
SELECT
    c.id AS card_id,
    c.lapse_count,
    c.interval_days,
    c.ease_factor / 1000.0 AS ease,
    c.stability,
    c.difficulty,
    nfv.stripped_value AS sort_field_value,
    d.full_name AS deck_name
FROM cards c
JOIN notes n ON c.note_id = n.id
JOIN note_field_values nfv ON nfv.note_id = n.id
JOIN fields f ON nfv.field_id = f.id
JOIN note_types nt ON n.note_type_id = nt.id AND f.id = nt.sort_field_id
JOIN decks d ON c.deck_id = d.id
WHERE n.user_id = :userId
  AND c.status = 'active'
ORDER BY c.lapse_count DESC
LIMIT 20;
```

**FSRS Retrievability Heatmap Data**:

```sql
-- For each review card, compute current estimated retrievability
SELECT
    c.id,
    c.stability,
    c.due,
    EXTRACT(EPOCH FROM (NOW() - c.last_review_at)) / 86400.0 AS elapsed_days,
    POWER(1 + (EXTRACT(EPOCH FROM (NOW() - c.last_review_at)) / 86400.0) / (9 * c.stability), -1)
        AS estimated_retrievability
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE n.user_id = :userId
  AND c.queue = 'review'
  AND c.status = 'active'
  AND c.stability IS NOT NULL
  AND c.last_review_at IS NOT NULL
ORDER BY estimated_retrievability ASC
LIMIT 100;
```

#### Statistics API Endpoints

```
Statistics API
==============================================================================

GET    /api/v1/stats/overview           Dashboard overview (total cards, due today, streak, etc.)
GET    /api/v1/stats/reviews?days=30    Daily review counts and breakdown
GET    /api/v1/stats/forecast?days=30   Upcoming due card forecast
GET    /api/v1/stats/retention?days=30  Retention rate over time
GET    /api/v1/stats/intervals          Card interval distribution
GET    /api/v1/stats/time?days=30       Study time per day
GET    /api/v1/stats/ease               Ease factor / difficulty distribution
GET    /api/v1/stats/hours              Hourly study pattern
GET    /api/v1/stats/leeches            Most-lapsed cards
GET    /api/v1/stats/retrievability     Current retrievability distribution (FSRS)
GET    /api/v1/stats/added?days=30      Cards/notes added per day
GET    /api/v1/stats/streak             Current and longest study streak

All endpoints accept optional query params:
  ?deckId=<uuid>     Filter to a specific deck (and sub-decks)
  ?tagPath=<path>    Filter to a specific tag
```

### Sync Protocol

The sync protocol uses **Update Sequence Numbers (USNs)** to track changes across devices. This is a proven approach (used by Evernote, Anki, and others) that works well for conflict detection and incremental sync.

#### Sync Concepts

- **USN (Update Sequence Number)**: A monotonically increasing integer on the server. Each mutation (create, update, delete) increments the server's USN. The new USN is stamped on the affected record.
- **Client USN**: Each client tracks the last server USN it synchronized. On the next sync, it requests all changes since that USN.
- **Full Sync**: Required when the client's USN is too far behind or when data integrity issues are detected. Downloads the entire collection.
- **Incremental Sync**: The normal flow. Client sends its changes, server sends changes since the client's last USN.

#### Sync Database Schema

```sql
-- ============================================================================
-- SYNC TRACKING
-- ============================================================================

-- Track the server's current USN per user
-- (Already on the users table as users.usn)

-- Track each client device's sync state
CREATE TABLE sync_clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       VARCHAR(255) NOT NULL,           -- Unique device identifier
    device_name     VARCHAR(200),                    -- Human-readable name
    platform        VARCHAR(50),                     -- 'web', 'ios', 'android', 'desktop'
    last_sync_at    TIMESTAMPTZ,
    last_usn        BIGINT NOT NULL DEFAULT 0,       -- Last USN this client synced to
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_sync_clients_user ON sync_clients (user_id);

-- Tombstones: track deletions so they can be synced
CREATE TABLE sync_tombstones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL,             -- 'note', 'card', 'deck', 'tag', etc.
    entity_id       UUID NOT NULL,                    -- ID of the deleted entity
    usn             BIGINT NOT NULL,                  -- USN at time of deletion
    deleted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tombstones_user_usn ON sync_tombstones (user_id, usn);
CREATE INDEX idx_tombstones_entity ON sync_tombstones (entity_type, entity_id);
```

#### Sync Protocol Flow

```
CLIENT                                SERVER
  |                                     |
  |  1. POST /sync/start               |
  |     { clientUsn, deviceId }         |
  |  ---------------------------------> |
  |                                     |  Check if incremental sync possible:
  |                                     |  if (serverUsn - clientUsn > threshold)
  |                                     |    -> require full sync
  |  <--------------------------------- |
  |     { syncType: 'incremental',      |
  |       serverUsn: 1234 }             |
  |                                     |
  |  2. POST /sync/push                |
  |     { changes from client }         |
  |  ---------------------------------> |
  |                                     |  Apply client changes
  |                                     |  Detect conflicts
  |                                     |  Increment USN for each change
  |  <--------------------------------- |
  |     { conflicts: [...],             |
  |       appliedUsn: 1240 }            |
  |                                     |
  |  3. GET /sync/pull?since=<usn>     |
  |  ---------------------------------> |
  |                                     |  Gather all changes since client's USN
  |  <--------------------------------- |
  |     { changes: [...],               |
  |       deletions: [...],             |
  |       newUsn: 1240 }               |
  |                                     |
  |  4. POST /sync/finish              |
  |     { newClientUsn: 1240 }         |
  |  ---------------------------------> |
  |                                     |  Update client's sync record
  |  <--------------------------------- |
  |     { success: true }               |
```

#### Sync Service Implementation

```typescript
// packages/sync-engine/src/server.ts

interface SyncStartRequest {
  deviceId: string;
  clientUsn: number;
  platform: string;
  deviceName?: string;
}

interface SyncStartResponse {
  syncType: 'incremental' | 'full';
  serverUsn: number;
}

interface SyncChange {
  entity: 'note' | 'card' | 'deck' | 'tag' | 'note_type' | 'deck_preset' | 'media' | 'review_log';
  operation: 'upsert' | 'delete';
  id: string;
  data?: Record<string, unknown>;   // Full entity data for upserts
  usn: number;
}

interface SyncPushRequest {
  changes: SyncChange[];
}

interface SyncPushResponse {
  conflicts: SyncConflict[];
  appliedCount: number;
  newServerUsn: number;
}

interface SyncConflict {
  entity: string;
  id: string;
  clientData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  resolution: 'server_wins' | 'client_wins' | 'merged';
}

interface SyncPullResponse {
  changes: SyncChange[];
  deletions: Array<{ entityType: string; entityId: string }>;
  newUsn: number;
  hasMore: boolean;        // For paginated pulls
}

class SyncServer {
  private fullSyncThreshold: number;
  private conflictStrategy: 'server_wins' | 'client_wins' | 'latest_wins';

  constructor(config: { fullSyncThreshold: number; conflictStrategy: string }) {
    this.fullSyncThreshold = config.fullSyncThreshold;
    this.conflictStrategy = config.conflictStrategy as any;
  }

  async startSync(userId: string, request: SyncStartRequest): Promise<SyncStartResponse> {
    const user = await db('users').where({ id: userId }).first();
    const serverUsn = user.usn;

    // Register or update client device
    await db('sync_clients')
      .insert({
        user_id: userId,
        device_id: request.deviceId,
        device_name: request.deviceName,
        platform: request.platform,
        last_sync_at: new Date(),
        last_usn: request.clientUsn,
      })
      .onConflict(['user_id', 'device_id'])
      .merge({
        device_name: request.deviceName,
        platform: request.platform,
        last_sync_at: new Date(),
      });

    // Determine sync type
    const usnGap = serverUsn - request.clientUsn;
    if (request.clientUsn === 0 || usnGap > this.fullSyncThreshold) {
      return { syncType: 'full', serverUsn };
    }

    return { syncType: 'incremental', serverUsn };
  }

  async pushChanges(userId: string, request: SyncPushRequest): Promise<SyncPushResponse> {
    const conflicts: SyncConflict[] = [];
    let appliedCount = 0;

    await db.transaction(async (trx) => {
      for (const change of request.changes) {
        if (change.operation === 'delete') {
          await this.applyDeletion(trx, userId, change);
          appliedCount++;
          continue;
        }

        // Check for conflicts: has the server version been modified
        // since the client last synced?
        const serverEntity = await this.getEntity(trx, change.entity, change.id);

        if (serverEntity && serverEntity.usn > (change.data?.usn ?? 0)) {
          // Conflict detected
          const resolution = this.resolveConflict(
            change.data || {},
            serverEntity,
          );

          conflicts.push({
            entity: change.entity,
            id: change.id,
            clientData: change.data || {},
            serverData: serverEntity,
            resolution: resolution.strategy,
          });

          if (resolution.strategy === 'client_wins') {
            await this.applyUpsert(trx, userId, change);
            appliedCount++;
          }
          // If server_wins, do nothing (server data stays)
          // If merged, apply the merge result
          if (resolution.strategy === 'merged' && resolution.mergedData) {
            change.data = resolution.mergedData;
            await this.applyUpsert(trx, userId, change);
            appliedCount++;
          }
        } else {
          // No conflict, apply change
          await this.applyUpsert(trx, userId, change);
          appliedCount++;
        }
      }

      // Increment user's USN
      await trx('users').where({ id: userId }).increment('usn', appliedCount);
    });

    const user = await db('users').where({ id: userId }).first();

    return {
      conflicts,
      appliedCount,
      newServerUsn: user.usn,
    };
  }

  async pullChanges(
    userId: string,
    sinceUsn: number,
    limit: number = 1000
  ): Promise<SyncPullResponse> {
    const entities = ['notes', 'cards', 'decks', 'tags', 'note_types',
                      'deck_presets', 'media_files', 'review_logs'];

    const changes: SyncChange[] = [];

    for (const table of entities) {
      const rows = await db(table)
        .where(table === 'review_logs' ? 'user_id' : 'user_id', userId)
        .where('usn', '>', sinceUsn)
        .orderBy('usn', 'asc')
        .limit(limit);

      const entityName = table.replace(/_/g, '_').replace(/s$/, '') as SyncChange['entity'];

      for (const row of rows) {
        changes.push({
          entity: entityName as any,
          operation: 'upsert',
          id: row.id,
          data: row,
          usn: row.usn,
        });
      }
    }

    // Get deletions
    const deletions = await db('sync_tombstones')
      .where({ user_id: userId })
      .where('usn', '>', sinceUsn)
      .orderBy('usn', 'asc')
      .limit(limit);

    const user = await db('users').where({ id: userId }).first();

    // Sort all changes by USN
    changes.sort((a, b) => a.usn - b.usn);

    return {
      changes: changes.slice(0, limit),
      deletions: deletions.map((d: any) => ({
        entityType: d.entity_type,
        entityId: d.entity_id,
      })),
      newUsn: user.usn,
      hasMore: changes.length >= limit,
    };
  }

  private resolveConflict(
    clientData: Record<string, unknown>,
    serverData: Record<string, unknown>,
  ): { strategy: 'server_wins' | 'client_wins' | 'merged'; mergedData?: Record<string, unknown> } {
    if (this.conflictStrategy === 'server_wins') {
      return { strategy: 'server_wins' };
    }
    if (this.conflictStrategy === 'client_wins') {
      return { strategy: 'client_wins' };
    }

    // 'latest_wins': compare updated_at timestamps
    const clientUpdated = new Date(clientData.updated_at as string).getTime();
    const serverUpdated = new Date(serverData.updated_at as string).getTime();

    if (clientUpdated > serverUpdated) {
      return { strategy: 'client_wins' };
    }
    return { strategy: 'server_wins' };
  }

  private async applyUpsert(
    trx: any,
    userId: string,
    change: SyncChange
  ): Promise<void> {
    const table = this.entityToTable(change.entity);
    const user = await trx('users').where({ id: userId }).first();
    const newUsn = user.usn + 1;

    const data = { ...change.data, usn: newUsn, updated_at: new Date() };

    await trx(table)
      .insert(data)
      .onConflict('id')
      .merge(data);
  }

  private async applyDeletion(
    trx: any,
    userId: string,
    change: SyncChange
  ): Promise<void> {
    const table = this.entityToTable(change.entity);
    const user = await trx('users').where({ id: userId }).first();
    const newUsn = user.usn + 1;

    await trx(table).where({ id: change.id }).delete();

    // Record tombstone for other clients
    await trx('sync_tombstones').insert({
      user_id: userId,
      entity_type: change.entity,
      entity_id: change.id,
      usn: newUsn,
    });
  }

  private entityToTable(entity: string): string {
    const map: Record<string, string> = {
      note: 'notes',
      card: 'cards',
      deck: 'decks',
      tag: 'tags',
      note_type: 'note_types',
      deck_preset: 'deck_presets',
      media: 'media_files',
      review_log: 'review_logs',
    };
    return map[entity] || entity;
  }

  private async getEntity(trx: any, entity: string, id: string): Promise<any> {
    const table = this.entityToTable(entity);
    return trx(table).where({ id }).first();
  }
}
```

#### Sync API Endpoints

```
Sync API
==============================================================================

POST   /api/v1/sync/start              Initiate sync session
POST   /api/v1/sync/push               Push client changes to server
GET    /api/v1/sync/pull?since=<usn>&limit=1000  Pull server changes
POST   /api/v1/sync/finish             Complete sync session
POST   /api/v1/sync/full-download      Download entire collection (full sync)
POST   /api/v1/sync/full-upload        Upload entire collection (full sync)
GET    /api/v1/sync/status             Get current sync status and USN
GET    /api/v1/sync/clients            List all synced devices
DELETE /api/v1/sync/clients/:deviceId  Remove a synced device
```

### Import/Export

#### .apkg Format (Anki Package Compatibility)

The `.apkg` format is a zip archive containing a SQLite database and media files. Supporting this format enables importing from and exporting to Anki.

**Structure of an .apkg file**:

```
collection.apkg (zip archive)
├── collection.anki2        # SQLite database with Anki schema
├── media                   # JSON file mapping media filenames to numbers
├── 0                       # First media file (renamed to number)
├── 1                       # Second media file
├── 2                       # Third media file
└── ...
```

```typescript
// packages/import-export/src/apkg-importer.ts

import JSZip from 'jszip';
import initSqlJs from 'sql.js';

interface ImportResult {
  notesImported: number;
  cardsImported: number;
  mediaImported: number;
  noteTypesCreated: number;
  decksCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

async function importApkg(
  userId: string,
  fileBuffer: Buffer,
  targetDeckId?: string,
  duplicateHandling: 'skip' | 'update' | 'duplicate' = 'skip'
): Promise<ImportResult> {
  const result: ImportResult = {
    notesImported: 0,
    cardsImported: 0,
    mediaImported: 0,
    noteTypesCreated: 0,
    decksCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  // 1. Unzip the archive
  const zip = await JSZip.loadAsync(fileBuffer);
  const ankiDb = zip.file('collection.anki2');
  if (!ankiDb) {
    throw new AppError(ErrorCode.VALIDATION_INVALID_FORMAT,
      'Invalid .apkg file: missing collection.anki2', 400);
  }

  // 2. Load the SQLite database
  const SQL = await initSqlJs();
  const dbBuffer = await ankiDb.async('uint8array');
  const ankiSql = new SQL.Database(dbBuffer);

  try {
    // 3. Import note types (called "models" in Anki)
    const modelsJson = ankiSql.exec("SELECT models FROM col")[0]?.values[0]?.[0];
    if (modelsJson) {
      const models = JSON.parse(modelsJson as string);
      for (const [modelId, model] of Object.entries(models as Record<string, any>)) {
        await importAnkiModel(userId, modelId, model, result);
      }
    }

    // 4. Import decks
    const decksJson = ankiSql.exec("SELECT decks FROM col")[0]?.values[0]?.[0];
    if (decksJson) {
      const decks = JSON.parse(decksJson as string);
      for (const [deckId, deck] of Object.entries(decks as Record<string, any>)) {
        await importAnkiDeck(userId, deckId, deck, targetDeckId, result);
      }
    }

    // 5. Import notes
    const notes = ankiSql.exec(
      "SELECT id, guid, mid, mod, tags, flds, sfld, csum FROM notes"
    );
    if (notes[0]) {
      for (const row of notes[0].values) {
        await importAnkiNote(userId, row, duplicateHandling, result);
      }
    }

    // 6. Import cards
    const cards = ankiSql.exec(
      "SELECT id, nid, did, ord, mod, type, queue, due, ivl, factor, reps, lapses FROM cards"
    );
    if (cards[0]) {
      for (const row of cards[0].values) {
        await importAnkiCard(userId, row, result);
      }
    }

    // 7. Import media
    const mediaMapFile = zip.file('media');
    if (mediaMapFile) {
      const mediaMap = JSON.parse(await mediaMapFile.async('string'));
      for (const [numStr, filename] of Object.entries(mediaMap)) {
        const mediaFile = zip.file(numStr);
        if (mediaFile) {
          const buffer = Buffer.from(await mediaFile.async('uint8array'));
          await uploadMedia(userId, {
            buffer,
            originalName: filename as string,
            mimeType: guessMimeType(filename as string),
          });
          result.mediaImported++;
        }
      }
    }

    // 8. Import review logs
    const revlogs = ankiSql.exec(
      "SELECT id, cid, usn, ease, ivl, lastIvl, factor, time, type FROM revlog"
    );
    if (revlogs[0]) {
      for (const row of revlogs[0].values) {
        await importAnkiRevlog(userId, row, result);
      }
    }

  } finally {
    ankiSql.close();
  }

  return result;
}
```

**Export to .apkg**:

```typescript
// packages/import-export/src/apkg-exporter.ts

async function exportApkg(
  userId: string,
  deckId?: string     // Export specific deck, or all if null
): Promise<Buffer> {
  const zip = new JSZip();

  // 1. Create a SQLite database in Anki format
  const SQL = await initSqlJs();
  const ankiDb = new SQL.Database();

  // Create Anki schema
  ankiDb.run(ANKI_SCHEMA_SQL);

  // 2. Export collection metadata (models, decks, deck configs)
  const models = await exportModelsToAnkiFormat(userId);
  const decks = await exportDecksToAnkiFormat(userId, deckId);
  const dconf = await exportDeckPresetsToAnkiFormat(userId);

  ankiDb.run(`INSERT INTO col VALUES(1, ?, 0, ?, 0, 0, 0, 0, ?, ?, '', '')`, [
    Math.floor(Date.now() / 1000),  // crt
    Math.floor(Date.now() / 1000),  // mod
    JSON.stringify(models),
    JSON.stringify(decks),
  ]);

  // 3. Export notes
  const notes = await getNotesForExport(userId, deckId);
  for (const note of notes) {
    ankiDb.run(
      `INSERT INTO notes VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '')`,
      [note.ankiId, note.guid, note.modelId, note.mod, note.usn,
       note.tags, note.fields, note.sortField, note.checksum]
    );
  }

  // 4. Export cards
  const cards = await getCardsForExport(userId, deckId);
  for (const card of cards) {
    ankiDb.run(
      `INSERT INTO cards VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, '')`,
      [card.ankiId, card.noteId, card.deckId, card.ordinal, card.mod,
       card.usn, card.type, card.queue, card.due, card.interval,
       card.factor, card.reps, card.lapses]
    );
  }

  // 5. Export review logs
  const revlogs = await getRevlogsForExport(userId, deckId);
  for (const log of revlogs) {
    ankiDb.run(
      `INSERT INTO revlog VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.cardId, log.usn, log.ease, log.interval,
       log.lastInterval, log.factor, log.time, log.type]
    );
  }

  // 6. Save SQLite database to zip
  const dbData = ankiDb.export();
  ankiDb.close();
  zip.file('collection.anki2', dbData);

  // 7. Export media files
  const mediaFiles = await getMediaForExport(userId, deckId);
  const mediaMap: Record<string, string> = {};
  let mediaIndex = 0;

  for (const media of mediaFiles) {
    const fileData = await downloadFromStorage(media.storageKey);
    zip.file(String(mediaIndex), fileData);
    mediaMap[String(mediaIndex)] = media.filename;
    mediaIndex++;
  }

  zip.file('media', JSON.stringify(mediaMap));

  // 8. Generate zip buffer
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
```

#### CSV Import/Export

```typescript
// Simplified CSV import for common formats

interface CsvImportOptions {
  delimiter: ',' | '\t' | ';';
  hasHeader: boolean;
  fieldMapping: Record<string, string>;  // CSV column -> field name
  noteTypeName: string;
  deckName: string;
  duplicateHandling: 'skip' | 'update' | 'duplicate';
  tags: string[];
  htmlEnabled: boolean;
}

async function importCsv(
  userId: string,
  csvContent: string,
  options: CsvImportOptions
): Promise<ImportResult> {
  // Parse CSV, validate, and create notes/cards
  // (Implementation details omitted for brevity but follows standard CSV parsing)
  // ...
}
```

#### Import/Export API Endpoints

```
Import/Export API
==============================================================================

POST   /api/v1/import/apkg              Import an .apkg file
POST   /api/v1/import/csv               Import a CSV/TSV file
POST   /api/v1/import/json              Import from JSON format (native)
GET    /api/v1/import/preview           Preview what an import would do (dry run)

POST   /api/v1/export/apkg              Export to .apkg format
POST   /api/v1/export/csv               Export to CSV format
POST   /api/v1/export/json              Export to native JSON format
GET    /api/v1/export/:id/download      Download a previously generated export
```

### Add-on / Plugin Architecture

The system supports a plugin architecture for extending functionality without modifying core code.

#### Plugin Interface

```typescript
// packages/shared-types/src/plugin.ts

interface PluginManifest {
  id: string;                    // Unique plugin identifier (reverse domain: com.example.myplugin)
  name: string;
  version: string;               // SemVer
  description: string;
  author: string;
  homepage?: string;
  minAppVersion: string;         // Minimum app version required
  permissions: PluginPermission[];
  entryPoint: string;            // Main module file
}

enum PluginPermission {
  READ_NOTES = 'read:notes',
  WRITE_NOTES = 'write:notes',
  READ_CARDS = 'read:cards',
  WRITE_CARDS = 'write:cards',
  READ_DECKS = 'read:decks',
  WRITE_DECKS = 'write:decks',
  READ_REVIEW_LOGS = 'read:review_logs',
  CUSTOM_SCHEDULER = 'custom:scheduler',
  CUSTOM_TEMPLATE = 'custom:template',
  NETWORK_ACCESS = 'network:access',
  UI_PANEL = 'ui:panel',
  UI_TOOLBAR = 'ui:toolbar',
  UI_MENU = 'ui:menu',
}

interface PluginContext {
  // Data access (sandboxed to current user)
  db: {
    notes: PluginNoteApi;
    cards: PluginCardApi;
    decks: PluginDeckApi;
    tags: PluginTagApi;
    reviewLogs: PluginReviewLogApi;
  };

  // Event hooks
  hooks: {
    onBeforeReview: (callback: (card: Card) => Promise<void>) => void;
    onAfterReview: (callback: (card: Card, answer: ReviewAnswer, log: ReviewLog) => Promise<void>) => void;
    onNoteAdded: (callback: (note: Note) => Promise<void>) => void;
    onNoteModified: (callback: (note: Note) => Promise<void>) => void;
    onDeckSelected: (callback: (deckId: string) => Promise<void>) => void;
    onSyncComplete: (callback: () => Promise<void>) => void;
  };

  // UI extension points
  ui: {
    registerPanel: (config: PanelConfig) => void;
    registerToolbarButton: (config: ToolbarButtonConfig) => void;
    registerMenuItem: (config: MenuItemConfig) => void;
    registerCardAction: (config: CardActionConfig) => void;
    showNotification: (message: string, type: 'info' | 'warning' | 'error') => void;
    showModal: (config: ModalConfig) => void;
  };

  // Scheduling extension
  scheduling: {
    registerAlgorithm: (config: CustomAlgorithmConfig) => void;
  };

  // Storage (plugin-specific key-value store)
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };

  // HTTP client (if network:access permission granted)
  http?: {
    get: (url: string, options?: RequestOptions) => Promise<Response>;
    post: (url: string, body: unknown, options?: RequestOptions) => Promise<Response>;
  };
}

interface Plugin {
  manifest: PluginManifest;
  activate: (context: PluginContext) => Promise<void>;
  deactivate: () => Promise<void>;
}

// Example plugin: auto-tag notes based on content
const autoTaggerPlugin: Plugin = {
  manifest: {
    id: 'com.example.auto-tagger',
    name: 'Auto Tagger',
    version: '1.0.0',
    description: 'Automatically tags notes based on content analysis',
    author: 'Example Author',
    minAppVersion: '1.0.0',
    permissions: [
      PluginPermission.READ_NOTES,
      PluginPermission.WRITE_NOTES,
    ],
    entryPoint: 'index.ts',
  },

  async activate(ctx: PluginContext) {
    ctx.hooks.onNoteAdded(async (note) => {
      const fieldValues = Object.values(note.fieldValues).join(' ');

      // Simple keyword-based auto-tagging
      const tagRules = await ctx.storage.get('tagRules') as
        Array<{ keyword: string; tag: string }> || [];

      for (const rule of tagRules) {
        if (fieldValues.toLowerCase().includes(rule.keyword.toLowerCase())) {
          await ctx.db.tags.addTagToNote(note.id, rule.tag);
        }
      }
    });

    // Register settings panel
    ctx.ui.registerPanel({
      id: 'auto-tagger-settings',
      title: 'Auto Tagger Settings',
      location: 'settings',
      component: 'AutoTaggerSettings', // React component name
    });
  },

  async deactivate() {
    // Cleanup
  },
};
```

#### Plugin SQL Schema

```sql
-- ============================================================================
-- PLUGIN SYSTEM
-- ============================================================================

CREATE TABLE installed_plugins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plugin_id       VARCHAR(200) NOT NULL,            -- e.g., "com.example.auto-tagger"
    name            VARCHAR(200) NOT NULL,
    version         VARCHAR(20) NOT NULL,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    permissions     JSONB NOT NULL DEFAULT '[]',
    settings        JSONB NOT NULL DEFAULT '{}',
    installed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, plugin_id)
);

CREATE TABLE plugin_storage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plugin_id       VARCHAR(200) NOT NULL,
    key             VARCHAR(500) NOT NULL,
    value           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, plugin_id, key)
);

CREATE INDEX idx_plugin_storage_lookup ON plugin_storage (user_id, plugin_id, key);
```

---

## 1.10 Complete Feature Checklist

This section provides an exhaustive list of every feature in the system, organized by category. Each item represents a discrete, testable unit of functionality.

### Core Data Management

- [ ] Create, read, update, delete notes
- [ ] Create, read, update, delete note types (card templates)
- [ ] Create, read, update, delete fields within note types
- [ ] Create, read, update, delete card templates within note types
- [ ] Automatic card generation from note + templates
- [ ] Automatic card regeneration when note fields are edited
- [ ] Automatic card regeneration when card templates are modified
- [ ] Card generation for cloze note types (one card per cloze number)
- [ ] Duplicate detection via checksum on sort field
- [ ] Rich text (HTML) field editor
- [ ] Plain text field stripping for search indexing
- [ ] Field ordering (drag to reorder)
- [ ] Sticky fields (retain value when adding consecutive notes)
- [ ] Field-level font family and font size configuration
- [ ] Right-to-left (RTL) text direction per field
- [ ] Sort field selection per note type
- [ ] Note GUID generation for cross-device identity
- [ ] Bulk note creation (import)
- [ ] Bulk note editing (find and replace across fields)

### Template Engine

- [ ] Basic field replacement: `{{FieldName}}`
- [ ] Conditional sections: `{{#Field}}...{{/Field}}`
- [ ] Negative conditionals: `{{^Field}}...{{/Field}}`
- [ ] FrontSide special field: `{{FrontSide}}`
- [ ] Cloze deletions: `{{c1::text}}` and `{{cloze:Field}}`
- [ ] Cloze with hints: `{{c1::text::hint}}`
- [ ] Multi-cloze support (multiple cloze numbers in one note)
- [ ] Type answer: `{{type:FieldName}}`
- [ ] Type answer diff comparison (green/red character highlighting)
- [ ] Hint fields: `{{hint:FieldName}}`
- [ ] Tags special field: `{{Tags}}`
- [ ] Per-note-type CSS styling
- [ ] Per-card-template additional CSS
- [ ] Browser-specific shortened templates
- [ ] Template preview in editor
- [ ] Template syntax validation and error reporting
- [ ] Deck override per card template (generate cards to specific deck)

### Deck System

- [ ] Create, read, update, delete decks
- [ ] Hierarchical deck structure (parent/child via `::` separator)
- [ ] Deck tree display with aggregated counts
- [ ] Deck rename (updates all descendant paths)
- [ ] Deck move (reparent in hierarchy)
- [ ] Deck collapse/expand in tree view
- [ ] Deck colors and icons
- [ ] Deck descriptions
- [ ] Deck presets (shared scheduling configuration)
- [ ] Default deck preset
- [ ] Apply preset to multiple decks at once
- [ ] Filtered decks with search query
- [ ] Filtered deck rebuild
- [ ] Filtered deck empty (return cards to home decks)
- [ ] Filtered deck ordering options (oldest due, random, added, relative overdue)
- [ ] Filtered deck card limit
- [ ] Filtered deck reschedule option
- [ ] Cards remember original deck when in filtered deck
- [ ] Deck-level new card position tracking
- [ ] Denormalized deck counts (new, learn, review, total)

### Tagging System

- [ ] Create, read, update, delete tags
- [ ] Hierarchical tags via `::` separator
- [ ] Tag tree display
- [ ] Tag rename (updates all descendant paths)
- [ ] Tag merge (combine two tags into one)
- [ ] Tag colors
- [ ] Tag icons
- [ ] Tag descriptions
- [ ] Tag search/autocomplete
- [ ] Add tags to notes (many-to-many)
- [ ] Remove tags from notes
- [ ] Bulk tag operations (add/remove tags from multiple notes)
- [ ] Tag-based filtering in browser
- [ ] Tag hierarchy expansion in search (`tag:parent::*`)
- [ ] `tag:none` filter for untagged notes
- [ ] Tag usage statistics (note count per tag)

### Spaced Repetition Scheduling

- [ ] SM-2 algorithm implementation
- [ ] FSRS-5 algorithm implementation
- [ ] Per-deck algorithm selection (SM-2 or FSRS-5)
- [ ] Configurable learning steps (e.g., 1m 10m)
- [ ] Configurable graduating interval
- [ ] Configurable easy interval
- [ ] Configurable relearning steps
- [ ] Configurable minimum interval (after lapse)
- [ ] Configurable maximum interval
- [ ] Configurable easy bonus multiplier
- [ ] Configurable hard interval modifier
- [ ] Global interval modifier
- [ ] Four answer buttons: Again, Hard, Good, Easy
- [ ] Answer button interval preview (show what each button does)
- [ ] Card state machine: New -> Learning -> Review
- [ ] Card state machine: Review -> Relearning (on lapse) -> Review
- [ ] Day-crossing learning steps (learning step >= 1 day)
- [ ] Ease factor tracking and update (SM-2)
- [ ] Stability tracking and update (FSRS-5)
- [ ] Difficulty tracking and update (FSRS-5)
- [ ] Retrievability calculation (FSRS-5 forgetting curve)
- [ ] Optimal interval calculation from desired retention
- [ ] Interval fuzz factor (prevent card clustering)
- [ ] FSRS-5 configurable desired retention (0.7-0.99)
- [ ] FSRS-5 custom model weights
- [ ] FSRS-5 short-term stability for learning steps
- [ ] Daily new card limit
- [ ] Daily review card limit
- [ ] New card gather order: deck order, position, random
- [ ] New card presentation order: due before new, new before due, mixed
- [ ] Study session queue priority: learning > review > new > day-learning
- [ ] Remaining count display during study
- [ ] Next review time display during study
- [ ] Answer timer with configurable cap
- [ ] Show/hide timer option

### Card Management (Pause, Bury, Flags)

- [ ] Pause cards (indefinitely)
- [ ] Pause cards with timed resume (auto-unpause on date)
- [ ] Unpause cards
- [ ] Skip cards for today (bury)
- [ ] Auto-unbury at start of next day
- [ ] Auto-bury sibling cards (new siblings)
- [ ] Auto-bury sibling cards (review siblings)
- [ ] Auto-bury sibling cards (interday learning siblings)
- [ ] Configurable sibling burying per deck preset
- [ ] 7 colored flags: Red, Orange, Green, Blue, Pink, Cyan, Purple
- [ ] Set/unset flags on individual cards
- [ ] Batch flag operations
- [ ] Flag-based filtering in browser
- [ ] Leech detection (configurable lapse threshold)
- [ ] Leech action: tag only
- [ ] Leech action: auto-pause
- [ ] Leech notification
- [ ] Re-trigger leech at half-threshold intervals
- [ ] Manual card reschedule (set custom due date)
- [ ] Reset card to new state
- [ ] Move card to different deck
- [ ] Delete individual cards
- [ ] Batch card operations (pause, flag, move, delete, reschedule)
- [ ] Daily maintenance routine (unbury, process timed pauses)

### Search and Browser

- [ ] Full-text search across all fields
- [ ] Exact phrase search (quoted strings)
- [ ] Boolean operators: AND (implicit), OR, NOT (-)
- [ ] Parenthesized grouping
- [ ] Deck filter: `deck:name`, `deck:name::*`
- [ ] Tag filter: `tag:name`, `tag:name::*`, `tag:none`
- [ ] Note type filter: `note:name`
- [ ] State filter: `is:new`, `is:learn`, `is:review`, `is:due`, `is:paused`, `is:buried`, `is:leech`
- [ ] Flag filter: `flag:0` through `flag:7`
- [ ] Field-specific search: `front:`, `back:`, `field:Name:`
- [ ] Date filters: `added:N`, `edited:N`, `reviewed:N`
- [ ] Rating filter: `rated:N:answer`
- [ ] Property filters: `interval:`, `due:`, `ease:`, `stability:`, `difficulty:`, `lapses:`, `reviews:`
- [ ] Comparison operators: `=`, `!=`, `>`, `<`, `>=`, `<=`
- [ ] General property syntax: `prop:name>value`
- [ ] Duplicate detection: `dupe:NoteType,FieldName`
- [ ] Wildcard match all: `*`
- [ ] Search query parsing (Lexer -> Parser -> AST -> SQL)
- [ ] Paginated search results
- [ ] Configurable result columns
- [ ] Column sorting (ascending/descending)
- [ ] Save column preferences
- [ ] Card preview pane (rendered front/back)
- [ ] Note editing from browser
- [ ] Inline field editing in browser
- [ ] Batch selection (select all, select range)
- [ ] Search history and saved searches

### Media Management

- [ ] Upload images (JPEG, PNG, GIF, WebP, SVG)
- [ ] Upload audio (MP3, OGG, WAV, WebM, M4A)
- [ ] Upload video (MP4, WebM)
- [ ] File type validation
- [ ] File size limit enforcement
- [ ] SHA-256 deduplication (same file not stored twice)
- [ ] Media metadata extraction (dimensions, duration)
- [ ] CDN-backed media delivery
- [ ] `media://` URL protocol in field HTML
- [ ] Media URL resolution at render time
- [ ] Media reference counting
- [ ] Orphaned media detection
- [ ] Orphaned media cleanup
- [ ] Media usage statistics (total storage)
- [ ] Image display in cards
- [ ] Audio playback in cards
- [ ] Video playback in cards
- [ ] Auto-play audio setting
- [ ] Replay question audio on answer side setting

### MathJax and Rich Content

- [ ] Inline LaTeX: `\(...\)` and `$...$`
- [ ] Display LaTeX: `\[...\]` and `$$...$$`
- [ ] MathJax auto-typesetting after card render
- [ ] MathJax package support (AMS, color, boldsymbol)
- [ ] Dark mode MathJax color inversion
- [ ] Code syntax highlighting in fields
- [ ] HTML table support
- [ ] Custom font loading
- [ ] Image resizing and alignment

### Text-to-Speech

- [ ] TTS template tag: `{{tts lang:Field}}`
- [ ] Language selection per TTS tag
- [ ] Voice selection per TTS tag
- [ ] Speed control per TTS tag
- [ ] Auto-play TTS on card display
- [ ] Manual TTS replay button
- [ ] Multiple TTS tags per card (sequential playback)
- [ ] TTS language fallback chain
- [ ] Web Speech API integration (browser)
- [ ] Native TTS integration (mobile)

### Statistics and Analytics

- [ ] Dashboard overview (total cards, due today, current streak)
- [ ] Daily review count chart (last N days)
- [ ] Review breakdown by answer button (again/hard/good/easy)
- [ ] Card state distribution (new/learning/review/paused)
- [ ] Review forecast (upcoming due cards)
- [ ] Retention rate over time
- [ ] Interval distribution histogram
- [ ] Ease factor distribution (SM-2)
- [ ] Difficulty distribution (FSRS-5)
- [ ] Stability distribution (FSRS-5)
- [ ] Time spent studying per day
- [ ] Average time per card
- [ ] Hourly study pattern
- [ ] Most-lapsed cards (leech candidates)
- [ ] FSRS retrievability heatmap
- [ ] Cards added per day
- [ ] Study streak tracking (current and longest)
- [ ] Deck-level statistics filtering
- [ ] Tag-level statistics filtering
- [ ] Date range selection for all statistics
- [ ] Exportable statistics data (CSV, JSON)

### Sync

- [ ] USN-based incremental sync protocol
- [ ] Full sync (download entire collection)
- [ ] Full sync (upload entire collection)
- [ ] Client device registration
- [ ] Client device management (list, remove)
- [ ] Sync conflict detection
- [ ] Conflict resolution strategies: server wins, client wins, latest wins
- [ ] Deletion tracking via tombstones
- [ ] Paginated sync pull (for large change sets)
- [ ] WebSocket real-time sync notifications
- [ ] Offline operation (local SQLite)
- [ ] Automatic sync on app foreground
- [ ] Manual sync trigger
- [ ] Sync status indicator (last sync time, pending changes)
- [ ] Sync error handling and retry logic
- [ ] Review log sync (preserves complete study history)
- [ ] Media file sync
- [ ] Sync bandwidth optimization (only send changed fields)

### Import/Export

- [ ] Import .apkg files (Anki package)
- [ ] Import .apkg note types/models
- [ ] Import .apkg decks
- [ ] Import .apkg notes with field mapping
- [ ] Import .apkg cards with scheduling state
- [ ] Import .apkg review logs
- [ ] Import .apkg media files
- [ ] Import duplicate handling: skip, update, duplicate
- [ ] Import preview/dry run
- [ ] Import CSV/TSV files
- [ ] Import CSV field mapping UI
- [ ] Import CSV with custom delimiter
- [ ] Import JSON (native format)
- [ ] Export to .apkg format
- [ ] Export specific deck (and sub-decks)
- [ ] Export all decks
- [ ] Export with media files
- [ ] Export with scheduling data
- [ ] Export with review history
- [ ] Export to CSV
- [ ] Export to JSON (native format)
- [ ] Scheduled automatic backups

### Authentication and User Management

- [ ] User registration with email/password
- [ ] Email verification
- [ ] Login with credentials
- [ ] OAuth 2.0 login (Google, GitHub, Apple)
- [ ] JWT access tokens (short-lived)
- [ ] Refresh token rotation
- [ ] Password reset via email
- [ ] Password change
- [ ] User profile management (display name, avatar, timezone, locale)
- [ ] Session management (list active sessions, revoke)
- [ ] Account deletion
- [ ] Two-factor authentication (TOTP)
- [ ] Rate limiting on auth endpoints

### API and Infrastructure

- [ ] RESTful API with consistent response envelope
- [ ] Request validation (schema-based via Fastify)
- [ ] Authentication middleware (JWT verification)
- [ ] Authorization middleware (resource ownership)
- [ ] Rate limiting per endpoint
- [ ] CORS configuration
- [ ] API versioning (URL-based: `/v1/`)
- [ ] Structured error responses with error codes
- [ ] Request logging and tracing (OpenTelemetry)
- [ ] Health check endpoint
- [ ] Database connection pooling
- [ ] Database migrations framework
- [ ] Seed data for development
- [ ] Redis caching for hot paths
- [ ] Background job processing (BullMQ)
- [ ] WebSocket server for real-time events
- [ ] File upload handling (multipart)
- [ ] Pagination for all list endpoints
- [ ] Sorting and filtering for all list endpoints

### Plugin/Add-on System

- [ ] Plugin manifest specification
- [ ] Plugin installation and activation
- [ ] Plugin deactivation and uninstallation
- [ ] Plugin permission system
- [ ] Plugin data access API (sandboxed)
- [ ] Plugin event hooks (before/after review, note added, etc.)
- [ ] Plugin UI extension points (panels, toolbar buttons, menu items)
- [ ] Plugin custom scheduling algorithm registration
- [ ] Plugin-specific key-value storage
- [ ] Plugin HTTP client (with permission)
- [ ] Plugin settings UI
- [ ] Plugin version management and updates
- [ ] Plugin marketplace (future)

### User Interface

- [ ] Responsive web layout (desktop, tablet, mobile)
- [ ] Dark mode / light mode toggle
- [ ] System theme auto-detection
- [ ] Deck list (tree view) on home screen
- [ ] Study screen with card display
- [ ] Answer buttons with interval preview
- [ ] Card flip animation
- [ ] Progress bar during study session
- [ ] Note editor with rich text
- [ ] Note editor field reordering
- [ ] Note type selector in editor
- [ ] Deck selector in editor
- [ ] Tag input with autocomplete in editor
- [ ] Card browser with configurable columns
- [ ] Card browser search bar
- [ ] Card browser batch actions toolbar
- [ ] Card preview pane in browser
- [ ] Statistics dashboard with charts
- [ ] Deck options/settings panel
- [ ] User settings page
- [ ] Plugin management page
- [ ] Import/export wizards
- [ ] Keyboard shortcuts for study (1=Again, 2=Hard, 3=Good, 4=Easy)
- [ ] Keyboard shortcuts for browser actions
- [ ] Undo last action (card answer, delete, edit)
- [ ] Loading states and skeleton screens
- [ ] Error boundaries and fallback UI
- [ ] Toast notifications for operations
- [ ] Modal dialogs for confirmations
- [ ] Drag-and-drop for deck/tag reordering
- [ ] Context menus (right-click)
- [ ] Accessibility: screen reader support
- [ ] Accessibility: keyboard navigation
- [ ] Accessibility: high contrast mode
- [ ] Internationalization (i18n) framework
- [ ] Localization for major languages

### Mobile (React Native / PWA)

- [ ] Offline study mode (local SQLite)
- [ ] Background sync when connectivity restored
- [ ] Push notifications for study reminders
- [ ] Swipe gestures for answer buttons
- [ ] Haptic feedback on answer
- [ ] Native media playback
- [ ] Native TTS integration
- [ ] Camera access for adding image notes
- [ ] Share extension (add notes from other apps)
- [ ] Widget for due card count (iOS/Android)
- [ ] Adaptive icon and splash screen
- [ ] Deep linking to specific decks or cards

### Performance and Reliability

- [ ] Database query optimization (proper indexes)
- [ ] Full-text search via PostgreSQL GIN indexes
- [ ] Rust/WASM modules for computation-heavy paths
- [ ] Redis caching for frequently accessed data
- [ ] Optimistic UI updates
- [ ] Request deduplication
- [ ] Lazy loading of card content
- [ ] Virtual scrolling in browser for large collections
- [ ] Image lazy loading and progressive enhancement
- [ ] Service Worker for offline web support
- [ ] Database connection pooling and health monitoring
- [ ] Graceful degradation on service failure
- [ ] Automated database backups
- [ ] Log aggregation and alerting
- [ ] Performance monitoring (response times, error rates)
- [ ] Load testing benchmarks

---

*End of Architecture Overview Document*

*This document is a living reference and will be updated as the system evolves. For implementation-level details on specific components, refer to the inline code documentation and the component-specific design documents in the `/docs` directory.*

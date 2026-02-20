/**
 * Card Generation Pipeline Types
 *
 * These types define the data structures for the development-time batch
 * card generation process: source word lists -> AI enrichment -> human review.
 */

// ---------------------------------------------------------------------------
// Source Word
// ---------------------------------------------------------------------------

export interface SourceWord {
  /** The word in its native script (e.g., Arabic, Spanish, English). */
  word: string;
  /** English translation / gloss. */
  translation: string;
  /** Three-letter root (Arabic / Egyptian). */
  root?: string;
  /** Latin-script transliteration. */
  transliteration?: string;
  /** Part of speech (noun, verb, adjective, particle, phrase, etc.). */
  partOfSpeech: string;
  /** Proficiency level: CEFR (A1-C2) or tier (beginner/intermediate/advanced). */
  level: string;
  /** Corpus frequency rank (1 = most frequent). */
  frequencyRank: number;
  /** Curriculum sort order — used as the primary ordering key in decks. */
  sortPosition: number;
  /** Arbitrary tags: thematic, grammatical, source corpus, etc. */
  tags: string[];

  // Optional pre-filled fields (may come from source word list directly)
  gender?: string;
  plural?: string;
  example?: string;
  fushaEquivalent?: string;
  etymology?: string;
}

// ---------------------------------------------------------------------------
// Generated Card
// ---------------------------------------------------------------------------

export interface GeneratedCard {
  /** Unique card ID (language-prefixed UUID). */
  id: string;
  /** Front of flashcard (the prompt / question). */
  front: string;
  /** Back of flashcard (the answer). */
  back: string;
  /** Tags carried from source + any added during enrichment. */
  tags: string[];
  /** Curriculum sort position inherited from source word. */
  sortPosition: number;
  /** Review workflow status. */
  reviewStatus: 'pending' | 'approved' | 'needs-edit' | 'rejected';
  /** ISO-8601 timestamp of generation. */
  generatedAt: string;
  /** Reason for rejection or edit request (set during review). */
  reviewNote?: string;
  /**
   * All enriched fields from OpenAI are merged at the top level.
   * This index signature allows language-specific fields like
   * `morphological_pattern`, `conjugation_table`, `tajweed_rules_present`, etc.
   */
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Pipeline Configuration
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  /** Target language for this pipeline run. */
  language: 'arabic' | 'spanish' | 'egyptian' | 'english' | 'quran';
  /** OpenAI API key. If omitted, the pipeline runs in offline/no-AI mode. */
  openaiApiKey?: string;
  /** Number of words to send per OpenAI batch request. */
  batchSize: number;
  /** Path to write the final generated cards JSON. */
  outputPath: string;
  /** Path for checkpoint files (resume interrupted runs). */
  checkpointPath: string;
  /** OpenAI model to use (default: gpt-4o). */
  model?: string;
  /** Maximum requests per minute (rate-limiting). */
  maxRPM?: number;
  /** Maximum tokens per minute (rate-limiting). */
  maxTPM?: number;
  /** Maximum retry attempts per failed request. */
  maxRetries?: number;
  /** Whether to use the OpenAI Batch API for 50% cost reduction. */
  useBatchAPI?: boolean;
}

// ---------------------------------------------------------------------------
// OpenAI Prompt Template
// ---------------------------------------------------------------------------

export interface OpenAIPromptTemplate {
  /** Language identifier matching PipelineConfig.language. */
  language: string;
  /** System prompt that establishes the AI's role and constraints. */
  systemPrompt: string;
  /**
   * User prompt template with mustache-style placeholders:
   * {{word}}, {{root}}, {{translation}}, {{partOfSpeech}}, {{level}}, etc.
   */
  userPromptTemplate: string;
  /** JSON Schema describing the expected structured output from OpenAI. */
  outputSchema: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Checkpoint (internal persistence)
// ---------------------------------------------------------------------------

export interface Checkpoint {
  /** Pipeline run ID for deduplication. */
  runId: string;
  /** Language being processed. */
  language: string;
  /** Timestamp of last checkpoint write. */
  lastUpdated: string;
  /** Cards that have been successfully generated. */
  completed: GeneratedCard[];
  /** Words still awaiting processing. */
  remaining: SourceWord[];
}

// ---------------------------------------------------------------------------
// Review Statistics
// ---------------------------------------------------------------------------

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  needsEdit: number;
}

// ---------------------------------------------------------------------------
// Batch API types (mirrors OpenAI Batch API shape)
// ---------------------------------------------------------------------------

export interface BatchRequestItem {
  custom_id: string;
  method: 'POST';
  url: '/v1/chat/completions';
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    response_format?: { type: string; json_schema?: any };
    temperature?: number;
    max_tokens?: number;
  };
}

export interface BatchResponseItem {
  custom_id: string;
  response: {
    status_code: number;
    body: {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

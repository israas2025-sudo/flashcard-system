/**
 * Batch Card Generator
 *
 * Development-time tool that processes source word lists through OpenAI to
 * produce enriched flashcard content. Supports all 5 language tracks, uses
 * OpenAI structured output mode (response_format: json_schema), and persists
 * progress via local JSON checkpoint files so interrupted runs can be resumed.
 *
 * Usage:
 *   const generator = new BatchGenerator(config);
 *   const cards = await generator.generateBatch(words, 'arabic', config);
 *   // or process an entire language track end-to-end:
 *   const cards = await generator.processLanguageTrack('arabic');
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import {
  SourceWord,
  GeneratedCard,
  PipelineConfig,
  Checkpoint,
  BatchRequestItem,
  BatchResponseItem,
  OpenAIPromptTemplate,
} from './types';

import {
  getPromptForLanguage,
  PROMPT_REGISTRY,
} from './prompts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_MAX_RPM = 50;
const DEFAULT_MAX_TPM = 80_000;
const DEFAULT_MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff. */
const RETRY_BASE_DELAY_MS = 1_000;

/** All supported language tracks. */
const SUPPORTED_LANGUAGES = ['arabic', 'egyptian', 'quran', 'spanish', 'english'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

/**
 * Simple sliding-window rate limiter that respects both RPM and TPM limits.
 * Tracks request timestamps and token counts within the current minute window.
 */
class RateLimiter {
  private requestTimestamps: number[] = [];
  private tokenLog: { timestamp: number; tokens: number }[] = [];
  private maxRPM: number;
  private maxTPM: number;

  constructor(maxRPM: number, maxTPM: number) {
    this.maxRPM = maxRPM;
    this.maxTPM = maxTPM;
  }

  /**
   * Wait until we have capacity for the next request. Returns once safe to proceed.
   * @param estimatedTokens  Estimated token count for the upcoming request.
   */
  async waitForCapacity(estimatedTokens: number = 1_000): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Prune stale entries
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > oneMinuteAgo);
    this.tokenLog = this.tokenLog.filter((e) => e.timestamp > oneMinuteAgo);

    const currentRPM = this.requestTimestamps.length;
    const currentTPM = this.tokenLog.reduce((sum, e) => sum + e.tokens, 0);

    if (currentRPM >= this.maxRPM || currentTPM + estimatedTokens > this.maxTPM) {
      // Calculate how long we need to wait for the oldest entry to expire
      const oldestRequest = this.requestTimestamps[0] ?? now;
      const oldestToken = this.tokenLog[0]?.timestamp ?? now;
      const waitUntil = Math.min(oldestRequest, oldestToken) + 60_000;
      const delayMs = Math.max(waitUntil - now, 500);

      console.log(
        `[RateLimiter] At capacity (RPM: ${currentRPM}/${this.maxRPM}, ` +
        `TPM: ${currentTPM}/${this.maxTPM}). Waiting ${Math.round(delayMs / 1000)}s...`
      );

      await sleep(delayMs);
      // Recurse to re-check after waiting
      return this.waitForCapacity(estimatedTokens);
    }
  }

  /** Record that a request was sent. */
  recordRequest(tokenCount: number): void {
    const now = Date.now();
    this.requestTimestamps.push(now);
    this.tokenLog.push({ timestamp: now, tokens: tokenCount });
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Rough token estimation: ~4 chars per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Fill mustache-style {{placeholder}} tokens in a template string.
 */
function renderTemplate(template: string, word: SourceWord): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const value = (word as any)[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}

// ---------------------------------------------------------------------------
// BatchGenerator
// ---------------------------------------------------------------------------

export class BatchGenerator {
  private config: PipelineConfig;
  private rateLimiter: RateLimiter;

  constructor(config: PipelineConfig) {
    this.config = {
      model: DEFAULT_MODEL,
      batchSize: DEFAULT_BATCH_SIZE,
      maxRPM: DEFAULT_MAX_RPM,
      maxTPM: DEFAULT_MAX_TPM,
      maxRetries: DEFAULT_MAX_RETRIES,
      ...config,
    };

    this.rateLimiter = new RateLimiter(
      this.config.maxRPM ?? DEFAULT_MAX_RPM,
      this.config.maxTPM ?? DEFAULT_MAX_TPM
    );
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Generate enriched flashcards for a batch of source words.
   *
   * @param words     Source words to process.
   * @param language  Target language track.
   * @param config    Optional per-call config overrides.
   * @returns         Array of generated cards.
   */
  async generateBatch(
    words: SourceWord[],
    language: SupportedLanguage,
    config?: Partial<PipelineConfig>
  ): Promise<GeneratedCard[]> {
    const mergedConfig = { ...this.config, ...config, language };
    const prompt = getPromptForLanguage(language);
    const batchSize = mergedConfig.batchSize;

    // Load or create checkpoint
    let checkpoint = this.loadCheckpoint(mergedConfig);
    const alreadyDoneIds = new Set(checkpoint.completed.map((c) => c.id));

    // Filter out words that were already completed (resume support)
    const remaining = words.filter(
      (w) => !alreadyDoneIds.has(this.wordId(language, w))
    );

    console.log(
      `[BatchGenerator] ${language}: ${remaining.length} words remaining ` +
      `(${checkpoint.completed.length} already done). Batch size: ${batchSize}.`
    );

    // Process in batches
    for (let i = 0; i < remaining.length; i += batchSize) {
      const batch = remaining.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(remaining.length / batchSize);

      console.log(
        `[BatchGenerator] Processing batch ${batchNum}/${totalBatches} ` +
        `(${batch.length} words)...`
      );

      const cards = await this.processBatch(batch, prompt, mergedConfig);
      checkpoint.completed.push(...cards);
      checkpoint.remaining = remaining.slice(i + batchSize);
      checkpoint.lastUpdated = new Date().toISOString();

      // Persist checkpoint after every batch
      this.saveCheckpoint(checkpoint, mergedConfig);
    }

    return checkpoint.completed;
  }

  /**
   * Process an entire language track end-to-end.
   *
   * Reads the source word list from `<outputPath>/../sources/<language>.json`,
   * generates cards, writes the final output, and cleans up the checkpoint.
   *
   * @param language  The language track to process.
   * @returns         Array of all generated cards.
   */
  async processLanguageTrack(language: SupportedLanguage): Promise<GeneratedCard[]> {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new Error(
        `Unsupported language: "${language}". ` +
        `Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
      );
    }

    const sourcePath = path.resolve(
      path.dirname(this.config.outputPath),
      '..',
      'sources',
      `${language}.json`
    );

    if (!fs.existsSync(sourcePath)) {
      throw new Error(
        `Source word list not found at ${sourcePath}. ` +
        `Please create the source file before running the pipeline.`
      );
    }

    const raw = fs.readFileSync(sourcePath, 'utf-8');
    const words: SourceWord[] = JSON.parse(raw);

    console.log(
      `[BatchGenerator] Starting ${language} track: ${words.length} source words.`
    );

    const cards = await this.generateBatch(words, language);

    // Write final output
    const outputDir = path.dirname(this.config.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.resolve(outputDir, `${language}-cards.json`);
    fs.writeFileSync(outputFile, JSON.stringify(cards, null, 2), 'utf-8');
    console.log(`[BatchGenerator] Wrote ${cards.length} cards to ${outputFile}`);

    // Clean up checkpoint on successful completion
    this.deleteCheckpoint(this.config);

    return cards;
  }

  // -------------------------------------------------------------------------
  // Private: batch processing
  // -------------------------------------------------------------------------

  /**
   * Process a single batch of words through OpenAI.
   */
  private async processBatch(
    words: SourceWord[],
    prompt: OpenAIPromptTemplate,
    config: PipelineConfig
  ): Promise<GeneratedCard[]> {
    const results: GeneratedCard[] = [];

    for (const word of words) {
      const card = await this.processWord(word, prompt, config);
      if (card) {
        results.push(card);
      }
    }

    return results;
  }

  /**
   * Process a single word through OpenAI with retry logic.
   */
  private async processWord(
    word: SourceWord,
    prompt: OpenAIPromptTemplate,
    config: PipelineConfig
  ): Promise<GeneratedCard | null> {
    const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    const userMessage = renderTemplate(prompt.userPromptTemplate, word);
    const estimatedTokens = estimateTokens(prompt.systemPrompt + userMessage) * 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimiter.waitForCapacity(estimatedTokens);

        const response = await this.callOpenAI(
          prompt.systemPrompt,
          userMessage,
          prompt.outputSchema,
          config
        );

        this.rateLimiter.recordRequest(estimatedTokens);

        // Parse structured JSON output
        const enrichedData = JSON.parse(response);

        const card: GeneratedCard = {
          id: this.wordId(config.language, word),
          front: word.word,
          back: word.translation,
          tags: [...word.tags],
          sortPosition: word.sortPosition,
          reviewStatus: 'pending',
          generatedAt: new Date().toISOString(),
          // Merge all enriched fields at top level
          ...enrichedData,
        };

        return card;
      } catch (error: any) {
        const isRetryable = this.isRetryableError(error);
        const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);

        console.error(
          `[BatchGenerator] Error processing "${word.word}" ` +
          `(attempt ${attempt}/${maxRetries}): ${error.message}`
        );

        if (!isRetryable || attempt === maxRetries) {
          console.error(
            `[BatchGenerator] Giving up on "${word.word}" after ${attempt} attempts.`
          );
          return null;
        }

        console.log(`[BatchGenerator] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }

    return null;
  }

  /**
   * Call the OpenAI Chat Completions API with structured output mode.
   */
  private async callOpenAI(
    systemPrompt: string,
    userMessage: string,
    outputSchema: Record<string, any>,
    config: PipelineConfig
  ): Promise<string> {
    if (!config.openaiApiKey) {
      throw new Error(
        'OpenAI API key is required. Set config.openaiApiKey or OPENAI_API_KEY env var.'
      );
    }

    const requestBody = {
      model: config.model ?? DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'card_enrichment',
          strict: true,
          schema: outputSchema,
        },
      },
      temperature: 0.3,
      max_tokens: 2_000,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error: any = new Error(
        `OpenAI API error ${response.status}: ${errorBody}`
      );
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    return content;
  }

  /**
   * Build a batch request item for the OpenAI Batch API.
   * Used when config.useBatchAPI is true for 50% cost reduction.
   */
  buildBatchRequestItem(
    word: SourceWord,
    prompt: OpenAIPromptTemplate,
    config: PipelineConfig
  ): BatchRequestItem {
    const userMessage = renderTemplate(prompt.userPromptTemplate, word);

    return {
      custom_id: this.wordId(config.language, word),
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: config.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'card_enrichment',
            strict: true,
            schema: prompt.outputSchema,
          },
        },
        temperature: 0.3,
        max_tokens: 2_000,
      },
    };
  }

  /**
   * Parse a batch response item into a GeneratedCard.
   */
  parseBatchResponseItem(
    item: BatchResponseItem,
    word: SourceWord
  ): GeneratedCard | null {
    if (item.error) {
      console.error(
        `[BatchGenerator] Batch item "${item.custom_id}" failed: ` +
        `${item.error.code} - ${item.error.message}`
      );
      return null;
    }

    if (item.response.status_code !== 200) {
      console.error(
        `[BatchGenerator] Batch item "${item.custom_id}" returned status ` +
        `${item.response.status_code}.`
      );
      return null;
    }

    try {
      const content = item.response.body.choices[0]?.message?.content;
      if (!content) return null;

      const enrichedData = JSON.parse(content);

      return {
        id: item.custom_id,
        front: word.word,
        back: word.translation,
        tags: [...word.tags],
        sortPosition: word.sortPosition,
        reviewStatus: 'pending',
        generatedAt: new Date().toISOString(),
        ...enrichedData,
      };
    } catch (err: any) {
      console.error(
        `[BatchGenerator] Failed to parse batch item "${item.custom_id}": ${err.message}`
      );
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Private: checkpoint management
  // -------------------------------------------------------------------------

  /** Generate a deterministic card ID from language + word. */
  private wordId(language: string, word: SourceWord): string {
    return `${language}-${word.word}-${word.frequencyRank}`;
  }

  /** Resolve the checkpoint file path. */
  private checkpointFilePath(config: PipelineConfig): string {
    const dir = config.checkpointPath || path.resolve(process.cwd(), '.checkpoints');
    return path.resolve(dir, `${config.language}-checkpoint.json`);
  }

  /** Load an existing checkpoint or create a fresh one. */
  private loadCheckpoint(config: PipelineConfig): Checkpoint {
    const filePath = this.checkpointFilePath(config);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const checkpoint: Checkpoint = JSON.parse(raw);
        console.log(
          `[BatchGenerator] Resumed from checkpoint: ${checkpoint.completed.length} cards done.`
        );
        return checkpoint;
      } catch (err: any) {
        console.warn(
          `[BatchGenerator] Corrupted checkpoint at ${filePath}, starting fresh: ${err.message}`
        );
      }
    }

    return {
      runId: uuidv4(),
      language: config.language,
      lastUpdated: new Date().toISOString(),
      completed: [],
      remaining: [],
    };
  }

  /** Persist the checkpoint to disk. */
  private saveCheckpoint(checkpoint: Checkpoint, config: PipelineConfig): void {
    const filePath = this.checkpointFilePath(config);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
    console.log(
      `[BatchGenerator] Checkpoint saved: ${checkpoint.completed.length} cards done.`
    );
  }

  /** Delete the checkpoint file after successful completion. */
  private deleteCheckpoint(config: PipelineConfig): void {
    const filePath = this.checkpointFilePath(config);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[BatchGenerator] Checkpoint cleaned up.`);
    }
  }

  // -------------------------------------------------------------------------
  // Private: error classification
  // -------------------------------------------------------------------------

  /**
   * Determine whether an error is retryable.
   * Rate limit (429), server errors (5xx), and network errors are retryable.
   */
  private isRetryableError(error: any): boolean {
    if (error.status === 429) return true; // rate limited
    if (error.status >= 500 && error.status < 600) return true; // server error
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.message?.includes('fetch failed')) return true;
    return false;
  }
}

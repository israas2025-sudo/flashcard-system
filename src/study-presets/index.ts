/**
 * index.ts -- Barrel export for the study-presets module.
 *
 * Re-exports all public types and the service class so consumers
 * can import from a single entry point:
 *
 * ```typescript
 * import {
 *   StudyPresetService,
 *   StudyPreset,
 *   CreatePresetInput,
 *   PresetStudySession,
 * } from './study-presets';
 * ```
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

export type {
  StudyPreset,
  CreatePresetInput,
  UpdatePresetInput,
  StateFilter,
  PresetStudySession,
  BuiltInPresetDefinition,
  StudyPresetRow,
} from './types';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export { StudyPresetService } from './study-preset-service';

/**
 * Templates Module — Barrel Export
 *
 * Re-exports all public types, classes, and utilities from the card
 * template rendering engine subsystem.
 */

// Types
export type {
  NoteType,
  NoteField,
  CardTemplate,
  Note,
  CardCreationData,
  RenderOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Deck,
} from './types';

export { NoteTypeKind } from './types';

// Template Engine
export { TemplateEngine } from './template-engine';

// Card Generator
export { CardGenerator } from './card-generator';

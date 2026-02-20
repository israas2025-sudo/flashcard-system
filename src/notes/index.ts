/**
 * Notes Module — Barrel Export
 *
 * Re-exports all public types and the NoteService class from the
 * note/card CRUD subsystem.
 */

export { NoteService } from './note-service';

export type {
  NoteWithCards,
  NoteCard,
  NoteCreationData,
  NoteUpdateResult,
  DuplicateGroup,
  BatchCreateResult,
  FindReplaceResult,
} from './types';

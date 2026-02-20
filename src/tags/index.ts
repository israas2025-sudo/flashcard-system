/**
 * Tags Module
 *
 * Provides hierarchical tagging functionality for the multilingual
 * flashcard application. Tags support nesting, color-coding,
 * batch operations, and efficient tree queries via recursive CTEs.
 */

export { TagService } from './tag-service';

export type {
  Tag,
  TagTreeNode,
  TagTreeRow,
  TagPreset,
  NoteTag,
  Card,
} from './types';

export {
  slugify,
  buildHierarchicalName,
  parseHierarchicalTag,
  generateTagColor,
  validateTagName,
  sortTagsByName,
  flattenTagTree,
} from './tag-utils';

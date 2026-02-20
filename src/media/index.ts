/**
 * Media Module — Barrel Export
 *
 * Re-exports all public types, classes, and utilities from the media module.
 */

// Types
export type {
  Media,
  MediaChange,
  MediaRow,
  MediaChangeRow,
  PaginatedMediaResult,
  StorageUsage,
  UploadOptions,
  PasteUploadOptions,
  UrlUploadOptions,
} from './types';

// Constants and utilities
export {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_AUDIO_TYPES,
  SUPPORTED_VIDEO_TYPES,
  ALL_SUPPORTED_TYPES,
  MAX_FILE_SIZE_BYTES,
  MIME_TO_EXTENSION,
  getMediaCategory,
} from './types';

// Media Service
export { MediaService } from './media-service';

// MathJax Renderer
export { MathJaxRenderer } from './mathjax-renderer';
export type { MathJaxConfig, RenderedMath } from './mathjax-renderer';

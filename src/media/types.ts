/**
 * Media Management Types
 *
 * Type definitions for the media management system, including file uploads,
 * storage metadata, sync tracking, and storage usage statistics.
 */

// ---------------------------------------------------------------------------
// Core Media Types
// ---------------------------------------------------------------------------

/**
 * Represents a stored media file (image, audio, or video) associated with a user.
 */
export interface Media {
  /** Unique identifier (UUID) */
  id: string;
  /** Owner user ID */
  userId: string;
  /** Generated unique filename on disk (UUID + extension) */
  filename: string;
  /** Original filename as uploaded by the user */
  originalFilename: string;
  /** MIME type of the file (e.g., 'image/png', 'audio/mp3') */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** Path where the file is stored on disk or in cloud storage */
  storagePath: string;
  /** Public URL for serving the file */
  url: string;
  /** SHA-256 checksum of the file contents */
  checksum: string;
  /** Timestamp when the file was uploaded */
  createdAt: Date;
}

/**
 * Represents a change to a media item for sync tracking.
 */
export interface MediaChange {
  /** ID of the media item */
  mediaId: string;
  /** Type of change */
  changeType: 'added' | 'deleted';
  /** Update sequence number for sync ordering */
  usn: number;
}

// ---------------------------------------------------------------------------
// Upload Types
// ---------------------------------------------------------------------------

/**
 * Options for a standard file upload.
 */
export interface UploadOptions {
  /** The raw file buffer */
  file: Buffer;
  /** Original filename */
  filename: string;
  /** MIME type */
  mimeType: string;
}

/**
 * Options for a clipboard paste upload (base64 encoded data).
 */
export interface PasteUploadOptions {
  /** Base64-encoded file data (without the data URI prefix) */
  base64Data: string;
  /** MIME type of the pasted content */
  mimeType: string;
}

/**
 * Options for uploading a file from a remote URL.
 */
export interface UrlUploadOptions {
  /** Remote URL to download the file from */
  url: string;
}

// ---------------------------------------------------------------------------
// Query / Result Types
// ---------------------------------------------------------------------------

/**
 * Paginated result set for media listing.
 */
export interface PaginatedMediaResult {
  /** Array of media items for the current page */
  media: Media[];
  /** Total number of media items across all pages */
  total: number;
}

/**
 * Storage usage statistics for a user.
 */
export interface StorageUsage {
  /** Total bytes used across all media files */
  totalBytes: number;
  /** Number of media files */
  fileCount: number;
  /** Bytes used broken down by MIME type category (e.g., 'image', 'audio', 'video') */
  byType: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Database Row Types (internal mapping)
// ---------------------------------------------------------------------------

/**
 * Raw row from the media table as returned by pg.
 */
export interface MediaRow {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  checksum: string;
  created_at: Date;
  usn: number;
}

/**
 * Raw row from the media_changes table.
 */
export interface MediaChangeRow {
  media_id: string;
  change_type: 'added' | 'deleted';
  usn: number;
}

// ---------------------------------------------------------------------------
// Supported Formats
// ---------------------------------------------------------------------------

/** MIME types considered valid for image uploads */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** MIME types considered valid for audio uploads */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
] as const;

/** MIME types considered valid for video uploads */
export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
] as const;

/** All supported MIME types for upload */
export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_AUDIO_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
] as const;

/**
 * Maximum file size in bytes (50 MB).
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Map common MIME types to file extensions.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
};

/**
 * Get the broad media category from a MIME type.
 */
export function getMediaCategory(mimeType: string): 'image' | 'audio' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
}

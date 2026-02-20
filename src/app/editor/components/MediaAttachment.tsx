// @ts-nocheck
"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Image,
  Music,
  Video,
  Upload,
  X,
  GripVertical,
  FileWarning,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaFile {
  /** Unique identifier for this attachment. */
  id: string;
  /** Original filename. */
  name: string;
  /** MIME type of the file. */
  mimeType: string;
  /** Public or local URL for previewing. */
  url: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Upload status. */
  status: "uploading" | "complete" | "error";
  /** Upload progress (0-100). */
  progress: number;
  /** Error message if status is "error". */
  errorMessage?: string;
}

interface MediaAttachmentProps {
  /** Currently attached media files. */
  attachments: MediaFile[];
  /** Called when files are added (via browse or drag-and-drop). */
  onAdd: (files: File[]) => void;
  /** Called when an attachment is removed. */
  onRemove: (id: string) => void;
  /** Called when attachment order changes (drag reorder). */
  onReorder?: (ids: string[]) => void;
  /** Maximum number of attachments allowed. Defaults to 10. */
  maxFiles?: number;
  /** Maximum single file size in bytes. Defaults to 50 MB. */
  maxFileSize?: number;
  /** Accepted MIME type patterns. Defaults to image/*, audio/*, video/*. */
  accept?: string[];
  /** Whether the component is disabled. */
  disabled?: boolean;
  /** Optional CSS class. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const DEFAULT_ACCEPT = ["image/*", "audio/*", "video/*"];

const MIME_CATEGORY_MAP: Record<string, "image" | "audio" | "video"> = {};

function getMediaCategory(
  mimeType: string
): "image" | "audio" | "video" | "unknown" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "unknown";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MediaIcon({ mimeType }: { mimeType: string }) {
  const category = getMediaCategory(mimeType);
  switch (category) {
    case "image":
      return <Image className="w-4 h-4" />;
    case "audio":
      return <Music className="w-4 h-4" />;
    case "video":
      return <Video className="w-4 h-4" />;
    default:
      return <FileWarning className="w-4 h-4" />;
  }
}

function Thumbnail({
  file,
  onRemove,
  disabled,
}: {
  file: MediaFile;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const category = getMediaCategory(file.mimeType);
  const isUploading = file.status === "uploading";
  const isError = file.status === "error";

  return (
    <div
      className={`
        relative group rounded-lg border overflow-hidden
        border-[var(--surface-3)] bg-[var(--surface-1)]
        ${isError ? "border-red-500/50" : ""}
        ${isUploading ? "opacity-70" : ""}
      `}
    >
      {/* Preview area */}
      <div className="w-full h-24 flex items-center justify-center bg-[var(--surface-0)]">
        {category === "image" && file.status === "complete" ? (
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : category === "audio" ? (
          <div className="flex flex-col items-center gap-1">
            <Music className="w-8 h-8 text-[var(--text-tertiary)]" />
            {file.status === "complete" && (
              <audio
                src={file.url}
                controls
                className="w-full max-w-[140px] h-6"
                style={{ transform: "scale(0.85)" }}
              />
            )}
          </div>
        ) : category === "video" ? (
          <div className="flex items-center justify-center">
            {file.status === "complete" ? (
              <video
                src={file.url}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <Video className="w-8 h-8 text-[var(--text-tertiary)]" />
            )}
          </div>
        ) : (
          <FileWarning className="w-8 h-8 text-[var(--text-tertiary)]" />
        )}

        {/* Upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
              <span className="text-xs text-white font-medium">
                {file.progress}%
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <FileWarning className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* File info */}
      <div className="p-2">
        <div className="flex items-center gap-1.5">
          <MediaIcon mimeType={file.mimeType} />
          <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
            {file.name}
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {formatFileSize(file.sizeBytes)}
        </span>
        {isError && file.errorMessage && (
          <p className="text-[10px] text-red-500 mt-0.5 truncate">
            {file.errorMessage}
          </p>
        )}
      </div>

      {/* Remove button */}
      {!disabled && (
        <button
          onClick={() => onRemove(file.id)}
          className="
            absolute top-1 right-1 p-1 rounded-full
            bg-black/50 text-white opacity-0 group-hover:opacity-100
            transition-opacity duration-150 hover:bg-black/70
          "
          aria-label={`Remove ${file.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Drag handle */}
      {!disabled && (
        <div
          className="
            absolute top-1 left-1 p-0.5 rounded
            bg-black/30 text-white opacity-0 group-hover:opacity-100
            transition-opacity duration-150 cursor-grab
          "
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * MediaAttachment - A drag-and-drop media attachment component for the
 * card editor. Supports images, audio, and video uploads with preview
 * thumbnails.
 */
export function MediaAttachment({
  attachments,
  onAdd,
  onRemove,
  onReorder,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  className = "",
}: MediaAttachmentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];
      const remaining = maxFiles - attachments.length;

      if (files.length > remaining) {
        errors.push(
          `Cannot add ${files.length} files. Only ${remaining} more allowed (max ${maxFiles}).`
        );
        files = files.slice(0, remaining);
      }

      for (const file of files) {
        // Check file size
        if (file.size > maxFileSize) {
          errors.push(
            `"${file.name}" exceeds max size (${formatFileSize(maxFileSize)}).`
          );
          continue;
        }

        // Check MIME type
        const isAccepted = accept.some((pattern) => {
          if (pattern.endsWith("/*")) {
            const prefix = pattern.replace("/*", "/");
            return file.type.startsWith(prefix);
          }
          return file.type === pattern;
        });

        if (!isAccepted) {
          errors.push(`"${file.name}" has unsupported type "${file.type}".`);
          continue;
        }

        valid.push(file);
      }

      return { valid, errors };
    },
    [attachments.length, maxFiles, maxFileSize, accept]
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  const handleFiles = useCallback(
    (files: File[]) => {
      setValidationError(null);
      const { valid, errors } = validateFiles(files);

      if (errors.length > 0) {
        setValidationError(errors.join(" "));
      }

      if (valid.length > 0) {
        onAdd(valid);
      }
    },
    [validateFiles, onAdd]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      dragCounter.current = 0;

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles]
  );

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        handleFiles(files);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const hasAttachments = attachments.length > 0;
  const canAddMore = attachments.length < maxFiles;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative flex flex-col items-center justify-center gap-2
            p-6 rounded-xl border-2 border-dashed cursor-pointer
            transition-colors duration-200
            ${
              isDragOver
                ? "border-primary-500 bg-primary-500/10"
                : "border-[var(--surface-3)] hover:border-[var(--text-tertiary)] hover:bg-[var(--surface-1)]"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          role="button"
          tabIndex={0}
          aria-label="Upload media files"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleBrowseClick();
            }
          }}
        >
          <Upload
            className={`w-6 h-6 ${
              isDragOver
                ? "text-primary-500"
                : "text-[var(--text-tertiary)]"
            }`}
          />
          <div className="text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {isDragOver
                ? "Drop files here"
                : "Drag and drop files, or click to browse"}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Images, audio, and video up to {formatFileSize(maxFileSize)}
            </p>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept.join(",")}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <FileWarning className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{validationError}</p>
        </div>
      )}

      {/* Attachment grid */}
      {hasAttachments && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((file) => (
            <Thumbnail
              key={file.id}
              file={file}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* File count indicator */}
      {hasAttachments && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {attachments.length} / {maxFiles} files attached
        </p>
      )}
    </div>
  );
}

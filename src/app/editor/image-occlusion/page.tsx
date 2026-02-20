// @ts-nocheck
"use client";

/**
 * Image Occlusion Editor Page
 *
 * Provides a full-featured editor for creating image occlusion cards:
 * - Upload or paste an image
 * - Draw rectangular, elliptical, or polygon masks over regions
 * - Toolbar with shape selector, color picker, label input, and mode toggle
 * - Preview showing how each card will look
 * - Save to generate note with cards
 */

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Square,
  Circle,
  Pentagon,
  MousePointer2,
  Trash2,
  Eye,
  Save,
  Upload,
  ArrowLeft,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MaskCanvas, {
  type MaskShape,
  type DrawingTool,
} from "./components/MaskCanvas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OcclusionMode = "hide-all-guess-one" | "hide-one-guess-one";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ImageOcclusionEditorPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageName, setImageName] = useState<string>("");

  // Mask state
  const [masks, setMasks] = useState<MaskShape[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("rectangle");
  const [maskColor, setMaskColor] = useState("rgba(59, 130, 246, 0.65)");
  const [mode, setMode] = useState<OcclusionMode>("hide-all-guess-one");

  // Preview state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // -------------------------------------------------------------------------
  // Image upload
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
      setMasks([]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        setImageName("Pasted image");
        const reader = new FileReader();
        reader.onload = (ev) => {
          setImageUrl(ev.target?.result as string);
          setMasks([]);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleClearAll = () => {
    setMasks([]);
  };

  const handleDeleteSelected = () => {
    // MaskCanvas handles delete via keyboard
  };

  const handleSave = async () => {
    if (!imageUrl || masks.length === 0) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/image-occlusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          masks,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      router.push("/browser");
    } catch (error) {
      console.error("Failed to save image occlusion:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Color presets
  // -------------------------------------------------------------------------

  const colorPresets = [
    { label: "Blue", value: "rgba(59, 130, 246, 0.65)" },
    { label: "Red", value: "rgba(239, 68, 68, 0.65)" },
    { label: "Green", value: "rgba(34, 197, 94, 0.65)" },
    { label: "Yellow", value: "rgba(234, 179, 8, 0.65)" },
    { label: "Purple", value: "rgba(168, 85, 247, 0.65)" },
    { label: "Orange", value: "rgba(249, 115, 22, 0.65)" },
  ];

  // -------------------------------------------------------------------------
  // Render: Upload screen
  // -------------------------------------------------------------------------

  if (!imageUrl) {
    return (
      <div className="max-w-2xl mx-auto py-12" onPaste={handlePaste}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Image Occlusion
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Upload an image, then draw masks over the regions you want to study.
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-[var(--surface-3)] rounded-2xl cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 transition-all"
        >
          <Upload className="w-10 h-10 text-[var(--text-tertiary)] mb-4" />
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">
            Click to upload or paste an image
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            PNG, JPG, SVG, or WebP
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Editor
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]" onPaste={handlePaste}>
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--surface-3)] bg-[var(--surface-1)]">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>

        <div className="w-px h-6 bg-[var(--surface-3)]" />

        {/* Shape tools */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-xl p-1">
          <ToolButton
            icon={<MousePointer2 className="w-4 h-4" />}
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
            title="Select (V)"
          />
          <ToolButton
            icon={<Square className="w-4 h-4" />}
            active={activeTool === "rectangle"}
            onClick={() => setActiveTool("rectangle")}
            title="Rectangle (R)"
          />
          <ToolButton
            icon={<Circle className="w-4 h-4" />}
            active={activeTool === "ellipse"}
            onClick={() => setActiveTool("ellipse")}
            title="Ellipse (E)"
          />
          <ToolButton
            icon={<Pentagon className="w-4 h-4" />}
            active={activeTool === "polygon"}
            onClick={() => setActiveTool("polygon")}
            title="Polygon (P)"
          />
        </div>

        <div className="w-px h-6 bg-[var(--surface-3)]" />

        {/* Color picker */}
        <div className="flex items-center gap-1.5">
          {colorPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setMaskColor(preset.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                maskColor === preset.value
                  ? "border-white shadow-md scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-[var(--surface-3)]" />

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-[var(--surface-2)] rounded-xl p-1">
          <button
            onClick={() => setMode("hide-all-guess-one")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === "hide-all-guess-one"
                ? "bg-primary-500 text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            HAGO
          </button>
          <button
            onClick={() => setMode("hide-one-guess-one")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              mode === "hide-one-guess-one"
                ? "bg-primary-500 text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            HOGO
          </button>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <span className="text-xs text-[var(--text-tertiary)]">
          {masks.length} mask{masks.length !== 1 ? "s" : ""} = {masks.length} card
          {masks.length !== 1 ? "s" : ""}
        </span>

        <button
          onClick={handleClearAll}
          disabled={masks.length === 0}
          className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] disabled:opacity-40 transition-colors"
          title="Clear all masks"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowPreview(!showPreview)}
          disabled={masks.length === 0}
          className={`p-2 rounded-lg transition-colors ${
            showPreview
              ? "bg-primary-500 text-white"
              : "hover:bg-[var(--surface-2)] text-[var(--text-secondary)]"
          } disabled:opacity-40`}
          title="Preview cards"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={handleSave}
          disabled={masks.length === 0 || isSaving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 p-4 overflow-auto">
          <MaskCanvas
            imageUrl={imageUrl}
            masks={masks}
            onMasksChange={setMasks}
            activeTool={activeTool}
            maskColor={maskColor}
            className="w-full"
          />
        </div>

        {/* Preview sidebar */}
        {showPreview && masks.length > 0 && (
          <div className="w-80 border-l border-[var(--surface-3)] bg-[var(--surface-1)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-3)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Card Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPreviewIndex(Math.max(0, previewIndex - 1))
                  }
                  disabled={previewIndex === 0}
                  className="p-1 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {previewIndex + 1} / {masks.length}
                </span>
                <button
                  onClick={() =>
                    setPreviewIndex(
                      Math.min(masks.length - 1, previewIndex + 1)
                    )
                  }
                  disabled={previewIndex >= masks.length - 1}
                  className="p-1 rounded-lg hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Front preview */}
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Front
                </p>
                <div className="rounded-xl overflow-hidden border border-[var(--surface-3)] bg-[var(--surface-0)]">
                  <PreviewCard
                    imageUrl={imageUrl}
                    masks={masks}
                    cardIndex={previewIndex}
                    mode={mode}
                    side="front"
                  />
                </div>
              </div>

              {/* Back preview */}
              <div>
                <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Back
                </p>
                <div className="rounded-xl overflow-hidden border border-[var(--surface-3)] bg-[var(--surface-0)]">
                  <PreviewCard
                    imageUrl={imageUrl}
                    masks={masks}
                    cardIndex={previewIndex}
                    mode={mode}
                    side="back"
                  />
                </div>
              </div>

              {/* Mask label */}
              {masks[previewIndex]?.label && (
                <div className="px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950/30">
                  <p className="text-xs text-[var(--text-tertiary)]">Label</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {masks[previewIndex].label}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mask list panel (bottom) */}
      {masks.length > 0 && (
        <div className="border-t border-[var(--surface-3)] bg-[var(--surface-1)] px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {masks.map((mask, i) => (
              <div
                key={mask.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] text-xs shrink-0"
              >
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: mask.color || maskColor }}
                />
                <span className="text-[var(--text-secondary)]">
                  {mask.label || `Mask ${i + 1}`}
                </span>
                <span className="text-[var(--text-tertiary)]">
                  ({mask.type})
                </span>
                <button
                  onClick={() => setMasks(masks.filter((m) => m.id !== mask.id))}
                  className="p-0.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToolButton({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? "bg-primary-500 text-white shadow-sm"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]"
      }`}
    >
      {icon}
    </button>
  );
}

function PreviewCard({
  imageUrl,
  masks,
  cardIndex,
  mode,
  side,
}: {
  imageUrl: string;
  masks: MaskShape[];
  cardIndex: number;
  mode: OcclusionMode;
  side: "front" | "back";
}) {
  /**
   * Render a simplified preview of how this card will look.
   * Uses a CSS overlay approach instead of Canvas for the preview thumbnails.
   */
  const visibleMasks = masks.map((mask, i) => {
    const isActive = i === cardIndex;

    if (mode === "hide-all-guess-one") {
      if (side === "back" && isActive) {
        return { ...mask, previewColor: "rgba(34, 197, 94, 0.35)" };
      }
      return { ...mask, previewColor: mask.color || "rgba(59, 130, 246, 0.65)" };
    } else {
      // HOGO
      if (!isActive) return null; // Don't show non-active masks
      if (side === "back") {
        return { ...mask, previewColor: "rgba(34, 197, 94, 0.35)" };
      }
      return { ...mask, previewColor: mask.color || "rgba(59, 130, 246, 0.65)" };
    }
  });

  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt="Preview"
        className="w-full h-auto block"
      />
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {visibleMasks.map((mask, i) => {
          if (!mask) return null;
          const fill = mask.previewColor;

          switch (mask.type) {
            case "rectangle":
              return (
                <rect
                  key={mask.id}
                  x={`${((mask.x ?? 0) / 1000) * 100}%`}
                  y={`${((mask.y ?? 0) / 1000) * 100}%`}
                  width={`${((mask.width ?? 0) / 1000) * 100}%`}
                  height={`${((mask.height ?? 0) / 1000) * 100}%`}
                  fill={fill}
                  rx="2"
                />
              );
            case "ellipse":
              return (
                <ellipse
                  key={mask.id}
                  cx={`${((mask.cx ?? 0) / 1000) * 100}%`}
                  cy={`${((mask.cy ?? 0) / 1000) * 100}%`}
                  rx={`${((mask.rx ?? 0) / 1000) * 100}%`}
                  ry={`${((mask.ry ?? 0) / 1000) * 100}%`}
                  fill={fill}
                />
              );
            case "polygon": {
              const pts = (mask.points || [])
                .map(
                  (p) =>
                    `${(p.x / 1000) * 100}%,${(p.y / 1000) * 100}%`
                )
                .join(" ");
              return (
                <polygon key={mask.id} points={pts} fill={fill} />
              );
            }
            default:
              return null;
          }
        })}
      </svg>
    </div>
  );
}

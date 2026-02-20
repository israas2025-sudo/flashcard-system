// @ts-nocheck
"use client";

/**
 * MaskCanvas — Canvas drawing component for Image Occlusion masks.
 *
 * Provides interactive drawing of rectangles, ellipses, and polygons
 * on top of an uploaded image. Supports move, resize, delete, label
 * editing, and zoom/pan.
 */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MaskType = "rectangle" | "ellipse" | "polygon";

export interface MaskShape {
  id: string;
  type: MaskType;
  // Rectangle
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // Ellipse
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  // Polygon
  points?: { x: number; y: number }[];
  label?: string;
  color?: string;
}

export type DrawingTool = "rectangle" | "ellipse" | "polygon" | "select";

interface MaskCanvasProps {
  imageUrl: string;
  masks: MaskShape[];
  onMasksChange: (masks: MaskShape[]) => void;
  activeTool: DrawingTool;
  maskColor: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_COLOR = "rgba(59, 130, 246, 0.65)";

function generateId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaskCanvas({
  imageUrl,
  masks,
  onMasksChange,
  activeTool,
  maskColor,
  className = "",
}: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);

  // Selection state
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Label editing
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");

  // -------------------------------------------------------------------------
  // Image loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // -------------------------------------------------------------------------
  // Canvas sizing
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !imageLoaded) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width } = entry.contentRect;
        const aspect = imageSize.width / imageSize.height;
        const height = width / aspect;
        setCanvasSize({ width, height });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [imageLoaded, imageSize]);

  // -------------------------------------------------------------------------
  // Scale factor from canvas coordinates to image coordinates
  // -------------------------------------------------------------------------

  const scale = useMemo(() => {
    if (canvasSize.width === 0 || imageSize.width === 0) return 1;
    return imageSize.width / canvasSize.width;
  }, [canvasSize.width, imageSize.width]);

  function toImageCoords(canvasX: number, canvasY: number) {
    return {
      x: (canvasX - pan.x) * scale / zoom,
      y: (canvasY - pan.y) * scale / zoom,
    };
  }

  function toCanvasCoords(imageX: number, imageY: number) {
    return {
      x: (imageX / scale) * zoom + pan.x,
      y: (imageY / scale) * zoom + pan.y,
    };
  }

  // -------------------------------------------------------------------------
  // Drawing / rendering
  // -------------------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    canvas.width = canvasSize.width * window.devicePixelRatio;
    canvas.height = canvasSize.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Apply zoom and pan transforms
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw image
    const displayWidth = canvasSize.width;
    const displayHeight = canvasSize.height;
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Draw masks
    const canvasScale = 1 / scale;
    for (const mask of masks) {
      const isSelected = mask.id === selectedMaskId;
      const fillColor = mask.color || maskColor || DEFAULT_COLOR;

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255,255,255,0.5)";
      ctx.lineWidth = isSelected ? 2 / zoom : 1 / zoom;

      switch (mask.type) {
        case "rectangle": {
          const rx = (mask.x ?? 0) * canvasScale;
          const ry = (mask.y ?? 0) * canvasScale;
          const rw = (mask.width ?? 0) * canvasScale;
          const rh = (mask.height ?? 0) * canvasScale;
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);

          // Label
          if (mask.label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = `${Math.max(12, 14 / zoom)}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(mask.label, rx + rw / 2, ry + rh / 2);
          }
          break;
        }

        case "ellipse": {
          const ecx = (mask.cx ?? 0) * canvasScale;
          const ecy = (mask.cy ?? 0) * canvasScale;
          const erx = (mask.rx ?? 0) * canvasScale;
          const ery = (mask.ry ?? 0) * canvasScale;
          ctx.beginPath();
          ctx.ellipse(ecx, ecy, Math.abs(erx), Math.abs(ery), 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (mask.label) {
            ctx.fillStyle = "#ffffff";
            ctx.font = `${Math.max(12, 14 / zoom)}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(mask.label, ecx, ecy);
          }
          break;
        }

        case "polygon": {
          const pts = mask.points || [];
          if (pts.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(pts[0].x * canvasScale, pts[0].y * canvasScale);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x * canvasScale, pts[i].y * canvasScale);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          if (mask.label && pts.length > 0) {
            const centX = pts.reduce((s, p) => s + p.x, 0) / pts.length * canvasScale;
            const centY = pts.reduce((s, p) => s + p.y, 0) / pts.length * canvasScale;
            ctx.fillStyle = "#ffffff";
            ctx.font = `${Math.max(12, 14 / zoom)}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(mask.label, centX, centY);
          }
          break;
        }
      }

      // Draw resize handles for selected mask
      if (isSelected && mask.type === "rectangle") {
        const rx = (mask.x ?? 0) * canvasScale;
        const ry = (mask.y ?? 0) * canvasScale;
        const rw = (mask.width ?? 0) * canvasScale;
        const rh = (mask.height ?? 0) * canvasScale;
        const handleSize = 6 / zoom;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5 / zoom;
        const corners = [
          [rx, ry],
          [rx + rw, ry],
          [rx, ry + rh],
          [rx + rw, ry + rh],
        ];
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }
      }
    }

    // Draw in-progress shape
    if (isDrawing && drawStart && drawCurrent) {
      ctx.fillStyle = maskColor || DEFAULT_COLOR;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / zoom;

      if (activeTool === "rectangle") {
        const x = Math.min(drawStart.x, drawCurrent.x) / scale * canvasScale;
        const y = Math.min(drawStart.y, drawCurrent.y) / scale * canvasScale;
        const w = Math.abs(drawCurrent.x - drawStart.x) / scale * canvasScale;
        const h = Math.abs(drawCurrent.y - drawStart.y) / scale * canvasScale;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (activeTool === "ellipse") {
        const cx = ((drawStart.x + drawCurrent.x) / 2) / scale * canvasScale;
        const cy = ((drawStart.y + drawCurrent.y) / 2) / scale * canvasScale;
        const rx = Math.abs(drawCurrent.x - drawStart.x) / 2 / scale * canvasScale;
        const ry = Math.abs(drawCurrent.y - drawStart.y) / 2 / scale * canvasScale;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Draw polygon in-progress
    if (activeTool === "polygon" && polygonPoints.length > 0) {
      const canvasScale2 = 1 / scale;
      ctx.fillStyle = maskColor || DEFAULT_COLOR;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x * canvasScale2, polygonPoints[0].y * canvasScale2);
      for (let i = 1; i < polygonPoints.length; i++) {
        ctx.lineTo(polygonPoints[i].x * canvasScale2, polygonPoints[i].y * canvasScale2);
      }
      if (drawCurrent) {
        ctx.lineTo(drawCurrent.x / scale * canvasScale2, drawCurrent.y / scale * canvasScale2);
      }
      ctx.stroke();

      // Draw dots at polygon vertices
      for (const pt of polygonPoints) {
        ctx.beginPath();
        ctx.arc(pt.x * canvasScale2, pt.y * canvasScale2, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#3b82f6";
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [
    canvasSize,
    masks,
    selectedMaskId,
    maskColor,
    isDrawing,
    drawStart,
    drawCurrent,
    activeTool,
    polygonPoints,
    zoom,
    pan,
    scale,
  ]);

  useEffect(() => {
    if (imageLoaded) {
      requestAnimationFrame(draw);
    }
  }, [draw, imageLoaded]);

  // -------------------------------------------------------------------------
  // Mouse event helpers
  // -------------------------------------------------------------------------

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function hitTest(imageX: number, imageY: number): string | null {
    // Test masks in reverse order (topmost first)
    for (let i = masks.length - 1; i >= 0; i--) {
      const mask = masks[i];
      switch (mask.type) {
        case "rectangle": {
          const mx = mask.x ?? 0;
          const my = mask.y ?? 0;
          const mw = mask.width ?? 0;
          const mh = mask.height ?? 0;
          if (imageX >= mx && imageX <= mx + mw && imageY >= my && imageY <= my + mh) {
            return mask.id;
          }
          break;
        }
        case "ellipse": {
          const ecx = mask.cx ?? 0;
          const ecy = mask.cy ?? 0;
          const erx = mask.rx ?? 1;
          const ery = mask.ry ?? 1;
          const dx = (imageX - ecx) / erx;
          const dy = (imageY - ecy) / ery;
          if (dx * dx + dy * dy <= 1) {
            return mask.id;
          }
          break;
        }
        case "polygon": {
          const pts = mask.points || [];
          if (isPointInPolygon(imageX, imageY, pts)) {
            return mask.id;
          }
          break;
        }
      }
    }
    return null;
  }

  function isPointInPolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  // -------------------------------------------------------------------------
  // Mouse events
  // -------------------------------------------------------------------------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);

      // Middle click or space-key panning
      if (e.button === 1) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }

      if (activeTool === "select") {
        const imgPos = toImageCoords(pos.x, pos.y);
        const hit = hitTest(imgPos.x, imgPos.y);
        setSelectedMaskId(hit);
        if (hit) {
          setIsDragging(true);
          const mask = masks.find((m) => m.id === hit);
          if (mask) {
            const maskX = mask.type === "ellipse" ? (mask.cx ?? 0) : (mask.x ?? 0);
            const maskY = mask.type === "ellipse" ? (mask.cy ?? 0) : (mask.y ?? 0);
            setDragOffset({ x: imgPos.x - maskX, y: imgPos.y - maskY });
          }
        }
        return;
      }

      if (activeTool === "polygon") {
        const imgPos = toImageCoords(pos.x, pos.y);
        // Close polygon on double-click or clicking near the first point
        if (polygonPoints.length >= 3) {
          const first = polygonPoints[0];
          const dist = Math.sqrt((imgPos.x - first.x) ** 2 + (imgPos.y - first.y) ** 2);
          if (dist < 15 * scale) {
            // Close the polygon
            const newMask: MaskShape = {
              id: generateId(),
              type: "polygon",
              points: [...polygonPoints],
              label: "",
              color: maskColor || DEFAULT_COLOR,
            };
            onMasksChange([...masks, newMask]);
            setPolygonPoints([]);
            return;
          }
        }
        setPolygonPoints([...polygonPoints, imgPos]);
        return;
      }

      // Rectangle or Ellipse
      setIsDrawing(true);
      const imgPos = toImageCoords(pos.x, pos.y);
      setDrawStart(imgPos);
      setDrawCurrent(imgPos);
    },
    [activeTool, masks, maskColor, pan, zoom, scale, polygonPoints, onMasksChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);

      if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        return;
      }

      if (isDragging && selectedMaskId) {
        const imgPos = toImageCoords(pos.x, pos.y);
        const updated = masks.map((m) => {
          if (m.id !== selectedMaskId) return m;
          switch (m.type) {
            case "rectangle":
              return { ...m, x: imgPos.x - dragOffset.x, y: imgPos.y - dragOffset.y };
            case "ellipse":
              return { ...m, cx: imgPos.x - dragOffset.x, cy: imgPos.y - dragOffset.y };
            case "polygon": {
              const oldCx = (m.points || []).reduce((s, p) => s + p.x, 0) / (m.points?.length || 1);
              const oldCy = (m.points || []).reduce((s, p) => s + p.y, 0) / (m.points?.length || 1);
              const dx = imgPos.x - dragOffset.x - oldCx;
              const dy = imgPos.y - dragOffset.y - oldCy;
              return {
                ...m,
                points: (m.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy })),
              };
            }
            default:
              return m;
          }
        });
        onMasksChange(updated);
        return;
      }

      if (isDrawing && drawStart) {
        const imgPos = toImageCoords(pos.x, pos.y);
        setDrawCurrent(imgPos);
        return;
      }

      // Update polygon preview line
      if (activeTool === "polygon" && polygonPoints.length > 0) {
        const imgPos = toImageCoords(pos.x, pos.y);
        setDrawCurrent(imgPos);
      }
    },
    [
      isPanning,
      panStart,
      isDragging,
      selectedMaskId,
      masks,
      dragOffset,
      isDrawing,
      drawStart,
      activeTool,
      polygonPoints,
      zoom,
      pan,
      scale,
      onMasksChange,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      if (isDragging) {
        setIsDragging(false);
        return;
      }

      if (isDrawing && drawStart && drawCurrent) {
        const minX = Math.min(drawStart.x, drawCurrent.x);
        const minY = Math.min(drawStart.y, drawCurrent.y);
        const maxX = Math.max(drawStart.x, drawCurrent.x);
        const maxY = Math.max(drawStart.y, drawCurrent.y);
        const w = maxX - minX;
        const h = maxY - minY;

        // Only create mask if the shape has meaningful size
        if (w > 5 && h > 5) {
          let newMask: MaskShape;

          if (activeTool === "rectangle") {
            newMask = {
              id: generateId(),
              type: "rectangle",
              x: minX,
              y: minY,
              width: w,
              height: h,
              label: "",
              color: maskColor || DEFAULT_COLOR,
            };
          } else {
            // Ellipse
            newMask = {
              id: generateId(),
              type: "ellipse",
              cx: minX + w / 2,
              cy: minY + h / 2,
              rx: w / 2,
              ry: h / 2,
              label: "",
              color: maskColor || DEFAULT_COLOR,
            };
          }

          onMasksChange([...masks, newMask]);
        }

        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
      }
    },
    [isPanning, isDragging, isDrawing, drawStart, drawCurrent, activeTool, masks, maskColor, onMasksChange]
  );

  // -------------------------------------------------------------------------
  // Wheel zoom
  // -------------------------------------------------------------------------

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = clamp(zoom + delta, 0.25, 4);
      setZoom(newZoom);
    },
    [zoom]
  );

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedMaskId && !editingLabelId) {
          e.preventDefault();
          onMasksChange(masks.filter((m) => m.id !== selectedMaskId));
          setSelectedMaskId(null);
        }
      }
      if (e.key === "Escape") {
        setSelectedMaskId(null);
        setPolygonPoints([]);
        setIsDrawing(false);
        setEditingLabelId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMaskId, editingLabelId, masks, onMasksChange]);

  // -------------------------------------------------------------------------
  // Label editing
  // -------------------------------------------------------------------------

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);
      const imgPos = toImageCoords(pos.x, pos.y);
      const hit = hitTest(imgPos.x, imgPos.y);
      if (hit) {
        const mask = masks.find((m) => m.id === hit);
        setEditingLabelId(hit);
        setLabelInput(mask?.label ?? "");
      }
    },
    [masks, pan, zoom, scale]
  );

  function handleLabelSave() {
    if (!editingLabelId) return;
    const updated = masks.map((m) =>
      m.id === editingLabelId ? { ...m, label: labelInput } : m
    );
    onMasksChange(updated);
    setEditingLabelId(null);
    setLabelInput("");
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] ${className}`}
    >
      {!imageLoaded && (
        <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)] text-sm">
          Loading image...
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          cursor:
            activeTool === "select"
              ? isDragging
                ? "grabbing"
                : "default"
              : activeTool === "polygon"
              ? "crosshair"
              : "crosshair",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        className={imageLoaded ? "" : "hidden"}
      />

      {/* Label editing popup */}
      {editingLabelId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-0)] shadow-elevated border border-[var(--surface-3)]">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLabelSave();
              if (e.key === "Escape") setEditingLabelId(null);
            }}
            placeholder="Enter label..."
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--surface-3)] focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
          <button
            onClick={handleLabelSave}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditingLabelId(null)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 px-2 py-1 text-xs font-mono rounded-lg bg-[var(--surface-0)]/80 text-[var(--text-secondary)] border border-[var(--surface-3)]">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

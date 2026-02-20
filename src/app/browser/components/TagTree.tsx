"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, MoreHorizontal, GripVertical } from "lucide-react";

interface TagNode {
  id: string;
  name: string;
  color: string;
  count: number;
  children?: TagNode[];
}

interface TagTreeProps {
  compact?: boolean;
  onTagSelect?: (tagId: string) => void;
}

const defaultTags: TagNode[] = [
  {
    id: "t-quranic",
    name: "Quranic",
    color: "bg-teal-500",
    count: 1800,
    children: [
      { id: "t-quran-fatiha", name: "Al-Fatiha", color: "bg-teal-400", count: 7 },
      { id: "t-quran-baqarah", name: "Al-Baqarah", color: "bg-teal-400", count: 286 },
      { id: "t-quran-imran", name: "Aal-Imran", color: "bg-teal-400", count: 200 },
      { id: "t-quran-yusuf", name: "Yusuf", color: "bg-teal-400", count: 111 },
      { id: "t-quran-kahf", name: "Al-Kahf", color: "bg-teal-400", count: 110 },
      { id: "t-quran-rahman", name: "Ar-Rahman", color: "bg-teal-400", count: 78 },
      { id: "t-quran-mulk", name: "Al-Mulk", color: "bg-teal-400", count: 30 },
      { id: "t-quran-juz30", name: "Juz 30", color: "bg-teal-400", count: 564 },
    ],
  },
  {
    id: "t-subjects",
    name: "Subjects",
    color: "bg-violet-500",
    count: 3200,
    children: [
      { id: "t-greetings", name: "Greetings", color: "bg-violet-400", count: 120 },
      { id: "t-food", name: "Food & Cooking", color: "bg-orange-400", count: 180 },
      { id: "t-travel", name: "Travel", color: "bg-blue-400", count: 150 },
      { id: "t-household", name: "Household", color: "bg-emerald-400", count: 140 },
      { id: "t-shopping", name: "Shopping & Money", color: "bg-yellow-400", count: 110 },
      { id: "t-family", name: "Family", color: "bg-pink-400", count: 95 },
      { id: "t-body", name: "Body & Health", color: "bg-red-400", count: 130 },
      { id: "t-education", name: "Education", color: "bg-indigo-400", count: 160 },
      { id: "t-nature", name: "Nature & Weather", color: "bg-green-400", count: 125 },
      { id: "t-work", name: "Work & Office", color: "bg-slate-400", count: 145 },
      { id: "t-emotions", name: "Emotions", color: "bg-rose-400", count: 100 },
      { id: "t-religion", name: "Religion & Prayer", color: "bg-teal-400", count: 200 },
      { id: "t-sports", name: "Sports & Exercise", color: "bg-cyan-400", count: 85 },
      { id: "t-clothing", name: "Clothing", color: "bg-purple-400", count: 90 },
      { id: "t-numbers", name: "Numbers & Time", color: "bg-amber-400", count: 170 },
      { id: "t-directions", name: "Directions", color: "bg-sky-400", count: 100 },
    ],
  },
  {
    id: "t-frequency",
    name: "Frequency",
    color: "bg-red-500",
    count: 600,
    children: [
      { id: "t-freq100", name: "Top 100", color: "bg-red-400", count: 100 },
      { id: "t-freq500", name: "Top 500", color: "bg-orange-400", count: 500 },
    ],
  },
];

interface ContextMenuState {
  x: number;
  y: number;
  tagId: string;
}

function TagNodeItem({
  node,
  depth = 0,
  compact = false,
  onSelect,
  onContextMenu,
}: {
  node: TagNode;
  depth?: number;
  compact?: boolean;
  onSelect?: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tagId: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 py-1 rounded-md cursor-pointer hover:bg-[var(--surface-2)] transition-colors ${
          compact ? "px-1" : "px-2"
        }`}
        style={{ paddingLeft: `${depth * 16 + (compact ? 4 : 8)}px` }}
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(node.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu?.(e, node.id);
        }}
      >
        {/* Drag handle (non-compact mode) */}
        {!compact && (
          <GripVertical className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
        )}

        {/* Expand/collapse */}
        {hasChildren ? (
          <ChevronDown
            className={`w-3 h-3 text-[var(--text-tertiary)] transition-transform flex-shrink-0 ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        ) : (
          <div className="w-3 flex-shrink-0" />
        )}

        {/* Color dot */}
        <div className={`w-2 h-2 rounded-full ${node.color} flex-shrink-0`} />

        {/* Name */}
        <span
          className={`flex-1 truncate ${
            compact ? "text-xs" : "text-sm"
          } text-[var(--text-secondary)]`}
        >
          {node.name}
        </span>

        {/* Count badge */}
        <span
          className={`${
            compact ? "text-[10px]" : "text-xs"
          } text-[var(--text-tertiary)] tabular-nums`}
        >
          {node.count}
        </span>

        {/* More menu (non-compact) */}
        {!compact && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu?.(e, node.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--surface-3)]"
          >
            <MoreHorizontal className="w-3 h-3 text-[var(--text-tertiary)]" />
          </button>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children!.map((child) => (
              <TagNodeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                compact={compact}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TagTree({ compact = false, onTagSelect }: TagTreeProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent, tagId: string) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        tagId,
      });
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={closeContextMenu}
    >
      {defaultTags.map((tag) => (
        <TagNodeItem
          key={tag.id}
          node={tag}
          compact={compact}
          onSelect={onTagSelect}
          onContextMenu={handleContextMenu}
        />
      ))}

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 w-40 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-0)] shadow-elevated overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Rename
            </button>
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Change Color
            </button>
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
            >
              Pause All Cards
            </button>
            <div className="border-t border-[var(--surface-3)]" />
            <button
              onClick={() => {
                closeContextMenu();
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              Delete Tag
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Search,
  Plus,
  ChevronDown,
  GripVertical,
  Palette,
  Pencil,
  Trash2,
  X,
  Check,
  FolderPlus,
} from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  color: string;
  count: number;
  children: TagItem[];
}

const colorPalette = [
  "#EF4444", "#F97316", "#F59E0B", "#22C55E", "#14B8A6",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B",
  "#DC2626", "#EA580C", "#D97706", "#16A34A", "#0D9488",
  "#2563EB", "#4F46E5", "#7C3AED", "#DB2777", "#475569",
];

const tagPresets = [
  { name: "Vocabulary", color: "#6366F1" },
  { name: "Grammar", color: "#14B8A6" },
  { name: "Phrases", color: "#F59E0B" },
  { name: "Memorized", color: "#22C55E" },
  { name: "Difficult", color: "#EF4444" },
  { name: "Verbs", color: "#8B5CF6" },
  { name: "Nouns", color: "#3B82F6" },
  { name: "Review", color: "#F97316" },
];

const initialTags: TagItem[] = [
  {
    id: "arabic",
    name: "arabic",
    color: "#F59E0B",
    count: 1200,
    children: [
      { id: "arabic-vocab", name: "vocabulary", color: "#F59E0B", count: 800, children: [] },
      { id: "arabic-grammar", name: "grammar", color: "#F59E0B", count: 300, children: [] },
      { id: "arabic-phrases", name: "phrases", color: "#F59E0B", count: 100, children: [] },
    ],
  },
  {
    id: "quran",
    name: "quran",
    color: "#14B8A6",
    count: 800,
    children: [
      { id: "quran-memorized", name: "memorized", color: "#14B8A6", count: 200, children: [] },
      { id: "quran-review", name: "review", color: "#14B8A6", count: 600, children: [] },
    ],
  },
  {
    id: "spanish",
    name: "spanish",
    color: "#F97316",
    count: 950,
    children: [
      { id: "spanish-verbs", name: "verbs", color: "#F97316", count: 350, children: [] },
      { id: "spanish-nature", name: "nature", color: "#F97316", count: 200, children: [] },
      { id: "spanish-food", name: "food", color: "#F97316", count: 150, children: [] },
      { id: "spanish-travel", name: "travel", color: "#F97316", count: 250, children: [] },
    ],
  },
  {
    id: "english",
    name: "english",
    color: "#64748B",
    count: 600,
    children: [
      { id: "english-gre", name: "gre", color: "#64748B", count: 400, children: [] },
      { id: "english-academic", name: "academic", color: "#64748B", count: 200, children: [] },
    ],
  },
  {
    id: "egyptian",
    name: "egyptian",
    color: "#8B5CF6",
    count: 450,
    children: [
      { id: "egyptian-greetings", name: "greetings", color: "#8B5CF6", count: 80, children: [] },
      { id: "egyptian-slang", name: "slang", color: "#8B5CF6", count: 120, children: [] },
      { id: "egyptian-daily", name: "daily", color: "#8B5CF6", count: 250, children: [] },
    ],
  },
];

function ColorPicker({
  currentColor,
  onSelect,
  onClose,
}: {
  currentColor: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      className="absolute z-50 p-3 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)] shadow-elevated"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-5 gap-2 mb-2">
        {colorPalette.map((color) => (
          <button
            key={color}
            onClick={() => {
              onSelect(color);
              onClose();
            }}
            className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${
              currentColor === color ? "ring-2 ring-offset-2 ring-primary-500" : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function TagRow({
  tag,
  depth = 0,
  onRename,
  onChangeColor,
  onDelete,
}: {
  tag: TagItem;
  depth?: number;
  onRename: (id: string, name: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(tag.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const hasChildren = tag.children.length > 0;

  const handleSave = () => {
    if (editName.trim()) {
      onRename(tag.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Drag handle */}
        <GripVertical className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />

        {/* Expand */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0"
          >
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${
                expanded ? "" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Color dot with picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-4 h-4 rounded-full flex-shrink-0 hover:ring-2 ring-offset-1 ring-[var(--surface-3)] transition-all"
            style={{ backgroundColor: tag.color }}
          />
          <AnimatePresence>
            {showColorPicker && (
              <ColorPicker
                currentColor={tag.color}
                onSelect={(color) => onChangeColor(tag.id, color)}
                onClose={() => setShowColorPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Name */}
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditName(tag.name);
                  setIsEditing(false);
                }
              }}
              className="flex-1 px-2 py-0.5 text-sm bg-[var(--surface-0)] border border-primary-300 rounded-md outline-none text-[var(--text-primary)]"
            />
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-[var(--surface-3)]"
            >
              <Check className="w-3.5 h-3.5 text-green-500" />
            </button>
            <button
              onClick={() => {
                setEditName(tag.name);
                setIsEditing(false);
              }}
              className="p-1 rounded hover:bg-[var(--surface-3)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
          </div>
        ) : (
          <span
            className="flex-1 text-sm text-[var(--text-primary)] cursor-pointer"
            onDoubleClick={() => setIsEditing(true)}
          >
            {tag.name}
          </span>
        )}

        {/* Count */}
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
          {tag.count} cards
        </span>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-md hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Rename"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </button>
          <button
            onClick={() => setShowColorPicker(true)}
            className="p-1.5 rounded-md hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Change color"
          >
            <Palette className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {tag.children.map((child) => (
              <TagRow
                key={child.id}
                tag={child}
                depth={depth + 1}
                onRename={onRename}
                onChangeColor={onChangeColor}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleRename = useCallback((id: string, name: string) => {
    setTags((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, name }
          : {
              ...t,
              children: t.children.map((c) =>
                c.id === id ? { ...c, name } : c
              ),
            }
      )
    );
  }, []);

  const handleChangeColor = useCallback((id: string, color: string) => {
    setTags((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, color }
          : {
              ...t,
              children: t.children.map((c) =>
                c.id === id ? { ...c, color } : c
              ),
            }
      )
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTags((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => ({
          ...t,
          children: t.children.filter((c) => c.id !== id),
        }))
    );
  }, []);

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag: TagItem = {
        id: `tag-${Date.now()}`,
        name: newTagName.trim().toLowerCase(),
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        count: 0,
        children: [],
      };
      setTags((prev) => [...prev, newTag]);
      setNewTagName("");
      setShowNewTagInput(false);
    }
  };

  const filteredTags = searchQuery
    ? tags.filter(
        (t) =>
          t.name.includes(searchQuery.toLowerCase()) ||
          t.children.some((c) => c.name.includes(searchQuery.toLowerCase()))
      )
    : tags;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Tags
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Organize your cards with a hierarchical tag system
          </p>
        </div>
        <button
          onClick={() => setShowNewTagInput(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-0)]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tags..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}>
              <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main tag tree */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--surface-3)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Tag Hierarchy
              </h2>
              <span className="text-xs text-[var(--text-tertiary)]">
                {tags.length} root tags,{" "}
                {tags.reduce((sum, t) => sum + t.children.length, 0)} children
              </span>
            </div>

            {/* New tag input */}
            <AnimatePresence>
              {showNewTagInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-[var(--surface-3)]"
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <FolderPlus className="w-4 h-4 text-primary-500" />
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTag();
                        if (e.key === "Escape") {
                          setNewTagName("");
                          setShowNewTagInput(false);
                        }
                      }}
                      placeholder="Tag name..."
                      className="flex-1 px-2 py-1 text-sm bg-[var(--surface-0)] border border-[var(--surface-3)] rounded-md outline-none focus:border-primary-300 text-[var(--text-primary)]"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1 bg-primary-500 text-white text-xs rounded-md hover:bg-primary-600"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setNewTagName("");
                        setShowNewTagInput(false);
                      }}
                      className="p-1 rounded hover:bg-[var(--surface-2)]"
                    >
                      <X className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tag list */}
            <div className="py-1">
              {filteredTags.map((tag, i) => (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <TagRow
                    tag={tag}
                    onRename={handleRename}
                    onChangeColor={handleChangeColor}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </div>

            {filteredTags.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">
                  No tags found matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tag presets sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--surface-3)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--surface-3)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Tag Presets
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Quick-add common tag types
              </p>
            </div>
            <div className="p-3 space-y-1.5">
              {tagPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    const newTag: TagItem = {
                      id: `tag-${Date.now()}-${preset.name}`,
                      name: preset.name.toLowerCase(),
                      color: preset.color,
                      count: 0,
                      children: [],
                    };
                    setTags((prev) => [...prev, newTag]);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {preset.name}
                  </span>
                  <Plus className="w-3.5 h-3.5 text-[var(--text-tertiary)] ml-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 bg-primary-50 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-900 p-4">
            <h3 className="text-sm font-medium text-primary-700 dark:text-primary-400 mb-2">
              Tips
            </h3>
            <ul className="text-xs text-primary-600 dark:text-primary-500 space-y-1.5">
              <li>Double-click a tag name to rename it</li>
              <li>Click the color dot to change tag color</li>
              <li>Drag tags to reorganize the hierarchy</li>
              <li>
                Use <code className="px-1 py-0.5 rounded bg-primary-100 dark:bg-primary-900">tag::subtag</code>{" "}
                syntax in the browser to filter
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

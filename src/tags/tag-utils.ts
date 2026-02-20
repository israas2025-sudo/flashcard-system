/**
 * Tag Utility Functions
 *
 * Pure utility functions for tag name manipulation, slug generation,
 * hierarchical name construction, and deterministic color generation.
 * These functions are stateless and have no database dependencies.
 */

import type { Tag } from './types';

/** Separator used for hierarchical tag paths (e.g., "language::arabic::grammar") */
const HIERARCHY_SEPARATOR = '::';

/**
 * Convert a tag name to a URL-safe slug.
 *
 * Handles Unicode characters commonly found in multilingual content by
 * transliterating common diacritical marks and normalizing the string.
 *
 * @param name - The human-readable tag name
 * @returns A lowercase, hyphen-separated slug
 *
 * @example
 * slugify("Classical Arabic") // "classical-arabic"
 * slugify("Nahw (Grammar)")   // "nahw-grammar"
 * slugify("  Sarf & Morphology  ") // "sarf-morphology"
 * slugify("日本語") // "日本語" (non-Latin scripts preserved)
 */
export function slugify(name: string): string {
  return name
    // Normalize Unicode to decomposed form (NFD), then strip combining marks
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Convert to lowercase
    .toLowerCase()
    // Trim leading/trailing whitespace
    .trim()
    // Replace any non-alphanumeric, non-Unicode-letter characters with hyphens
    // Preserves characters from non-Latin scripts (Arabic, CJK, etc.)
    .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]+/g, '-')
    // Collapse multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '');
}

/**
 * Build a full hierarchical tag name from a tag and its ancestors.
 *
 * The ancestors array should be ordered from the root tag down to the
 * immediate parent. The result uses "::" as the hierarchy separator.
 *
 * @param tag - The target tag
 * @param ancestors - Ordered array from root ancestor to immediate parent
 * @returns A hierarchical path string
 *
 * @example
 * // Given: root "language", child "classical-arabic", grandchild "grammar", target "nahw"
 * buildHierarchicalName(nahwTag, [languageTag, classicalArabicTag, grammarTag])
 * // Returns: "language::classical-arabic::grammar::nahw"
 */
export function buildHierarchicalName(tag: Tag, ancestors: Tag[]): string {
  const parts = ancestors.map((ancestor) => ancestor.slug);
  parts.push(tag.slug);
  return parts.join(HIERARCHY_SEPARATOR);
}

/**
 * Parse a hierarchical tag path string into its component slugs.
 *
 * @param tagString - A "::" delimited hierarchical tag path
 * @returns An array of individual slug segments
 *
 * @example
 * parseHierarchicalTag("language::classical-arabic::grammar")
 * // Returns: ["language", "classical-arabic", "grammar"]
 *
 * parseHierarchicalTag("vocabulary")
 * // Returns: ["vocabulary"]
 */
export function parseHierarchicalTag(tagString: string): string[] {
  if (!tagString || tagString.trim().length === 0) {
    return [];
  }
  return tagString
    .split(HIERARCHY_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

/**
 * Generate a deterministic hex color from a tag name.
 *
 * Uses a simple hash function to map any string to one of a curated
 * palette of visually distinct, accessible colors. The same input
 * always produces the same color output.
 *
 * @param name - The tag name to generate a color for
 * @returns A hex color string (e.g., "#3B82F6")
 *
 * @example
 * generateTagColor("grammar")     // Always returns the same color
 * generateTagColor("vocabulary")  // Different color from "grammar"
 */
export function generateTagColor(name: string): string {
  // Curated palette of 16 visually distinct, accessible colors.
  // Selected for readability against both light and dark backgrounds.
  const palette: string[] = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#22C55E', // Green
    '#F97316', // Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F59E0B', // Amber
    '#6366F1', // Indigo
    '#10B981', // Emerald
    '#E11D48', // Rose
    '#0EA5E9', // Sky
    '#84CC16', // Lime
    '#D946EF', // Fuchsia
    '#64748B', // Slate
    '#A855F7', // Violet
  ];

  // DJB2 hash: simple, fast, well-distributed for short strings
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    // hash * 33 + charCode
    hash = ((hash << 5) + hash + name.charCodeAt(i)) >>> 0;
  }

  return palette[hash % palette.length];
}

/**
 * Validate that a tag name meets the minimum requirements.
 *
 * @param name - The tag name to validate
 * @returns An object with `valid` boolean and optional `reason` string
 */
export function validateTagName(name: string): { valid: boolean; reason?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, reason: 'Tag name cannot be empty' };
  }

  const trimmed = name.trim();

  if (trimmed.length > 100) {
    return { valid: false, reason: 'Tag name cannot exceed 100 characters' };
  }

  if (trimmed.includes(HIERARCHY_SEPARATOR)) {
    return {
      valid: false,
      reason: `Tag name cannot contain the hierarchy separator "${HIERARCHY_SEPARATOR}"`,
    };
  }

  return { valid: true };
}

/**
 * Sort tags alphabetically by name, case-insensitive.
 *
 * @param tags - Array of tags to sort
 * @returns A new sorted array (original is not mutated)
 */
export function sortTagsByName(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

/**
 * Flatten a tag tree into a single array, preserving depth-first order.
 *
 * @param tree - Array of root TagTreeNodes
 * @returns Flat array of all nodes in depth-first order
 */
export function flattenTagTree(
  tree: Array<Tag & { children?: Array<Tag & { children?: unknown[] }>; depth?: number }>
): Tag[] {
  const result: Tag[] = [];

  function walk(nodes: Array<Tag & { children?: Array<Tag & { children?: unknown[] }> }>): void {
    for (const node of nodes) {
      result.push(node);
      if (node.children && node.children.length > 0) {
        walk(node.children as Array<Tag & { children?: Array<Tag & { children?: unknown[] }> }>);
      }
    }
  }

  walk(tree);
  return result;
}

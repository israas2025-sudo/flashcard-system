/**
 * Language-Specific Card Sorting Algorithms
 *
 * Each language track has a pedagogically optimized sorting strategy that
 * determines the order in which cards are introduced to the learner. These
 * algorithms operate on arrays of GeneratedCard and return new sorted arrays
 * (the originals are not mutated).
 *
 * Sorting strategies:
 *   - Arabic:    Corpus frequency with root clustering
 *   - Egyptian:  Conversational utility bands
 *   - Quran:     Three tracks (frequency, surah order, root families)
 *   - Spanish:   CEFR-gated frequency with verb interleaving
 *   - English:   General (COCA/CEFR) or Academic (AWL sublists)
 */

import type { GeneratedCard } from './types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Stable sort that preserves original order for equal elements.
 * JavaScript's Array.sort is not guaranteed to be stable in all engines,
 * so we wrap it with an index-tracking comparator.
 */
function stableSort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
  const indexed = arr.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const result = compareFn(a.item, b.item);
    return result !== 0 ? result : a.index - b.index;
  });
  return indexed.map((entry) => entry.item);
}

/** Shallow-clone a card with an overridden sortPosition. */
function withSortPosition(card: GeneratedCard, position: number): GeneratedCard {
  return { ...card, sortPosition: position };
}

/** Extract a three-letter Arabic root from a card, falling back to empty string. */
function getRoot(card: GeneratedCard): string {
  return (card as any).root ?? (card as any).morphological_breakdown?.root ?? '';
}

/** Extract a numeric frequency rank from a card. */
function getFrequencyRank(card: GeneratedCard): number {
  return (card as any).frequencyRank ?? card.sortPosition ?? Infinity;
}

/** Extract the part of speech from a card. */
function getPartOfSpeech(card: GeneratedCard): string {
  return (
    (card as any).part_of_speech ??
    (card as any).partOfSpeech ??
    ''
  ).toLowerCase();
}

/** Extract CEFR level from a card, returning a sortable numeric index. */
function cefrToIndex(level: string | undefined): number {
  const map: Record<string, number> = {
    A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
  };
  return map[(level ?? '').toUpperCase()] ?? 3;
}

/** Get CEFR level string from a card. */
function getCefrLevel(card: GeneratedCard): string {
  return (
    (card as any).cefr_level ??
    (card as any).level ??
    ''
  ).toUpperCase();
}

/** Check if a part of speech is a concrete noun. */
function isConcreteNoun(pos: string): boolean {
  return pos === 'noun' || pos === 'اسم';
}

/** Check if a part of speech is a high-utility verb. */
function isHighUtilityVerb(pos: string): boolean {
  return pos === 'verb' || pos === 'فعل';
}

/** Shuffle an array (Fisher-Yates) with a seeded approach for determinism. */
function seededShuffle<T>(arr: T[], seed: number = 42): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Arabic: Corpus frequency with ROOT CLUSTERING
// ---------------------------------------------------------------------------

/**
 * Sort Arabic cards by corpus frequency with root clustering.
 *
 * Strategy:
 *   1. Group cards by their 3-letter root.
 *   2. Within each root group, identify the "anchor" word (lowest frequency rank
 *      = most common word from that root).
 *   3. Place the anchor at its natural corpus frequency position.
 *   4. Space derivative words +15 sort positions apart from each other,
 *      starting after the anchor.
 *   5. Prioritize concrete nouns and high-utility verbs over abstract terms
 *      by giving them a small sort bonus (lower number = earlier).
 *
 * @param cards  Array of GeneratedCard objects for Arabic.
 * @returns      New array sorted with root clustering applied.
 */
export function sortArabicCards(cards: GeneratedCard[]): GeneratedCard[] {
  const DERIVATIVE_SPACING = 15;

  // Group by root
  const rootGroups = new Map<string, GeneratedCard[]>();
  const noRoot: GeneratedCard[] = [];

  for (const card of cards) {
    const root = getRoot(card);
    if (!root) {
      noRoot.push(card);
      continue;
    }
    if (!rootGroups.has(root)) {
      rootGroups.set(root, []);
    }
    rootGroups.get(root)!.push(card);
  }

  // Assign sort positions with root clustering
  const positioned: GeneratedCard[] = [];

  for (const [_root, group] of rootGroups) {
    // Sort group members by frequency rank
    const sorted = stableSort(group, (a, b) => getFrequencyRank(a) - getFrequencyRank(b));

    // Anchor word gets its natural frequency position
    const anchor = sorted[0];
    let anchorPos = getFrequencyRank(anchor);

    // Apply priority bonus for concrete nouns and high-utility verbs
    const anchorPos2 = applyPriorityBonus(anchorPos, getPartOfSpeech(anchor));
    positioned.push(withSortPosition(anchor, anchorPos2));

    // Derivatives are spaced +15 apart after the anchor
    for (let i = 1; i < sorted.length; i++) {
      const derivativePos = anchorPos + i * DERIVATIVE_SPACING;
      const adjustedPos = applyPriorityBonus(derivativePos, getPartOfSpeech(sorted[i]));
      positioned.push(withSortPosition(sorted[i], adjustedPos));
    }
  }

  // Cards without roots: sort by frequency, apply priority bonus
  for (const card of noRoot) {
    const pos = applyPriorityBonus(getFrequencyRank(card), getPartOfSpeech(card));
    positioned.push(withSortPosition(card, pos));
  }

  // Final sort by assigned position
  return stableSort(positioned, (a, b) => a.sortPosition - b.sortPosition);
}

/**
 * Apply a small priority bonus to concrete nouns and high-utility verbs.
 * Moves them slightly earlier in the sort order without disrupting
 * the overall frequency-based progression.
 */
function applyPriorityBonus(position: number, partOfSpeech: string): number {
  const pos = partOfSpeech.toLowerCase();
  if (isConcreteNoun(pos)) return position - 3;
  if (isHighUtilityVerb(pos)) return position - 2;
  // Abstract nouns, adjectives, particles, etc. stay at natural position
  return position;
}

// ---------------------------------------------------------------------------
// Egyptian: Conversational utility bands
// ---------------------------------------------------------------------------

/**
 * Sort Egyptian Arabic cards by conversational utility.
 *
 * Band structure:
 *   - Positions   1-200:  Survival phrases and greetings
 *   - Positions 201-1000: Thematic modules (food, transport, home)
 *   - Positions 1001-3000: Workplace and formal language
 *   - Positions 3001-5000: Specialized slang and advanced expressions
 *
 * Within each band, cards are sub-sorted by CALLHOME corpus frequency
 * (approximated by the card's frequencyRank field).
 *
 * @param cards  Array of GeneratedCard objects for Egyptian Arabic.
 * @returns      New array sorted by conversational utility bands.
 */
export function sortEgyptianCards(cards: GeneratedCard[]): GeneratedCard[] {
  // Define band boundaries and tag patterns
  const bands: {
    name: string;
    start: number;
    end: number;
    patterns: RegExp[];
  }[] = [
    {
      name: 'survival',
      start: 1,
      end: 200,
      patterns: [
        /survival/i, /greeting/i, /basic/i, /essential/i,
        /hello/i, /please/i, /thank/i, /sorry/i, /yes/i, /no\b/i,
        /phrase/i, /expression/i,
      ],
    },
    {
      name: 'thematic',
      start: 201,
      end: 1000,
      patterns: [
        /food/i, /drink/i, /transport/i, /travel/i, /home/i,
        /family/i, /body/i, /health/i, /shopping/i, /market/i,
        /direction/i, /time/i, /weather/i, /clothing/i, /number/i,
      ],
    },
    {
      name: 'workplace',
      start: 1001,
      end: 3000,
      patterns: [
        /work/i, /formal/i, /business/i, /office/i, /meeting/i,
        /professional/i, /academic/i, /semi-formal/i, /education/i,
        /government/i, /legal/i, /media/i,
      ],
    },
    {
      name: 'specialized',
      start: 3001,
      end: 5000,
      patterns: [
        /slang/i, /colloquial/i, /idiom/i, /proverb/i, /humor/i,
        /advanced/i, /specialized/i, /vulgar/i, /literary/i,
      ],
    },
  ];

  /**
   * Determine which band a card belongs to based on its tags,
   * usage_context, and existing sort position.
   */
  function classifyBand(card: GeneratedCard): number {
    const tags = (card.tags || []).join(' ').toLowerCase();
    const usageContext = ((card as any).usage_context ?? '').toLowerCase();
    const combined = `${tags} ${usageContext}`;

    // Check tag/context patterns against each band
    for (let i = 0; i < bands.length; i++) {
      for (const pattern of bands[i].patterns) {
        if (pattern.test(combined)) {
          return i;
        }
      }
    }

    // Fallback: use frequency rank to assign band
    const freq = getFrequencyRank(card);
    if (freq <= 200) return 0;
    if (freq <= 1000) return 1;
    if (freq <= 3000) return 2;
    return 3;
  }

  // Classify each card into a band
  const bandBuckets: GeneratedCard[][] = bands.map(() => []);

  for (const card of cards) {
    const bandIndex = classifyBand(card);
    bandBuckets[bandIndex].push(card);
  }

  // Sub-sort each band by frequency rank (CALLHOME corpus approximation)
  const result: GeneratedCard[] = [];
  let globalPosition = 1;

  for (let b = 0; b < bands.length; b++) {
    const sorted = stableSort(bandBuckets[b], (a, b2) =>
      getFrequencyRank(a) - getFrequencyRank(b2)
    );

    for (const card of sorted) {
      result.push(withSortPosition(card, globalPosition));
      globalPosition++;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Quran: Three tracks (frequency, surah order, root families)
// ---------------------------------------------------------------------------

/** Quran sorting track identifiers. */
export type QuranTrack = 'A' | 'B' | 'C';

/**
 * Sort Quranic Arabic cards according to one of three tracks.
 *
 * Track A - Frequency:
 *   Sort by occurrence frequency in the Quran. The top 100 words cover
 *   approximately 50% of the Quran's text. Pure frequency ordering.
 *
 * Track B - Surah Order (Mushaf):
 *   Sort by first occurrence in the Quran, following the mushaf page order.
 *   Uses the card's example_ayah surah/ayah fields for ordering.
 *
 * Track C - Root Families:
 *   Group cards by their trilateral root, then sort root groups by the
 *   frequency of their most common member. Within each root family,
 *   sort by frequency.
 *
 * @param cards  Array of GeneratedCard objects for Quranic Arabic.
 * @param track  Which sorting track to use: 'A', 'B', or 'C'.
 * @returns      New array sorted according to the chosen track.
 */
export function sortQuranCards(
  cards: GeneratedCard[],
  track: QuranTrack = 'A'
): GeneratedCard[] {
  switch (track) {
    case 'A':
      return sortQuranByFrequency(cards);
    case 'B':
      return sortQuranBySurahOrder(cards);
    case 'C':
      return sortQuranByRootFamilies(cards);
    default:
      throw new Error(`Unknown Quran track: "${track}". Use 'A', 'B', or 'C'.`);
  }
}

/** Track A: Pure frequency sort. */
function sortQuranByFrequency(cards: GeneratedCard[]): GeneratedCard[] {
  const sorted = stableSort(cards, (a, b) => getFrequencyRank(a) - getFrequencyRank(b));
  return sorted.map((card, i) => withSortPosition(card, i + 1));
}

/** Track B: Surah order (mushaf). Sort by first Quranic occurrence. */
function sortQuranBySurahOrder(cards: GeneratedCard[]): GeneratedCard[] {
  function getSurahAyah(card: GeneratedCard): { surah: number; ayah: number } {
    const example = (card as any).example_ayah;
    if (example && typeof example.surah === 'number' && typeof example.ayah === 'number') {
      return { surah: example.surah, ayah: example.ayah };
    }
    // Fallback: place at the end
    return { surah: 999, ayah: 999 };
  }

  const sorted = stableSort(cards, (a, b) => {
    const aRef = getSurahAyah(a);
    const bRef = getSurahAyah(b);
    if (aRef.surah !== bRef.surah) return aRef.surah - bRef.surah;
    return aRef.ayah - bRef.ayah;
  });

  return sorted.map((card, i) => withSortPosition(card, i + 1));
}

/** Track C: Root family clustering. */
function sortQuranByRootFamilies(cards: GeneratedCard[]): GeneratedCard[] {
  // Group by root
  const rootGroups = new Map<string, GeneratedCard[]>();
  const noRoot: GeneratedCard[] = [];

  for (const card of cards) {
    const root = getRoot(card);
    if (!root) {
      noRoot.push(card);
      continue;
    }
    if (!rootGroups.has(root)) {
      rootGroups.set(root, []);
    }
    rootGroups.get(root)!.push(card);
  }

  // Sort each root group internally by frequency
  for (const [root, group] of rootGroups) {
    rootGroups.set(
      root,
      stableSort(group, (a, b) => getFrequencyRank(a) - getFrequencyRank(b))
    );
  }

  // Sort root groups by the frequency of their most common member (anchor)
  const rootEntries = Array.from(rootGroups.entries());
  rootEntries.sort(([, aGroup], [, bGroup]) => {
    const aAnchor = getFrequencyRank(aGroup[0]);
    const bAnchor = getFrequencyRank(bGroup[0]);
    return aAnchor - bAnchor;
  });

  // Flatten and assign positions
  const result: GeneratedCard[] = [];
  let pos = 1;

  for (const [, group] of rootEntries) {
    for (const card of group) {
      result.push(withSortPosition(card, pos));
      pos++;
    }
  }

  // Append rootless cards at the end, sorted by frequency
  const sortedNoRoot = stableSort(noRoot, (a, b) =>
    getFrequencyRank(a) - getFrequencyRank(b)
  );
  for (const card of sortedNoRoot) {
    result.push(withSortPosition(card, pos));
    pos++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Spanish: CEFR-gated frequency with verb interleaving
// ---------------------------------------------------------------------------

/**
 * Sort Spanish cards using CEFR-gated frequency bands with verb interleaving.
 *
 * CEFR Bands:
 *   - Positions    1-500:   A1
 *   - Positions  501-1200:  A2
 *   - Positions 1201-2500:  B1
 *   - Positions 2501-4000:  B2
 *   - Positions 4001-5000:  C1
 *
 * Within each band:
 *   1. Cards are sorted by corpus frequency.
 *   2. Verbs are interleaved at a 1:3 ratio (1 verb every 3 non-verbs).
 *   3. Thematic clusters of 5-8 related words are kept together where possible.
 *
 * @param cards  Array of GeneratedCard objects for Spanish.
 * @returns      New array sorted by CEFR bands with interleaving.
 */
export function sortSpanishCards(cards: GeneratedCard[]): GeneratedCard[] {
  const VERB_RATIO = 3; // Insert 1 verb every 3 non-verbs
  const CLUSTER_SIZE_MIN = 5;
  const CLUSTER_SIZE_MAX = 8;

  // Define CEFR band boundaries
  const cefrBands: { level: string; start: number; end: number }[] = [
    { level: 'A1', start: 1, end: 500 },
    { level: 'A2', start: 501, end: 1200 },
    { level: 'B1', start: 1201, end: 2500 },
    { level: 'B2', start: 2501, end: 4000 },
    { level: 'C1', start: 4001, end: 5000 },
  ];

  // Classify cards into CEFR bands
  function classifyCefrBand(card: GeneratedCard): number {
    const level = getCefrLevel(card);
    const bandIndex = cefrBands.findIndex((b) => b.level === level);
    if (bandIndex >= 0) return bandIndex;

    // Fallback: use frequency rank to determine band
    const freq = getFrequencyRank(card);
    if (freq <= 500) return 0;
    if (freq <= 1200) return 1;
    if (freq <= 2500) return 2;
    if (freq <= 4000) return 3;
    return 4;
  }

  // Split into bands
  const bandBuckets: GeneratedCard[][] = cefrBands.map(() => []);
  for (const card of cards) {
    const bandIdx = classifyCefrBand(card);
    bandBuckets[bandIdx].push(card);
  }

  const result: GeneratedCard[] = [];
  let globalPos = 1;

  for (const bucket of bandBuckets) {
    // Sort by frequency within the band
    const sorted = stableSort(bucket, (a, b) =>
      getFrequencyRank(a) - getFrequencyRank(b)
    );

    // Separate verbs and non-verbs
    const verbs: GeneratedCard[] = [];
    const nonVerbs: GeneratedCard[] = [];

    for (const card of sorted) {
      const pos = getPartOfSpeech(card);
      if (pos === 'verb' || pos === 'verbo') {
        verbs.push(card);
      } else {
        nonVerbs.push(card);
      }
    }

    // Attempt thematic clustering on non-verbs
    const clustered = buildThematicClusters(nonVerbs, CLUSTER_SIZE_MIN, CLUSTER_SIZE_MAX);

    // Interleave verbs at 1:3 ratio
    const interleaved = interleaveVerbs(clustered, verbs, VERB_RATIO);

    for (const card of interleaved) {
      result.push(withSortPosition(card, globalPos));
      globalPos++;
    }
  }

  return result;
}

/**
 * Build thematic clusters from a list of non-verb cards.
 * Groups cards that share common collocation or tag patterns into clusters
 * of the desired size range.
 */
function buildThematicClusters(
  cards: GeneratedCard[],
  minSize: number,
  maxSize: number
): GeneratedCard[] {
  // Build clusters by shared tags
  const tagClusters = new Map<string, GeneratedCard[]>();
  const unclustered: GeneratedCard[] = [];

  for (const card of cards) {
    const tags = card.tags || [];
    const thematicTag = tags.find(
      (t) =>
        !['noun', 'adjective', 'adverb', 'particle', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(t)
    );

    if (thematicTag) {
      if (!tagClusters.has(thematicTag)) {
        tagClusters.set(thematicTag, []);
      }
      tagClusters.get(thematicTag)!.push(card);
    } else {
      unclustered.push(card);
    }
  }

  const result: GeneratedCard[] = [];

  for (const [, cluster] of tagClusters) {
    if (cluster.length >= minSize) {
      // Split oversized clusters into chunks of maxSize
      for (let i = 0; i < cluster.length; i += maxSize) {
        const chunk = cluster.slice(i, i + maxSize);
        result.push(...chunk);
      }
    } else {
      // Too small to form a cluster, add to unclustered
      unclustered.push(...cluster);
    }
  }

  // Append unclustered cards at the end
  result.push(...unclustered);
  return result;
}

/**
 * Interleave verb cards into a non-verb sequence at the given ratio.
 * E.g., ratio=3 means insert 1 verb after every 3 non-verbs.
 */
function interleaveVerbs(
  nonVerbs: GeneratedCard[],
  verbs: GeneratedCard[],
  ratio: number
): GeneratedCard[] {
  const result: GeneratedCard[] = [];
  let verbIdx = 0;
  let nonVerbCount = 0;

  for (const card of nonVerbs) {
    result.push(card);
    nonVerbCount++;

    if (nonVerbCount >= ratio && verbIdx < verbs.length) {
      result.push(verbs[verbIdx]);
      verbIdx++;
      nonVerbCount = 0;
    }
  }

  // Append any remaining verbs at the end
  while (verbIdx < verbs.length) {
    result.push(verbs[verbIdx]);
    verbIdx++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// English: General (COCA/CEFR) or Academic (AWL sublists)
// ---------------------------------------------------------------------------

/** English sorting mode. */
export type EnglishMode = 'general' | 'academic';

/**
 * Sort English cards in one of two modes.
 *
 * General mode:
 *   COCA frequency ordering gated by CEFR levels. Same CEFR-band approach
 *   as Spanish but using COCA corpus frequency ranks.
 *
 * Academic mode:
 *   Academic Word List (AWL) sublists 1-10 ordering. Sublist 1 (the 60 most
 *   common academic word families) is front-loaded. Within each sublist,
 *   words are sorted by frequency.
 *
 * @param cards  Array of GeneratedCard objects for English.
 * @param mode   'general' or 'academic'.
 * @returns      New array sorted according to the chosen mode.
 */
export function sortEnglishCards(
  cards: GeneratedCard[],
  mode: EnglishMode = 'general'
): GeneratedCard[] {
  switch (mode) {
    case 'general':
      return sortEnglishGeneral(cards);
    case 'academic':
      return sortEnglishAcademic(cards);
    default:
      throw new Error(`Unknown English mode: "${mode}". Use 'general' or 'academic'.`);
  }
}

/**
 * General English: COCA frequency gated by CEFR.
 * Same band structure as Spanish CEFR gating.
 */
function sortEnglishGeneral(cards: GeneratedCard[]): GeneratedCard[] {
  // CEFR band boundaries (same as Spanish)
  const cefrBands = [
    { level: 'A1', start: 1, end: 500 },
    { level: 'A2', start: 501, end: 1200 },
    { level: 'B1', start: 1201, end: 2500 },
    { level: 'B2', start: 2501, end: 4000 },
    { level: 'C1', start: 4001, end: 5000 },
  ];

  function classifyBand(card: GeneratedCard): number {
    const level = getCefrLevel(card);
    const idx = cefrBands.findIndex((b) => b.level === level);
    if (idx >= 0) return idx;

    const freq = getFrequencyRank(card);
    if (freq <= 500) return 0;
    if (freq <= 1200) return 1;
    if (freq <= 2500) return 2;
    if (freq <= 4000) return 3;
    return 4;
  }

  const bandBuckets: GeneratedCard[][] = cefrBands.map(() => []);
  for (const card of cards) {
    bandBuckets[classifyBand(card)].push(card);
  }

  const result: GeneratedCard[] = [];
  let pos = 1;

  for (const bucket of bandBuckets) {
    const sorted = stableSort(bucket, (a, b) =>
      getFrequencyRank(a) - getFrequencyRank(b)
    );
    for (const card of sorted) {
      result.push(withSortPosition(card, pos));
      pos++;
    }
  }

  return result;
}

/**
 * Academic English: AWL sublists 1-10.
 *
 * The Academic Word List has 10 sublists, with sublist 1 containing the
 * 60 most frequent academic word families. We front-load sublist 1,
 * then proceed through sublists 2-10. Within each sublist, words are
 * sorted by COCA frequency.
 */
function sortEnglishAcademic(cards: GeneratedCard[]): GeneratedCard[] {
  /** Extract the AWL sublist number from a card's tags or metadata. */
  function getAWLSublist(card: GeneratedCard): number {
    // Check tags for AWL sublist markers
    const tags = card.tags || [];
    for (const tag of tags) {
      const match = tag.match(/awl[_\-\s]?(\d+)/i);
      if (match) return parseInt(match[1], 10);

      const sublistMatch = tag.match(/sublist[_\-\s]?(\d+)/i);
      if (sublistMatch) return parseInt(sublistMatch[1], 10);
    }

    // Check academic_domain metadata
    const domain = (card as any).academic_domain;
    if (domain) {
      const domainMatch = String(domain).match(/sublist[_\-\s]?(\d+)/i);
      if (domainMatch) return parseInt(domainMatch[1], 10);
    }

    // No AWL sublist identified — place after all sublists
    return 99;
  }

  // Group by AWL sublist
  const sublistGroups = new Map<number, GeneratedCard[]>();

  for (const card of cards) {
    const sublist = getAWLSublist(card);
    if (!sublistGroups.has(sublist)) {
      sublistGroups.set(sublist, []);
    }
    sublistGroups.get(sublist)!.push(card);
  }

  // Sort sublists in order (1 first, then 2-10, then unclassified)
  const sublistNumbers = Array.from(sublistGroups.keys()).sort((a, b) => a - b);

  const result: GeneratedCard[] = [];
  let pos = 1;

  for (const sublistNum of sublistNumbers) {
    const group = sublistGroups.get(sublistNum)!;

    // Sort within sublist by frequency
    const sorted = stableSort(group, (a, b) =>
      getFrequencyRank(a) - getFrequencyRank(b)
    );

    for (const card of sorted) {
      result.push(withSortPosition(card, pos));
      pos++;
    }
  }

  return result;
}

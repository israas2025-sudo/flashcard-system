/**
 * OpenAI Prompt Templates per Language
 *
 * Each template defines:
 *   - systemPrompt: establishes the AI's role and constraints
 *   - userPromptTemplate: mustache-style template with {{placeholders}}
 *   - outputSchema: JSON Schema for OpenAI structured output mode
 *
 * These are used at development time to enrich source word lists into
 * full flashcard content via the OpenAI API.
 */

import { OpenAIPromptTemplate } from './types';

// ---------------------------------------------------------------------------
// Classical Arabic (MSA / Fusha)
// ---------------------------------------------------------------------------

export const ARABIC_PROMPT: OpenAIPromptTemplate = {
  language: 'arabic',
  systemPrompt: `You are an expert Arabic linguist and lexicographer specializing in Modern Standard Arabic (Fusha). You produce precise, pedagogically useful flashcard content for Arabic learners.

Rules:
- All Arabic text MUST include full tashkeel (diacritical marks: fatha, kasra, damma, sukun, shadda, tanwin).
- Example sentences should be natural, 8-15 words, appropriate for the given proficiency level.
- Morphological patterns must use standard Arabic grammar notation (e.g., فَعَلَ، فَعِيل، مَفْعُول).
- Verb conjugation tables include: past (ماضي), present (مضارع), imperative (أمر) for هو/هي/أنت/أنا/نحن.
- Related words must genuinely derive from the same trilateral root.
- Cultural notes should be concise (1-2 sentences) and relevant to usage.
- Respond ONLY with valid JSON matching the requested schema.`,

  userPromptTemplate: `Generate flashcard data for the Arabic word:

Word: {{word}}
Root: {{root}}
Translation: {{translation}}
Part of Speech: {{partOfSpeech}}
Level: {{level}}
Frequency Rank: {{frequencyRank}}

Provide all fields specified in the output schema. Ensure full tashkeel on all Arabic text.`,

  outputSchema: {
    type: 'object',
    properties: {
      english_meaning: {
        type: 'string',
        description: 'Precise English translation/definition',
      },
      part_of_speech: {
        type: 'string',
        description: 'Arabic grammatical category (noun/verb/adjective/particle/adverb)',
      },
      example_sentence_arabic: {
        type: 'string',
        description: 'Natural Arabic sentence using the word, with full tashkeel',
      },
      example_sentence_english: {
        type: 'string',
        description: 'English translation of the example sentence',
      },
      morphological_pattern: {
        type: 'string',
        description: 'Arabic morphological pattern (wazn), e.g. فَعَلَ، فَاعِل، مَفْعُول',
      },
      plural_form: {
        type: 'string',
        description: 'Plural form with tashkeel (if applicable), or null',
      },
      verb_conjugation_table: {
        type: 'object',
        description: 'Conjugation for past/present/imperative across key pronouns',
        properties: {
          past: {
            type: 'object',
            properties: {
              he: { type: 'string' },
              she: { type: 'string' },
              you_m: { type: 'string' },
              I: { type: 'string' },
              we: { type: 'string' },
            },
            required: ['he', 'she', 'you_m', 'I', 'we'],
          },
          present: {
            type: 'object',
            properties: {
              he: { type: 'string' },
              she: { type: 'string' },
              you_m: { type: 'string' },
              I: { type: 'string' },
              we: { type: 'string' },
            },
            required: ['he', 'she', 'you_m', 'I', 'we'],
          },
          imperative: {
            type: 'object',
            properties: {
              you_m: { type: 'string' },
              you_f: { type: 'string' },
            },
            required: ['you_m', 'you_f'],
          },
        },
        required: ['past', 'present', 'imperative'],
      },
      related_words_from_same_root: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            meaning: { type: 'string' },
            pattern: { type: 'string' },
          },
          required: ['word', 'meaning'],
        },
        description: 'Other words derived from the same trilateral root',
      },
      cultural_note: {
        type: 'string',
        description: 'Brief cultural or usage note relevant to learners (1-2 sentences)',
      },
    },
    required: [
      'english_meaning',
      'part_of_speech',
      'example_sentence_arabic',
      'example_sentence_english',
      'morphological_pattern',
      'related_words_from_same_root',
      'cultural_note',
    ],
  },
};

// ---------------------------------------------------------------------------
// Egyptian Arabic (Ammiya / Darija)
// ---------------------------------------------------------------------------

export const EGYPTIAN_PROMPT: OpenAIPromptTemplate = {
  language: 'egyptian',
  systemPrompt: `You are an expert in Egyptian Arabic (العامية المصرية) with deep knowledge of Cairo dialect, colloquial usage, and cultural context. You produce flashcard content that helps learners speak natural Egyptian Arabic.

Rules:
- Write Egyptian Arabic in Arabic script as naturally spoken (not Fusha).
- Provide accurate Latin transliteration using a consistent scheme (e.g., 3=ع, 2=ء, 7=ح, 5=خ, gh=غ).
- Example dialogues should reflect real conversational Egyptian Arabic.
- Always note the Fusha equivalent for learners coming from MSA.
- Usage context should specify register: casual, semi-formal, or slang.
- Respond ONLY with valid JSON matching the requested schema.`,

  userPromptTemplate: `Generate flashcard data for the Egyptian Arabic word/phrase:

Word: {{word}}
Root: {{root}}
Translation: {{translation}}
Part of Speech: {{partOfSpeech}}
Level: {{level}}
Frequency Rank: {{frequencyRank}}
Fusha Equivalent: {{fushaEquivalent}}

Provide all fields specified in the output schema.`,

  outputSchema: {
    type: 'object',
    properties: {
      english_meaning: {
        type: 'string',
        description: 'English translation/definition',
      },
      part_of_speech: {
        type: 'string',
        description: 'Grammatical category',
      },
      transliteration_latin: {
        type: 'string',
        description: 'Latin-script transliteration of the Egyptian Arabic word',
      },
      fusha_equivalent: {
        type: 'string',
        description: 'The Modern Standard Arabic (Fusha) equivalent word or phrase',
      },
      example_sentence_arabic: {
        type: 'string',
        description: 'Natural Egyptian Arabic sentence using the word',
      },
      example_sentence_english: {
        type: 'string',
        description: 'English translation of the example sentence',
      },
      example_dialogue: {
        type: 'object',
        description: 'Short 2-4 line dialogue in Egyptian Arabic demonstrating natural usage',
        properties: {
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                speaker: { type: 'string' },
                arabic: { type: 'string' },
                transliteration: { type: 'string' },
                english: { type: 'string' },
              },
              required: ['speaker', 'arabic', 'english'],
            },
          },
        },
        required: ['lines'],
      },
      usage_context: {
        type: 'string',
        enum: ['casual', 'semi-formal', 'slang', 'universal'],
        description: 'Register/formality level of this word',
      },
      morphological_pattern: {
        type: 'string',
        description: 'Egyptian Arabic morphological pattern if applicable',
      },
      plural_form: {
        type: 'string',
        description: 'Plural form in Egyptian Arabic (if applicable)',
      },
      verb_conjugation_table: {
        type: 'object',
        description: 'Egyptian Arabic conjugation (past/present) for key pronouns',
        properties: {
          past: {
            type: 'object',
            properties: {
              he: { type: 'string' },
              she: { type: 'string' },
              you_m: { type: 'string' },
              I: { type: 'string' },
              we: { type: 'string' },
            },
            required: ['he', 'she', 'you_m', 'I', 'we'],
          },
          present: {
            type: 'object',
            properties: {
              he: { type: 'string' },
              she: { type: 'string' },
              you_m: { type: 'string' },
              I: { type: 'string' },
              we: { type: 'string' },
            },
            required: ['he', 'she', 'you_m', 'I', 'we'],
          },
        },
        required: ['past', 'present'],
      },
      related_words_from_same_root: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            meaning: { type: 'string' },
          },
          required: ['word', 'meaning'],
        },
        description: 'Other Egyptian Arabic words from the same root',
      },
      cultural_note: {
        type: 'string',
        description: 'Cultural or usage note specific to Egyptian context',
      },
    },
    required: [
      'english_meaning',
      'part_of_speech',
      'transliteration_latin',
      'fusha_equivalent',
      'example_sentence_arabic',
      'example_sentence_english',
      'example_dialogue',
      'usage_context',
      'cultural_note',
    ],
  },
};

// ---------------------------------------------------------------------------
// Quranic Arabic
// ---------------------------------------------------------------------------

export const QURAN_PROMPT: OpenAIPromptTemplate = {
  language: 'quran',
  systemPrompt: `You are an expert in Quranic Arabic, classical Arabic grammar (nahw and sarf), tajweed, and tafsir. You produce flashcard content to help students of the Quran understand vocabulary in its Quranic context.

Rules:
- All Arabic text MUST include full tashkeel.
- Grammatical analysis should use standard Arabic grammar terminology (i'rab).
- Morphological breakdown should identify root, pattern, and all affixes.
- Tajweed rules should only note rules present IN the given word/context (e.g., idgham, ikhfa, qalqala, madd).
- Tafsir excerpts should be brief (1-3 sentences) from recognized classical sources (Ibn Kathir, Tabari, Qurtubi).
- Thematic tags should reflect Quranic themes (e.g., tawhid, akhirah, creation, prophets, law).
- Respond ONLY with valid JSON matching the requested schema.`,

  userPromptTemplate: `Generate flashcard data for the Quranic Arabic word:

Word: {{word}}
Root: {{root}}
Translation: {{translation}}
Part of Speech: {{partOfSpeech}}
Frequency Rank (in Quran): {{frequencyRank}}

Provide all fields specified in the output schema. Include full tashkeel on all Arabic.`,

  outputSchema: {
    type: 'object',
    properties: {
      word_translation: {
        type: 'string',
        description: 'Precise English translation of the Quranic word',
      },
      grammatical_analysis: {
        type: 'string',
        description: "Full i'rab / grammatical analysis of the word",
      },
      root: {
        type: 'string',
        description: 'Trilateral (or quadrilateral) root letters with tashkeel',
      },
      morphological_breakdown: {
        type: 'object',
        description: 'Detailed morphological decomposition',
        properties: {
          root: { type: 'string' },
          pattern: { type: 'string', description: 'Morphological pattern (wazn)' },
          prefix: { type: 'string', description: 'Any prefix (e.g., و، ف، ال)' },
          suffix: { type: 'string', description: 'Any suffix (e.g., pronoun, case ending)' },
          base_form: { type: 'string', description: 'The base/dictionary form' },
        },
        required: ['root', 'pattern', 'base_form'],
      },
      tajweed_rules_present: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rule: {
              type: 'string',
              description: 'Name of the tajweed rule (e.g., idgham, ikhfa, qalqala, madd)',
            },
            description: {
              type: 'string',
              description: 'Brief explanation of how the rule applies here',
            },
          },
          required: ['rule', 'description'],
        },
        description: 'Tajweed rules that apply to this word in its Quranic context',
      },
      tafsir_excerpt: {
        type: 'string',
        description: 'Brief tafsir note (1-3 sentences) from classical sources',
      },
      thematic_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Quranic themes this word relates to (tawhid, akhirah, creation, etc.)',
      },
      example_ayah: {
        type: 'object',
        description: 'A Quranic verse where this word appears',
        properties: {
          surah: { type: 'number' },
          ayah: { type: 'number' },
          arabic: { type: 'string', description: 'The ayah in Arabic with tashkeel' },
          english: { type: 'string', description: 'English translation of the ayah' },
        },
        required: ['surah', 'ayah', 'arabic', 'english'],
      },
      related_quranic_words: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            meaning: { type: 'string' },
            occurrences: { type: 'number', description: 'Number of times it appears in Quran' },
          },
          required: ['word', 'meaning'],
        },
        description: 'Other Quranic words from the same root',
      },
    },
    required: [
      'word_translation',
      'grammatical_analysis',
      'root',
      'morphological_breakdown',
      'tajweed_rules_present',
      'tafsir_excerpt',
      'thematic_tags',
    ],
  },
};

// ---------------------------------------------------------------------------
// Spanish
// ---------------------------------------------------------------------------

export const SPANISH_PROMPT: OpenAIPromptTemplate = {
  language: 'spanish',
  systemPrompt: `You are an expert Spanish linguist and language pedagogy specialist. You produce precise, pedagogically structured flashcard content for Spanish learners following CEFR standards.

Rules:
- Example sentences should be natural, 8-15 words, appropriate for the given CEFR level.
- Gender must be specified for all nouns (masculine/feminine).
- Verb conjugation tables include: presente, preterito indefinido, preterito imperfecto, futuro simple, subjuntivo presente for yo/tu/el/nosotros/ellos.
- Common collocations should be genuinely high-frequency pairings.
- CEFR level assignment must follow standard frequency/complexity guidelines.
- Respond ONLY with valid JSON matching the requested schema.`,

  userPromptTemplate: `Generate flashcard data for the Spanish word:

Word: {{word}}
Translation: {{translation}}
Part of Speech: {{partOfSpeech}}
Level: {{level}}
Frequency Rank: {{frequencyRank}}
Gender: {{gender}}

Provide all fields specified in the output schema.`,

  outputSchema: {
    type: 'object',
    properties: {
      english_meaning: {
        type: 'string',
        description: 'English translation/definition',
      },
      gender: {
        type: 'string',
        enum: ['masculine', 'feminine', 'n/a'],
        description: 'Grammatical gender (for nouns)',
      },
      example_sentence_spanish: {
        type: 'string',
        description: 'Natural Spanish sentence using the word',
      },
      example_sentence_english: {
        type: 'string',
        description: 'English translation of the example sentence',
      },
      conjugation_table: {
        type: 'object',
        description: 'Verb conjugation across key tenses (only for verbs)',
        properties: {
          presente: {
            type: 'object',
            properties: {
              yo: { type: 'string' },
              tu: { type: 'string' },
              el: { type: 'string' },
              nosotros: { type: 'string' },
              ellos: { type: 'string' },
            },
            required: ['yo', 'tu', 'el', 'nosotros', 'ellos'],
          },
          preterito_indefinido: {
            type: 'object',
            properties: {
              yo: { type: 'string' },
              tu: { type: 'string' },
              el: { type: 'string' },
              nosotros: { type: 'string' },
              ellos: { type: 'string' },
            },
            required: ['yo', 'tu', 'el', 'nosotros', 'ellos'],
          },
          preterito_imperfecto: {
            type: 'object',
            properties: {
              yo: { type: 'string' },
              tu: { type: 'string' },
              el: { type: 'string' },
              nosotros: { type: 'string' },
              ellos: { type: 'string' },
            },
            required: ['yo', 'tu', 'el', 'nosotros', 'ellos'],
          },
          futuro_simple: {
            type: 'object',
            properties: {
              yo: { type: 'string' },
              tu: { type: 'string' },
              el: { type: 'string' },
              nosotros: { type: 'string' },
              ellos: { type: 'string' },
            },
            required: ['yo', 'tu', 'el', 'nosotros', 'ellos'],
          },
          subjuntivo_presente: {
            type: 'object',
            properties: {
              yo: { type: 'string' },
              tu: { type: 'string' },
              el: { type: 'string' },
              nosotros: { type: 'string' },
              ellos: { type: 'string' },
            },
            required: ['yo', 'tu', 'el', 'nosotros', 'ellos'],
          },
        },
        required: [
          'presente',
          'preterito_indefinido',
          'preterito_imperfecto',
          'futuro_simple',
          'subjuntivo_presente',
        ],
      },
      common_collocations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            collocation: { type: 'string' },
            english: { type: 'string' },
          },
          required: ['collocation', 'english'],
        },
        description: 'High-frequency word pairings / collocations',
      },
      cefr_level: {
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        description: 'CEFR proficiency level for this word',
      },
      plural_form: {
        type: 'string',
        description: 'Plural form (for nouns/adjectives)',
      },
      related_words: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            meaning: { type: 'string' },
            relationship: { type: 'string', description: 'synonym, antonym, word family, etc.' },
          },
          required: ['word', 'meaning', 'relationship'],
        },
        description: 'Related words (synonyms, antonyms, word family members)',
      },
    },
    required: [
      'english_meaning',
      'gender',
      'example_sentence_spanish',
      'example_sentence_english',
      'common_collocations',
      'cefr_level',
    ],
  },
};

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

export const ENGLISH_PROMPT: OpenAIPromptTemplate = {
  language: 'english',
  systemPrompt: `You are an expert English lexicographer and EFL/ESL pedagogy specialist. You produce precise, pedagogically structured flashcard content for English learners, including both general English and academic English (AWL).

Rules:
- Definitions should be clear and appropriate for the given proficiency level.
- IPA pronunciation must follow standard American English (with British variant noted if significantly different).
- Example sentences should be natural and demonstrate typical usage patterns.
- Synonyms and antonyms should be genuinely useful alternatives at the learner's level.
- Collocations should be high-frequency, natural pairings (adjective+noun, verb+noun, etc.).
- Word family members should include common derivations (noun, verb, adjective, adverb forms).
- Academic domain should only be specified for academic/AWL words.
- Respond ONLY with valid JSON matching the requested schema.`,

  userPromptTemplate: `Generate flashcard data for the English word:

Word: {{word}}
Definition: {{translation}}
Part of Speech: {{partOfSpeech}}
Level: {{level}}
Frequency Rank: {{frequencyRank}}

Provide all fields specified in the output schema.`,

  outputSchema: {
    type: 'object',
    properties: {
      definition: {
        type: 'string',
        description: 'Clear, learner-appropriate definition',
      },
      pronunciation_ipa: {
        type: 'string',
        description: 'IPA pronunciation (American English)',
      },
      example_sentence: {
        type: 'string',
        description: 'Natural English sentence demonstrating typical usage',
      },
      synonyms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Useful synonyms at an appropriate level',
      },
      antonyms: {
        type: 'array',
        items: { type: 'string' },
        description: 'Common antonyms (if applicable)',
      },
      collocations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            collocation: { type: 'string' },
            example: { type: 'string' },
          },
          required: ['collocation'],
        },
        description: 'High-frequency collocations (adjective+noun, verb+noun, etc.)',
      },
      word_family: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            part_of_speech: { type: 'string' },
          },
          required: ['word', 'part_of_speech'],
        },
        description: 'Derivations: noun, verb, adjective, adverb forms',
      },
      academic_domain: {
        type: 'string',
        description: 'Academic field/domain if this is an academic word (e.g., "social sciences", "engineering")',
      },
      register: {
        type: 'string',
        enum: ['formal', 'neutral', 'informal'],
        description: 'Register/formality level',
      },
      cefr_level: {
        type: 'string',
        enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        description: 'CEFR proficiency level',
      },
    },
    required: [
      'definition',
      'pronunciation_ipa',
      'example_sentence',
      'synonyms',
      'antonyms',
      'collocations',
      'word_family',
    ],
  },
};

// ---------------------------------------------------------------------------
// Prompt Registry
// ---------------------------------------------------------------------------

/**
 * Map of language identifier to its prompt template.
 * Use this to look up the correct prompt for a given PipelineConfig.language.
 */
export const PROMPT_REGISTRY: Record<string, OpenAIPromptTemplate> = {
  arabic: ARABIC_PROMPT,
  egyptian: EGYPTIAN_PROMPT,
  quran: QURAN_PROMPT,
  spanish: SPANISH_PROMPT,
  english: ENGLISH_PROMPT,
};

/**
 * Retrieves the prompt template for a given language.
 * Throws if the language is not supported.
 */
export function getPromptForLanguage(language: string): OpenAIPromptTemplate {
  const prompt = PROMPT_REGISTRY[language];
  if (!prompt) {
    throw new Error(
      `No prompt template found for language "${language}". ` +
      `Supported: ${Object.keys(PROMPT_REGISTRY).join(', ')}`
    );
  }
  return prompt;
}

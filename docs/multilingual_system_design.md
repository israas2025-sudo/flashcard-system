# Multilingual Flashcard System Design & Implementation

## Part 2: User-Friendly Multilingual Flashcard Platform

> A flashcard system purpose-built for language learners, designed to be more intuitive,
> more beautiful, and more effective than Anki. Covering five language tracks:
> **Classical Arabic (Fusha)**, **Egyptian Arabic (Ammiya)**, **Quran**, **Spanish**, and **English**.

**Document Version:** 2.0
**Last Updated:** 2026-02-19
**Status:** Implementation Blueprint

---

## Table of Contents

- [2.1 UX Improvements Over Anki](#21-ux-improvements-over-anki)
- [2.2 Tech Stack](#22-tech-stack)
- [2.3 Language-Specific Card Designs](#23-language-specific-card-designs)
- [2.4 Tagging Architecture](#24-tagging-architecture)
- [2.5 Suspend/Pause and Resume - Redesigned](#25-suspendpause-and-resume---redesigned)
- [2.6 Cross-Language Features](#26-cross-language-features)
- [2.7 Complete Database Schema](#27-complete-database-schema)
- [2.8 Development Roadmap](#28-development-roadmap)
- [2.9 UI/UX Design Philosophy](#29-uiux-design-philosophy)

---

## 2.1 UX Improvements Over Anki

### 2.1.1 The Problem with Anki's UX

Anki is powerful software, but its interface was designed by and for power users. New learners
face a wall of jargon, unintuitive workflows, and a visual design that has not meaningfully
evolved since the mid-2000s. The following analysis documents every friction point and our
corresponding solution.

**Core UX Issues Identified:**

| Issue Category | Anki Pain Point | Impact on Learners |
|---|---|---|
| Terminology | Technical jargon (Note, Field, Card Type, Deck) | Confusion within the first 5 minutes |
| Visual Design | Flat, utilitarian, no visual hierarchy | No emotional engagement, feels like homework |
| Onboarding | No guided setup; user dropped into empty state | 60%+ abandon within first session |
| Feedback | Minimal positive reinforcement | No dopamine loop, no motivation to continue |
| Navigation | Deeply nested menus, modal-heavy | Users cannot find features they need |
| Mobile | Desktop-first design ported to mobile | Cramped controls, tiny tap targets |
| Customization | Requires HTML/CSS knowledge for card styling | Only power users can customize cards |

### 2.1.2 Complete Terminology Overhaul

Every piece of Anki jargon is replaced with plain language that a first-time user would
understand without explanation.

#### Master Terminology Mapping

| Anki Term | Our Term | Rationale |
|---|---|---|
| Note | Entry | "Entry" implies a single piece of knowledge you are recording. It is familiar from dictionaries and journals. |
| Note Type | Entry Template | "Template" communicates that it is a reusable structure. Users understand templates from Google Docs, Canva, etc. |
| Field | Input / Input Field | Standard web form language every user already knows. |
| Card | Card | Retained. "Card" is universally understood from physical flashcards. No change needed. |
| Card Type | Card View | "View" communicates that the same entry can be seen from different angles (front-to-back, listening, cloze). |
| Deck | Deck | Retained. Clear and intuitive. |
| Sub-deck | Folder | Hierarchical nesting is better communicated as folders, matching file system mental models. |
| Suspend | Pause | "Pause" implies temporary and reversible. "Suspend" sounds punitive and permanent. |
| Unsuspend | Resume | Natural counterpart to "Pause." |
| Bury | Skip Until Tomorrow | Completely transparent about what happens. Zero ambiguity. |
| Leech | Struggling Card | Empathetic framing. "Leech" blames the card/user; "Struggling" acknowledges difficulty and invites help. |
| Ease Factor | Difficulty Level | Plain language. Displayed as a 1-5 visual indicator, not a decimal number. |
| Interval | Next Review | Users care about when they will see the card again, not the abstract interval. |
| New Cards | Unseen Cards | "New" is overloaded in software UX. "Unseen" is precise. |
| Learning Cards | In Progress | Familiar status label from project management, downloads, etc. |
| Review Cards | Ready for Review | Action-oriented. Tells the user what to do. |
| Relearning | Needs Practice | Empathetic. Avoids the implication of failure that "relearning" carries. |
| Lapses | Missed Reviews | Descriptive of what actually happened. |
| Again | Didn't Know | Honest, non-judgmental self-assessment. |
| Hard | Tough | Slightly softer; "Hard" can feel like a grade. |
| Good | Got It | Celebratory micro-moment. Affirms the learner. |
| Easy | Too Easy | Implies the system should challenge them more. Empowering. |
| Mature | Mastered | Achievement-oriented language. Feels like a reward. |
| Cloze Deletion | Fill in the Blank | Universal language from school quizzes. Everyone knows it. |
| Filtered Deck | Custom Study Session | Action-oriented. Describes the purpose, not the mechanism. |
| Browser | Card Library | "Library" is warm and organized. "Browser" is technical. |
| Statistics | Progress | Learners care about progress, not statistics. Power users can access detailed stats within Progress. |
| Sync | Save & Sync | Users need reassurance that their work is saved. "Sync" alone feels like a separate action. |
| Add-ons | Plugins | More common in modern software. Though we aim to make most add-on functionality built-in. |
| Scheduler | Study Engine | Sounds sophisticated but approachable. Communicates intelligence. |
| FSRS | Smart Scheduling | Users do not need to know the algorithm name. |
| Flags | Bookmarks | Familiar from web browsers, social media, etc. |

#### Terminology Implementation in Code

All terminology mapping is centralized in a single configuration file so that it can be
updated without touching component code:

```typescript
// src/config/terminology.ts

export const TERMINOLOGY = {
  // Core entities
  note: 'Entry',
  notes: 'Entries',
  noteType: 'Entry Template',
  noteTypes: 'Entry Templates',
  field: 'Input Field',
  fields: 'Input Fields',
  card: 'Card',
  cards: 'Cards',
  cardType: 'Card View',
  cardTypes: 'Card Views',
  deck: 'Deck',
  decks: 'Decks',
  subDeck: 'Folder',
  subDecks: 'Folders',

  // Card states
  suspend: 'Pause',
  suspended: 'Paused',
  unsuspend: 'Resume',
  bury: 'Skip Until Tomorrow',
  buried: 'Skipped',
  leech: 'Struggling Card',
  leeches: 'Struggling Cards',

  // Study states
  newCard: 'Unseen',
  newCards: 'Unseen Cards',
  learning: 'In Progress',
  review: 'Ready for Review',
  relearning: 'Needs Practice',
  mature: 'Mastered',
  lapse: 'Missed Review',
  lapses: 'Missed Reviews',

  // Rating buttons
  again: "Didn't Know",
  hard: 'Tough',
  good: 'Got It',
  easy: 'Too Easy',

  // Features
  closeDeletion: 'Fill in the Blank',
  filteredDeck: 'Custom Study Session',
  browser: 'Card Library',
  statistics: 'Progress',
  sync: 'Save & Sync',
  addons: 'Plugins',
  scheduler: 'Study Engine',
  fsrs: 'Smart Scheduling',
  flag: 'Bookmark',
  flags: 'Bookmarks',
  easeFactor: 'Difficulty Level',
  interval: 'Next Review',
} as const;

export type TerminologyKey = keyof typeof TERMINOLOGY;

/**
 * Helper to get user-facing terminology.
 * Usage: t('noteType') => "Entry Template"
 */
export function t(key: TerminologyKey): string {
  return TERMINOLOGY[key];
}
```

#### Tooltip Explanation System

Every renamed concept includes an optional tooltip that explains what it means, bridging
the gap for users coming from Anki:

```typescript
// src/config/tooltips.ts

export const TOOLTIPS: Record<string, string> = {
  entry:
    'An entry is a single piece of knowledge — like a vocabulary word, grammar rule, ' +
    'or Quran verse. Each entry can generate one or more cards for you to study.',

  entryTemplate:
    'A template defines the structure of your entries. For example, a Vocabulary template ' +
    'might have fields for the word, translation, example sentence, and audio.',

  cardView:
    'A single entry can produce multiple cards. For example, a vocabulary entry might ' +
    'create a "See Arabic → Recall English" card and a "Hear Audio → Recall Arabic" card.',

  paused:
    'Paused cards are temporarily removed from your study sessions. Resume them anytime ' +
    'from your Card Library. Your progress is preserved.',

  skipUntilTomorrow:
    'This card will not appear again today, but will return tomorrow in its normal ' +
    'scheduled position. Useful when you want a break from a specific card.',

  strugglingCard:
    'A card you have answered incorrectly many times. The system will offer you help: ' +
    'a simpler version, a mnemonic, or the option to break it into smaller pieces.',

  difficultyLevel:
    'How challenging this card is for you, on a scale of 1 (easy) to 5 (very hard). ' +
    'The study engine uses this to schedule your reviews optimally.',

  smartScheduling:
    'Our study engine uses a scientifically-proven algorithm (FSRS) to show you each ' +
    'card at the ideal moment — just before you would forget it.',

  customStudySession:
    'A temporary study session with custom filters. Study only cards with specific tags, ' +
    'difficulty levels, or from specific time periods.',
};
```

### 2.1.3 Onboarding Wizard

New users are guided through a multi-step wizard that configures their experience before
they ever see the main interface. The wizard reduces time-to-first-card to under 90 seconds.

#### Wizard Flow (6 Steps)

```
Step 1: Welcome & Language Selection
  ├── "What languages are you learning?"
  ├── Checkboxes: Classical Arabic, Egyptian Arabic, Quran, Spanish, English
  ├── Each language shows a brief description and icon
  └── At least one must be selected to proceed

Step 2: Proficiency Assessment (per selected language)
  ├── "How would you describe your level?"
  ├── Options: Complete Beginner / Some Basics / Intermediate / Advanced
  ├── Visual scale with emoji representations
  └── Sets initial deck difficulty and card mix

Step 3: Study Goals
  ├── "How many minutes per day do you want to study?"
  ├── Slider: 5 / 10 / 15 / 20 / 30 / 45 / 60 minutes
  ├── "How many new cards per day?"
  ├── Recommended range shown based on proficiency
  └── Visual calendar showing projected progress

Step 4: Learning Style
  ├── "How do you learn best?"
  ├── Options (multi-select):
  │   ├── Reading & Writing (text-focused cards)
  │   ├── Listening & Speaking (audio-focused cards)
  │   ├── Visual (image-rich cards, color coding)
  │   └── Mixed (recommended — all card types)
  └── Adjusts which Card Views are enabled by default

Step 5: First Cards (Interactive Demo)
  ├── Pre-loaded sample cards for selected languages
  ├── User studies 3 cards to experience the interface
  ├── Rating buttons explained with tooltips
  ├── "This is what a study session feels like!"
  └── Celebrate completion with confetti animation

Step 6: Setup Complete
  ├── Summary of chosen settings
  ├── "You're all set! Here's your dashboard."
  ├── Quick links: Add your first entry, Browse starter decks, Import from Anki
  └── Option to take a guided tour of the dashboard
```

#### Wizard Component Implementation

```typescript
// src/components/onboarding/OnboardingWizard.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WizardState {
  currentStep: number;
  languages: LanguageSelection[];
  proficiencies: Record<string, ProficiencyLevel>;
  dailyMinutes: number;
  newCardsPerDay: number;
  learningStyle: LearningStyle[];
  hasCompletedDemo: boolean;
}

type LanguageSelection =
  | 'classical_arabic'
  | 'egyptian_arabic'
  | 'quran'
  | 'spanish'
  | 'english';

type ProficiencyLevel = 'beginner' | 'basics' | 'intermediate' | 'advanced';
type LearningStyle = 'reading' | 'listening' | 'visual' | 'mixed';

const WIZARD_STEPS = [
  'language_selection',
  'proficiency',
  'study_goals',
  'learning_style',
  'demo',
  'complete',
] as const;

const LANGUAGE_OPTIONS = [
  {
    id: 'classical_arabic' as const,
    name: 'Classical Arabic (Fusha)',
    nameAr: 'العربية الفصحى',
    icon: '🕌',
    description: 'Modern Standard Arabic used in formal writing, news, and literature.',
    color: '#2D6A4F',
  },
  {
    id: 'egyptian_arabic' as const,
    name: 'Egyptian Arabic (Ammiya)',
    nameAr: 'العامية المصرية',
    icon: '🇪🇬',
    description: 'Spoken Egyptian dialect for everyday conversation.',
    color: '#E07A5F',
  },
  {
    id: 'quran' as const,
    name: 'Quranic Arabic',
    nameAr: 'العربية القرآنية',
    icon: '📖',
    description: 'Classical Quranic vocabulary, grammar, and memorization.',
    color: '#1B4332',
  },
  {
    id: 'spanish' as const,
    name: 'Spanish',
    nameEs: 'Español',
    icon: '🇪🇸',
    description: 'Latin American and Peninsular Spanish vocabulary and grammar.',
    color: '#E63946',
  },
  {
    id: 'english' as const,
    name: 'English',
    icon: '🇺🇸',
    description: 'Academic English, idioms, and advanced vocabulary.',
    color: '#457B9D',
  },
];

export function OnboardingWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    languages: [],
    proficiencies: {},
    dailyMinutes: 15,
    newCardsPerDay: 10,
    learningStyle: ['mixed'],
    hasCompletedDemo: false,
  });

  const currentStepName = WIZARD_STEPS[state.currentStep];

  const goNext = () => {
    setState((prev) => ({ ...prev, currentStep: prev.currentStep + 1 }));
  };

  const goBack = () => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  };

  const toggleLanguage = (lang: LanguageSelection) => {
    setState((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  return (
    <div className="wizard-container">
      {/* Progress bar */}
      <div className="wizard-progress">
        {WIZARD_STEPS.map((step, index) => (
          <div
            key={step}
            className={`wizard-progress-dot ${
              index <= state.currentStep ? 'active' : ''
            } ${index < state.currentStep ? 'completed' : ''}`}
          />
        ))}
      </div>

      {/* Step content with slide animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepName}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="wizard-step"
        >
          {currentStepName === 'language_selection' && (
            <LanguageSelectionStep
              selected={state.languages}
              onToggle={toggleLanguage}
            />
          )}
          {currentStepName === 'proficiency' && (
            <ProficiencyStep
              languages={state.languages}
              proficiencies={state.proficiencies}
              onChange={(lang, level) =>
                setState((prev) => ({
                  ...prev,
                  proficiencies: { ...prev.proficiencies, [lang]: level },
                }))
              }
            />
          )}
          {currentStepName === 'study_goals' && (
            <StudyGoalsStep
              dailyMinutes={state.dailyMinutes}
              newCardsPerDay={state.newCardsPerDay}
              onMinutesChange={(m) =>
                setState((prev) => ({ ...prev, dailyMinutes: m }))
              }
              onCardsChange={(c) =>
                setState((prev) => ({ ...prev, newCardsPerDay: c }))
              }
            />
          )}
          {currentStepName === 'learning_style' && (
            <LearningStyleStep
              selected={state.learningStyle}
              onChange={(styles) =>
                setState((prev) => ({ ...prev, learningStyle: styles }))
              }
            />
          )}
          {currentStepName === 'demo' && (
            <DemoStep
              languages={state.languages}
              onComplete={() =>
                setState((prev) => ({ ...prev, hasCompletedDemo: true }))
              }
            />
          )}
          {currentStepName === 'complete' && (
            <CompletionStep state={state} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="wizard-nav">
        {state.currentStep > 0 && (
          <button className="btn-secondary" onClick={goBack}>
            Back
          </button>
        )}
        {state.currentStep < WIZARD_STEPS.length - 1 && (
          <button
            className="btn-primary"
            onClick={goNext}
            disabled={
              currentStepName === 'language_selection' &&
              state.languages.length === 0
            }
          >
            Continue
          </button>
        )}
        {currentStepName === 'complete' && (
          <button className="btn-primary btn-lg" onClick={handleComplete}>
            Start Learning
          </button>
        )}
      </div>
    </div>
  );
}
```

### 2.1.4 Visual Design Principles

Our visual design is built on five principles that directly address Anki's shortcomings:

#### Principle 1: Calm Clarity

- Generous whitespace (minimum 16px padding on all interactive elements)
- Muted color palette with strategic accent colors per language
- Typography hierarchy that guides the eye naturally
- No visual clutter: every element earns its place on screen

#### Principle 2: Instant Feedback

- Every tap/click produces an immediate visual and optional haptic response
- Card ratings trigger micro-animations (checkmark, progress pulse, streak flame)
- Progress is always visible: session progress bar, daily goal ring, streak counter
- Errors are gentle and instructive, never alarming red alerts

#### Principle 3: Cultural Sensitivity

- Arabic text is always rendered right-to-left with proper font choices
- Quranic text uses Uthmanic script with appropriate reverence in styling
- No culturally inappropriate imagery or gamification for Quranic content
- Color choices respect cultural associations across all five language communities

#### Principle 4: Progressive Disclosure

- Simple interface by default; advanced features revealed as the user grows
- Settings organized in layers: Essential (visible) > Intermediate (one click) > Advanced (dedicated page)
- First-time encounters with features include contextual explanations
- Power-user shortcuts available but never required

#### Principle 5: Accessibility First

- WCAG 2.1 AA compliance minimum, AAA where possible
- Minimum touch target size: 44x44px (Apple HIG standard)
- Color is never the sole indicator of state (always paired with icon or text)
- Screen reader support with proper ARIA labels for all interactive elements
- Keyboard navigation for all study workflows
- Reduced motion mode that disables all animations

### 2.1.5 Suspend/Unsuspend UX Redesign (Pause/Resume)

Anki's Suspend/Unsuspend is one of its most useful but most confusing features. Users
frequently do not know which cards are suspended, cannot easily find suspended cards, and
have no visibility into why a card was suspended.

#### The Anki Problems

1. **Invisible State**: Suspended cards silently disappear. Users forget they exist.
2. **Bulk Operations Only**: Suspend/unsuspend happens in the Browser, not during study.
3. **No Reason Tracking**: No record of why a card was suspended.
4. **No Time-Based Suspend**: Cannot suspend temporarily (e.g., "pause for one week").
5. **No Granularity**: Cannot suspend by tag without manually selecting cards.

#### Our Solution: The Pause/Resume System

**During Study (In-Session Pause):**

When a user is studying and encounters a card they want to pause, a single swipe-up
gesture or "Pause" button presents:

```
┌──────────────────────────────────────┐
│  Pause this card?                     │
│                                       │
│  ○ Skip Until Tomorrow                │
│    (Returns tomorrow at its normal    │
│     scheduled time)                   │
│                                       │
│  ○ Pause for...                       │
│    [3 days] [1 week] [1 month]        │
│                                       │
│  ○ Pause Indefinitely                 │
│    (You can resume it anytime from    │
│     your Card Library)                │
│                                       │
│  ○ Pause All Cards with Tag: #verbs   │
│    (Pauses 23 cards)                  │
│                                       │
│  Optional: Why are you pausing?       │
│  [Too hard] [Not relevant now]        │
│  [Need to look this up] [Other]       │
│                                       │
│  ┌────────┐  ┌─────────────────────┐  │
│  │ Cancel │  │   Pause Card  ▶     │  │
│  └────────┘  └─────────────────────┘  │
└──────────────────────────────────────┘
```

**Pause Dashboard (Card Library > Paused Tab):**

```
┌──────────────────────────────────────────────────┐
│  Paused Cards (47)                                │
│                                                   │
│  ┌─ Resuming Soon ─────────────────────────────┐ │
│  │ 🔵 "كَتَبَ" — resumes in 2 days              │ │
│  │ 🔵 "مَدرَسة" — resumes tomorrow              │ │
│  │ 🔵 3 more cards resuming this week           │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Paused Indefinitely ───────────────────────┐ │
│  │ ⏸ "conjugation: Form VIII" (12 cards)       │ │
│  │   Paused on Jan 15 — Reason: Too hard       │ │
│  │   [Resume All] [Review & Decide]             │ │
│  │                                               │ │
│  │ ⏸ "idioms: weather" (8 cards)               │ │
│  │   Paused on Jan 20 — Reason: Not relevant   │ │
│  │   [Resume All] [Review & Decide]             │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌─ Struggling Cards (Auto-Paused) ────────────┐ │
│  │ ⚠ 5 cards were auto-paused because you      │ │
│  │   missed them 8+ times.                      │ │
│  │   [Review These Cards] [Keep Paused]         │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2.1.6 Tag Management Improvements

Anki's tags are flat strings with a `::` separator for hierarchy. There is no tag manager,
no color coding, no descriptions, and no easy way to study by tag.

#### Our Tag System

- **Hierarchical by Design**: Tags are stored relationally with parent-child relationships
- **Colored**: Each tag can have an assigned color for visual scanning
- **Described**: Tags can have descriptions explaining their purpose
- **Language-Scoped**: Tags can be global or scoped to a specific language track
- **Preset Groups**: Common tag combinations saved as presets (e.g., "All Grammar Tags")
- **Visual Manager**: Drag-and-drop tree view for organizing tags
- **Study Integration**: One-click "Study all cards with this tag" from any tag

#### Tag Manager UI

```
┌─────────────────────────────────────────────────────┐
│  Tag Manager                            [+ New Tag] │
│                                                     │
│  🔍 Search tags...                                  │
│                                                     │
│  📁 Classical Arabic                                │
│  ├── 🟢 grammar                                    │
│  │   ├── 🟢 grammar::verb-forms                    │
│  │   ├── 🟢 grammar::noun-patterns                 │
│  │   ├── 🟢 grammar::particles                     │
│  │   └── 🟢 grammar::syntax                        │
│  ├── 🔵 vocabulary                                  │
│  │   ├── 🔵 vocabulary::frequency-top-500           │
│  │   ├── 🔵 vocabulary::academic                    │
│  │   └── 🔵 vocabulary::media                       │
│  ├── 🟣 topics                                      │
│  │   ├── 🟣 topics::politics                        │
│  │   ├── 🟣 topics::science                         │
│  │   └── 🟣 topics::literature                      │
│  └── 🟠 source                                      │
│      ├── 🟠 source::al-kitaab                       │
│      └── 🟠 source::madinah-series                  │
│                                                     │
│  📁 Quran                                           │
│  ├── 🟢 surah (organized by surah number)           │
│  ├── 🔵 juz (organized by juz number)               │
│  ├── 🟣 theme::patience                             │
│  ├── 🟣 theme::gratitude                             │
│  └── 🟠 grammar::quranic-exclusive                  │
│                                                     │
│  📁 Spanish                                          │
│  ├── 🟢 grammar::tenses                             │
│  ├── 🔵 vocabulary::travel                           │
│  └── 🟠 source::duolingo-supplement                  │
│                                                     │
│  ── Tag Presets ──────────────────────────────       │
│  [All Grammar] [Top 500 Vocab] [This Week's Cards]  │
└─────────────────────────────────────────────────────┘
```

### 2.1.7 Study Modes

Anki has exactly one study mode: see front, recall back, rate yourself. We offer six
distinct modes, each optimized for a different learning goal.

#### Mode 1: Classic Review

The standard spaced repetition flow. See the prompt, recall the answer, rate yourself.
This is the default mode and the backbone of the system.

- **When to use**: Daily reviews, maintaining long-term memory
- **Card types used**: All card views
- **Scheduling**: Full FSRS scheduling applies
- **Available for**: All five language tracks

#### Mode 2: Quiz Mode

Multiple-choice format. The system generates plausible distractors from other cards in
the same deck/tag group. Useful for beginners who need recognition before recall.

- **When to use**: Early learning stages, confidence building, quick sessions
- **Card types used**: Vocabulary recognition, grammar identification
- **Scheduling**: Correct answers count as "Got It"; incorrect as "Didn't Know"
- **Distractor generation**: Same-tag cards preferred, then same-deck, then same-language

```typescript
// src/services/quiz/distractorGenerator.ts

interface QuizQuestion {
  cardId: string;
  prompt: string;        // The question (card front)
  correctAnswer: string; // The right answer (card back)
  distractors: string[]; // 3 wrong answers
  language: LanguageTrack;
}

async function generateDistractors(
  card: Card,
  pool: Card[],
  count: number = 3
): Promise<string[]> {
  // Priority 1: Cards with the same tags
  const sameTagCards = pool.filter(
    (c) =>
      c.id !== card.id &&
      c.tags.some((t) => card.tags.includes(t))
  );

  // Priority 2: Cards in the same deck
  const sameDeckCards = pool.filter(
    (c) => c.id !== card.id && c.deckId === card.deckId
  );

  // Priority 3: Cards in the same language
  const sameLanguageCards = pool.filter(
    (c) => c.id !== card.id && c.language === card.language
  );

  // Select distractors with priority weighting
  const candidates = [
    ...sameTagCards.map((c) => ({ card: c, weight: 3 })),
    ...sameDeckCards.map((c) => ({ card: c, weight: 2 })),
    ...sameLanguageCards.map((c) => ({ card: c, weight: 1 })),
  ];

  // Deduplicate by card ID
  const seen = new Set<string>();
  const unique = candidates.filter((c) => {
    if (seen.has(c.card.id)) return false;
    seen.add(c.card.id);
    return true;
  });

  // Weighted random selection
  const selected = weightedSample(unique, count);
  return selected.map((s) => extractAnswer(s.card));
}
```

#### Mode 3: Listening Mode

Audio-first study. The user hears the word/phrase/verse and must identify or produce
the answer. Critical for Arabic and Quran tracks.

- **When to use**: Pronunciation practice, Quran recitation, listening comprehension
- **Card types used**: Audio-enabled cards only
- **Flow**: Play audio -> User responds (type, speak, or select) -> Show answer + replay
- **Special for Quran**: Plays ayah audio, user must identify surah/ayah or write the next word

#### Mode 4: Writing Mode

The user must type the answer exactly. For Arabic, this includes diacritics (tashkeel).
Fuzzy matching provides partial credit and highlights errors.

- **When to use**: Spelling practice, Arabic script mastery, accent marks in Spanish
- **Card types used**: Any card with a text answer field
- **Matching**: Configurable strictness (ignore diacritics / require diacritics / exact match)
- **Feedback**: Character-level diff highlighting (green for correct, red for errors)

```typescript
// src/services/study/writingMode.ts

interface WritingResult {
  isCorrect: boolean;
  similarity: number;         // 0-1 float
  characterDiff: CharDiff[];  // per-character comparison
  partialCredit: boolean;     // true if similarity > threshold
}

interface CharDiff {
  expected: string;
  actual: string;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
}

function compareArabicText(
  expected: string,
  actual: string,
  options: { requireDiacritics: boolean }
): WritingResult {
  const normalizedExpected = options.requireDiacritics
    ? expected
    : stripDiacritics(expected);
  const normalizedActual = options.requireDiacritics
    ? actual
    : stripDiacritics(actual);

  const diff = computeCharacterDiff(normalizedExpected, normalizedActual);
  const similarity = calculateSimilarity(normalizedExpected, normalizedActual);

  return {
    isCorrect: similarity === 1.0,
    similarity,
    characterDiff: diff,
    partialCredit: similarity >= 0.85,
  };
}

function stripDiacritics(text: string): string {
  // Remove Arabic diacritical marks (tashkeel)
  return text.replace(/[\u0617-\u061A\u064B-\u0652\u0670]/g, '');
}
```

#### Mode 5: Speed Round

Timed rapid-fire review. Cards appear for a set duration (3/5/10 seconds). Designed for
vocabulary reinforcement and building automaticity.

- **When to use**: Warm-up, vocabulary drilling, breaking through intermediate plateau
- **Card types used**: Simple vocabulary cards (word -> translation)
- **Timer**: Configurable per-card time limit with visual countdown
- **Scoring**: Correct answers within time = points; streak multiplier for consecutive correct
- **Gamification**: Leaderboard (optional), personal best tracking

#### Mode 6: Conversation Mode

AI-powered conversational practice using the vocabulary and grammar the user has studied.
The system generates contextual dialogues using mastered and in-progress cards.

- **When to use**: Active production practice, preparing for real conversations
- **Implementation**: LLM-generated dialogues constrained to the user's known vocabulary
- **Available for**: Egyptian Arabic, Spanish, English (conversational languages)
- **Difficulty scaling**: Based on the user's proficiency and mastered card pool

```typescript
// src/services/study/conversationMode.ts

interface ConversationConfig {
  language: 'egyptian_arabic' | 'spanish' | 'english';
  proficiency: ProficiencyLevel;
  vocabularyPool: Card[];     // User's mastered + in-progress cards
  topic?: string;             // Optional topic constraint
  maxTurns: number;           // Conversation length
}

interface ConversationTurn {
  role: 'system' | 'user';
  text: string;
  translation?: string;       // Optional translation hint
  newVocabulary?: string[];   // Words from the user's study pool used here
  audioUrl?: string;          // TTS audio for the system's message
}

async function generateConversationPrompt(
  config: ConversationConfig
): Promise<string> {
  const vocabList = config.vocabularyPool
    .map((c) => c.fields.word || c.fields.front)
    .join(', ');

  return `
    Generate a natural conversation in ${config.language}.
    The user's proficiency is ${config.proficiency}.
    Use ONLY these vocabulary words where possible: ${vocabList}.
    Topic: ${config.topic || 'daily life'}.
    Keep responses short (1-2 sentences).
    After each system message, suggest what the user might say next.
  `;
}
```

### 2.1.8 Rating Button Redesign

Anki's four buttons (Again, Hard, Good, Easy) with interval previews are overwhelming
for new users. Our redesign:

#### Visual Rating Interface

```
Standard Mode (default for new users):
┌──────────────────────────────────────┐
│                                      │
│   ❌ Didn't Know      ✅ Got It      │
│   (See again in       (Next review   │
│    10 minutes)         in 3 days)    │
│                                      │
└──────────────────────────────────────┘

Advanced Mode (opt-in for experienced users):
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ❌ Didn't Know  😤 Tough    ✅ Got It   ⚡ Too Easy │
│  (10 min)        (1 day)     (3 days)    (7 days)    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Didn't Know |
| `2` | Tough (advanced mode only) |
| `3` | Got It |
| `4` | Too Easy (advanced mode only) |
| `Space` | Show Answer / Got It (smart default) |
| `Enter` | Show Answer / Got It (smart default) |
| `P` | Pause this card |
| `S` | Skip Until Tomorrow |
| `A` | Play audio |

---

## 2.2 Tech Stack

### 2.2.1 Architecture Overview

The system follows a modern full-stack TypeScript architecture with clear separation of
concerns. Every technology choice is justified against the specific requirements of a
multilingual flashcard system with RTL support, audio processing, and spaced repetition
scheduling.

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                          │
│  Next.js 14+ (App Router) + React 18 + TypeScript        │
│  Framer Motion | Tailwind CSS | Radix UI Primitives      │
│  Web Speech API | PWA (next-pwa)                         │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS / WebSocket
┌──────────────────────▼───────────────────────────────────┐
│                     API LAYER                             │
│  Node.js 20+ / Fastify 4                                 │
│  tRPC or REST (OpenAPI 3.1) | Zod Validation             │
│  JWT Auth (jose) | Rate Limiting (fastify-rate-limit)    │
└──────────┬────────────────────┬──────────────────────────┘
           │                    │
┌──────────▼──────────┐ ┌──────▼───────────────────────────┐
│    DATA LAYER       │ │     SERVICES LAYER               │
│  PostgreSQL 16      │ │  ts-fsrs (scheduling)            │
│  Drizzle ORM        │ │  Google Cloud TTS                │
│  Redis 7 (cache)    │ │  Web Speech API (recognition)    │
│  S3 / R2 (media)    │ │  Sharp (image processing)        │
└─────────────────────┘ │  FFmpeg (audio processing)       │
                        │  OpenAI / Claude (conversation)  │
                        └──────────────────────────────────┘
```

### 2.2.2 Frontend Stack

#### Next.js 14+ (App Router)

**Why Next.js over alternatives:**

| Requirement | Next.js | Vite + React | Remix | Astro |
|---|---|---|---|---|
| SSR for SEO (shared decks) | Built-in App Router | Manual setup | Built-in | Built-in |
| API Routes | Built-in | Separate server | Built-in | Limited |
| Image Optimization | next/image | Manual | Manual | Built-in |
| PWA Support | next-pwa plugin | vite-pwa | Manual | Manual |
| Edge Runtime (low latency) | Native support | Not available | Limited | Limited |
| React Server Components | Full support | Not available | Limited | Partial |
| TypeScript | First-class | First-class | First-class | First-class |
| Community & Ecosystem | Largest | Large | Growing | Growing |

**Specific Next.js features we leverage:**

- **App Router**: File-based routing with layouts for language-specific navigation
- **Server Components**: Pre-render card templates, deck listings, and static content
- **Server Actions**: Form submissions for card creation without client-side API calls
- **Middleware**: Language detection, RTL/LTR layout switching, auth verification
- **Parallel Routes**: Dashboard with simultaneous loading of stats, due cards, and streaks

#### React 18 + TypeScript

- **Strict Mode**: Catches side effects and deprecation warnings early
- **Suspense Boundaries**: Graceful loading states for each dashboard section
- **useOptimistic**: Instant UI feedback when rating cards (before server confirmation)
- **TypeScript 5.3+**: Strict null checks, discriminated unions for card states

#### Tailwind CSS 3.4+

**Why Tailwind:**
- Utility-first approach allows rapid prototyping of card templates
- Built-in RTL support via `rtl:` modifier
- Dark mode via `dark:` modifier with class strategy
- JIT compiler produces minimal CSS bundles
- Custom theme configuration for our design system

```typescript
// tailwind.config.ts

import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral palette
        surface: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
        // Language accent colors
        fusha: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        ammiya: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        quran: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#052E16',
        },
        spanish: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        english: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Naskh Arabic', 'Amiri', 'serif'],
        quran: ['KFGQPC Uthmanic Script HAFS', 'Amiri Quran', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'arabic-sm': ['1.125rem', { lineHeight: '2' }],
        'arabic-base': ['1.375rem', { lineHeight: '2.25' }],
        'arabic-lg': ['1.75rem', { lineHeight: '2.5' }],
        'arabic-xl': ['2.25rem', { lineHeight: '2.75' }],
        'quran-base': ['1.75rem', { lineHeight: '3' }],
        'quran-lg': ['2.25rem', { lineHeight: '3.5' }],
        'quran-xl': ['3rem', { lineHeight: '4' }],
      },
      animation: {
        'card-flip': 'cardFlip 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
        'streak-fire': 'streakFire 0.6s ease-in-out',
        'progress-fill': 'progressFill 0.8s ease-out',
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
      },
      keyframes: {
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        streakFire: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.dir-rtl': {
          direction: 'rtl',
        },
        '.dir-ltr': {
          direction: 'ltr',
        },
      });
    }),
  ],
};

export default config;
```

#### Additional Frontend Libraries

| Library | Purpose | Why This One |
|---|---|---|
| `framer-motion` | Animations & gestures | Card flip, page transitions, swipe gestures. Best React animation library. |
| `@radix-ui/react-*` | Accessible UI primitives | Unstyled, accessible components (Dialog, Select, Tooltip, etc.). No opinionated styling. |
| `lucide-react` | Icon system | Clean, consistent 24x24 icons. Smaller bundle than Heroicons. Tree-shakeable. |
| `cmdk` | Command palette | Cmd+K search across cards, decks, tags. Inspired by Linear/Raycast. |
| `@tanstack/react-query` | Server state management | Caching, background refetching, optimistic updates for card ratings. |
| `zustand` | Client state management | Lightweight global state for theme, study session, user preferences. |
| `react-hot-toast` | Toast notifications | Lightweight, customizable, accessible notifications. |
| `date-fns` | Date manipulation | Tree-shakeable. Used for "Next review in 3 days" display. |
| `next-themes` | Dark mode | SSR-safe theme switching. Works with Tailwind `class` strategy. |
| `next-pwa` | PWA support | Offline study sessions, install prompt, push notifications. |

### 2.2.3 Backend Stack

#### Fastify 4 (API Server)

**Why Fastify over Express:**

| Feature | Fastify | Express |
|---|---|---|
| Performance | ~78,000 req/s | ~15,000 req/s |
| Schema Validation | Built-in (JSON Schema / Zod) | Requires middleware |
| TypeScript | First-class | Community types |
| Plugin System | Encapsulated, testable | Middleware chain |
| Serialization | Fast JSON stringify | Standard JSON.stringify |
| Logging | Built-in Pino | Requires Morgan/Winston |

```typescript
// src/server/app.ts

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { registerRoutes } from './routes';
import { env } from './config/env';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    ajv: {
      customOptions: {
        removeAdditional: 'all',  // Strip unknown fields
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  });

  // JWT Authentication
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  // Rate Limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.user?.id || request.ip;
    },
  });

  // WebSocket for real-time sync
  await app.register(websocket);

  // Register all API routes
  await registerRoutes(app);

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: env.APP_VERSION,
  }));

  return app;
}
```

#### Drizzle ORM

**Why Drizzle over Prisma / TypeORM / Knex:**

| Feature | Drizzle | Prisma | TypeORM | Knex |
|---|---|---|---|---|
| SQL-like syntax | Yes (feels like writing SQL) | No (custom query language) | Partial | Yes |
| Bundle size | ~45KB | ~2MB+ | ~500KB | ~200KB |
| Edge compatible | Yes | Limited | No | No |
| Migration control | Full SQL migrations | Prisma Migrate | TypeORM migrations | Knex migrations |
| Raw SQL escape hatch | Seamless | `$queryRaw` | `query()` | `.raw()` |
| Type inference | Excellent | Excellent | Good | Fair |
| JSONB support | First-class | Good | Limited | Manual |

```typescript
// src/server/db/connection.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import * as schema from './schema';

// Connection pool configuration
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if connection takes > 5s
  ssl: env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(1);
});

// Initialize Drizzle with schema for relational queries
export const db = drizzle(pool, {
  schema,
  logger: env.NODE_ENV === 'development',
});

// Export pool for raw queries and health checks
export { pool };

// Graceful shutdown
export async function closeDatabase(): Promise<void> {
  await pool.end();
  console.log('Database connections closed.');
}
```

#### Redis 7 (Caching & Sessions)

```typescript
// src/server/cache/redis.ts

import { Redis } from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keyPrefix: 'fc:',  // flashcard namespace prefix
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully.');
});

// Cache helpers
export const cache = {
  /**
   * Get a cached value, or compute and cache it if not present.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>
  ): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    const value = await compute();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  },

  /**
   * Invalidate all cache keys matching a pattern.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(`fc:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Cache user's daily study stats (invalidated on each review).
   */
  async getDailyStats(userId: string): Promise<DailyStats | null> {
    const cached = await redis.get(`daily-stats:${userId}`);
    return cached ? JSON.parse(cached) : null;
  },

  async setDailyStats(userId: string, stats: DailyStats): Promise<void> {
    // Cache until end of day (user's timezone)
    const ttl = getSecondsUntilEndOfDay();
    await redis.setex(`daily-stats:${userId}`, ttl, JSON.stringify(stats));
  },
};
```

#### ts-fsrs (Spaced Repetition Scheduling)

```typescript
// src/server/services/scheduling.ts

import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card as FSRSCard,
  type Grade,
  type RecordLog,
  Rating,
} from 'ts-fsrs';

// Initialize FSRS with optimized parameters
const params = generatorParameters({
  request_retention: 0.90,  // Target 90% recall rate
  maximum_interval: 365,     // Max interval: 1 year
  w: [
    0.4072, 0.6727, 1.7965, 5.1478,  // Initial stability weights
    4.8480, 1.2195, 0.8580, 0.0246,   // Difficulty weights
    1.5600, 0.1130, 0.9901, 2.2155,   // Recall weights
    0.0380, 0.3450, 1.3587, 0.2204,   // Lapse weights
    2.9466,                            // Forgetting curve
  ],
});

const scheduler = fsrs(params);

/**
 * Map our user-facing ratings to FSRS grades.
 */
function mapRatingToGrade(rating: UserRating): Grade {
  const mapping: Record<UserRating, Grade> = {
    didnt_know: Rating.Again,    // "Didn't Know" -> Again
    tough: Rating.Hard,          // "Tough" -> Hard
    got_it: Rating.Good,         // "Got It" -> Good
    too_easy: Rating.Easy,       // "Too Easy" -> Easy
  };
  return mapping[rating];
}

export type UserRating = 'didnt_know' | 'tough' | 'got_it' | 'too_easy';

/**
 * Process a card review and return the updated scheduling data.
 */
export function reviewCard(
  card: FSRSCard,
  rating: UserRating,
  now: Date = new Date()
): RecordLog {
  const grade = mapRatingToGrade(rating);
  const result = scheduler.repeat(card, now);
  return result[grade];
}

/**
 * Create scheduling data for a brand new card.
 */
export function createNewCardSchedule(): FSRSCard {
  return createEmptyCard(new Date());
}

/**
 * Get all possible next states for displaying interval previews.
 */
export function getNextStates(
  card: FSRSCard,
  now: Date = new Date()
): Record<UserRating, { interval: number; due: Date }> {
  const results = scheduler.repeat(card, now);
  return {
    didnt_know: {
      interval: results[Rating.Again].card.scheduled_days,
      due: results[Rating.Again].card.due,
    },
    tough: {
      interval: results[Rating.Hard].card.scheduled_days,
      due: results[Rating.Hard].card.due,
    },
    got_it: {
      interval: results[Rating.Good].card.scheduled_days,
      due: results[Rating.Good].card.due,
    },
    too_easy: {
      interval: results[Rating.Easy].card.scheduled_days,
      due: results[Rating.Easy].card.due,
    },
  };
}
```

#### Audio Services (TTS & Speech Recognition)

```typescript
// src/server/services/audio/tts.ts

import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';

const ttsClient = new TextToSpeechClient({
  keyFilename: env.GOOGLE_CLOUD_CREDENTIALS_PATH,
});

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT, // Supports Cloudflare R2 or AWS S3
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

interface TTSRequest {
  text: string;
  language: LanguageTrack;
  speed?: number;          // 0.5 - 2.0, default 1.0
  voiceGender?: 'MALE' | 'FEMALE';
}

// Voice configuration per language
const VOICE_CONFIG: Record<string, { languageCode: string; voiceName: string }> = {
  classical_arabic: { languageCode: 'ar-XA', voiceName: 'ar-XA-Wavenet-A' },
  egyptian_arabic: { languageCode: 'ar-XA', voiceName: 'ar-XA-Wavenet-C' },
  quran: { languageCode: 'ar-XA', voiceName: 'ar-XA-Wavenet-B' },
  spanish: { languageCode: 'es-ES', voiceName: 'es-ES-Wavenet-B' },
  english: { languageCode: 'en-US', voiceName: 'en-US-Wavenet-D' },
};

export async function generateTTS(request: TTSRequest): Promise<string> {
  const voiceConfig = VOICE_CONFIG[request.language];

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text: request.text },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceConfig.voiceName,
      ssmlGender: request.voiceGender || 'MALE',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: request.speed || 1.0,
      pitch: 0,
      sampleRateHertz: 24000,
    },
  });

  // Upload to S3/R2
  const key = `audio/${request.language}/${generateHash(request.text)}.mp3`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: response.audioContent as Buffer,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000', // Cache for 1 year
    })
  );

  return `${env.CDN_URL}/${key}`;
}
```

### 2.2.4 Package Dependencies

```jsonc
// package.json

{
  "name": "multilingual-flashcards",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "server:dev": "tsx watch src/server/index.ts",
    "server:build": "tsup src/server/index.ts --format cjs",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/server/db/seed.ts",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    // ── Framework ─────────────────────────────
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",

    // ── Backend ───────────────────────────────
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.0",
    "@fastify/jwt": "^8.0.0",
    "@fastify/rate-limit": "^9.0.0",
    "@fastify/websocket": "^10.0.0",
    "@fastify/multipart": "^8.0.0",
    "zod": "^3.23.0",

    // ── Database ──────────────────────────────
    "drizzle-orm": "^0.31.0",
    "pg": "^8.12.0",
    "ioredis": "^5.4.0",

    // ── Spaced Repetition ─────────────────────
    "ts-fsrs": "^4.2.0",

    // ── Authentication ────────────────────────
    "jose": "^5.6.0",
    "bcryptjs": "^2.4.3",
    "@auth/core": "^0.34.0",
    "next-auth": "^5.0.0-beta.20",

    // ── UI Components ─────────────────────────
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.0",

    // ── Styling & Animation ───────────────────
    "framer-motion": "^11.3.0",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "class-variance-authority": "^0.7.0",

    // ── Icons ─────────────────────────────────
    "lucide-react": "^0.400.0",

    // ── State Management ──────────────────────
    "@tanstack/react-query": "^5.51.0",
    "zustand": "^4.5.0",

    // ── Utilities ─────────────────────────────
    "date-fns": "^3.6.0",
    "nanoid": "^5.0.0",
    "sharp": "^0.33.0",
    "cmdk": "^1.0.0",
    "react-hot-toast": "^2.4.0",
    "next-themes": "^0.3.0",

    // ── Audio / Cloud ─────────────────────────
    "@google-cloud/text-to-speech": "^5.4.0",
    "@aws-sdk/client-s3": "^3.614.0",
    "@aws-sdk/s3-request-presigner": "^3.614.0",

    // ── PWA ───────────────────────────────────
    "@ducanh2912/next-pwa": "^5.6.0"
  },
  "devDependencies": {
    // ── TypeScript ─────────────────────────────
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/pg": "^8.11.0",
    "@types/bcryptjs": "^2.4.0",

    // ── Database Tooling ──────────────────────
    "drizzle-kit": "^0.22.0",

    // ── Build ─────────────────────────────────
    "tsx": "^4.16.0",
    "tsup": "^8.1.0",

    // ── Linting ───────────────────────────────
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "@typescript-eslint/parser": "^7.16.0",
    "@typescript-eslint/eslint-plugin": "^7.16.0",
    "eslint-plugin-react-hooks": "^4.6.0",

    // ── Testing ───────────────────────────────
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@playwright/test": "^1.45.0",

    // ── Tailwind Plugins ──────────────────────
    "@tailwindcss/typography": "^0.5.0",
    "@tailwindcss/forms": "^0.5.0",
    "tailwindcss-animate": "^1.0.0",

    // ── Dev Utilities ─────────────────────────
    "pino-pretty": "^11.2.0",
    "dotenv": "^16.4.0"
  }
}
```

### 2.2.5 Environment Configuration

```typescript
// src/server/config/env.ts

import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_VERSION: z.string().default('1.0.0'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Frontend URL
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  NEXTAUTH_SECRET: z.string().min(32),

  // Google Cloud (TTS)
  GOOGLE_CLOUD_CREDENTIALS_PATH: z.string().optional(),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),

  // S3 / Cloudflare R2 (Media Storage)
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().default('flashcard-media'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  CDN_URL: z.string().url().optional(),

  // AI (Conversation Mode)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

### 2.2.6 Project Structure

```
multilingual-flashcards/
├── public/
│   ├── fonts/
│   │   ├── inter/                      # Latin font
│   │   ├── noto-naskh-arabic/          # Arabic font
│   │   ├── amiri-quran/                # Quranic font
│   │   └── jetbrains-mono/             # Monospace font
│   ├── audio/                          # Static audio assets
│   ├── icons/                          # App icons (PWA)
│   └── manifest.json                   # PWA manifest
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                # Main dashboard
│   │   │   ├── layout.tsx              # Dashboard layout with sidebar
│   │   │   ├── study/
│   │   │   │   ├── [deckId]/page.tsx   # Study session
│   │   │   │   └── custom/page.tsx     # Custom study session
│   │   │   ├── library/
│   │   │   │   ├── page.tsx            # Card library (browser)
│   │   │   │   └── [cardId]/page.tsx   # Individual card view
│   │   │   ├── decks/
│   │   │   │   ├── page.tsx            # Deck list
│   │   │   │   ├── [deckId]/page.tsx   # Deck detail
│   │   │   │   └── new/page.tsx        # Create deck
│   │   │   ├── entries/
│   │   │   │   ├── new/page.tsx        # Create entry
│   │   │   │   └── [entryId]/page.tsx  # Edit entry
│   │   │   ├── tags/page.tsx           # Tag manager
│   │   │   ├── progress/page.tsx       # Statistics / Progress
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx            # General settings
│   │   │   │   ├── study/page.tsx      # Study preferences
│   │   │   │   ├── languages/page.tsx  # Language settings
│   │   │   │   └── account/page.tsx    # Account settings
│   │   │   └── onboarding/page.tsx     # Onboarding wizard
│   │   ├── api/                        # Next.js API routes (proxy to Fastify)
│   │   │   └── [...trpc]/route.ts
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Global styles
│   │
│   ├── components/
│   │   ├── ui/                         # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── index.ts
│   │   ├── study/                      # Study session components
│   │   │   ├── StudyCard.tsx
│   │   │   ├── CardFront.tsx
│   │   │   ├── CardBack.tsx
│   │   │   ├── RatingButtons.tsx
│   │   │   ├── SessionProgress.tsx
│   │   │   ├── PauseCardDialog.tsx
│   │   │   ├── SessionComplete.tsx
│   │   │   └── StudyModeSelector.tsx
│   │   ├── cards/                      # Card template components
│   │   │   ├── arabic/
│   │   │   │   ├── VocabularyCard.tsx
│   │   │   │   ├── GrammarCard.tsx
│   │   │   │   └── ListeningCard.tsx
│   │   │   ├── quran/
│   │   │   │   ├── AyahCard.tsx
│   │   │   │   ├── VocabCard.tsx
│   │   │   │   └── RecitationCard.tsx
│   │   │   ├── spanish/
│   │   │   │   ├── VocabularyCard.tsx
│   │   │   │   ├── ConjugationCard.tsx
│   │   │   │   └── ListeningCard.tsx
│   │   │   └── english/
│   │   │       ├── VocabularyCard.tsx
│   │   │       ├── IdiomCard.tsx
│   │   │       └── ListeningCard.tsx
│   │   ├── onboarding/
│   │   │   ├── OnboardingWizard.tsx
│   │   │   ├── LanguageSelectionStep.tsx
│   │   │   ├── ProficiencyStep.tsx
│   │   │   ├── StudyGoalsStep.tsx
│   │   │   ├── LearningStyleStep.tsx
│   │   │   ├── DemoStep.tsx
│   │   │   └── CompletionStep.tsx
│   │   ├── dashboard/
│   │   │   ├── DueCardsSummary.tsx
│   │   │   ├── StreakWidget.tsx
│   │   │   ├── LanguageTabs.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── tags/
│   │   │   ├── TagManager.tsx
│   │   │   ├── TagTree.tsx
│   │   │   ├── TagBadge.tsx
│   │   │   └── TagPresets.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── CommandPalette.tsx
│   │       └── MobileNav.tsx
│   │
│   ├── hooks/                          # Custom React hooks
│   │   ├── useStudySession.ts
│   │   ├── useAudio.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useCardRating.ts
│   │   ├── useDailyStats.ts
│   │   └── useTheme.ts
│   │
│   ├── stores/                         # Zustand stores
│   │   ├── studyStore.ts
│   │   ├── userPreferencesStore.ts
│   │   └── uiStore.ts
│   │
│   ├── lib/                            # Shared utilities
│   │   ├── utils.ts                    # clsx/twMerge helper
│   │   ├── api.ts                      # API client
│   │   ├── arabic.ts                   # Arabic text utilities
│   │   ├── audio.ts                    # Web Speech API wrappers
│   │   └── formatting.ts              # Date, number formatting
│   │
│   ├── config/
│   │   ├── terminology.ts             # Anki -> our terminology mapping
│   │   ├── tooltips.ts                # Explanatory tooltips
│   │   ├── languages.ts               # Language track configuration
│   │   └── constants.ts               # App-wide constants
│   │
│   └── server/                         # Backend (Fastify)
│       ├── index.ts                    # Server entry point
│       ├── app.ts                      # Fastify app builder
│       ├── config/
│       │   └── env.ts                  # Environment validation
│       ├── db/
│       │   ├── connection.ts           # PostgreSQL connection
│       │   ├── schema/                 # Drizzle schema files
│       │   │   ├── users.ts
│       │   │   ├── notes.ts
│       │   │   ├── cards.ts
│       │   │   ├── decks.ts
│       │   │   ├── tags.ts
│       │   │   ├── reviews.ts
│       │   │   ├── media.ts
│       │   │   ├── achievements.ts
│       │   │   └── index.ts
│       │   ├── migrations/             # SQL migration files
│       │   └── seed.ts                 # Seed data
│       ├── routes/
│       │   ├── index.ts                # Route registration
│       │   ├── auth.ts
│       │   ├── cards.ts
│       │   ├── decks.ts
│       │   ├── entries.ts
│       │   ├── study.ts
│       │   ├── tags.ts
│       │   ├── media.ts
│       │   └── progress.ts
│       ├── services/
│       │   ├── scheduling.ts           # ts-fsrs integration
│       │   ├── audio/
│       │   │   ├── tts.ts              # Text-to-speech
│       │   │   └── processing.ts       # Audio file processing
│       │   ├── quiz/
│       │   │   └── distractorGenerator.ts
│       │   └── study/
│       │       ├── writingMode.ts
│       │       └── conversationMode.ts
│       ├── middleware/
│       │   ├── auth.ts                 # JWT verification
│       │   └── rateLimit.ts
│       └── cache/
│           └── redis.ts                # Redis connection & helpers
│
├── drizzle.config.ts                   # Drizzle Kit config
├── tailwind.config.ts                  # Tailwind config
├── tsconfig.json
├── next.config.js
├── vitest.config.ts
├── playwright.config.ts
├── .env.example
├── .env.local
├── .eslintrc.json
├── .prettierrc
└── docker-compose.yml                  # PostgreSQL + Redis for dev
```

### 2.2.7 Docker Compose for Development

```yaml
# docker-compose.yml

version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: flashcard-db
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: flashcards
      POSTGRES_USER: flashcard_user
      POSTGRES_PASSWORD: flashcard_dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/server/db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U flashcard_user -d flashcards']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: flashcard-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

---

## 2.3 Language-Specific Card Designs

Each of the five language tracks has unique pedagogical requirements. This section defines
the complete note type fields, card templates (HTML/CSS), tag hierarchies, and styling
rules for each language.

### 2.3.1 Shared Card Styling Foundation

All card templates inherit from a shared CSS foundation that handles RTL/LTR switching,
dark mode, and base typography.

```css
/* src/styles/card-base.css */

/* ── CSS Custom Properties ─────────────────────────────── */
:root {
  /* Card container */
  --card-max-width: 640px;
  --card-padding: 2rem;
  --card-radius: 16px;
  --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);

  /* Typography */
  --font-latin: 'Inter', system-ui, -apple-system, sans-serif;
  --font-arabic: 'Noto Naskh Arabic', 'Amiri', serif;
  --font-quran: 'KFGQPC Uthmanic Script HAFS', 'Amiri Quran', serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Light mode colors */
  --bg-primary: #FAFAF9;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F5F5F4;
  --text-primary: #1C1917;
  --text-secondary: #57534E;
  --text-tertiary: #A8A29E;
  --border-default: #E7E5E4;
  --border-focus: #3B82F6;

  /* Language accent colors */
  --accent-fusha: #059669;
  --accent-ammiya: #EA580C;
  --accent-quran: #15803D;
  --accent-spanish: #DC2626;
  --accent-english: #2563EB;

  /* Arabic-specific */
  --arabic-line-height: 2.2;
  --arabic-letter-spacing: 0.02em;
  --quran-line-height: 3;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --bg-primary: #0C0A09;
  --bg-card: #1C1917;
  --bg-card-hover: #292524;
  --text-primary: #FAFAF9;
  --text-secondary: #A8A29E;
  --text-tertiary: #78716C;
  --border-default: #44403C;
  --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

/* ── Base Card Layout ──────────────────────────────────── */
.card {
  max-width: var(--card-max-width);
  margin: 0 auto;
  padding: var(--card-padding);
  background: var(--bg-card);
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
  font-family: var(--font-latin);
  color: var(--text-primary);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* ── Direction Handling ────────────────────────────────── */
.card[dir="rtl"] {
  text-align: right;
  font-family: var(--font-arabic);
}

.card[dir="ltr"] {
  text-align: left;
  font-family: var(--font-latin);
}

/* Mixed direction content */
.card .arabic-text {
  direction: rtl;
  text-align: right;
  font-family: var(--font-arabic);
  font-size: 1.375rem;
  line-height: var(--arabic-line-height);
  letter-spacing: var(--arabic-letter-spacing);
}

.card .latin-text {
  direction: ltr;
  text-align: left;
  font-family: var(--font-latin);
}

.card .quran-text {
  direction: rtl;
  text-align: center;
  font-family: var(--font-quran);
  font-size: 1.75rem;
  line-height: var(--quran-line-height);
  color: var(--accent-quran);
}

/* ── Card Sections ─────────────────────────────────────── */
.card-front,
.card-back {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.card-divider {
  width: 100%;
  height: 1px;
  background: var(--border-default);
  margin: 1.5rem 0;
}

.card-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  margin-bottom: 0.5rem;
}

.card-main-text {
  font-size: 1.5rem;
  font-weight: 500;
  line-height: 1.6;
}

.card-secondary-text {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.card-example {
  font-style: italic;
  color: var(--text-secondary);
  border-left: 3px solid var(--border-default);
  padding-left: 1rem;
  margin-top: 0.5rem;
}

.card-example[dir="rtl"] {
  border-left: none;
  border-right: 3px solid var(--border-default);
  padding-left: 0;
  padding-right: 1rem;
}

/* ── Audio Button ──────────────────────────────────────── */
.audio-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-card-hover);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: all 0.15s ease;
}

.audio-btn:hover {
  background: var(--border-default);
  transform: scale(1.05);
}

.audio-btn:active {
  transform: scale(0.95);
}

.audio-btn svg {
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

/* ── Diacritics Toggle ─────────────────────────────────── */
.diacritics-toggle {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
}

.diacritics-hidden .arabic-diacritics {
  color: transparent;
  user-select: none;
}

/* ── Root Highlight ────────────────────────────────────── */
.root-highlight {
  color: var(--accent-fusha);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--accent-fusha);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

/* ── Tags Display ──────────────────────────────────────── */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.card-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background: var(--bg-card-hover);
  color: var(--text-tertiary);
  border: 1px solid var(--border-default);
}
```

### 2.3.2 Classical Arabic (Fusha) Card Designs

#### Note Type: Fusha Vocabulary

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `word` | `text` | Yes | The Arabic word with full diacritics (tashkeel) |
| `word_no_tashkeel` | `text` | Yes | The Arabic word without diacritics |
| `root` | `text` | No | Three/four letter root (e.g., ك-ت-ب) |
| `root_id` | `uuid` | No | FK to shared root table for cross-language linking |
| `pattern` | `text` | No | Morphological pattern / wazn (e.g., فَعَلَ) |
| `part_of_speech` | `enum` | Yes | noun, verb, adjective, adverb, particle, preposition |
| `translation_en` | `text` | Yes | English translation |
| `transliteration` | `text` | No | Romanized pronunciation |
| `plural` | `text` | No | Plural form (if noun/adjective) |
| `plural_type` | `enum` | No | sound_masculine, sound_feminine, broken |
| `verb_form` | `enum` | No | form_I through form_X |
| `example_ar` | `text` | No | Example sentence in Arabic |
| `example_en` | `text` | No | English translation of example |
| `audio_url` | `text` | No | URL to pronunciation audio file |
| `image_url` | `text` | No | Optional image for visual association |
| `notes` | `text` | No | Personal notes or mnemonics |
| `frequency_rank` | `integer` | No | Word frequency ranking |
| `source` | `text` | No | Where this word was encountered |

#### Card View 1: Fusha Vocabulary - Arabic to English

```html
<!-- Card Front: Arabic → English -->
<div class="card" dir="rtl" data-language="fusha">
  <div class="card-front">
    <!-- Language indicator -->
    <div class="language-badge fusha-badge">الفصحى</div>

    <!-- Main word -->
    <div class="arabic-text card-main-text">
      {{word}}
    </div>

    <!-- Root display -->
    {{#root}}
    <div class="root-display">
      <span class="card-label" dir="ltr">ROOT</span>
      <span class="root-letters">{{root}}</span>
    </div>
    {{/root}}

    <!-- Audio button -->
    {{#audio_url}}
    <button class="audio-btn" onclick="playAudio('{{audio_url}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url}}

    <!-- Part of speech badge -->
    <div class="pos-badge">{{part_of_speech}}</div>
  </div>
</div>
```

```html
<!-- Card Back: Arabic → English (answer side) -->
<div class="card" dir="ltr" data-language="fusha">
  <div class="card-back">
    <!-- Repeat the Arabic word at top for reference -->
    <div class="arabic-text" style="font-size: 1.125rem; opacity: 0.7;">
      {{word}}
    </div>

    <div class="card-divider"></div>

    <!-- Translation -->
    <div class="card-main-text latin-text">
      {{translation_en}}
    </div>

    <!-- Transliteration -->
    {{#transliteration}}
    <div class="transliteration">
      /{{transliteration}}/
    </div>
    {{/transliteration}}

    <!-- Pattern -->
    {{#pattern}}
    <div class="pattern-display">
      <span class="card-label">PATTERN</span>
      <span class="arabic-text" style="font-size: 1rem;">{{pattern}}</span>
    </div>
    {{/pattern}}

    <!-- Plural -->
    {{#plural}}
    <div class="plural-display">
      <span class="card-label">PLURAL</span>
      <span class="arabic-text" style="font-size: 1rem;">{{plural}}</span>
      {{#plural_type}}
      <span class="card-tag">{{plural_type}}</span>
      {{/plural_type}}
    </div>
    {{/plural}}

    <!-- Example sentence -->
    {{#example_ar}}
    <div class="card-divider"></div>
    <div class="card-example" dir="rtl">
      <div class="arabic-text" style="font-size: 1rem;">{{example_ar}}</div>
      <div class="latin-text card-secondary-text">{{example_en}}</div>
    </div>
    {{/example_ar}}

    <!-- Image -->
    {{#image_url}}
    <img src="{{image_url}}" class="card-image" alt="{{translation_en}}" />
    {{/image_url}}

    <!-- Notes -->
    {{#notes}}
    <div class="card-notes">
      <span class="card-label">NOTES</span>
      <p>{{notes}}</p>
    </div>
    {{/notes}}
  </div>
</div>
```

#### Card View 2: Fusha Vocabulary - English to Arabic

```html
<!-- Card Front: English → Arabic -->
<div class="card" dir="ltr" data-language="fusha">
  <div class="card-front">
    <div class="language-badge fusha-badge">Fusha</div>
    <div class="card-label">TRANSLATE TO ARABIC</div>
    <div class="card-main-text latin-text">
      {{translation_en}}
    </div>
    <div class="pos-badge">{{part_of_speech}}</div>
    {{#image_url}}
    <img src="{{image_url}}" class="card-image-hint" alt="" />
    {{/image_url}}
  </div>
</div>
```

```html
<!-- Card Back: English → Arabic (answer side) -->
<div class="card" dir="rtl" data-language="fusha">
  <div class="card-back">
    <div class="arabic-text card-main-text">
      {{word}}
    </div>
    {{#audio_url}}
    <button class="audio-btn" onclick="playAudio('{{audio_url}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url}}
    <div class="card-divider"></div>
    <div class="latin-text card-secondary-text" dir="ltr">
      {{translation_en}}
    </div>
    {{#transliteration}}
    <div class="transliteration">/{{transliteration}}/</div>
    {{/transliteration}}
    {{#root}}
    <div class="root-display">
      <span class="card-label">ROOT</span>
      <span class="root-letters">{{root}}</span>
    </div>
    {{/root}}
    {{#example_ar}}
    <div class="card-example" dir="rtl">
      <div class="arabic-text" style="font-size: 1rem;">{{example_ar}}</div>
      <div class="latin-text card-secondary-text" dir="ltr">{{example_en}}</div>
    </div>
    {{/example_ar}}
  </div>
</div>
```

#### Card View 3: Fusha Vocabulary - Listening

```html
<!-- Card Front: Listening (audio only) -->
<div class="card" dir="rtl" data-language="fusha">
  <div class="card-front listening-front">
    <div class="language-badge fusha-badge">الفصحى — Listening</div>
    <div class="card-label">LISTEN AND IDENTIFY</div>

    <button class="audio-btn audio-btn-lg" onclick="playAudio('{{audio_url}}')"
            data-autoplay="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>

    <div class="listening-hint">
      <span class="card-label">HINT</span>
      <span class="pos-badge">{{part_of_speech}}</span>
    </div>
  </div>
</div>
```

#### Note Type: Fusha Grammar

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `grammar_point` | `text` | Yes | Name of the grammar concept |
| `grammar_point_ar` | `text` | Yes | Arabic name of the concept |
| `category` | `enum` | Yes | morphology, syntax, particles, phonology |
| `rule_explanation` | `text` | Yes | Clear explanation of the rule |
| `formula` | `text` | No | Pattern or formula (e.g., "فاعل + مفعول به") |
| `example_1_ar` | `text` | Yes | First example in Arabic |
| `example_1_en` | `text` | Yes | Translation of first example |
| `example_2_ar` | `text` | No | Second example in Arabic |
| `example_2_en` | `text` | No | Translation of second example |
| `common_mistakes` | `text` | No | Common errors learners make |
| `related_rules` | `text[]` | No | Links to related grammar entries |
| `level` | `enum` | Yes | beginner, intermediate, advanced |

#### Fusha Tag Hierarchy

```
fusha/
├── grammar/
│   ├── grammar/morphology/
│   │   ├── grammar/morphology/verb-forms/
│   │   │   ├── grammar/morphology/verb-forms/form-I
│   │   │   ├── grammar/morphology/verb-forms/form-II
│   │   │   ├── grammar/morphology/verb-forms/form-III
│   │   │   ├── grammar/morphology/verb-forms/form-IV
│   │   │   ├── grammar/morphology/verb-forms/form-V
│   │   │   ├── grammar/morphology/verb-forms/form-VI
│   │   │   ├── grammar/morphology/verb-forms/form-VII
│   │   │   ├── grammar/morphology/verb-forms/form-VIII
│   │   │   ├── grammar/morphology/verb-forms/form-IX
│   │   │   └── grammar/morphology/verb-forms/form-X
│   │   ├── grammar/morphology/noun-patterns/
│   │   │   ├── grammar/morphology/noun-patterns/verbal-nouns
│   │   │   ├── grammar/morphology/noun-patterns/active-participle
│   │   │   ├── grammar/morphology/noun-patterns/passive-participle
│   │   │   └── grammar/morphology/noun-patterns/instrument-noun
│   │   └── grammar/morphology/plurals/
│   │       ├── grammar/morphology/plurals/sound-masculine
│   │       ├── grammar/morphology/plurals/sound-feminine
│   │       └── grammar/morphology/plurals/broken
│   ├── grammar/syntax/
│   │   ├── grammar/syntax/nominal-sentence
│   │   ├── grammar/syntax/verbal-sentence
│   │   ├── grammar/syntax/idaafa
│   │   ├── grammar/syntax/adjective-agreement
│   │   └── grammar/syntax/case-endings
│   └── grammar/particles/
│       ├── grammar/particles/prepositions
│       ├── grammar/particles/conjunctions
│       └── grammar/particles/interrogatives
├── vocabulary/
│   ├── vocabulary/frequency-top-100
│   ├── vocabulary/frequency-top-500
│   ├── vocabulary/frequency-top-1000
│   ├── vocabulary/academic
│   ├── vocabulary/media-news
│   └── vocabulary/literature
├── topic/
│   ├── topic/daily-life
│   ├── topic/politics
│   ├── topic/science
│   ├── topic/religion
│   ├── topic/travel
│   └── topic/business
└── source/
    ├── source/al-kitaab
    ├── source/madinah-series
    ├── source/arabicore
    └── source/custom
```

#### Fusha-Specific CSS

```css
/* src/styles/card-fusha.css */

.card[data-language="fusha"] {
  --card-accent: var(--accent-fusha);
}

.card[data-language="fusha"] .card-main-text {
  font-family: var(--font-arabic);
  font-size: 2rem;
  line-height: var(--arabic-line-height);
  letter-spacing: var(--arabic-letter-spacing);
}

.fusha-badge {
  background: color-mix(in srgb, var(--accent-fusha) 10%, transparent);
  color: var(--accent-fusha);
  border: 1px solid color-mix(in srgb, var(--accent-fusha) 30%, transparent);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.root-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.root-letters {
  font-family: var(--font-arabic);
  font-size: 1.25rem;
  color: var(--accent-fusha);
  font-weight: 600;
  letter-spacing: 0.3em;
}

.pattern-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
  margin-top: 0.5rem;
}

.pos-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-card-hover);
  color: var(--text-tertiary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transliteration {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-tertiary);
  margin-top: 0.25rem;
}

.card-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 12px;
  object-fit: cover;
  margin-top: 1rem;
}

.card-image-hint {
  max-width: 120px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
  opacity: 0.6;
  margin-top: 0.5rem;
}

.card-notes {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
```

### 2.3.3 Egyptian Arabic (Ammiya) Card Designs

#### Note Type: Ammiya Vocabulary

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `word_ammiya` | `text` | Yes | Egyptian Arabic word (Arabic script) |
| `word_ammiya_latin` | `text` | No | Romanized Franco-Arabic spelling |
| `fusha_equivalent` | `text` | No | Classical Arabic equivalent word |
| `fusha_entry_id` | `uuid` | No | FK linking to the Fusha entry for cross-reference |
| `translation_en` | `text` | Yes | English translation |
| `pronunciation_guide` | `text` | No | IPA or simplified pronunciation |
| `part_of_speech` | `enum` | Yes | noun, verb, adjective, expression, filler, slang |
| `usage_context` | `enum` | No | formal, informal, slang, vulgar |
| `example_ammiya` | `text` | No | Example sentence in Egyptian Arabic |
| `example_en` | `text` | No | English translation of example |
| `example_franco` | `text` | No | Franco-Arabic transliteration of example |
| `audio_url` | `text` | No | Pronunciation audio |
| `conjugation_table` | `jsonb` | No | Verb conjugation (ana, enta, enti, howa, heya, etc.) |
| `cultural_note` | `text` | No | Cultural context or usage note |
| `register` | `enum` | No | street, educated, media |
| `region` | `text` | No | Cairo, Alexandria, Upper Egypt, etc. |

#### Card View 1: Ammiya - Egyptian to English

```html
<!-- Card Front: Egyptian Arabic → English -->
<div class="card" dir="rtl" data-language="ammiya">
  <div class="card-front">
    <div class="language-badge ammiya-badge">عامية 🇪🇬</div>

    <div class="arabic-text card-main-text ammiya-text">
      {{word_ammiya}}
    </div>

    {{#word_ammiya_latin}}
    <div class="franco-text">
      {{word_ammiya_latin}}
    </div>
    {{/word_ammiya_latin}}

    {{#audio_url}}
    <button class="audio-btn" onclick="playAudio('{{audio_url}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url}}

    <div class="context-badges">
      <span class="pos-badge">{{part_of_speech}}</span>
      {{#usage_context}}
      <span class="context-badge context-{{usage_context}}">{{usage_context}}</span>
      {{/usage_context}}
    </div>
  </div>
</div>
```

```html
<!-- Card Back: Egyptian Arabic → English -->
<div class="card" dir="ltr" data-language="ammiya">
  <div class="card-back">
    <div class="arabic-text" style="font-size: 1rem; opacity: 0.7;" dir="rtl">
      {{word_ammiya}}
    </div>

    <div class="card-divider"></div>

    <div class="card-main-text latin-text">
      {{translation_en}}
    </div>

    {{#pronunciation_guide}}
    <div class="transliteration">/{{pronunciation_guide}}/</div>
    {{/pronunciation_guide}}

    <!-- Fusha bridge: show classical equivalent -->
    {{#fusha_equivalent}}
    <div class="fusha-bridge">
      <span class="card-label">FUSHA EQUIVALENT</span>
      <span class="arabic-text" style="font-size: 1rem;">{{fusha_equivalent}}</span>
    </div>
    {{/fusha_equivalent}}

    <!-- Example with Franco-Arabic option -->
    {{#example_ammiya}}
    <div class="card-divider"></div>
    <div class="card-example" dir="rtl">
      <div class="arabic-text" style="font-size: 1rem;">{{example_ammiya}}</div>
      {{#example_franco}}
      <div class="franco-text" style="font-size: 0.85rem;">{{example_franco}}</div>
      {{/example_franco}}
      <div class="latin-text card-secondary-text" dir="ltr">{{example_en}}</div>
    </div>
    {{/example_ammiya}}

    <!-- Cultural note -->
    {{#cultural_note}}
    <div class="cultural-note">
      <span class="card-label">CULTURAL NOTE</span>
      <p>{{cultural_note}}</p>
    </div>
    {{/cultural_note}}
  </div>
</div>
```

#### Ammiya-Specific CSS

```css
/* src/styles/card-ammiya.css */

.card[data-language="ammiya"] {
  --card-accent: var(--accent-ammiya);
}

.ammiya-badge {
  background: color-mix(in srgb, var(--accent-ammiya) 10%, transparent);
  color: var(--accent-ammiya);
  border: 1px solid color-mix(in srgb, var(--accent-ammiya) 30%, transparent);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.ammiya-text {
  font-family: var(--font-arabic);
  /* Slightly less formal styling than Fusha */
}

.franco-text {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--accent-ammiya);
  opacity: 0.8;
  margin-top: 0.25rem;
}

.fusha-bridge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--accent-fusha) 5%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent-fusha) 30%, transparent);
  border-radius: 8px;
  margin-top: 0.75rem;
}

.context-badges {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.context-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
}

.context-informal {
  background: #FEF3C7;
  color: #92400E;
}

.context-slang {
  background: #FCE7F3;
  color: #9D174D;
}

.context-formal {
  background: #DBEAFE;
  color: #1E40AF;
}

.cultural-note {
  margin-top: 1rem;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--accent-ammiya) 5%, transparent);
  border-radius: 8px;
  border-left: 3px solid var(--accent-ammiya);
  font-size: 0.9rem;
}

.cultural-note[dir="rtl"] {
  border-left: none;
  border-right: 3px solid var(--accent-ammiya);
}
```

#### Ammiya Tag Hierarchy

```
ammiya/
├── grammar/
│   ├── grammar/verb-conjugation/
│   │   ├── grammar/verb-conjugation/present
│   │   ├── grammar/verb-conjugation/past
│   │   ├── grammar/verb-conjugation/future
│   │   └── grammar/verb-conjugation/imperative
│   ├── grammar/negation/
│   ├── grammar/questions/
│   └── grammar/particles/
├── vocabulary/
│   ├── vocabulary/daily-essentials
│   ├── vocabulary/food-drink
│   ├── vocabulary/transportation
│   ├── vocabulary/emotions
│   ├── vocabulary/slang
│   └── vocabulary/expressions
├── context/
│   ├── context/greetings
│   ├── context/shopping
│   ├── context/restaurant
│   ├── context/taxi
│   └── context/phone-calls
├── register/
│   ├── register/street
│   ├── register/educated
│   └── register/media
└── source/
    ├── source/kallimni-arabi
    ├── source/movies-tv
    └── source/custom
```

### 2.3.4 Quranic Arabic Card Designs

The Quranic track requires special reverence and scholarly precision. Card styling is
intentionally more formal and centered. Gamification elements are toned down for this track.

#### Note Type: Quran Vocabulary

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `word` | `text` | Yes | Quranic word with full tashkeel |
| `root` | `text` | Yes | Root letters |
| `root_id` | `uuid` | No | FK to shared root table |
| `translation_en` | `text` | Yes | English meaning |
| `morphology` | `text` | No | Detailed morphological analysis |
| `occurrences` | `integer` | No | Number of times it appears in the Quran |
| `first_occurrence` | `text` | No | Surah:Ayah of first occurrence |
| `example_ayah` | `text` | No | An ayah containing this word |
| `example_surah` | `text` | No | Surah name for the example |
| `example_ayah_num` | `text` | No | Ayah reference (e.g., "2:255") |
| `example_translation` | `text` | No | Translation of the example ayah |
| `related_words` | `text[]` | No | Words from the same root in the Quran |
| `audio_url` | `text` | No | Pronunciation audio |
| `frequency_rank` | `integer` | No | Frequency rank in Quranic text |
| `part_of_speech` | `enum` | Yes | noun, verb, particle, pronoun, proper_noun |

#### Note Type: Quran Ayah (Memorization)

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `ayah_text` | `text` | Yes | Full ayah text in Uthmanic script |
| `ayah_text_simple` | `text` | Yes | Simplified script (for searching) |
| `surah_name_ar` | `text` | Yes | Surah name in Arabic |
| `surah_name_en` | `text` | Yes | Surah name in English |
| `surah_number` | `integer` | Yes | Surah number (1-114) |
| `ayah_number` | `integer` | Yes | Ayah number within the surah |
| `juz_number` | `integer` | Yes | Juz number (1-30) |
| `hizb_number` | `integer` | No | Hizb number (1-60) |
| `page_number` | `integer` | No | Mushaf page number |
| `translation_en` | `text` | Yes | English translation |
| `tafsir_brief` | `text` | No | Brief explanation/tafsir |
| `audio_url` | `text` | No | Recitation audio (e.g., Mishary Rashid) |
| `audio_url_slow` | `text` | No | Slow recitation for learning |
| `prev_ayah_text` | `text` | No | Previous ayah (for context) |
| `next_ayah_text` | `text` | No | Next ayah (for context) |
| `word_by_word` | `jsonb` | No | Word-by-word breakdown with translation |
| `themes` | `text[]` | No | Thematic tags (patience, gratitude, etc.) |

#### Card View: Quran Ayah - First Words Recall

```html
<!-- Card Front: Given first words, recall the rest of the ayah -->
<div class="card" dir="rtl" data-language="quran">
  <div class="card-front quran-front">
    <div class="language-badge quran-badge">القرآن الكريم</div>

    <div class="surah-reference">
      <span class="surah-name">{{surah_name_ar}}</span>
      <span class="ayah-ref">({{surah_number}}:{{ayah_number}})</span>
    </div>

    <!-- Show first few words, hide the rest -->
    <div class="quran-text ayah-prompt">
      {{ayah_first_words}} <span class="quran-blank">...</span>
    </div>

    {{#audio_url_slow}}
    <button class="audio-btn quran-audio-btn"
            onclick="playAudio('{{audio_url_slow}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url_slow}}

    <!-- Context: previous ayah in smaller text -->
    {{#prev_ayah_text}}
    <div class="context-ayah">
      <span class="card-label">PREVIOUS AYAH</span>
      <div class="quran-text" style="font-size: 1rem; opacity: 0.5;">
        {{prev_ayah_text}}
      </div>
    </div>
    {{/prev_ayah_text}}
  </div>
</div>
```

```html
<!-- Card Back: Full ayah revealed -->
<div class="card" dir="rtl" data-language="quran">
  <div class="card-back quran-back">
    <div class="surah-header">
      <span class="surah-name">{{surah_name_ar}}</span>
      <span class="surah-name-en" dir="ltr">{{surah_name_en}}</span>
      <span class="ayah-ref">{{surah_number}}:{{ayah_number}}</span>
    </div>

    <!-- Full ayah with decorative borders -->
    <div class="quran-ayah-container">
      <div class="quran-border-top"></div>
      <div class="quran-text ayah-full">
        {{ayah_text}}
        <span class="ayah-end-marker">﴿{{ayah_number}}﴾</span>
      </div>
      <div class="quran-border-bottom"></div>
    </div>

    {{#audio_url}}
    <button class="audio-btn quran-audio-btn"
            onclick="playAudio('{{audio_url}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url}}

    <div class="card-divider"></div>

    <!-- Translation -->
    <div class="translation-section" dir="ltr">
      <span class="card-label">TRANSLATION</span>
      <p class="card-secondary-text">{{translation_en}}</p>
    </div>

    <!-- Word-by-word breakdown -->
    {{#word_by_word}}
    <div class="word-by-word-section">
      <span class="card-label">WORD BY WORD</span>
      <div class="word-grid">
        <!-- Populated dynamically from JSONB data -->
      </div>
    </div>
    {{/word_by_word}}

    <!-- Tafsir -->
    {{#tafsir_brief}}
    <div class="tafsir-section">
      <span class="card-label">BRIEF TAFSIR</span>
      <p class="card-secondary-text">{{tafsir_brief}}</p>
    </div>
    {{/tafsir_brief}}

    <!-- Juz / Hizb / Page info -->
    <div class="quran-metadata">
      <span class="meta-item">Juz {{juz_number}}</span>
      {{#hizb_number}}<span class="meta-item">Hizb {{hizb_number}}</span>{{/hizb_number}}
      {{#page_number}}<span class="meta-item">Page {{page_number}}</span>{{/page_number}}
    </div>
  </div>
</div>
```

#### Quran-Specific CSS

```css
/* src/styles/card-quran.css */

.card[data-language="quran"] {
  --card-accent: var(--accent-quran);
  border: 1px solid color-mix(in srgb, var(--accent-quran) 15%, transparent);
}

.quran-badge {
  background: color-mix(in srgb, var(--accent-quran) 10%, transparent);
  color: var(--accent-quran);
  border: 1px solid color-mix(in srgb, var(--accent-quran) 30%, transparent);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: var(--font-arabic);
}

.quran-front, .quran-back {
  text-align: center;
}

.quran-text {
  font-family: var(--font-quran);
  font-size: 1.75rem;
  line-height: var(--quran-line-height);
  color: var(--text-primary);
  text-align: center;
}

.ayah-full {
  font-size: 2rem;
  padding: 1.5rem 0;
}

.ayah-prompt {
  font-size: 1.75rem;
}

.quran-blank {
  color: var(--accent-quran);
  font-weight: 700;
  font-size: 1.5em;
  letter-spacing: 0.1em;
}

.ayah-end-marker {
  font-family: var(--font-quran);
  color: var(--accent-quran);
  font-size: 0.9em;
  margin-right: 0.25em;
}

.surah-reference {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.surah-name {
  font-family: var(--font-arabic);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--accent-quran);
}

.surah-name-en {
  font-family: var(--font-latin);
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.ayah-ref {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

/* Decorative borders for Quran ayah display */
.quran-ayah-container {
  padding: 1rem;
  margin: 1rem 0;
  position: relative;
}

.quran-border-top,
.quran-border-bottom {
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    var(--accent-quran),
    transparent
  );
  opacity: 0.3;
}

.quran-audio-btn {
  border-color: color-mix(in srgb, var(--accent-quran) 30%, transparent);
}

.quran-audio-btn:hover {
  background: color-mix(in srgb, var(--accent-quran) 10%, transparent);
}

.word-by-word-section {
  margin-top: 1rem;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  direction: rtl;
}

.word-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
}

.word-item .arabic {
  font-family: var(--font-quran);
  font-size: 1.125rem;
  color: var(--text-primary);
}

.word-item .english {
  font-family: var(--font-latin);
  font-size: 0.7rem;
  color: var(--text-tertiary);
  margin-top: 0.25rem;
}

.quran-metadata {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.meta-item {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

.context-ayah {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
  opacity: 0.7;
}

.tafsir-section {
  margin-top: 1rem;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--accent-quran) 3%, transparent);
  border-radius: 8px;
  border-right: 3px solid var(--accent-quran);
}
```

#### Quran Tag Hierarchy

```
quran/
├── surah/
│   ├── surah/001-al-fatiha
│   ├── surah/002-al-baqarah
│   ├── surah/003-ali-imran
│   │   ... (all 114 surahs)
│   └── surah/114-an-nas
├── juz/
│   ├── juz/01
│   ├── juz/02
│   │   ... (all 30 juz)
│   └── juz/30
├── theme/
│   ├── theme/tawheed
│   ├── theme/patience-sabr
│   ├── theme/gratitude-shukr
│   ├── theme/tawbah-repentance
│   ├── theme/paradise-jannah
│   ├── theme/prophets-stories
│   ├── theme/day-of-judgment
│   └── theme/prayer-salah
├── grammar/
│   ├── grammar/quranic-vocabulary
│   ├── grammar/unique-forms
│   └── grammar/rhetorical-devices
├── memorization/
│   ├── memorization/last-10-surahs
│   ├── memorization/frequently-recited
│   └── memorization/in-progress
└── level/
    ├── level/beginner-words
    ├── level/intermediate-words
    └── level/advanced-words
```

### 2.3.5 Spanish Card Designs

#### Note Type: Spanish Vocabulary

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `word_es` | `text` | Yes | Spanish word |
| `gender` | `enum` | No | masculine, feminine, neuter (for nouns) |
| `part_of_speech` | `enum` | Yes | noun, verb, adjective, adverb, preposition, conjunction |
| `translation_en` | `text` | Yes | English translation |
| `plural` | `text` | No | Plural form |
| `example_es` | `text` | No | Example sentence in Spanish |
| `example_en` | `text` | No | English translation of example |
| `audio_url` | `text` | No | Pronunciation audio |
| `image_url` | `text` | No | Visual association image |
| `conjugation_table` | `jsonb` | No | Verb conjugation across tenses |
| `irregular` | `boolean` | No | Whether the word has irregular forms |
| `region` | `enum` | No | spain, latin_america, universal |
| `frequency_rank` | `integer` | No | Word frequency ranking |
| `notes` | `text` | No | Personal notes or mnemonics |
| `synonyms` | `text[]` | No | Synonym list |
| `false_friends` | `text` | No | Similar English word with different meaning |

#### Card View: Spanish Vocabulary - Bidirectional

```html
<!-- Card Front: Spanish → English -->
<div class="card" dir="ltr" data-language="spanish">
  <div class="card-front">
    <div class="language-badge spanish-badge">Español 🇪🇸</div>

    <div class="card-main-text spanish-text">
      {{word_es}}
    </div>

    {{#gender}}
    <span class="gender-badge gender-{{gender}}">{{gender}}</span>
    {{/gender}}

    <span class="pos-badge">{{part_of_speech}}</span>

    {{#audio_url}}
    <button class="audio-btn" onclick="playAudio('{{audio_url}}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
    {{/audio_url}}
  </div>
</div>
```

```html
<!-- Card Back: Spanish → English -->
<div class="card" dir="ltr" data-language="spanish">
  <div class="card-back">
    <div class="spanish-text" style="font-size: 1rem; opacity: 0.7;">
      {{word_es}}
    </div>

    <div class="card-divider"></div>

    <div class="card-main-text">
      {{translation_en}}
    </div>

    {{#plural}}
    <div class="form-display">
      <span class="card-label">PLURAL</span>
      <span>{{plural}}</span>
    </div>
    {{/plural}}

    {{#false_friends}}
    <div class="false-friend-warning">
      <span class="card-label">FALSE FRIEND</span>
      <p>{{false_friends}}</p>
    </div>
    {{/false_friends}}

    {{#example_es}}
    <div class="card-divider"></div>
    <div class="card-example">
      <div class="spanish-text" style="font-size: 1rem;">{{example_es}}</div>
      <div class="card-secondary-text">{{example_en}}</div>
    </div>
    {{/example_es}}

    {{#image_url}}
    <img src="{{image_url}}" class="card-image" alt="{{translation_en}}" />
    {{/image_url}}
  </div>
</div>
```

#### Note Type: Spanish Conjugation

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `infinitive` | `text` | Yes | Verb infinitive (e.g., "hablar") |
| `translation_en` | `text` | Yes | English translation of verb |
| `verb_type` | `enum` | Yes | ar, er, ir |
| `irregular` | `boolean` | Yes | Is this verb irregular |
| `tense` | `enum` | Yes | present, preterite, imperfect, future, conditional, subjunctive_present, subjunctive_imperfect, imperative |
| `yo` | `text` | Yes | First person singular |
| `tu` | `text` | Yes | Second person singular |
| `el_ella` | `text` | Yes | Third person singular |
| `nosotros` | `text` | Yes | First person plural |
| `vosotros` | `text` | No | Second person plural (Spain) |
| `ellos_ellas` | `text` | Yes | Third person plural |
| `example_es` | `text` | No | Example sentence |
| `example_en` | `text` | No | Example translation |
| `stem_change` | `text` | No | Description of stem change (e.g., e→ie) |
| `audio_url` | `text` | No | Audio of conjugation |

#### Spanish-Specific CSS

```css
/* src/styles/card-spanish.css */

.card[data-language="spanish"] {
  --card-accent: var(--accent-spanish);
}

.spanish-badge {
  background: color-mix(in srgb, var(--accent-spanish) 10%, transparent);
  color: var(--accent-spanish);
  border: 1px solid color-mix(in srgb, var(--accent-spanish) 30%, transparent);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.spanish-text {
  font-family: var(--font-latin);
}

.gender-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.gender-masculine {
  background: #DBEAFE;
  color: #1E40AF;
}

.gender-feminine {
  background: #FCE7F3;
  color: #9D174D;
}

.false-friend-warning {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #FEF3C7;
  border-radius: 8px;
  border-left: 3px solid #F59E0B;
  font-size: 0.9rem;
}

[data-theme="dark"] .false-friend-warning {
  background: #78350F;
  color: #FDE68A;
  border-left-color: #D97706;
}

/* Conjugation table */
.conjugation-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.conjugation-table th {
  text-align: left;
  padding: 0.5rem;
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border-default);
}

.conjugation-table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--border-default);
}

.conjugation-table .pronoun {
  color: var(--text-tertiary);
  font-weight: 500;
}

.conjugation-table .form {
  color: var(--text-primary);
  font-weight: 500;
}

.conjugation-table .irregular-form {
  color: var(--accent-spanish);
  font-weight: 600;
}

.stem-change-highlight {
  color: var(--accent-spanish);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: var(--accent-spanish);
  text-decoration-thickness: 2px;
}
```

#### Spanish Tag Hierarchy

```
spanish/
├── grammar/
│   ├── grammar/tenses/
│   │   ├── grammar/tenses/present
│   │   ├── grammar/tenses/preterite
│   │   ├── grammar/tenses/imperfect
│   │   ├── grammar/tenses/future
│   │   ├── grammar/tenses/conditional
│   │   ├── grammar/tenses/subjunctive-present
│   │   └── grammar/tenses/subjunctive-imperfect
│   ├── grammar/ser-vs-estar
│   ├── grammar/por-vs-para
│   ├── grammar/gender-agreement
│   ├── grammar/pronouns/
│   └── grammar/prepositions/
├── vocabulary/
│   ├── vocabulary/frequency-top-500
│   ├── vocabulary/food-drink
│   ├── vocabulary/travel
│   ├── vocabulary/body-health
│   ├── vocabulary/emotions
│   ├── vocabulary/professions
│   ├── vocabulary/nature
│   └── vocabulary/technology
├── level/
│   ├── level/A1
│   ├── level/A2
│   ├── level/B1
│   ├── level/B2
│   ├── level/C1
│   └── level/C2
├── region/
│   ├── region/spain
│   ├── region/mexico
│   ├── region/argentina
│   └── region/universal
└── source/
    ├── source/textbook
    ├── source/duolingo-supplement
    └── source/custom
```

### 2.3.6 English Card Designs

#### Note Type: English Vocabulary

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `word` | `text` | Yes | English word or phrase |
| `pronunciation_ipa` | `text` | No | IPA pronunciation |
| `part_of_speech` | `enum` | Yes | noun, verb, adjective, adverb, idiom, phrasal_verb |
| `definition` | `text` | Yes | English definition |
| `translation_ar` | `text` | No | Arabic translation (optional for Arabic speakers) |
| `example_1` | `text` | No | First example sentence |
| `example_2` | `text` | No | Second example sentence |
| `audio_url` | `text` | No | Pronunciation audio |
| `synonyms` | `text[]` | No | Synonym list |
| `antonyms` | `text[]` | No | Antonym list |
| `collocations` | `text[]` | No | Common word combinations |
| `register` | `enum` | No | formal, informal, academic, literary |
| `cefr_level` | `enum` | No | A1, A2, B1, B2, C1, C2 |
| `word_family` | `text[]` | No | Related word forms (noun, verb, adj, adv) |
| `image_url` | `text` | No | Visual association |
| `notes` | `text` | No | Personal notes |

#### Note Type: English Idiom

| Field Name | Data Type | Required | Description |
|---|---|---|---|
| `idiom` | `text` | Yes | The idiom / expression |
| `meaning` | `text` | Yes | Plain language explanation |
| `translation_ar` | `text` | No | Arabic equivalent or explanation |
| `literal_meaning` | `text` | No | Literal translation (often humorous) |
| `example_1` | `text` | Yes | Example sentence |
| `example_2` | `text` | No | Second example |
| `origin` | `text` | No | Origin/etymology of the idiom |
| `register` | `enum` | Yes | formal, informal, slang |
| `audio_url` | `text` | No | Audio pronunciation |

#### English-Specific CSS

```css
/* src/styles/card-english.css */

.card[data-language="english"] {
  --card-accent: var(--accent-english);
}

.english-badge {
  background: color-mix(in srgb, var(--accent-english) 10%, transparent);
  color: var(--accent-english);
  border: 1px solid color-mix(in srgb, var(--accent-english) 30%, transparent);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.ipa-text {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-tertiary);
}

.definition-text {
  font-size: 1.1rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.word-family-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.word-family-item {
  padding: 0.5rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
  text-align: center;
}

.word-family-item .pos-label {
  font-size: 0.65rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.25rem;
}

.word-family-item .form {
  font-weight: 500;
  color: var(--text-primary);
}

.collocations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.collocation-chip {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  background: color-mix(in srgb, var(--accent-english) 8%, transparent);
  border-radius: 6px;
  color: var(--accent-english);
  font-weight: 500;
}

.idiom-literal {
  font-style: italic;
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.idiom-origin {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-card-hover);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.cefr-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cefr-A1, .cefr-A2 { background: #D1FAE5; color: #065F46; }
.cefr-B1, .cefr-B2 { background: #DBEAFE; color: #1E40AF; }
.cefr-C1, .cefr-C2 { background: #EDE9FE; color: #5B21B6; }
```

#### English Tag Hierarchy

```
english/
├── vocabulary/
│   ├── vocabulary/academic-word-list
│   ├── vocabulary/ielts-essential
│   ├── vocabulary/toefl-essential
│   ├── vocabulary/gre-words
│   ├── vocabulary/business
│   ├── vocabulary/technology
│   └── vocabulary/literature
├── grammar/
│   ├── grammar/tenses
│   ├── grammar/conditionals
│   ├── grammar/passive-voice
│   ├── grammar/reported-speech
│   ├── grammar/articles
│   └── grammar/phrasal-verbs
├── idioms/
│   ├── idioms/common
│   ├── idioms/business
│   ├── idioms/academic
│   └── idioms/slang
├── level/
│   ├── level/A1
│   ├── level/A2
│   ├── level/B1
│   ├── level/B2
│   ├── level/C1
│   └── level/C2
├── skills/
│   ├── skills/writing
│   ├── skills/speaking
│   ├── skills/listening
│   └── skills/reading
└── source/
    ├── source/textbook
    ├── source/news
    └── source/custom
```

---

## 2.4 Tagging Architecture

### 2.4.1 Design Philosophy

Tags are the backbone of organization in a multilingual flashcard system. Unlike Anki's
flat string-based tags that rely on a `::` convention for hierarchy, our tag system is
fully relational, supporting true parent-child relationships, color coding, descriptions,
language scoping, and preset groupings.

**Key Design Decisions:**

1. **Relational hierarchy**: Tags stored with explicit `parent_id` foreign keys, not string parsing
2. **Language scoping**: Tags can belong to a specific language track or be global
3. **Color-coded**: Each tag has an assigned color for rapid visual identification
4. **Described**: Tags can have descriptions for shared decks / team use
5. **Presets**: Saved tag combinations for one-click study session filtering
6. **Bi-directional note linking**: Many-to-many relationship between notes and tags

### 2.4.2 Database Schema for Tags

```sql
-- ============================================================
-- TAGS TABLE
-- Hierarchical tag storage with language scoping
-- ============================================================
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Tag identity
    name            VARCHAR(100) NOT NULL,       -- Display name (e.g., "verb-forms")
    slug            VARCHAR(150) NOT NULL,       -- URL-safe identifier
    full_path       VARCHAR(500) NOT NULL,       -- Materialized path (e.g., "grammar/morphology/verb-forms")

    -- Hierarchy
    parent_id       UUID REFERENCES tags(id) ON DELETE CASCADE,
    depth           SMALLINT NOT NULL DEFAULT 0, -- 0 = root tag, 1 = child, etc.
    sort_order      SMALLINT NOT NULL DEFAULT 0, -- Ordering among siblings

    -- Metadata
    description     TEXT,                        -- Optional description
    color           VARCHAR(7) DEFAULT '#78716C', -- Hex color code
    icon            VARCHAR(50),                 -- Optional icon name (from Lucide)

    -- Language scoping
    language        VARCHAR(20),                 -- NULL = global tag; 'fusha', 'ammiya', 'quran', 'spanish', 'english'

    -- Usage stats (denormalized for performance)
    card_count      INTEGER NOT NULL DEFAULT 0,  -- Number of cards with this tag

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT tags_unique_path_per_user UNIQUE (user_id, full_path),
    CONSTRAINT tags_unique_slug_per_parent UNIQUE (user_id, parent_id, slug),
    CONSTRAINT tags_valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT tags_valid_language CHECK (
        language IS NULL OR language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    ),
    CONSTRAINT tags_valid_depth CHECK (depth >= 0 AND depth <= 10)
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_language ON tags(user_id, language);
CREATE INDEX idx_tags_full_path ON tags(user_id, full_path);
CREATE INDEX idx_tags_full_path_prefix ON tags(user_id, full_path varchar_pattern_ops);
    -- ^ Enables prefix matching: WHERE full_path LIKE 'grammar/morphology/%'

-- Trigger to auto-update updated_at
CREATE TRIGGER tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- NOTE_TAGS JUNCTION TABLE
-- Many-to-many relationship between notes and tags
-- ============================================================
CREATE TABLE note_tags (
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);

-- ============================================================
-- TAG_PRESETS TABLE
-- Saved tag combinations for quick study session setup
-- ============================================================
CREATE TABLE tag_presets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    tag_ids     UUID[] NOT NULL,               -- Array of tag IDs in this preset
    language    VARCHAR(20),                    -- Optional language scope
    is_default  BOOLEAN NOT NULL DEFAULT FALSE, -- Show on dashboard
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tag_presets_unique_name UNIQUE (user_id, name)
);

CREATE INDEX idx_tag_presets_user_id ON tag_presets(user_id);
```

### 2.4.3 Tag CRUD API Endpoints

```typescript
// src/server/routes/tags.ts

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/connection';
import { tags, noteTags, tagPresets } from '../db/schema';
import { eq, and, like, sql, asc, desc } from 'drizzle-orm';

// ── Validation Schemas ────────────────────────────────────

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#78716C'),
  icon: z.string().max(50).optional(),
  language: z
    .enum(['fusha', 'ammiya', 'quran', 'spanish', 'english'])
    .nullable()
    .optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const tagPresetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tagIds: z.array(z.string().uuid()).min(1),
  language: z
    .enum(['fusha', 'ammiya', 'quran', 'spanish', 'english'])
    .nullable()
    .optional(),
  isDefault: z.boolean().optional().default(false),
});

// ── Route Registration ────────────────────────────────────

export async function tagRoutes(app: FastifyInstance) {
  // ── GET /api/tags ─ List all tags (tree structure) ──────
  app.get('/api/tags', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const { language, flat } = request.query as {
        language?: string;
        flat?: string;
      };

      let query = db
        .select()
        .from(tags)
        .where(eq(tags.userId, userId))
        .orderBy(asc(tags.depth), asc(tags.sortOrder), asc(tags.name));

      if (language) {
        query = query.where(
          and(eq(tags.userId, userId), eq(tags.language, language))
        );
      }

      const allTags = await query;

      if (flat === 'true') {
        return reply.send({ tags: allTags });
      }

      // Build tree structure
      const tree = buildTagTree(allTags);
      return reply.send({ tags: tree });
    },
  });

  // ── POST /api/tags ─ Create a new tag ───────────────────
  app.post('/api/tags', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const body = createTagSchema.parse(request.body);

      // Compute full_path
      let fullPath = generateSlug(body.name);
      let depth = 0;

      if (body.parentId) {
        const parent = await db
          .select()
          .from(tags)
          .where(and(eq(tags.id, body.parentId), eq(tags.userId, userId)))
          .limit(1);

        if (parent.length === 0) {
          return reply.status(404).send({ error: 'Parent tag not found' });
        }

        fullPath = `${parent[0].fullPath}/${generateSlug(body.name)}`;
        depth = parent[0].depth + 1;
      }

      const [newTag] = await db
        .insert(tags)
        .values({
          userId,
          name: body.name,
          slug: generateSlug(body.name),
          fullPath,
          parentId: body.parentId || null,
          depth,
          description: body.description,
          color: body.color,
          icon: body.icon,
          language: body.language || null,
        })
        .returning();

      return reply.status(201).send({ tag: newTag });
    },
  });

  // ── PUT /api/tags/:id ─ Update a tag ────────────────────
  app.put('/api/tags/:id', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const tagId = (request.params as { id: string }).id;
      const body = updateTagSchema.parse(request.body);

      // Verify ownership
      const existing = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Tag not found' });
      }

      const updates: Record<string, unknown> = {};

      if (body.name) {
        updates.name = body.name;
        updates.slug = generateSlug(body.name);
        // Recompute fullPath
        if (existing[0].parentId) {
          const parent = await db
            .select()
            .from(tags)
            .where(eq(tags.id, existing[0].parentId))
            .limit(1);
          updates.fullPath = `${parent[0].fullPath}/${generateSlug(body.name)}`;
        } else {
          updates.fullPath = generateSlug(body.name);
        }
      }

      if (body.description !== undefined) updates.description = body.description;
      if (body.color) updates.color = body.color;
      if (body.icon !== undefined) updates.icon = body.icon;
      if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

      if (body.parentId !== undefined) {
        // Reparenting: need to recompute fullPath and depth for this tag and all descendants
        updates.parentId = body.parentId;
        // (Full reparenting logic with descendant updates omitted for brevity
        //  but must cascade fullPath updates to all children)
      }

      const [updated] = await db
        .update(tags)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
        .returning();

      return reply.send({ tag: updated });
    },
  });

  // ── DELETE /api/tags/:id ─ Delete a tag and all descendants
  app.delete('/api/tags/:id', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const tagId = (request.params as { id: string }).id;

      // Verify ownership
      const existing = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ error: 'Tag not found' });
      }

      // Delete tag (CASCADE will handle children and note_tags)
      await db
        .delete(tags)
        .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));

      return reply.status(204).send();
    },
  });

  // ── POST /api/tags/:id/notes ─ Add tag to notes ────────
  app.post('/api/tags/:id/notes', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const tagId = (request.params as { id: string }).id;
      const { noteIds } = z
        .object({ noteIds: z.array(z.string().uuid()) })
        .parse(request.body);

      const values = noteIds.map((noteId) => ({
        noteId,
        tagId,
      }));

      await db
        .insert(noteTags)
        .values(values)
        .onConflictDoNothing();

      // Update card_count
      await updateTagCardCount(tagId);

      return reply.send({ success: true, taggedCount: noteIds.length });
    },
  });

  // ── DELETE /api/tags/:id/notes ─ Remove tag from notes ──
  app.delete('/api/tags/:id/notes', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const tagId = (request.params as { id: string }).id;
      const { noteIds } = z
        .object({ noteIds: z.array(z.string().uuid()) })
        .parse(request.body);

      for (const noteId of noteIds) {
        await db
          .delete(noteTags)
          .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
      }

      await updateTagCardCount(tagId);

      return reply.send({ success: true });
    },
  });

  // ── GET /api/tags/:id/cards ─ Get all cards with this tag
  app.get('/api/tags/:id/cards', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const tagId = (request.params as { id: string }).id;
      const { includeDescendants } = request.query as {
        includeDescendants?: string;
      };

      let tagIds = [tagId];

      if (includeDescendants === 'true') {
        // Get the tag's full_path to find descendants
        const tag = await db
          .select()
          .from(tags)
          .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
          .limit(1);

        if (tag.length > 0) {
          const descendants = await db
            .select({ id: tags.id })
            .from(tags)
            .where(
              and(
                eq(tags.userId, userId),
                like(tags.fullPath, `${tag[0].fullPath}/%`)
              )
            );
          tagIds = [tagId, ...descendants.map((d) => d.id)];
        }
      }

      const cards = await db.execute(sql`
        SELECT DISTINCT c.*
        FROM cards c
        JOIN notes n ON c.note_id = n.id
        JOIN note_tags nt ON n.id = nt.note_id
        WHERE nt.tag_id = ANY(${tagIds})
          AND n.user_id = ${userId}
        ORDER BY c.due ASC
      `);

      return reply.send({ cards: cards.rows });
    },
  });

  // ── Tag Presets ─────────────────────────────────────────

  // GET /api/tag-presets
  app.get('/api/tag-presets', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;

      const presets = await db
        .select()
        .from(tagPresets)
        .where(eq(tagPresets.userId, userId))
        .orderBy(desc(tagPresets.isDefault), asc(tagPresets.name));

      return reply.send({ presets });
    },
  });

  // POST /api/tag-presets
  app.post('/api/tag-presets', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const body = tagPresetSchema.parse(request.body);

      const [preset] = await db
        .insert(tagPresets)
        .values({
          userId,
          name: body.name,
          description: body.description,
          tagIds: body.tagIds,
          language: body.language || null,
          isDefault: body.isDefault,
        })
        .returning();

      return reply.status(201).send({ preset });
    },
  });

  // DELETE /api/tag-presets/:id
  app.delete('/api/tag-presets/:id', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const presetId = (request.params as { id: string }).id;

      await db
        .delete(tagPresets)
        .where(and(eq(tagPresets.id, presetId), eq(tagPresets.userId, userId)));

      return reply.status(204).send();
    },
  });
}

// ── Helper Functions ──────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '') // Keep Arabic chars, alphanumeric, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

interface TagNode {
  id: string;
  name: string;
  slug: string;
  fullPath: string;
  parentId: string | null;
  depth: number;
  color: string;
  icon: string | null;
  language: string | null;
  cardCount: number;
  children: TagNode[];
}

function buildTagTree(flatTags: any[]): TagNode[] {
  const map = new Map<string, TagNode>();
  const roots: TagNode[] = [];

  // Create nodes
  for (const tag of flatTags) {
    map.set(tag.id, { ...tag, children: [] });
  }

  // Build tree
  for (const tag of flatTags) {
    const node = map.get(tag.id)!;
    if (tag.parentId && map.has(tag.parentId)) {
      map.get(tag.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function updateTagCardCount(tagId: string): Promise<void> {
  await db.execute(sql`
    UPDATE tags
    SET card_count = (
      SELECT COUNT(DISTINCT c.id)
      FROM cards c
      JOIN notes n ON c.note_id = n.id
      JOIN note_tags nt ON n.id = nt.note_id
      WHERE nt.tag_id = ${tagId}
    )
    WHERE id = ${tagId}
  `);
}
```

### 2.4.4 Example Queries

```sql
-- ── Get full tag tree for a user (with card counts) ──────
SELECT
    t.id,
    t.name,
    t.full_path,
    t.depth,
    t.color,
    t.language,
    t.card_count,
    p.name AS parent_name
FROM tags t
LEFT JOIN tags p ON t.parent_id = p.id
WHERE t.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY t.full_path;

-- ── Get all tags for a specific language ─────────────────
SELECT id, name, full_path, color, card_count
FROM tags
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND language = 'fusha'
ORDER BY full_path;

-- ── Get all descendant tags of "grammar" ─────────────────
SELECT id, name, full_path, depth
FROM tags
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND full_path LIKE 'grammar/%'
ORDER BY full_path;

-- ── Get cards due today for a specific tag (including descendants)
SELECT c.id, c.due, c.status, n.fields
FROM cards c
JOIN notes n ON c.note_id = n.id
JOIN note_tags nt ON n.id = nt.note_id
JOIN tags t ON nt.tag_id = t.id
WHERE t.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND (t.full_path = 'grammar/morphology/verb-forms'
       OR t.full_path LIKE 'grammar/morphology/verb-forms/%')
  AND c.due <= NOW()
  AND c.status != 'paused'
ORDER BY c.due ASC;

-- ── Count cards per top-level tag ────────────────────────
SELECT
    t.name,
    t.color,
    COUNT(DISTINCT c.id) AS total_cards,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'new') AS unseen,
    COUNT(DISTINCT c.id) FILTER (WHERE c.due <= NOW() AND c.status = 'review') AS due_now
FROM tags t
JOIN note_tags nt ON t.id = nt.tag_id
JOIN notes n ON nt.note_id = n.id
JOIN cards c ON n.id = c.note_id
WHERE t.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND t.depth = 0
GROUP BY t.id, t.name, t.color
ORDER BY total_cards DESC;

-- ── Find notes that have ALL of a set of tags (AND logic) ─
SELECT n.id, n.fields
FROM notes n
WHERE n.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND (
    SELECT COUNT(DISTINCT nt.tag_id)
    FROM note_tags nt
    WHERE nt.note_id = n.id
      AND nt.tag_id IN (
        '11111111-1111-1111-1111-111111111111',  -- tag: verb-forms
        '22222222-2222-2222-2222-222222222222'   -- tag: form-VIII
      )
  ) = 2;  -- Must match ALL 2 tags

-- ── Find notes that have ANY of a set of tags (OR logic) ─
SELECT DISTINCT n.id, n.fields
FROM notes n
JOIN note_tags nt ON n.id = nt.note_id
WHERE n.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND nt.tag_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );

-- ── Get tag usage statistics ─────────────────────────────
SELECT
    t.name,
    t.full_path,
    t.card_count,
    COALESCE(
      (SELECT AVG(CASE
        WHEN rl.rating = 1 THEN 0    -- Didn't Know
        WHEN rl.rating = 2 THEN 0.33 -- Tough
        WHEN rl.rating = 3 THEN 0.66 -- Got It
        WHEN rl.rating = 4 THEN 1.0  -- Too Easy
      END)
      FROM review_logs rl
      JOIN cards c ON rl.card_id = c.id
      JOIN notes n ON c.note_id = n.id
      JOIN note_tags nt ON n.id = nt.note_id
      WHERE nt.tag_id = t.id
        AND rl.reviewed_at > NOW() - INTERVAL '30 days'
      ), 0
    ) AS avg_success_rate_30d
FROM tags t
WHERE t.user_id = '550e8400-e29b-41d4-a716-446655440000'
  AND t.depth <= 1
ORDER BY t.card_count DESC;
```

### 2.4.5 Visual Tag Manager UI Component

```typescript
// src/components/tags/TagManager.tsx

import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, ChevronRight, ChevronDown, Palette, Trash2, Edit2, Play } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface TagNode {
  id: string;
  name: string;
  fullPath: string;
  color: string;
  icon: string | null;
  language: string | null;
  cardCount: number;
  children: TagNode[];
}

interface TagManagerProps {
  tags: TagNode[];
  onCreateTag: (data: CreateTagInput) => Promise<void>;
  onUpdateTag: (id: string, data: UpdateTagInput) => Promise<void>;
  onDeleteTag: (id: string) => Promise<void>;
  onStudyByTag: (tagId: string) => void;
}

export function TagManager({
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onStudyByTag,
}: TagManagerProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredTags = searchQuery
    ? filterTagTree(tags, searchQuery.toLowerCase())
    : tags;

  return (
    <div className="tag-manager">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Tag Manager</h2>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Tag
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-4"
      />

      {/* Tag Tree */}
      <div className="tag-tree">
        {filteredTags.map((tag) => (
          <TagTreeNode
            key={tag.id}
            tag={tag}
            expandedIds={expandedIds}
            onToggle={toggleExpanded}
            onEdit={(id) => {/* open edit dialog */}}
            onDelete={onDeleteTag}
            onStudy={onStudyByTag}
            onAddChild={(parentId) => {
              setSelectedParentId(parentId);
              setShowCreateDialog(true);
            }}
            depth={0}
          />
        ))}
      </div>

      {/* Create Tag Dialog */}
      <AnimatePresence>
        {showCreateDialog && (
          <CreateTagDialog
            parentId={selectedParentId}
            onSubmit={async (data) => {
              await onCreateTag(data);
              setShowCreateDialog(false);
              setSelectedParentId(null);
            }}
            onClose={() => {
              setShowCreateDialog(false);
              setSelectedParentId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TagTreeNode({
  tag,
  expandedIds,
  onToggle,
  onEdit,
  onDelete,
  onStudy,
  onAddChild,
  depth,
}: {
  tag: TagNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStudy: (id: string) => void;
  onAddChild: (parentId: string) => void;
  depth: number;
}) {
  const isExpanded = expandedIds.has(tag.id);
  const hasChildren = tag.children.length > 0;

  return (
    <div className="tag-tree-node">
      <motion.div
        className="tag-tree-row group"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        whileHover={{ backgroundColor: 'var(--bg-card-hover)' }}
      >
        {/* Expand/collapse button */}
        <button
          className="tag-tree-toggle"
          onClick={() => hasChildren && onToggle(tag.id)}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Color dot */}
        <div
          className="tag-color-dot"
          style={{ backgroundColor: tag.color }}
        />

        {/* Tag name */}
        <span className="tag-tree-name">{tag.name}</span>

        {/* Card count */}
        <span className="tag-tree-count">{tag.cardCount}</span>

        {/* Language badge */}
        {tag.language && (
          <span className={`tag-lang-badge lang-${tag.language}`}>
            {tag.language}
          </span>
        )}

        {/* Actions (visible on hover) */}
        <div className="tag-tree-actions opacity-0 group-hover:opacity-100">
          <button onClick={() => onStudy(tag.id)} title="Study this tag">
            <Play className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onAddChild(tag.id)} title="Add child tag">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(tag.id)} title="Edit tag">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(tag.id)}
            title="Delete tag"
            className="text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tag.children.map((child) => (
              <TagTreeNode
                key={child.id}
                tag={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onStudy={onStudy}
                onAddChild={onAddChild}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function filterTagTree(tags: TagNode[], query: string): TagNode[] {
  return tags
    .map((tag) => {
      const matchesName = tag.name.toLowerCase().includes(query);
      const filteredChildren = filterTagTree(tag.children, query);

      if (matchesName || filteredChildren.length > 0) {
        return { ...tag, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as TagNode[];
}
```

### 2.4.6 Tag-Based Study Sessions

The tag system integrates directly with the study session engine, enabling targeted practice:

```typescript
// src/server/services/study/tagBasedStudy.ts

interface TagStudySessionConfig {
  userId: string;
  tagIds: string[];
  includeDescendants: boolean;
  mode: 'all_due' | 'new_only' | 'review_only' | 'struggling_only';
  maxCards?: number;
  language?: string;
}

async function createTagStudySession(
  config: TagStudySessionConfig
): Promise<StudySession> {
  // Expand tag IDs to include descendants if requested
  let expandedTagIds = config.tagIds;

  if (config.includeDescendants) {
    const allTags = await db.execute(sql`
      WITH RECURSIVE tag_tree AS (
        SELECT id, full_path
        FROM tags
        WHERE id = ANY(${config.tagIds})
          AND user_id = ${config.userId}

        UNION ALL

        SELECT t.id, t.full_path
        FROM tags t
        JOIN tag_tree tt ON t.parent_id = tt.id
      )
      SELECT id FROM tag_tree
    `);
    expandedTagIds = allTags.rows.map((r: any) => r.id);
  }

  // Build the card query based on mode
  let statusFilter = '';
  switch (config.mode) {
    case 'new_only':
      statusFilter = "AND c.status = 'new'";
      break;
    case 'review_only':
      statusFilter = "AND c.status = 'review' AND c.due <= NOW()";
      break;
    case 'struggling_only':
      statusFilter = "AND c.difficulty >= 8";
      break;
    default: // all_due
      statusFilter = "AND (c.status = 'new' OR (c.due <= NOW() AND c.status != 'paused'))";
  }

  const cards = await db.execute(sql`
    SELECT DISTINCT c.*
    FROM cards c
    JOIN notes n ON c.note_id = n.id
    JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = ANY(${expandedTagIds})
      AND n.user_id = ${config.userId}
      AND c.status != 'paused'
      ${sql.raw(statusFilter)}
    ORDER BY
      CASE c.status
        WHEN 'relearning' THEN 0
        WHEN 'learning' THEN 1
        WHEN 'review' THEN 2
        WHEN 'new' THEN 3
      END,
      c.due ASC
    LIMIT ${config.maxCards || 50}
  `);

  return {
    id: generateSessionId(),
    cards: cards.rows,
    totalCards: cards.rows.length,
    currentIndex: 0,
    tagIds: config.tagIds,
    mode: config.mode,
  };
}
```

---

## 2.5 Suspend/Pause and Resume - Redesigned

### 2.5.1 Card Status System

Every card in the system has a primary status that determines its behavior in the
scheduling engine.

```typescript
// Card status enum - stored in the database
enum CardStatus {
  NEW = 'new',             // Never studied. Waiting in the unseen queue.
  LEARNING = 'learning',   // Currently being learned (short intervals).
  REVIEW = 'review',       // In long-term review cycle.
  RELEARNING = 'relearning', // Was known, but lapsed. Short intervals again.
  PAUSED = 'paused',       // Manually or automatically paused. Hidden from study.
  BURIED = 'buried',       // "Skip Until Tomorrow." Resets at day boundary.
}
```

### 2.5.2 Pause Mechanism Taxonomy

There are five distinct ways a card can be paused, each with different behavior:

| Pause Type | Trigger | Duration | Resume Mechanism |
|---|---|---|---|
| **Manual Card Pause** | User pauses a specific card | Indefinite or timed | Manual resume or timer expiry |
| **Tag Pause** | User pauses all cards with a tag | Indefinite or timed | Manual resume or timer expiry |
| **Deck Pause** | User pauses an entire deck | Indefinite or timed | Manual resume or timer expiry |
| **Timed Pause** | User pauses for a specific duration | 1 day to 6 months | Automatic resume at expiry |
| **Auto-Pause (Struggling)** | System pauses cards with 8+ lapses | Indefinite | Manual review from Struggling Cards dashboard |
| **Skip Until Tomorrow** | User skips card during study | Until next day boundary | Automatic (cron job at user's midnight) |

### 2.5.3 Database Schema for Pause System

```sql
-- ── Card pause tracking ───────────────────────────────────
-- Each pause event is logged for audit trail and analytics
CREATE TABLE card_pauses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- Pause details
    pause_type      VARCHAR(20) NOT NULL CHECK (
        pause_type IN ('manual', 'tag_based', 'deck_based', 'timed', 'auto_struggling', 'skip_tomorrow')
    ),
    reason          VARCHAR(50),                 -- 'too_hard', 'not_relevant', 'need_to_research', 'other'
    reason_detail   TEXT,                         -- Free-text detail if reason = 'other'

    -- Source (what triggered this pause)
    source_tag_id   UUID REFERENCES tags(id) ON DELETE SET NULL,
    source_deck_id  UUID REFERENCES decks(id) ON DELETE SET NULL,

    -- Timing
    paused_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resume_at       TIMESTAMPTZ,                 -- NULL = indefinite; set for timed pauses
    resumed_at      TIMESTAMPTZ,                 -- When actually resumed (NULL if still paused)

    -- State preservation
    status_before_pause VARCHAR(20) NOT NULL,    -- Card status before pausing
    scheduling_data_snapshot JSONB,              -- FSRS data at time of pause (for restoration)

    -- Status
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT valid_pause_type CHECK (pause_type IN (
        'manual', 'tag_based', 'deck_based', 'timed', 'auto_struggling', 'skip_tomorrow'
    ))
);

CREATE INDEX idx_card_pauses_user_active ON card_pauses(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_card_pauses_card_id ON card_pauses(card_id);
CREATE INDEX idx_card_pauses_resume_at ON card_pauses(resume_at) WHERE is_active = TRUE AND resume_at IS NOT NULL;
CREATE INDEX idx_card_pauses_source_tag ON card_pauses(source_tag_id) WHERE source_tag_id IS NOT NULL;
CREATE INDEX idx_card_pauses_source_deck ON card_pauses(source_deck_id) WHERE source_deck_id IS NOT NULL;
```

### 2.5.4 SQL Operations for Pause/Resume

```sql
-- ── Pause a single card (manual) ─────────────────────────
-- Step 1: Log the pause event
INSERT INTO card_pauses (user_id, card_id, pause_type, reason, status_before_pause, scheduling_data_snapshot)
SELECT
    c.user_id,
    c.id,
    'manual',
    'too_hard',                   -- from user selection
    c.status,
    jsonb_build_object(
        'stability', c.stability,
        'difficulty', c.difficulty,
        'due', c.due,
        'last_review', c.last_review,
        'reps', c.reps,
        'lapses', c.lapses
    )
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE c.id = '{{card_id}}'
  AND n.user_id = '{{user_id}}';

-- Step 2: Update card status
UPDATE cards SET
    status = 'paused',
    updated_at = NOW()
WHERE id = '{{card_id}}';

-- ── Pause a card with a timer (timed pause) ──────────────
INSERT INTO card_pauses (user_id, card_id, pause_type, reason, resume_at, status_before_pause, scheduling_data_snapshot)
SELECT
    n.user_id,
    c.id,
    'timed',
    'not_relevant',
    NOW() + INTERVAL '7 days',    -- Resume in 7 days
    c.status,
    jsonb_build_object(
        'stability', c.stability,
        'difficulty', c.difficulty,
        'due', c.due,
        'last_review', c.last_review,
        'reps', c.reps,
        'lapses', c.lapses
    )
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE c.id = '{{card_id}}'
  AND n.user_id = '{{user_id}}';

UPDATE cards SET status = 'paused', updated_at = NOW()
WHERE id = '{{card_id}}';

-- ── Pause all cards with a specific tag ──────────────────
WITH target_cards AS (
    SELECT c.id AS card_id, c.status, c.stability, c.difficulty,
           c.due, c.last_review, c.reps, c.lapses
    FROM cards c
    JOIN notes n ON c.note_id = n.id
    JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = '{{tag_id}}'
      AND n.user_id = '{{user_id}}'
      AND c.status != 'paused'
)
INSERT INTO card_pauses (user_id, card_id, pause_type, source_tag_id, status_before_pause, scheduling_data_snapshot)
SELECT
    '{{user_id}}',
    tc.card_id,
    'tag_based',
    '{{tag_id}}',
    tc.status,
    jsonb_build_object(
        'stability', tc.stability,
        'difficulty', tc.difficulty,
        'due', tc.due,
        'last_review', tc.last_review,
        'reps', tc.reps,
        'lapses', tc.lapses
    )
FROM target_cards tc;

UPDATE cards SET status = 'paused', updated_at = NOW()
WHERE id IN (SELECT card_id FROM target_cards);

-- ── Pause an entire deck ─────────────────────────────────
WITH target_cards AS (
    SELECT c.id AS card_id, c.status, c.stability, c.difficulty,
           c.due, c.last_review, c.reps, c.lapses
    FROM cards c
    WHERE c.deck_id = '{{deck_id}}'
      AND c.status != 'paused'
)
INSERT INTO card_pauses (user_id, card_id, pause_type, source_deck_id, status_before_pause, scheduling_data_snapshot)
SELECT
    '{{user_id}}',
    tc.card_id,
    'deck_based',
    '{{deck_id}}',
    tc.status,
    jsonb_build_object(
        'stability', tc.stability, 'difficulty', tc.difficulty,
        'due', tc.due, 'last_review', tc.last_review,
        'reps', tc.reps, 'lapses', tc.lapses
    )
FROM target_cards tc;

UPDATE cards SET status = 'paused', updated_at = NOW()
WHERE id IN (SELECT card_id FROM target_cards);

-- ── Skip Until Tomorrow ──────────────────────────────────
INSERT INTO card_pauses (user_id, card_id, pause_type, resume_at, status_before_pause, scheduling_data_snapshot)
SELECT
    n.user_id,
    c.id,
    'skip_tomorrow',
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ,  -- Tomorrow at midnight
    c.status,
    jsonb_build_object('stability', c.stability, 'difficulty', c.difficulty,
                       'due', c.due, 'last_review', c.last_review,
                       'reps', c.reps, 'lapses', c.lapses)
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE c.id = '{{card_id}}'
  AND n.user_id = '{{user_id}}';

UPDATE cards SET status = 'buried', updated_at = NOW()
WHERE id = '{{card_id}}';

-- ── Resume a single card ─────────────────────────────────
-- Step 1: Get the pause record to restore previous state
WITH pause_record AS (
    SELECT id, status_before_pause, scheduling_data_snapshot
    FROM card_pauses
    WHERE card_id = '{{card_id}}' AND is_active = TRUE
    ORDER BY paused_at DESC
    LIMIT 1
)
-- Step 2: Restore card status
UPDATE cards SET
    status = (SELECT status_before_pause FROM pause_record),
    due = GREATEST(
        NOW(),
        ((SELECT scheduling_data_snapshot FROM pause_record)->>'due')::TIMESTAMPTZ
    ),
    updated_at = NOW()
WHERE id = '{{card_id}}';

-- Step 3: Mark pause record as inactive
UPDATE card_pauses SET
    is_active = FALSE,
    resumed_at = NOW()
WHERE card_id = '{{card_id}}' AND is_active = TRUE;

-- ── Resume all cards paused by a specific tag ────────────
WITH paused_by_tag AS (
    SELECT card_id, status_before_pause, scheduling_data_snapshot
    FROM card_pauses
    WHERE source_tag_id = '{{tag_id}}'
      AND user_id = '{{user_id}}'
      AND is_active = TRUE
)
UPDATE cards c SET
    status = pbt.status_before_pause,
    due = GREATEST(NOW(), (pbt.scheduling_data_snapshot->>'due')::TIMESTAMPTZ),
    updated_at = NOW()
FROM paused_by_tag pbt
WHERE c.id = pbt.card_id;

UPDATE card_pauses SET
    is_active = FALSE,
    resumed_at = NOW()
WHERE source_tag_id = '{{tag_id}}'
  AND user_id = '{{user_id}}'
  AND is_active = TRUE;

-- ── Auto-resume timed pauses (run by cron job) ──────────
-- This should run every 15 minutes
WITH expired_pauses AS (
    SELECT card_id, status_before_pause, scheduling_data_snapshot
    FROM card_pauses
    WHERE resume_at <= NOW()
      AND is_active = TRUE
)
UPDATE cards c SET
    status = ep.status_before_pause,
    due = GREATEST(NOW(), (ep.scheduling_data_snapshot->>'due')::TIMESTAMPTZ),
    updated_at = NOW()
FROM expired_pauses ep
WHERE c.id = ep.card_id;

UPDATE card_pauses SET
    is_active = FALSE,
    resumed_at = NOW()
WHERE resume_at <= NOW()
  AND is_active = TRUE;

-- ── Auto-pause struggling cards ──────────────────────────
-- Run after each review. Pause cards with 8+ lapses.
INSERT INTO card_pauses (user_id, card_id, pause_type, status_before_pause, scheduling_data_snapshot)
SELECT
    n.user_id,
    c.id,
    'auto_struggling',
    c.status,
    jsonb_build_object('stability', c.stability, 'difficulty', c.difficulty,
                       'due', c.due, 'last_review', c.last_review,
                       'reps', c.reps, 'lapses', c.lapses)
FROM cards c
JOIN notes n ON c.note_id = n.id
WHERE c.lapses >= 8
  AND c.status != 'paused'
  AND NOT EXISTS (
    SELECT 1 FROM card_pauses cp
    WHERE cp.card_id = c.id AND cp.is_active = TRUE
  );

UPDATE cards SET status = 'paused', updated_at = NOW()
WHERE lapses >= 8 AND status != 'paused';

-- ── Dashboard: Get pause summary for a user ──────────────
SELECT
    pause_type,
    COUNT(*) AS count,
    MIN(paused_at) AS oldest_pause,
    COUNT(*) FILTER (WHERE resume_at IS NOT NULL AND resume_at <= NOW() + INTERVAL '7 days') AS resuming_soon
FROM card_pauses
WHERE user_id = '{{user_id}}'
  AND is_active = TRUE
GROUP BY pause_type;
```

### 2.5.5 Pause/Resume API Endpoints

```typescript
// src/server/routes/pause.ts

import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const pauseCardSchema = z.object({
  cardId: z.string().uuid(),
  pauseType: z.enum(['manual', 'timed', 'skip_tomorrow']),
  reason: z.enum(['too_hard', 'not_relevant', 'need_to_research', 'other']).optional(),
  reasonDetail: z.string().max(500).optional(),
  resumeAfterDays: z.number().int().min(1).max(180).optional(), // For timed pauses
});

const pauseByTagSchema = z.object({
  tagId: z.string().uuid(),
  resumeAfterDays: z.number().int().min(1).max(180).optional(),
});

const pauseByDeckSchema = z.object({
  deckId: z.string().uuid(),
  resumeAfterDays: z.number().int().min(1).max(180).optional(),
});

export async function pauseRoutes(app: FastifyInstance) {
  // ── POST /api/cards/:id/pause ─ Pause a single card ────
  app.post('/api/cards/:id/pause', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const cardId = (request.params as { id: string }).id;
      const body = pauseCardSchema.parse({ ...request.body, cardId });

      await pauseService.pauseCard({
        userId,
        cardId,
        pauseType: body.pauseType,
        reason: body.reason,
        reasonDetail: body.reasonDetail,
        resumeAfterDays: body.resumeAfterDays,
      });

      return reply.send({ success: true, message: 'Card paused.' });
    },
  });

  // ── POST /api/cards/:id/resume ─ Resume a single card ──
  app.post('/api/cards/:id/resume', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const cardId = (request.params as { id: string }).id;

      await pauseService.resumeCard({ userId, cardId });

      return reply.send({ success: true, message: 'Card resumed.' });
    },
  });

  // ── POST /api/cards/:id/skip-tomorrow ─ Skip until tomorrow
  app.post('/api/cards/:id/skip-tomorrow', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const cardId = (request.params as { id: string }).id;

      await pauseService.skipUntilTomorrow({ userId, cardId });

      return reply.send({ success: true, message: 'Card skipped until tomorrow.' });
    },
  });

  // ── POST /api/tags/:id/pause ─ Pause all cards with tag ─
  app.post('/api/tags/:id/pause', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const tagId = (request.params as { id: string }).id;
      const body = pauseByTagSchema.parse({ ...request.body, tagId });

      const count = await pauseService.pauseByTag({
        userId,
        tagId: body.tagId,
        resumeAfterDays: body.resumeAfterDays,
      });

      return reply.send({ success: true, pausedCount: count });
    },
  });

  // ── POST /api/tags/:id/resume ─ Resume all cards with tag
  app.post('/api/tags/:id/resume', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const tagId = (request.params as { id: string }).id;

      const count = await pauseService.resumeByTag({ userId, tagId });

      return reply.send({ success: true, resumedCount: count });
    },
  });

  // ── POST /api/decks/:id/pause ─ Pause entire deck ──────
  app.post('/api/decks/:id/pause', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;
      const deckId = (request.params as { id: string }).id;
      const body = pauseByDeckSchema.parse({ ...request.body, deckId });

      const count = await pauseService.pauseByDeck({
        userId,
        deckId: body.deckId,
        resumeAfterDays: body.resumeAfterDays,
      });

      return reply.send({ success: true, pausedCount: count });
    },
  });

  // ── GET /api/paused ─ Get pause dashboard summary ──────
  app.get('/api/paused', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const userId = request.user.id;

      const summary = await pauseService.getPauseSummary(userId);

      return reply.send(summary);
    },
  });
}
```

### 2.5.6 Pause Card UI Component

```typescript
// src/components/study/PauseCardDialog.tsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Clock, Tag, Calendar, X } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface PauseCardDialogProps {
  card: CardData;
  onPause: (options: PauseOptions) => Promise<void>;
  onSkipTomorrow: () => Promise<void>;
  onClose: () => void;
}

interface PauseOptions {
  type: 'manual' | 'timed';
  reason?: string;
  days?: number;
  includeTag?: string;
}

const TIMED_OPTIONS = [
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
];

const REASONS = [
  { id: 'too_hard', label: 'Too hard right now', icon: '😤' },
  { id: 'not_relevant', label: 'Not relevant right now', icon: '🤷' },
  { id: 'need_to_research', label: 'Need to look this up', icon: '🔍' },
  { id: 'other', label: 'Other', icon: '💭' },
];

export function PauseCardDialog({
  card,
  onPause,
  onSkipTomorrow,
  onClose,
}: PauseCardDialogProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePause = async () => {
    setIsLoading(true);
    try {
      if (selectedAction === 'skip_tomorrow') {
        await onSkipTomorrow();
      } else if (selectedAction === 'timed' && selectedDays) {
        await onPause({
          type: 'timed',
          reason: selectedReason || undefined,
          days: selectedDays,
        });
      } else {
        await onPause({
          type: 'manual',
          reason: selectedReason || undefined,
        });
      }
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="pause-dialog"
      >
        <div className="pause-dialog-header">
          <Pause className="w-5 h-5" />
          <h3>Pause this card?</h3>
          <button onClick={onClose} className="close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pause-options">
          {/* Skip Until Tomorrow */}
          <button
            className={`pause-option ${selectedAction === 'skip_tomorrow' ? 'selected' : ''}`}
            onClick={() => setSelectedAction('skip_tomorrow')}
          >
            <Calendar className="w-5 h-5" />
            <div>
              <div className="pause-option-title">Skip Until Tomorrow</div>
              <div className="pause-option-desc">
                Returns tomorrow at its normal scheduled time
              </div>
            </div>
          </button>

          {/* Timed Pause */}
          <button
            className={`pause-option ${selectedAction === 'timed' ? 'selected' : ''}`}
            onClick={() => setSelectedAction('timed')}
          >
            <Clock className="w-5 h-5" />
            <div>
              <div className="pause-option-title">Pause for...</div>
              <div className="pause-option-desc">
                Automatically resumes after the chosen period
              </div>
            </div>
          </button>

          {selectedAction === 'timed' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="timed-options"
            >
              {TIMED_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  className={`timed-chip ${selectedDays === opt.days ? 'selected' : ''}`}
                  onClick={() => setSelectedDays(opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Indefinite Pause */}
          <button
            className={`pause-option ${selectedAction === 'indefinite' ? 'selected' : ''}`}
            onClick={() => setSelectedAction('indefinite')}
          >
            <Pause className="w-5 h-5" />
            <div>
              <div className="pause-option-title">Pause Indefinitely</div>
              <div className="pause-option-desc">
                Resume anytime from your Card Library
              </div>
            </div>
          </button>

          {/* Pause by Tag */}
          {card.tags.length > 0 && (
            <button
              className={`pause-option ${selectedAction === 'tag' ? 'selected' : ''}`}
              onClick={() => setSelectedAction('tag')}
            >
              <Tag className="w-5 h-5" />
              <div>
                <div className="pause-option-title">
                  Pause all cards tagged: #{card.tags[0].name}
                </div>
                <div className="pause-option-desc">
                  Pauses {card.tags[0].cardCount} cards
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Reason (optional) */}
        {selectedAction && selectedAction !== 'skip_tomorrow' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="pause-reason"
          >
            <p className="text-sm text-secondary mb-2">
              Why are you pausing? (optional)
            </p>
            <div className="reason-chips">
              {REASONS.map((reason) => (
                <button
                  key={reason.id}
                  className={`reason-chip ${selectedReason === reason.id ? 'selected' : ''}`}
                  onClick={() => setSelectedReason(reason.id)}
                >
                  {reason.icon} {reason.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="pause-dialog-actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePause}
            disabled={!selectedAction || isLoading}
            loading={isLoading}
          >
            {selectedAction === 'skip_tomorrow' ? 'Skip' : 'Pause Card'}
          </Button>
        </div>
      </motion.div>
    </Dialog>
  );
}
```

---

## 2.6 Cross-Language Features

### 2.6.1 Root Linking Between Arabic and Quran

The three-letter (and occasionally four-letter) root system is the backbone of Arabic
morphology. A single root like ك-ت-ب (k-t-b) generates dozens of words: كَتَبَ (to write),
كِتَاب (book), مَكْتَبَة (library), كَاتِب (writer), مَكْتُوب (written), etc.

Our system exploits this by maintaining a shared root registry that links vocabulary
across Fusha, Ammiya, and Quran tracks.

#### Root Registry Database Schema

```sql
-- ============================================================
-- ARABIC_ROOTS TABLE
-- Shared root registry across all Arabic language tracks
-- ============================================================
CREATE TABLE arabic_roots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_letters    VARCHAR(10) NOT NULL,         -- e.g., "ك-ت-ب"
    root_letters_plain VARCHAR(5) NOT NULL,       -- e.g., "كتب"
    root_type       VARCHAR(20) NOT NULL DEFAULT 'triliteral', -- triliteral, quadriliteral
    base_meaning    TEXT NOT NULL,                 -- Core semantic meaning: "writing, books"
    base_meaning_ar TEXT,                          -- Arabic description of root meaning

    -- Cross-reference stats (denormalized)
    fusha_word_count    INTEGER NOT NULL DEFAULT 0,
    ammiya_word_count   INTEGER NOT NULL DEFAULT 0,
    quran_word_count    INTEGER NOT NULL DEFAULT 0,
    quran_occurrences   INTEGER NOT NULL DEFAULT 0,  -- Total times words from this root appear in Quran

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roots_unique_letters UNIQUE (root_letters_plain)
);

CREATE INDEX idx_roots_letters ON arabic_roots(root_letters_plain);
CREATE INDEX idx_roots_type ON arabic_roots(root_type);

-- ============================================================
-- NOTE_ROOTS JUNCTION TABLE
-- Links notes (from any Arabic track) to their root
-- ============================================================
CREATE TABLE note_roots (
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    root_id     UUID NOT NULL REFERENCES arabic_roots(id) ON DELETE CASCADE,
    language    VARCHAR(20) NOT NULL CHECK (language IN ('fusha', 'ammiya', 'quran')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (note_id, root_id)
);

CREATE INDEX idx_note_roots_root_id ON note_roots(root_id);
CREATE INDEX idx_note_roots_language ON note_roots(root_id, language);
```

#### Root Explorer Component

```typescript
// src/components/cross-language/RootExplorer.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RootData {
  id: string;
  rootLetters: string;
  baseMeaning: string;
  baseMeaningAr: string;
  fushaWords: RootWord[];
  ammiyaWords: RootWord[];
  quranWords: RootWord[];
}

interface RootWord {
  noteId: string;
  word: string;
  translation: string;
  pattern?: string;
  partOfSpeech: string;
  language: 'fusha' | 'ammiya' | 'quran';
  quranOccurrences?: number;
  mastery: 'unseen' | 'learning' | 'review' | 'mastered';
}

export function RootExplorer({ root }: { root: RootData }) {
  const [activeTab, setActiveTab] = useState<'fusha' | 'ammiya' | 'quran'>('fusha');

  const tabs = [
    { id: 'fusha' as const, label: 'Fusha', count: root.fushaWords.length, color: 'fusha' },
    { id: 'ammiya' as const, label: 'Ammiya', count: root.ammiyaWords.length, color: 'ammiya' },
    { id: 'quran' as const, label: 'Quran', count: root.quranWords.length, color: 'quran' },
  ];

  const activeWords =
    activeTab === 'fusha'
      ? root.fushaWords
      : activeTab === 'ammiya'
        ? root.ammiyaWords
        : root.quranWords;

  return (
    <div className="root-explorer">
      {/* Root header */}
      <div className="root-header">
        <div className="root-letters-display">{root.rootLetters}</div>
        <div className="root-meaning">
          <span className="root-meaning-en">{root.baseMeaning}</span>
          <span className="root-meaning-ar">{root.baseMeaningAr}</span>
        </div>
      </div>

      {/* Language tabs */}
      <div className="root-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`root-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            data-color={tab.color}
          >
            {tab.label}
            <span className="root-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Word list */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="root-word-list"
        >
          {activeWords.map((word) => (
            <div key={word.noteId} className="root-word-item">
              <div className="root-word-arabic">{word.word}</div>
              <div className="root-word-info">
                <span className="root-word-translation">{word.translation}</span>
                {word.pattern && (
                  <span className="root-word-pattern">{word.pattern}</span>
                )}
                <span className="root-word-pos">{word.partOfSpeech}</span>
              </div>
              <div className={`mastery-indicator mastery-${word.mastery}`}>
                {word.mastery}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Root visualization (tree diagram) */}
      <div className="root-tree-visual">
        <div className="root-tree-center">{root.rootLetters}</div>
        <div className="root-tree-branches">
          {[...root.fushaWords, ...root.ammiyaWords, ...root.quranWords]
            .slice(0, 8)
            .map((word) => (
              <div key={word.noteId} className="root-tree-leaf" data-lang={word.language}>
                {word.word}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
```

#### Root Linking Query Examples

```sql
-- ── Find all words across all tracks sharing the root ك-ت-ب ──
SELECT
    nr.language,
    n.fields->>'word' AS word,
    n.fields->>'word_ammiya' AS word_ammiya,
    n.fields->>'translation_en' AS translation,
    n.fields->>'pattern' AS pattern,
    n.fields->>'part_of_speech' AS pos,
    CASE
        WHEN c.reps = 0 THEN 'unseen'
        WHEN c.status = 'learning' THEN 'learning'
        WHEN c.status = 'review' AND c.stability > 30 THEN 'mastered'
        ELSE 'review'
    END AS mastery
FROM arabic_roots ar
JOIN note_roots nr ON ar.id = nr.root_id
JOIN notes n ON nr.note_id = n.id
LEFT JOIN cards c ON n.id = c.note_id AND c.card_type_index = 0
WHERE ar.root_letters_plain = 'كتب'
ORDER BY nr.language, n.created_at;

-- ── Suggest related roots based on user's study history ──
SELECT ar.root_letters, ar.base_meaning, ar.quran_occurrences,
       ar.fusha_word_count + ar.ammiya_word_count + ar.quran_word_count AS total_words
FROM arabic_roots ar
WHERE ar.id NOT IN (
    SELECT DISTINCT nr.root_id
    FROM note_roots nr
    JOIN notes n ON nr.note_id = n.id
    WHERE n.user_id = '{{user_id}}'
)
ORDER BY ar.quran_occurrences DESC
LIMIT 20;
```

### 2.6.2 Fusha-Ammiya Bridge

Many learners study both Fusha and Ammiya simultaneously. The bridge feature explicitly
links Fusha vocabulary to their Ammiya equivalents and highlights the differences.

#### Bridge Implementation

```typescript
// src/server/services/crossLanguage/fushaAmmiyaBridge.ts

interface BridgeEntry {
  fushaEntryId: string;
  ammiyaEntryId: string;
  fushaWord: string;
  ammiyaWord: string;
  sharedRootId?: string;
  differences: BridgeDifference[];
  notes: string;
}

interface BridgeDifference {
  type: 'pronunciation' | 'meaning_shift' | 'grammar' | 'usage' | 'nonexistent';
  description: string;
}

// Example bridge entries:
const BRIDGE_EXAMPLES: BridgeEntry[] = [
  {
    fushaEntryId: 'fusha-001',
    ammiyaEntryId: 'ammiya-001',
    fushaWord: 'أُريدُ',
    ammiyaWord: 'عاوِز / عايز',
    differences: [
      {
        type: 'pronunciation',
        description: 'Completely different words. Fusha uses أَرَادَ (to want), Ammiya uses عَوَزَ (to need/want).',
      },
      {
        type: 'grammar',
        description: 'Fusha conjugation follows standard Form IV. Ammiya uses active participle form.',
      },
    ],
    notes: 'In Egyptian Arabic, "عايز" is used for masculine, "عايزة" for feminine.',
  },
  {
    fushaEntryId: 'fusha-002',
    ammiyaEntryId: 'ammiya-002',
    fushaWord: 'كَيْفَ',
    ammiyaWord: 'إِزَّاي',
    differences: [
      {
        type: 'pronunciation',
        description: 'Different words entirely.',
      },
      {
        type: 'usage',
        description: 'Both mean "how" but إِزَّاي can also be a general greeting: "إزاي؟" = "How are you?"',
      },
    ],
    notes: 'إِزَّاي is derived from "في أي شيء" (in what manner).',
  },
];

/**
 * During study, if the user reviews a Fusha card that has an Ammiya bridge,
 * offer a "See Ammiya equivalent" button.
 */
async function findBridgeForCard(
  cardId: string,
  userId: string
): Promise<BridgeEntry | null> {
  // Check if this card's note has a linked entry in the other track
  const result = await db.execute(sql`
    SELECT
      n_fusha.id AS fusha_note_id,
      n_ammiya.id AS ammiya_note_id,
      n_fusha.fields->>'word' AS fusha_word,
      n_ammiya.fields->>'word_ammiya' AS ammiya_word,
      ar.root_letters AS shared_root
    FROM notes n_fusha
    JOIN note_roots nr_fusha ON n_fusha.id = nr_fusha.note_id AND nr_fusha.language = 'fusha'
    JOIN arabic_roots ar ON nr_fusha.root_id = ar.id
    JOIN note_roots nr_ammiya ON ar.id = nr_ammiya.root_id AND nr_ammiya.language = 'ammiya'
    JOIN notes n_ammiya ON nr_ammiya.note_id = n_ammiya.id
    JOIN cards c ON c.note_id = n_fusha.id
    WHERE c.id = ${cardId}
      AND n_fusha.user_id = ${userId}
    LIMIT 1
  `);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    fushaEntryId: row.fusha_note_id,
    ammiyaEntryId: row.ammiya_note_id,
    fushaWord: row.fusha_word,
    ammiyaWord: row.ammiya_word,
    sharedRootId: row.shared_root,
    differences: [],
    notes: '',
  };
}
```

### 2.6.3 Language Dashboard

The Language Dashboard is the user's central hub, showing progress across all their
active language tracks simultaneously.

```typescript
// src/components/dashboard/LanguageDashboard.tsx

interface LanguageStats {
  language: string;
  displayName: string;
  color: string;
  totalCards: number;
  unseenCards: number;
  dueToday: number;
  masteredCards: number;
  masteryPercentage: number;
  streakDays: number;
  todayReviewed: number;
  todayGoal: number;
  weeklyActivity: number[];  // Reviews per day for last 7 days
}

export function LanguageDashboard({ stats }: { stats: LanguageStats[] }) {
  return (
    <div className="language-dashboard">
      <h1 className="dashboard-title">Your Languages</h1>

      <div className="language-cards-grid">
        {stats.map((lang) => (
          <motion.div
            key={lang.language}
            className="language-stat-card"
            style={{ '--accent': lang.color } as React.CSSProperties}
            whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
          >
            <div className="lang-card-header">
              <h3 className="lang-card-title">{lang.displayName}</h3>
              <div className="streak-badge">
                {lang.streakDays > 0 && (
                  <>🔥 {lang.streakDays} day{lang.streakDays !== 1 ? 's' : ''}</>
                )}
              </div>
            </div>

            {/* Daily progress ring */}
            <div className="daily-progress-ring">
              <svg viewBox="0 0 100 100" className="progress-svg">
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="var(--border-default)"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeDasharray={`${(lang.todayReviewed / lang.todayGoal) * 251.2} 251.2`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="progress-ring-text">
                <span className="progress-count">{lang.todayReviewed}</span>
                <span className="progress-goal">/ {lang.todayGoal}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="lang-stats-row">
              <div className="lang-stat">
                <span className="lang-stat-value">{lang.dueToday}</span>
                <span className="lang-stat-label">Due</span>
              </div>
              <div className="lang-stat">
                <span className="lang-stat-value">{lang.unseenCards}</span>
                <span className="lang-stat-label">Unseen</span>
              </div>
              <div className="lang-stat">
                <span className="lang-stat-value">{lang.masteredCards}</span>
                <span className="lang-stat-label">Mastered</span>
              </div>
            </div>

            {/* Mini weekly activity chart */}
            <div className="weekly-activity">
              {lang.weeklyActivity.map((count, i) => (
                <div
                  key={i}
                  className="activity-bar"
                  style={{
                    height: `${Math.max(4, (count / Math.max(...lang.weeklyActivity)) * 32)}px`,
                    backgroundColor: count > 0 ? 'var(--accent)' : 'var(--border-default)',
                  }}
                />
              ))}
            </div>

            {/* Mastery progress bar */}
            <div className="mastery-bar">
              <div className="mastery-bar-fill" style={{ width: `${lang.masteryPercentage}%` }} />
              <span className="mastery-text">{lang.masteryPercentage}% mastered</span>
            </div>

            {/* Study button */}
            <button className="lang-study-btn">
              Study Now ({lang.dueToday} due)
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

### 2.6.4 Smart Cross-Language Scheduling

The scheduling engine considers inter-language relationships when ordering cards:

```typescript
// src/server/services/scheduling/crossLanguageScheduler.ts

/**
 * Cross-language scheduling rules:
 *
 * 1. Root Clustering: When a user is studying a Fusha word, schedule related
 *    Ammiya/Quran words nearby (within the same session) to reinforce the root.
 *
 * 2. Interleaving Prevention: Don't show the same word in two different
 *    languages back-to-back. Separate by at least 3 cards.
 *
 * 3. Language Fatigue Rotation: If the user studies multiple languages in one
 *    session, rotate between them to prevent fatigue. (e.g., 5 Fusha, 5 Spanish,
 *    5 Fusha, 5 Spanish)
 *
 * 4. Bridge Prioritization: If a user just learned a Fusha word, and its Ammiya
 *    equivalent is also due, prioritize it.
 */

interface ScheduledCard {
  card: Card;
  language: string;
  rootId?: string;
  priority: number;  // Higher = shown sooner
}

function applyInterleaving(
  cards: ScheduledCard[],
  batchSize: number = 5
): ScheduledCard[] {
  // Group by language
  const byLanguage = new Map<string, ScheduledCard[]>();
  for (const card of cards) {
    const group = byLanguage.get(card.language) || [];
    group.push(card);
    byLanguage.set(card.language, group);
  }

  // Interleave: take batchSize from each language in round-robin
  const result: ScheduledCard[] = [];
  const languages = Array.from(byLanguage.keys());
  let languageIndex = 0;

  while (result.length < cards.length) {
    const lang = languages[languageIndex % languages.length];
    const group = byLanguage.get(lang)!;
    const batch = group.splice(0, batchSize);

    if (batch.length > 0) {
      result.push(...batch);
    }

    // Remove empty groups
    if (group.length === 0) {
      languages.splice(languageIndex % languages.length, 1);
      if (languages.length === 0) break;
    } else {
      languageIndex++;
    }
  }

  return result;
}

function applyRootClustering(cards: ScheduledCard[]): ScheduledCard[] {
  // For cards that share a root, boost priority of the second language card
  // if the first is already in the queue
  const rootSeen = new Map<string, number>(); // rootId -> index where first seen

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card.rootId) continue;

    if (rootSeen.has(card.rootId)) {
      // A card with this root was already scheduled. Boost this one
      // to appear shortly after (within 3 positions).
      const firstIndex = rootSeen.get(card.rootId)!;
      const targetIndex = Math.min(firstIndex + 3, cards.length - 1);

      if (i > targetIndex) {
        // Move card closer
        const [removed] = cards.splice(i, 1);
        cards.splice(targetIndex, 0, removed);
      }
    } else {
      rootSeen.set(card.rootId, i);
    }
  }

  return cards;
}
```

### 2.6.5 Pronunciation Recording & Comparison

Users can record their own pronunciation and compare it to the reference audio:

```typescript
// src/hooks/usePronunciationRecorder.ts

import { useState, useRef, useCallback } from 'react';

interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  duration: number;
  error: string | null;
}

export function usePronunciationRecorder() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
    duration: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const duration = (Date.now() - startTimeRef.current) / 1000;

        setState({
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
          duration,
          error: null,
        });

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      startTimeRef.current = Date.now();
      mediaRecorder.start();

      setState((prev) => ({ ...prev, isRecording: true, error: null }));

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Microphone access denied. Please enable microphone permissions.',
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      error: null,
    });
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
```

### 2.6.6 Streak and Gamification System

The gamification system is designed to sustain motivation without being infantilizing.
It adapts based on language track (more restrained for Quran, more playful for Spanish).

#### Streak System

```typescript
// src/server/services/gamification/streaks.ts

interface UserStreak {
  userId: string;
  language: string;
  currentStreak: number;        // Consecutive days studied
  longestStreak: number;        // All-time longest streak
  lastStudyDate: string;        // YYYY-MM-DD
  freezesAvailable: number;     // "Streak freeze" days available
  freezesUsed: number;          // Freezes used this month
  isActive: boolean;            // Is streak currently alive
}

async function updateStreak(
  userId: string,
  language: string
): Promise<{ streakUpdated: boolean; newStreak: number; milestone: string | null }> {
  const today = formatDateYMD(new Date());
  const yesterday = formatDateYMD(subDays(new Date(), 1));

  const streak = await db.query.userStreaks.findFirst({
    where: and(
      eq(userStreaks.userId, userId),
      eq(userStreaks.language, language)
    ),
  });

  if (!streak) {
    // First ever study session for this language
    await db.insert(userStreaks).values({
      userId,
      language,
      currentStreak: 1,
      longestStreak: 1,
      lastStudyDate: today,
      isActive: true,
    });
    return { streakUpdated: true, newStreak: 1, milestone: 'first_study' };
  }

  if (streak.lastStudyDate === today) {
    // Already studied today
    return { streakUpdated: false, newStreak: streak.currentStreak, milestone: null };
  }

  if (streak.lastStudyDate === yesterday) {
    // Consecutive day! Extend streak
    const newStreak = streak.currentStreak + 1;
    const longestStreak = Math.max(newStreak, streak.longestStreak);

    await db.update(userStreaks)
      .set({
        currentStreak: newStreak,
        longestStreak,
        lastStudyDate: today,
        isActive: true,
      })
      .where(eq(userStreaks.id, streak.id));

    const milestone = checkStreakMilestone(newStreak);
    return { streakUpdated: true, newStreak, milestone };
  }

  // Missed one or more days
  // Check if streak freeze is available
  if (streak.freezesAvailable > 0 && streak.lastStudyDate === formatDateYMD(subDays(new Date(), 2))) {
    // Use a freeze for yesterday
    await db.update(userStreaks)
      .set({
        currentStreak: streak.currentStreak + 1,
        freezesAvailable: streak.freezesAvailable - 1,
        freezesUsed: streak.freezesUsed + 1,
        lastStudyDate: today,
      })
      .where(eq(userStreaks.id, streak.id));

    return {
      streakUpdated: true,
      newStreak: streak.currentStreak + 1,
      milestone: 'freeze_used',
    };
  }

  // Streak broken. Reset to 1.
  await db.update(userStreaks)
    .set({
      currentStreak: 1,
      lastStudyDate: today,
      isActive: true,
    })
    .where(eq(userStreaks.id, streak.id));

  return { streakUpdated: true, newStreak: 1, milestone: 'streak_reset' };
}

function checkStreakMilestone(streak: number): string | null {
  const milestones: Record<number, string> = {
    3: 'streak_3',
    7: 'streak_week',
    14: 'streak_2weeks',
    30: 'streak_month',
    50: 'streak_50',
    100: 'streak_100',
    365: 'streak_year',
  };
  return milestones[streak] || null;
}
```

#### XP and Leveling System

```typescript
// src/server/services/gamification/xp.ts

const XP_REWARDS = {
  card_reviewed: 10,
  card_got_it: 15,
  card_too_easy: 5,      // Less XP for too-easy cards (less effort)
  card_didnt_know: 8,    // Still reward effort
  daily_goal_complete: 50,
  streak_maintained: 20,
  new_card_added: 5,
  quiz_perfect_score: 30,
  speed_round_record: 25,
  root_family_complete: 40,  // All words from a root mastered
  first_mastered_card: 100,
  hundred_mastered: 200,
};

const LEVEL_THRESHOLDS = [
  0,       // Level 1
  100,     // Level 2
  300,     // Level 3
  600,     // Level 4
  1000,    // Level 5
  1500,    // Level 6
  2200,    // Level 7
  3000,    // Level 8
  4000,    // Level 9
  5200,    // Level 10
  6600,    // Level 11
  8200,    // Level 12
  10000,   // Level 13
  12000,   // Level 14
  14500,   // Level 15
  17500,   // Level 16
  21000,   // Level 17
  25000,   // Level 18
  30000,   // Level 19
  36000,   // Level 20
];

function calculateLevel(totalXP: number): { level: number; xpInLevel: number; xpForNextLevel: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 5000;

  return {
    level,
    xpInLevel: totalXP - currentThreshold,
    xpForNextLevel: nextThreshold - currentThreshold,
  };
}
```

#### Achievement Badges

```typescript
// src/config/achievements.ts

export const ACHIEVEMENTS = [
  // ── Getting Started ──────────────────────────────
  {
    id: 'first_card',
    name: 'First Steps',
    description: 'Review your first card',
    icon: '👣',
    xpReward: 50,
    condition: { type: 'total_reviews', threshold: 1 },
  },
  {
    id: 'ten_cards',
    name: 'Warming Up',
    description: 'Review 10 cards',
    icon: '🔥',
    xpReward: 50,
    condition: { type: 'total_reviews', threshold: 10 },
  },
  {
    id: 'hundred_cards',
    name: 'Centurion',
    description: 'Review 100 cards',
    icon: '💪',
    xpReward: 100,
    condition: { type: 'total_reviews', threshold: 100 },
  },
  {
    id: 'thousand_cards',
    name: 'Scholar',
    description: 'Review 1,000 cards',
    icon: '📚',
    xpReward: 500,
    condition: { type: 'total_reviews', threshold: 1000 },
  },

  // ── Streaks ──────────────────────────────────────
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🗓️',
    xpReward: 100,
    condition: { type: 'streak', threshold: 7 },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    xpReward: 300,
    condition: { type: 'streak', threshold: 30 },
  },
  {
    id: 'streak_100',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    icon: '⚡',
    xpReward: 1000,
    condition: { type: 'streak', threshold: 100 },
  },

  // ── Mastery ──────────────────────────────────────
  {
    id: 'first_mastered',
    name: 'Memory Champion',
    description: 'Master your first card (30+ day interval)',
    icon: '🧠',
    xpReward: 100,
    condition: { type: 'mastered_cards', threshold: 1 },
  },
  {
    id: 'fifty_mastered',
    name: 'Knowledge Builder',
    description: 'Master 50 cards',
    icon: '🏗️',
    xpReward: 300,
    condition: { type: 'mastered_cards', threshold: 50 },
  },

  // ── Language-Specific ────────────────────────────
  {
    id: 'quran_juz_complete',
    name: 'Juz Complete',
    description: 'Master all vocabulary from one Juz of the Quran',
    icon: '📖',
    xpReward: 500,
    condition: { type: 'quran_juz_mastered', threshold: 1 },
    language: 'quran',
  },
  {
    id: 'arabic_root_family',
    name: 'Root Scholar',
    description: 'Master all words from a single Arabic root across all tracks',
    icon: '🌳',
    xpReward: 200,
    condition: { type: 'root_family_complete', threshold: 1 },
    language: 'fusha',
  },
  {
    id: 'spanish_all_tenses',
    name: 'Conjugation King',
    description: 'Master a verb in all tenses',
    icon: '👑',
    xpReward: 200,
    condition: { type: 'spanish_verb_all_tenses', threshold: 1 },
    language: 'spanish',
  },

  // ── Cross-Language ───────────────────────────────
  {
    id: 'polyglot_beginner',
    name: 'Polyglot',
    description: 'Study cards in 3 different languages in one day',
    icon: '🌍',
    xpReward: 100,
    condition: { type: 'languages_in_day', threshold: 3 },
  },
  {
    id: 'bridge_builder',
    name: 'Bridge Builder',
    description: 'Master a word in both Fusha and Ammiya from the same root',
    icon: '🌉',
    xpReward: 150,
    condition: { type: 'fusha_ammiya_bridge', threshold: 1 },
  },
] as const;
```

---

## 2.7 Complete Database Schema

### 2.7.1 Schema Overview

The complete PostgreSQL schema covers all aspects of the system: user management, content
storage, spaced repetition scheduling, tagging, media, gamification, and cross-language
features.

**Entity-Relationship Summary:**

```
users ─┬─< notes ─┬─< cards ──< review_logs
       │          └─< note_tags ──> tags
       ├─< decks ──< cards
       ├─< tags ──< note_tags
       ├─< tag_presets
       ├─< media
       ├─< user_achievements
       ├─< user_streaks
       ├─< study_presets
       └─< card_pauses

note_types (global) ──< notes
arabic_roots ──< note_roots ──> notes
```

### 2.7.2 Complete SQL Schema

```sql
-- ============================================================
-- MULTILINGUAL FLASHCARD SYSTEM - COMPLETE DATABASE SCHEMA
-- PostgreSQL 16+
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Utility function for auto-updating timestamps ─────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash   VARCHAR(255),                  -- NULL for OAuth-only users
    display_name    VARCHAR(100) NOT NULL,
    avatar_url      TEXT,

    -- Language preferences
    active_languages TEXT[] NOT NULL DEFAULT '{}',  -- ['fusha', 'ammiya', 'quran', 'spanish', 'english']
    primary_language VARCHAR(20),                   -- Primary study language
    interface_language VARCHAR(10) NOT NULL DEFAULT 'en', -- UI language

    -- Study preferences (JSONB for flexibility)
    preferences     JSONB NOT NULL DEFAULT '{
        "dailyGoalMinutes": 15,
        "newCardsPerDay": 10,
        "learningStyle": ["mixed"],
        "ratingMode": "simple",
        "theme": "system",
        "soundEnabled": true,
        "hapticEnabled": true,
        "showTimer": false,
        "autoPlayAudio": true,
        "requireDiacritics": false,
        "quranGamificationEnabled": false
    }'::JSONB,

    -- Gamification
    total_xp        INTEGER NOT NULL DEFAULT 0,
    level           SMALLINT NOT NULL DEFAULT 1,

    -- Timezone (for streak calculations)
    timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',

    -- Onboarding
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_step SMALLINT NOT NULL DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ,
    last_study_at   TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT users_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT users_valid_level CHECK (level >= 1 AND level <= 100)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_study ON users(last_study_at);

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. NOTE_TYPES (Entry Templates)
-- ============================================================
CREATE TABLE note_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system template
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    language        VARCHAR(20),                   -- Language this template is for

    -- Field definitions stored as JSONB array
    -- Each field: { name, type, required, placeholder, description, order }
    fields          JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Card view definitions stored as JSONB array
    -- Each view: { name, frontTemplate, backTemplate, css, type }
    card_views      JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Custom CSS for this note type
    css             TEXT NOT NULL DEFAULT '',

    -- Metadata
    is_system       BOOLEAN NOT NULL DEFAULT FALSE, -- System-provided template
    is_default      BOOLEAN NOT NULL DEFAULT FALSE, -- Default for new entries in this language
    sort_order      SMALLINT NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT note_types_valid_language CHECK (
        language IS NULL OR language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    )
);

CREATE INDEX idx_note_types_user ON note_types(user_id);
CREATE INDEX idx_note_types_language ON note_types(language);
CREATE INDEX idx_note_types_system ON note_types(is_system) WHERE is_system = TRUE;

CREATE TRIGGER note_types_updated_at
    BEFORE UPDATE ON note_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 3. DECKS
-- ============================================================
CREATE TABLE decks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES decks(id) ON DELETE CASCADE, -- For folders (sub-decks)
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    language        VARCHAR(20),                   -- Primary language of this deck
    color           VARCHAR(7) DEFAULT '#78716C',
    icon            VARCHAR(50),

    -- Deck settings (override user defaults)
    settings        JSONB NOT NULL DEFAULT '{
        "newCardsPerDay": null,
        "maxReviewsPerDay": null,
        "learningSteps": [1, 10],
        "relearningSteps": [10],
        "autoPlayAudio": null,
        "showTimer": null
    }'::JSONB,

    -- Hierarchy
    depth           SMALLINT NOT NULL DEFAULT 0,
    full_path       VARCHAR(500) NOT NULL,         -- Materialized path
    sort_order      SMALLINT NOT NULL DEFAULT 0,

    -- Denormalized counts
    total_cards     INTEGER NOT NULL DEFAULT 0,
    new_count       INTEGER NOT NULL DEFAULT 0,
    learn_count     INTEGER NOT NULL DEFAULT 0,
    review_count    INTEGER NOT NULL DEFAULT 0,

    -- Sharing
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    shared_url_slug VARCHAR(100),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT decks_unique_path UNIQUE (user_id, full_path),
    CONSTRAINT decks_valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT decks_valid_language CHECK (
        language IS NULL OR language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    )
);

CREATE INDEX idx_decks_user ON decks(user_id);
CREATE INDEX idx_decks_parent ON decks(parent_id);
CREATE INDEX idx_decks_language ON decks(user_id, language);
CREATE INDEX idx_decks_public ON decks(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_decks_shared_slug ON decks(shared_url_slug) WHERE shared_url_slug IS NOT NULL;

CREATE TRIGGER decks_updated_at
    BEFORE UPDATE ON decks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. DECK_PRESETS
-- ============================================================
CREATE TABLE deck_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system preset
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    language        VARCHAR(20),

    -- Preset configuration
    settings        JSONB NOT NULL,  -- Same structure as decks.settings

    is_system       BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deck_presets_user ON deck_presets(user_id);

-- ============================================================
-- 5. NOTES (Entries)
-- ============================================================
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_type_id    UUID NOT NULL REFERENCES note_types(id) ON DELETE RESTRICT,
    deck_id         UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

    -- All field values stored as JSONB
    -- Keys match the field names defined in the note_type
    fields          JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Language track
    language        VARCHAR(20) NOT NULL,

    -- Metadata
    source          VARCHAR(200),                  -- Where this entry came from
    sort_field      TEXT,                           -- Computed field for sorting

    -- Flags / bookmarks
    bookmarked      BOOLEAN NOT NULL DEFAULT FALSE,
    bookmark_color  SMALLINT,                      -- 0=none, 1=red, 2=orange, 3=green, 4=blue, 5=purple

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_valid_language CHECK (
        language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    )
);

CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_notes_deck ON notes(deck_id);
CREATE INDEX idx_notes_note_type ON notes(note_type_id);
CREATE INDEX idx_notes_language ON notes(user_id, language);
CREATE INDEX idx_notes_bookmarked ON notes(user_id, bookmarked) WHERE bookmarked = TRUE;
CREATE INDEX idx_notes_created ON notes(user_id, created_at DESC);

-- GIN index for searching inside JSONB fields
CREATE INDEX idx_notes_fields_gin ON notes USING GIN (fields jsonb_path_ops);

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. CARDS
-- ============================================================
CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    deck_id         UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,

    -- Which card view this card represents (index into note_type.card_views)
    card_view_index SMALLINT NOT NULL DEFAULT 0,

    -- Card status
    status          VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (
        status IN ('new', 'learning', 'review', 'relearning', 'paused', 'buried')
    ),

    -- FSRS scheduling data
    due             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stability       REAL NOT NULL DEFAULT 0,        -- FSRS stability
    difficulty      REAL NOT NULL DEFAULT 0,        -- FSRS difficulty (0-10)
    elapsed_days    INTEGER NOT NULL DEFAULT 0,     -- Days since last review
    scheduled_days  INTEGER NOT NULL DEFAULT 0,     -- Interval in days
    reps            INTEGER NOT NULL DEFAULT 0,     -- Total reviews
    lapses          INTEGER NOT NULL DEFAULT 0,     -- Times forgotten
    last_review     TIMESTAMPTZ,                    -- Last review timestamp

    -- FSRS state enum (0=New, 1=Learning, 2=Review, 3=Relearning)
    fsrs_state      SMALLINT NOT NULL DEFAULT 0,

    -- Denormalized for quick queries
    language        VARCHAR(20) NOT NULL,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cards_unique_note_view UNIQUE (note_id, card_view_index),
    CONSTRAINT cards_valid_language CHECK (
        language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    )
);

-- THE critical index: find due cards efficiently
CREATE INDEX idx_cards_due ON cards(deck_id, status, due)
    WHERE status IN ('new', 'learning', 'review', 'relearning');

CREATE INDEX idx_cards_note ON cards(note_id);
CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_cards_status ON cards(deck_id, status);
CREATE INDEX idx_cards_language ON cards(language, status, due);
CREATE INDEX idx_cards_paused ON cards(deck_id) WHERE status = 'paused';
CREATE INDEX idx_cards_struggling ON cards(deck_id) WHERE lapses >= 8;

CREATE TRIGGER cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. REVIEW_LOGS
-- ============================================================
CREATE TABLE review_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Review data
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
    -- 1 = Didn't Know (Again), 2 = Tough (Hard), 3 = Got It (Good), 4 = Too Easy (Easy)

    -- FSRS state before and after review
    state_before    SMALLINT NOT NULL,              -- FSRS state before
    state_after     SMALLINT NOT NULL,              -- FSRS state after

    -- Scheduling data at time of review
    stability_before REAL,
    stability_after  REAL,
    difficulty_before REAL,
    difficulty_after  REAL,
    due_before       TIMESTAMPTZ,
    due_after        TIMESTAMPTZ,
    elapsed_days     INTEGER,
    scheduled_days   INTEGER,

    -- Performance data
    time_taken_ms   INTEGER,                       -- Milliseconds to answer
    study_mode      VARCHAR(20) NOT NULL DEFAULT 'classic', -- classic, quiz, listening, writing, speed

    -- Session context
    session_id      UUID,                          -- Groups reviews into sessions
    language        VARCHAR(20) NOT NULL,

    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_logs_valid_language CHECK (
        language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english')
    )
);

CREATE INDEX idx_reviews_card ON review_logs(card_id, reviewed_at DESC);
CREATE INDEX idx_reviews_user_date ON review_logs(user_id, reviewed_at DESC);
CREATE INDEX idx_reviews_session ON review_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_reviews_language ON review_logs(user_id, language, reviewed_at DESC);

-- Partition by month for performance (if table grows large)
-- CREATE TABLE review_logs PARTITION BY RANGE (reviewed_at);

-- ============================================================
-- 8. TAGS (defined in Section 2.4, included here for completeness)
-- ============================================================
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(150) NOT NULL,
    full_path       VARCHAR(500) NOT NULL,
    parent_id       UUID REFERENCES tags(id) ON DELETE CASCADE,
    depth           SMALLINT NOT NULL DEFAULT 0,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    description     TEXT,
    color           VARCHAR(7) DEFAULT '#78716C',
    icon            VARCHAR(50),
    language        VARCHAR(20),
    card_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tags_unique_path_per_user UNIQUE (user_id, full_path),
    CONSTRAINT tags_valid_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_parent_id ON tags(parent_id);
CREATE INDEX idx_tags_language ON tags(user_id, language);
CREATE INDEX idx_tags_full_path ON tags(user_id, full_path);
CREATE INDEX idx_tags_path_prefix ON tags(user_id, full_path varchar_pattern_ops);

CREATE TRIGGER tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. NOTE_TAGS (junction)
-- ============================================================
CREATE TABLE note_tags (
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_tag ON note_tags(tag_id);
CREATE INDEX idx_note_tags_note ON note_tags(note_id);

-- ============================================================
-- 10. TAG_PRESETS
-- ============================================================
CREATE TABLE tag_presets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    tag_ids     UUID[] NOT NULL,
    language    VARCHAR(20),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tag_presets_unique_name UNIQUE (user_id, name)
);

CREATE INDEX idx_tag_presets_user ON tag_presets(user_id);

-- ============================================================
-- 11. MEDIA
-- ============================================================
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id         UUID REFERENCES notes(id) ON DELETE SET NULL,

    -- File info
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    file_size       INTEGER NOT NULL,              -- Bytes
    storage_key     VARCHAR(500) NOT NULL,         -- S3/R2 key
    cdn_url         TEXT NOT NULL,                 -- Public CDN URL

    -- Media metadata
    media_type      VARCHAR(20) NOT NULL CHECK (
        media_type IN ('audio', 'image', 'video')
    ),
    duration_ms     INTEGER,                       -- For audio/video
    width           INTEGER,                       -- For images/video
    height          INTEGER,                       -- For images/video

    -- Source
    source          VARCHAR(50) NOT NULL DEFAULT 'upload', -- upload, tts, recording, import
    language        VARCHAR(20),

    -- TTS metadata (if generated)
    tts_text        TEXT,                          -- The text that was synthesized
    tts_voice       VARCHAR(100),                  -- Voice ID used
    tts_speed       REAL,                          -- Speaking rate

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT media_valid_size CHECK (file_size > 0 AND file_size <= 52428800) -- 50MB max
);

CREATE INDEX idx_media_user ON media(user_id);
CREATE INDEX idx_media_note ON media(note_id);
CREATE INDEX idx_media_type ON media(user_id, media_type);

-- ============================================================
-- 12. STUDY_PRESETS (Custom Study Sessions)
-- ============================================================
CREATE TABLE study_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,

    -- Filter configuration
    config          JSONB NOT NULL DEFAULT '{}'::JSONB,
    -- Config structure:
    -- {
    --   "deckIds": [],
    --   "tagIds": [],
    --   "includeDescendantTags": true,
    --   "languages": [],
    --   "statuses": ["new", "review", "relearning"],
    --   "dueOnly": true,
    --   "maxCards": 50,
    --   "difficultyRange": [0, 10],
    --   "createdAfter": null,
    --   "createdBefore": null,
    --   "studyMode": "classic",
    --   "sortBy": "due_asc"
    -- }

    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at    TIMESTAMPTZ,
    use_count       INTEGER NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_presets_user ON study_presets(user_id);

-- ============================================================
-- 13. USER_ACHIEVEMENTS
-- ============================================================
CREATE TABLE user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id  VARCHAR(50) NOT NULL,          -- References ACHIEVEMENTS config
    language        VARCHAR(20),                   -- NULL = global achievement

    -- Achievement data
    progress        INTEGER NOT NULL DEFAULT 0,    -- Current progress toward threshold
    threshold       INTEGER NOT NULL,              -- Target value
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,

    -- XP awarded
    xp_awarded      INTEGER NOT NULL DEFAULT 0,
    notified        BOOLEAN NOT NULL DEFAULT FALSE, -- Has user been shown this achievement

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT achievements_unique UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievements_incomplete ON user_achievements(user_id, completed) WHERE completed = FALSE;

CREATE TRIGGER achievements_updated_at
    BEFORE UPDATE ON user_achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 14. USER_STREAKS
-- ============================================================
CREATE TABLE user_streaks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language        VARCHAR(20) NOT NULL,          -- Per-language streaks

    current_streak  INTEGER NOT NULL DEFAULT 0,
    longest_streak  INTEGER NOT NULL DEFAULT 0,
    last_study_date DATE,                          -- YYYY-MM-DD (in user's timezone)
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,

    -- Streak freeze
    freezes_available SMALLINT NOT NULL DEFAULT 1, -- Max 2 per month
    freezes_used     SMALLINT NOT NULL DEFAULT 0,
    freeze_reset_date DATE,                        -- When freezes reset (1st of month)

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT streaks_unique UNIQUE (user_id, language),
    CONSTRAINT streaks_valid_language CHECK (
        language IN ('fusha', 'ammiya', 'quran', 'spanish', 'english', 'global')
    )
);

CREATE INDEX idx_streaks_user ON user_streaks(user_id);

CREATE TRIGGER streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 15. CARD_PAUSES (defined in Section 2.5, included for completeness)
-- ============================================================
CREATE TABLE card_pauses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id         UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    pause_type      VARCHAR(20) NOT NULL,
    reason          VARCHAR(50),
    reason_detail   TEXT,
    source_tag_id   UUID REFERENCES tags(id) ON DELETE SET NULL,
    source_deck_id  UUID REFERENCES decks(id) ON DELETE SET NULL,
    paused_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resume_at       TIMESTAMPTZ,
    resumed_at      TIMESTAMPTZ,
    status_before_pause VARCHAR(20) NOT NULL,
    scheduling_data_snapshot JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_pauses_user_active ON card_pauses(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_pauses_card ON card_pauses(card_id);
CREATE INDEX idx_pauses_resume ON card_pauses(resume_at) WHERE is_active = TRUE AND resume_at IS NOT NULL;

-- ============================================================
-- 16. ARABIC_ROOTS (defined in Section 2.6)
-- ============================================================
CREATE TABLE arabic_roots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    root_letters    VARCHAR(10) NOT NULL,
    root_letters_plain VARCHAR(5) NOT NULL,
    root_type       VARCHAR(20) NOT NULL DEFAULT 'triliteral',
    base_meaning    TEXT NOT NULL,
    base_meaning_ar TEXT,
    fusha_word_count    INTEGER NOT NULL DEFAULT 0,
    ammiya_word_count   INTEGER NOT NULL DEFAULT 0,
    quran_word_count    INTEGER NOT NULL DEFAULT 0,
    quran_occurrences   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT roots_unique UNIQUE (root_letters_plain)
);

CREATE INDEX idx_roots_letters ON arabic_roots(root_letters_plain);

-- ============================================================
-- 17. NOTE_ROOTS (junction: notes ↔ arabic_roots)
-- ============================================================
CREATE TABLE note_roots (
    note_id     UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    root_id     UUID NOT NULL REFERENCES arabic_roots(id) ON DELETE CASCADE,
    language    VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (note_id, root_id)
);

CREATE INDEX idx_note_roots_root ON note_roots(root_id);
CREATE INDEX idx_note_roots_lang ON note_roots(root_id, language);

-- ============================================================
-- 18. STUDY_SESSIONS (session tracking)
-- ============================================================
CREATE TABLE study_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id         UUID REFERENCES decks(id) ON DELETE SET NULL,
    language        VARCHAR(20),

    -- Session data
    study_mode      VARCHAR(20) NOT NULL DEFAULT 'classic',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    duration_seconds INTEGER,

    -- Counts
    cards_studied   INTEGER NOT NULL DEFAULT 0,
    cards_correct   INTEGER NOT NULL DEFAULT 0,    -- Got It + Too Easy
    cards_incorrect INTEGER NOT NULL DEFAULT 0,    -- Didn't Know
    cards_tough     INTEGER NOT NULL DEFAULT 0,    -- Tough

    -- XP earned this session
    xp_earned       INTEGER NOT NULL DEFAULT 0,

    -- Tag/preset context
    tag_ids         UUID[],
    preset_id       UUID REFERENCES study_presets(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_language ON study_sessions(user_id, language, started_at DESC);
```

### 2.7.3 Seed Data

```sql
-- ============================================================
-- SEED DATA
-- System note types, sample roots, and default presets
-- ============================================================

-- ── System Note Types ─────────────────────────────────────

-- Fusha Vocabulary Template
INSERT INTO note_types (id, user_id, name, description, language, is_system, is_default, fields, card_views, css)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    NULL,
    'Fusha Vocabulary',
    'Classical Arabic vocabulary with root, pattern, and example fields.',
    'fusha',
    TRUE,
    TRUE,
    '[
        {"name": "word", "type": "text", "required": true, "placeholder": "الكلمة", "order": 0},
        {"name": "word_no_tashkeel", "type": "text", "required": true, "order": 1},
        {"name": "root", "type": "text", "required": false, "placeholder": "ك-ت-ب", "order": 2},
        {"name": "pattern", "type": "text", "required": false, "placeholder": "فَعَلَ", "order": 3},
        {"name": "part_of_speech", "type": "select", "required": true, "options": ["noun","verb","adjective","adverb","particle","preposition"], "order": 4},
        {"name": "translation_en", "type": "text", "required": true, "placeholder": "English translation", "order": 5},
        {"name": "transliteration", "type": "text", "required": false, "order": 6},
        {"name": "plural", "type": "text", "required": false, "order": 7},
        {"name": "verb_form", "type": "select", "required": false, "options": ["I","II","III","IV","V","VI","VII","VIII","IX","X"], "order": 8},
        {"name": "example_ar", "type": "textarea", "required": false, "order": 9},
        {"name": "example_en", "type": "textarea", "required": false, "order": 10},
        {"name": "audio_url", "type": "audio", "required": false, "order": 11},
        {"name": "image_url", "type": "image", "required": false, "order": 12},
        {"name": "notes", "type": "textarea", "required": false, "order": 13}
    ]'::JSONB,
    '[
        {"name": "Arabic → English", "type": "recognition", "frontFields": ["word", "root", "audio_url", "part_of_speech"], "backFields": ["translation_en", "transliteration", "pattern", "plural", "example_ar", "example_en", "image_url", "notes"]},
        {"name": "English → Arabic", "type": "production", "frontFields": ["translation_en", "part_of_speech", "image_url"], "backFields": ["word", "audio_url", "transliteration", "root", "pattern", "example_ar", "example_en"]},
        {"name": "Listening", "type": "listening", "frontFields": ["audio_url", "part_of_speech"], "backFields": ["word", "translation_en", "transliteration", "example_ar", "example_en"]}
    ]'::JSONB,
    ''
);

-- Ammiya Vocabulary Template
INSERT INTO note_types (id, user_id, name, description, language, is_system, is_default, fields, card_views, css)
VALUES (
    '10000000-0000-0000-0000-000000000002',
    NULL,
    'Egyptian Arabic Vocabulary',
    'Egyptian Arabic (Ammiya) vocabulary with Franco-Arabic and Fusha bridge fields.',
    'ammiya',
    TRUE,
    TRUE,
    '[
        {"name": "word_ammiya", "type": "text", "required": true, "placeholder": "الكلمة بالعامية", "order": 0},
        {"name": "word_ammiya_latin", "type": "text", "required": false, "placeholder": "Franco-Arabic", "order": 1},
        {"name": "fusha_equivalent", "type": "text", "required": false, "placeholder": "الكلمة بالفصحى", "order": 2},
        {"name": "translation_en", "type": "text", "required": true, "order": 3},
        {"name": "part_of_speech", "type": "select", "required": true, "options": ["noun","verb","adjective","expression","filler","slang"], "order": 4},
        {"name": "usage_context", "type": "select", "required": false, "options": ["formal","informal","slang","vulgar"], "order": 5},
        {"name": "example_ammiya", "type": "textarea", "required": false, "order": 6},
        {"name": "example_en", "type": "textarea", "required": false, "order": 7},
        {"name": "audio_url", "type": "audio", "required": false, "order": 8},
        {"name": "cultural_note", "type": "textarea", "required": false, "order": 9}
    ]'::JSONB,
    '[
        {"name": "Egyptian → English", "type": "recognition", "frontFields": ["word_ammiya", "word_ammiya_latin", "audio_url", "usage_context"], "backFields": ["translation_en", "fusha_equivalent", "example_ammiya", "example_en", "cultural_note"]},
        {"name": "English → Egyptian", "type": "production", "frontFields": ["translation_en", "part_of_speech"], "backFields": ["word_ammiya", "word_ammiya_latin", "audio_url", "example_ammiya", "example_en"]},
        {"name": "Listening", "type": "listening", "frontFields": ["audio_url", "part_of_speech"], "backFields": ["word_ammiya", "translation_en", "word_ammiya_latin"]}
    ]'::JSONB,
    ''
);

-- Quran Vocabulary Template
INSERT INTO note_types (id, user_id, name, description, language, is_system, is_default, fields, card_views, css)
VALUES (
    '10000000-0000-0000-0000-000000000003',
    NULL,
    'Quran Vocabulary',
    'Quranic Arabic vocabulary with root, morphology, and occurrence tracking.',
    'quran',
    TRUE,
    TRUE,
    '[
        {"name": "word", "type": "text", "required": true, "order": 0},
        {"name": "root", "type": "text", "required": true, "order": 1},
        {"name": "translation_en", "type": "text", "required": true, "order": 2},
        {"name": "morphology", "type": "text", "required": false, "order": 3},
        {"name": "part_of_speech", "type": "select", "required": true, "options": ["noun","verb","particle","pronoun","proper_noun"], "order": 4},
        {"name": "occurrences", "type": "number", "required": false, "order": 5},
        {"name": "example_ayah", "type": "textarea", "required": false, "order": 6},
        {"name": "example_surah", "type": "text", "required": false, "order": 7},
        {"name": "example_ayah_num", "type": "text", "required": false, "order": 8},
        {"name": "example_translation", "type": "textarea", "required": false, "order": 9},
        {"name": "audio_url", "type": "audio", "required": false, "order": 10},
        {"name": "related_words", "type": "tags", "required": false, "order": 11}
    ]'::JSONB,
    '[
        {"name": "Arabic → English", "type": "recognition", "frontFields": ["word", "root", "audio_url"], "backFields": ["translation_en", "morphology", "occurrences", "example_ayah", "example_surah", "example_ayah_num", "example_translation"]},
        {"name": "English → Arabic", "type": "production", "frontFields": ["translation_en", "root"], "backFields": ["word", "audio_url", "morphology", "example_ayah", "example_translation"]}
    ]'::JSONB,
    ''
);

-- Spanish Vocabulary Template
INSERT INTO note_types (id, user_id, name, description, language, is_system, is_default, fields, card_views, css)
VALUES (
    '10000000-0000-0000-0000-000000000004',
    NULL,
    'Spanish Vocabulary',
    'Spanish vocabulary with gender, conjugation, and false friend tracking.',
    'spanish',
    TRUE,
    TRUE,
    '[
        {"name": "word_es", "type": "text", "required": true, "order": 0},
        {"name": "gender", "type": "select", "required": false, "options": ["masculine","feminine","neuter"], "order": 1},
        {"name": "part_of_speech", "type": "select", "required": true, "options": ["noun","verb","adjective","adverb","preposition","conjunction"], "order": 2},
        {"name": "translation_en", "type": "text", "required": true, "order": 3},
        {"name": "plural", "type": "text", "required": false, "order": 4},
        {"name": "example_es", "type": "textarea", "required": false, "order": 5},
        {"name": "example_en", "type": "textarea", "required": false, "order": 6},
        {"name": "audio_url", "type": "audio", "required": false, "order": 7},
        {"name": "image_url", "type": "image", "required": false, "order": 8},
        {"name": "false_friends", "type": "text", "required": false, "order": 9},
        {"name": "synonyms", "type": "tags", "required": false, "order": 10},
        {"name": "notes", "type": "textarea", "required": false, "order": 11}
    ]'::JSONB,
    '[
        {"name": "Spanish → English", "type": "recognition", "frontFields": ["word_es", "gender", "audio_url", "part_of_speech"], "backFields": ["translation_en", "plural", "false_friends", "example_es", "example_en", "image_url", "synonyms", "notes"]},
        {"name": "English → Spanish", "type": "production", "frontFields": ["translation_en", "part_of_speech", "image_url"], "backFields": ["word_es", "gender", "audio_url", "plural", "example_es", "example_en"]},
        {"name": "Listening", "type": "listening", "frontFields": ["audio_url", "part_of_speech"], "backFields": ["word_es", "translation_en", "example_es", "example_en"]}
    ]'::JSONB,
    ''
);

-- English Vocabulary Template
INSERT INTO note_types (id, user_id, name, description, language, is_system, is_default, fields, card_views, css)
VALUES (
    '10000000-0000-0000-0000-000000000005',
    NULL,
    'English Vocabulary',
    'English vocabulary with definitions, collocations, and word families.',
    'english',
    TRUE,
    TRUE,
    '[
        {"name": "word", "type": "text", "required": true, "order": 0},
        {"name": "pronunciation_ipa", "type": "text", "required": false, "order": 1},
        {"name": "part_of_speech", "type": "select", "required": true, "options": ["noun","verb","adjective","adverb","idiom","phrasal_verb"], "order": 2},
        {"name": "definition", "type": "textarea", "required": true, "order": 3},
        {"name": "translation_ar", "type": "text", "required": false, "order": 4},
        {"name": "example_1", "type": "textarea", "required": false, "order": 5},
        {"name": "example_2", "type": "textarea", "required": false, "order": 6},
        {"name": "audio_url", "type": "audio", "required": false, "order": 7},
        {"name": "synonyms", "type": "tags", "required": false, "order": 8},
        {"name": "antonyms", "type": "tags", "required": false, "order": 9},
        {"name": "collocations", "type": "tags", "required": false, "order": 10},
        {"name": "cefr_level", "type": "select", "required": false, "options": ["A1","A2","B1","B2","C1","C2"], "order": 11},
        {"name": "word_family", "type": "tags", "required": false, "order": 12},
        {"name": "notes", "type": "textarea", "required": false, "order": 13}
    ]'::JSONB,
    '[
        {"name": "Word → Definition", "type": "recognition", "frontFields": ["word", "pronunciation_ipa", "audio_url", "part_of_speech", "cefr_level"], "backFields": ["definition", "translation_ar", "example_1", "example_2", "synonyms", "collocations", "word_family"]},
        {"name": "Definition → Word", "type": "production", "frontFields": ["definition", "part_of_speech", "cefr_level"], "backFields": ["word", "pronunciation_ipa", "audio_url", "example_1", "synonyms"]},
        {"name": "Listening", "type": "listening", "frontFields": ["audio_url", "part_of_speech"], "backFields": ["word", "definition", "example_1"]}
    ]'::JSONB,
    ''
);

-- ── Sample Arabic Roots ───────────────────────────────────

INSERT INTO arabic_roots (root_letters, root_letters_plain, root_type, base_meaning, base_meaning_ar) VALUES
('ك-ت-ب', 'كتب', 'triliteral', 'writing, books, correspondence', 'الكتابة والمراسلة'),
('ع-ل-م', 'علم', 'triliteral', 'knowledge, learning, science', 'العلم والمعرفة'),
('ق-ر-أ', 'قرأ', 'triliteral', 'reading, recitation', 'القراءة والتلاوة'),
('ح-م-د', 'حمد', 'triliteral', 'praise, gratitude', 'الحمد والشكر'),
('س-ل-م', 'سلم', 'triliteral', 'peace, safety, submission', 'السلام والأمان'),
('ع-ب-د', 'عبد', 'triliteral', 'worship, servitude', 'العبادة'),
('ر-ح-م', 'رحم', 'triliteral', 'mercy, compassion', 'الرحمة'),
('ج-ع-ل', 'جعل', 'triliteral', 'making, placing, rendering', 'الجعل والوضع'),
('ق-و-ل', 'قول', 'triliteral', 'saying, speech', 'القول والكلام'),
('أ-م-ن', 'أمن', 'triliteral', 'safety, faith, trust', 'الأمان والإيمان');

-- ── Default Deck Presets ──────────────────────────────────

INSERT INTO deck_presets (user_id, name, description, language, is_system, settings)
VALUES
(NULL, 'Standard Arabic', 'Balanced settings for Arabic vocabulary learning', 'fusha', TRUE,
 '{"newCardsPerDay": 10, "maxReviewsPerDay": 100, "learningSteps": [1, 10, 30], "relearningSteps": [10, 30]}'::JSONB),
(NULL, 'Quran Memorization', 'Optimized for Quran ayah memorization with longer intervals', 'quran', TRUE,
 '{"newCardsPerDay": 3, "maxReviewsPerDay": 50, "learningSteps": [5, 15, 60], "relearningSteps": [15, 60]}'::JSONB),
(NULL, 'Spanish Intensive', 'Higher new card count for intensive Spanish study', 'spanish', TRUE,
 '{"newCardsPerDay": 20, "maxReviewsPerDay": 150, "learningSteps": [1, 10], "relearningSteps": [10]}'::JSONB),
(NULL, 'English Academic', 'Focused on academic English with moderate pace', 'english', TRUE,
 '{"newCardsPerDay": 8, "maxReviewsPerDay": 80, "learningSteps": [1, 10, 30], "relearningSteps": [10]}'::JSONB);
```

---

## 2.8 Development Roadmap

### 5-Phase Development Plan

The project is organized into five phases, each building on the previous one. Each phase
has clear deliverables, acceptance criteria, and estimated timelines.

### Phase 1: MVP Foundation (Weeks 1-6)

**Goal:** Core flashcard functionality with one language track (Classical Arabic / Fusha).
A single user can create, study, and review cards with FSRS scheduling.

#### Week 1-2: Project Bootstrap & Database

| Deliverable | Details |
|---|---|
| Project scaffolding | Next.js 14 project with App Router, Tailwind, TypeScript strict mode |
| Database schema | Full PostgreSQL schema deployed via Drizzle migrations |
| Docker dev environment | docker-compose with PostgreSQL 16 + Redis 7 |
| Auth system | Email/password registration and login with JWT (jose) |
| Environment config | Zod-validated env vars, .env.example |
| CI/CD pipeline | GitHub Actions: lint, type-check, test on PR |

**Acceptance Criteria:**
- `npm run dev` starts the full-stack app with hot reload
- User can register, log in, and persist a session
- Database tables created with all indexes and constraints
- All environment variables validated on startup

#### Week 3-4: Core Card Engine

| Deliverable | Details |
|---|---|
| Note type system | CRUD for note types with JSONB field definitions |
| Deck management | Create, rename, delete decks. Hierarchical folder support. |
| Entry creation | Form for adding Fusha vocabulary entries with all fields |
| Card generation | Automatic card creation from note entries (all card views) |
| FSRS integration | ts-fsrs integrated. Cards scheduled correctly. |
| Basic study session | Study due cards with "Didn't Know" / "Got It" (simple 2-button mode) |

**Acceptance Criteria:**
- User creates a Fusha vocabulary entry with word, root, translation
- System generates 3 cards (Arabic->English, English->Arabic, Listening)
- User studies a card, rates it, and the next review date updates
- FSRS scheduling produces intervals matching expected behavior

#### Week 5-6: Study UX & Polish

| Deliverable | Details |
|---|---|
| 4-button rating | Full "Didn't Know / Tough / Got It / Too Easy" with interval preview |
| Card templates | Fusha vocabulary card front/back HTML rendered correctly |
| RTL support | Arabic text displays correctly in all views |
| Audio playback | Play pronunciation audio from CDN via Web Audio API |
| Session progress | Progress bar during study session |
| Daily due count | Dashboard showing today's due cards |
| Card Library (basic) | List/search/filter all cards. Pagination. |
| Keyboard shortcuts | Space to flip, 1-4 to rate, A for audio |

**Acceptance Criteria:**
- Complete study session flow from start to "Session Complete"
- Arabic text renders RTL with correct font and line height
- Keyboard-only study workflow works end-to-end
- Card Library shows all cards with status indicators

---

### Phase 2: Multi-Language & Tags (Weeks 7-12)

**Goal:** All five language tracks functional. Full tagging system. Onboarding wizard.
Pause/Resume system.

#### Week 7-8: Remaining Language Tracks

| Deliverable | Details |
|---|---|
| Ammiya card templates | Egyptian Arabic note type, card views, CSS |
| Quran card templates | Ayah memorization, vocab, word-by-word |
| Spanish card templates | Vocabulary, conjugation table |
| English card templates | Vocabulary, idioms, word families |
| Template switching | User can select note type when creating entries |
| Language-specific fonts | Uthmanic script for Quran, Noto Naskh Arabic for other Arabic |

**Acceptance Criteria:**
- User can create entries in all 5 language tracks
- Each language has distinct visual styling and layout
- Quran cards use Uthmanic script with centered ayah display
- Spanish cards show gender badges and conjugation tables

#### Week 9-10: Tagging System

| Deliverable | Details |
|---|---|
| Tag CRUD API | Full REST API for tag creation, update, delete, hierarchy |
| Tag Manager UI | Visual tree view with drag-and-drop reordering |
| Note tagging | Add/remove tags from entries in card library and entry editor |
| Tag-based study | Create study sessions filtered by tag |
| Tag presets | Save and load tag combinations |
| Bulk tagging | Select multiple cards and apply tags |

**Acceptance Criteria:**
- Tags display in a hierarchical tree with color dots
- User can study "only verb forms" or "only Surah Al-Baqarah" via tags
- Tag presets load with one click and start a study session
- Bulk operations work on 50+ cards without performance issues

#### Week 11-12: Pause/Resume & Onboarding

| Deliverable | Details |
|---|---|
| Pause system | Manual pause, timed pause, tag-based pause, deck pause |
| Skip Until Tomorrow | Bury equivalent with automatic next-day resume |
| Auto-pause (struggling) | Cards with 8+ lapses auto-paused with notification |
| Paused Cards dashboard | View, filter, and resume paused cards |
| Cron jobs | Timed pause expiry, buried card reset, streak calculation |
| Onboarding wizard | 6-step wizard with language selection, proficiency, demo |

**Acceptance Criteria:**
- User can pause a card during study with reason tracking
- Timed pauses auto-resume at the specified time
- Paused Cards dashboard shows count by pause type
- New user completes onboarding in under 2 minutes

---

### Phase 3: Cross-Language & Advanced Study (Weeks 13-18)

**Goal:** Root linking, Fusha-Ammiya bridge, all study modes, TTS generation, and
the gamification system.

#### Week 13-14: Cross-Language Features

| Deliverable | Details |
|---|---|
| Arabic root registry | Seeded with top 500 Quranic roots |
| Root linking API | Link notes to roots across Fusha, Ammiya, and Quran |
| Root Explorer UI | Visual root family browser with mastery indicators |
| Fusha-Ammiya bridge | "See Ammiya equivalent" button during Fusha study |
| Cross-language scheduling | Root clustering and language interleaving |

**Acceptance Criteria:**
- User can browse the root for "ك-ت-ب" and see words across all 3 Arabic tracks
- During Fusha study, a bridge prompt appears for words with Ammiya equivalents
- Multi-language study sessions rotate between languages every 5 cards

#### Week 15-16: Additional Study Modes

| Deliverable | Details |
|---|---|
| Quiz mode | Multiple-choice with auto-generated distractors |
| Writing mode | Type-the-answer with fuzzy matching and character-level diff |
| Speed Round | Timed rapid-fire with streak multiplier |
| Listening mode | Audio-first study flow |
| Study mode selector | Choose mode before starting a session |
| TTS generation | Google Cloud TTS for all card audio (on-demand) |

**Acceptance Criteria:**
- Quiz mode generates 3 plausible distractors from same-tag cards
- Writing mode accepts Arabic with optional diacritics matching
- Speed Round shows per-card timer with visual countdown
- TTS generates Arabic, Spanish, and English audio on demand

#### Week 17-18: Gamification

| Deliverable | Details |
|---|---|
| Streak system | Per-language streaks with freeze protection |
| XP system | Points for reviews, completions, milestones |
| Level system | 20 levels with XP thresholds |
| Achievement badges | 20+ achievements across categories |
| Session celebration | Confetti, stats summary after completing session |
| Daily goal ring | Visual progress toward daily goal |
| Language dashboard | All languages at a glance with stats |

**Acceptance Criteria:**
- Streak counter increments on consecutive study days
- XP bar fills visually when earning points
- Level-up produces a celebration animation
- Achievement unlock triggers a toast notification with the badge
- Quran track has subdued gamification (configurable)

---

### Phase 4: Polish & Advanced Features (Weeks 19-24)

**Goal:** Import/export, PWA offline support, command palette, conversation mode,
advanced analytics, dark mode, accessibility audit.

#### Week 19-20: Data Management

| Deliverable | Details |
|---|---|
| Anki import | Import .apkg files, mapping Anki fields to our note types |
| CSV import | Bulk import from spreadsheets |
| Export | Export decks as JSON, CSV, or Anki-compatible .apkg |
| Backup/Restore | Full account data backup and restore |
| Sync | Real-time sync across devices via WebSocket |

**Acceptance Criteria:**
- User imports an Anki deck and all cards appear correctly
- CSV import handles Arabic text with diacritics without corruption
- Export produces a valid .apkg file that opens in Anki
- Changes on one device appear on another within 5 seconds

#### Week 21-22: PWA & Offline

| Deliverable | Details |
|---|---|
| PWA manifest | Installable on iOS, Android, and desktop |
| Service worker | Cache study session data for offline use |
| Offline study | Study due cards without network connection |
| Background sync | Queue reviews offline, sync when connection returns |
| Push notifications | Daily study reminders |

**Acceptance Criteria:**
- App installs from browser on mobile and desktop
- User can complete a full study session with airplane mode on
- Offline reviews sync correctly when reconnecting
- Push notification at user's chosen time reminds them to study

#### Week 23-24: Advanced Features

| Deliverable | Details |
|---|---|
| Command palette | Cmd+K search across cards, decks, tags, settings |
| Conversation mode | AI-powered conversational practice |
| Advanced analytics | Retention heatmap, FSRS parameter tuning, difficulty distribution |
| Pronunciation recording | Record and compare to reference audio |
| Dark mode | Full dark mode with smooth transition |
| Accessibility audit | WCAG 2.1 AA compliance, screen reader testing |
| Performance optimization | Lighthouse score 90+ on all metrics |

**Acceptance Criteria:**
- Command palette finds any card, deck, or tag in under 200ms
- Conversation mode generates contextual dialogues using user's vocabulary
- Dark mode toggle preserves user preference across sessions
- Screen reader can navigate the entire study flow
- Lighthouse Performance score >= 90

---

### Phase 5: Scale & Community (Weeks 25-32)

**Goal:** Public deck sharing, community features, mobile native shell, and
infrastructure for scale.

#### Week 25-28: Community & Sharing

| Deliverable | Details |
|---|---|
| Public deck gallery | Browse and download community-shared decks |
| Deck rating/reviews | Rate and review public decks |
| Deck versioning | Update shared decks with subscriber notifications |
| User profiles | Public study stats, badges, streak display |
| Leaderboards | Optional weekly/monthly leaderboards by language |
| Shared tag presets | Community-contributed tag hierarchies |

**Acceptance Criteria:**
- User publishes a deck and it appears in the public gallery
- Downloading a public deck creates a copy in the user's account
- Deck updates can be pulled by subscribers without losing their progress
- User profile shows achievement badges and streak history

#### Week 29-32: Scale & Native

| Deliverable | Details |
|---|---|
| Horizontal scaling | Multi-instance deployment with shared session store |
| Database optimization | Connection pooling (PgBouncer), read replicas |
| CDN optimization | Edge caching for audio/images globally |
| React Native shell | (Optional) Native mobile wrapper for improved offline/notifications |
| API rate limiting | Tiered rate limits for free/premium users |
| Monitoring | Application performance monitoring (APM), error tracking |
| Load testing | Validate system handles 10,000+ concurrent users |

**Acceptance Criteria:**
- System handles 10K concurrent study sessions with p99 latency < 200ms
- Audio files load in < 500ms globally via CDN
- Zero data loss during rolling deployments
- Mobile app passes iOS and Android app store review guidelines

---

### Roadmap Summary Timeline

```
Week:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25-32
       ┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
       Phase 1: MVP Foundation
                                  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
                                  Phase 2: Multi-Language & Tags
                                                               ┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
                                                               Phase 3: Cross-Language & Study Modes
                                                                                            ┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
                                                                                            Phase 4: Polish & Advanced
                                                                                                                        ┣━━━━━━━━━━━━━━━━━━┫
                                                                                                                        Phase 5: Scale
```

---

## 2.9 UI/UX Design Philosophy

### The "Stripe Meets Duolingo" Approach

Our design philosophy draws from two best-in-class product experiences:

- **Stripe**: Clean, information-dense interfaces with impeccable typography, generous
  whitespace, and a neutral color palette that lets content take center stage. Every pixel
  earns its place. Documentation-quality clarity in every screen.

- **Duolingo**: Dopamine-driven engagement loops, celebration of progress, playful
  personality without being childish, and a masterful use of color to guide attention and
  reinforce positive behaviors.

The synthesis: a study tool that feels like a premium productivity app (Stripe) but keeps
you coming back like a well-designed game (Duolingo).

### 2.9.1 Typography System

Typography is the most critical design element in a multilingual flashcard app. Arabic
script demands different treatment than Latin script, and Quranic text demands its own
reverence.

#### Font Stack

```css
/* src/styles/typography.css */

/* ── Font Imports ──────────────────────────────────────── */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/inter/InterVariable.woff2') format('woff2');
}

@font-face {
  font-family: 'Noto Naskh Arabic';
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
  src: url('/fonts/noto-naskh-arabic/NotoNaskhArabic-Variable.woff2') format('woff2');
}

@font-face {
  font-family: 'KFGQPC Uthmanic Script HAFS';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/uthmanic/UthmanicHafs.woff2') format('woff2');
}

@font-face {
  font-family: 'JetBrains Mono';
  font-style: normal;
  font-weight: 100 800;
  font-display: swap;
  src: url('/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2') format('woff2');
}
```

#### Type Scale

We use a modular type scale based on a 1.250 ratio (major third), with separate scales
for Latin and Arabic text.

```css
:root {
  /* ── Latin Type Scale (base: 16px, ratio: 1.250) ─────── */
  --text-xs:      0.75rem;     /* 12px — Metadata, timestamps */
  --text-sm:      0.875rem;    /* 14px — Secondary text, labels */
  --text-base:    1rem;        /* 16px — Body text */
  --text-lg:      1.125rem;    /* 18px — Large body, card secondary */
  --text-xl:      1.25rem;     /* 20px — Subheadings */
  --text-2xl:     1.5rem;      /* 24px — Card main text */
  --text-3xl:     1.875rem;    /* 30px — Section headings */
  --text-4xl:     2.25rem;     /* 36px — Page titles */
  --text-5xl:     3rem;        /* 48px — Hero text, celebrations */

  /* ── Arabic Type Scale (scaled up for readability) ───── */
  --text-ar-sm:   1.125rem;    /* 18px — Arabic small */
  --text-ar-base: 1.375rem;    /* 22px — Arabic body */
  --text-ar-lg:   1.75rem;     /* 28px — Arabic card main */
  --text-ar-xl:   2.25rem;     /* 36px — Arabic large display */
  --text-ar-2xl:  3rem;        /* 48px — Arabic hero */

  /* ── Quranic Type Scale (larger for reverence) ───────── */
  --text-quran-base: 1.75rem;  /* 28px — Quran body */
  --text-quran-lg:   2.25rem;  /* 36px — Quran card */
  --text-quran-xl:   3rem;     /* 48px — Quran display */

  /* ── Font Weights ────────────────────────────────────── */
  --font-light:     300;
  --font-normal:    400;
  --font-medium:    500;
  --font-semibold:  600;
  --font-bold:      700;

  /* ── Line Heights ────────────────────────────────────── */
  --leading-none:    1;
  --leading-tight:   1.25;
  --leading-snug:    1.375;
  --leading-normal:  1.5;
  --leading-relaxed: 1.625;
  --leading-loose:   2;
  --leading-arabic:  2.2;     /* Arabic needs extra line height for diacritics */
  --leading-quran:   3;       /* Quran needs generous spacing */

  /* ── Letter Spacing ──────────────────────────────────── */
  --tracking-tighter: -0.05em;
  --tracking-tight:   -0.025em;
  --tracking-normal:   0;
  --tracking-wide:     0.025em;
  --tracking-wider:    0.05em;
  --tracking-widest:   0.1em;
  --tracking-arabic:   0.02em;
}
```

#### Typography Components

```typescript
// src/components/ui/Typography.tsx

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TextProps {
  children: ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label';
}

export function PageTitle({ children, className }: TextProps) {
  return (
    <h1 className={cn(
      'text-4xl font-bold tracking-tight text-surface-900 dark:text-surface-50',
      className
    )}>
      {children}
    </h1>
  );
}

export function SectionHeading({ children, className }: TextProps) {
  return (
    <h2 className={cn(
      'text-2xl font-semibold tracking-tight text-surface-900 dark:text-surface-50',
      className
    )}>
      {children}
    </h2>
  );
}

export function CardMainText({ children, className, language }: TextProps & { language?: string }) {
  const isArabic = language === 'fusha' || language === 'ammiya' || language === 'quran';
  const isQuran = language === 'quran';

  return (
    <div
      className={cn(
        isQuran
          ? 'font-quran text-quran-lg leading-[3] text-center'
          : isArabic
            ? 'font-arabic text-ar-lg leading-[2.2] tracking-[0.02em] text-right'
            : 'font-sans text-2xl leading-relaxed text-left',
        'text-surface-900 dark:text-surface-50',
        className
      )}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {children}
    </div>
  );
}

export function SecondaryText({ children, className }: TextProps) {
  return (
    <p className={cn(
      'text-base text-surface-500 dark:text-surface-400 leading-relaxed',
      className
    )}>
      {children}
    </p>
  );
}

export function MetaText({ children, className }: TextProps) {
  return (
    <span className={cn(
      'text-xs font-medium uppercase tracking-wider text-surface-400 dark:text-surface-500',
      className
    )}>
      {children}
    </span>
  );
}
```

### 2.9.2 Color System

#### Neutral Palette

The neutral palette uses warm grays (Stone from Tailwind) for an inviting, paper-like feel.

```css
:root {
  /* ── Neutral / Surface Colors ────────────────────────── */
  --surface-50:  #FAFAF9;    /* Page background (light) */
  --surface-100: #F5F5F4;    /* Card background (light), subtle bg */
  --surface-200: #E7E5E4;    /* Borders, dividers */
  --surface-300: #D6D3D1;    /* Disabled text bg */
  --surface-400: #A8A29E;    /* Placeholder text, tertiary text */
  --surface-500: #78716C;    /* Secondary text */
  --surface-600: #57534E;    /* Primary text (light mode secondary) */
  --surface-700: #44403C;    /* Headings (light mode) */
  --surface-800: #292524;    /* Card background (dark) */
  --surface-900: #1C1917;    /* Primary text (light mode) */
  --surface-950: #0C0A09;    /* Page background (dark) */
}
```

#### Language Accent Colors

Each language track has a distinct accent color used for badges, progress indicators,
and interactive elements.

```css
:root {
  /* ── Language Accent Colors ──────────────────────────── */

  /* Fusha: Deep emerald green — scholarly, classical, prestigious */
  --fusha-50:  #ECFDF5;
  --fusha-100: #D1FAE5;
  --fusha-200: #A7F3D0;
  --fusha-300: #6EE7B7;
  --fusha-400: #34D399;
  --fusha-500: #10B981;
  --fusha-600: #059669;   /* PRIMARY */
  --fusha-700: #047857;
  --fusha-800: #065F46;
  --fusha-900: #064E3B;

  /* Ammiya: Warm orange — lively, colloquial, everyday */
  --ammiya-50:  #FFF7ED;
  --ammiya-100: #FFEDD5;
  --ammiya-200: #FED7AA;
  --ammiya-300: #FDBA74;
  --ammiya-400: #FB923C;
  --ammiya-500: #F97316;
  --ammiya-600: #EA580C;  /* PRIMARY */
  --ammiya-700: #C2410C;
  --ammiya-800: #9A3412;
  --ammiya-900: #7C2D12;

  /* Quran: Sacred dark green — reverent, distinguished */
  --quran-50:  #F0FDF4;
  --quran-100: #DCFCE7;
  --quran-200: #BBF7D0;
  --quran-300: #86EFAC;
  --quran-400: #4ADE80;
  --quran-500: #22C55E;
  --quran-600: #16A34A;
  --quran-700: #15803D;   /* PRIMARY */
  --quran-800: #166534;
  --quran-900: #14532D;

  /* Spanish: Vibrant red — passionate, energetic */
  --spanish-50:  #FEF2F2;
  --spanish-100: #FEE2E2;
  --spanish-200: #FECACA;
  --spanish-300: #FCA5A5;
  --spanish-400: #F87171;
  --spanish-500: #EF4444;
  --spanish-600: #DC2626;  /* PRIMARY */
  --spanish-700: #B91C1C;
  --spanish-800: #991B1B;
  --spanish-900: #7F1D1D;

  /* English: Trustworthy blue — academic, reliable */
  --english-50:  #EFF6FF;
  --english-100: #DBEAFE;
  --english-200: #BFDBFE;
  --english-300: #93C5FD;
  --english-400: #60A5FA;
  --english-500: #3B82F6;
  --english-600: #2563EB;  /* PRIMARY */
  --english-700: #1D4ED8;
  --english-800: #1E40AF;
  --english-900: #1E3A8A;

  /* ── Semantic Colors ─────────────────────────────────── */
  --success: #22C55E;
  --warning: #F59E0B;
  --error:   #EF4444;
  --info:    #3B82F6;
}
```

#### Dark Mode

```css
[data-theme="dark"] {
  /* Surface overrides */
  --bg-primary:     var(--surface-950);
  --bg-card:        var(--surface-800);
  --bg-card-hover:  var(--surface-700);
  --text-primary:   var(--surface-50);
  --text-secondary: var(--surface-400);
  --text-tertiary:  var(--surface-500);
  --border-default: var(--surface-700);
  --border-focus:   var(--english-500);

  /* Slightly reduce language accent intensity for dark mode */
  --fusha-600:   #0DA678;
  --ammiya-600:  #D4560A;
  --quran-700:   #1A9145;
  --spanish-600: #C92222;
  --english-600: #2158D4;

  /* Card shadow in dark mode */
  --card-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

### 2.9.3 Spacing System

Consistent spacing creates visual rhythm and hierarchy.

```css
:root {
  /* ── Spacing Scale (4px base) ────────────────────────── */
  --space-0:    0;
  --space-0.5:  0.125rem;   /* 2px */
  --space-1:    0.25rem;    /* 4px */
  --space-1.5:  0.375rem;   /* 6px */
  --space-2:    0.5rem;     /* 8px */
  --space-2.5:  0.625rem;   /* 10px */
  --space-3:    0.75rem;    /* 12px */
  --space-4:    1rem;       /* 16px */
  --space-5:    1.25rem;    /* 20px */
  --space-6:    1.5rem;     /* 24px */
  --space-8:    2rem;       /* 32px */
  --space-10:   2.5rem;     /* 40px */
  --space-12:   3rem;       /* 48px */
  --space-16:   4rem;       /* 64px */
  --space-20:   5rem;       /* 80px */
  --space-24:   6rem;       /* 96px */

  /* ── Component-Specific Spacing ──────────────────────── */
  --card-padding:       var(--space-8);     /* 32px internal padding */
  --card-gap:           var(--space-4);     /* 16px between card sections */
  --section-gap:        var(--space-6);     /* 24px between page sections */
  --page-padding-x:     var(--space-6);     /* 24px horizontal page padding */
  --page-padding-y:     var(--space-8);     /* 32px vertical page padding */
  --sidebar-width:      260px;
  --header-height:      64px;

  /* ── Max Widths ──────────────────────────────────────── */
  --max-width-card:     640px;
  --max-width-content:  960px;
  --max-width-page:     1200px;
  --max-width-wide:     1440px;

  /* ── Border Radius ───────────────────────────────────── */
  --radius-sm:    4px;
  --radius-md:    8px;
  --radius-lg:    12px;
  --radius-xl:    16px;
  --radius-2xl:   24px;
  --radius-full:  9999px;
}
```

### 2.9.4 Icon System

We use **Lucide** as our primary icon set. It provides a consistent, clean aesthetic
that matches the Stripe-like design language.

```typescript
// src/components/ui/Icon.tsx

import {
  Play, Pause, SkipForward, ChevronRight, ChevronDown, ChevronLeft,
  Plus, X, Check, Search, Settings, BookOpen, Tag, Folder,
  Star, Heart, Flame, Trophy, Zap, Volume2, VolumeX, Mic, MicOff,
  Clock, Calendar, BarChart3, TrendingUp, RefreshCw, Download, Upload,
  Edit2, Trash2, Copy, Eye, EyeOff, Moon, Sun, Keyboard, Globe,
  HelpCircle, Info, AlertTriangle, CheckCircle, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  xs: 'w-3 h-3',     // 12px
  sm: 'w-4 h-4',     // 16px
  md: 'w-5 h-5',     // 20px
  lg: 'w-6 h-6',     // 24px
  xl: 'w-8 h-8',     // 32px
};

export function Icon({ icon: IconComponent, size = 'md', className }: IconProps) {
  return <IconComponent className={cn(SIZES[size], className)} />;
}

// Language-specific icons
export const LANGUAGE_ICONS: Record<string, { icon: LucideIcon; emoji: string }> = {
  fusha:   { icon: BookOpen, emoji: '🕌' },
  ammiya:  { icon: Globe, emoji: '🇪🇬' },
  quran:   { icon: BookOpen, emoji: '📖' },
  spanish: { icon: Globe, emoji: '🇪🇸' },
  english: { icon: Globe, emoji: '🇺🇸' },
};
```

### 2.9.5 Animation System

Animations serve three purposes: provide feedback, guide attention, and reward behavior.
Every animation has a functional justification.

#### Micro-Feedback Animations

```typescript
// src/components/animations/MicroFeedback.tsx

import { motion, AnimatePresence } from 'framer-motion';

/**
 * Rating feedback: brief visual confirmation after rating a card.
 */
export function RatingFeedback({
  rating,
  show,
}: {
  rating: 'didnt_know' | 'tough' | 'got_it' | 'too_easy' | null;
  show: boolean;
}) {
  const config = {
    didnt_know: { emoji: '🔄', color: '#EF4444', label: "Didn't Know" },
    tough:      { emoji: '😤', color: '#F59E0B', label: 'Tough' },
    got_it:     { emoji: '✅', color: '#22C55E', label: 'Got It!' },
    too_easy:   { emoji: '⚡', color: '#3B82F6', label: 'Too Easy' },
  };

  if (!rating || !show) return null;
  const { emoji, color, label } = config[rating];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -20 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
      >
        <div
          className="text-center"
          style={{ color }}
        >
          <motion.div
            className="text-6xl mb-2"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5 }}
          >
            {emoji}
          </motion.div>
          <motion.div
            className="text-lg font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {label}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * XP gain animation: "+15 XP" floats up and fades.
 */
export function XPGainAnimation({ amount, show }: { amount: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -60 }}
          transition={{ duration: 1.5, times: [0, 0.2, 0.7, 1] }}
          className="fixed bottom-32 right-8 text-lg font-bold text-fusha-500 pointer-events-none z-40"
        >
          +{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Streak fire: pulsing flame on streak maintenance.
 */
export function StreakFireAnimation({ streak }: { streak: number }) {
  return (
    <motion.div
      className="inline-flex items-center gap-1"
      animate={{
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 0.6,
        repeat: 2,
        ease: 'easeInOut',
      }}
    >
      <span className="text-2xl">🔥</span>
      <span className="text-lg font-bold text-amber-500">{streak}</span>
    </motion.div>
  );
}
```

#### Card Flip Animation

```typescript
// src/components/study/CardFlip.tsx

import { motion } from 'framer-motion';
import { ReactNode, useState } from 'react';

interface CardFlipProps {
  front: ReactNode;
  back: ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
}

export function CardFlip({ front, back, isFlipped, onFlip }: CardFlipProps) {
  return (
    <div
      className="card-flip-container"
      style={{ perspective: '1200px' }}
      onClick={onFlip}
    >
      <motion.div
        className="card-flip-inner relative w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0.0, 0.2, 1], // Material Design easing
        }}
      >
        {/* Front face */}
        <div
          className="card-face absolute inset-0"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>

        {/* Back face */}
        <div
          className="card-face absolute inset-0"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
```

#### Page Transition Animations

```typescript
// src/components/layout/PageTransition.tsx

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
    },
  },
};

const childVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({ children }: { children: ReactNode }) {
  return <motion.div variants={childVariants}>{children}</motion.div>;
}
```

### 2.9.6 Dopamine Architecture

The dopamine architecture is a layered system of positive reinforcement designed to
sustain engagement over months and years of study.

#### Layer 1: Per-Card Feedback

Every card rating produces immediate visual and optional audio feedback.

| Rating | Visual | Audio | Duration |
|---|---|---|---|
| Didn't Know | Red flash, "Try again" text | Soft "whoosh" | 300ms |
| Tough | Yellow pulse, "Keep going" text | Muted click | 300ms |
| Got It | Green checkmark animation, "+15 XP" float | Satisfying "pop" | 400ms |
| Too Easy | Blue lightning bolt, "+5 XP" float | Quick "zing" | 300ms |

#### Layer 2: Progress Bar

A horizontal progress bar at the top of the study session shows how many cards remain.
The bar fills with a smooth animation on each card completion.

```typescript
// src/components/study/SessionProgress.tsx

import { motion } from 'framer-motion';

interface SessionProgressProps {
  current: number;
  total: number;
  correctCount: number;
}

export function SessionProgress({ current, total, correctCount }: SessionProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const accuracy = current > 0 ? (correctCount / current) * 100 : 0;

  return (
    <div className="session-progress">
      {/* Card count */}
      <div className="flex items-center justify-between text-sm text-surface-500 mb-2">
        <span>{current} / {total} cards</span>
        <span>{Math.round(accuracy)}% accuracy</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, var(--fusha-500), var(--fusha-400))`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1], // Spring-like overshoot
          }}
        />
      </div>

      {/* Milestone dots */}
      <div className="relative mt-1" style={{ height: '4px' }}>
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={`absolute top-0 w-1 h-1 rounded-full ${
              percentage >= milestone
                ? 'bg-fusha-500'
                : 'bg-surface-300 dark:bg-surface-600'
            }`}
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </div>
  );
}
```

#### Layer 3: Session Celebration

When a study session is complete, a full-screen celebration appears with session stats,
XP earned, and streak information.

```typescript
// src/components/study/SessionComplete.tsx

import { motion } from 'framer-motion';
import { Trophy, Flame, Zap, Star, Clock } from 'lucide-react';

interface SessionStats {
  totalCards: number;
  correctCards: number;
  toughCards: number;
  incorrectCards: number;
  streakDays: number;
  xpEarned: number;
  timeSpentMinutes: number;
  newMilestone: string | null;
  accuracy: number;
}

export function SessionComplete({ stats, onClose }: {
  stats: SessionStats;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', damping: 20 }}
        className="bg-white dark:bg-surface-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {stats.accuracy >= 90 ? '🎉' : stats.accuracy >= 70 ? '👏' : '💪'}
          </motion.div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {stats.accuracy >= 90
              ? 'Outstanding!'
              : stats.accuracy >= 70
                ? 'Great work!'
                : 'Keep it up!'}
          </h2>
          <p className="text-surface-500 mt-1">Session complete</p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard
            icon={<Star className="w-5 h-5 text-fusha-500" />}
            value={`${stats.accuracy}%`}
            label="Accuracy"
            delay={0.3}
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-amber-500" />}
            value={`+${stats.xpEarned}`}
            label="XP Earned"
            delay={0.4}
          />
          <StatCard
            icon={<Trophy className="w-5 h-5 text-purple-500" />}
            value={stats.totalCards.toString()}
            label="Cards Studied"
            delay={0.5}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            value={`${stats.timeSpentMinutes}m`}
            label="Time Spent"
            delay={0.6}
          />
        </div>

        {/* Streak */}
        {stats.streakDays > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-50 dark:bg-amber-950 rounded-xl mb-6"
          >
            <Flame className="w-6 h-6 text-amber-500" />
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {stats.streakDays} day streak!
            </span>
          </motion.div>
        )}

        {/* Action button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onClose}
          className="w-full py-3 px-6 bg-surface-900 dark:bg-surface-50 text-white dark:text-surface-900 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          Continue
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon,
  value,
  label,
  delay,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700 rounded-xl"
    >
      {icon}
      <div>
        <div className="text-lg font-bold text-surface-900 dark:text-surface-50">
          {value}
        </div>
        <div className="text-xs text-surface-500">{label}</div>
      </div>
    </motion.div>
  );
}
```

#### Layer 4: Streak System

See Section 2.6.6 for the full streak implementation. The visual streak indicator appears
in the dashboard header and animates on daily login.

#### Layer 5: XP & Leveling

See Section 2.6.6 for XP rewards and level thresholds. The XP bar appears in the
sidebar/header and fills smoothly with each earned point.

#### Layer 6: Achievement Badges

See Section 2.6.6 for the full achievement list. Unlocked achievements appear as a toast
notification with the badge icon and a brief animation.

#### Layer 7: Sound Design

```typescript
// src/lib/sounds.ts

const SOUNDS = {
  card_flip:        '/audio/ui/card-flip.mp3',
  rating_correct:   '/audio/ui/correct-pop.mp3',
  rating_incorrect: '/audio/ui/soft-whoosh.mp3',
  rating_tough:     '/audio/ui/muted-click.mp3',
  rating_easy:      '/audio/ui/quick-zing.mp3',
  xp_gain:          '/audio/ui/xp-chime.mp3',
  level_up:         '/audio/ui/level-up-fanfare.mp3',
  achievement:      '/audio/ui/achievement-unlock.mp3',
  streak:           '/audio/ui/streak-fire.mp3',
  session_complete: '/audio/ui/session-complete.mp3',
  button_tap:       '/audio/ui/button-tap.mp3',
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  async play(sound: keyof typeof SOUNDS): Promise<void> {
    if (!this.enabled || !this.audioContext) return;

    const url = SOUNDS[sound];
    let buffer = this.bufferCache.get(url);

    if (!buffer) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, buffer);
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = this.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }
}

export const soundManager = new SoundManager();
```

### 2.9.7 Key Screen Layouts

#### Dashboard Screen

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │ Logo     │  Dashboard              🔥 12 day streak    [⚙]    │
│ └──────────┘                                                     │
│ ┌──────┐ ─────────────────────────────────────────────────────── │
│ │      │  ┌─────────────────────────────────────────────────────┐│
│ │ 📚   │  │  Good afternoon, Israa!                             ││
│ │ Dash  │  │                                                     ││
│ │      │  │  ┌─── Today's Goal ──────┐  ┌─── Quick Start ─────┐││
│ │ 📖   │  │  │    ╭──────╮           │  │                      │││
│ │ Study │  │  │    │ 23/30│ cards    │  │  ▶ Study Fusha (12) │││
│ │      │  │  │    │  77% │           │  │  ▶ Study Quran (8)  │││
│ │ 🗃   │  │  │    ╰──────╯           │  │  ▶ Study Spanish(5) │││
│ │ Lib   │  │  │  15 min of 20 min    │  │  ▶ Custom Session   │││
│ │      │  │  └───────────────────────┘  └──────────────────────┘││
│ │ 🏷   │  │                                                     ││
│ │ Tags  │  │  ┌─── Your Languages ──────────────────────────────┐││
│ │      │  │  │  ┌─ Fusha ──┐ ┌─ Quran ──┐ ┌─ Spanish ─┐       │││
│ │ 📊   │  │  │  │ 🟢      │ │ 🟢       │ │ 🔴        │       │││
│ │ Prog  │  │  │  │ 12 due  │ │ 8 due    │ │ 5 due     │       │││
│ │      │  │  │  │ 85% acc  │ │ 92% acc  │ │ 78% acc   │       │││
│ │ ⚙   │  │  │  │ L4 ████░│ │ L3 ███░░│ │ L2 ██░░░ │       │││
│ │ Set   │  │  │  └─────────┘ └──────────┘ └───────────┘       │││
│ │      │  │  └──────────────────────────────────────────────────┘││
│ └──────┘  │                                                     ││
│           │  ┌─── Weekly Activity ──────────────────────────────┐││
│           │  │  M   T   W   T   F   S   S                      │││
│           │  │  █   █   █   ▓   █   ░   ░    This week: 142    │││
│           │  │  ██  █   ██  █   ██  ░   ░    cards reviewed    │││
│           │  └──────────────────────────────────────────────────┘││
│           └─────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

#### Study Screen

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ← Back to Deck          8 / 25 cards         [⏸ Pause] [⏭ Skip]│
│  ┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┐ │
│  ┃████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┃ │
│  └━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘ │
│                                                                  │
│                                                                  │
│            ┌────────────────────────────────┐                    │
│            │          الفصحى                │                    │
│            │                                │                    │
│            │                                │                    │
│            │         كَتَبَ                 │                    │
│            │                                │                    │
│            │         ك-ت-ب                  │                    │
│            │                                │                    │
│            │         🔊  verb               │                    │
│            │                                │                    │
│            │                                │                    │
│            │   ┌────────────────────────┐   │                    │
│            │   │    Show Answer         │   │                    │
│            │   │    (Space / Enter)     │   │                    │
│            │   └────────────────────────┘   │                    │
│            │                                │                    │
│            └────────────────────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Keyboard: [Space] Show Answer  [P] Pause  [S] Skip  [A] Audio│
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

After revealing the answer:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ← Back to Deck          8 / 25 cards         [⏸ Pause] [⏭ Skip]│
│  ┌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┐ │
│  ┃████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░┃ │
│  └━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┘ │
│                                                                  │
│            ┌────────────────────────────────┐                    │
│            │        كَتَبَ                  │                    │
│            │        ─────────               │                    │
│            │                                │                    │
│            │   to write                     │                    │
│            │   /kataba/                      │                    │
│            │                                │                    │
│            │   Pattern: فَعَلَ   Root: ك-ت-ب │                    │
│            │   Plural: —                    │                    │
│            │                                │                    │
│            │   ─────────                    │                    │
│            │   كَتَبَ الطالِبُ رِسالَةً      │                    │
│            │   The student wrote a letter.  │                    │
│            │                                │                    │
│            └────────────────────────────────┘                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  ❌ Didn't Know    😤 Tough       ✅ Got It     ⚡ Too Easy  ││
│  │     (10 min)        (1 day)        (3 days)      (7 days)   ││
│  │     [1]             [2]            [3]           [4]        ││
│  │                                                              ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

#### Card Library (Browser) Screen

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                     │
│ │ Logo     │  Card Library                        [+ New Entry]  │
│ └──────────┘                                                     │
│ ┌──────┐ ─────────────────────────────────────────────────────── │
│ │      │  ┌─────────────────────────────────────────────────────┐│
│ │ Side │  │ 🔍 Search cards...              [Filters ▼]         ││
│ │ bar  │  │                                                     ││
│ │      │  │ Showing 247 of 1,203 cards                          ││
│ │      │  │                                                     ││
│ │      │  │ ┌─ Language ─┐ ┌─ Status ─┐ ┌─ Tags ──────────────┐││
│ │      │  │ │ All ▼      │ │ All ▼    │ │ grammar, verbs ✕    │││
│ │      │  │ └────────────┘ └──────────┘ └──────────────────────┘││
│ │      │  │                                                     ││
│ │      │  │ ┌───┬──────────────┬─────────┬────────┬──────┬─────┐││
│ │      │  │ │ ☐ │ Entry        │ Status  │ Due    │ Tags │ ... │││
│ │      │  │ ├───┼──────────────┼─────────┼────────┼──────┼─────┤││
│ │      │  │ │ ☐ │ 🟢 كَتَبَ     │ Review  │ Today  │ verb │ ... │││
│ │      │  │ │ ☐ │ 🟢 مَدرَسَة   │ Review  │ 2 days │ noun │ ... │││
│ │      │  │ │ ☐ │ 🟠 hablar    │ Unseen  │ —      │ verb │ ... │││
│ │      │  │ │ ☐ │ 🟠 إزّاي     │ In Prog │ Today  │ expr │ ... │││
│ │      │  │ │ ☐ │ ⏸ كَيْفَ     │ Paused  │ —      │ part │ ... │││
│ │      │  │ │ ☐ │ 🔵 eloquent  │ Mastered│ 45 days│ acad │ ... │││
│ │      │  │ │   │              │         │        │      │     │││
│ │      │  │ └───┴──────────────┴─────────┴────────┴──────┴─────┘││
│ │      │  │                                                     ││
│ │      │  │ ◀  Page 1 of 13  ▶      Selected: 0 [Actions ▼]    ││
│ │      │  └─────────────────────────────────────────────────────┘│
│ └──────┘                                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 2.9.8 Responsive Design Breakpoints

```css
/* ── Responsive Breakpoints ────────────────────────────── */

/* Mobile first: base styles are mobile */

/* sm: Small tablets and large phones (640px+) */
@media (min-width: 640px) {
  .study-card {
    max-width: 480px;
    padding: var(--space-6);
  }
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* md: Tablets (768px+) */
@media (min-width: 768px) {
  .study-card {
    max-width: 560px;
    padding: var(--space-8);
  }
  .sidebar {
    display: flex;
    width: var(--sidebar-width);
  }
  .card-library-table {
    display: table; /* Switch from cards to table layout */
  }
}

/* lg: Laptops (1024px+) */
@media (min-width: 1024px) {
  .study-card {
    max-width: var(--max-width-card);
  }
  .dashboard-grid {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .page-content {
    max-width: var(--max-width-content);
  }
}

/* xl: Desktops (1280px+) */
@media (min-width: 1280px) {
  .page-content {
    max-width: var(--max-width-page);
  }
}

/* 2xl: Large desktops (1536px+) */
@media (min-width: 1536px) {
  .page-content {
    max-width: var(--max-width-wide);
  }
}
```

### 2.9.9 Accessibility Specifications

| Requirement | Implementation |
|---|---|
| Color contrast | All text meets WCAG AA (4.5:1 normal, 3:1 large). Language accent colors tested against both light and dark backgrounds. |
| Focus indicators | 2px solid outline with 2px offset. Uses `focus-visible` to only show for keyboard navigation. |
| Touch targets | Minimum 44x44px for all interactive elements. Rating buttons are 60px tall minimum on mobile. |
| Screen reader | All cards have `aria-label` with full content. Rating buttons have `aria-description` with interval preview. Study progress announced via `aria-live="polite"`. |
| Keyboard navigation | Full study session navigable by keyboard. Tab order follows logical reading order. Escape closes modals. |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables all animations. Card flip becomes instant show/hide. Confetti disabled. |
| RTL support | Arabic content uses `dir="rtl"` and `lang="ar"`. Mixed-direction content uses `unicode-bidi: isolate`. |
| Font scaling | All text sizes use `rem` units. Tested up to 200% browser zoom. |

```css
/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Focus visible */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* High contrast mode */
@media (forced-colors: active) {
  .card {
    border: 2px solid CanvasText;
  }
  .language-badge {
    border: 1px solid CanvasText;
  }
  .progress-bar-fill {
    background: Highlight;
  }
}
```

### 2.9.10 Design Token Summary (CSS Custom Properties Master File)

```css
/* src/styles/tokens.css — Complete Design Token Reference */

:root {
  /* ── Typography ──────────────────────────────────────── */
  --font-sans:    'Inter', system-ui, -apple-system, sans-serif;
  --font-arabic:  'Noto Naskh Arabic', 'Amiri', serif;
  --font-quran:   'KFGQPC Uthmanic Script HAFS', 'Amiri Quran', serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  /* ── Surfaces ────────────────────────────────────────── */
  --bg-primary:     #FAFAF9;
  --bg-card:        #FFFFFF;
  --bg-card-hover:  #F5F5F4;
  --bg-overlay:     rgba(12, 10, 9, 0.5);

  /* ── Text ────────────────────────────────────────────── */
  --text-primary:   #1C1917;
  --text-secondary: #57534E;
  --text-tertiary:  #A8A29E;
  --text-inverse:   #FAFAF9;

  /* ── Borders ─────────────────────────────────────────── */
  --border-default: #E7E5E4;
  --border-hover:   #D6D3D1;
  --border-focus:   #3B82F6;

  /* ── Shadows ─────────────────────────────────────────── */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-xl:  0 16px 48px rgba(0, 0, 0, 0.16);

  /* ── Transitions ─────────────────────────────────────── */
  --transition-fast:    150ms ease;
  --transition-normal:  250ms ease;
  --transition-slow:    400ms ease;
  --ease-spring:        cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-material:      cubic-bezier(0.4, 0.0, 0.2, 1);

  /* ── Z-Index Scale ───────────────────────────────────── */
  --z-base:      0;
  --z-dropdown:  10;
  --z-sticky:    20;
  --z-overlay:   30;
  --z-modal:     40;
  --z-toast:     50;
  --z-tooltip:   60;
}
```

---

*End of Part 2: Multilingual Flashcard System Design & Implementation*

*This document serves as the complete implementation blueprint for building a flashcard
system that is purpose-built for multilingual learners, more user-friendly than Anki, and
designed with the care and polish of a modern SaaS product.*

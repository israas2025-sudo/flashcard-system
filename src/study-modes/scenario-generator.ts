/**
 * scenario-generator.ts -- Generate contextual conversation scenarios
 * using vocabulary from due flashcards.
 *
 * Creates real-world situation prompts for sentence building practice
 * in Arabic, Spanish, and English. Selects vocabulary from the user's
 * cards that are due for review.
 */

import { Card } from '@/scheduling/types';
import { Scenario, WordBankItem } from './types';

// ---------------------------------------------------------------------------
// Scenario templates by language and topic
// ---------------------------------------------------------------------------

interface ScenarioTemplate {
  language: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  promptTemplate: string;
  modelAnswerTemplate: string;
  modelAnswerTranslation: string;
  requiredWordCount: number;
}

const ARABIC_SCENARIOS: ScenarioTemplate[] = [
  {
    language: 'arabic',
    topic: 'greetings',
    difficulty: 'beginner',
    promptTemplate: 'You meet a new colleague at work. Introduce yourself and ask their name.',
    modelAnswerTemplate: '\u0645\u0631\u062d\u0628\u0627\u060c \u0623\u0646\u0627 \u0627\u0633\u0645\u064a {name}. \u0645\u0627 \u0627\u0633\u0645\u0643\u061f',
    modelAnswerTranslation: 'Hello, my name is {name}. What is your name?',
    requiredWordCount: 3,
  },
  {
    language: 'arabic',
    topic: 'restaurant',
    difficulty: 'beginner',
    promptTemplate: 'You are at a restaurant in Cairo. Order a coffee and ask for the menu.',
    modelAnswerTemplate: '\u0645\u0646 \u0641\u0636\u0644\u0643\u060c \u0623\u0631\u064a\u062f \u0642\u0647\u0648\u0629. \u0647\u0644 \u0639\u0646\u062f\u0643\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0637\u0639\u0627\u0645\u061f',
    modelAnswerTranslation: 'Please, I want a coffee. Do you have the food menu?',
    requiredWordCount: 4,
  },
  {
    language: 'arabic',
    topic: 'shopping',
    difficulty: 'intermediate',
    promptTemplate: 'You are at a market. Ask how much the oranges cost and if they have apples.',
    modelAnswerTemplate: '\u0628\u0643\u0645 \u0627\u0644\u0628\u0631\u062a\u0642\u0627\u0644\u061f \u0648\u0647\u0644 \u0639\u0646\u062f\u0643\u0645 \u062a\u0641\u0627\u062d\u061f',
    modelAnswerTranslation: 'How much are the oranges? And do you have apples?',
    requiredWordCount: 3,
  },
  {
    language: 'arabic',
    topic: 'directions',
    difficulty: 'intermediate',
    promptTemplate: 'You are lost in a city. Ask someone how to get to the nearest library.',
    modelAnswerTemplate: '\u0639\u0641\u0648\u0627\u060c \u0643\u064a\u0641 \u0623\u0630\u0647\u0628 \u0625\u0644\u0649 \u0623\u0642\u0631\u0628 \u0645\u0643\u062a\u0628\u0629\u061f',
    modelAnswerTranslation: 'Excuse me, how do I go to the nearest library?',
    requiredWordCount: 4,
  },
  {
    language: 'arabic',
    topic: 'weather',
    difficulty: 'advanced',
    promptTemplate: 'Describe today\'s weather and suggest what your friend should wear.',
    modelAnswerTemplate: '\u0627\u0644\u0637\u0642\u0633 \u062d\u0627\u0631 \u0627\u0644\u064a\u0648\u0645. \u0623\u0646\u0635\u062d\u0643 \u0623\u0646 \u062a\u0644\u0628\u0633 \u0645\u0644\u0627\u0628\u0633 \u062e\u0641\u064a\u0641\u0629.',
    modelAnswerTranslation: 'The weather is hot today. I advise you to wear light clothes.',
    requiredWordCount: 5,
  },
];

const SPANISH_SCENARIOS: ScenarioTemplate[] = [
  {
    language: 'spanish',
    topic: 'greetings',
    difficulty: 'beginner',
    promptTemplate: 'You meet someone at a party. Greet them and ask where they are from.',
    modelAnswerTemplate: '\u00a1Hola! \u00bfC\u00f3mo est\u00e1s? \u00bfDe d\u00f3nde eres?',
    modelAnswerTranslation: 'Hi! How are you? Where are you from?',
    requiredWordCount: 3,
  },
  {
    language: 'spanish',
    topic: 'restaurant',
    difficulty: 'beginner',
    promptTemplate: 'You are at a caf\u00e9. Order a drink and ask for the bill.',
    modelAnswerTemplate: 'Me gustar\u00eda un caf\u00e9, por favor. \u00bfMe trae la cuenta?',
    modelAnswerTranslation: 'I would like a coffee, please. Can you bring me the bill?',
    requiredWordCount: 4,
  },
  {
    language: 'spanish',
    topic: 'shopping',
    difficulty: 'intermediate',
    promptTemplate: 'You are in a bookstore. Ask if they have a specific book and how much it costs.',
    modelAnswerTemplate: '\u00bfTienen el libro "Cien a\u00f1os de soledad"? \u00bfCu\u00e1nto cuesta?',
    modelAnswerTranslation: 'Do you have the book "One Hundred Years of Solitude"? How much does it cost?',
    requiredWordCount: 4,
  },
  {
    language: 'spanish',
    topic: 'travel',
    difficulty: 'intermediate',
    promptTemplate: 'You are at an airport. Ask where the departure gate is and what time the flight leaves.',
    modelAnswerTemplate: '\u00bfD\u00f3nde est\u00e1 la puerta de embarque? \u00bfA qu\u00e9 hora sale el vuelo?',
    modelAnswerTranslation: 'Where is the boarding gate? What time does the flight leave?',
    requiredWordCount: 5,
  },
  {
    language: 'spanish',
    topic: 'daily_life',
    difficulty: 'advanced',
    promptTemplate: 'Describe your daily routine in the morning to a new roommate.',
    modelAnswerTemplate: 'Me despierto a las siete, desayuno y luego voy al trabajo en autob\u00fas.',
    modelAnswerTranslation: 'I wake up at seven, have breakfast, and then go to work by bus.',
    requiredWordCount: 6,
  },
];

const ENGLISH_SCENARIOS: ScenarioTemplate[] = [
  {
    language: 'english',
    topic: 'academic',
    difficulty: 'intermediate',
    promptTemplate: 'You are giving a presentation. Introduce your topic and state your thesis.',
    modelAnswerTemplate: 'Today I will be discussing the impact of technology on education. My thesis is that digital tools enhance learning outcomes.',
    modelAnswerTranslation: '',
    requiredWordCount: 5,
  },
  {
    language: 'english',
    topic: 'professional',
    difficulty: 'advanced',
    promptTemplate: 'Write an email to your professor requesting an extension on your assignment.',
    modelAnswerTemplate: 'Dear Professor, I am writing to request a brief extension on the upcoming assignment due to unforeseen circumstances. I would greatly appreciate your consideration.',
    modelAnswerTranslation: '',
    requiredWordCount: 6,
  },
];

const ALL_SCENARIOS = [...ARABIC_SCENARIOS, ...SPANISH_SCENARIOS, ...ENGLISH_SCENARIOS];

export class ScenarioGenerator {
  /**
   * Generate a contextual scenario using vocabulary from due cards.
   *
   * @param language The target language.
   * @param cards    Available cards (ideally due for review).
   * @param topic    Optional topic filter.
   * @returns        A Scenario object with prompt, model answer, and vocabulary.
   */
  generateScenario(language: string, cards: Card[], topic?: string): Scenario {
    // Filter scenarios by language
    let candidates = ALL_SCENARIOS.filter(
      (s) => s.language === language.toLowerCase()
    );

    // Filter by topic if provided
    if (topic) {
      const topicFiltered = candidates.filter(
        (s) => s.topic === topic.toLowerCase()
      );
      if (topicFiltered.length > 0) {
        candidates = topicFiltered;
      }
    }

    // Fall back to all scenarios if no match
    if (candidates.length === 0) {
      candidates = ALL_SCENARIOS;
    }

    // Pick a random scenario
    const template = candidates[Math.floor(Math.random() * candidates.length)];

    // Extract vocabulary from available cards
    const vocabWords = cards.slice(0, template.requiredWordCount).map((c) => c.front);

    return {
      prompt: template.promptTemplate,
      topic: template.topic,
      difficulty: template.difficulty,
      modelAnswer: template.modelAnswerTemplate.replace('{name}', 'Ahmad'),
      modelAnswerTranslation: template.modelAnswerTranslation.replace('{name}', 'Ahmad'),
      requiredVocabulary: vocabWords,
    };
  }

  /**
   * Create a word bank from the given cards for sentence building.
   *
   * @param cards Cards to extract words from.
   * @param limit Maximum number of word bank items.
   * @returns     Array of WordBankItem objects.
   */
  getWordBank(cards: Card[], limit: number = 12): WordBankItem[] {
    const selected = this.shuffle(cards).slice(0, limit);

    return selected.map((card) => ({
      id: `wb-${card.id}`,
      word: card.front,
      translation: card.back,
      cardId: card.id,
      isUsed: false,
    }));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

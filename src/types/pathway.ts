import type { LanguageId } from "@/store/user-preferences-store";

// ---------------------------------------------------------------------------
// Pathway sections
// ---------------------------------------------------------------------------

export interface PathwaySection {
  id: string;
  languageId: LanguageId;
  title: string;
  description: string;
  topics: string[];
  cardIds: string[];
  estimatedMinutes: number;
  order: number;
  status: "locked" | "active" | "completed" | "review";
  benchmarkPassed: boolean | null;
}

export interface LearningPathway {
  id: string;
  languageId: LanguageId;
  sections: PathwaySection[];
  generatedAt: number;
  totalEstimatedHours: number;
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

export interface BenchmarkQuestion {
  id: string;
  sectionId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedCardId?: string;
}

export interface BenchmarkResult {
  sectionId: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  timestamp: number;
  questions: BenchmarkQuestion[];
  userAnswers: number[];
}

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  pathwayChange?: {
    type: "reorder" | "add" | "remove" | "modify";
    sectionIds: string[];
  };
}

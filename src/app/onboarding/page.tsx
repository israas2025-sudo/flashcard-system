"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Lock,
  Check,
  Sparkles,
  CheckCircle2,
  Clock,
  Target,
  Loader2,
  Brain,
  MessageSquare,
  BookOpenCheck,
  ChevronDown,
  Globe,
  Star,
} from "lucide-react";
import {
  useUserPreferencesStore,
  type LanguageId,
  type LanguagePreference,
  type Intention,
  type Stage,
} from "@/store/user-preferences-store";
import { usePathwayStore } from "@/store/pathway-store";
import { LANGUAGE_CARD_COUNTS } from "@/lib/language-stats";
import { getTopicsForLanguage } from "@/lib/topics";
import { getCardsForLanguage } from "@/lib/language-stats";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OnboardingLangId = "arabic" | "egyptian" | "spanish" | "shami" | "urdu" | "french";
type ArabicSubtab = "msa" | "quran";
type ProficiencyLevel = "beginner" | "intermediate" | "advanced";
type DailyCards = 5 | 10 | 20 | 30;

interface LanguageConfig {
  id: OnboardingLangId;
  label: string;
  subtitle: string;
  accent: string;
  gradient: string;
  available: boolean;
  badge?: string;
  cardCount: number;
  icon: string;
}

interface LanguageSelection {
  id: OnboardingLangId;
  level: ProficiencyLevel;
  dailyCards: DailyCards;
  selectedTopics: string[];
  arabicSubtabs?: ArabicSubtab[]; // only for arabic
}

interface SuggestedTopic {
  id: string;
  name: string;
  reason: string;
  accepted: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;

const LANGUAGES: LanguageConfig[] = [
  {
    id: "arabic",
    label: "Arabic",
    subtitle: "MSA & Quranic Arabic",
    accent: "#14B8A6",
    gradient: "linear-gradient(135deg, #14B8A6, #0D9488)",
    available: true,
    cardCount: LANGUAGE_CARD_COUNTS.arabic + LANGUAGE_CARD_COUNTS.quran,
    icon: "🕌",
  },
  {
    id: "egyptian",
    label: "Egyptian Arabic",
    subtitle: "Masri / عامية مصرية",
    accent: "#8B5CF6",
    gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    available: true,
    cardCount: LANGUAGE_CARD_COUNTS.egyptian,
    icon: "🏛️",
  },
  {
    id: "spanish",
    label: "Spanish",
    subtitle: "Español",
    accent: "#F97316",
    gradient: "linear-gradient(135deg, #F97316, #EA580C)",
    available: true,
    cardCount: LANGUAGE_CARD_COUNTS.spanish,
    icon: "🌺",
  },
  {
    id: "shami",
    label: "Levantine Arabic",
    subtitle: "Shami / شامي",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg, #6B7280, #4B5563)",
    available: false,
    badge: "Coming Soon",
    cardCount: 0,
    icon: "🏔️",
  },
  {
    id: "urdu",
    label: "Urdu",
    subtitle: "اردو",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg, #6B7280, #4B5563)",
    available: false,
    badge: "Coming Soon",
    cardCount: 0,
    icon: "📿",
  },
  {
    id: "french",
    label: "French",
    subtitle: "Français",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg, #6B7280, #4B5563)",
    available: false,
    badge: "Coming Soon",
    cardCount: 0,
    icon: "🗼",
  },
];

const LEVELS: { value: ProficiencyLevel; label: string; emoji: string }[] = [
  { value: "beginner", label: "Beginner", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate", emoji: "🌿" },
  { value: "advanced", label: "Advanced", emoji: "🌳" },
];

const DAILY_CARD_OPTIONS: DailyCards[] = [5, 10, 20, 30];

const TIME_OPTIONS = [
  { mins: 5, label: "5 min", desc: "Quick review" },
  { mins: 10, label: "10 min", desc: "Light session" },
  { mins: 15, label: "15 min", desc: "Balanced" },
  { mins: 20, label: "20 min", desc: "Focused" },
  { mins: 30, label: "30 min", desc: "Deep dive" },
  { mins: 45, label: "45 min", desc: "Intensive" },
  { mins: 60, label: "60 min", desc: "Full session" },
];

const STAGE_OPTIONS: { value: Stage; label: string; desc: string; emoji: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Just starting my journey", emoji: "🌱" },
  { value: "elementary", label: "Elementary", desc: "Know the alphabet & basics", emoji: "📖" },
  { value: "intermediate", label: "Intermediate", desc: "Can hold conversations", emoji: "💬" },
  { value: "advanced", label: "Advanced", desc: "Refining & mastering", emoji: "🎓" },
];

const INTENTION_OPTIONS: { value: Intention; label: string; icon: React.ReactNode; desc: string; gradient: string }[] = [
  {
    value: "fluency",
    label: "Full Fluency",
    icon: <Brain className="w-6 h-6" />,
    desc: "Complete mastery — reading, writing, speaking, and listening",
    gradient: "linear-gradient(135deg, #635BFF, #7C3AED)",
  },
  {
    value: "understanding",
    label: "Understanding",
    icon: <BookOpenCheck className="w-6 h-6" />,
    desc: "Reading and listening comprehension focus",
    gradient: "linear-gradient(135deg, #14B8A6, #0EA5E9)",
  },
  {
    value: "conversational",
    label: "Conversational",
    icon: <MessageSquare className="w-6 h-6" />,
    desc: "Everyday speaking ability for real interactions",
    gradient: "linear-gradient(135deg, #F59E0B, #F97316)",
  },
];

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    filter: "blur(4px)",
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ---------------------------------------------------------------------------
// Floating Orbs Background
// ---------------------------------------------------------------------------

function FloatingOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(20,184,166,0.08) 0%, transparent 70%)",
          top: "-10%",
          right: "-10%",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(99,91,255,0.06) 0%, transparent 70%)",
          bottom: "-5%",
          left: "-10%",
        }}
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 20, -10, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
          top: "40%",
          left: "30%",
        }}
        animate={{
          x: [0, 20, -15, 0],
          y: [0, -15, 20, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// OnboardingPage
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useUserPreferencesStore((s) => s.completeOnboarding);
  const setPathway = usePathwayStore((s) => s.setPathway);
  const setIsGenerating = usePathwayStore((s) => s.setIsGenerating);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Wizard state
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState(15);
  const [stage, setStage] = useState<Stage>("beginner");
  const [intention, setIntention] = useState<Intention>("understanding");
  const [selections, setSelections] = useState<LanguageSelection[]>([]);
  const [expandedLang, setExpandedLang] = useState<OnboardingLangId | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<Record<string, SuggestedTopic[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Helpers
  const isSelected = (id: OnboardingLangId) => selections.some((s) => s.id === id);
  const getSelection = (id: OnboardingLangId) => selections.find((s) => s.id === id);

  const toggleLanguage = (lang: LanguageConfig) => {
    if (isSelected(lang.id)) {
      setSelections((prev) => prev.filter((s) => s.id !== lang.id));
      if (expandedLang === lang.id) setExpandedLang(null);
    } else {
      const newSel: LanguageSelection = {
        id: lang.id,
        level: "beginner",
        dailyCards: 20,
        selectedTopics: [],
      };
      if (lang.id === "arabic") {
        newSel.arabicSubtabs = ["msa", "quran"]; // both on by default
      }
      setSelections((prev) => [...prev, newSel]);
      setExpandedLang(lang.id);
    }
  };

  const toggleArabicSubtab = (subtab: ArabicSubtab) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== "arabic") return s;
        const tabs = s.arabicSubtabs || ["msa", "quran"];
        const has = tabs.includes(subtab);
        // Don't allow deselecting the last one
        if (has && tabs.length <= 1) return s;
        const updated = has ? tabs.filter((t) => t !== subtab) : [...tabs, subtab];
        return { ...s, arabicSubtabs: updated };
      })
    );
  };

  const updateLevel = (id: OnboardingLangId, level: ProficiencyLevel) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, level } : s)));
  };

  const updateDailyCards = (id: OnboardingLangId, dailyCards: DailyCards) => {
    setSelections((prev) => prev.map((s) => (s.id === id ? { ...s, dailyCards } : s)));
  };

  const toggleTopic = (langId: OnboardingLangId, topicId: string) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== langId) return s;
        const topics = s.selectedTopics.includes(topicId)
          ? s.selectedTopics.filter((t) => t !== topicId)
          : [...s.selectedTopics, topicId];
        return { ...s, selectedTopics: topics };
      })
    );
  };

  const toggleAllTopics = (langId: OnboardingLangId, allTopicIds: string[]) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.id !== langId) return s;
        const allSelected = allTopicIds.every((t) => s.selectedTopics.includes(t));
        return { ...s, selectedTopics: allSelected ? [] : [...allTopicIds] };
      })
    );
  };

  // Fetch AI topic suggestions when entering step 5
  const fetchSuggestions = useCallback(async () => {
    if (loadingSuggestions) return;
    setLoadingSuggestions(true);

    const newSuggestions: Record<string, SuggestedTopic[]> = {};

    // Expand arabic selections into their store IDs for API calls
    for (const sel of selections) {
      const storeIds = getStoreIdsForSelection(sel);
      for (const storeId of storeIds) {
        try {
          const topics = getTopicsForLanguage(storeId);
          const allTopicIds = topics.map((t) => t.id);
          const langName = storeId === "quran" ? "Quranic Arabic" : storeId === "arabic" ? "Arabic MSA" : LANGUAGES.find((l) => l.id === sel.id)?.label || sel.id;

          const res = await fetch("/api/ai/suggest-topics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              languageId: storeId,
              languageName: langName,
              intention,
              stage,
              selectedTopics: sel.selectedTopics,
              allTopicIds,
            }),
          });
          const data = await res.json();
          const key = sel.id === "arabic" ? `${sel.id}-${storeId}` : sel.id;
          newSuggestions[key] = (data.suggestedTopics || []).map((t: { id: string; name: string; reason: string }) => ({
            ...t,
            accepted: false,
          }));
        } catch {
          // ignore
        }
      }
    }

    setSuggestedTopics(newSuggestions);
    setLoadingSuggestions(false);
  }, [selections, intention, stage, loadingSuggestions]);

  // Navigation
  const canGoNext = useCallback(() => {
    switch (step) {
      case 0: return true;
      case 1: return true;
      case 2: return intention !== null;
      case 3: return selections.length > 0;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  }, [step, selections, intention]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1 && canGoNext()) {
      setDirection(1);
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep === 5) {
        fetchSuggestions();
      }
    }
  }, [step, canGoNext, fetchSuggestions]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  // Complete onboarding
  const handleComplete = useCallback(async () => {
    setLoading(true);

    try {
      // Add accepted suggestions
      const finalSelections = selections.map((sel) => {
        const accepted: string[] = [];
        if (sel.id === "arabic") {
          const storeIds = getStoreIdsForSelection(sel);
          for (const storeId of storeIds) {
            const key = `${sel.id}-${storeId}`;
            (suggestedTopics[key] || []).filter((s) => s.accepted).forEach((s) => accepted.push(s.id));
          }
        } else {
          (suggestedTopics[sel.id] || []).filter((s) => s.accepted).forEach((s) => accepted.push(s.id));
        }
        return {
          ...sel,
          selectedTopics: Array.from(new Set([...sel.selectedTopics, ...accepted])),
        };
      });

      // Build LanguagePreference array — Arabic is ONE entry (MSA + Quran combined)
      const languages: LanguagePreference[] = finalSelections.map((sel) => ({
        id: sel.id as LanguageId,
        level: sel.level,
        dailyCards: sel.dailyCards,
        selectedTopics: sel.selectedTopics,
      }));

      completeOnboarding({ languages, intention, stage, dailyTimeMinutes });

      if (typeof window !== "undefined") {
        localStorage.removeItem("zaytuna-onboarding");
      }

      // Generate pathways — all in PARALLEL for speed
      setIsGenerating(true);

      await Promise.all(
        languages.map(async (lang) => {
          const langName = lang.id === "arabic" ? "Arabic" : lang.id === "egyptian" ? "Egyptian Arabic" : "Spanish";
          const cards = getCardsForLanguage(lang.id);

          // Send a small sample — AI only needs enough to assign card IDs to sections
          const cardSummaries = cards.slice(0, 50).map((c) => ({
            id: c.id,
            front: c.front,
            back: c.back,
            tags: c.tags || [],
          }));

          try {
            const res = await fetch("/api/ai/generate-pathway", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                languageId: lang.id,
                languageName: langName,
                intention,
                stage,
                dailyTimeMinutes,
                selectedTopics: lang.selectedTopics,
                availableCards: cardSummaries,
              }),
            });
            const data = await res.json();

            if (data.sections) {
              setPathway(lang.id, {
                id: `pathway-${lang.id}-${Date.now()}`,
                languageId: lang.id,
                sections: data.sections,
                generatedAt: Date.now(),
                totalEstimatedHours: data.totalEstimatedHours || 0,
              });
            }
          } catch (err) {
            console.error(`Failed to generate pathway for ${lang.id}:`, err);
          }
        })
      );

      setIsGenerating(false);
      router.push("/");
    } catch (error) {
      console.error("Onboarding save failed:", error);
      setLoading(false);
    }
  }, [selections, suggestedTopics, completeOnboarding, intention, stage, dailyTimeMinutes, setPathway, setIsGenerating, router]);

  const stepLabels = ["Welcome", "Schedule", "Goal", "Languages", "Topics", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--surface-0)" }}>
      <FloatingOrbs />

      {/* Top Bar — Clean minimal */}
      <div className="relative z-10 flex items-center justify-between px-6 h-14 backdrop-blur-sm" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C12 2 9 6 7 10C5 14 6 18 8 20C10 22 14 22 16 20C18 18 19 14 17 10C15 6 12 2 12 2Z" fill="rgba(255,255,255,0.9)" />
            </svg>
          </div>
          <span className="font-semibold text-[14px] text-[var(--text-primary)] tracking-tight">Zaytuna</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                height: 6,
                width: i === step ? 24 : i < step ? 6 : 6,
                background: i === step
                  ? "linear-gradient(90deg, #14B8A6, #635BFF)"
                  : i < step
                    ? "#14B8A6"
                    : "var(--surface-3)",
                opacity: i <= step ? 1 : 0.4,
              }}
              layout
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          ))}
        </div>

        <span className="text-[11px] text-[var(--text-tertiary)] font-medium tracking-wide uppercase min-w-[60px] text-right">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial={mounted ? "enter" : false}
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && <WelcomeStep />}
              {step === 1 && (
                <TimeStageStep
                  dailyTimeMinutes={dailyTimeMinutes}
                  setDailyTimeMinutes={setDailyTimeMinutes}
                  stage={stage}
                  setStage={setStage}
                />
              )}
              {step === 2 && (
                <IntentionStep intention={intention} setIntention={setIntention} />
              )}
              {step === 3 && (
                <LanguageStep
                  selections={selections}
                  expandedLang={expandedLang}
                  setExpandedLang={setExpandedLang}
                  isSelected={isSelected}
                  getSelection={getSelection}
                  toggleLanguage={toggleLanguage}
                  toggleArabicSubtab={toggleArabicSubtab}
                  updateLevel={updateLevel}
                  updateDailyCards={updateDailyCards}
                />
              )}
              {step === 4 && (
                <TopicStep
                  selections={selections}
                  toggleTopic={toggleTopic}
                  toggleAllTopics={toggleAllTopics}
                />
              )}
              {step === 5 && (
                <ReviewStep
                  selections={selections}
                  suggestedTopics={suggestedTopics}
                  setSuggestedTopics={setSuggestedTopics}
                  loadingSuggestions={loadingSuggestions}
                  intention={intention}
                  stage={stage}
                  dailyTimeMinutes={dailyTimeMinutes}
                  loading={loading}
                  onGetStarted={handleComplete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation — Premium glass bar */}
      <div className="relative z-10 backdrop-blur-xl" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {step < TOTAL_STEPS - 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 max-w-2xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={goBack}
              disabled={step === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                step === 0
                  ? "text-[var(--text-tertiary)] cursor-not-allowed opacity-30"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 8px 30px rgba(20,184,166,0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={goNext}
              disabled={!canGoNext()}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                canGoNext()
                  ? "text-white shadow-lg"
                  : "bg-[var(--surface-2)] text-[var(--text-tertiary)] cursor-not-allowed"
              }`}
              style={canGoNext() ? { background: "linear-gradient(135deg, #14B8A6, #0D9488)" } : undefined}
            >
              {step === 0 ? "Get Started" : "Continue"}
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        )}

        {step === TOTAL_STEPS - 1 && !loading && (
          <div className="flex items-center justify-center px-6 py-3.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper — get store IDs for a selection
// ---------------------------------------------------------------------------

function getStoreIdsForSelection(sel: LanguageSelection): LanguageId[] {
  if (sel.id === "arabic") {
    const subtabs = sel.arabicSubtabs || ["msa", "quran"];
    const ids: LanguageId[] = [];
    if (subtabs.includes("msa")) ids.push("arabic");
    if (subtabs.includes("quran")) ids.push("quran");
    return ids;
  }
  return [sel.id as LanguageId];
}

// ---------------------------------------------------------------------------
// Step 0 — Welcome
// ---------------------------------------------------------------------------

function WelcomeStep() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center text-center py-6 space-y-8"
    >
      {/* Hero icon with glow */}
      <motion.div variants={fadeUp} className="relative">
        <div
          className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
          style={{ background: "linear-gradient(135deg, #14B8A6, #635BFF)", transform: "scale(1.5)" }}
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
        >
          <span className="text-white font-bold text-3xl" style={{ fontFamily: "'Amiri', serif" }}>ز</span>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-3 max-w-lg">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          Welcome to Zaytuna
        </h1>
        <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          Your AI designs a personalized learning pathway — visualized in an immersive 3D world unique to each language.
        </p>
      </motion.div>

      {/* Feature pills */}
      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2.5">
        {[
          { label: "AI-Powered Pathway", icon: <Sparkles className="w-3 h-3" /> },
          { label: "3D Immersive Worlds", icon: <Globe className="w-3 h-3" /> },
          { label: "Smart Benchmarks", icon: <Target className="w-3 h-3" /> },
          { label: "FSRS-5 Algorithm", icon: <Star className="w-3 h-3" /> },
        ].map((feature, i) => (
          <motion.span
            key={feature.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.08 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-secondary)",
            }}
          >
            <span className="text-[#14B8A6]">{feature.icon}</span>
            {feature.label}
          </motion.span>
        ))}
      </motion.div>

      {/* Preview cards */}
      <motion.div variants={fadeUp} className="flex gap-3 mt-4">
        {[
          { label: "Desert Oasis", color: "#F59E0B", desc: "Arabic" },
          { label: "Ancient Nile", color: "#8B5CF6", desc: "Egyptian" },
          { label: "Garden Path", color: "#F97316", desc: "Spanish" },
        ].map((world, i) => (
          <motion.div
            key={world.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.1 }}
            className="w-28 rounded-xl p-3 text-center"
            style={{
              background: `linear-gradient(180deg, ${world.color}12, ${world.color}06)`,
              border: `1px solid ${world.color}20`,
            }}
          >
            <div className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${world.color}20` }}>
              <Globe className="w-4 h-4" style={{ color: world.color }} />
            </div>
            <p className="text-[11px] font-semibold text-[var(--text-primary)]">{world.label}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">{world.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Time & Stage
// ---------------------------------------------------------------------------

function TimeStageStep({
  dailyTimeMinutes,
  setDailyTimeMinutes,
  stage,
  setStage,
}: {
  dailyTimeMinutes: number;
  setDailyTimeMinutes: (v: number) => void;
  stage: Stage;
  setStage: (v: Stage) => void;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-10">
      <motion.div variants={fadeUp} className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(99,91,255,0.1))" }}>
          <Clock className="w-5 h-5 text-[#14B8A6]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Your learning schedule</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">We&apos;ll tailor your daily pathway to fit your time</p>
      </motion.div>

      {/* Time selector */}
      <motion.div variants={fadeUp}>
        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Daily study time</p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {TIME_OPTIONS.map((opt) => {
            const active = dailyTimeMinutes === opt.mins;
            return (
              <motion.button
                key={opt.mins}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDailyTimeMinutes(opt.mins)}
                className="relative rounded-xl p-3 text-center transition-all duration-200"
                style={{
                  background: active ? "linear-gradient(135deg, #14B8A6, #0D9488)" : "var(--surface-1)",
                  border: active ? "1px solid transparent" : "1px solid var(--surface-3)",
                  boxShadow: active ? "0 4px 20px rgba(20,184,166,0.25)" : "none",
                }}
              >
                <p className={`text-base font-bold ${active ? "text-white" : "text-[var(--text-primary)]"}`}>
                  {opt.mins}
                </p>
                <p className={`text-[10px] mt-0.5 ${active ? "text-white/70" : "text-[var(--text-tertiary)]"}`}>
                  min
                </p>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Stage selector */}
      <motion.div variants={fadeUp}>
        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Current level</p>
        <div className="grid grid-cols-2 gap-3">
          {STAGE_OPTIONS.map((opt) => {
            const active = stage === opt.value;
            return (
              <motion.button
                key={opt.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStage(opt.value)}
                className="relative rounded-xl p-4 text-left transition-all duration-200"
                style={{
                  background: active ? "rgba(20,184,166,0.08)" : "var(--surface-1)",
                  border: active ? "2px solid #14B8A6" : "1px solid var(--surface-3)",
                  boxShadow: active ? "0 0 0 1px rgba(20,184,166,0.1)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{opt.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-[#14B8A6]" : "text-[var(--text-primary)]"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{opt.desc}</p>
                  </div>
                </div>
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Intention
// ---------------------------------------------------------------------------

function IntentionStep({
  intention,
  setIntention,
}: {
  intention: Intention;
  setIntention: (v: Intention) => void;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp} className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))" }}>
          <Target className="w-5 h-5 text-[#F59E0B]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">What&apos;s your goal?</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          This shapes your AI-designed 3D pathway — sections, pacing, and benchmarks all adapt
        </p>
      </motion.div>

      <div className="max-w-md mx-auto space-y-3">
        {INTENTION_OPTIONS.map((opt, i) => {
          const active = intention === opt.value;
          return (
            <motion.button
              key={opt.value}
              variants={fadeUp}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIntention(opt.value)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200"
              style={{
                background: active ? `${opt.gradient.split(",")[1]?.replace(")", "")}10` : "var(--surface-1)",
                border: active ? "2px solid" : "1px solid var(--surface-3)",
                borderColor: active ? opt.gradient.split(",")[1]?.replace(")", "").trim() : undefined,
                boxShadow: active ? `0 4px 20px ${opt.gradient.split(",")[1]?.replace(")", "")}20` : "none",
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: active ? opt.gradient : "var(--surface-2)",
                  color: active ? "white" : "var(--text-tertiary)",
                }}
              >
                {opt.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${active ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1 leading-relaxed">{opt.desc}</p>
              </div>
              {active && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                  <CheckCircle2 className="w-5 h-5 text-[#14B8A6] flex-shrink-0" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Language Selection (MSA + Quran merged into Arabic)
// ---------------------------------------------------------------------------

function LanguageStep({
  selections,
  expandedLang,
  setExpandedLang,
  isSelected,
  getSelection,
  toggleLanguage,
  toggleArabicSubtab,
  updateLevel,
  updateDailyCards,
}: {
  selections: LanguageSelection[];
  expandedLang: OnboardingLangId | null;
  setExpandedLang: (id: OnboardingLangId | null) => void;
  isSelected: (id: OnboardingLangId) => boolean;
  getSelection: (id: OnboardingLangId) => LanguageSelection | undefined;
  toggleLanguage: (lang: LanguageConfig) => void;
  toggleArabicSubtab: (subtab: ArabicSubtab) => void;
  updateLevel: (id: OnboardingLangId, level: ProficiencyLevel) => void;
  updateDailyCards: (id: OnboardingLangId, dailyCards: DailyCards) => void;
}) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,91,255,0.1))" }}>
          <Globe className="w-5 h-5 text-[#8B5CF6]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Choose your languages</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">Each language gets its own immersive 3D world</p>
      </motion.div>

      <div className="space-y-3">
        {LANGUAGES.map((lang, index) => {
          const selected = isSelected(lang.id);
          const locked = !lang.available;
          const expanded = expandedLang === lang.id && selected;
          const sel = getSelection(lang.id);

          return (
            <motion.div
              key={lang.id}
              variants={fadeUp}
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: selected ? `${lang.accent}06` : "var(--surface-1)",
                border: selected ? `2px solid ${lang.accent}` : "1px solid var(--surface-3)",
                boxShadow: selected ? `0 4px 20px ${lang.accent}15` : "none",
                opacity: locked ? 0.5 : 1,
              }}
            >
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  if (selected) {
                    if (expanded) toggleLanguage(lang);
                    else setExpandedLang(lang.id);
                  } else {
                    toggleLanguage(lang);
                  }
                }}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{
                    background: locked ? "var(--surface-2)" : selected ? lang.gradient : `${lang.accent}12`,
                  }}
                >
                  {locked ? <Lock className="w-5 h-5 text-[var(--text-tertiary)]" /> : (
                    <span className={selected ? "grayscale-0" : ""}>{lang.icon}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`block font-semibold text-[14px] ${locked ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                    {lang.label}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)] block mt-0.5">
                    {lang.badge || `${lang.subtitle} · ${lang.cardCount.toLocaleString()} cards`}
                  </span>
                </div>
                {!locked && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: selected ? lang.accent : "transparent",
                      border: selected ? "none" : "2px solid var(--surface-3)",
                    }}
                  >
                    {selected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </motion.div>
                    )}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {expanded && sel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 space-y-4" style={{ borderTop: `1px solid ${lang.accent}15` }}>
                      {/* Arabic subtab selector */}
                      {lang.id === "arabic" && (
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5">Arabic tracks</p>
                          <div className="flex gap-2">
                            {([
                              { id: "msa" as ArabicSubtab, label: "Modern Standard", desc: `${LANGUAGE_CARD_COUNTS.arabic} cards`, color: "#F59E0B" },
                              { id: "quran" as ArabicSubtab, label: "Quranic Arabic", desc: `${LANGUAGE_CARD_COUNTS.quran} cards`, color: "#14B8A6" },
                            ]).map((tab) => {
                              const active = (sel.arabicSubtabs || ["msa", "quran"]).includes(tab.id);
                              return (
                                <motion.button
                                  key={tab.id}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={(e) => { e.stopPropagation(); toggleArabicSubtab(tab.id); }}
                                  className="flex-1 rounded-xl p-3 text-left transition-all duration-200"
                                  style={{
                                    background: active ? `${tab.color}12` : "var(--surface-0)",
                                    border: active ? `2px solid ${tab.color}60` : "1px solid var(--surface-3)",
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <p className={`text-[12px] font-semibold ${active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                                      {tab.label}
                                    </p>
                                    <div
                                      className="w-4 h-4 rounded-md flex items-center justify-center"
                                      style={{
                                        background: active ? tab.color : "transparent",
                                        border: active ? "none" : "1.5px solid var(--surface-3)",
                                      }}
                                    >
                                      {active && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                  </div>
                                  <p className="text-[10px] text-[var(--text-tertiary)]">{tab.desc}</p>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Level */}
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Level</p>
                        <div className="flex gap-2">
                          {LEVELS.map((lvl) => (
                            <button
                              key={lvl.value}
                              onClick={(e) => { e.stopPropagation(); updateLevel(lang.id, lvl.value); }}
                              className="flex-1 py-2 rounded-lg text-[12px] font-medium transition-all duration-200"
                              style={{
                                background: sel.level === lvl.value ? lang.accent : "var(--surface-0)",
                                color: sel.level === lvl.value ? "white" : "var(--text-secondary)",
                                border: sel.level === lvl.value ? "none" : "1px solid var(--surface-3)",
                              }}
                            >
                              {lvl.emoji} {lvl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Daily cards */}
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Cards per day</p>
                        <div className="flex gap-2">
                          {DAILY_CARD_OPTIONS.map((num) => (
                            <button
                              key={num}
                              onClick={(e) => { e.stopPropagation(); updateDailyCards(lang.id, num); }}
                              className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all duration-200"
                              style={{
                                background: sel.dailyCards === num ? lang.accent : "var(--surface-0)",
                                color: sel.dailyCards === num ? "white" : "var(--text-secondary)",
                                border: sel.dailyCards === num ? "none" : "1px solid var(--surface-3)",
                              }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Topic Selection
// ---------------------------------------------------------------------------

function TopicStep({
  selections,
  toggleTopic,
  toggleAllTopics,
}: {
  selections: LanguageSelection[];
  toggleTopic: (langId: OnboardingLangId, topicId: string) => void;
  toggleAllTopics: (langId: OnboardingLangId, allTopicIds: string[]) => void;
}) {
  // Expand arabic selection into its sub-sections for topic display
  const topicSections: { key: string; langId: OnboardingLangId; storeId: LanguageId; label: string; accent: string }[] = [];
  for (const sel of selections) {
    const lang = LANGUAGES.find((l) => l.id === sel.id);
    if (!lang) continue;
    if (sel.id === "arabic") {
      const subtabs = sel.arabicSubtabs || ["msa", "quran"];
      if (subtabs.includes("msa")) {
        topicSections.push({ key: "arabic-msa", langId: "arabic", storeId: "arabic", label: "Arabic MSA", accent: "#F59E0B" });
      }
      if (subtabs.includes("quran")) {
        topicSections.push({ key: "arabic-quran", langId: "arabic", storeId: "quran", label: "Quranic Arabic", accent: "#14B8A6" });
      }
    } else {
      topicSections.push({ key: sel.id, langId: sel.id, storeId: sel.id as LanguageId, label: lang.label, accent: lang.accent });
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp} className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(239,68,68,0.1))" }}>
          <BookOpen className="w-5 h-5 text-[#EC4899]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pick your interests</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">Choose topics to focus your AI pathway on</p>
      </motion.div>

      {topicSections.map((section) => {
        const sel = selections.find((s) => s.id === section.langId);
        if (!sel) return null;
        const topics = getTopicsForLanguage(section.storeId);
        const allTopicIds = topics.map((t) => t.id);
        const allSelected = allTopicIds.length > 0 && allTopicIds.every((t) => sel.selectedTopics.includes(t));

        return (
          <motion.div key={section.key} variants={fadeUp}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${section.accent}15` }}>
                  <BookOpen className="w-3.5 h-3.5" style={{ color: section.accent }} />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{section.label}</h3>
                  <p className="text-[10px] text-[var(--text-tertiary)]">
                    {sel.selectedTopics.filter((t) => topics.some((tp) => tp.id === t)).length} of {topics.length} selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleAllTopics(section.langId, allTopicIds)}
                className="text-[11px] font-medium px-3 py-1 rounded-lg transition-colors"
                style={{
                  color: section.accent,
                  background: `${section.accent}08`,
                  border: `1px solid ${section.accent}20`,
                }}
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {topics.map((topic) => {
                const isActive = sel.selectedTopics.includes(topic.id);
                return (
                  <motion.button
                    key={topic.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleTopic(section.langId, topic.id)}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: isActive ? `${section.accent}08` : "var(--surface-1)",
                      border: isActive ? `1.5px solid ${section.accent}50` : "1px solid var(--surface-3)",
                    }}
                  >
                    <span className="text-base flex-shrink-0">{topic.icon}</span>
                    <p className={`text-[11px] font-medium truncate ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                      {topic.name}
                    </p>
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 ml-auto" style={{ color: section.accent }} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Review & Launch
// ---------------------------------------------------------------------------

function ReviewStep({
  selections,
  suggestedTopics,
  setSuggestedTopics,
  loadingSuggestions,
  intention,
  stage,
  dailyTimeMinutes,
  loading,
  onGetStarted,
}: {
  selections: LanguageSelection[];
  suggestedTopics: Record<string, SuggestedTopic[]>;
  setSuggestedTopics: React.Dispatch<React.SetStateAction<Record<string, SuggestedTopic[]>>>;
  loadingSuggestions: boolean;
  intention: Intention;
  stage: Stage;
  dailyTimeMinutes: number;
  loading: boolean;
  onGetStarted: () => void;
}) {
  const toggleSuggestion = (key: string, topicId: string) => {
    setSuggestedTopics((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((t) =>
        t.id === topicId ? { ...t, accepted: !t.accepted } : t
      ),
    }));
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 space-y-6"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl" style={{ background: "linear-gradient(135deg, #14B8A6, #635BFF)", opacity: 0.3, transform: "scale(2)" }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Building your 3D pathway...</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            Our AI is crafting a personalized learning world with themed landscapes, interactive sections, and smart benchmarks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selections.map((sel) => {
            const lang = LANGUAGES.find((l) => l.id === sel.id);
            return (
              <motion.div
                key={sel.id}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: selections.indexOf(sel) * 0.3 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: `${lang?.accent}20` }}
              >
                {lang?.icon}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp} className="text-center">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ background: "linear-gradient(135deg, #14B8A6, #635BFF)", transform: "scale(2)" }} />
          <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Review & launch</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          Your AI will create an immersive 3D pathway for each language
        </p>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}>
          <p className="text-xl font-bold text-[var(--text-primary)]">{dailyTimeMinutes}m</p>
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mt-0.5">daily</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}>
          <p className="text-xl font-bold text-[var(--text-primary)] capitalize">{stage}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mt-0.5">level</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}>
          <p className="text-xl font-bold text-[var(--text-primary)] capitalize">{intention}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wide mt-0.5">goal</p>
        </div>
      </motion.div>

      {/* AI Suggestions */}
      {Object.keys(suggestedTopics).length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-[#635BFF]" />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">AI Suggested Topics</span>
          </div>
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Getting personalized suggestions...
            </div>
          ) : (
            Object.entries(suggestedTopics).map(([key, suggestions]) => {
              if (suggestions.length === 0) return null;
              return (
                <div key={key} className="mb-3">
                  <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{key.replace("-", " · ")}</p>
                  <div className="space-y-1.5">
                    {suggestions.map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => toggleSuggestion(key, sug.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: sug.accepted ? "rgba(99,91,255,0.06)" : "var(--surface-1)",
                          border: sug.accepted ? "1.5px solid rgba(99,91,255,0.3)" : "1px solid var(--surface-3)",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: sug.accepted ? "#635BFF" : "transparent",
                            border: sug.accepted ? "none" : "1.5px solid var(--surface-3)",
                          }}
                        >
                          {sug.accepted && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[12px] font-medium text-[var(--text-primary)]">{sug.name}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{sug.reason}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* Language summary */}
      <motion.div variants={fadeUp} className="space-y-2">
        {selections.map((sel, i) => {
          const lang = LANGUAGES.find((l) => l.id === sel.id);
          if (!lang) return null;
          return (
            <motion.div
              key={sel.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3.5 p-3.5 rounded-xl"
              style={{ background: "var(--surface-1)", border: "1px solid var(--surface-3)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: lang.gradient }}
              >
                <span className="drop-shadow-sm">{lang.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-[var(--text-primary)] truncate">{lang.label}</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {sel.level.charAt(0).toUpperCase() + sel.level.slice(1)} · {sel.dailyCards} cards/day
                  {sel.id === "arabic" && sel.arabicSubtabs && (
                    <> · {sel.arabicSubtabs.map((t) => t === "msa" ? "MSA" : "Quran").join(" + ")}</>
                  )}
                  {sel.selectedTopics.length > 0 && <> · {sel.selectedTopics.length} topics</>}
                </p>
              </div>
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: lang.accent }}>
                <Check className="w-3 h-3 text-white" />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Launch button */}
      <motion.div variants={fadeUp} className="flex justify-center pt-2">
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: "0 12px 40px rgba(20,184,166,0.35)" }}
          whileTap={{ scale: 0.97 }}
          onClick={onGetStarted}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-[14px] font-semibold text-white shadow-lg transition-all duration-200"
          style={{ background: "linear-gradient(135deg, #14B8A6, #0D9488)" }}
        >
          <Sparkles className="w-4 h-4" />
          Generate My 3D Pathway
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

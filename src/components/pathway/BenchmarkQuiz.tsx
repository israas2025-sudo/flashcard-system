"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { usePathwayStore } from "@/store/pathway-store";
import type { BenchmarkQuestion, PathwaySection } from "@/types/pathway";
import type { LanguageId } from "@/store/user-preferences-store";

interface BenchmarkQuizProps {
  section: PathwaySection;
  languageId: LanguageId;
  onClose: () => void;
  onPass: () => void;
  accentColor: string;
}

type Phase = "loading" | "quiz" | "results";

export default function BenchmarkQuiz({
  section,
  languageId,
  onClose,
  onPass,
  accentColor,
}: BenchmarkQuizProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<BenchmarkQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mounted, setMounted] = useState(false);

  const addBenchmarkResult = usePathwayStore((s) => s.addBenchmarkResult);
  const updateSectionStatus = usePathwayStore((s) => s.updateSectionStatus);

  useEffect(() => { setMounted(true); }, []);

  // Fetch benchmark questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch("/api/ai/generate-benchmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId: section.id,
            sectionTitle: section.title,
            cards: section.cardIds.slice(0, 50).map((id) => ({
              front: id,
              back: "",
            })),
          }),
        });
        const data = await response.json();
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setPhase("quiz");
        } else {
          // Fallback: generate simple questions
          setQuestions([
            {
              id: "fallback-1",
              sectionId: section.id,
              question: `Review question for ${section.title}`,
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctIndex: 0,
              explanation: "This section needs more cards to generate a proper benchmark.",
            },
          ]);
          setPhase("quiz");
        }
      } catch {
        setPhase("quiz");
        setQuestions([
          {
            id: "error-1",
            sectionId: section.id,
            question: "Could not load benchmark. Try again later.",
            options: ["OK"],
            correctIndex: 0,
            explanation: "",
          },
        ]);
      }
    }
    loadQuestions();
  }, [section]);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQuestion?.correctIndex;

  const handleAnswer = useCallback(
    (index: number) => {
      if (selectedAnswer !== null) return;
      setSelectedAnswer(index);
      setShowExplanation(true);
    },
    [selectedAnswer]
  );

  const handleNext = useCallback(() => {
    const newAnswers = [...answers, selectedAnswer!];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Calculate results
      const score = newAnswers.filter(
        (a, i) => a === questions[i].correctIndex
      ).length;
      const passed = score / questions.length >= 0.7;

      addBenchmarkResult({
        sectionId: section.id,
        score,
        totalQuestions: questions.length,
        passed,
        timestamp: Date.now(),
        questions,
        userAnswers: newAnswers,
      });

      if (passed) {
        updateSectionStatus(languageId, section.id, "completed");
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: [accentColor, "#22C55E", "#FFD700"],
        });
      }

      setPhase("results");
    }
  }, [
    answers,
    selectedAnswer,
    currentIndex,
    questions,
    section,
    languageId,
    addBenchmarkResult,
    updateSectionStatus,
    accentColor,
  ]);

  const score = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
  const passed = questions.length > 0 && score / questions.length >= 0.7;

  return (
    <motion.div
      initial={mounted ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5, 8, 18, 0.95)",
        backdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <motion.div
        initial={mounted ? { scale: 0.9, y: 20 } : false}
        animate={{ scale: 1, y: 0 }}
        style={{
          width: "100%",
          maxWidth: 600,
          borderRadius: 20,
          background: "rgba(15, 20, 40, 0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, marginBottom: 4 }}>
              Benchmark
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
              {section.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block", marginBottom: 16 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${accentColor}30`, borderTopColor: accentColor }} />
            </motion.div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
              Generating questions...
            </div>
          </div>
        )}

        {/* Quiz */}
        {phase === "quiz" && currentQuestion && (
          <div style={{ padding: "24px" }}>
            {/* Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 2, background: accentColor }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>
                {currentIndex + 1}/{questions.length}
              </span>
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={mounted ? { opacity: 0, x: 20 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <p style={{ fontSize: 16, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.5, marginBottom: 20 }}>
                  {currentQuestion.question}
                </p>

                {/* Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {currentQuestion.options.map((option, i) => {
                    const isSelected = selectedAnswer === i;
                    const isCorrectOption = i === currentQuestion.correctIndex;
                    const showResult = selectedAnswer !== null;

                    let bg = "rgba(255,255,255,0.04)";
                    let borderColor = "rgba(255,255,255,0.08)";
                    if (showResult) {
                      if (isCorrectOption) {
                        bg = "rgba(34,197,94,0.1)";
                        borderColor = "rgba(34,197,94,0.4)";
                      } else if (isSelected && !isCorrectOption) {
                        bg = "rgba(239,68,68,0.1)";
                        borderColor = "rgba(239,68,68,0.4)";
                      }
                    } else if (isSelected) {
                      bg = `${accentColor}15`;
                      borderColor = `${accentColor}50`;
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={selectedAnswer !== null}
                        style={{
                          padding: "12px 16px",
                          borderRadius: 12,
                          border: `1px solid ${borderColor}`,
                          background: bg,
                          color: "#FFFFFF",
                          fontSize: 14,
                          textAlign: "left",
                          cursor: selectedAnswer !== null ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: `1px solid ${borderColor}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 600,
                            flexShrink: 0,
                            color: showResult && isCorrectOption ? "#22C55E" : showResult && isSelected ? "#EF4444" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {showResult && isCorrectOption ? (
                            <CheckCircle2 size={16} />
                          ) : showResult && isSelected ? (
                            <XCircle size={16} />
                          ) : (
                            String.fromCharCode(65 + i)
                          )}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanation && currentQuestion.explanation && (
                  <motion.div
                    initial={mounted ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 16,
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: isCorrect ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      border: `1px solid ${isCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      lineHeight: 1.5,
                    }}
                  >
                    {currentQuestion.explanation}
                  </motion.div>
                )}

                {/* Next button */}
                {selectedAnswer !== null && (
                  <motion.button
                    initial={mounted ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleNext}
                    style={{
                      marginTop: 20,
                      width: "100%",
                      padding: "12px",
                      borderRadius: 12,
                      border: "none",
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {currentIndex < questions.length - 1 ? (
                      <>Next <ArrowRight size={16} /></>
                    ) : (
                      "See Results"
                    )}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Results */}
        {phase === "results" && (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <motion.div
              initial={mounted ? { scale: 0 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 200 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              {passed ? (
                <Trophy size={36} style={{ color: "#22C55E" }} />
              ) : (
                <AlertTriangle size={36} style={{ color: "#EF4444" }} />
              )}
            </motion.div>

            <h3 style={{ fontSize: 24, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>
              {passed ? "Congratulations!" : "Keep Practicing"}
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>
              You scored {score} out of {questions.length} ({Math.round((score / questions.length) * 100)}%)
            </p>

            {passed ? (
              <p style={{ fontSize: 13, color: "#22C55E", marginBottom: 24 }}>
                You&apos;ve passed! The next section is now unlocked.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
                You need 70% to pass. Review the cards and try again with new questions.
              </p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {passed ? (
                <button
                  onClick={() => {
                    onPass();
                    onClose();
                  }}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #22C55E, #16A34A)",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Continue
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Review Cards
                  </button>
                  <button
                    onClick={() => {
                      setPhase("loading");
                      setCurrentIndex(0);
                      setAnswers([]);
                      setSelectedAnswer(null);
                      // Re-trigger question fetch
                      window.location.reload();
                    }}
                    style={{
                      padding: "12px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}CC)`,
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RotateCcw size={14} />
                    Retake
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

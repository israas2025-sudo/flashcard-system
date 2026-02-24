"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import { usePathwayStore } from "@/store/pathway-store";
import { useUserPreferencesStore } from "@/store/user-preferences-store";
import type { LearningPathway } from "@/types/pathway";
import type { LanguageId } from "@/store/user-preferences-store";

interface AIChatProps {
  onClose: () => void;
  currentPathway?: LearningPathway;
  languageId?: LanguageId;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function AIChat({
  onClose,
  currentPathway,
  languageId,
}: AIChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatHistory = usePathwayStore((s) => s.chatHistory);
  const addChatMessage = usePathwayStore((s) => s.addChatMessage);
  const userPrefs = useUserPreferencesStore();

  // Load existing chat history
  useEffect(() => {
    setMessages(
      chatHistory.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMsg: DisplayMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    addChatMessage({
      id: userMsg.id,
      role: "user",
      content: text,
      timestamp: Date.now(),
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chatHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentPathway,
          userPreferences: {
            stage: userPrefs.stage,
            intention: userPrefs.intention,
            dailyTimeMinutes: userPrefs.dailyTimeMinutes,
            languages: userPrefs.languages.map((l) => ({ id: l.id })),
          },
        }),
      });

      const data = await response.json();

      const assistantMsg: DisplayMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.response || "I'm not sure how to help with that.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      addChatMessage({
        id: assistantMsg.id,
        role: "assistant",
        content: assistantMsg.content,
        timestamp: Date.now(),
        pathwayChange: data.pathwayChanges
          ? { type: "modify", sectionIds: [] }
          : undefined,
      });
    } catch {
      const errorMsg: DisplayMessage = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: "Sorry, I couldn't connect. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, currentPathway, userPrefs, addChatMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      style={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 380,
        height: 520,
        borderRadius: 20,
        background: "rgba(10, 15, 30, 0.97)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,91,255,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 51,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #635BFF, #7C3AED)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sparkles size={16} color="#FFFFFF" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>
            Zaytuna AI
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
            Modify your learning pathway
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "none",
            borderRadius: 8,
            padding: 6,
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "rgba(255,255,255,0.3)",
              fontSize: 13,
            }}
          >
            <Sparkles
              size={24}
              style={{ margin: "0 auto 12px", color: "rgba(99,91,255,0.4)" }}
            />
            Ask me to modify your pathway, add topics, change timing, or
            anything about your learning plan.
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, #635BFF, #7C3AED)"
                    : "rgba(255,255,255,0.06)",
                color: "#FFFFFF",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "14px 14px 14px 4px",
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Loader2
                size={14}
                style={{ color: "#635BFF", animation: "spin 1s linear infinite" }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask anything about your pathway..."
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#FFFFFF",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: "none",
            background: input.trim()
              ? "linear-gradient(135deg, #635BFF, #7C3AED)"
              : "rgba(255,255,255,0.04)",
            color: input.trim() ? "#FFFFFF" : "rgba(255,255,255,0.2)",
            cursor: input.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}

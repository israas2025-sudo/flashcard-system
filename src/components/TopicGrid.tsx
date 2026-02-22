"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { type Topic } from "@/lib/topics";
import { type StudyCard } from "@/lib/cards";

interface TopicGridProps {
  languageId: string;
  topics: Topic[];
  allCards: StudyCard[];
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.165, 0.84, 0.44, 1] },
  },
};

function getCardCount(
  topic: Topic,
  languageId: string,
  allCards: StudyCard[]
): number {
  let langFiltered: StudyCard[];
  if (languageId === "arabic") {
    langFiltered = allCards.filter((c) => c.language === "arabic");
  } else if (languageId === "quran") {
    langFiltered = allCards.filter(
      (c) => c.language === "arabic" && c.subtab === "quran"
    );
  } else {
    langFiltered = allCards.filter((c) => c.language === languageId);
  }

  return langFiltered.filter((card) => {
    const cardTags = card.tags || [];
    return topic.cardTags.some((pattern) =>
      cardTags.some((tag) => tag === pattern || tag.startsWith(pattern))
    );
  }).length;
}

export function TopicGrid({ languageId, topics, allCards }: TopicGridProps) {
  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {topics.map((topic, i) => {
        const count = getCardCount(topic, languageId, allCards);
        return (
          <motion.div key={topic.id} variants={fadeUp}>
            <Link href={`/study/${languageId}?topic=${topic.id}`}>
              <div
                className="glass-card p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] group"
                style={{
                  borderLeft: `3px solid ${topic.color}`,
                  minHeight: 100,
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty(
                    "--mouse-x",
                    `${((e.clientX - rect.left) / rect.width) * 100}%`
                  );
                  e.currentTarget.style.setProperty(
                    "--mouse-y",
                    `${((e.clientY - rect.top) / rect.height) * 100}%`
                  );
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xl">{topic.icon}</span>
                  {count > 0 && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${topic.color}20`,
                        color: topic.color,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-tight mb-0.5">
                  {topic.name}
                </p>
                {topic.nameAr && (
                  <p
                    className="text-[12px] text-[var(--text-tertiary)] mb-1"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {topic.nameAr}
                  </p>
                )}
                <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">
                  {topic.description}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

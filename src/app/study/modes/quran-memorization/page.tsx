"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Volume2,
  RotateCcw,
  Star,
  Layers,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (inline to avoid import issues in the app directory)
// ---------------------------------------------------------------------------

interface SurahInfo {
  number: number;
  name: string;
  arabicName: string;
  ayahCount: number;
  juz: number;
  revelation: "makki" | "madani";
}

interface AyahState {
  ayahNumber: number;
  arabicText: string;
  translation: string;
  status: "not-started" | "in-progress" | "memorized";
  reviewCount: number;
}

// ---------------------------------------------------------------------------
// Surah data subset for the UI (all 114 surahs)
// ---------------------------------------------------------------------------

const SURAHS: SurahInfo[] = [
  { number: 1,   name: "Al-Fatihah",       arabicName: "\u0627\u0644\u0641\u0627\u062A\u062D\u0629",       ayahCount: 7,    juz: 1,  revelation: "makki" },
  { number: 2,   name: "Al-Baqarah",       arabicName: "\u0627\u0644\u0628\u0642\u0631\u0629",             ayahCount: 286,  juz: 1,  revelation: "madani" },
  { number: 3,   name: "Aal-Imran",        arabicName: "\u0622\u0644 \u0639\u0645\u0631\u0627\u0646",     ayahCount: 200,  juz: 3,  revelation: "madani" },
  { number: 4,   name: "An-Nisa",          arabicName: "\u0627\u0644\u0646\u0633\u0627\u0621",             ayahCount: 176,  juz: 4,  revelation: "madani" },
  { number: 5,   name: "Al-Ma'idah",       arabicName: "\u0627\u0644\u0645\u0627\u0626\u062F\u0629",       ayahCount: 120,  juz: 6,  revelation: "madani" },
  { number: 6,   name: "Al-An'am",         arabicName: "\u0627\u0644\u0623\u0646\u0639\u0627\u0645",       ayahCount: 165,  juz: 7,  revelation: "makki" },
  { number: 7,   name: "Al-A'raf",         arabicName: "\u0627\u0644\u0623\u0639\u0631\u0627\u0641",       ayahCount: 206,  juz: 8,  revelation: "makki" },
  { number: 8,   name: "Al-Anfal",         arabicName: "\u0627\u0644\u0623\u0646\u0641\u0627\u0644",       ayahCount: 75,   juz: 9,  revelation: "madani" },
  { number: 9,   name: "At-Tawbah",        arabicName: "\u0627\u0644\u062A\u0648\u0628\u0629",             ayahCount: 129,  juz: 10, revelation: "madani" },
  { number: 10,  name: "Yunus",            arabicName: "\u064A\u0648\u0646\u0633",                         ayahCount: 109,  juz: 11, revelation: "makki" },
  { number: 11,  name: "Hud",              arabicName: "\u0647\u0648\u062F",                               ayahCount: 123,  juz: 11, revelation: "makki" },
  { number: 12,  name: "Yusuf",            arabicName: "\u064A\u0648\u0633\u0641",                         ayahCount: 111,  juz: 12, revelation: "makki" },
  { number: 13,  name: "Ar-Ra'd",          arabicName: "\u0627\u0644\u0631\u0639\u062F",                   ayahCount: 43,   juz: 13, revelation: "madani" },
  { number: 14,  name: "Ibrahim",          arabicName: "\u0625\u0628\u0631\u0627\u0647\u064A\u0645",       ayahCount: 52,   juz: 13, revelation: "makki" },
  { number: 15,  name: "Al-Hijr",          arabicName: "\u0627\u0644\u062D\u062C\u0631",                   ayahCount: 99,   juz: 14, revelation: "makki" },
  { number: 16,  name: "An-Nahl",          arabicName: "\u0627\u0644\u0646\u062D\u0644",                   ayahCount: 128,  juz: 14, revelation: "makki" },
  { number: 17,  name: "Al-Isra",          arabicName: "\u0627\u0644\u0625\u0633\u0631\u0627\u0621",       ayahCount: 111,  juz: 15, revelation: "makki" },
  { number: 18,  name: "Al-Kahf",          arabicName: "\u0627\u0644\u0643\u0647\u0641",                   ayahCount: 110,  juz: 15, revelation: "makki" },
  { number: 19,  name: "Maryam",           arabicName: "\u0645\u0631\u064A\u0645",                         ayahCount: 98,   juz: 16, revelation: "makki" },
  { number: 20,  name: "Taha",             arabicName: "\u0637\u0647",                                     ayahCount: 135,  juz: 16, revelation: "makki" },
  { number: 21,  name: "Al-Anbiya",        arabicName: "\u0627\u0644\u0623\u0646\u0628\u064A\u0627\u0621", ayahCount: 112,  juz: 17, revelation: "makki" },
  { number: 22,  name: "Al-Hajj",          arabicName: "\u0627\u0644\u062D\u062C",                         ayahCount: 78,   juz: 17, revelation: "madani" },
  { number: 23,  name: "Al-Mu'minun",      arabicName: "\u0627\u0644\u0645\u0624\u0645\u0646\u0648\u0646", ayahCount: 118,  juz: 18, revelation: "makki" },
  { number: 24,  name: "An-Nur",           arabicName: "\u0627\u0644\u0646\u0648\u0631",                   ayahCount: 64,   juz: 18, revelation: "madani" },
  { number: 25,  name: "Al-Furqan",        arabicName: "\u0627\u0644\u0641\u0631\u0642\u0627\u0646",       ayahCount: 77,   juz: 18, revelation: "makki" },
  { number: 26,  name: "Ash-Shu'ara",      arabicName: "\u0627\u0644\u0634\u0639\u0631\u0627\u0621",       ayahCount: 227,  juz: 19, revelation: "makki" },
  { number: 27,  name: "An-Naml",          arabicName: "\u0627\u0644\u0646\u0645\u0644",                   ayahCount: 93,   juz: 19, revelation: "makki" },
  { number: 28,  name: "Al-Qasas",         arabicName: "\u0627\u0644\u0642\u0635\u0635",                   ayahCount: 88,   juz: 20, revelation: "makki" },
  { number: 29,  name: "Al-Ankabut",       arabicName: "\u0627\u0644\u0639\u0646\u0643\u0628\u0648\u062A", ayahCount: 69,   juz: 20, revelation: "makki" },
  { number: 30,  name: "Ar-Rum",           arabicName: "\u0627\u0644\u0631\u0648\u0645",                   ayahCount: 60,   juz: 21, revelation: "makki" },
  { number: 31,  name: "Luqman",           arabicName: "\u0644\u0642\u0645\u0627\u0646",                   ayahCount: 34,   juz: 21, revelation: "makki" },
  { number: 32,  name: "As-Sajdah",        arabicName: "\u0627\u0644\u0633\u062C\u062F\u0629",             ayahCount: 30,   juz: 21, revelation: "makki" },
  { number: 33,  name: "Al-Ahzab",         arabicName: "\u0627\u0644\u0623\u062D\u0632\u0627\u0628",       ayahCount: 73,   juz: 21, revelation: "madani" },
  { number: 34,  name: "Saba",             arabicName: "\u0633\u0628\u0623",                               ayahCount: 54,   juz: 22, revelation: "makki" },
  { number: 35,  name: "Fatir",            arabicName: "\u0641\u0627\u0637\u0631",                         ayahCount: 45,   juz: 22, revelation: "makki" },
  { number: 36,  name: "Ya-Sin",           arabicName: "\u064A\u0633",                                     ayahCount: 83,   juz: 22, revelation: "makki" },
  { number: 37,  name: "As-Saffat",        arabicName: "\u0627\u0644\u0635\u0627\u0641\u0627\u062A",       ayahCount: 182,  juz: 23, revelation: "makki" },
  { number: 38,  name: "Sad",              arabicName: "\u0635",                                           ayahCount: 88,   juz: 23, revelation: "makki" },
  { number: 39,  name: "Az-Zumar",         arabicName: "\u0627\u0644\u0632\u0645\u0631",                   ayahCount: 75,   juz: 23, revelation: "makki" },
  { number: 40,  name: "Ghafir",           arabicName: "\u063A\u0627\u0641\u0631",                         ayahCount: 85,   juz: 24, revelation: "makki" },
  { number: 41,  name: "Fussilat",         arabicName: "\u0641\u0635\u0644\u062A",                         ayahCount: 54,   juz: 24, revelation: "makki" },
  { number: 42,  name: "Ash-Shura",        arabicName: "\u0627\u0644\u0634\u0648\u0631\u0649",             ayahCount: 53,   juz: 25, revelation: "makki" },
  { number: 43,  name: "Az-Zukhruf",       arabicName: "\u0627\u0644\u0632\u062E\u0631\u0641",             ayahCount: 89,   juz: 25, revelation: "makki" },
  { number: 44,  name: "Ad-Dukhan",        arabicName: "\u0627\u0644\u062F\u062E\u0627\u0646",             ayahCount: 59,   juz: 25, revelation: "makki" },
  { number: 45,  name: "Al-Jathiyah",      arabicName: "\u0627\u0644\u062C\u0627\u062B\u064A\u0629",       ayahCount: 37,   juz: 25, revelation: "makki" },
  { number: 46,  name: "Al-Ahqaf",         arabicName: "\u0627\u0644\u0623\u062D\u0642\u0627\u0641",       ayahCount: 35,   juz: 26, revelation: "makki" },
  { number: 47,  name: "Muhammad",         arabicName: "\u0645\u062D\u0645\u062F",                         ayahCount: 38,   juz: 26, revelation: "madani" },
  { number: 48,  name: "Al-Fath",          arabicName: "\u0627\u0644\u0641\u062A\u062D",                   ayahCount: 29,   juz: 26, revelation: "madani" },
  { number: 49,  name: "Al-Hujurat",       arabicName: "\u0627\u0644\u062D\u062C\u0631\u0627\u062A",       ayahCount: 18,   juz: 26, revelation: "madani" },
  { number: 50,  name: "Qaf",              arabicName: "\u0642",                                           ayahCount: 45,   juz: 26, revelation: "makki" },
  { number: 51,  name: "Adh-Dhariyat",     arabicName: "\u0627\u0644\u0630\u0627\u0631\u064A\u0627\u062A", ayahCount: 60,   juz: 26, revelation: "makki" },
  { number: 52,  name: "At-Tur",           arabicName: "\u0627\u0644\u0637\u0648\u0631",                   ayahCount: 49,   juz: 27, revelation: "makki" },
  { number: 53,  name: "An-Najm",          arabicName: "\u0627\u0644\u0646\u062C\u0645",                   ayahCount: 62,   juz: 27, revelation: "makki" },
  { number: 54,  name: "Al-Qamar",         arabicName: "\u0627\u0644\u0642\u0645\u0631",                   ayahCount: 55,   juz: 27, revelation: "makki" },
  { number: 55,  name: "Ar-Rahman",        arabicName: "\u0627\u0644\u0631\u062D\u0645\u0646",             ayahCount: 78,   juz: 27, revelation: "madani" },
  { number: 56,  name: "Al-Waqi'ah",       arabicName: "\u0627\u0644\u0648\u0627\u0642\u0639\u0629",       ayahCount: 96,   juz: 27, revelation: "makki" },
  { number: 57,  name: "Al-Hadid",         arabicName: "\u0627\u0644\u062D\u062F\u064A\u062F",             ayahCount: 29,   juz: 27, revelation: "madani" },
  { number: 58,  name: "Al-Mujadilah",     arabicName: "\u0627\u0644\u0645\u062C\u0627\u062F\u0644\u0629", ayahCount: 22,   juz: 28, revelation: "madani" },
  { number: 59,  name: "Al-Hashr",         arabicName: "\u0627\u0644\u062D\u0634\u0631",                   ayahCount: 24,   juz: 28, revelation: "madani" },
  { number: 60,  name: "Al-Mumtahanah",    arabicName: "\u0627\u0644\u0645\u0645\u062A\u062D\u0646\u0629", ayahCount: 13,   juz: 28, revelation: "madani" },
  { number: 61,  name: "As-Saff",          arabicName: "\u0627\u0644\u0635\u0641",                         ayahCount: 14,   juz: 28, revelation: "madani" },
  { number: 62,  name: "Al-Jumu'ah",       arabicName: "\u0627\u0644\u062C\u0645\u0639\u0629",             ayahCount: 11,   juz: 28, revelation: "madani" },
  { number: 63,  name: "Al-Munafiqun",     arabicName: "\u0627\u0644\u0645\u0646\u0627\u0641\u0642\u0648\u0646", ayahCount: 11, juz: 28, revelation: "madani" },
  { number: 64,  name: "At-Taghabun",      arabicName: "\u0627\u0644\u062A\u063A\u0627\u0628\u0646",       ayahCount: 18,   juz: 28, revelation: "madani" },
  { number: 65,  name: "At-Talaq",         arabicName: "\u0627\u0644\u0637\u0644\u0627\u0642",             ayahCount: 12,   juz: 28, revelation: "madani" },
  { number: 66,  name: "At-Tahrim",        arabicName: "\u0627\u0644\u062A\u062D\u0631\u064A\u0645",       ayahCount: 12,   juz: 28, revelation: "madani" },
  { number: 67,  name: "Al-Mulk",          arabicName: "\u0627\u0644\u0645\u0644\u0643",                   ayahCount: 30,   juz: 29, revelation: "makki" },
  { number: 68,  name: "Al-Qalam",         arabicName: "\u0627\u0644\u0642\u0644\u0645",                   ayahCount: 52,   juz: 29, revelation: "makki" },
  { number: 69,  name: "Al-Haqqah",        arabicName: "\u0627\u0644\u062D\u0627\u0642\u0629",             ayahCount: 52,   juz: 29, revelation: "makki" },
  { number: 70,  name: "Al-Ma'arij",       arabicName: "\u0627\u0644\u0645\u0639\u0627\u0631\u062C",       ayahCount: 44,   juz: 29, revelation: "makki" },
  { number: 71,  name: "Nuh",              arabicName: "\u0646\u0648\u062D",                               ayahCount: 28,   juz: 29, revelation: "makki" },
  { number: 72,  name: "Al-Jinn",          arabicName: "\u0627\u0644\u062C\u0646",                         ayahCount: 28,   juz: 29, revelation: "makki" },
  { number: 73,  name: "Al-Muzzammil",     arabicName: "\u0627\u0644\u0645\u0632\u0645\u0644",             ayahCount: 20,   juz: 29, revelation: "makki" },
  { number: 74,  name: "Al-Muddaththir",   arabicName: "\u0627\u0644\u0645\u062F\u062B\u0631",             ayahCount: 56,   juz: 29, revelation: "makki" },
  { number: 75,  name: "Al-Qiyamah",       arabicName: "\u0627\u0644\u0642\u064A\u0627\u0645\u0629",       ayahCount: 40,   juz: 29, revelation: "makki" },
  { number: 76,  name: "Al-Insan",         arabicName: "\u0627\u0644\u0625\u0646\u0633\u0627\u0646",       ayahCount: 31,   juz: 29, revelation: "madani" },
  { number: 77,  name: "Al-Mursalat",      arabicName: "\u0627\u0644\u0645\u0631\u0633\u0644\u0627\u062A", ayahCount: 50,   juz: 29, revelation: "makki" },
  { number: 78,  name: "An-Naba",          arabicName: "\u0627\u0644\u0646\u0628\u0623",                   ayahCount: 40,   juz: 30, revelation: "makki" },
  { number: 79,  name: "An-Nazi'at",       arabicName: "\u0627\u0644\u0646\u0627\u0632\u0639\u0627\u062A", ayahCount: 46,   juz: 30, revelation: "makki" },
  { number: 80,  name: "Abasa",            arabicName: "\u0639\u0628\u0633",                               ayahCount: 42,   juz: 30, revelation: "makki" },
  { number: 81,  name: "At-Takwir",        arabicName: "\u0627\u0644\u062A\u0643\u0648\u064A\u0631",       ayahCount: 29,   juz: 30, revelation: "makki" },
  { number: 82,  name: "Al-Infitar",       arabicName: "\u0627\u0644\u0627\u0646\u0641\u0637\u0627\u0631", ayahCount: 19,   juz: 30, revelation: "makki" },
  { number: 83,  name: "Al-Mutaffifin",    arabicName: "\u0627\u0644\u0645\u0637\u0641\u0641\u064A\u0646", ayahCount: 36,   juz: 30, revelation: "makki" },
  { number: 84,  name: "Al-Inshiqaq",      arabicName: "\u0627\u0644\u0627\u0646\u0634\u0642\u0627\u0642", ayahCount: 25,   juz: 30, revelation: "makki" },
  { number: 85,  name: "Al-Buruj",         arabicName: "\u0627\u0644\u0628\u0631\u0648\u062C",             ayahCount: 22,   juz: 30, revelation: "makki" },
  { number: 86,  name: "At-Tariq",         arabicName: "\u0627\u0644\u0637\u0627\u0631\u0642",             ayahCount: 17,   juz: 30, revelation: "makki" },
  { number: 87,  name: "Al-A'la",          arabicName: "\u0627\u0644\u0623\u0639\u0644\u0649",             ayahCount: 19,   juz: 30, revelation: "makki" },
  { number: 88,  name: "Al-Ghashiyah",     arabicName: "\u0627\u0644\u063A\u0627\u0634\u064A\u0629",       ayahCount: 26,   juz: 30, revelation: "makki" },
  { number: 89,  name: "Al-Fajr",          arabicName: "\u0627\u0644\u0641\u062C\u0631",                   ayahCount: 30,   juz: 30, revelation: "makki" },
  { number: 90,  name: "Al-Balad",         arabicName: "\u0627\u0644\u0628\u0644\u062F",                   ayahCount: 20,   juz: 30, revelation: "makki" },
  { number: 91,  name: "Ash-Shams",        arabicName: "\u0627\u0644\u0634\u0645\u0633",                   ayahCount: 15,   juz: 30, revelation: "makki" },
  { number: 92,  name: "Al-Layl",          arabicName: "\u0627\u0644\u0644\u064A\u0644",                   ayahCount: 21,   juz: 30, revelation: "makki" },
  { number: 93,  name: "Ad-Duha",          arabicName: "\u0627\u0644\u0636\u062D\u0649",                   ayahCount: 11,   juz: 30, revelation: "makki" },
  { number: 94,  name: "Ash-Sharh",        arabicName: "\u0627\u0644\u0634\u0631\u062D",                   ayahCount: 8,    juz: 30, revelation: "makki" },
  { number: 95,  name: "At-Tin",           arabicName: "\u0627\u0644\u062A\u064A\u0646",                   ayahCount: 8,    juz: 30, revelation: "makki" },
  { number: 96,  name: "Al-Alaq",          arabicName: "\u0627\u0644\u0639\u0644\u0642",                   ayahCount: 19,   juz: 30, revelation: "makki" },
  { number: 97,  name: "Al-Qadr",          arabicName: "\u0627\u0644\u0642\u062F\u0631",                   ayahCount: 5,    juz: 30, revelation: "makki" },
  { number: 98,  name: "Al-Bayyinah",      arabicName: "\u0627\u0644\u0628\u064A\u0646\u0629",             ayahCount: 8,    juz: 30, revelation: "madani" },
  { number: 99,  name: "Az-Zalzalah",      arabicName: "\u0627\u0644\u0632\u0644\u0632\u0644\u0629",       ayahCount: 8,    juz: 30, revelation: "madani" },
  { number: 100, name: "Al-Adiyat",        arabicName: "\u0627\u0644\u0639\u0627\u062F\u064A\u0627\u062A", ayahCount: 11,   juz: 30, revelation: "makki" },
  { number: 101, name: "Al-Qari'ah",       arabicName: "\u0627\u0644\u0642\u0627\u0631\u0639\u0629",       ayahCount: 11,   juz: 30, revelation: "makki" },
  { number: 102, name: "At-Takathur",      arabicName: "\u0627\u0644\u062A\u0643\u0627\u062B\u0631",       ayahCount: 8,    juz: 30, revelation: "makki" },
  { number: 103, name: "Al-Asr",           arabicName: "\u0627\u0644\u0639\u0635\u0631",                   ayahCount: 3,    juz: 30, revelation: "makki" },
  { number: 104, name: "Al-Humazah",       arabicName: "\u0627\u0644\u0647\u0645\u0632\u0629",             ayahCount: 9,    juz: 30, revelation: "makki" },
  { number: 105, name: "Al-Fil",           arabicName: "\u0627\u0644\u0641\u064A\u0644",                   ayahCount: 5,    juz: 30, revelation: "makki" },
  { number: 106, name: "Quraysh",          arabicName: "\u0642\u0631\u064A\u0634",                         ayahCount: 4,    juz: 30, revelation: "makki" },
  { number: 107, name: "Al-Ma'un",         arabicName: "\u0627\u0644\u0645\u0627\u0639\u0648\u0646",       ayahCount: 7,    juz: 30, revelation: "makki" },
  { number: 108, name: "Al-Kawthar",       arabicName: "\u0627\u0644\u0643\u0648\u062B\u0631",             ayahCount: 3,    juz: 30, revelation: "makki" },
  { number: 109, name: "Al-Kafirun",       arabicName: "\u0627\u0644\u0643\u0627\u0641\u0631\u0648\u0646", ayahCount: 6,    juz: 30, revelation: "makki" },
  { number: 110, name: "An-Nasr",          arabicName: "\u0627\u0644\u0646\u0635\u0631",                   ayahCount: 3,    juz: 30, revelation: "madani" },
  { number: 111, name: "Al-Masad",         arabicName: "\u0627\u0644\u0645\u0633\u062F",                   ayahCount: 5,    juz: 30, revelation: "makki" },
  { number: 112, name: "Al-Ikhlas",        arabicName: "\u0627\u0644\u0625\u062E\u0644\u0627\u0635",       ayahCount: 4,    juz: 30, revelation: "makki" },
  { number: 113, name: "Al-Falaq",         arabicName: "\u0627\u0644\u0641\u0644\u0642",                   ayahCount: 5,    juz: 30, revelation: "makki" },
  { number: 114, name: "An-Nas",           arabicName: "\u0627\u0644\u0646\u0627\u0633",                   ayahCount: 6,    juz: 30, revelation: "makki" },
];

// ---------------------------------------------------------------------------
// Mock ayah data for Al-Fatihah (demonstrating the UI with real content)
// ---------------------------------------------------------------------------

const FATIHAH_AYAHS: AyahState[] = [
  { ayahNumber: 1, arabicText: "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650", translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 2, arabicText: "\u0627\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F \u0644\u0650\u0644\u0651\u064E\u0647\u0650 \u0631\u064E\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064E\u0627\u0644\u064E\u0645\u0650\u064A\u0646\u064E", translation: "All praise is due to Allah, Lord of the worlds.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 3, arabicText: "\u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650", translation: "The Entirely Merciful, the Especially Merciful.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 4, arabicText: "\u0645\u064E\u0627\u0644\u0650\u0643\u0650 \u064A\u064E\u0648\u0652\u0645\u0650 \u0627\u0644\u062F\u0651\u0650\u064A\u0646\u0650", translation: "Sovereign of the Day of Recompense.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 5, arabicText: "\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0639\u0652\u0628\u064F\u062F\u064F \u0648\u064E\u0625\u0650\u064A\u0651\u064E\u0627\u0643\u064E \u0646\u064E\u0633\u0652\u062A\u064E\u0639\u0650\u064A\u0646\u064F", translation: "It is You we worship and You we ask for help.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 6, arabicText: "\u0627\u0647\u0652\u062F\u0650\u0646\u064E\u0627 \u0627\u0644\u0635\u0651\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0652\u0645\u064F\u0633\u0652\u062A\u064E\u0642\u0650\u064A\u0645\u064E", translation: "Guide us to the straight path.", status: "not-started", reviewCount: 0 },
  { ayahNumber: 7, arabicText: "\u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E", translation: "The path of those upon whom You have bestowed favor, not of those who have earned [Your] anger or of those who are astray.", status: "not-started", reviewCount: 0 },
];

// ---------------------------------------------------------------------------
// Convert a number to Eastern Arabic numerals
// ---------------------------------------------------------------------------

function toArabicNumeral(num: number): string {
  const digits = ["\u0660", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667", "\u0668", "\u0669"];
  return num.toString().split("").map((d) => digits[parseInt(d, 10)] ?? d).join("");
}

// ---------------------------------------------------------------------------
// Progress Bar Component
// ---------------------------------------------------------------------------

function SurahProgressBar({
  memorized,
  inProgress,
  total,
}: {
  memorized: number;
  inProgress: number;
  total: number;
}) {
  const memorizedPct = total > 0 ? (memorized / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text-tertiary)]">
          {memorized} / {total} ayahs memorized
        </span>
        <span className="text-xs font-medium text-quran-600 dark:text-quran-400">
          {Math.round(memorizedPct)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div className="h-full flex">
          <motion.div
            className="h-full bg-quran-500 rounded-l-full"
            initial={{ width: 0 }}
            animate={{ width: `${memorizedPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <motion.div
            className="h-full bg-quran-300 dark:bg-quran-700"
            initial={{ width: 0 }}
            animate={{ width: `${inProgressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Surah Selector Dropdown
// ---------------------------------------------------------------------------

function SurahSelector({
  surahs,
  selectedSurah,
  onSelect,
}: {
  surahs: SurahInfo[];
  selectedSurah: SurahInfo;
  onSelect: (surah: SurahInfo) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterJuz, setFilterJuz] = useState<number | null>(null);

  const filtered = filterJuz
    ? surahs.filter((s) => s.juz === filterJuz)
    : surahs;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition-colors w-full"
      >
        <BookOpen className="w-4 h-4 text-quran-500" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {selectedSurah.name}
          </div>
          <div className="text-xs text-[var(--text-tertiary)]" dir="rtl">
            {selectedSurah.arabicName} &bull; {selectedSurah.ayahCount} ayahs
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-xl shadow-elevated z-50 overflow-hidden"
          >
            {/* Juz filter */}
            <div className="p-2 border-b border-[var(--surface-3)]">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterJuz(null)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    !filterJuz
                      ? "bg-quran-500 text-white"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  All
                </button>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                  <button
                    key={j}
                    onClick={() => setFilterJuz(j)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterJuz === j
                        ? "bg-quran-500 text-white"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]"
                    }`}
                  >
                    J{j}
                  </button>
                ))}
              </div>
            </div>

            {/* Surah list */}
            <div className="max-h-80 overflow-y-auto">
              {filtered.map((surah) => (
                <button
                  key={surah.number}
                  onClick={() => {
                    onSelect(surah);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors text-left ${
                    surah.number === selectedSurah.number
                      ? "bg-quran-50 dark:bg-quran-950/30"
                      : ""
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs font-medium text-[var(--text-tertiary)]">
                    {surah.number}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      {surah.name}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {surah.ayahCount} ayahs &bull;{" "}
                      {surah.revelation === "makki" ? "Makki" : "Madani"} &bull; Juz{" "}
                      {surah.juz}
                    </div>
                  </div>
                  <span
                    className="text-base font-medium text-[var(--text-secondary)]"
                    dir="rtl"
                  >
                    {surah.arabicName}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Overview Panel
// ---------------------------------------------------------------------------

function ProgressOverview({
  surahs,
  progress,
  onSelectSurah,
}: {
  surahs: SurahInfo[];
  progress: Map<number, { memorized: number; inProgress: number }>;
  onSelectSurah: (surah: SurahInfo) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displaySurahs = isExpanded ? surahs : surahs.slice(0, 10);

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--surface-3)]">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Memorization Overview
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          Track your progress across all surahs
        </p>
      </div>

      <div className="divide-y divide-[var(--surface-3)]">
        {displaySurahs.map((surah) => {
          const prog = progress.get(surah.number) || {
            memorized: 0,
            inProgress: 0,
          };
          const pct =
            surah.ayahCount > 0
              ? Math.round((prog.memorized / surah.ayahCount) * 100)
              : 0;

          return (
            <button
              key={surah.number}
              onClick={() => onSelectSurah(surah)}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors text-left"
            >
              <span className="w-7 h-7 rounded-md bg-[var(--surface-2)] flex items-center justify-center text-xs font-medium text-[var(--text-tertiary)]">
                {surah.number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {surah.name}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] ml-2">
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-2)] mt-1 overflow-hidden">
                  <div
                    className="h-full bg-quran-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {surahs.length > 10 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 text-sm font-medium text-quran-600 dark:text-quran-400 hover:bg-[var(--surface-2)] transition-colors text-center"
        >
          {isExpanded ? "Show less" : `Show all ${surahs.length} surahs`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Quran Memorization Page
// ---------------------------------------------------------------------------

export default function QuranMemorizationPage() {
  const router = useRouter();

  // State
  const [selectedSurah, setSelectedSurah] = useState<SurahInfo>(SURAHS[0]);
  const [ayahs, setAyahs] = useState<AyahState[]>(FATIHAH_AYAHS);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [view, setView] = useState<"study" | "overview">("study");
  const [progress, setProgress] = useState<
    Map<number, { memorized: number; inProgress: number }>
  >(new Map());

  const currentAyah = ayahs[currentAyahIndex];
  const previousAyah = currentAyahIndex > 0 ? ayahs[currentAyahIndex - 1] : null;

  const memorizedCount = ayahs.filter((a) => a.status === "memorized").length;
  const inProgressCount = ayahs.filter((a) => a.status === "in-progress").length;

  // Handle surah selection
  const handleSelectSurah = useCallback(
    (surah: SurahInfo) => {
      setSelectedSurah(surah);
      setCurrentAyahIndex(0);
      setShowTranslation(false);

      // If selecting Al-Fatihah, use real data; otherwise generate placeholder
      if (surah.number === 1) {
        setAyahs(FATIHAH_AYAHS.map((a) => ({ ...a })));
      } else {
        const placeholderAyahs: AyahState[] = Array.from(
          { length: surah.ayahCount },
          (_, i) => ({
            ayahNumber: i + 1,
            arabicText: `\u0622\u064A\u0629 ${toArabicNumeral(i + 1)} \u0645\u0646 \u0633\u0648\u0631\u0629 ${surah.arabicName}`,
            translation: `Ayah ${i + 1} of Surah ${surah.name}`,
            status: "not-started" as const,
            reviewCount: 0,
          })
        );
        setAyahs(placeholderAyahs);
      }
    },
    []
  );

  // Mark ayah as memorized
  const handleMemorized = useCallback(() => {
    setAyahs((prev) => {
      const updated = [...prev];
      updated[currentAyahIndex] = {
        ...updated[currentAyahIndex],
        status: "memorized",
        reviewCount: updated[currentAyahIndex].reviewCount + 1,
      };
      return updated;
    });

    // Update progress
    setProgress((prev) => {
      const next = new Map(prev);
      const current = next.get(selectedSurah.number) || {
        memorized: 0,
        inProgress: 0,
      };
      next.set(selectedSurah.number, {
        memorized: current.memorized + 1,
        inProgress: Math.max(0, current.inProgress - 1),
      });
      return next;
    });

    // Advance to next ayah
    if (currentAyahIndex < ayahs.length - 1) {
      setTimeout(() => {
        setCurrentAyahIndex((prev) => prev + 1);
        setShowTranslation(false);
      }, 500);
    }
  }, [currentAyahIndex, ayahs.length, selectedSurah.number]);

  // Mark as still learning
  const handleStillLearning = useCallback(() => {
    setAyahs((prev) => {
      const updated = [...prev];
      updated[currentAyahIndex] = {
        ...updated[currentAyahIndex],
        status: "in-progress",
        reviewCount: updated[currentAyahIndex].reviewCount + 1,
      };
      return updated;
    });

    // Update progress
    setProgress((prev) => {
      const next = new Map(prev);
      const current = next.get(selectedSurah.number) || {
        memorized: 0,
        inProgress: 0,
      };
      next.set(selectedSurah.number, {
        ...current,
        inProgress: current.inProgress + 1,
      });
      return next;
    });

    setShowTranslation(false);
  }, [currentAyahIndex, selectedSurah.number]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        if (currentAyahIndex < ayahs.length - 1) {
          setCurrentAyahIndex((prev) => prev + 1);
          setShowTranslation(false);
        }
      }
      if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        if (currentAyahIndex > 0) {
          setCurrentAyahIndex((prev) => prev - 1);
          setShowTranslation(false);
        }
      }
      if (e.key === "m") {
        e.preventDefault();
        handleMemorized();
      }
      if (e.key === "s") {
        e.preventDefault();
        handleStillLearning();
      }
      if (e.key === "t") {
        e.preventDefault();
        setShowTranslation((prev) => !prev);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/study/modes");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentAyahIndex,
    ayahs.length,
    handleMemorized,
    handleStillLearning,
    router,
  ]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-0)]">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-[var(--surface-0)]/95 backdrop-blur-sm border-b border-[var(--surface-3)]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/study/modes")}
                className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Back to modes"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">
                  Quran Memorization
                </h1>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Sequential ayah memorization
                </p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("study")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  view === "study"
                    ? "bg-quran-500 text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                }`}
              >
                Study
              </button>
              <button
                onClick={() => setView("overview")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  view === "overview"
                    ? "bg-quran-500 text-white"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                }`}
              >
                <Layers className="w-3.5 h-3.5 inline-block mr-1" />
                Overview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {view === "overview" ? (
          /* ----------------------------------------------------------------
             Overview View — All Surahs with Progress
             ---------------------------------------------------------------- */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ProgressOverview
              surahs={SURAHS}
              progress={progress}
              onSelectSurah={(surah) => {
                handleSelectSurah(surah);
                setView("study");
              }}
            />
          </motion.div>
        ) : (
          /* ----------------------------------------------------------------
             Study View — Sequential Memorization
             ---------------------------------------------------------------- */
          <div className="space-y-6">
            {/* Surah selector */}
            <SurahSelector
              surahs={SURAHS}
              selectedSurah={selectedSurah}
              onSelect={handleSelectSurah}
            />

            {/* Surah progress bar */}
            <SurahProgressBar
              memorized={memorizedCount}
              inProgress={inProgressCount}
              total={ayahs.length}
            />

            {/* Ayah display area */}
            <AnimatePresence mode="wait">
              {currentAyah && (
                <motion.div
                  key={`${selectedSurah.number}-${currentAyah.ayahNumber}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-[var(--surface-1)] border border-[var(--surface-3)] rounded-2xl shadow-card overflow-hidden"
                >
                  {/* Previous ayah (dimmed context) */}
                  {previousAyah && (
                    <div className="px-8 pt-6 pb-2">
                      <div
                        className="text-2xl leading-[2.4] text-[var(--text-tertiary)] opacity-40 text-center"
                        dir="rtl"
                        style={{
                          fontFamily:
                            "'KFGQPC Uthmanic Script HAFS', 'me_quran', 'Scheherazade New', 'Amiri Quran', serif",
                        }}
                      >
                        {previousAyah.arabicText}{" "}
                        <span className="text-lg text-quran-400">
                          ﴿{toArabicNumeral(previousAyah.ayahNumber)}﴾
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {previousAyah && (
                    <div className="mx-8">
                      <div
                        className="h-px"
                        style={{
                          background:
                            "linear-gradient(to right, transparent, #c5a55a 20%, #c5a55a 80%, transparent)",
                        }}
                      />
                    </div>
                  )}

                  {/* Current ayah — large Arabic text */}
                  <div className="px-8 py-8">
                    <div
                      className="text-4xl md:text-5xl leading-[2.6] text-[var(--text-primary)] text-center"
                      dir="rtl"
                      style={{
                        fontFamily:
                          "'KFGQPC Uthmanic Script HAFS', 'me_quran', 'Scheherazade New', 'Amiri Quran', serif",
                      }}
                    >
                      {currentAyah.arabicText}{" "}
                      <span className="text-2xl text-quran-500 font-bold">
                        ﴿{toArabicNumeral(currentAyah.ayahNumber)}﴾
                      </span>
                    </div>

                    {/* Surah reference */}
                    <div className="text-center mt-4">
                      <span className="text-sm text-[var(--text-tertiary)]">
                        {selectedSurah.name} {selectedSurah.number}:
                        {currentAyah.ayahNumber}
                      </span>
                      <span className="mx-2 text-[var(--text-tertiary)]">
                        &bull;
                      </span>
                      <span className="text-sm text-[var(--text-tertiary)]">
                        Juz {selectedSurah.juz}
                      </span>
                      <span className="mx-2 text-[var(--text-tertiary)]">
                        &bull;
                      </span>
                      <span className="text-sm text-[var(--text-tertiary)]">
                        {selectedSurah.revelation === "makki"
                          ? "Makki"
                          : "Madani"}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="text-center mt-3">
                      {currentAyah.status === "memorized" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Memorized
                        </span>
                      )}
                      {currentAyah.status === "in-progress" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-quran-50 dark:bg-quran-950/30 text-quran-600 dark:text-quran-400 text-xs font-medium">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Learning &bull; Reviewed {currentAyah.reviewCount}{" "}
                          {currentAyah.reviewCount === 1 ? "time" : "times"}
                        </span>
                      )}
                      {currentAyah.status === "not-started" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-tertiary)] text-xs font-medium">
                          <Star className="w-3.5 h-3.5" />
                          New ayah
                        </span>
                      )}
                    </div>

                    {/* Translation (toggle) */}
                    <AnimatePresence>
                      {showTranslation && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 overflow-hidden"
                        >
                          <div
                            className="pt-4 border-t"
                            style={{ borderColor: "#e0d5c1" }}
                          >
                            <p className="text-base text-[var(--text-secondary)] italic leading-relaxed text-center">
                              {currentAyah.translation}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action buttons */}
                  <div className="px-8 pb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleMemorized}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-quran-500 hover:bg-quran-600 text-white font-medium text-sm transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        I&apos;ve memorized this
                        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-quran-600 text-[10px] font-mono opacity-70">
                          M
                        </kbd>
                      </button>

                      <button
                        onClick={handleStillLearning}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] font-medium text-sm transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Still learning
                        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono opacity-70">
                          S
                        </kbd>
                      </button>

                      <button
                        onClick={() => setShowTranslation(!showTranslation)}
                        className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl border border-[var(--surface-3)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] font-medium text-sm transition-colors"
                        title="Toggle translation"
                      >
                        <Volume2 className="w-5 h-5" />
                        <span className="sm:hidden">Translation</span>
                        <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono opacity-70">
                          T
                        </kbd>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ayah navigation (mini-map) */}
            <div className="flex flex-wrap gap-1 justify-center">
              {ayahs.map((ayah, index) => (
                <button
                  key={ayah.ayahNumber}
                  onClick={() => {
                    setCurrentAyahIndex(index);
                    setShowTranslation(false);
                  }}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    index === currentAyahIndex
                      ? "bg-quran-500 text-white scale-110 shadow-md"
                      : ayah.status === "memorized"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : ayah.status === "in-progress"
                          ? "bg-quran-100 dark:bg-quran-900/30 text-quran-700 dark:text-quran-400"
                          : "bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:bg-[var(--surface-3)]"
                  }`}
                  title={`Ayah ${ayah.ayahNumber} - ${ayah.status}`}
                >
                  {ayah.ayahNumber}
                </button>
              ))}
            </div>

            {/* Keyboard shortcuts help */}
            <div className="text-center">
              <p className="text-xs text-[var(--text-tertiary)]">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                  M
                </kbd>{" "}
                memorized &bull;{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                  S
                </kbd>{" "}
                still learning &bull;{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                  T
                </kbd>{" "}
                translation &bull;{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono">
                  &larr; &rarr;
                </kbd>{" "}
                navigate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

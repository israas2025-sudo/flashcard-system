/**
 * Card Generation Script — uses OpenAI to generate flashcards in bulk.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-cards.ts [language] [topic]
 *
 * Examples:
 *   npx tsx scripts/generate-cards.ts arabic          # Generate all Arabic topics
 *   npx tsx scripts/generate-cards.ts spanish food    # Generate Spanish food cards only
 *   npx tsx scripts/generate-cards.ts quran           # Generate Quran ayah cards
 *   npx tsx scripts/generate-cards.ts all             # Generate everything
 */

import * as dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CARDS_DIR = path.join(__dirname, "..", "cards");

// ---------------------------------------------------------------------------
// Content filter
// ---------------------------------------------------------------------------
const CONTENT_FILTER = `
IMPORTANT CONTENT RULES:
- Do NOT include any vocabulary related to: alcohol, wine, beer, drugs, smoking, dating, romance, sex, gambling, social media platforms, nightlife, clubs, bars, pork.
- Focus on wholesome, educational content appropriate for all ages and families.
- Include vocabulary that is practical, commonly used, and culturally respectful.
`;

// ---------------------------------------------------------------------------
// Topic definitions (shared across languages)
// ---------------------------------------------------------------------------
const TOPICS = [
  { id: "greetings", name: "Greetings & Polite Phrases" },
  { id: "food", name: "Food & Cooking" },
  { id: "home", name: "Home & Furniture" },
  { id: "family", name: "Family & Relationships" },
  { id: "body", name: "Body & Health" },
  { id: "education", name: "Education & School" },
  { id: "travel", name: "Travel & Transportation" },
  { id: "work", name: "Work & Professions" },
  { id: "nature", name: "Nature & Animals" },
  { id: "weather", name: "Weather & Seasons" },
  { id: "clothing", name: "Clothing & Appearance" },
  { id: "shopping", name: "Shopping & Markets" },
  { id: "religion", name: "Religion & Worship" },
  { id: "numbers", name: "Numbers & Counting" },
  { id: "time", name: "Time & Calendar" },
  { id: "colors", name: "Colors & Shapes" },
  { id: "emotions", name: "Emotions & Feelings" },
  { id: "daily-routines", name: "Daily Routines & Habits" },
  { id: "directions", name: "Directions & Places" },
  { id: "sports", name: "Sports & Games" },
  { id: "tools", name: "Tools & Materials" },
  { id: "agriculture", name: "Agriculture & Farming" },
  { id: "government", name: "Government & Law" },
  { id: "medicine", name: "Medicine & Pharmacy" },
  { id: "celebrations", name: "Celebrations & Events" },
  { id: "geography", name: "Geography & Countries" },
  { id: "science", name: "Science & Discovery" },
  { id: "arts", name: "Arts & Crafts" },
  { id: "adjectives", name: "Common Adjectives" },
  { id: "verbs", name: "Common Verbs & Actions" },
  { id: "adverbs", name: "Common Adverbs & Prepositions" },
  { id: "military", name: "Military & Security" },
];

const QURAN_THEMES = [
  { id: "faith", name: "Faith & Belief (Iman)" },
  { id: "prayer", name: "Prayer & Worship (Ibadah)" },
  { id: "prophets", name: "Prophets & Their Stories" },
  { id: "paradise", name: "Paradise & Afterlife" },
  { id: "judgment", name: "Day of Judgment" },
  { id: "family-marriage", name: "Family & Marriage" },
  { id: "justice", name: "Justice & Law" },
  { id: "creation", name: "Nature & Creation" },
  { id: "patience", name: "Patience & Gratitude (Sabr & Shukr)" },
  { id: "charity", name: "Charity & Wealth (Sadaqah & Zakat)" },
  { id: "mercy", name: "Mercy & Forgiveness" },
  { id: "knowledge", name: "Knowledge & Wisdom" },
  { id: "community", name: "Community & Brotherhood (Ummah)" },
  { id: "repentance", name: "Repentance & Returning to Allah (Tawbah)" },
  { id: "trust-in-allah", name: "Trust in Allah (Tawakkul)" },
];

// ---------------------------------------------------------------------------
// Arabic MSA generation
// ---------------------------------------------------------------------------
async function generateArabicCards(topicId: string, topicName: string, startId: number): Promise<any[]> {
  const prompt = `Generate exactly 35 Arabic MSA vocabulary flashcards for the topic "${topicName}".

${CONTENT_FILTER}

Requirements:
- Mix of nouns (at least 12), verbs (at least 10), and adjectives (at least 8)
- Order from easiest/most common words first to harder/less common words
- Each word MUST have full tashkeel/diacritics on the Arabic
- Include the 3-letter root in Arabic (e.g. ك-ت-ب)
- Include the morphological pattern (e.g. فَعَلَ for verbs, فَعِيل for adjectives)
- Example sentences should be practical and natural
- For words that appear in the Quran, include "quran::vocabulary" in tags and add the relevant surah tag
- Tags should include: topic::${topicId}, level::(beginner|intermediate|advanced), root::X, part_of_speech

Return a JSON array where each object has:
{
  "arabic_word": "كَلِمَة",
  "transliteration": "kalima",
  "root_letters": "ك-ل-م",
  "morphological_pattern": "فَعِلَة",
  "english_meaning": "word, speech",
  "part_of_speech": "noun",
  "example_sentence_ar": "هَذِهِ كَلِمَةٌ جَمِيلَةٌ",
  "example_sentence_en": "This is a beautiful word",
  "plural_form": "كَلِمَات",
  "tags": ["topic::${topicId}", "level::beginner", "root::klm"]
}

Return ONLY the JSON array, no markdown or explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const text = response.choices[0].message.content || "[]";
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  const cards = JSON.parse(cleaned);

  return cards.map((card: any, i: number) => ({
    ...card,
    id: startId + i,
    status: "active",
    flag: 0,
    plural_form: card.plural_form || null,
  }));
}

// ---------------------------------------------------------------------------
// Quran ayah generation
// ---------------------------------------------------------------------------
async function generateQuranCards(theme: string, themeName: string, startId: number): Promise<any[]> {
  const prompt = `Generate exactly 30 Quran ayah flashcards related to the theme "${themeName}".

${CONTENT_FILTER}

Requirements:
- Select well-known, important ayahs from across the Quran related to this theme
- Include ayahs from diverse surahs (not all from one surah)
- Include full Arabic text with tashkeel
- Include accurate English translation (Sahih International or similar respected translation)
- Include transliteration
- Include 2-4 key vocabulary words from each ayah with their meanings
- Include the theme description
- Include basic tajweed notes where relevant
- Specify if the surah is Makki or Madani

Return a JSON array where each object has:
{
  "ayah_text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "surah_name": "الفاتحة - Al-Fatiha",
  "surah_number": 1,
  "ayah_number": 1,
  "juz_number": 1,
  "english_translation": "In the name of Allah, the Most Gracious, the Most Merciful.",
  "transliteration": "Bismillahir-Rahmanir-Rahim",
  "key_vocabulary": [
    { "word": "بِسْمِ", "meaning": "In the name of" },
    { "word": "الرَّحْمَٰنِ", "meaning": "The Most Gracious" }
  ],
  "theme": "${themeName}",
  "tajweed_notes": "Madd tabee'i in الرَّحِيمِ",
  "tags": ["quran", "surah::al-fatiha", "topic::${theme}"],
  "revelation": "makki"
}

Return ONLY the JSON array, no markdown or explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 10000,
  });

  const text = response.choices[0].message.content || "[]";
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  const cards = JSON.parse(cleaned);

  return cards.map((card: any, i: number) => {
    // Compute audio URL for Mishary Al-Afasy
    const surahStr = String(card.surah_number).padStart(3, "0");
    const ayahStr = String(card.ayah_number).padStart(3, "0");
    const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${surahStr}${ayahStr}.mp3`;

    return {
      ...card,
      id: startId + i,
      audioUrl,
      status: "active",
      flag: 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Spanish generation
// ---------------------------------------------------------------------------
async function generateSpanishCards(topicId: string, topicName: string, startId: number): Promise<any[]> {
  const prompt = `Generate exactly 40 Spanish vocabulary flashcards for the topic "${topicName}".

${CONTENT_FILTER}

Requirements:
- Mix of nouns (at least 15), verbs (at least 12), and adjectives (at least 8)
- Order from easiest/most common (A1) to harder (B2/C1) words
- Include natural example sentences in Spanish and English
- Include CEFR level (A1, A2, B1, B2, C1)
- For verbs, include conjugation hints (present tense: yo, tú, él forms)
- For nouns, include gender (masculine/feminine/null for verbs)
- Include 2-3 common collocations where relevant
- Tags should include: theme:${topicId}, CEFR level, part of speech, frequency info

Return a JSON array where each object has:
{
  "front": "comer",
  "back": "to eat",
  "part_of_speech": "verb",
  "gender": null,
  "example_es": "Me gusta comer frutas frescas.",
  "example_en": "I like to eat fresh fruits.",
  "difficulty": "beginner",
  "frequency_rank": 50,
  "sort_position": 1,
  "cefr_level": "A1",
  "tags": ["verb", "theme:${topicId}", "A1"],
  "conjugation_hint": "como, comes, come, comemos, coméis, comen",
  "collocations": ["comer bien", "comer fuera"]
}

Return ONLY the JSON array, no markdown or explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 10000,
  });

  const text = response.choices[0].message.content || "[]";
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  const cards = JSON.parse(cleaned);

  return cards.map((card: any, i: number) => ({
    ...card,
    id: `es-${String(startId + i).padStart(4, "0")}`,
    collocations: card.collocations || [],
    conjugation_hint: card.conjugation_hint || undefined,
  }));
}

// ---------------------------------------------------------------------------
// Egyptian Arabic generation
// ---------------------------------------------------------------------------
async function generateEgyptianCards(topicId: string, topicName: string, startId: number): Promise<any[]> {
  const prompt = `Generate exactly 30 Egyptian Arabic (Ammiya/dialect) vocabulary flashcards for the topic "${topicName}".

${CONTENT_FILTER}

Requirements:
- These should be EGYPTIAN DIALECT, not MSA (Fusha)
- Mix of nouns (at least 10), verbs (at least 8), adjectives (at least 5), and common phrases (at least 5)
- Order from easiest/most common first to harder words
- Include the MSA (Fusha) equivalent for each word
- Include transliteration
- Include usage context (formal, informal, slang)
- Example sentences should be in Egyptian dialect
- Tags should include the topic

Return a JSON array where each object has:
{
  "front": "عايز",
  "back": "I want (masculine)",
  "transliteration": "'aayez",
  "fusha_equivalent": "أُرِيدُ",
  "part_of_speech": "verb",
  "usage_context": "informal",
  "example_eg": "أنا عايز أروح البيت",
  "example_en": "I want to go home",
  "difficulty": "beginner",
  "frequency_rank": 10,
  "sort_position": 1,
  "tags": ["dialect", "topic:${topicId}"],
  "topic_tags": ["${topicId}"]
}

Return ONLY the JSON array, no markdown or explanation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 8000,
  });

  const text = response.choices[0].message.content || "[]";
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  const cards = JSON.parse(cleaned);

  return cards.map((card: any, i: number) => ({
    ...card,
    id: `eg-${String(startId + i).padStart(4, "0")}`,
  }));
}

// ---------------------------------------------------------------------------
// Merge cards into existing files
// ---------------------------------------------------------------------------
function loadExisting(filename: string): any[] {
  const filepath = path.join(CARDS_DIR, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  }
  return [];
}

function saveCards(filename: string, cards: any[]) {
  const filepath = path.join(CARDS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(cards, null, 2), "utf-8");
  console.log(`  Saved ${cards.length} cards to ${filename}`);
}

function deduplicateArabic(existing: any[], newCards: any[]): any[] {
  const existingWords = new Set(existing.map((c: any) => c.arabic_word));
  return newCards.filter((c: any) => !existingWords.has(c.arabic_word));
}

function deduplicateSpanish(existing: any[], newCards: any[]): any[] {
  const existingWords = new Set(existing.map((c: any) => c.front));
  return newCards.filter((c: any) => !existingWords.has(c.front));
}

function deduplicateEgyptian(existing: any[], newCards: any[]): any[] {
  const existingWords = new Set(existing.map((c: any) => c.front));
  return newCards.filter((c: any) => !existingWords.has(c.front));
}

function deduplicateQuran(existing: any[], newCards: any[]): any[] {
  const existingKeys = new Set(
    existing.map((c: any) => `${c.surah_number}-${c.ayah_number}`)
  );
  return newCards.filter(
    (c: any) => !existingKeys.has(`${c.surah_number}-${c.ayah_number}`)
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const targetLang = args[0] || "all";
  const targetTopic = args[1] || null;

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    console.error("Usage: OPENAI_API_KEY=sk-... npx tsx scripts/generate-cards.ts [language] [topic]");
    process.exit(1);
  }

  console.log(`\n🫒 Zaytuna Card Generator`);
  console.log(`========================\n`);

  // ---- Arabic MSA ----
  if (targetLang === "all" || targetLang === "arabic") {
    console.log("📚 Generating Arabic MSA cards...\n");
    const existing = loadExisting("arabic_unified.json");
    let maxId = Math.max(0, ...existing.map((c: any) => (typeof c.id === "number" ? c.id : 0)));
    const allNew: any[] = [];

    const topics = targetTopic
      ? TOPICS.filter((t) => t.id === targetTopic)
      : TOPICS;

    for (const topic of topics) {
      console.log(`  → ${topic.name}...`);
      try {
        const cards = await generateArabicCards(topic.id, topic.name, maxId + 1);
        const unique = deduplicateArabic([...existing, ...allNew], cards);
        allNew.push(...unique);
        maxId += cards.length;
        console.log(`    Generated ${cards.length}, unique: ${unique.length}`);
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
      // Rate limit buffer
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (allNew.length > 0) {
      saveCards("arabic_unified.json", [...existing, ...allNew]);
      console.log(`\n  Total Arabic: ${existing.length + allNew.length} cards (+${allNew.length} new)\n`);
    }
  }

  // ---- Quran ----
  if (targetLang === "all" || targetLang === "quran") {
    console.log("📖 Generating Quran ayah cards...\n");
    const existing = loadExisting("quran.json");
    let maxId = Math.max(0, ...existing.map((c: any) => (typeof c.id === "number" ? c.id : 0)));
    const allNew: any[] = [];

    const themes = targetTopic
      ? QURAN_THEMES.filter((t) => t.id === targetTopic)
      : QURAN_THEMES;

    for (const theme of themes) {
      console.log(`  → ${theme.name}...`);
      try {
        const cards = await generateQuranCards(theme.id, theme.name, maxId + 1);
        const unique = deduplicateQuran([...existing, ...allNew], cards);
        allNew.push(...unique);
        maxId += cards.length;
        console.log(`    Generated ${cards.length}, unique: ${unique.length}`);
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Add audio URLs to existing cards that don't have them
    const enriched = existing.map((card: any) => {
      if (!card.audioUrl && card.surah_number && card.ayah_number) {
        const s = String(card.surah_number).padStart(3, "0");
        const a = String(card.ayah_number).padStart(3, "0");
        card.audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
      }
      return card;
    });

    if (allNew.length > 0 || enriched.some((c: any) => c.audioUrl)) {
      saveCards("quran.json", [...enriched, ...allNew]);
      console.log(`\n  Total Quran: ${enriched.length + allNew.length} cards (+${allNew.length} new)\n`);
    }
  }

  // ---- Spanish ----
  if (targetLang === "all" || targetLang === "spanish") {
    console.log("🇪🇸 Generating Spanish cards...\n");
    const existing = loadExisting("spanish.json");
    let maxNum = 0;
    for (const c of existing) {
      const num = parseInt(String(c.id).replace("es-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    const allNew: any[] = [];

    const topics = targetTopic
      ? TOPICS.filter((t) => t.id === targetTopic)
      : TOPICS;

    for (const topic of topics) {
      console.log(`  → ${topic.name}...`);
      try {
        const cards = await generateSpanishCards(topic.id, topic.name, maxNum + 1);
        const unique = deduplicateSpanish([...existing, ...allNew], cards);
        allNew.push(...unique);
        maxNum += cards.length;
        console.log(`    Generated ${cards.length}, unique: ${unique.length}`);
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (allNew.length > 0) {
      saveCards("spanish.json", [...existing, ...allNew]);
      console.log(`\n  Total Spanish: ${existing.length + allNew.length} cards (+${allNew.length} new)\n`);
    }
  }

  // ---- Egyptian Arabic ----
  if (targetLang === "all" || targetLang === "egyptian") {
    console.log("🇪🇬 Generating Egyptian Arabic cards...\n");
    const existing = loadExisting("egyptian_arabic.json");
    let maxNum = 0;
    for (const c of existing) {
      const num = parseInt(String(c.id).replace("eg-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    const allNew: any[] = [];

    const topics = targetTopic
      ? TOPICS.filter((t) => t.id === targetTopic)
      : TOPICS;

    for (const topic of topics) {
      console.log(`  → ${topic.name}...`);
      try {
        const cards = await generateEgyptianCards(topic.id, topic.name, maxNum + 1);
        const unique = deduplicateEgyptian([...existing, ...allNew], cards);
        allNew.push(...unique);
        maxNum += cards.length;
        console.log(`    Generated ${cards.length}, unique: ${unique.length}`);
      } catch (err: any) {
        console.error(`    Error: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (allNew.length > 0) {
      saveCards("egyptian_arabic.json", [...existing, ...allNew]);
      console.log(`\n  Total Egyptian: ${existing.length + allNew.length} cards (+${allNew.length} new)\n`);
    }
  }

  console.log("✅ Card generation complete!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

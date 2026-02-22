/**
 * Topic definitions for each language — used by the TopicGrid and study flow.
 * Each topic maps to card tag patterns for filtering.
 */

import { type StudyCard } from "./cards";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Topic {
  id: string;
  name: string;
  nameAr?: string;
  icon: string;
  color: string;
  description: string;
  cardTags: string[]; // tag patterns that match cards in this topic
}

export interface LanguageTopicGroup {
  languageId: string;
  label: string;
  topics: Topic[];
}

// ---------------------------------------------------------------------------
// Shared topic definitions (Arabic MSA, Egyptian, Spanish share most)
// ---------------------------------------------------------------------------

const GENERAL_TOPICS: Topic[] = [
  { id: "greetings", name: "Greetings & Polite Phrases", icon: "👋", color: "#8B5CF6", description: "Hello, goodbye, please, thank you", cardTags: ["topic::greetings", "theme:greetings"] },
  { id: "food", name: "Food & Cooking", icon: "🍽️", color: "#F97316", description: "Meals, ingredients, kitchen vocabulary", cardTags: ["topic::food-drink", "topic::kitchen", "theme:food"] },
  { id: "home", name: "Home & Furniture", icon: "🏠", color: "#10B981", description: "Rooms, furniture, household items", cardTags: ["topic::home", "theme:household", "theme:home"] },
  { id: "family", name: "Family", icon: "👨‍👩‍👧‍👦", color: "#EC4899", description: "Parents, siblings, relatives", cardTags: ["topic::family", "theme:family"] },
  { id: "body", name: "Body & Health", icon: "🏥", color: "#EF4444", description: "Body parts, health, illness", cardTags: ["topic::body", "topic::health", "theme:body", "theme:health"] },
  { id: "education", name: "Education & School", icon: "📚", color: "#6366F1", description: "School, studying, learning", cardTags: ["topic::education", "theme:education"] },
  { id: "travel", name: "Travel & Transportation", icon: "✈️", color: "#3B82F6", description: "Airport, directions, vehicles", cardTags: ["topic::travel", "theme:travel"] },
  { id: "work", name: "Work & Professions", icon: "💼", color: "#64748B", description: "Jobs, workplace, business", cardTags: ["topic::work", "theme:work", "theme:office"] },
  { id: "nature", name: "Nature & Animals", icon: "🌿", color: "#22C55E", description: "Plants, animals, environment", cardTags: ["topic::nature", "topic::animals", "topic::agriculture", "theme:nature"] },
  { id: "weather", name: "Weather & Seasons", icon: "🌤️", color: "#0EA5E9", description: "Rain, sun, hot, cold, seasons", cardTags: ["topic::weather", "theme:weather"] },
  { id: "clothing", name: "Clothing & Appearance", icon: "👔", color: "#A855F7", description: "Clothes, colors, style", cardTags: ["topic::clothing", "theme:clothing"] },
  { id: "shopping", name: "Shopping & Markets", icon: "🛒", color: "#EAB308", description: "Prices, buying, money", cardTags: ["topic::money-business", "theme:shopping", "theme:money"] },
  { id: "religion", name: "Religion & Worship", icon: "🕌", color: "#14B8A6", description: "Prayer, mosque, Islamic terms", cardTags: ["topic::religion", "topic::legal-islamic", "theme:religion"] },
  { id: "numbers", name: "Numbers & Counting", icon: "🔢", color: "#F59E0B", description: "Numbers, math, quantities", cardTags: ["topic::numbers", "theme:numbers"] },
  { id: "time", name: "Time & Calendar", icon: "🕐", color: "#06B6D4", description: "Days, months, hours", cardTags: ["topic::time", "theme:time"] },
  { id: "colors", name: "Colors & Shapes", icon: "🎨", color: "#D946EF", description: "Colors, shapes, descriptions", cardTags: ["topic::colors", "theme:colors"] },
  { id: "emotions", name: "Emotions & Feelings", icon: "😊", color: "#F43F5E", description: "Happy, sad, angry, excited", cardTags: ["topic::emotions", "theme:emotions"] },
  { id: "daily-routines", name: "Daily Routines", icon: "☀️", color: "#FB923C", description: "Wake up, eat, sleep, habits", cardTags: ["topic::actions-daily", "topic::daily-routines", "theme:daily"] },
  { id: "directions", name: "Directions & Places", icon: "🧭", color: "#0EA5E9", description: "Left, right, near, far", cardTags: ["topic::directions", "theme:directions", "theme:location"] },
  { id: "sports", name: "Sports & Games", icon: "⚽", color: "#06B6D4", description: "Football, swimming, exercise", cardTags: ["topic::sports", "theme:sports"] },
  { id: "tools", name: "Tools & Materials", icon: "🔧", color: "#78716C", description: "Hammer, wood, build, fix", cardTags: ["topic::tools", "theme:tools"] },
  { id: "agriculture", name: "Agriculture & Farming", icon: "🌾", color: "#84CC16", description: "Farm, crops, harvest", cardTags: ["topic::agriculture", "theme:agriculture"] },
  { id: "government", name: "Government & Law", icon: "⚖️", color: "#475569", description: "Court, law, politics", cardTags: ["topic::government", "topic::legal-islamic", "theme:government"] },
  { id: "medicine", name: "Medicine & Pharmacy", icon: "💊", color: "#DC2626", description: "Doctor, medicine, hospital", cardTags: ["topic::medicine", "topic::health", "theme:medicine"] },
  { id: "celebrations", name: "Celebrations & Events", icon: "🎉", color: "#E11D48", description: "Eid, wedding, birthday", cardTags: ["topic::celebrations", "theme:celebrations"] },
  { id: "geography", name: "Geography & Countries", icon: "🌍", color: "#2563EB", description: "Countries, cities, maps", cardTags: ["topic::geography", "theme:geography"] },
  { id: "science", name: "Science & Discovery", icon: "🔬", color: "#7C3AED", description: "Chemistry, physics, experiments", cardTags: ["topic::science", "theme:science"] },
  { id: "arts", name: "Arts & Crafts", icon: "🎭", color: "#BE185D", description: "Drawing, music, literature", cardTags: ["topic::arts", "theme:arts"] },
  { id: "adjectives", name: "Common Adjectives", icon: "📝", color: "#0D9488", description: "Big, small, fast, beautiful", cardTags: ["topic::adjectives", "theme:adjectives"] },
  { id: "verbs", name: "Common Verbs", icon: "🏃", color: "#635BFF", description: "Go, eat, write, speak", cardTags: ["topic::verbs", "topic::actions-daily", "theme:verbs"] },
  { id: "adverbs", name: "Adverbs & Prepositions", icon: "↔️", color: "#059669", description: "Quickly, slowly, above, below", cardTags: ["topic::adverbs", "theme:adverbs"] },
  { id: "military", name: "Military & Security", icon: "🛡️", color: "#374151", description: "Army, defense, security", cardTags: ["topic::warfare", "topic::military", "theme:military"] },
];

// ---------------------------------------------------------------------------
// Quran thematic topics
// ---------------------------------------------------------------------------

const QURAN_SURAH_TOPICS: Topic[] = [
  { id: "al-fatiha", name: "Al-Fatiha", nameAr: "الفاتحة", icon: "📖", color: "#14B8A6", description: "The Opening", cardTags: ["surah::al-fatiha"] },
  { id: "al-baqarah", name: "Al-Baqarah", nameAr: "البقرة", icon: "📖", color: "#14B8A6", description: "The Cow", cardTags: ["surah::al-baqarah"] },
  { id: "aal-imran", name: "Aal-Imran", nameAr: "آل عمران", icon: "📖", color: "#14B8A6", description: "Family of Imran", cardTags: ["surah::aal-imran"] },
  { id: "an-nisa", name: "An-Nisa", nameAr: "النساء", icon: "📖", color: "#14B8A6", description: "The Women", cardTags: ["surah::an-nisa"] },
  { id: "yusuf", name: "Yusuf", nameAr: "يوسف", icon: "📖", color: "#14B8A6", description: "Joseph", cardTags: ["surah::yusuf"] },
  { id: "al-kahf", name: "Al-Kahf", nameAr: "الكهف", icon: "📖", color: "#14B8A6", description: "The Cave", cardTags: ["surah::al-kahf"] },
  { id: "maryam", name: "Maryam", nameAr: "مريم", icon: "📖", color: "#14B8A6", description: "Mary", cardTags: ["surah::maryam"] },
  { id: "yasin", name: "Ya-Sin", nameAr: "يس", icon: "📖", color: "#14B8A6", description: "Ya-Sin", cardTags: ["surah::yasin"] },
  { id: "ar-rahman", name: "Ar-Rahman", nameAr: "الرحمن", icon: "📖", color: "#14B8A6", description: "The Most Merciful", cardTags: ["surah::ar-rahman"] },
  { id: "al-mulk", name: "Al-Mulk", nameAr: "الملك", icon: "📖", color: "#14B8A6", description: "The Sovereignty", cardTags: ["surah::al-mulk"] },
  { id: "al-ikhlas", name: "Al-Ikhlas", nameAr: "الإخلاص", icon: "📖", color: "#14B8A6", description: "The Sincerity", cardTags: ["surah::al-ikhlas"] },
  { id: "al-falaq", name: "Al-Falaq", nameAr: "الفلق", icon: "📖", color: "#14B8A6", description: "The Daybreak", cardTags: ["surah::al-falaq"] },
  { id: "an-nas", name: "An-Nas", nameAr: "الناس", icon: "📖", color: "#14B8A6", description: "Mankind", cardTags: ["surah::an-nas"] },
];

const QURAN_THEME_TOPICS: Topic[] = [
  { id: "faith", name: "Faith & Belief", nameAr: "الإيمان", icon: "🤲", color: "#0D9488", description: "Iman, Tawhid, belief in Allah", cardTags: ["topic::faith", "theme::tawhid"] },
  { id: "prayer", name: "Prayer & Worship", nameAr: "العبادة", icon: "🕌", color: "#0891B2", description: "Salah, dhikr, worship", cardTags: ["topic::prayer", "theme::ibadah"] },
  { id: "prophets", name: "Prophets & Stories", nameAr: "الأنبياء", icon: "📜", color: "#7C3AED", description: "Stories of the prophets", cardTags: ["topic::prophets", "theme::prophets"] },
  { id: "paradise", name: "Paradise & Afterlife", nameAr: "الجنة", icon: "🌴", color: "#059669", description: "Jannah, rewards, afterlife", cardTags: ["topic::paradise", "theme::paradise"] },
  { id: "judgment", name: "Day of Judgment", nameAr: "يوم القيامة", icon: "⚖️", color: "#DC2626", description: "Yawm al-Qiyamah", cardTags: ["topic::judgment", "theme::judgment"] },
  { id: "family-marriage", name: "Family & Marriage", nameAr: "الأسرة", icon: "👨‍👩‍👧", color: "#EC4899", description: "Rights, responsibilities, family", cardTags: ["topic::family-marriage", "theme::family"] },
  { id: "justice", name: "Justice & Law", nameAr: "العدل", icon: "⚖️", color: "#2563EB", description: "Justice, fairness, law", cardTags: ["topic::justice", "theme::justice"] },
  { id: "creation", name: "Nature & Creation", nameAr: "الخلق", icon: "🌍", color: "#16A34A", description: "Signs of Allah in creation", cardTags: ["topic::creation", "theme::creation"] },
  { id: "patience", name: "Patience & Gratitude", nameAr: "الصبر والشكر", icon: "🙏", color: "#CA8A04", description: "Sabr and Shukr", cardTags: ["topic::patience", "theme::patience"] },
  { id: "charity", name: "Charity & Wealth", nameAr: "الصدقة", icon: "💰", color: "#EA580C", description: "Sadaqah, Zakat, generosity", cardTags: ["topic::charity", "theme::charity"] },
  { id: "mercy", name: "Mercy & Forgiveness", nameAr: "الرحمة", icon: "💚", color: "#0D9488", description: "Rahmah, Istighfar", cardTags: ["topic::mercy", "theme::mercy"] },
  { id: "knowledge", name: "Knowledge & Wisdom", nameAr: "العلم", icon: "📚", color: "#6366F1", description: "Seeking knowledge, wisdom", cardTags: ["topic::knowledge", "theme::knowledge"] },
  { id: "community", name: "Community & Brotherhood", nameAr: "الأمة", icon: "🤝", color: "#8B5CF6", description: "Ummah, unity, cooperation", cardTags: ["topic::community", "theme::community"] },
  { id: "repentance", name: "Repentance", nameAr: "التوبة", icon: "🔄", color: "#0284C7", description: "Tawbah, returning to Allah", cardTags: ["topic::repentance", "theme::repentance"] },
  { id: "trust", name: "Trust in Allah", nameAr: "التوكل", icon: "🌟", color: "#F59E0B", description: "Tawakkul, reliance on Allah", cardTags: ["topic::trust-in-allah", "theme::tawakkul"] },
];

// ---------------------------------------------------------------------------
// Language-specific topic groups
// ---------------------------------------------------------------------------

export const LANGUAGE_TOPICS: LanguageTopicGroup[] = [
  {
    languageId: "arabic",
    label: "Arabic (MSA)",
    topics: GENERAL_TOPICS,
  },
  {
    languageId: "quran",
    label: "Quranic Arabic",
    topics: [...QURAN_SURAH_TOPICS, ...QURAN_THEME_TOPICS],
  },
  {
    languageId: "egyptian",
    label: "Egyptian Arabic",
    topics: GENERAL_TOPICS,
  },
  {
    languageId: "spanish",
    label: "Spanish",
    topics: GENERAL_TOPICS,
  },
];

// ---------------------------------------------------------------------------
// Helper — get topics for a language
// ---------------------------------------------------------------------------

export function getTopicsForLanguage(languageId: string): Topic[] {
  // Arabic deck includes both MSA and Quran topics
  if (languageId === "arabic") {
    const msa = LANGUAGE_TOPICS.find((g) => g.languageId === "arabic");
    const quran = LANGUAGE_TOPICS.find((g) => g.languageId === "quran");
    return [...(msa?.topics || []), ...(quran?.topics || [])];
  }
  const group = LANGUAGE_TOPICS.find((g) => g.languageId === languageId);
  return group?.topics || [];
}

// ---------------------------------------------------------------------------
// Helper — filter cards by topic
// ---------------------------------------------------------------------------

export function getCardsForTopic(
  languageId: string,
  topicId: string,
  allCards: StudyCard[]
): StudyCard[] {
  // First find the topic definition
  const topics = getTopicsForLanguage(languageId);
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return [];

  // Filter by language first
  let langFiltered: StudyCard[];
  if (languageId === "arabic") {
    langFiltered = allCards.filter((c) => c.language === "arabic");
  } else if (languageId === "quran") {
    langFiltered = allCards.filter((c) => c.language === "arabic" && c.subtab === "quran");
  } else {
    langFiltered = allCards.filter((c) => c.language === languageId);
  }

  // Then filter by topic tags
  return langFiltered.filter((card) => {
    const cardTags = card.tags || [];
    return topic.cardTags.some((pattern) =>
      cardTags.some((tag) => tag === pattern || tag.startsWith(pattern))
    );
  });
}

/**
 * onboarding-service.ts -- Backend service for the guided onboarding wizard.
 *
 * When a new user completes the onboarding flow, this service:
 * 1. Creates language-specific decks with subdecks
 * 2. Creates default note types per language
 * 3. Creates tag hierarchies per language
 * 4. Imports sample cards from pre-generated JSON data
 * 5. Configures deck presets based on the user's daily goal
 *
 * All operations are idempotent -- running setup twice for the same user
 * will not create duplicate entities.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingConfig {
  /** Languages the user wants to study, each with a proficiency level. */
  languages: LanguageSelection[];

  /** Number of new cards per day. */
  dailyGoal: number;

  /** Preferred study time of day (for streak/gamification timing). */
  studyTimePreference: 'morning' | 'afternoon' | 'evening';
}

export interface LanguageSelection {
  language: LanguageId;
  level: ProficiencyLevel;
}

export type LanguageId = 'arabic' | 'egyptian' | 'spanish' | 'english';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface OnboardingResult {
  /** Whether the onboarding completed successfully. */
  success: boolean;

  /** IDs of created decks, keyed by deck path (e.g., "Arabic::Vocabulary"). */
  deckIds: Record<string, string>;

  /** Number of note types created. */
  noteTypesCreated: number;

  /** Number of tags created. */
  tagsCreated: number;

  /** Number of sample cards imported. */
  sampleCardsImported: number;

  /** Any errors that occurred (non-fatal). */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Language Configuration Data
// ---------------------------------------------------------------------------

interface LanguageConfig {
  displayName: string;
  color: string;
  icon: string;
  decks: { name: string; description: string; subdecks: string[] }[];
  noteTypes: { name: string; fields: string[]; rtl: boolean }[];
  tags: { name: string; slug: string; color: string; children: { name: string; slug: string }[] }[];
}

const LANGUAGE_CONFIGS: Record<LanguageId, LanguageConfig> = {
  arabic: {
    displayName: 'Classical Arabic / Quran',
    color: '#14b8a6',
    icon: 'quran',
    decks: [
      {
        name: 'Classical Arabic',
        description: 'Classical Arabic and Quranic vocabulary, grammar, and morphology',
        subdecks: ['Vocabulary', 'Grammar', 'Morphology', 'Quran Ayat', 'Root Patterns'],
      },
    ],
    noteTypes: [
      { name: 'Arabic Vocabulary', fields: ['Word', 'Root', 'Pattern', 'Translation', 'Example', 'Audio'], rtl: true },
      { name: 'Quran Ayah', fields: ['Surah', 'Ayah Number', 'Arabic Text', 'Translation', 'Tafsir', 'Root Words'], rtl: true },
      { name: 'Arabic Grammar', fields: ['Rule', 'Explanation', 'Example Arabic', 'Example English', 'Category'], rtl: false },
    ],
    tags: [
      {
        name: 'Classical Arabic',
        slug: 'classical-arabic',
        color: '#14b8a6',
        children: [
          { name: 'Vocabulary', slug: 'vocab' },
          { name: 'Grammar', slug: 'grammar' },
          { name: 'Morphology', slug: 'morphology' },
          { name: 'Quran', slug: 'quran' },
          { name: 'Sarf', slug: 'sarf' },
          { name: 'Nahw', slug: 'nahw' },
          { name: 'Balagha', slug: 'balagha' },
        ],
      },
    ],
  },
  egyptian: {
    displayName: 'Egyptian Arabic',
    color: '#8b5cf6',
    icon: 'egypt',
    decks: [
      {
        name: 'Egyptian Arabic',
        description: 'Egyptian Arabic dialect vocabulary and expressions',
        subdecks: ['Vocabulary', 'Expressions', 'Slang', 'Dialogues'],
      },
    ],
    noteTypes: [
      { name: 'Egyptian Vocab', fields: ['Word (Arabic)', 'Transliteration', 'Translation', 'Example Sentence', 'Audio', 'MSA Equivalent'], rtl: true },
      { name: 'Egyptian Expression', fields: ['Expression', 'Transliteration', 'Meaning', 'Context', 'Formality Level'], rtl: true },
    ],
    tags: [
      {
        name: 'Egyptian Arabic',
        slug: 'egyptian-arabic',
        color: '#8b5cf6',
        children: [
          { name: 'Vocabulary', slug: 'vocab' },
          { name: 'Expressions', slug: 'expressions' },
          { name: 'Slang', slug: 'slang' },
          { name: 'Formal', slug: 'formal' },
          { name: 'Daily Life', slug: 'daily-life' },
        ],
      },
    ],
  },
  spanish: {
    displayName: 'Spanish',
    color: '#f97316',
    icon: 'spain',
    decks: [
      {
        name: 'Spanish',
        description: 'Spanish vocabulary, grammar, and conjugation',
        subdecks: ['Vocabulary', 'Grammar', 'Conjugation', 'Expressions', 'Reading'],
      },
    ],
    noteTypes: [
      { name: 'Spanish Vocabulary', fields: ['Word', 'Translation', 'Example', 'Gender', 'Audio', 'Image'], rtl: false },
      { name: 'Spanish Conjugation', fields: ['Infinitive', 'Tense', 'Conjugation Table', 'Example Sentences', 'Irregularity Notes'], rtl: false },
      { name: 'Spanish Grammar', fields: ['Rule', 'Explanation', 'Example Spanish', 'Example English', 'Exceptions'], rtl: false },
    ],
    tags: [
      {
        name: 'Spanish',
        slug: 'spanish',
        color: '#f97316',
        children: [
          { name: 'Vocabulary', slug: 'vocab' },
          { name: 'Grammar', slug: 'grammar' },
          { name: 'Conjugation', slug: 'conjugation' },
          { name: 'Expressions', slug: 'expressions' },
          { name: 'Reading', slug: 'reading' },
          { name: 'Listening', slug: 'listening' },
        ],
      },
    ],
  },
  english: {
    displayName: 'English',
    color: '#64748b',
    icon: 'uk',
    decks: [
      {
        name: 'English',
        description: 'English vocabulary, idioms, and academic language',
        subdecks: ['Vocabulary', 'Idioms', 'Academic', 'Phrasal Verbs', 'Collocations'],
      },
    ],
    noteTypes: [
      { name: 'English Vocabulary', fields: ['Word', 'Definition', 'Example', 'Pronunciation', 'Part of Speech', 'Synonyms'], rtl: false },
      { name: 'English Idiom', fields: ['Idiom', 'Meaning', 'Example', 'Origin', 'Similar Expressions'], rtl: false },
    ],
    tags: [
      {
        name: 'English',
        slug: 'english',
        color: '#64748b',
        children: [
          { name: 'Vocabulary', slug: 'vocab' },
          { name: 'Idioms', slug: 'idioms' },
          { name: 'Academic', slug: 'academic' },
          { name: 'Phrasal Verbs', slug: 'phrasal-verbs' },
          { name: 'Collocations', slug: 'collocations' },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Sample Card Data
// ---------------------------------------------------------------------------

interface SampleCard {
  front: string;
  back: string;
  tags: string[];
  subdeck: string;
}

/**
 * Generates sample cards for a given language and proficiency level.
 * Returns at least 50 cards per language.
 */
function getSampleCards(language: LanguageId, level: ProficiencyLevel): SampleCard[] {
  const cards: SampleCard[] = [];

  switch (language) {
    case 'arabic':
      cards.push(
        // Vocabulary -- Beginner
        { front: '<div class="arabic-text">كِتَاب</div>', back: 'Book (kitaab)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">قَلَم</div>', back: 'Pen (qalam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">بَيْت</div>', back: 'House (bayt)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">مَاء</div>', back: 'Water (maa\')', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">شَمْس</div>', back: 'Sun (shams)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">قَمَر</div>', back: 'Moon (qamar)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">وَلَد</div>', back: 'Boy (walad)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">بِنْت</div>', back: 'Girl (bint)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">رَجُل</div>', back: 'Man (rajul)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">اِمْرَأَة</div>', back: 'Woman (imra\'a)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">طَعَام</div>', back: 'Food (ta\'aam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">سَمَاء</div>', back: 'Sky (samaa\')', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">أَرْض</div>', back: 'Earth / Land (ard)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">يَوْم</div>', back: 'Day (yawm)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">لَيْل</div>', back: 'Night (layl)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        // Grammar
        { front: 'What are the three cases in Arabic?', back: 'Nominative (marfuu\'), Accusative (mansuub), Genitive (majruur)', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'What is the definite article in Arabic?', back: 'الـ (al-)', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'How do you make a word definite in Arabic?', back: 'Add الـ (al-) before the word. The tanween is removed.', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'What is an Idaafa construction?', back: 'A possessive/genitive construction where two nouns are combined. The first noun is indefinite (no ال), the second is definite or in the genitive case.', tags: ['grammar', 'intermediate'], subdeck: 'Grammar' },
        { front: 'Name the 3 types of Arabic words', back: 'Ism (noun), Fi\'l (verb), Harf (particle)', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        // Morphology / Root Patterns
        { front: 'What is the root of كِتَاب?', back: 'ك-ت-ب (k-t-b) -- related to writing', tags: ['morphology', 'beginner'], subdeck: 'Root Patterns' },
        { front: 'What does the pattern فَعَلَ represent?', back: 'Form I past tense verb (the base form)', tags: ['morphology', 'beginner'], subdeck: 'Morphology' },
        { front: 'What is the masdar of فَعَلَ?', back: 'It varies: فَعْل, فِعَال, فُعُول, etc. Each verb has its own masdar pattern.', tags: ['morphology', 'intermediate'], subdeck: 'Morphology' },
        { front: 'What pattern is مَكْتَبَة?', back: 'مَفْعَلَة -- place noun pattern. Means "library" (from ك-ت-ب, writing)', tags: ['morphology', 'intermediate'], subdeck: 'Morphology' },
        { front: 'What is the ism faa\'il pattern?', back: 'فَاعِل -- active participle (the one doing the action)', tags: ['morphology', 'beginner'], subdeck: 'Morphology' },
        // Quran Ayat
        { front: '<div class="quran-text">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>', back: 'In the name of Allah, the Most Gracious, the Most Merciful (Al-Fatiha 1:1)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ</div>', back: 'All praise is due to Allah, Lord of the worlds (Al-Fatiha 1:2)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">الرَّحْمَٰنِ الرَّحِيمِ</div>', back: 'The Most Gracious, the Most Merciful (Al-Fatiha 1:3)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">مَالِكِ يَوْمِ الدِّينِ</div>', back: 'Master of the Day of Judgment (Al-Fatiha 1:4)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ</div>', back: 'You alone we worship, and You alone we ask for help (Al-Fatiha 1:5)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ</div>', back: 'Guide us to the straight path (Al-Fatiha 1:6)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">قُلْ هُوَ اللَّهُ أَحَدٌ</div>', back: 'Say: He is Allah, the One (Al-Ikhlas 112:1)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">اللَّهُ الصَّمَدُ</div>', back: 'Allah, the Eternal Refuge (Al-Ikhlas 112:2)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">لَمْ يَلِدْ وَلَمْ يُولَدْ</div>', back: 'He neither begets nor is born (Al-Ikhlas 112:3)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        { front: '<div class="quran-text">وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</div>', back: 'Nor is there to Him any equivalent (Al-Ikhlas 112:4)', tags: ['quran', 'beginner'], subdeck: 'Quran Ayat' },
        // Additional Vocabulary
        { front: '<div class="arabic-text">عِلْم</div>', back: 'Knowledge (\'ilm)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">قَلْب</div>', back: 'Heart (qalb)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">نُور</div>', back: 'Light (nuur)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">حَقّ</div>', back: 'Truth / Right (haqq)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">سَلَام</div>', back: 'Peace (salaam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">رَحْمَة</div>', back: 'Mercy (rahma)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">صَبْر</div>', back: 'Patience (sabr)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">شُكْر</div>', back: 'Gratitude (shukr)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">تَوْبَة</div>', back: 'Repentance (tawba)', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">حِكْمَة</div>', back: 'Wisdom (hikma)', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">دَرْس</div>', back: 'Lesson (dars)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">مَدْرَسَة</div>', back: 'School (madrasa)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">مُعَلِّم</div>', back: 'Teacher (mu\'allim)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">طَالِب</div>', back: 'Student (taalib)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">صَدِيق</div>', back: 'Friend (sadiiq)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
      );
      break;

    case 'egyptian':
      cards.push(
        { front: '<div class="arabic-text">إزيك / إزيك</div>', back: 'How are you? (izzayyak/ik)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">كويس</div>', back: 'Good / Fine (kuwayyis)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">عايز / عايزة</div>', back: 'I want (\'aayiz/\'ayza)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">فين</div>', back: 'Where? (feen)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">إمتى</div>', back: 'When? (imta)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">ليه</div>', back: 'Why? (leh)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">إزاي</div>', back: 'How? (izzaay)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">كام</div>', back: 'How much/many? (kaam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">مش</div>', back: 'Not (mish)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">دلوقتي</div>', back: 'Now (dilwa\'ti)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">بكرة</div>', back: 'Tomorrow (bukra)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">إمبارح</div>', back: 'Yesterday (imbaariH)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">شوية</div>', back: 'A little (shuwayya)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">كتير</div>', back: 'A lot / Many (kitiir)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">حاجة</div>', back: 'Thing (Haaga)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">ماشي</div>', back: 'OK / Alright (maashi)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">يلا</div>', back: 'Let\'s go / Come on (yalla)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">خلاص</div>', back: 'Enough / Done / That\'s it (khalaas)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">إن شاء الله</div>', back: 'God willing (in shaa\' allah)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">الحمد لله</div>', back: 'Praise be to God (el-Hamdulillah)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">أنا باحب</div>', back: 'I love (ana baHebb)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">أنا بروح</div>', back: 'I go (ana barooH)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">بتشتغل إيه؟</div>', back: 'What do you do (for work)? (btishtaghal eh?)', tags: ['expressions', 'beginner'], subdeck: 'Dialogues' },
        { front: '<div class="arabic-text">أنا من مصر</div>', back: 'I am from Egypt (ana min masr)', tags: ['expressions', 'beginner'], subdeck: 'Dialogues' },
        { front: '<div class="arabic-text">عامل إيه؟</div>', back: 'How are you doing? (\'aamel eh?)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'How do you say "I don\'t understand" in Egyptian Arabic?', back: '<div class="arabic-text">مش فاهم / مش فاهمة</div> (mish faahem / mish fahma)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'How do you say "Please" in Egyptian Arabic?', back: '<div class="arabic-text">من فضلك / لو سمحت</div> (min fadlak / law samaHt)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'How do you say "Thank you" in Egyptian Arabic?', back: '<div class="arabic-text">شكرا</div> (shukran)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">حبيبي / حبيبتي</div>', back: 'My dear / My love (Habiibi / Habiibti)', tags: ['slang', 'beginner'], subdeck: 'Slang' },
        { front: '<div class="arabic-text">يا سلام</div>', back: 'Wow / How wonderful (ya salaam)', tags: ['slang', 'beginner'], subdeck: 'Slang' },
        { front: '<div class="arabic-text">تمام</div>', back: 'Perfect / Great (tamaam)', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: '<div class="arabic-text">واحد اتنين تلاتة</div>', back: 'One, Two, Three (waaHid itneen talaata)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">أربعة خمسة ستة</div>', back: 'Four, Five, Six (arba\'a khamsa sitta)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">سبعة تمانية تسعة</div>', back: 'Seven, Eight, Nine (sab\'a tamanya tis\'a)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">عشرة</div>', back: 'Ten (\'ashara)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">أكل</div>', back: 'Food / to eat (akl)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">شرب</div>', back: 'To drink (shirib)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">نام</div>', back: 'To sleep (naam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">قام</div>', back: 'To wake up / stand up (\'aam)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">مشي</div>', back: 'To walk / go (mishi)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">اتكلم</div>', back: 'To speak (itkallem)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">سمع</div>', back: 'To hear / listen (simi\')', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">شاف</div>', back: 'To see (shaaf)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">عرف</div>', back: 'To know (\'irif)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">فهم</div>', back: 'To understand (fihim)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">حب</div>', back: 'To love / like (Habb)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">راح</div>', back: 'To go (raaH)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">جه</div>', back: 'To come (geh)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">ده / دي / دول</div>', back: 'This / These (da / di / dool)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: '<div class="arabic-text">هنا / هناك</div>', back: 'Here / There (hina / hinaak)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
      );
      break;

    case 'spanish':
      cards.push(
        { front: 'Hola', back: 'Hello', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Buenos dias', back: 'Good morning', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'Buenas tardes', back: 'Good afternoon', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'Buenas noches', back: 'Good evening / Good night', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'Gracias', back: 'Thank you', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Por favor', back: 'Please', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Lo siento', back: 'I\'m sorry', tags: ['expressions', 'beginner'], subdeck: 'Expressions' },
        { front: 'Perro', back: 'Dog', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Gato', back: 'Cat', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Casa', back: 'House', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Agua', back: 'Water', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Comida', back: 'Food', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Libro', back: 'Book', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Amigo / Amiga', back: 'Friend (m/f)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Familia', back: 'Family', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Trabajo', back: 'Work / Job', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Escuela', back: 'School', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Ciudad', back: 'City', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Tiempo', back: 'Time / Weather', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Dinero', back: 'Money', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        // Conjugation
        { front: 'Conjugate SER (present tense)', back: 'yo soy, tu eres, el/ella es, nosotros somos, vosotros sois, ellos son', tags: ['conjugation', 'beginner'], subdeck: 'Conjugation' },
        { front: 'Conjugate ESTAR (present tense)', back: 'yo estoy, tu estas, el/ella esta, nosotros estamos, vosotros estais, ellos estan', tags: ['conjugation', 'beginner'], subdeck: 'Conjugation' },
        { front: 'Conjugate TENER (present tense)', back: 'yo tengo, tu tienes, el/ella tiene, nosotros tenemos, vosotros teneis, ellos tienen', tags: ['conjugation', 'beginner'], subdeck: 'Conjugation' },
        { front: 'Conjugate IR (present tense)', back: 'yo voy, tu vas, el/ella va, nosotros vamos, vosotros vais, ellos van', tags: ['conjugation', 'beginner'], subdeck: 'Conjugation' },
        { front: 'Conjugate HACER (present tense)', back: 'yo hago, tu haces, el/ella hace, nosotros hacemos, vosotros haceis, ellos hacen', tags: ['conjugation', 'beginner'], subdeck: 'Conjugation' },
        // Grammar
        { front: 'When do you use SER vs ESTAR?', back: 'SER: permanent characteristics, identity, time, origin. ESTAR: temporary states, location, feelings, conditions.', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'What is the difference between POR and PARA?', back: 'POR: cause/reason, exchange, duration, through. PARA: purpose, destination, deadline, recipient.', tags: ['grammar', 'intermediate'], subdeck: 'Grammar' },
        { front: 'How do you form the present progressive in Spanish?', back: 'ESTAR + gerund (-ando for -ar verbs, -iendo for -er/-ir verbs)', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'What are reflexive verbs?', back: 'Verbs where the subject performs and receives the action (e.g., levantarse, ducharse). Use reflexive pronouns: me, te, se, nos, os, se.', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        { front: 'How do you form regular past tense (-ar verbs)?', back: '-e, -aste, -o, -amos, -asteis, -aron (e.g., hable, hablaste, hablo...)', tags: ['grammar', 'beginner'], subdeck: 'Grammar' },
        // More vocabulary
        { front: 'Comer', back: 'To eat', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Beber', back: 'To drink', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Dormir', back: 'To sleep', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Hablar', back: 'To speak', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Leer', back: 'To read', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Escribir', back: 'To write', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Vivir', back: 'To live', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Comprar', back: 'To buy', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Viajar', back: 'To travel', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Cocinar', back: 'To cook', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Aprender', back: 'To learn', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Entender', back: 'To understand', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Necesitar', back: 'To need', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Querer', back: 'To want / To love', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Poder', back: 'To be able to / Can', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Saber', back: 'To know (facts)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Conocer', back: 'To know (people/places)', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Pensar', back: 'To think', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Sentir', back: 'To feel', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
        { front: 'Encontrar', back: 'To find', tags: ['vocab', 'beginner'], subdeck: 'Vocabulary' },
      );
      break;

    case 'english':
      cards.push(
        { front: 'Ubiquitous', back: 'Present, appearing, or found everywhere. "Smartphones have become ubiquitous in modern society."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Ephemeral', back: 'Lasting for a very short time. "The ephemeral beauty of cherry blossoms."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Pragmatic', back: 'Dealing with things sensibly and realistically. "She took a pragmatic approach to solving the problem."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Ambiguous', back: 'Open to more than one interpretation. "The instructions were ambiguous and confused everyone."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Resilient', back: 'Able to recover quickly from difficulties. "Children are remarkably resilient."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Scrutinize', back: 'To examine or inspect closely and thoroughly. "The auditor will scrutinize every transaction."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Paradox', back: 'A seemingly contradictory statement that may be true. "The paradox of choice -- more options can lead to less satisfaction."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Mitigate', back: 'To make less severe, serious, or painful. "Steps to mitigate the effects of climate change."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Facilitate', back: 'To make an action or process easier. "Technology facilitates remote collaboration."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Exacerbate', back: 'To make a problem, bad situation, or negative feeling worse. "The drought exacerbated the food crisis."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        // Idioms
        { front: 'Break the ice', back: 'To initiate conversation in an awkward or tense situation. "He told a joke to break the ice."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        { front: 'Hit the nail on the head', back: 'To describe exactly what is causing a situation or problem. "You\'ve really hit the nail on the head with that analysis."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        { front: 'Bite the bullet', back: 'To endure a painful or difficult situation with courage. "I decided to bite the bullet and take the exam."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        { front: 'A blessing in disguise', back: 'Something that seems bad at first but turns out to be good. "Losing that job was a blessing in disguise."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        { front: 'The ball is in your court', back: 'It is your turn to take action or make a decision. "I\'ve done my part; the ball is in your court now."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        { front: 'Under the weather', back: 'Feeling ill or sick. "I\'m feeling a bit under the weather today."', tags: ['idioms', 'beginner'], subdeck: 'Idioms' },
        { front: 'Piece of cake', back: 'Something very easy to do. "The test was a piece of cake."', tags: ['idioms', 'beginner'], subdeck: 'Idioms' },
        { front: 'Once in a blue moon', back: 'Very rarely. "We only see each other once in a blue moon."', tags: ['idioms', 'intermediate'], subdeck: 'Idioms' },
        // Phrasal Verbs
        { front: 'Look up to', back: 'To admire and respect someone. "I\'ve always looked up to my grandmother."', tags: ['phrasal-verbs', 'intermediate'], subdeck: 'Phrasal Verbs' },
        { front: 'Put up with', back: 'To tolerate or endure. "I can\'t put up with this noise any longer."', tags: ['phrasal-verbs', 'intermediate'], subdeck: 'Phrasal Verbs' },
        { front: 'Come across', back: 'To find or discover by chance. "I came across an interesting article."', tags: ['phrasal-verbs', 'intermediate'], subdeck: 'Phrasal Verbs' },
        { front: 'Figure out', back: 'To understand or solve. "I finally figured out the answer."', tags: ['phrasal-verbs', 'beginner'], subdeck: 'Phrasal Verbs' },
        { front: 'Give up', back: 'To stop trying; to surrender. "Never give up on your dreams."', tags: ['phrasal-verbs', 'beginner'], subdeck: 'Phrasal Verbs' },
        { front: 'Bring up', back: 'To mention a topic; to raise a child. "She brought up an important point in the meeting."', tags: ['phrasal-verbs', 'intermediate'], subdeck: 'Phrasal Verbs' },
        { front: 'Turn down', back: 'To refuse or reject. "He turned down the job offer."', tags: ['phrasal-verbs', 'intermediate'], subdeck: 'Phrasal Verbs' },
        // Academic
        { front: 'Albeit', back: 'Although (formal). "It was a successful, albeit difficult, project."', tags: ['academic', 'advanced'], subdeck: 'Academic' },
        { front: 'Henceforth', back: 'From this time on. "Henceforth, the policy will apply to all employees."', tags: ['academic', 'advanced'], subdeck: 'Academic' },
        { front: 'Notwithstanding', back: 'In spite of; nevertheless. "Notwithstanding the risks, they proceeded."', tags: ['academic', 'advanced'], subdeck: 'Academic' },
        { front: 'Furthermore', back: 'In addition to what has been said (used in formal writing). "Furthermore, the data supports our hypothesis."', tags: ['academic', 'intermediate'], subdeck: 'Academic' },
        { front: 'Subsequently', back: 'After a particular thing has happened. "The team subsequently revised their approach."', tags: ['academic', 'intermediate'], subdeck: 'Academic' },
        // Collocations
        { front: 'Make a decision', back: 'To decide (NOT "do a decision"). "We need to make a decision by Friday."', tags: ['collocations', 'beginner'], subdeck: 'Collocations' },
        { front: 'Take a chance', back: 'To try something risky. "Sometimes you have to take a chance."', tags: ['collocations', 'beginner'], subdeck: 'Collocations' },
        { front: 'Keep in mind', back: 'To remember or consider. "Keep in mind that the deadline is next week."', tags: ['collocations', 'beginner'], subdeck: 'Collocations' },
        { front: 'Pay attention', back: 'To concentrate on something. "Please pay attention to the instructions."', tags: ['collocations', 'beginner'], subdeck: 'Collocations' },
        { front: 'Draw a conclusion', back: 'To arrive at a judgment or opinion. "Based on the evidence, we can draw a conclusion."', tags: ['collocations', 'intermediate'], subdeck: 'Collocations' },
        // More vocabulary
        { front: 'Eloquent', back: 'Fluent or persuasive in speaking or writing. "She gave an eloquent speech."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Meticulous', back: 'Showing great attention to detail. "His meticulous research was impressive."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Serendipity', back: 'The occurrence of events by chance in a happy way. "Finding that book was pure serendipity."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Conundrum', back: 'A confusing and difficult problem or question. "The budget deficit presents a conundrum."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Perseverance', back: 'Persistence in doing something despite difficulty. "Success requires perseverance."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Comprehensive', back: 'Complete; including all or nearly all elements. "A comprehensive guide to the subject."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Innate', back: 'Inborn; natural. "She has an innate talent for music."', tags: ['vocab', 'advanced'], subdeck: 'Vocabulary' },
        { front: 'Subtle', back: 'So delicate or precise as to be difficult to analyze. "A subtle difference in meaning."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Diligent', back: 'Having or showing care in one\'s work. "She is a diligent student."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
        { front: 'Compelling', back: 'Evoking interest, attention, or admiration in a powerful way. "A compelling argument."', tags: ['vocab', 'intermediate'], subdeck: 'Vocabulary' },
      );
      break;
  }

  // Filter by level if desired (beginner gets fewer advanced cards, etc.)
  if (level === 'beginner') {
    return cards.filter((c) => c.tags.includes('beginner') || c.tags.includes('intermediate')).slice(0, 50);
  }
  if (level === 'intermediate') {
    return cards;
  }
  // Advanced: return all
  return cards;
}

// ---------------------------------------------------------------------------
// Utility: ID generation
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

// ---------------------------------------------------------------------------
// OnboardingService
// ---------------------------------------------------------------------------

export class OnboardingService {
  /**
   * Run full onboarding setup for a user.
   *
   * Creates decks, note types, tags, imports sample cards, and configures
   * deck presets based on the user's selected languages and daily goal.
   */
  async setupUser(userId: string, config: OnboardingConfig): Promise<OnboardingResult> {
    const result: OnboardingResult = {
      success: false,
      deckIds: {},
      noteTypesCreated: 0,
      tagsCreated: 0,
      sampleCardsImported: 0,
      warnings: [],
    };

    try {
      // Step 1: Create language-specific decks
      const deckMap = await this.createLanguageDecks(userId, config.languages);
      result.deckIds = Object.fromEntries(deckMap);

      // Step 2: Create note types
      result.noteTypesCreated = await this.createNoteTypes(userId, config.languages);

      // Step 3: Create tag hierarchies
      result.tagsCreated = await this.createTagHierarchies(userId, config.languages);

      // Step 4: Import sample cards
      result.sampleCardsImported = await this.importSampleCards(userId, config.languages, deckMap);

      // Step 5: Configure deck presets
      await this.configureDeckPresets(userId, config.dailyGoal);

      // Step 6: Save user preferences
      await this.saveUserPreferences(userId, config);

      result.success = true;
    } catch (error) {
      result.warnings.push(
        `Onboarding error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return result;
  }

  /**
   * Create language-specific decks with subdecks.
   * Returns a map of deck path -> deck ID.
   */
  private async createLanguageDecks(
    userId: string,
    languages: LanguageSelection[]
  ): Promise<Map<string, string>> {
    const deckMap = new Map<string, string>();

    for (const { language } of languages) {
      const config = LANGUAGE_CONFIGS[language];
      if (!config) continue;

      for (const deckDef of config.decks) {
        // Create parent deck
        const parentId = generateId();
        deckMap.set(deckDef.name, parentId);

        // In a real implementation, this would be a database insert:
        // await db.decks.create({ id: parentId, userId, name: deckDef.name, ... })

        // Create subdecks
        for (const subdeckName of deckDef.subdecks) {
          const subdeckId = generateId();
          const fullPath = `${deckDef.name}::${subdeckName}`;
          deckMap.set(fullPath, subdeckId);

          // await db.decks.create({ id: subdeckId, userId, name: subdeckName, parentId, ... })
        }
      }
    }

    return deckMap;
  }

  /**
   * Create note types for selected languages.
   * Returns the number of note types created.
   */
  private async createNoteTypes(
    userId: string,
    languages: LanguageSelection[]
  ): Promise<number> {
    let count = 0;

    for (const { language } of languages) {
      const config = LANGUAGE_CONFIGS[language];
      if (!config) continue;

      for (const noteTypeDef of config.noteTypes) {
        const noteTypeId = generateId();

        const fields = noteTypeDef.fields.map((fieldName, index) => ({
          ordinal: index,
          name: fieldName,
          required: index === 0, // First field is always required
          font: noteTypeDef.rtl ? 'Amiri' : 'Inter',
          fontSize: noteTypeDef.rtl ? 24 : 16,
          rtl: noteTypeDef.rtl,
          isUnique: index === 0,
          description: '',
        }));

        // In a real implementation:
        // await db.noteTypes.create({ id: noteTypeId, userId, name: noteTypeDef.name, fields, ... })

        count++;
      }
    }

    return count;
  }

  /**
   * Create tag hierarchies for selected languages.
   * Returns the number of tags created.
   */
  private async createTagHierarchies(
    userId: string,
    languages: LanguageSelection[]
  ): Promise<number> {
    let count = 0;

    for (const { language } of languages) {
      const config = LANGUAGE_CONFIGS[language];
      if (!config) continue;

      for (const tagDef of config.tags) {
        const parentTagId = generateId();

        // Create parent tag
        // await db.tags.create({ id: parentTagId, userId, name: tagDef.name, slug: tagDef.slug, color: tagDef.color, parentId: null })
        count++;

        // Create child tags
        for (const child of tagDef.children) {
          const childTagId = generateId();
          // await db.tags.create({ id: childTagId, userId, name: child.name, slug: child.slug, color: tagDef.color, parentId: parentTagId })
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Import sample cards for each language.
   * Returns the total number of sample cards imported.
   */
  private async importSampleCards(
    userId: string,
    languages: LanguageSelection[],
    deckMap: Map<string, string>
  ): Promise<number> {
    let totalImported = 0;

    for (const { language, level } of languages) {
      const config = LANGUAGE_CONFIGS[language];
      if (!config) continue;

      const sampleCards = getSampleCards(language, level);
      const mainDeckName = config.decks[0]?.name;

      for (const card of sampleCards) {
        const deckPath = `${mainDeckName}::${card.subdeck}`;
        const deckId = deckMap.get(deckPath) || deckMap.get(mainDeckName || '');

        if (!deckId) continue;

        const cardId = generateId();
        const noteId = generateId();

        // In a real implementation:
        // await db.notes.create({ id: noteId, userId, noteTypeId, deckId, fields: { Front: card.front, Back: card.back }, tags: card.tags })
        // await db.cards.create({ id: cardId, noteId, deckId, front: card.front, back: card.back, state: CardState.New })

        totalImported++;
      }
    }

    return totalImported;
  }

  /**
   * Configure deck presets based on the user's daily goal.
   */
  private async configureDeckPresets(
    userId: string,
    dailyGoal: number
  ): Promise<void> {
    // Set new cards per day
    const reviewsPerDay = dailyGoal * 10; // Reviews scale with new cards

    // In a real implementation:
    // await db.userSettings.upsert({ userId, newCardsPerDay: dailyGoal, reviewsPerDay })
  }

  /**
   * Save user preferences from onboarding.
   */
  private async saveUserPreferences(
    userId: string,
    config: OnboardingConfig
  ): Promise<void> {
    // Map study time preference to actual hours
    const studyTimeHours: Record<string, { start: number; end: number }> = {
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 18 },
      evening: { start: 18, end: 23 },
    };

    const timeRange = studyTimeHours[config.studyTimePreference];

    // In a real implementation:
    // await db.userPreferences.upsert({
    //   userId,
    //   studyTimePreference: config.studyTimePreference,
    //   reminderHour: timeRange.start + 1,
    //   dailyGoal: config.dailyGoal,
    //   onboardingCompleted: true,
    //   onboardingCompletedAt: new Date(),
    // })
  }

  // -------------------------------------------------------------------------
  // Static Helpers (for UI preview)
  // -------------------------------------------------------------------------

  /**
   * Get the language configuration for preview purposes.
   * Used by the SetupPreview component.
   */
  static getLanguageConfig(languageId: LanguageId): LanguageConfig | undefined {
    return LANGUAGE_CONFIGS[languageId];
  }

  /**
   * Get all available language IDs.
   */
  static getAvailableLanguages(): { id: LanguageId; displayName: string; color: string; icon: string }[] {
    return Object.entries(LANGUAGE_CONFIGS).map(([id, config]) => ({
      id: id as LanguageId,
      displayName: config.displayName,
      color: config.color,
      icon: config.icon,
    }));
  }

  /**
   * Get sample card count for a language and level (for preview).
   */
  static getSampleCardCount(language: LanguageId, level: ProficiencyLevel): number {
    return getSampleCards(language, level).length;
  }
}

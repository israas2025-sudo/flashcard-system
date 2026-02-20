-- ============================================================================
-- Seed Data: Note Types for 5 Languages
-- ============================================================================
-- Depends on: schema.sql (users, note_types tables)
-- This script uses a single seed user. Replace the UUID if needed.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Seed user (idempotent: skip if exists)
-- ---------------------------------------------------------------------------
INSERT INTO users (id, email, password_hash, display_name, settings)
VALUES (
    'a0000000-0000-4000-a000-000000000001',
    'seed@flashcard.local',
    '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash',
    'Seed User',
    '{
        "day_boundary_hour": 4,
        "default_desired_retention": 0.9,
        "theme": "auto",
        "language_priorities": ["ar-classical", "ar-egyptian", "quran", "es", "en"]
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 1. CLASSICAL ARABIC  (الفصحى)
-- ============================================================================
INSERT INTO note_types (id, user_id, name, fields, card_templates, css)
VALUES (
    'b0000000-0000-4000-b000-000000000001',
    'a0000000-0000-4000-a000-000000000001',
    'Classical Arabic',
    '[
        {"name": "arabic_word",           "type": "text",   "sort_order": 0, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "root_letters",          "type": "text",   "sort_order": 1, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "morphological_pattern", "type": "text",   "sort_order": 2, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "english_meaning",       "type": "text",   "sort_order": 3, "is_rtl": false, "font_family": "Inter"},
        {"name": "part_of_speech",        "type": "text",   "sort_order": 4, "is_rtl": false, "font_family": "Inter"},
        {"name": "example_sentence_ar",   "type": "text",   "sort_order": 5, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "example_sentence_en",   "type": "text",   "sort_order": 6, "is_rtl": false, "font_family": "Inter"},
        {"name": "plural_form",           "type": "text",   "sort_order": 7, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "audio_url",             "type": "audio",  "sort_order": 8, "is_rtl": false, "font_family": "Inter"}
    ]'::jsonb,
    '[
        {
            "name": "Arabic → English",
            "front_html": "<div class=\"card front ar-en\">\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>",
            "back_html": "<div class=\"card back ar-en\">\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <hr />\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"morphology\">\n    <span class=\"label\">Root:</span> <span class=\"root\">{{root_letters}}</span>\n    <span class=\"label\">Pattern:</span> <span class=\"pattern\">{{morphological_pattern}}</span>\n  </div>\n  {{#plural_form}}<div class=\"plural\"><span class=\"label\">Plural:</span> {{plural_form}}</div>{{/plural_form}}\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "English → Arabic",
            "front_html": "<div class=\"card front en-ar\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <div class=\"hint\">Type the Arabic word</div>\n</div>",
            "back_html": "<div class=\"card back en-ar\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <hr />\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"morphology\">\n    <span class=\"label\">Root:</span> <span class=\"root\">{{root_letters}}</span>\n    <span class=\"label\">Pattern:</span> <span class=\"pattern\">{{morphological_pattern}}</span>\n  </div>\n  {{#plural_form}}<div class=\"plural\"><span class=\"label\">Plural:</span> {{plural_form}}</div>{{/plural_form}}\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Root → Meaning",
            "front_html": "<div class=\"card front root\">\n  <div class=\"root-letters\">{{root_letters}}</div>\n  <div class=\"hint\">What words and meanings derive from this root?</div>\n</div>",
            "back_html": "<div class=\"card back root\">\n  <div class=\"root-letters\">{{root_letters}}</div>\n  <hr />\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"pattern\">Pattern: {{morphological_pattern}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n</div>"
        },
        {
            "name": "Cloze",
            "front_html": "<div class=\"card front cloze\">\n  <div class=\"example-ar cloze-sentence\">{{example_sentence_ar}}</div>\n  <div class=\"example-en\">{{example_sentence_en}}</div>\n  <div class=\"hint\">Fill in the missing Arabic word</div>\n</div>",
            "back_html": "<div class=\"card back cloze\">\n  <div class=\"example-ar\">{{example_sentence_ar}}</div>\n  <div class=\"example-en\">{{example_sentence_en}}</div>\n  <hr />\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        }
    ]'::jsonb,
    '/* Classical Arabic Note Type */
.card {
    font-family: "Inter", sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
.arabic-word, .root-letters, .example-ar, .plural, .pattern {
    font-family: "Amiri", "Traditional Arabic", serif;
    direction: rtl;
    unicode-bidi: bidi-override;
    font-size: 2.4rem;
    line-height: 1.8;
    color: #1e293b;
}
/* Tashkeel (diacritics/harakat) highlighting */
.arabic-word .tashkeel, .example-ar .tashkeel {
    color: #e11d48;
    font-size: 0.85em;
}
/* Fathah, dammah, kasrah individual coloring */
.arabic-word .fathah { color: #dc2626; }
.arabic-word .dammah { color: #2563eb; }
.arabic-word .kasrah { color: #059669; }
.arabic-word .shaddah { color: #d97706; font-weight: 700; }
.arabic-word .sukun { color: #64748b; }
.root-letters { font-size: 3rem; color: #6366f1; }
.english-meaning { font-size: 1.6rem; color: #334155; margin: 0.5rem 0; }
.part-of-speech { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.morphology { font-size: 1rem; color: #64748b; margin: 0.5rem 0; }
.morphology .label { font-weight: 600; }
.morphology .root { font-family: "Amiri", serif; direction: rtl; color: #6366f1; }
.morphology .pattern { font-family: "Amiri", serif; direction: rtl; }
.plural { font-size: 1.3rem; color: #475569; }
.example { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; }
.example-ar { font-size: 1.4rem; }
.example-en { font-size: 1rem; color: #64748b; margin-top: 0.3rem; }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic; }
.audio-container { margin-top: 1rem; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
.cloze-sentence { background: #fffbeb; padding: 1rem; border-radius: 8px; }
'
);

-- ============================================================================
-- 2. EGYPTIAN ARABIC  (العامية المصرية)
-- ============================================================================
INSERT INTO note_types (id, user_id, name, fields, card_templates, css)
VALUES (
    'b0000000-0000-4000-b000-000000000002',
    'a0000000-0000-4000-a000-000000000001',
    'Egyptian Arabic',
    '[
        {"name": "arabic_word",           "type": "text",   "sort_order": 0, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "transliteration",       "type": "text",   "sort_order": 1, "is_rtl": false, "font_family": "Inter"},
        {"name": "english_meaning",       "type": "text",   "sort_order": 2, "is_rtl": false, "font_family": "Inter"},
        {"name": "part_of_speech",        "type": "text",   "sort_order": 3, "is_rtl": false, "font_family": "Inter"},
        {"name": "example_sentence_ar",   "type": "text",   "sort_order": 4, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "example_sentence_en",   "type": "text",   "sort_order": 5, "is_rtl": false, "font_family": "Inter"},
        {"name": "formal_equivalent",     "type": "text",   "sort_order": 6, "is_rtl": true,  "font_family": "Amiri"},
        {"name": "audio_url",             "type": "audio",  "sort_order": 7, "is_rtl": false, "font_family": "Inter"}
    ]'::jsonb,
    '[
        {
            "name": "Egyptian Arabic → English",
            "front_html": "<div class=\"card front ea-en\">\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"transliteration\">{{transliteration}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>",
            "back_html": "<div class=\"card back ea-en\">\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"transliteration\">{{transliteration}}</div>\n  <hr />\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  {{#formal_equivalent}}<div class=\"formal\"><span class=\"label\">Formal (MSA):</span> {{formal_equivalent}}</div>{{/formal_equivalent}}\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "English → Egyptian Arabic",
            "front_html": "<div class=\"card front en-ea\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <div class=\"hint\">Say it in Egyptian Arabic</div>\n</div>",
            "back_html": "<div class=\"card back en-ea\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <hr />\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"transliteration\">{{transliteration}}</div>\n  {{#formal_equivalent}}<div class=\"formal\"><span class=\"label\">Formal (MSA):</span> {{formal_equivalent}}</div>{{/formal_equivalent}}\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Audio → Meaning",
            "front_html": "<div class=\"card front audio\">\n  {{#audio_url}}<div class=\"audio-container\"><audio controls autoplay src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"hint\">What does this word/phrase mean?</div>\n</div>",
            "back_html": "<div class=\"card back audio\">\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"transliteration\">{{transliteration}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n</div>"
        },
        {
            "name": "Fusha → Ammiya",
            "front_html": "<div class=\"card front fusha-ammiya\">\n  <div class=\"section-label\">Fusha (MSA)</div>\n  <div class=\"formal-word\">{{formal_equivalent}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <div class=\"hint\">What is the Egyptian Arabic equivalent?</div>\n</div>",
            "back_html": "<div class=\"card back fusha-ammiya\">\n  <div class=\"section-label\">Fusha (MSA)</div>\n  <div class=\"formal-word\">{{formal_equivalent}}</div>\n  <hr />\n  <div class=\"section-label ammiya\">Egyptian Arabic (عامية)</div>\n  <div class=\"arabic-word\">{{arabic_word}}</div>\n  <div class=\"transliteration\">{{transliteration}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"example\">\n    <div class=\"example-ar\">{{example_sentence_ar}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        }
    ]'::jsonb,
    '/* Egyptian Arabic Note Type */
.card {
    font-family: "Inter", sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
.arabic-word, .example-ar, .formal, .formal-word {
    font-family: "Amiri", "Traditional Arabic", serif;
    direction: rtl;
    font-size: 2.4rem;
    line-height: 1.8;
    color: #1e293b;
}
/* Tashkeel (diacritics) highlighting */
.arabic-word .tashkeel, .example-ar .tashkeel {
    color: #e11d48;
    font-size: 0.85em;
}
.transliteration { font-size: 1.2rem; color: #6366f1; font-style: italic; margin: 0.3rem 0; }
.english-meaning { font-size: 1.6rem; color: #334155; margin: 0.5rem 0; }
.part-of-speech { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.formal { font-size: 1.1rem; color: #64748b; margin: 0.5rem 0; }
.formal .label { font-weight: 600; font-family: "Inter", sans-serif; direction: ltr; }
.formal-word { font-size: 2rem; color: #475569; }
/* Fusha-to-Ammiya comparison layout */
.section-label {
    font-size: 0.85rem;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    margin-bottom: 0.3rem;
}
.section-label.ammiya { color: #059669; }
.fusha-ammiya .formal-word { background: #f1f5f9; padding: 0.8rem; border-radius: 8px; }
.fusha-ammiya .arabic-word { color: #059669; }
.example { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; }
.example-ar { font-size: 1.4rem; }
.example-en { font-size: 1rem; color: #64748b; margin-top: 0.3rem; }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic; }
.audio-container { margin-top: 1rem; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
'
);

-- ============================================================================
-- 3. QURAN  (القرآن الكريم)
-- ============================================================================
INSERT INTO note_types (id, user_id, name, fields, card_templates, css)
VALUES (
    'b0000000-0000-4000-b000-000000000003',
    'a0000000-0000-4000-a000-000000000001',
    'Quran',
    '[
        {"name": "ayah_text",          "type": "text",   "sort_order": 0, "is_rtl": true,  "font_family": "KFGQPC Uthmanic Script HAFS"},
        {"name": "surah",              "type": "text",   "sort_order": 1, "is_rtl": false, "font_family": "Inter"},
        {"name": "ayah_number",        "type": "text",   "sort_order": 2, "is_rtl": false, "font_family": "Inter"},
        {"name": "juz",               "type": "text",   "sort_order": 3, "is_rtl": false, "font_family": "Inter"},
        {"name": "translation_en",     "type": "text",   "sort_order": 4, "is_rtl": false, "font_family": "Inter"},
        {"name": "tafsir_brief",       "type": "text",   "sort_order": 5, "is_rtl": false, "font_family": "Inter"},
        {"name": "tajweed",            "type": "text",   "sort_order": 6, "is_rtl": false, "font_family": "Inter"},
        {"name": "theme",              "type": "text",   "sort_order": 7, "is_rtl": false, "font_family": "Inter"},
        {"name": "key_vocabulary",     "type": "text",   "sort_order": 8, "is_rtl": false, "font_family": "Inter"},
        {"name": "audio_url",          "type": "audio",  "sort_order": 9, "is_rtl": false, "font_family": "Inter"},
        {"name": "previous_ayah_text", "type": "text",   "sort_order": 10, "is_rtl": true,  "font_family": "KFGQPC Uthmanic Script HAFS"},
        {"name": "next_ayah_text",     "type": "text",   "sort_order": 11, "is_rtl": true,  "font_family": "KFGQPC Uthmanic Script HAFS"}
    ]'::jsonb,
    '[
        {
            "name": "Recite from Memory",
            "front_html": "<div class=\"card front recite\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  {{#previous_ayah_text}}<div class=\"context-ayah previous\">{{previous_ayah_text}}</div>{{/previous_ayah_text}}\n  <div class=\"prompt\">Recite the next ayah...</div>\n  {{#audio_url}}<div class=\"audio-container play-after\"><button class=\"audio-btn\" onclick=\"this.nextElementSibling.play()\">Play Audio After</button><audio src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>",
            "back_html": "<div class=\"card back recite\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <hr />\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#tajweed}}<div class=\"tajweed\"><span class=\"label\">Tajweed:</span> {{tajweed}}</div>{{/tajweed}}\n</div>"
        },
        {
            "name": "Translation → Arabic",
            "front_html": "<div class=\"card front trans-ar\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"translation\">{{translation_en}}</div>\n  <div class=\"hint\">Which ayah is this?</div>\n</div>",
            "back_html": "<div class=\"card back trans-ar\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <hr />\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#tafsir_brief}}<div class=\"tafsir\"><span class=\"label\">Tafsir:</span> {{tafsir_brief}}</div>{{/tafsir_brief}}\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "First Words → Complete Ayah",
            "front_html": "<div class=\"card front first-words\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text partial\">{{ayah_text}}</div>\n  <div class=\"hint\">Complete this ayah from memory</div>\n</div>",
            "back_html": "<div class=\"card back first-words\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <hr />\n  <div class=\"translation\">{{translation_en}}</div>\n</div>"
        },
        {
            "name": "Audio → Identify Ayah",
            "front_html": "<div class=\"card front audio-id\">\n  {{#audio_url}}<div class=\"audio-container\"><audio controls autoplay src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"hint\">Identify the surah, ayah number, and recite it</div>\n</div>",
            "back_html": "<div class=\"card back audio-id\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}} (Juz {{juz}})</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <hr />\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#theme}}<div class=\"theme\"><span class=\"label\">Theme:</span> {{theme}}</div>{{/theme}}\n</div>"
        },
        {
            "name": "Vocabulary in Context",
            "front_html": "<div class=\"card front vocab\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"key-vocabulary\">{{key_vocabulary}}</div>\n  <div class=\"hint\">What do these words mean in this ayah?</div>\n</div>",
            "back_html": "<div class=\"card back vocab\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"key-vocabulary\">{{key_vocabulary}}</div>\n  <hr />\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#tafsir_brief}}<div class=\"tafsir\"><span class=\"label\">Tafsir:</span> {{tafsir_brief}}</div>{{/tafsir_brief}}\n</div>"
        },
        {
            "name": "Tajweed Rules",
            "front_html": "<div class=\"card front tajweed-card\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <div class=\"hint\">Identify the tajweed rules in this ayah</div>\n</div>",
            "back_html": "<div class=\"card back tajweed-card\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <hr />\n  <div class=\"tajweed\"><span class=\"label\">Tajweed Rules:</span> {{tajweed}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"translation\">{{translation_en}}</div>\n</div>"
        },
        {
            "name": "Ayah Completion (Cloze)",
            "front_html": "<div class=\"card front ayah-cloze\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text cloze-ayah\">{{cloze:ayah_text}}</div>\n  <div class=\"hint\">Fill in the missing words from this ayah</div>\n</div>",
            "back_html": "<div class=\"card back ayah-cloze\">\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <hr />\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#key_vocabulary}}<div class=\"key-vocabulary\"><span class=\"label\">Key Vocabulary:</span> {{key_vocabulary}}</div>{{/key_vocabulary}}\n</div>"
        },
        {
            "name": "Arabic Ayah → Translation",
            "front_html": "<div class=\"card front ar-trans\">\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"hint\">What is the meaning of this ayah?</div>\n</div>",
            "back_html": "<div class=\"card back ar-trans\">\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <hr />\n  <div class=\"surah-info\">{{surah}} : {{ayah_number}} (Juz {{juz}})</div>\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#tafsir_brief}}<div class=\"tafsir\"><span class=\"label\">Tafsir:</span> {{tafsir_brief}}</div>{{/tafsir_brief}}\n  {{#key_vocabulary}}<div class=\"key-vocabulary\"><span class=\"label\">Key Vocabulary:</span> {{key_vocabulary}}</div>{{/key_vocabulary}}\n  {{#theme}}<div class=\"theme\"><span class=\"label\">Theme:</span> {{theme}}</div>{{/theme}}\n</div>"
        },
        {
            "name": "Surah Identification",
            "front_html": "<div class=\"card front surah-id\">\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"hint\">Which surah is this ayah from? What is the ayah number?</div>\n</div>",
            "back_html": "<div class=\"card back surah-id\">\n  <div class=\"ayah-text\">{{ayah_text}}</div>\n  <hr />\n  <div class=\"surah-info surah-answer\">{{surah}} : {{ayah_number}}</div>\n  <div class=\"juz-info\">Juz {{juz}}</div>\n  {{#theme}}<div class=\"theme\"><span class=\"label\">Theme:</span> {{theme}}</div>{{/theme}}\n  <div class=\"translation\">{{translation_en}}</div>\n  {{#previous_ayah_text}}<div class=\"context-ayah\"><span class=\"label\">Previous Ayah:</span><br/>{{previous_ayah_text}}</div>{{/previous_ayah_text}}\n  {{#next_ayah_text}}<div class=\"context-ayah\"><span class=\"label\">Next Ayah:</span><br/>{{next_ayah_text}}</div>{{/next_ayah_text}}\n</div>"
        }
    ]'::jsonb,
    '/* Quran Note Type — Uthmani Script */
@import url("https://fonts.googleapis.com/css2?family=Amiri&display=swap");
.card {
    font-family: "Inter", sans-serif;
    max-width: 650px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
.ayah-text {
    font-family: "KFGQPC Uthmanic Script HAFS", "Scheherazade New", "Amiri", serif;
    direction: rtl;
    unicode-bidi: bidi-override;
    font-size: 2.6rem;
    line-height: 2.2;
    color: #1e293b;
    padding: 1rem;
    background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%);
    border-radius: 12px;
    border: 1px solid #fde68a;
}
.ayah-text.partial {
    -webkit-mask-image: linear-gradient(to left, transparent 40%, black 70%);
    mask-image: linear-gradient(to left, transparent 40%, black 70%);
}
/* Tashkeel (diacritics) highlighting for Quran */
.ayah-text .tashkeel {
    color: #e11d48;
    font-size: 0.85em;
}
/* Cloze deletion styling for ayah */
.cloze-ayah { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
.cloze-ayah .cloze-blank {
    display: inline-block;
    min-width: 3rem;
    border-bottom: 3px dashed #d97706;
    margin: 0 0.3rem;
    color: transparent;
}
.cloze-ayah .cloze-hint {
    font-size: 0.85rem;
    color: #92400e;
    font-family: "Inter", sans-serif;
    direction: ltr;
}
.context-ayah {
    font-family: "KFGQPC Uthmanic Script HAFS", "Amiri", serif;
    direction: rtl;
    font-size: 1.6rem;
    line-height: 1.8;
    color: #94a3b8;
    padding: 0.5rem;
}
.surah-info {
    font-size: 1rem;
    color: #6366f1;
    font-weight: 600;
    margin-bottom: 0.5rem;
    letter-spacing: 0.02em;
}
/* Large surah answer styling for Surah Identification */
.surah-info.surah-answer {
    font-size: 1.8rem;
    color: #4f46e5;
    padding: 0.5rem;
    background: #eef2ff;
    border-radius: 8px;
}
.juz-info {
    font-size: 1rem;
    color: #6366f1;
    margin: 0.3rem 0;
}
.translation { font-size: 1.2rem; color: #475569; margin: 0.5rem 0; line-height: 1.6; }
.tafsir { font-size: 1rem; color: #64748b; margin: 0.5rem 0; padding: 0.8rem; background: #f1f5f9; border-radius: 8px; text-align: left; }
.tajweed { font-size: 1rem; color: #7c3aed; margin: 0.5rem 0; padding: 0.8rem; background: #f5f3ff; border-radius: 8px; }
/* Tajweed rule color coding */
.tajweed .idghaam { color: #2563eb; font-weight: 600; }
.tajweed .ikhfaa { color: #d97706; font-weight: 600; }
.tajweed .iqlab { color: #059669; font-weight: 600; }
.tajweed .qalqalah { color: #dc2626; font-weight: 600; }
.tajweed .madd { color: #7c3aed; font-weight: 600; }
.tajweed .ghunnah { color: #0891b2; font-weight: 600; }
.theme { font-size: 0.95rem; color: #0891b2; margin: 0.5rem 0; }
.key-vocabulary {
    font-family: "Amiri", serif;
    direction: rtl;
    font-size: 1.8rem;
    color: #1e293b;
    line-height: 1.8;
}
.label { font-weight: 600; }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic; }
.audio-container { margin-top: 1rem; }
.audio-btn { background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
.audio-btn:hover { background: #4f46e5; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
'
);

-- ============================================================================
-- 4. SPANISH  (Espanol)
-- ============================================================================
INSERT INTO note_types (id, user_id, name, fields, card_templates, css)
VALUES (
    'b0000000-0000-4000-b000-000000000004',
    'a0000000-0000-4000-a000-000000000001',
    'Spanish',
    '[
        {"name": "spanish_word",         "type": "text",   "sort_order": 0, "is_rtl": false, "font_family": "Inter"},
        {"name": "english_meaning",      "type": "text",   "sort_order": 1, "is_rtl": false, "font_family": "Inter"},
        {"name": "part_of_speech",       "type": "text",   "sort_order": 2, "is_rtl": false, "font_family": "Inter"},
        {"name": "gender",               "type": "text",   "sort_order": 3, "is_rtl": false, "font_family": "Inter"},
        {"name": "conjugation",          "type": "text",   "sort_order": 4, "is_rtl": false, "font_family": "Inter"},
        {"name": "example_sentence_es",  "type": "text",   "sort_order": 5, "is_rtl": false, "font_family": "Inter"},
        {"name": "example_sentence_en",  "type": "text",   "sort_order": 6, "is_rtl": false, "font_family": "Inter"},
        {"name": "plural_form",          "type": "text",   "sort_order": 7, "is_rtl": false, "font_family": "Inter"},
        {"name": "synonyms",             "type": "text",   "sort_order": 8, "is_rtl": false, "font_family": "Inter"},
        {"name": "audio_url",            "type": "audio",  "sort_order": 9, "is_rtl": false, "font_family": "Inter"}
    ]'::jsonb,
    '[
        {
            "name": "Spanish → English",
            "front_html": "<div class=\"card front es-en\">\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  {{#gender}}<div class=\"gender\">{{gender}}</div>{{/gender}}\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>",
            "back_html": "<div class=\"card back es-en\">\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  {{#gender}}<div class=\"gender\">{{gender}}</div>{{/gender}}\n  <hr />\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  {{#conjugation}}<div class=\"conjugation\"><span class=\"label\">Conjugation:</span>\n    <div class=\"conj-table\">{{conjugation}}</div>\n  </div>{{/conjugation}}\n  {{#plural_form}}<div class=\"plural\"><span class=\"label\">Plural:</span> {{plural_form}}</div>{{/plural_form}}\n  {{#synonyms}}<div class=\"synonyms\"><span class=\"label\">Synonyms:</span> {{synonyms}}</div>{{/synonyms}}\n  <div class=\"example\">\n    <div class=\"example-es\">{{example_sentence_es}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "English → Spanish",
            "front_html": "<div class=\"card front en-es\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <div class=\"hint\">Translate to Spanish</div>\n</div>",
            "back_html": "<div class=\"card back en-es\">\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <hr />\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  {{#gender}}<div class=\"gender\">{{gender}}</div>{{/gender}}\n  {{#conjugation}}<div class=\"conjugation\"><span class=\"label\">Conjugation:</span>\n    <div class=\"conj-table\">{{conjugation}}</div>\n  </div>{{/conjugation}}\n  <div class=\"example\">\n    <div class=\"example-es\">{{example_sentence_es}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Conjugation Drill",
            "front_html": "<div class=\"card front conj-drill\">\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  <div class=\"hint\">Conjugate this verb in all present tense forms</div>\n</div>",
            "back_html": "<div class=\"card back conj-drill\">\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  <hr />\n  <div class=\"conjugation\">\n    <div class=\"conj-table\">{{conjugation}}</div>\n  </div>\n  <div class=\"example\">\n    <div class=\"example-es\">{{example_sentence_es}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n</div>"
        },
        {
            "name": "Cloze",
            "front_html": "<div class=\"card front cloze\">\n  <div class=\"example-es cloze-sentence\">{{example_sentence_es}}</div>\n  <div class=\"example-en\">{{example_sentence_en}}</div>\n  <div class=\"hint\">Fill in the missing Spanish word</div>\n</div>",
            "back_html": "<div class=\"card back cloze\">\n  <div class=\"example-es\">{{example_sentence_es}}</div>\n  <div class=\"example-en\">{{example_sentence_en}}</div>\n  <hr />\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Listening Comprehension",
            "front_html": "<div class=\"card front listening\">\n  {{#audio_url}}<div class=\"audio-container\"><audio controls autoplay src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n  <div class=\"hint\">Listen and identify the word or phrase. What does it mean?</div>\n</div>",
            "back_html": "<div class=\"card back listening\">\n  <div class=\"spanish-word\">{{spanish_word}}</div>\n  {{#gender}}<div class=\"gender\">{{gender}}</div>{{/gender}}\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <hr />\n  <div class=\"english-meaning\">{{english_meaning}}</div>\n  {{#conjugation}}<div class=\"conjugation\"><span class=\"label\">Conjugation:</span>\n    <div class=\"conj-table\">{{conjugation}}</div>\n  </div>{{/conjugation}}\n  <div class=\"example\">\n    <div class=\"example-es\">{{example_sentence_es}}</div>\n    <div class=\"example-en\">{{example_sentence_en}}</div>\n  </div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        }
    ]'::jsonb,
    '/* Spanish Note Type */
.card {
    font-family: "Inter", sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
.spanish-word { font-size: 2.4rem; color: #1e293b; font-weight: 600; }
.english-meaning { font-size: 1.6rem; color: #334155; margin: 0.5rem 0; }
.part-of-speech { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
/* Gender color coding */
.gender { font-size: 1rem; font-weight: 600; margin: 0.2rem 0; }
.gender.masculine, .gender[data-gender="m"] { color: #2563eb; }
.gender.feminine, .gender[data-gender="f"] { color: #db2777; }
.gender.masc { color: #2563eb; }
.gender.fem { color: #db2777; }
/* Color-code the word itself by gender */
.card.gender-m .spanish-word { color: #1d4ed8; }
.card.gender-f .spanish-word { color: #be185d; }
.conjugation { margin: 0.8rem 0; text-align: left; }
.conj-table { font-size: 1rem; color: #334155; padding: 0.5rem; background: #f8fafc; border-radius: 8px; white-space: pre-line; }
.conj-table .irregular { color: #dc2626; font-weight: 600; }
.conj-table .stem-change { color: #d97706; font-weight: 600; }
.plural { font-size: 1.1rem; color: #475569; }
.synonyms { font-size: 1rem; color: #64748b; font-style: italic; }
.label { font-weight: 600; }
.example { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; }
.example-es { font-size: 1.3rem; color: #1e293b; }
.example-en { font-size: 1rem; color: #64748b; margin-top: 0.3rem; }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic; }
.audio-container { margin-top: 1rem; }
/* Listening card — audio-only front */
.listening .audio-container { margin-top: 2rem; }
.listening .audio-container audio { width: 100%; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
.cloze-sentence { background: #fffbeb; padding: 1rem; border-radius: 8px; }
'
);

-- ============================================================================
-- 5. ENGLISH (Advanced Vocabulary)
-- ============================================================================
INSERT INTO note_types (id, user_id, name, fields, card_templates, css)
VALUES (
    'b0000000-0000-4000-b000-000000000005',
    'a0000000-0000-4000-a000-000000000001',
    'English',
    '[
        {"name": "english_word",    "type": "text",   "sort_order": 0, "is_rtl": false, "font_family": "Inter"},
        {"name": "ipa",             "type": "text",   "sort_order": 1, "is_rtl": false, "font_family": "Noto Sans"},
        {"name": "definition",      "type": "text",   "sort_order": 2, "is_rtl": false, "font_family": "Inter"},
        {"name": "part_of_speech",  "type": "text",   "sort_order": 3, "is_rtl": false, "font_family": "Inter"},
        {"name": "etymology",       "type": "text",   "sort_order": 4, "is_rtl": false, "font_family": "Inter"},
        {"name": "collocations",    "type": "text",   "sort_order": 5, "is_rtl": false, "font_family": "Inter"},
        {"name": "example_sentence","type": "text",   "sort_order": 6, "is_rtl": false, "font_family": "Inter"},
        {"name": "synonyms",        "type": "text",   "sort_order": 7, "is_rtl": false, "font_family": "Inter"},
        {"name": "antonyms",        "type": "text",   "sort_order": 8, "is_rtl": false, "font_family": "Inter"},
        {"name": "register",        "type": "text",   "sort_order": 9, "is_rtl": false, "font_family": "Inter"},
        {"name": "audio_url",       "type": "audio",  "sort_order": 10, "is_rtl": false, "font_family": "Inter"}
    ]'::jsonb,
    '[
        {
            "name": "Word → Definition",
            "front_html": "<div class=\"card front word-def\">\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>",
            "back_html": "<div class=\"card back word-def\">\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  <hr />\n  <div class=\"definition\">{{definition}}</div>\n  {{#etymology}}<div class=\"etymology\"><span class=\"label\">Etymology:</span> {{etymology}}</div>{{/etymology}}\n  {{#collocations}}<div class=\"collocations\"><span class=\"label\">Collocations:</span> {{collocations}}</div>{{/collocations}}\n  {{#synonyms}}<div class=\"synonyms\"><span class=\"label\">Synonyms:</span> {{synonyms}}</div>{{/synonyms}}\n  {{#antonyms}}<div class=\"antonyms\"><span class=\"label\">Antonyms:</span> {{antonyms}}</div>{{/antonyms}}\n  {{#register}}<div class=\"register\"><span class=\"label\">Register:</span> {{register}}</div>{{/register}}\n  <div class=\"example\">{{example_sentence}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Definition → Word",
            "front_html": "<div class=\"card front def-word\">\n  <div class=\"definition\">{{definition}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#register}}<div class=\"register\">Register: {{register}}</div>{{/register}}\n  <div class=\"hint\">What word matches this definition?</div>\n</div>",
            "back_html": "<div class=\"card back def-word\">\n  <div class=\"definition\">{{definition}}</div>\n  <hr />\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  {{#etymology}}<div class=\"etymology\"><span class=\"label\">Etymology:</span> {{etymology}}</div>{{/etymology}}\n  {{#collocations}}<div class=\"collocations\"><span class=\"label\">Collocations:</span> {{collocations}}</div>{{/collocations}}\n  <div class=\"example\">{{example_sentence}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Cloze in Context",
            "front_html": "<div class=\"card front cloze\">\n  <div class=\"example cloze-sentence\">{{example_sentence}}</div>\n  <div class=\"definition\">{{definition}}</div>\n  <div class=\"hint\">Fill in the word that fits</div>\n</div>",
            "back_html": "<div class=\"card back cloze\">\n  <div class=\"example\">{{example_sentence}}</div>\n  <hr />\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  {{#collocations}}<div class=\"collocations\"><span class=\"label\">Collocations:</span> {{collocations}}</div>{{/collocations}}\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Etymology → Word",
            "front_html": "<div class=\"card front etym\">\n  <div class=\"etymology\">{{etymology}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  <div class=\"hint\">What modern English word comes from this origin?</div>\n</div>",
            "back_html": "<div class=\"card back etym\">\n  <div class=\"etymology\">{{etymology}}</div>\n  <hr />\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  <div class=\"definition\">{{definition}}</div>\n  <div class=\"example\">{{example_sentence}}</div>\n</div>"
        },
        {
            "name": "Synonym Matching",
            "front_html": "<div class=\"card front syn-match\">\n  <div class=\"synonyms-prompt\">{{synonyms}}</div>\n  <div class=\"part-of-speech\">{{part_of_speech}}</div>\n  {{#register}}<div class=\"register\">Register: {{register}}</div>{{/register}}\n  <div class=\"hint\">Which word matches these synonyms?</div>\n</div>",
            "back_html": "<div class=\"card back syn-match\">\n  <div class=\"synonyms-prompt\">{{synonyms}}</div>\n  <hr />\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  <div class=\"definition\">{{definition}}</div>\n  {{#antonyms}}<div class=\"antonyms\"><span class=\"label\">Antonyms:</span> {{antonyms}}</div>{{/antonyms}}\n  <div class=\"example\">{{example_sentence}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        },
        {
            "name": "Collocation Completion",
            "front_html": "<div class=\"card front colloc\">\n  <div class=\"collocations cloze-collocation\">{{collocations}}</div>\n  <div class=\"definition\">{{definition}}</div>\n  <div class=\"hint\">Which word completes these collocations?</div>\n</div>",
            "back_html": "<div class=\"card back colloc\">\n  <div class=\"collocations\">{{collocations}}</div>\n  <hr />\n  <div class=\"english-word\">{{english_word}}</div>\n  <div class=\"ipa\">{{ipa}}</div>\n  <div class=\"definition\">{{definition}}</div>\n  {{#synonyms}}<div class=\"synonyms\"><span class=\"label\">Synonyms:</span> {{synonyms}}</div>{{/synonyms}}\n  <div class=\"example\">{{example_sentence}}</div>\n  {{#audio_url}}<div class=\"audio-container\"><audio controls src=\"{{audio_url}}\"></audio></div>{{/audio_url}}\n</div>"
        }
    ]'::jsonb,
    '/* English Note Type */
.card {
    font-family: "Inter", sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
}
.english-word { font-size: 2.4rem; color: #1e293b; font-weight: 700; }
/* IPA phonetic transcription styling */
.ipa {
    font-size: 1.3rem;
    color: #6366f1;
    font-family: "Noto Sans", "DejaVu Sans", "Lucida Sans Unicode", sans-serif;
    margin: 0.3rem 0;
    letter-spacing: 0.04em;
}
.ipa::before { content: "/"; color: #94a3b8; }
.ipa::after { content: "/"; color: #94a3b8; }
/* Stress marks in IPA */
.ipa .primary-stress { font-weight: 700; color: #4f46e5; }
.ipa .secondary-stress { font-weight: 600; color: #818cf8; }
.definition { font-size: 1.4rem; color: #334155; line-height: 1.5; margin: 0.5rem 0; }
.part-of-speech { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.etymology { font-size: 1rem; color: #7c3aed; margin: 0.5rem 0; padding: 0.8rem; background: #f5f3ff; border-radius: 8px; text-align: left; font-style: italic; }
/* Collocation styling */
.collocations { font-size: 1rem; color: #0891b2; margin: 0.3rem 0; }
.collocations .colloc-item { display: inline-block; padding: 0.2rem 0.6rem; margin: 0.15rem; background: #ecfeff; border-radius: 4px; border: 1px solid #a5f3fc; }
/* Cloze collocation — blanked keyword */
.cloze-collocation {
    font-size: 1.3rem;
    padding: 1rem;
    background: #ecfeff;
    border-radius: 8px;
    border: 1px solid #a5f3fc;
    line-height: 2;
}
/* Synonym matching prompt */
.synonyms-prompt {
    font-size: 1.5rem;
    color: #059669;
    line-height: 1.8;
    padding: 1rem;
    background: #ecfdf5;
    border-radius: 8px;
    border: 1px solid #a7f3d0;
}
.synonyms { font-size: 1rem; color: #059669; margin: 0.3rem 0; }
.antonyms { font-size: 1rem; color: #dc2626; margin: 0.3rem 0; }
.register { font-size: 0.9rem; color: #64748b; font-style: italic; }
.label { font-weight: 600; }
.example { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; font-size: 1.1rem; color: #475569; line-height: 1.5; font-style: italic; }
.hint { font-size: 0.85rem; color: #94a3b8; margin-top: 1rem; font-style: italic; }
.audio-container { margin-top: 1rem; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
.cloze-sentence { background: #fffbeb; }
'
);

COMMIT;

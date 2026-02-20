/**
 * insight-cards.ts -- Psychology Insight Cards for Study Sessions.
 *
 * During study sessions, users are periodically shown short, science-backed
 * "insight cards" -- bite-sized facts about memory, learning, and spaced
 * repetition. These serve multiple psychological functions:
 *
 *   1. Metacognitive awareness: Understanding *why* spaced repetition works
 *      increases user buy-in and reduces dropout.
 *   2. Session pacing: A brief pause between cards gives the brain a micro-rest,
 *      which paradoxically improves sustained attention.
 *   3. Motivation: Learning that "forgetting is part of the process" reframes
 *      struggle as progress rather than failure.
 *
 * Research Reference:
 *   Bjork & Bjork (2011) - "Making Things Hard on Yourself, But in a Good Way:
 *   Creating Desirable Difficulties to Enhance Learning"
 *
 * Implementation:
 *   - 120+ curated facts across 5 categories.
 *   - Facts are selected contextually: a user who just scored poorly gets a
 *     "desirable difficulty" insight; a user on a streak gets a motivation boost.
 *   - Each fact includes a citation so curious users can explore further.
 */

import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InsightCategory =
  | 'memory-science'
  | 'study-tips'
  | 'motivation'
  | 'language-learning'
  | 'brain-health';

export interface InsightFact {
  /** Unique identifier for this insight. */
  id: string;

  /** Category grouping for contextual selection. */
  category: InsightCategory;

  /** Short headline (shown as card title). */
  title: string;

  /** The insight body text (1-3 sentences). */
  body: string;

  /** Academic or popular-science source citation. */
  source: string;
}

export interface SessionInsightContext {
  /** The insight fact selected for this context. */
  insight: InsightFact;

  /** Why this insight was selected (for logging/debugging). */
  reason: string;
}

// ---------------------------------------------------------------------------
// Insight Facts Database (120+ entries)
// ---------------------------------------------------------------------------

const INSIGHT_FACTS: InsightFact[] = [
  // =========================================================================
  // MEMORY SCIENCE (25 facts)
  // =========================================================================
  {
    id: 'ms-001',
    category: 'memory-science',
    title: 'The Forgetting Curve',
    body: 'Hermann Ebbinghaus discovered in 1885 that we forget approximately 70% of new information within 24 hours without review. Spaced repetition directly combats this curve by timing reviews at the optimal moment before forgetting occurs.',
    source: 'Ebbinghaus, H. (1885). Memory: A Contribution to Experimental Psychology.',
  },
  {
    id: 'ms-002',
    category: 'memory-science',
    title: 'Spacing Effect',
    body: 'Distributing practice over time produces significantly better long-term retention than massing practice into a single session. This "spacing effect" is one of the most robust findings in all of cognitive psychology.',
    source: 'Cepeda et al. (2006). Distributed practice in verbal recall tasks. Review of Educational Psychology.',
  },
  {
    id: 'ms-003',
    category: 'memory-science',
    title: 'Testing Effect',
    body: 'Actively retrieving information from memory strengthens the memory trace far more than simply re-reading the material. Every time you answer a flashcard, you are strengthening the neural pathway to that knowledge.',
    source: 'Roediger & Karpicke (2006). Test-enhanced learning. Psychological Science.',
  },
  {
    id: 'ms-004',
    category: 'memory-science',
    title: 'Desirable Difficulties',
    body: 'Conditions that make learning feel harder in the moment -- like spacing, interleaving, and retrieval practice -- actually produce stronger, more durable memories. Struggle is a signal of learning, not failure.',
    source: 'Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings.',
  },
  {
    id: 'ms-005',
    category: 'memory-science',
    title: 'Sleep and Memory Consolidation',
    body: 'During sleep, your brain replays and strengthens memories from the day. Studies show that sleeping after learning improves retention by 20-40% compared to staying awake for the same period.',
    source: 'Walker, M. P. & Stickgold, R. (2006). Sleep, memory, and plasticity. Annual Review of Psychology.',
  },
  {
    id: 'ms-006',
    category: 'memory-science',
    title: 'Encoding Specificity',
    body: 'Memory retrieval is easier when the context at retrieval matches the context at encoding. Studying vocabulary in multiple contexts (different rooms, times of day) creates more retrieval pathways.',
    source: 'Tulving, E. & Thomson, D. M. (1973). Encoding specificity and retrieval processes.',
  },
  {
    id: 'ms-007',
    category: 'memory-science',
    title: 'Interleaving Advantage',
    body: 'Mixing different types of problems or topics during study (interleaving) produces better learning than practicing one type at a time (blocking), even though blocking feels easier in the moment.',
    source: 'Rohrer, D. & Taylor, K. (2007). The shuffling of mathematics problems improves learning.',
  },
  {
    id: 'ms-008',
    category: 'memory-science',
    title: 'Generation Effect',
    body: 'Information you generate yourself is remembered better than information you simply read. When you struggle to recall a flashcard answer before flipping it, you are leveraging the generation effect.',
    source: 'Slamecka, N. J. & Graf, P. (1978). The generation effect. Journal of Experimental Psychology.',
  },
  {
    id: 'ms-009',
    category: 'memory-science',
    title: 'Levels of Processing',
    body: 'Deeper processing of information leads to stronger memories. Thinking about what a word means (semantic processing) creates a more durable memory than thinking about how it looks or sounds.',
    source: 'Craik, F. & Lockhart, R. (1972). Levels of processing: A framework for memory research.',
  },
  {
    id: 'ms-010',
    category: 'memory-science',
    title: 'Memory Reconsolidation',
    body: 'Each time you recall a memory, it enters a labile state and must be "reconsolidated." This means every review is an opportunity to strengthen and even update the memory -- retrieval literally rebuilds memories.',
    source: 'Nader, K. et al. (2000). Fear memories require protein synthesis for reconsolidation.',
  },
  {
    id: 'ms-011',
    category: 'memory-science',
    title: 'Working Memory Limits',
    body: 'Working memory can hold roughly 4 chunks of information at once (not the commonly cited 7). Flashcards work well because they break complex knowledge into individual, manageable chunks.',
    source: 'Cowan, N. (2001). The magical number 4 in short-term memory. Behavioral and Brain Sciences.',
  },
  {
    id: 'ms-012',
    category: 'memory-science',
    title: 'Dual Coding Theory',
    body: 'Combining verbal information with visual imagery creates two independent memory codes, roughly doubling the chances of successful recall. Adding images to flashcards leverages this principle.',
    source: 'Paivio, A. (1986). Mental representations: A dual coding approach.',
  },
  {
    id: 'ms-013',
    category: 'memory-science',
    title: 'Retrieval-Induced Forgetting',
    body: 'Practicing retrieval of some items from a category can temporarily suppress related but unpracticed items. This is why interleaving different topics during study sessions is important.',
    source: 'Anderson, M. C. et al. (1994). Retrieval-induced forgetting. Journal of Experimental Psychology.',
  },
  {
    id: 'ms-014',
    category: 'memory-science',
    title: 'The Zeigarnik Effect',
    body: 'Incomplete tasks create a state of mental tension that keeps them active in memory. When you end a study session mid-deck, your brain continues processing those cards subconsciously.',
    source: 'Zeigarnik, B. (1927). On the retention of completed and uncompleted activities.',
  },
  {
    id: 'ms-015',
    category: 'memory-science',
    title: 'Elaborative Rehearsal',
    body: 'Simply repeating information (maintenance rehearsal) is a weak learning strategy. Connecting new information to existing knowledge (elaborative rehearsal) creates rich, retrievable memory networks.',
    source: 'Craik, F. & Watkins, M. (1973). The role of rehearsal in short-term memory.',
  },
  {
    id: 'ms-016',
    category: 'memory-science',
    title: 'Memory Palace Technique',
    body: 'The method of loci -- placing items to remember in familiar locations -- has been used since ancient Greece. Memory champions use this technique to memorize thousands of items, leveraging spatial memory.',
    source: 'Maguire, E. A. et al. (2003). Routes to remembering. Nature Neuroscience.',
  },
  {
    id: 'ms-017',
    category: 'memory-science',
    title: 'Contextual Interference',
    body: 'Varying practice conditions (different card orderings, different environments) creates "contextual interference" that slows initial learning but dramatically improves long-term transfer and retention.',
    source: 'Shea, J. B. & Morgan, R. L. (1979). Contextual interference effects on acquisition and transfer.',
  },
  {
    id: 'ms-018',
    category: 'memory-science',
    title: 'Synaptic Consolidation',
    body: 'New memories are initially stored via rapid synaptic changes in the hippocampus, then gradually transferred to the cortex over days and weeks. This is why spaced review over weeks outperforms cramming.',
    source: 'Frankland, P. W. & Bontempi, B. (2005). The organization of recent and remote memories.',
  },
  {
    id: 'ms-019',
    category: 'memory-science',
    title: 'Emotional Enhancement of Memory',
    body: 'Emotionally arousing experiences are remembered better than neutral ones because the amygdala enhances hippocampal memory encoding. Creating personal connections to vocabulary can leverage this effect.',
    source: 'McGaugh, J. L. (2004). The amygdala modulates the consolidation of memories.',
  },
  {
    id: 'ms-020',
    category: 'memory-science',
    title: 'Metacognitive Illusions',
    body: 'Familiarity with material often creates an "illusion of knowing" -- you feel you know something because it looks familiar, but you cannot actually retrieve it. Active recall tests cut through this illusion.',
    source: 'Koriat, A. & Bjork, R. A. (2005). Illusions of competence in monitoring one\'s knowledge.',
  },
  {
    id: 'ms-021',
    category: 'memory-science',
    title: 'Primacy and Recency Effects',
    body: 'Items at the beginning and end of a study session are remembered best. Spaced repetition neutralizes this serial position effect by ensuring every card gets reviewed at its optimal time, regardless of position.',
    source: 'Murdock, B. B. (1962). The serial position effect of free recall. Journal of Experimental Psychology.',
  },
  {
    id: 'ms-022',
    category: 'memory-science',
    title: 'Long-Term Potentiation',
    body: 'Repeated stimulation of neural pathways strengthens synaptic connections -- a process called long-term potentiation (LTP). Each flashcard review literally strengthens the physical connections between neurons.',
    source: 'Bliss, T. V. & Collingridge, G. L. (1993). A synaptic model of memory: LTP in the hippocampus.',
  },
  {
    id: 'ms-023',
    category: 'memory-science',
    title: 'Transfer-Appropriate Processing',
    body: 'Memory performance is best when the type of processing during study matches the type required at test. Flashcard-style retrieval practice is ideal because it mimics real-world recall demands.',
    source: 'Morris, C. D. et al. (1977). Levels of processing versus transfer-appropriate processing.',
  },
  {
    id: 'ms-024',
    category: 'memory-science',
    title: 'Distributed Practice in Motor Skills',
    body: 'The spacing effect is not limited to verbal memory. Musicians, athletes, and surgeons all benefit from distributed practice. The same principle that helps you learn vocabulary also helps develop any skill.',
    source: 'Shea, C. H. et al. (2000). Spacing practice sessions across days benefits motor learning.',
  },
  {
    id: 'ms-025',
    category: 'memory-science',
    title: 'Memory Schemas',
    body: 'New information that fits into existing knowledge structures (schemas) is learned faster. As your vocabulary grows, new words become easier to learn because you have more connections to attach them to.',
    source: 'Bartlett, F. C. (1932). Remembering: A Study in Experimental and Social Psychology.',
  },

  // =========================================================================
  // STUDY TIPS (25 facts)
  // =========================================================================
  {
    id: 'st-001',
    category: 'study-tips',
    title: 'Keep Sessions Short',
    body: 'Research shows that 15-25 minute study sessions are more effective than marathon sessions. Attention and encoding quality decline sharply after 30 minutes. Multiple short sessions beat one long session.',
    source: 'Dempster, F. N. (1988). The spacing effect: A case study in the failure to apply research.',
  },
  {
    id: 'st-002',
    category: 'study-tips',
    title: 'Review Before Bed',
    body: 'Studying right before sleep is one of the most effective timing strategies. Sleep-dependent memory consolidation is strongest for information encoded close to sleep onset.',
    source: 'Gais, S. et al. (2006). Sleep after learning aids memory recall. Learning & Memory.',
  },
  {
    id: 'st-003',
    category: 'study-tips',
    title: 'The 20-Card Rule',
    body: 'When learning new material, limit yourself to about 20 new cards per day. More than that overwhelms working memory and leads to shallow encoding. Quality of processing matters more than quantity.',
    source: 'Wozniak, P. (2020). Effective learning: Twenty rules of formulating knowledge.',
  },
  {
    id: 'st-004',
    category: 'study-tips',
    title: 'Use Mnemonics',
    body: 'Creating vivid, unusual, or humorous associations between new words and familiar concepts dramatically improves retention. The more bizarre the mnemonic, the more memorable it tends to be.',
    source: 'Worthen, J. B. & Hunt, R. R. (2011). Mnemonology: Mnemonics for the 21st century.',
  },
  {
    id: 'st-005',
    category: 'study-tips',
    title: 'Say It Aloud',
    body: 'The "production effect" shows that words read aloud are remembered about 10% better than words read silently. The act of speaking engages motor and auditory processing, creating additional memory traces.',
    source: 'MacLeod, C. M. et al. (2010). The production effect: Delineation of a phenomenon.',
  },
  {
    id: 'st-006',
    category: 'study-tips',
    title: 'Embrace "Good" Errors',
    body: 'Making errors during retrieval practice actually enhances learning, as long as you receive correct feedback afterward. Wrong answers activate deeper processing when corrected.',
    source: 'Kornell, N. et al. (2009). Unsuccessful retrieval attempts enhance subsequent learning.',
  },
  {
    id: 'st-007',
    category: 'study-tips',
    title: 'Minimize Interference',
    body: 'Studying similar material back-to-back (e.g., Spanish after Italian) can cause interference. If possible, space out similar subjects or interleave them with unrelated activities.',
    source: 'Underwood, B. J. (1957). Interference and forgetting. Psychological Review.',
  },
  {
    id: 'st-008',
    category: 'study-tips',
    title: 'Self-Explanation',
    body: 'Pausing to explain to yourself why an answer is correct (or incorrect) deepens understanding and improves transfer. Ask "why does this make sense?" after each card.',
    source: 'Chi, M. T. H. et al. (1989). Self-explanations: How students study and use examples.',
  },
  {
    id: 'st-009',
    category: 'study-tips',
    title: 'Concrete Examples',
    body: 'Abstract concepts become memorable when anchored to concrete examples. For vocabulary, imagining a specific scene where you would use the word creates a richer, more retrievable memory.',
    source: 'Sadoski, M. (2005). A dual coding view of vocabulary learning. Reading & Writing Quarterly.',
  },
  {
    id: 'st-010',
    category: 'study-tips',
    title: 'Pretesting Boosts Learning',
    body: 'Attempting to answer questions BEFORE studying the material (even when you get them wrong) improves subsequent learning. Your brain becomes primed to encode the correct answer more deeply.',
    source: 'Richland, L. E. et al. (2009). The pretesting effect. Journal of Experimental Psychology.',
  },
  {
    id: 'st-011',
    category: 'study-tips',
    title: 'Overlearning Diminishing Returns',
    body: 'Once you can recall something perfectly, additional repetitions in the same session have diminishing returns. It is far better to move on and review again tomorrow than to over-drill today.',
    source: 'Rohrer, D. & Taylor, K. (2006). The effects of overlearning and distributed practice.',
  },
  {
    id: 'st-012',
    category: 'study-tips',
    title: 'Active Over Passive',
    body: 'Highlighting, re-reading, and copying notes are among the least effective study strategies. Active retrieval (testing yourself) and spaced practice are the most effective, according to meta-analyses.',
    source: 'Dunlosky, J. et al. (2013). Improving students\' learning with effective learning techniques.',
  },
  {
    id: 'st-013',
    category: 'study-tips',
    title: 'The Pomodoro Synergy',
    body: 'Combining Pomodoro-style timed sessions with flashcard review creates natural stopping points. A 25-minute Pomodoro is an ideal flashcard session length -- long enough to be productive, short enough to maintain focus.',
    source: 'Cirillo, F. (2006). The Pomodoro Technique.',
  },
  {
    id: 'st-014',
    category: 'study-tips',
    title: 'Vary Your Study Location',
    body: 'Studying the same material in different locations can improve recall by up to 40%. Different environments create multiple contextual cues that serve as retrieval aids during real-world use.',
    source: 'Smith, S. M. et al. (1978). Environmental context and human memory. Memory & Cognition.',
  },
  {
    id: 'st-015',
    category: 'study-tips',
    title: 'Honest Self-Rating',
    body: 'When rating your recall difficulty, be honest. Overrating your performance leads to longer intervals and more forgetting. Underrating leads to excessive review. Accurate self-assessment drives optimal scheduling.',
    source: 'Koriat, A. (1997). Monitoring one\'s own knowledge during study. Journal of Experimental Psychology.',
  },
  {
    id: 'st-016',
    category: 'study-tips',
    title: 'Keyword Method for Vocabulary',
    body: 'The keyword method involves finding a word in your native language that sounds like the foreign word, then forming a vivid mental image linking them. This technique can double vocabulary retention rates.',
    source: 'Atkinson, R. C. & Raugh, M. R. (1975). An application of the mnemonic keyword method.',
  },
  {
    id: 'st-017',
    category: 'study-tips',
    title: 'Chunk Complex Information',
    body: 'Break complex grammar rules or long phrases into smaller flashcard "chunks." Each chunk should contain exactly one idea. Multiple simple cards beat one complex card for long-term retention.',
    source: 'Miller, G. A. (1956). The magical number seven, plus or minus two.',
  },
  {
    id: 'st-018',
    category: 'study-tips',
    title: 'Use Both Directions',
    body: 'Studying translations in both directions (L1 to L2 AND L2 to L1) creates separate but complementary memory pathways. Recognition and production are different skills that require different practice.',
    source: 'Schneider, V. I. et al. (2002). The effects of paired-associate direction on L2 vocabulary.',
  },
  {
    id: 'st-019',
    category: 'study-tips',
    title: 'Morning Advantage for New Material',
    body: 'Research suggests that learning new information is most effective in the morning when cortisol levels support memory encoding. Save review of familiar material for afternoon or evening sessions.',
    source: 'Hasher, L. et al. (2002). Circadian rhythms and memory in aged humans.',
  },
  {
    id: 'st-020',
    category: 'study-tips',
    title: 'Teach What You Learn',
    body: 'The "protege effect" shows that preparing to teach material to someone else improves your own understanding and retention. Even imagining that you need to teach the material improves encoding.',
    source: 'Nestojko, J. F. et al. (2014). Expecting to teach enhances learning and recall.',
  },
  {
    id: 'st-021',
    category: 'study-tips',
    title: 'Hand-Write Difficult Cards',
    body: 'For especially difficult items, writing them out by hand activates motor memory pathways that typing does not. The slower, more effortful process also promotes deeper encoding.',
    source: 'Mueller, P. A. & Oppenheimer, D. M. (2014). The pen is mightier than the keyboard.',
  },
  {
    id: 'st-022',
    category: 'study-tips',
    title: 'Use Sentence Context',
    body: 'Learning vocabulary in complete sentences rather than isolated word pairs improves both retention and the ability to use words naturally. Example sentences provide grammatical and semantic context.',
    source: 'Prince, P. (1996). Second language vocabulary learning: The role of context versus translations.',
  },
  {
    id: 'st-023',
    category: 'study-tips',
    title: 'Wait Before Checking',
    body: 'When you cannot recall an answer, resist the urge to flip immediately. Spending 10-15 seconds genuinely trying to retrieve the answer, even unsuccessfully, strengthens the memory trace more than instant reveals.',
    source: 'Kornell, N. & Bjork, R. A. (2008). Optimizing self-regulated study: Benefits of unsuccessful retrieval.',
  },
  {
    id: 'st-024',
    category: 'study-tips',
    title: 'Review Your "Leeches"',
    body: 'Cards you consistently fail (called "leeches") may need reformulation rather than more repetition. Try adding a mnemonic, simplifying the card, or breaking it into multiple simpler cards.',
    source: 'Wozniak, P. (1998). Repetition spacing algorithm used in SuperMemo.',
  },
  {
    id: 'st-025',
    category: 'study-tips',
    title: 'Spaced Repetition Compounds',
    body: 'A card reviewed 7 times over 60 days produces better retention than a card reviewed 7 times in one day. The same total effort, distributed over time, yields dramatically better results.',
    source: 'Cepeda, N. J. et al. (2008). Spacing effects in learning. Psychological Science.',
  },

  // =========================================================================
  // MOTIVATION (25 facts)
  // =========================================================================
  {
    id: 'mo-001',
    category: 'motivation',
    title: 'Consistency Beats Intensity',
    body: 'Five minutes of daily review is worth more than a 2-hour weekend cram session. Consistency keeps memories alive on the forgetting curve, while intensity just creates temporary familiarity.',
    source: 'Bahrick, H. P. et al. (1993). Maintenance of foreign language vocabulary. Psychological Science.',
  },
  {
    id: 'mo-002',
    category: 'motivation',
    title: 'The Compound Effect',
    body: 'Language learning compounds like interest in a savings account. Each word you learn makes the next word easier because you have more context and connections. Early effort pays exponential dividends.',
    source: 'Nation, I. S. P. (2001). Learning Vocabulary in Another Language. Cambridge University Press.',
  },
  {
    id: 'mo-003',
    category: 'motivation',
    title: 'Struggle Means Growth',
    body: 'If every card feels easy, you are not learning efficiently. That feeling of difficulty when retrieving a word is your brain building stronger connections. Embrace the struggle -- it is the feeling of learning.',
    source: 'Bjork, E. L. & Bjork, R. A. (2011). Making things hard on yourself, but in a good way.',
  },
  {
    id: 'mo-004',
    category: 'motivation',
    title: 'Your Future Self Will Thank You',
    body: 'Research shows that just 15 minutes of daily spaced repetition practice can result in learning over 3,500 vocabulary items per year. That is enough for conversational fluency in most languages.',
    source: 'Nakata, T. (2015). Effects of feedback timing on second language vocabulary learning.',
  },
  {
    id: 'mo-005',
    category: 'motivation',
    title: 'Progress is Not Linear',
    body: 'Language learning typically follows an S-curve: slow at first, then rapid progress, then a plateau before the next breakthrough. If you feel stuck, you are likely about to make a leap.',
    source: 'Lightbown, P. M. & Spada, N. (2013). How Languages Are Learned. Oxford University Press.',
  },
  {
    id: 'mo-006',
    category: 'motivation',
    title: 'You Remember More Than You Think',
    body: 'Studies show that people consistently underestimate how much they have learned from spaced repetition. Even items that feel "forgotten" often show savings -- they are relearned faster than truly new items.',
    source: 'Nelson, T. O. (1985). Ebbinghaus\'s contribution to the measurement of retention: Savings.',
  },
  {
    id: 'mo-007',
    category: 'motivation',
    title: 'Small Wins Matter',
    body: 'The "progress principle" shows that making progress -- even small progress -- on meaningful work is the single most powerful motivator. Every card you review is measurable progress toward fluency.',
    source: 'Amabile, T. M. & Kramer, S. J. (2011). The Progress Principle. Harvard Business Review Press.',
  },
  {
    id: 'mo-008',
    category: 'motivation',
    title: 'Streaks Build Habits',
    body: 'Maintaining a daily review streak leverages the "don\'t break the chain" effect. After about 66 days, research shows that the behavior becomes automatic -- studying becomes as natural as brushing your teeth.',
    source: 'Lally, P. et al. (2010). How are habits formed: Modelling habit formation. European Journal of Social Psychology.',
  },
  {
    id: 'mo-009',
    category: 'motivation',
    title: 'Multilingual Brain Benefits',
    body: 'Learning a new language physically changes your brain structure, increasing gray matter density and strengthening neural connections. These benefits persist even if you never achieve native fluency.',
    source: 'Maguire, E. A. et al. (2000). Navigation-related structural change in the hippocampi of taxi drivers.',
  },
  {
    id: 'mo-010',
    category: 'motivation',
    title: 'Every Polyglot Started With Zero',
    body: 'People who speak 5+ languages did not have special talent -- they had consistent practice habits. Research on expert performance consistently shows that deliberate practice, not innate ability, drives skill.',
    source: 'Ericsson, K. A. et al. (1993). The role of deliberate practice in acquisition of expert performance.',
  },
  {
    id: 'mo-011',
    category: 'motivation',
    title: 'Forgetting is Functional',
    body: 'Forgetting is not a failure of your brain -- it is a feature. Your brain strategically forgets unimportant information to make room for what matters. Spaced repetition signals to your brain: "This matters. Keep it."',
    source: 'Anderson, M. C. & Hulbert, J. C. (2021). Active forgetting: Adaptation of memory by prefrontal control.',
  },
  {
    id: 'mo-012',
    category: 'motivation',
    title: 'The 1,000-Word Milestone',
    body: 'The most common 1,000 words in any language cover roughly 80-85% of everyday conversation. You are closer to functional communication than you think. Every word you add increases your coverage meaningfully.',
    source: 'Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening?',
  },
  {
    id: 'mo-013',
    category: 'motivation',
    title: 'Growth Mindset and Language',
    body: 'Believing that language ability can be developed (growth mindset) predicts greater persistence and achievement than believing it is fixed. You are building your ability with each review session.',
    source: 'Dweck, C. S. (2006). Mindset: The New Psychology of Success. Random House.',
  },
  {
    id: 'mo-014',
    category: 'motivation',
    title: 'Dopamine and Learning',
    body: 'Successfully recalling a difficult card triggers dopamine release, the same reward neurotransmitter involved in all forms of motivation. Your brain literally rewards you for remembering.',
    source: 'Shohamy, D. & Adcock, R. A. (2010). Dopamine and adaptive memory. Trends in Cognitive Sciences.',
  },
  {
    id: 'mo-015',
    category: 'motivation',
    title: 'You Are Already Bilingual Material',
    body: 'Over half the world\'s population speaks two or more languages. Monolingualism is the historical exception, not the norm. Your brain is designed for multilingualism -- you are fulfilling its natural potential.',
    source: 'Grosjean, F. (2010). Bilingual: Life and Reality. Harvard University Press.',
  },
  {
    id: 'mo-016',
    category: 'motivation',
    title: 'Micro-Habits Win Long-Term',
    body: 'Starting with just 5 cards per day is a valid and effective strategy. BJ Fogg\'s research shows that tiny habits, consistently performed, naturally expand over time as motivation builds.',
    source: 'Fogg, B. J. (2020). Tiny Habits: The Small Changes That Change Everything. Houghton Mifflin.',
  },
  {
    id: 'mo-017',
    category: 'motivation',
    title: 'Your Brain Creates New Neurons',
    body: 'Contrary to old beliefs, the adult brain generates new neurons (neurogenesis), especially in the hippocampus -- the brain region critical for learning and memory. Exercise and learning both stimulate this process.',
    source: 'Eriksson, P. S. et al. (1998). Neurogenesis in the adult human hippocampus. Nature Medicine.',
  },
  {
    id: 'mo-018',
    category: 'motivation',
    title: 'The Power of Identity',
    body: 'Framing yourself as "a person who studies daily" rather than "a person trying to learn a language" shifts your behavior from willpower-dependent to identity-consistent. Identity drives habits.',
    source: 'Clear, J. (2018). Atomic Habits. Penguin Random House.',
  },
  {
    id: 'mo-019',
    category: 'motivation',
    title: 'Delayed Gratification Payoff',
    body: 'The effort you invest in flashcards today feels abstract, but research shows spaced repetition users retain 90%+ of material even after months without review. You are building permanent knowledge.',
    source: 'Bahrick, H. P. (1984). Semantic memory content in permastore: Fifty years of memory for Spanish.',
  },
  {
    id: 'mo-020',
    category: 'motivation',
    title: 'Perfect is the Enemy of Progress',
    body: 'Aiming for 100% accuracy on every review session is counterproductive. An 80-90% accuracy rate actually indicates optimal difficulty -- you are being challenged at the edge of your ability.',
    source: 'Wilson, R. C. et al. (2019). The 85% rule for optimal learning. Nature Communications.',
  },
  {
    id: 'mo-021',
    category: 'motivation',
    title: 'Community Amplifies Motivation',
    body: 'Learning alongside others, even asynchronously, increases persistence. Knowing that other learners share your struggle creates a sense of belonging that sustains motivation through difficult periods.',
    source: 'Walton, G. M. et al. (2012). Mere belonging: The power of social connections.',
  },
  {
    id: 'mo-022',
    category: 'motivation',
    title: 'Plateaus Are Processing Time',
    body: 'When progress seems to stall, your brain is reorganizing and integrating knowledge. This "plateau" phase is where deep understanding develops. Continued practice during plateaus is what separates persistence from quitting.',
    source: 'VanPatten, B. & Williams, J. (2015). Theories in Second Language Acquisition.',
  },
  {
    id: 'mo-023',
    category: 'motivation',
    title: 'Showing Up Is 80%',
    body: 'On days when motivation is low, even reviewing 5 cards maintains your streak, your habit, and your neural pathways. A tiny session on a bad day is infinitely better than a skipped day.',
    source: 'Duckworth, A. (2016). Grit: The Power of Passion and Perseverance. Scribner.',
  },
  {
    id: 'mo-024',
    category: 'motivation',
    title: 'Neuroplasticity is Lifelong',
    body: 'Your brain remains plastic throughout life. Adults can and do learn new languages at any age. While children may have advantages in accent acquisition, adults often learn grammar and vocabulary more efficiently.',
    source: 'Hartshorne, J. K. et al. (2018). A critical period for second language acquisition. Cognition.',
  },
  {
    id: 'mo-025',
    category: 'motivation',
    title: 'You Chose This',
    body: 'Self-determined motivation (learning because you want to) is the strongest predictor of long-term success in language learning. The fact that you are here, studying voluntarily, puts you in the best possible position.',
    source: 'Deci, E. L. & Ryan, R. M. (2000). Self-determination theory. American Psychologist.',
  },

  // =========================================================================
  // LANGUAGE LEARNING (25 facts)
  // =========================================================================
  {
    id: 'll-001',
    category: 'language-learning',
    title: 'Comprehensible Input',
    body: 'Stephen Krashen\'s Input Hypothesis proposes that we acquire language when we understand messages slightly beyond our current level ("i+1"). Flashcards with context sentences provide exactly this kind of input.',
    source: 'Krashen, S. D. (1985). The Input Hypothesis: Issues and Implications. Longman.',
  },
  {
    id: 'll-002',
    category: 'language-learning',
    title: 'Receptive Before Productive',
    body: 'In natural language acquisition, comprehension (receptive knowledge) always develops before production (speaking/writing). Recognizing a word on a flashcard is the first step; using it in conversation comes later.',
    source: 'Webb, S. (2005). Receptive and productive vocabulary learning. Studies in Second Language Acquisition.',
  },
  {
    id: 'll-003',
    category: 'language-learning',
    title: 'Cognate Advantage',
    body: 'Languages that share word roots (cognates) give you a head start. English speakers already "know" thousands of Spanish words (hospital, animal, doctor). Identifying cognates accelerates early vocabulary acquisition.',
    source: 'Lubliner, S. & Hiebert, E. H. (2011). An analysis of English-Spanish cognates.',
  },
  {
    id: 'll-004',
    category: 'language-learning',
    title: 'Frequency Lists Matter',
    body: 'Not all vocabulary is equally useful. The 2,000 most frequent words in a language cover approximately 90% of everyday text. Prioritizing high-frequency words maximizes the practical value of each study session.',
    source: 'Nation, I. S. P. (2001). Learning Vocabulary in Another Language. Cambridge University Press.',
  },
  {
    id: 'll-005',
    category: 'language-learning',
    title: 'L1 Transfer',
    body: 'Your first language both helps and hinders new language learning. Similar structures transfer positively (e.g., English word order helps with French). Awareness of differences helps prevent negative transfer.',
    source: 'Odlin, T. (1989). Language Transfer: Cross-linguistic influence in language learning.',
  },
  {
    id: 'll-006',
    category: 'language-learning',
    title: 'Incidental Vocabulary Learning',
    body: 'You learn vocabulary not just from flashcards but from every encounter with the language -- reading, listening, conversation. Flashcards accelerate and reinforce what you also pick up incidentally from immersion.',
    source: 'Hulstijn, J. H. (2001). Intentional and incidental second language vocabulary learning.',
  },
  {
    id: 'll-007',
    category: 'language-learning',
    title: 'Word Families',
    body: 'Learning a base word gives you partial knowledge of its derived forms. If you know "create," you can guess "creation," "creative," "creator." One flashcard can unlock an entire word family.',
    source: 'Bauer, L. & Nation, I. S. P. (1993). Word families. International Journal of Lexicography.',
  },
  {
    id: 'll-008',
    category: 'language-learning',
    title: 'The Critical Mass Effect',
    body: 'After learning approximately 3,000 word families, you reach a "critical mass" where you can learn new words from context while reading. This tipping point transforms learning from effortful to self-sustaining.',
    source: 'Laufer, B. & Ravenhorst-Kalovski, G. C. (2010). Lexical threshold revisited.',
  },
  {
    id: 'll-009',
    category: 'language-learning',
    title: 'Multimodal Learning',
    body: 'Combining visual, auditory, and kinesthetic input when learning vocabulary creates multiple memory traces. Hearing pronunciation, seeing the written form, and writing it yourself creates the strongest memory.',
    source: 'Mayer, R. E. (2009). Multimedia Learning. Cambridge University Press.',
  },
  {
    id: 'll-010',
    category: 'language-learning',
    title: 'Semantic Clustering Risk',
    body: 'Counter-intuitively, learning related words together (all colors, all animals) can cause interference. It is often more effective to learn unrelated words in the same session and let your brain form its own connections.',
    source: 'Waring, R. (1997). The negative effects of learning words in semantic sets.',
  },
  {
    id: 'll-011',
    category: 'language-learning',
    title: 'Depth of Word Knowledge',
    body: 'Knowing a word involves more than its translation: pronunciation, collocations, register, connotations, and grammatical behavior all contribute. Each review deepens a different aspect of word knowledge.',
    source: 'Nation, I. S. P. (2001). Learning Vocabulary in Another Language. Cambridge University Press.',
  },
  {
    id: 'll-012',
    category: 'language-learning',
    title: 'The Noticing Hypothesis',
    body: 'Richard Schmidt proposed that conscious "noticing" of language forms is necessary for acquisition. Flashcard review forces noticing by isolating specific vocabulary and grammar points for focused attention.',
    source: 'Schmidt, R. (1990). The role of consciousness in second language learning. Applied Linguistics.',
  },
  {
    id: 'll-013',
    category: 'language-learning',
    title: 'Script Familiarity Effect',
    body: 'Learning a new writing system (Arabic, Japanese, Korean) initially seems daunting but actually helps memory by creating a distinct visual code. The novelty of unfamiliar scripts enhances encoding distinctiveness.',
    source: 'Chikamatsu, N. (1996). The effects of L1 orthography on L2 word recognition.',
  },
  {
    id: 'll-014',
    category: 'language-learning',
    title: 'Collocation Learning',
    body: 'Words naturally cluster into collocations ("make a decision," not "do a decision"). Learning common collocations alongside individual words produces more natural, fluent speech patterns.',
    source: 'Lewis, M. (1993). The Lexical Approach. Language Teaching Publications.',
  },
  {
    id: 'll-015',
    category: 'language-learning',
    title: 'Phonological Loop',
    body: 'Your brain has a "phonological loop" that rehearses sounds in working memory. Subvocalizing (silently pronouncing) new vocabulary while studying helps maintain words in this loop for better encoding.',
    source: 'Baddeley, A. D. (2003). Working memory and language. Journal of Communication Disorders.',
  },
  {
    id: 'll-016',
    category: 'language-learning',
    title: 'The Bilingual Advantage',
    body: 'Bilingual individuals show enhanced executive function, including better attention control, task switching, and conflict resolution. These cognitive benefits extend beyond language into general problem-solving.',
    source: 'Bialystok, E. et al. (2012). Bilingualism: Consequences for mind and brain.',
  },
  {
    id: 'll-017',
    category: 'language-learning',
    title: 'Vocabulary Size and Reading',
    body: 'To read a novel comfortably in a foreign language, you need approximately 8,000-9,000 word families. This sounds like a lot, but at 10 new words per day via spaced repetition, it takes about 2.5 years.',
    source: 'Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening?',
  },
  {
    id: 'll-018',
    category: 'language-learning',
    title: 'Morphological Awareness',
    body: 'Understanding word parts (prefixes, roots, suffixes) dramatically accelerates vocabulary learning. In Arabic, knowing the 3-letter root system can help you guess the meaning of thousands of derived words.',
    source: 'Kuo, L. J. & Anderson, R. C. (2006). Morphological awareness and learning to read.',
  },
  {
    id: 'll-019',
    category: 'language-learning',
    title: 'The U-Shaped Learning Curve',
    body: 'Language learners often go through a U-shaped pattern: initially correct (through memorization), then incorrect (as they overgeneralize rules), then correct again (with true understanding). Errors in the middle are actually progress.',
    source: 'McLaughlin, B. (1990). "Conscious" vs. "unconscious" learning. TESOL Quarterly.',
  },
  {
    id: 'll-020',
    category: 'language-learning',
    title: 'Lexical Coverage and Comprehension',
    body: 'You need to know about 95% of the words in a text for adequate comprehension, and 98% for comfortable reading. Each vocabulary word you master incrementally opens up more authentic content.',
    source: 'Laufer, B. (1989). What percentage of text-lexis is essential for comprehension?',
  },
  {
    id: 'll-021',
    category: 'language-learning',
    title: 'Output Hypothesis',
    body: 'Merrill Swain argued that producing language (output) forces deeper processing than merely understanding it. Trying to recall the foreign word from a native prompt exercises production pathways.',
    source: 'Swain, M. (1995). Three functions of output in second language learning.',
  },
  {
    id: 'll-022',
    category: 'language-learning',
    title: 'Age is Less Important Than You Think',
    body: 'While younger learners may have a slight edge in pronunciation, adult learners compensate with superior metacognitive strategies, larger existing vocabularies, and better study habits.',
    source: 'Muñoz, C. & Singleton, D. (2011). A critical review of age-related research on L2 attainment.',
  },
  {
    id: 'll-023',
    category: 'language-learning',
    title: 'Formulaic Sequences',
    body: 'Native speakers store and produce a huge proportion of language as pre-fabricated chunks ("by the way," "as a matter of fact"). Learning these formulas as single flashcard items dramatically improves fluency.',
    source: 'Wray, A. (2002). Formulaic Language and the Lexicon. Cambridge University Press.',
  },
  {
    id: 'll-024',
    category: 'language-learning',
    title: 'Cross-Linguistic Influence',
    body: 'Every language you already know provides scaffolding for the next one. Third language learners acquire vocabulary faster than second language learners, because they have more cross-linguistic connections to draw on.',
    source: 'Cenoz, J. (2003). The additive effect of bilingualism on third language acquisition.',
  },
  {
    id: 'll-025',
    category: 'language-learning',
    title: 'Implicit vs. Explicit Knowledge',
    body: 'Flashcards build explicit (conscious) knowledge. With enough practice and real-world use, this explicit knowledge gradually becomes implicit (automatic). The transition happens naturally -- keep reviewing.',
    source: 'Ellis, N. C. (2005). At the interface: Dynamic interactions of explicit and implicit knowledge.',
  },

  // =========================================================================
  // BRAIN HEALTH (25 facts)
  // =========================================================================
  {
    id: 'bh-001',
    category: 'brain-health',
    title: 'Exercise Boosts Memory',
    body: 'Just 20 minutes of moderate exercise before studying can improve memory encoding by 20-30%. Exercise increases BDNF (brain-derived neurotrophic factor), which strengthens synaptic plasticity.',
    source: 'Roig, M. et al. (2013). The effects of cardiovascular exercise on human memory.',
  },
  {
    id: 'bh-002',
    category: 'brain-health',
    title: 'Hydration and Cognitive Performance',
    body: 'Even mild dehydration (1-2% body weight loss) impairs attention, working memory, and long-term memory formation. Drinking water before and during study sessions supports optimal cognitive function.',
    source: 'Adan, A. (2012). Cognitive performance and dehydration. Journal of the American College of Nutrition.',
  },
  {
    id: 'bh-003',
    category: 'brain-health',
    title: 'Sleep Duration Matters',
    body: 'Adults who sleep 7-9 hours show significantly better memory consolidation than those sleeping less than 6 hours. Sleep is not wasted time -- it is when your brain processes and stores what you learned.',
    source: 'Walker, M. P. (2017). Why We Sleep: Unlocking the Power of Sleep and Dreams. Scribner.',
  },
  {
    id: 'bh-004',
    category: 'brain-health',
    title: 'Stress Impairs Memory',
    body: 'Chronic stress elevates cortisol, which damages the hippocampus -- the brain region essential for forming new memories. Managing stress through relaxation, exercise, or mindfulness directly improves learning capacity.',
    source: 'Lupien, S. J. et al. (2005). Stress hormones and human memory function. Psychoneuroendocrinology.',
  },
  {
    id: 'bh-005',
    category: 'brain-health',
    title: 'Mediterranean Diet Benefits',
    body: 'Diets rich in omega-3 fatty acids, antioxidants, and whole grains (like the Mediterranean diet) are associated with better cognitive function and reduced risk of cognitive decline. Feed your brain well.',
    source: 'Féart, C. et al. (2009). Mediterranean diet and cognitive function. JAMA.',
  },
  {
    id: 'bh-006',
    category: 'brain-health',
    title: 'Caffeine and Memory',
    body: 'Moderate caffeine intake (200-300mg, about 2 cups of coffee) can enhance attention and memory consolidation, especially when consumed after a study session. Post-study caffeine strengthens memory traces.',
    source: 'Borota, D. et al. (2014). Post-study caffeine administration enhances memory consolidation.',
  },
  {
    id: 'bh-007',
    category: 'brain-health',
    title: 'Mindfulness Improves Attention',
    body: 'Regular mindfulness meditation (as little as 10 minutes daily) improves sustained attention and working memory capacity. Better attention during study means better encoding of flashcard content.',
    source: 'Jha, A. P. et al. (2007). Mindfulness training modifies subsystems of attention.',
  },
  {
    id: 'bh-008',
    category: 'brain-health',
    title: 'Social Connection and Brain Health',
    body: 'Social interaction stimulates neural pathways and may reduce cognitive decline by up to 70%. Practicing a new language with conversation partners combines social engagement with learning benefits.',
    source: 'Fratiglioni, L. et al. (2004). An active and socially integrated lifestyle as protective.',
  },
  {
    id: 'bh-009',
    category: 'brain-health',
    title: 'Blue Light and Sleep Quality',
    body: 'Exposure to blue light from screens before bed suppresses melatonin and disrupts sleep, harming memory consolidation. If studying on a device at night, use a blue-light filter or stop screens 30 minutes before bed.',
    source: 'Chang, A. M. et al. (2015). Evening use of light-emitting eReaders. PNAS.',
  },
  {
    id: 'bh-010',
    category: 'brain-health',
    title: 'Nature Exposure Restores Attention',
    body: 'Spending just 20 minutes in nature (or even viewing nature images) restores depleted attention. A brief walk outside between study sessions can refresh your focus for the next session.',
    source: 'Berman, M. G. et al. (2008). The cognitive benefits of interacting with nature.',
  },
  {
    id: 'bh-011',
    category: 'brain-health',
    title: 'Multitasking is a Myth',
    body: 'The brain does not truly multitask -- it rapidly switches between tasks, losing efficiency each time. Studying with notifications on or while watching TV can reduce encoding effectiveness by 30-50%.',
    source: 'Ophir, E. et al. (2009). Cognitive control in media multitaskers. PNAS.',
  },
  {
    id: 'bh-012',
    category: 'brain-health',
    title: 'Naps Boost Learning',
    body: 'A 20-30 minute nap after studying can significantly improve memory retention. Naps allow the hippocampus to transfer newly encoded information to cortical long-term storage, freeing capacity for new learning.',
    source: 'Mednick, S. C. et al. (2003). Sleep-dependent learning: A nap is as good as a night.',
  },
  {
    id: 'bh-013',
    category: 'brain-health',
    title: 'Novelty Stimulates Memory',
    body: 'Exposure to novel experiences triggers dopamine release in the hippocampus, enhancing memory for events that occur around the same time. Learning in new environments can leverage this "novelty bonus."',
    source: 'Lisman, J. E. & Grace, A. A. (2005). The hippocampal-VTA loop. Neuron.',
  },
  {
    id: 'bh-014',
    category: 'brain-health',
    title: 'Cognitive Reserve',
    body: 'Lifelong learning builds "cognitive reserve" -- a buffer against age-related decline and neurodegenerative diseases. Language learning is one of the most effective cognitive reserve-building activities.',
    source: 'Stern, Y. (2009). Cognitive reserve. Neuropsychologia.',
  },
  {
    id: 'bh-015',
    category: 'brain-health',
    title: 'Music and Studying',
    body: 'Instrumental background music can help some learners maintain focus, but lyrics in any language tend to interfere with verbal learning. For flashcard sessions, choose instrumental music or silence.',
    source: 'Perham, N. & Currie, H. (2014). Does listening to preferred music improve reading comprehension?',
  },
  {
    id: 'bh-016',
    category: 'brain-health',
    title: 'Glucose Fuels Memory',
    body: 'The brain consumes about 20% of the body\'s energy despite being only 2% of its mass. A small glucose boost (a piece of fruit or some juice) before studying can improve memory performance.',
    source: 'Gold, P. E. (1995). Role of glucose in regulating the brain and cognition. American Journal of Clinical Nutrition.',
  },
  {
    id: 'bh-017',
    category: 'brain-health',
    title: 'Bilingualism Delays Dementia',
    body: 'Studies show that lifelong bilingualism can delay the onset of dementia symptoms by an average of 4-5 years. This effect is comparable to, or greater than, any currently available medication.',
    source: 'Bialystok, E. et al. (2007). Bilingualism as a protection against the onset of symptoms of dementia.',
  },
  {
    id: 'bh-018',
    category: 'brain-health',
    title: 'Deep Breathing and Focus',
    body: 'Taking 3-5 deep breaths before a study session activates the parasympathetic nervous system, reducing anxiety and creating an optimal state for memory encoding. A calm brain encodes better.',
    source: 'Ma, X. et al. (2017). The effect of diaphragmatic breathing on attention. Frontiers in Psychology.',
  },
  {
    id: 'bh-019',
    category: 'brain-health',
    title: 'Screen Breaks for Eye and Brain',
    body: 'The 20-20-20 rule (every 20 minutes, look at something 20 feet away for 20 seconds) reduces eye strain and provides micro-breaks that help sustain cognitive performance over longer sessions.',
    source: 'Sheppard, A. L. & Wolffsohn, J. S. (2018). Digital eye strain. BMJ Open Ophthalmology.',
  },
  {
    id: 'bh-020',
    category: 'brain-health',
    title: 'Walking Boosts Creativity',
    body: 'Walking increases creative output by about 60%. If you are stuck on a mnemonic or trying to form an association for a difficult word, a short walk can unlock new creative connections.',
    source: 'Oppezzo, M. & Schwartz, D. L. (2014). Give your ideas some legs. Journal of Experimental Psychology.',
  },
  {
    id: 'bh-021',
    category: 'brain-health',
    title: 'Gut-Brain Axis',
    body: 'The gut microbiome communicates with the brain via the vagus nerve and affects mood, stress response, and even memory. A diverse, fiber-rich diet supports both gut health and cognitive function.',
    source: 'Cryan, J. F. & Dinan, T. G. (2012). Mind-altering microorganisms. Nature Reviews Neuroscience.',
  },
  {
    id: 'bh-022',
    category: 'brain-health',
    title: 'Posture Affects Cognition',
    body: 'Upright posture is associated with better recall and more positive thinking compared to slouching. Sitting up straight during study sessions may actually improve your ability to encode and retrieve information.',
    source: 'Nair, S. et al. (2015). Do slumped and upright postures affect stress responses? Health Psychology.',
  },
  {
    id: 'bh-023',
    category: 'brain-health',
    title: 'Laughter Reduces Cortisol',
    body: 'Laughter reduces cortisol levels by up to 39% and increases endorphins. Taking a moment to enjoy something funny before studying creates a neurochemical environment that supports better memory formation.',
    source: 'Berk, L. S. et al. (2001). Modulation of neuroimmune parameters during the humor of laughter.',
  },
  {
    id: 'bh-024',
    category: 'brain-health',
    title: 'Chronic Inflammation and Memory',
    body: 'Chronic low-grade inflammation impairs hippocampal function and memory. Anti-inflammatory foods (leafy greens, berries, fatty fish, nuts) support both physical health and optimal learning capacity.',
    source: 'Marsland, A. L. et al. (2015). Brain morphology links systemic inflammation to cognitive function.',
  },
  {
    id: 'bh-025',
    category: 'brain-health',
    title: 'Sunlight and Vitamin D',
    body: 'Vitamin D receptors are found throughout the brain, including in the hippocampus. Adequate sunlight exposure (or supplementation) supports cognitive function and mood, both of which affect learning.',
    source: 'Annweiler, C. et al. (2013). Vitamin D and cognitive performance in adults. Neurology.',
  },
];

// ---------------------------------------------------------------------------
// Category index for fast lookups
// ---------------------------------------------------------------------------

const FACTS_BY_CATEGORY: Record<InsightCategory, InsightFact[]> = {
  'memory-science': [],
  'study-tips': [],
  'motivation': [],
  'language-learning': [],
  'brain-health': [],
};

for (const fact of INSIGHT_FACTS) {
  FACTS_BY_CATEGORY[fact.category].push(fact);
}

// ---------------------------------------------------------------------------
// InsightCardService
// ---------------------------------------------------------------------------

export class InsightCardService {
  private pool: Pool;

  /**
   * Track recently shown insight IDs per user to avoid repetition within
   * a session. Key: userId, Value: Set of recently shown insight IDs.
   */
  private recentlyShown: Map<string, Set<string>> = new Map();

  /** Maximum number of recent insights to track per user. */
  private static readonly RECENT_WINDOW = 30;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get a random insight fact from any category.
   *
   * Uses a simple uniform random selection. For session-aware,
   * contextual selection, use `getSessionInsight` instead.
   *
   * @returns A randomly selected insight fact.
   */
  getRandomInsight(): InsightFact {
    const index = Math.floor(Math.random() * INSIGHT_FACTS.length);
    return INSIGHT_FACTS[index];
  }

  /**
   * Get a random insight from a specific category.
   *
   * @param category - The category to select from.
   * @returns A random insight from the category, or null if category is invalid.
   */
  getInsightByCategory(category: InsightCategory): InsightFact | null {
    const facts = FACTS_BY_CATEGORY[category];
    if (!facts || facts.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * facts.length);
    return facts[index];
  }

  /**
   * Get a contextually appropriate insight based on session performance.
   *
   * Selection logic:
   *   - Low accuracy (< 60%): Serve "desirable difficulty" or motivation insights
   *     to reframe struggle as normal and productive.
   *   - High accuracy (> 90%): Serve brain-health or study-tips insights since
   *     the user does not need motivational support.
   *   - Early in session (< 5 reviews): Serve memory-science insights to
   *     build metacognitive awareness.
   *   - Mid-session: Serve language-learning insights for practical tips.
   *   - Default: Random from any category.
   *
   * The method also avoids repeating recently shown insights for the same user.
   *
   * @param reviewCount - Number of reviews completed in this session so far.
   * @param accuracy - Current session accuracy as a decimal (0-1).
   * @param userId - Optional user ID for deduplication across calls.
   * @returns The selected insight and the reason it was chosen.
   */
  getSessionInsight(
    reviewCount: number,
    accuracy: number,
    userId?: string
  ): SessionInsightContext {
    let targetCategory: InsightCategory;
    let reason: string;

    if (accuracy < 0.6 && reviewCount >= 5) {
      // User is struggling -- motivate them
      targetCategory = 'motivation';
      reason = 'Low accuracy detected; providing motivational support.';
    } else if (accuracy > 0.9 && reviewCount >= 10) {
      // User is cruising -- offer brain health / study optimization tips
      const categories: InsightCategory[] = ['brain-health', 'study-tips'];
      targetCategory = categories[Math.floor(Math.random() * categories.length)];
      reason = 'High accuracy; providing optimization or brain-health insight.';
    } else if (reviewCount < 5) {
      // Early session -- build metacognitive awareness
      targetCategory = 'memory-science';
      reason = 'Early in session; building metacognitive awareness.';
    } else if (reviewCount < 15) {
      // Mid session -- language-specific tips
      targetCategory = 'language-learning';
      reason = 'Mid-session; providing language learning insight.';
    } else {
      // Default: random category
      const allCategories: InsightCategory[] = [
        'memory-science', 'study-tips', 'motivation', 'language-learning', 'brain-health',
      ];
      targetCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
      reason = 'General session insight from random category.';
    }

    const candidates = FACTS_BY_CATEGORY[targetCategory];
    const recentSet = userId ? this.getRecentSet(userId) : new Set<string>();

    // Try to pick an insight not recently shown to this user
    const unseen = candidates.filter((f) => !recentSet.has(f.id));
    const pool = unseen.length > 0 ? unseen : candidates;
    const selected = pool[Math.floor(Math.random() * pool.length)];

    // Track the selection
    if (userId) {
      this.trackShown(userId, selected.id);
    }

    return { insight: selected, reason };
  }

  /**
   * Get all available insight facts (for admin/debug purposes).
   *
   * @returns The complete array of insight facts.
   */
  getAllInsights(): InsightFact[] {
    return [...INSIGHT_FACTS];
  }

  /**
   * Get the total number of available insights.
   *
   * @returns The count of all insight facts.
   */
  getInsightCount(): number {
    return INSIGHT_FACTS.length;
  }

  /**
   * Get all available categories and their fact counts.
   *
   * @returns A record mapping category names to the number of facts in each.
   */
  getCategoryCounts(): Record<InsightCategory, number> {
    const counts = {} as Record<InsightCategory, number>;
    for (const [category, facts] of Object.entries(FACTS_BY_CATEGORY)) {
      counts[category as InsightCategory] = facts.length;
    }
    return counts;
  }

  /**
   * Clear the recently-shown tracking for a user.
   * Useful when a user starts a new session.
   *
   * @param userId - The user whose history should be cleared.
   */
  clearRecentHistory(userId: string): void {
    this.recentlyShown.delete(userId);
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  private getRecentSet(userId: string): Set<string> {
    return this.recentlyShown.get(userId) ?? new Set();
  }

  private trackShown(userId: string, insightId: string): void {
    let set = this.recentlyShown.get(userId);
    if (!set) {
      set = new Set();
      this.recentlyShown.set(userId, set);
    }

    set.add(insightId);

    // Evict oldest entries if window exceeded (convert to array, trim, rebuild)
    if (set.size > InsightCardService.RECENT_WINDOW) {
      const arr = Array.from(set);
      const trimmed = arr.slice(arr.length - InsightCardService.RECENT_WINDOW);
      this.recentlyShown.set(userId, new Set(trimmed));
    }
  }
}

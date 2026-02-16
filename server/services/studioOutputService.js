/**
 * INSIGHT 360 - Studio Output Service
 * Version: 1.0.0
 *
 * Dedicated service for generating all Research Studio output types.
 * Handles text outputs (reports, flashcards, quiz, mind map) and
 * advanced outputs (audio, infographics, slides).
 */

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// Supabase client - can be injected via setSupabase() or falls back to env vars
let supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

function setSupabase(client) {
    supabase = client;
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Audio service for TTS generation
let audioService = null;
function getAudioService() {
    if (!audioService) {
        audioService = require('./audioService');
    }
    return audioService;
}

// Default model for output generation
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

// =====================================================
// OUTPUT CONFIGURATION
// =====================================================

/**
 * Output type configurations with prompts and schemas
 */
const OUTPUT_CONFIGS = {
    // =========== TEXT OUTPUTS (Phase 3) ===========

    report: {
        name: 'Comprehensive Report',
        description: 'A detailed report with executive summary, findings, and conclusions',
        maxTokens: 8192,
        systemPrompt: `You are an expert analyst creating comprehensive reports. Structure your report clearly with sections and subsections. Be thorough but concise.`,
        instruction: `Generate a comprehensive report based on the provided sources. Include:
1. Executive Summary (2-3 paragraphs highlighting key insights)
2. Key Findings (5-8 major discoveries)
3. Detailed Analysis (organized by theme/topic)
4. Conclusions and Implications
5. References to source materials

Be analytical, objective, and cite sources where appropriate.`,
        format: `Respond with valid JSON:
{
    "title": "Report Title",
    "executive_summary": "Comprehensive executive summary...",
    "key_findings": [
        { "finding": "Key finding 1", "source_refs": ["Source 1"] },
        { "finding": "Key finding 2", "source_refs": ["Source 2"] }
    ],
    "sections": [
        {
            "heading": "Section Title",
            "content": "Section content with analysis...",
            "subsections": [
                { "heading": "Subsection", "content": "Details..." }
            ]
        }
    ],
    "conclusions": ["Conclusion 1", "Conclusion 2"],
    "methodology_note": "Brief note on analysis approach"
}`
    },

    summary: {
        name: 'Executive Summary',
        description: 'A concise summary of key points and themes',
        maxTokens: 4096,
        systemPrompt: `You are an expert at distilling complex information into clear, actionable summaries. Focus on what matters most.`,
        instruction: `Generate a concise summary that captures:
1. Main purpose/topic of the sources
2. Key points (5-7 most important)
3. Major themes and patterns
4. Key takeaways for the reader`,
        format: `Respond with valid JSON:
{
    "title": "Summary Title",
    "overview": "One paragraph overview of what the sources cover",
    "key_points": [
        "Key point 1 with brief explanation",
        "Key point 2 with brief explanation"
    ],
    "themes": [
        { "theme": "Theme name", "description": "Brief description" }
    ],
    "takeaways": ["Actionable takeaway 1", "Actionable takeaway 2"],
    "word_count": 500
}`
    },

    flashcards: {
        name: 'Study Flashcards',
        description: 'Question and answer pairs for learning the material',
        maxTokens: 8192,
        systemPrompt: `You are an expert educator creating effective study materials. Create flashcards that test understanding of key concepts, not just memorization.`,
        instruction: (options) => `Generate ${options.count || 15} high-quality flashcards based on the sources. Each card should:
1. Focus on one concept, fact, or relationship
2. Use clear, specific questions
3. Provide comprehensive but concise answers
4. Include context about the source when relevant
5. Vary difficulty levels (easy, medium, hard)

Cover all major topics proportionally.`,
        format: `Respond with valid JSON:
{
    "title": "Flashcard Set Title",
    "description": "Brief description of what these cards cover",
    "cards": [
        {
            "id": 1,
            "question": "What is...?",
            "answer": "The answer is...",
            "difficulty": "medium",
            "topic": "Topic category",
            "source_hint": "From Source 1"
        }
    ],
    "study_tips": ["Tip for effective studying"]
}`
    },

    quiz: {
        name: 'Knowledge Quiz',
        description: 'Multiple choice quiz to test understanding',
        maxTokens: 8192,
        systemPrompt: `You are an expert assessment designer creating fair, educational quizzes. Questions should test comprehension and application, not trick the test-taker.`,
        instruction: (options) => `Generate a ${options.count || 10} question multiple-choice quiz based on the sources. For each question:
1. Write a clear, unambiguous question
2. Provide exactly 4 answer options (A, B, C, D)
3. Make all options plausible but only one correct
4. Include an explanation for why the correct answer is right
5. Vary difficulty (include some easy, most medium, some challenging)

Cover the main topics from the sources proportionally.`,
        format: `Respond with valid JSON:
{
    "title": "Quiz Title",
    "description": "Brief quiz description",
    "time_limit_minutes": 15,
    "passing_score": 70,
    "questions": [
        {
            "id": 1,
            "question": "What is the main purpose of...?",
            "options": [
                { "label": "A", "text": "First option" },
                { "label": "B", "text": "Second option" },
                { "label": "C", "text": "Third option" },
                { "label": "D", "text": "Fourth option" }
            ],
            "correct_answer": "B",
            "explanation": "B is correct because...",
            "difficulty": "medium",
            "topic": "Topic category"
        }
    ],
    "scoring": {
        "correct_points": 10,
        "total_possible": 100
    }
}`
    },

    mindmap: {
        name: 'Mind Map',
        description: 'Hierarchical visualization of concepts and relationships',
        maxTokens: 6144,
        systemPrompt: `You are an expert at organizing information into clear, logical hierarchies. Create mind maps that show relationships between concepts.`,
        instruction: `Generate a mind map structure that organizes the key concepts from the sources. Include:
1. A central topic that captures the main theme
2. 4-7 main branches representing major themes/categories
3. 2-5 sub-branches under each main branch
4. Leaf nodes with specific details, facts, or examples
5. Connection notes where concepts relate across branches`,
        format: `Respond with valid JSON:
{
    "title": "Mind Map Title",
    "central_topic": "Core concept",
    "description": "Overview of what this map covers",
    "branches": [
        {
            "id": 1,
            "topic": "Main Branch Topic",
            "color": "#3b82f6",
            "subtopics": [
                {
                    "id": 11,
                    "topic": "Sub-topic",
                    "details": ["Detail 1", "Detail 2"],
                    "connections": [{ "to_branch": 2, "relationship": "relates to" }]
                }
            ]
        }
    ],
    "cross_connections": [
        { "from": 11, "to": 23, "label": "influences" }
    ]
}`
    },

    // =========== DATA OUTPUTS ===========

    table: {
        name: 'Data Table',
        description: 'Structured data extracted into a table format',
        maxTokens: 6144,
        systemPrompt: `You are an expert at extracting and organizing data into clear, well-structured tables. Identify the most meaningful way to tabulate information.`,
        instruction: `Extract and organize data from the sources into a structured table format. Identify:
1. The most meaningful columns/categories
2. All relevant data points
3. Appropriate data types for each column
4. Any notes or context for the data`,
        format: `Respond with valid JSON:
{
    "title": "Table Title",
    "description": "What this table shows",
    "columns": [
        { "key": "column1", "label": "Column 1 Name", "type": "text" },
        { "key": "column2", "label": "Column 2 Name", "type": "number" }
    ],
    "rows": [
        { "column1": "Value 1", "column2": 42 }
    ],
    "notes": "Any additional context",
    "source_summary": "Where this data came from"
}`
    },

    briefing: {
        name: 'Executive Briefing',
        description: 'A concise briefing document for decision makers',
        maxTokens: 4096,
        systemPrompt: `You are an expert executive briefing writer. Create concise, actionable briefings that busy leaders can quickly absorb.`,
        instruction: `Generate an executive briefing document that includes:
1. Situation summary (what's happening)
2. Key insights (what it means)
3. Risks and concerns
4. Opportunities identified
5. Recommended actions

Keep it brief and actionable.`,
        format: `Respond with valid JSON:
{
    "title": "Briefing Title",
    "date": "2024-01-20",
    "classification": "Internal",
    "situation_summary": "Brief overview...",
    "key_insights": [
        { "insight": "Key insight 1", "impact": "high" }
    ],
    "risks": [
        { "risk": "Risk description", "severity": "medium", "mitigation": "Suggested action" }
    ],
    "opportunities": [
        { "opportunity": "Opportunity description", "potential": "high" }
    ],
    "recommendations": [
        { "action": "Recommended action", "priority": "high", "owner": "TBD" }
    ],
    "next_steps": ["Immediate next step"]
}`
    },

    // =========== PRESENTATION OUTPUTS ===========

    slides: {
        name: 'Slide Deck',
        description: 'Presentation outline with key points per slide',
        maxTokens: 8192,
        systemPrompt: `You are an expert presentation designer. Create slide outlines that tell a compelling story and are easy to present.`,
        instruction: (options) => `Generate a ${options.count || 10}-slide presentation outline based on the sources. Include:
1. Title slide with subtitle
2. Agenda/overview slide
3. Content slides with clear bullet points (3-5 per slide)
4. Supporting data or examples
5. Summary/conclusion slide
6. Speaker notes for each slide

Follow presentation best practices: one idea per slide, minimal text, clear hierarchy.`,
        format: `Respond with valid JSON:
{
    "title": "Presentation Title",
    "subtitle": "Presentation subtitle",
    "author": "Research Studio",
    "slides": [
        {
            "id": 1,
            "type": "title",
            "title": "Main Title",
            "subtitle": "Subtitle or tagline",
            "speaker_notes": "Notes for presenter"
        },
        {
            "id": 2,
            "type": "content",
            "title": "Slide Title",
            "bullet_points": ["Point 1", "Point 2", "Point 3"],
            "visual_suggestion": "Chart type or image idea",
            "speaker_notes": "Detailed notes for this slide"
        }
    ],
    "estimated_duration_minutes": 20
}`
    },

    infographic: {
        name: 'Infographic',
        description: 'Visual data representation with stats and facts',
        maxTokens: 6144,
        systemPrompt: `You are an expert infographic designer. Create structured data for visually compelling infographics that communicate key information at a glance.`,
        instruction: `Generate infographic content structure based on the sources. Include:
1. A compelling headline
2. Key statistics with context
3. Visual sections with icons and facts
4. Data points for charts
5. Call-to-action or takeaway

Design for visual impact and quick comprehension.`,
        format: `Respond with valid JSON:
{
    "title": "Infographic Title",
    "subtitle": "Brief tagline",
    "color_scheme": ["#3b82f6", "#10b981", "#f59e0b"],
    "header_stat": {
        "value": "85%",
        "label": "Key metric label",
        "context": "Brief context"
    },
    "sections": [
        {
            "heading": "Section Title",
            "icon": "chart-bar",
            "stats": [
                { "value": "42", "label": "Stat label", "trend": "up" }
            ],
            "facts": ["Interesting fact 1", "Interesting fact 2"]
        }
    ],
    "chart_data": {
        "type": "bar",
        "title": "Chart title",
        "data": [
            { "label": "Item 1", "value": 75 }
        ]
    },
    "callout": {
        "text": "Key takeaway message",
        "action": "Learn more"
    }
}`
    },

    // =========== AUDIO OUTPUT (Phase 4) ===========

    audio: {
        name: 'Audio Overview',
        description: 'Podcast-style audio narration of key points',
        maxTokens: 6144,
        systemPrompt: `You are an expert podcast scriptwriter. Create engaging, conversational scripts that inform and educate while being pleasant to listen to.`,
        instruction: `Generate a podcast-style script discussing the key topics from the sources. The script should:
1. Open with an engaging hook
2. Introduce the main topics
3. Discuss key findings conversationally
4. Include natural transitions
5. End with key takeaways

Write for audio - use conversational language, short sentences, and clear structure.`,
        format: `Respond with valid JSON:
{
    "title": "Audio Overview Title",
    "description": "Brief description for listing",
    "duration_estimate": "5-7 minutes",
    "script": "Full script text with natural speech patterns...",
    "segments": [
        {
            "name": "Introduction",
            "duration": "30 seconds",
            "text": "Opening segment text..."
        }
    ],
    "voice_instructions": "Conversational, clear, medium pace",
    "background_music": "Soft, ambient"
}`
    }
};

// =====================================================
// CORE GENERATION FUNCTIONS
// =====================================================

/**
 * Generate an output based on type and context
 * @param {string} studioId - Studio ID
 * @param {string} outputType - Type of output to generate
 * @param {object} context - Assembled source context
 * @param {object} options - Generation options
 * @returns {Promise<object>} - Generated output
 */
async function generateOutput(studioId, outputType, context, options = {}) {
    const config = OUTPUT_CONFIGS[outputType];

    if (!config) {
        throw new Error(`Unknown output type: ${outputType}`);
    }

    const model = options.model || DEFAULT_MODEL;
    const instruction = typeof config.instruction === 'function'
        ? config.instruction(options)
        : config.instruction;

    try {
        const response = await anthropic.messages.create({
            model: model,
            max_tokens: config.maxTokens,
            system: config.systemPrompt,
            messages: [{
                role: 'user',
                content: `${instruction}

SOURCES:
${context.context}

${config.format}`
            }]
        });

        const responseText = response.content[0].text;
        let content;

        try {
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                content = JSON.parse(jsonMatch[0]);
            } else {
                content = { raw: responseText };
            }
        } catch (e) {
            console.error('JSON parse error:', e);
            content = { raw: responseText };
        }

        // Validate and enhance content based on type
        content = validateAndEnhanceContent(outputType, content, options);

        // Special handling for audio - generate TTS
        let filePath = null;
        if (outputType === 'audio' && options.generateAudio !== false) {
            try {
                const audio = getAudioService();
                if (audio.isAvailable()) {
                    console.log('Generating audio from script...');
                    const audioResult = await audio.generateStudioAudio(studioId, content, {
                        voice: options.voice || 'nova'
                    });
                    filePath = audioResult.file_path;
                    content.audio = audioResult;
                    content.has_audio = true;
                } else {
                    content.has_audio = false;
                    content.audio_note = 'Audio generation requires OPENAI_API_KEY';
                }
            } catch (audioError) {
                console.error('Audio generation failed:', audioError);
                content.has_audio = false;
                content.audio_error = audioError.message;
            }
        }

        // Save to database
        const output = await saveOutput(studioId, {
            output_type: outputType,
            title: content.title || options.title || `${config.name} - ${new Date().toLocaleDateString()}`,
            content,
            file_path: filePath,
            model_used: model,
            generation_params: options
        });

        return output;

    } catch (error) {
        console.error(`Error generating ${outputType}:`, error);
        throw new Error(`Failed to generate ${outputType}: ${error.message}`);
    }
}

/**
 * Validate and enhance output content based on type
 * @param {string} outputType - Output type
 * @param {object} content - Raw content from LLM
 * @param {object} options - Generation options
 * @returns {object} - Validated and enhanced content
 */
function validateAndEnhanceContent(outputType, content, options) {
    switch (outputType) {
        case 'quiz':
            // Ensure quiz has required structure
            if (content.questions) {
                content.questions = content.questions.map((q, idx) => ({
                    id: q.id || idx + 1,
                    question: q.question,
                    options: q.options || [],
                    correct_answer: q.correct_answer,
                    explanation: q.explanation || '',
                    difficulty: q.difficulty || 'medium',
                    topic: q.topic || 'General'
                }));
            }
            // Add scoring metadata
            content.scoring = content.scoring || {
                correct_points: 10,
                total_possible: (content.questions?.length || 10) * 10
            };
            break;

        case 'flashcards':
            // Ensure cards have IDs
            if (content.cards) {
                content.cards = content.cards.map((card, idx) => ({
                    id: card.id || idx + 1,
                    question: card.question,
                    answer: card.answer,
                    difficulty: card.difficulty || 'medium',
                    topic: card.topic || 'General',
                    source_hint: card.source_hint || ''
                }));
            }
            break;

        case 'mindmap':
            // Ensure branches have IDs
            if (content.branches) {
                let branchId = 1;
                content.branches = content.branches.map(branch => {
                    const bId = branchId++;
                    return {
                        id: bId,
                        topic: branch.topic,
                        color: branch.color || getRandomColor(),
                        subtopics: (branch.subtopics || []).map(sub => ({
                            id: branchId++,
                            topic: sub.topic,
                            details: sub.details || [],
                            connections: sub.connections || []
                        }))
                    };
                });
            }
            break;

        case 'slides':
            // Ensure slides have IDs and types
            if (content.slides) {
                content.slides = content.slides.map((slide, idx) => ({
                    id: slide.id || idx + 1,
                    type: slide.type || (idx === 0 ? 'title' : 'content'),
                    title: slide.title,
                    subtitle: slide.subtitle,
                    bullet_points: slide.bullet_points || [],
                    visual_suggestion: slide.visual_suggestion,
                    speaker_notes: slide.speaker_notes || ''
                }));
            }
            break;
    }

    return content;
}

/**
 * Get random color for mind map branches
 * @returns {string} - Hex color
 */
function getRandomColor() {
    const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Save output to database
 * @param {string} studioId - Studio ID
 * @param {object} outputData - Output data
 * @returns {Promise<object>} - Saved output
 */
async function saveOutput(studioId, outputData) {
    const { output_type, title, content, file_path, model_used, generation_params } = outputData;

    const { data, error } = await supabase
        .from('studio_outputs')
        .insert({
            studio_id: studioId,
            output_type,
            title,
            content,
            file_path,
            model_used,
            generation_params: generation_params || {},
            status: 'complete'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to save output: ${error.message}`);
    }

    return data;
}

// =====================================================
// QUIZ FUNCTIONS
// =====================================================

/**
 * Score a quiz submission
 * @param {object} quiz - Quiz content
 * @param {object} answers - User answers { questionId: selectedAnswer }
 * @returns {object} - Scoring results
 */
function scoreQuiz(quiz, answers) {
    if (!quiz.questions || !answers) {
        return { score: 0, total: 0, percentage: 0, results: [] };
    }

    const results = quiz.questions.map(question => {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correct_answer;

        return {
            question_id: question.id,
            user_answer: userAnswer,
            correct_answer: question.correct_answer,
            is_correct: isCorrect,
            explanation: question.explanation,
            points: isCorrect ? (quiz.scoring?.correct_points || 10) : 0
        };
    });

    const totalCorrect = results.filter(r => r.is_correct).length;
    const totalQuestions = quiz.questions.length;
    const pointsEarned = results.reduce((sum, r) => sum + r.points, 0);
    const pointsPossible = quiz.scoring?.total_possible || totalQuestions * 10;
    const percentage = Math.round((pointsEarned / pointsPossible) * 100);
    const passed = percentage >= (quiz.passing_score || 70);

    return {
        score: pointsEarned,
        total: pointsPossible,
        percentage,
        passed,
        correct_count: totalCorrect,
        total_questions: totalQuestions,
        results,
        summary: {
            by_difficulty: summarizeByDifficulty(quiz.questions, results),
            by_topic: summarizeByTopic(quiz.questions, results)
        }
    };
}

/**
 * Summarize results by difficulty
 */
function summarizeByDifficulty(questions, results) {
    const summary = {};

    questions.forEach((q, idx) => {
        const difficulty = q.difficulty || 'medium';
        if (!summary[difficulty]) {
            summary[difficulty] = { total: 0, correct: 0 };
        }
        summary[difficulty].total++;
        if (results[idx]?.is_correct) {
            summary[difficulty].correct++;
        }
    });

    return summary;
}

/**
 * Summarize results by topic
 */
function summarizeByTopic(questions, results) {
    const summary = {};

    questions.forEach((q, idx) => {
        const topic = q.topic || 'General';
        if (!summary[topic]) {
            summary[topic] = { total: 0, correct: 0 };
        }
        summary[topic].total++;
        if (results[idx]?.is_correct) {
            summary[topic].correct++;
        }
    });

    return summary;
}

// =====================================================
// FLASHCARD FUNCTIONS
// =====================================================

/**
 * Get flashcards in study order (shuffle or sequential)
 * @param {object} flashcardOutput - Flashcard output content
 * @param {boolean} shuffle - Whether to shuffle cards
 * @returns {object[]} - Cards in study order
 */
function getFlashcardsForStudy(flashcardOutput, shuffle = false) {
    let cards = [...(flashcardOutput.cards || [])];

    if (shuffle) {
        // Fisher-Yates shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    return cards;
}

/**
 * Filter flashcards by difficulty
 * @param {object} flashcardOutput - Flashcard output content
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @returns {object[]} - Filtered cards
 */
function filterFlashcardsByDifficulty(flashcardOutput, difficulty) {
    if (!difficulty || difficulty === 'all') {
        return flashcardOutput.cards || [];
    }

    return (flashcardOutput.cards || []).filter(card =>
        card.difficulty === difficulty
    );
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Initialization
    setSupabase,

    // Core generation
    generateOutput,
    saveOutput,

    // Configuration
    OUTPUT_CONFIGS,

    // Quiz functions
    scoreQuiz,

    // Flashcard functions
    getFlashcardsForStudy,
    filterFlashcardsByDifficulty,

    // Content validation
    validateAndEnhanceContent
};

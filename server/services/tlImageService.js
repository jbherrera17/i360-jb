/**
 * INSIGHT 360 - Thought Leadership Image Service
 * Version: 1.0.0
 *
 * Generates article header images using DALL-E 3 and uploads to Supabase Storage.
 * Images are optimized for thought leadership content with multiple style options.
 */

const { createClient } = require('@supabase/supabase-js');
const openaiService = require('./openai');
const logger = require('./logger');
const https = require('https');
const http = require('http');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Storage bucket for TL images
const STORAGE_BUCKET = 'tl-images';

// Image style configurations
const IMAGE_STYLES = {
    professional: {
        name: 'Professional',
        description: 'Clean, modern business aesthetic',
        dalleStyle: 'natural',
        promptModifiers: 'Corporate and professional style. Clean, modern business aesthetic. Photorealistic quality. Subtle color palette with blues, grays, and whites. No text or words in the image.'
    },
    abstract: {
        name: 'Abstract',
        description: 'Conceptual art with bold colors',
        dalleStyle: 'vivid',
        promptModifiers: 'Abstract conceptual art style. Bold, vibrant colors. Geometric shapes representing ideas and innovation. Dynamic composition. No text or words in the image.'
    },
    illustrative: {
        name: 'Illustrative',
        description: 'Editorial illustration style',
        dalleStyle: 'vivid',
        promptModifiers: 'Editorial illustration style. Hand-drawn feel with digital polish. Warm, inviting colors. Slightly stylized but professional. No text or words in the image.'
    },
    minimalist: {
        name: 'Minimalist',
        description: 'Simple shapes, limited palette',
        dalleStyle: 'natural',
        promptModifiers: 'Minimalist design. Simple geometric shapes. Very limited color palette (2-3 colors). Lots of white/negative space. Clean and elegant. No text or words in the image.'
    },
    futuristic: {
        name: 'Futuristic',
        description: 'Tech-forward, AI themes',
        dalleStyle: 'vivid',
        promptModifiers: 'Futuristic, tech-forward aesthetic. Neon accents, digital elements, AI and innovation themes. Sleek and modern. Subtle glow effects. No text or words in the image.'
    }
};

// Default image settings
const DEFAULT_SIZE = '1792x1024';  // Wide format for article headers
const DEFAULT_QUALITY = 'standard';
const DEFAULT_MODEL = 'dall-e-3';

/**
 * Generate an optimized DALL-E prompt from article content
 * Uses GPT-4o-mini to analyze article and create visual prompt
 */
async function generateImagePromptFromArticle(articleContent, options = {}) {
    const {
        style = 'professional',
        pillar = null,
        thesis = null,
        topic = null
    } = options;

    const styleConfig = IMAGE_STYLES[style] || IMAGE_STYLES.professional;

    // Truncate article to reasonable length for analysis
    const articleExcerpt = articleContent.substring(0, 3000);

    const systemPrompt = `You are an expert at creating DALL-E image prompts for thought leadership article headers.
Your prompts should:
1. Capture the essence and theme of the article visually
2. Be specific and detailed (50-100 words)
3. NEVER include any text, words, letters, or numbers in the image
4. Create visually striking compositions suitable for blog headers
5. Match the specified style guidelines

Return ONLY the image prompt, nothing else.`;

    const userPrompt = `Create a DALL-E image prompt for this thought leadership article header.

${topic ? `Topic: ${topic}` : ''}
${pillar ? `Content Pillar: ${pillar}` : ''}
${thesis ? `Author's Core Thesis: ${thesis}` : ''}

Article Excerpt:
${articleExcerpt}

Style Requirements: ${styleConfig.promptModifiers}

Generate a single, detailed image prompt that captures the article's main theme visually.`;

    try {
        const response = await openaiService.chat({
            message: userPrompt,
            systemPrompt: systemPrompt,
            model: 'gpt-4o-mini',
            maxTokens: 300
        });

        return response.content.trim();
    } catch (error) {
        logger.error('Error generating image prompt:', error);
        // Fallback to a generic prompt based on topic/pillar
        const fallbackTopic = topic || pillar || 'thought leadership';
        return `A ${styleConfig.promptModifiers} Visual representation of ${fallbackTopic}. Professional header image.`;
    }
}

/**
 * Download image from URL and return as buffer
 */
async function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle redirect
                downloadImage(response.headers.location)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

/**
 * Upload image to Supabase Storage
 * Returns permanent public URL
 */
async function uploadToSupabaseStorage(imageBuffer, filename, contentType = 'image/png') {
    const filePath = `articles/${filename}`;

    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageBuffer, {
            contentType,
            upsert: true  // Overwrite if exists
        });

    if (error) {
        logger.error('Supabase storage upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}

/**
 * Generate an article header image
 *
 * @param {string} articleContent - The article markdown content
 * @param {Object} options - Generation options
 * @param {string} options.style - Image style (professional, abstract, illustrative, minimalist, futuristic)
 * @param {string} options.size - Image size (1024x1024, 1792x1024, 1024x1792)
 * @param {string} options.quality - Image quality (standard, hd)
 * @param {string} options.pillar - Content pillar name
 * @param {string} options.thesis - Author's core thesis
 * @param {string} options.topic - Article topic
 * @param {string} options.calendarEntryId - Calendar entry ID for filename
 * @param {string} options.userId - User ID for database storage
 * @returns {Object} - { url, prompt, revisedPrompt, style, metadata }
 */
async function generateArticleImage(articleContent, options = {}) {
    const startTime = Date.now();

    const {
        style = 'professional',
        size = DEFAULT_SIZE,
        quality = DEFAULT_QUALITY,
        pillar = null,
        thesis = null,
        topic = null,
        calendarEntryId = null,
        userId = null
    } = options;

    const styleConfig = IMAGE_STYLES[style] || IMAGE_STYLES.professional;

    logger.info('[TL Image] Starting image generation', {
        style,
        size,
        quality,
        hasArticle: !!articleContent,
        calendarEntryId
    });

    try {
        // Step 1: Generate optimized prompt
        const imagePrompt = await generateImagePromptFromArticle(articleContent, {
            style,
            pillar,
            thesis,
            topic
        });

        logger.info('[TL Image] Generated prompt', { promptLength: imagePrompt.length });

        // Step 2: Generate image with DALL-E
        const dalleResult = await openaiService.generateImage(imagePrompt, {
            model: DEFAULT_MODEL,
            size,
            quality,
            style: styleConfig.dalleStyle
        });

        const dalleUrl = dalleResult.images[0].url;
        const revisedPrompt = dalleResult.images[0].revisedPrompt;

        logger.info('[TL Image] DALL-E generation complete');

        // Step 3: Download and upload to Supabase Storage
        const imageBuffer = await downloadImage(dalleUrl);

        // Generate unique filename
        const timestamp = Date.now();
        const entryPart = calendarEntryId ? calendarEntryId.substring(0, 8) : 'standalone';
        const filename = `${entryPart}-${style}-${timestamp}.png`;

        const permanentUrl = await uploadToSupabaseStorage(imageBuffer, filename);

        const generationTimeMs = Date.now() - startTime;

        logger.info('[TL Image] Upload complete', {
            generationTimeMs,
            filename
        });

        // Step 4: Save to database if userId provided
        if (userId && calendarEntryId) {
            await saveImageGeneration(userId, calendarEntryId, {
                prompt: imagePrompt,
                revisedPrompt,
                imageUrl: permanentUrl,
                dalleUrl,
                model: DEFAULT_MODEL,
                size,
                quality,
                style,
                generationTimeMs
            });
        }

        return {
            url: permanentUrl,
            prompt: imagePrompt,
            revisedPrompt,
            dalleUrl,  // Original URL (will expire)
            style,
            styleName: styleConfig.name,
            size,
            quality,
            model: DEFAULT_MODEL,
            generationTimeMs,
            metadata: {
                bucket: STORAGE_BUCKET,
                filename
            }
        };

    } catch (error) {
        logger.error('[TL Image] Generation failed:', error);
        throw error;
    }
}

/**
 * Save image generation to database
 */
async function saveImageGeneration(userId, calendarEntryId, data) {
    try {
        // Insert into image generations table
        const { error: insertError } = await supabase
            .from('tl_image_generations')
            .insert({
                user_id: userId,
                calendar_entry_id: calendarEntryId,
                prompt: data.prompt,
                revised_prompt: data.revisedPrompt,
                image_url: data.imageUrl,
                dalle_url: data.dalleUrl,
                model: data.model,
                size: data.size,
                quality: data.quality,
                style: data.style,
                generation_time_ms: data.generationTimeMs,
                is_current: true
            });

        if (insertError) {
            logger.error('[TL Image] Failed to save generation:', insertError);
            return;
        }

        // Update calendar entry with current image
        const { error: updateError } = await supabase
            .from('content_calendar_entries')
            .update({
                header_image_url: data.imageUrl,
                header_image_prompt: data.prompt,
                header_image_style: data.style,
                header_image_generated_at: new Date().toISOString()
            })
            .eq('id', calendarEntryId);

        if (updateError) {
            logger.error('[TL Image] Failed to update calendar entry:', updateError);
        }

    } catch (error) {
        logger.error('[TL Image] Database error:', error);
    }
}

/**
 * Get image generation history for a calendar entry
 */
async function getImageHistory(calendarEntryId) {
    const { data, error } = await supabase
        .from('tl_image_generations')
        .select('*')
        .eq('calendar_entry_id', calendarEntryId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('[TL Image] Failed to get history:', error);
        throw error;
    }

    return data;
}

/**
 * Get current image for a calendar entry
 */
async function getCurrentImage(calendarEntryId) {
    const { data, error } = await supabase
        .from('tl_image_generations')
        .select('*')
        .eq('calendar_entry_id', calendarEntryId)
        .eq('is_current', true)
        .single();

    if (error && error.code !== 'PGRST116') {  // Not found is OK
        logger.error('[TL Image] Failed to get current image:', error);
        throw error;
    }

    return data;
}

/**
 * Set a specific image as current
 */
async function setCurrentImage(calendarEntryId, imageId) {
    // First, unset all current flags
    await supabase
        .from('tl_image_generations')
        .update({ is_current: false })
        .eq('calendar_entry_id', calendarEntryId);

    // Set the specified image as current
    const { data, error } = await supabase
        .from('tl_image_generations')
        .update({ is_current: true })
        .eq('id', imageId)
        .select()
        .single();

    if (error) {
        logger.error('[TL Image] Failed to set current image:', error);
        throw error;
    }

    // Update calendar entry
    await supabase
        .from('content_calendar_entries')
        .update({
            header_image_url: data.image_url,
            header_image_prompt: data.prompt,
            header_image_style: data.style,
            header_image_generated_at: data.created_at
        })
        .eq('id', calendarEntryId);

    return data;
}

/**
 * Get available image styles
 */
function getImageStyles() {
    return Object.entries(IMAGE_STYLES).map(([key, config]) => ({
        id: key,
        name: config.name,
        description: config.description
    }));
}

/**
 * Ensure storage bucket exists
 * Call on service initialization
 */
async function ensureStorageBucket() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === STORAGE_BUCKET);

        if (!exists) {
            const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
                public: true,  // Images need to be publicly accessible
                fileSizeLimit: 10485760  // 10MB
            });

            if (error && !error.message.includes('already exists')) {
                logger.error('[TL Image] Failed to create bucket:', error);
            } else {
                logger.info('[TL Image] Created storage bucket:', STORAGE_BUCKET);
            }
        }
    } catch (error) {
        logger.error('[TL Image] Storage bucket check failed:', error);
    }
}

// Initialize storage bucket on load
ensureStorageBucket();

module.exports = {
    generateArticleImage,
    generateImagePromptFromArticle,
    getImageHistory,
    getCurrentImage,
    setCurrentImage,
    getImageStyles,
    uploadToSupabaseStorage,
    IMAGE_STYLES,
    STORAGE_BUCKET
};

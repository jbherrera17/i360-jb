/**
 * INSIGHT 360 - Audio Service
 * Version: 1.0.0
 *
 * Provides text-to-speech functionality using OpenAI's TTS API.
 * Used by Research Studio for generating audio overviews.
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const path = require('path');
const { randomUUID: uuidv4 } = require('crypto');

// Initialize clients
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

let openai = null;

/**
 * Initialize OpenAI client lazily
 */
function getOpenAI() {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

// =====================================================
// CONFIGURATION
// =====================================================

const TTS_CONFIG = {
    // Available voices
    voices: {
        alloy: { name: 'Alloy', description: 'Neutral, balanced' },
        echo: { name: 'Echo', description: 'Male, warm' },
        fable: { name: 'Fable', description: 'British, storytelling' },
        onyx: { name: 'Onyx', description: 'Deep, authoritative' },
        nova: { name: 'Nova', description: 'Female, friendly' },
        shimmer: { name: 'Shimmer', description: 'Female, clear' }
    },
    // Default settings
    defaultVoice: 'nova',
    defaultModel: 'tts-1',
    defaultFormat: 'mp3',
    // Constraints
    maxTextLength: 4096, // OpenAI TTS limit per request
    maxTotalLength: 25000, // Total script length before chunking
    storageBucket: 'studio-outputs'
};

// =====================================================
// CORE FUNCTIONS
// =====================================================

/**
 * Generate audio from text using OpenAI TTS
 * @param {string} text - Text to convert to speech
 * @param {object} options - TTS options
 * @returns {Promise<Buffer>} - Audio data buffer
 */
async function generateSpeech(text, options = {}) {
    const client = getOpenAI();

    if (!client) {
        throw new Error('OpenAI API key not configured. Audio generation requires OPENAI_API_KEY.');
    }

    const voice = options.voice || TTS_CONFIG.defaultVoice;
    const model = options.model || TTS_CONFIG.defaultModel;
    const format = options.format || TTS_CONFIG.defaultFormat;

    // Validate voice
    if (!TTS_CONFIG.voices[voice]) {
        throw new Error(`Invalid voice: ${voice}. Available: ${Object.keys(TTS_CONFIG.voices).join(', ')}`);
    }

    // Handle long text by chunking
    if (text.length > TTS_CONFIG.maxTextLength) {
        return generateLongSpeech(text, options);
    }

    const response = await client.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
        response_format: format
    });

    // Convert response to buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * Generate audio for long text by chunking and concatenating
 * @param {string} text - Long text to convert
 * @param {object} options - TTS options
 * @returns {Promise<Buffer>} - Combined audio buffer
 */
async function generateLongSpeech(text, options = {}) {
    const chunks = splitTextForTTS(text);
    const audioBuffers = [];

    console.log(`Generating audio for ${chunks.length} text chunks...`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

        const buffer = await generateSpeech(chunk, {
            ...options,
            // Override to prevent recursion
            _isChunk: true
        });

        audioBuffers.push(buffer);

        // Small delay to avoid rate limiting
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Concatenate audio buffers
    // Note: Simple concatenation works for MP3 but may have artifacts at boundaries
    // For production, consider using ffmpeg for proper concatenation
    return Buffer.concat(audioBuffers);
}

/**
 * Split text into TTS-friendly chunks
 * @param {string} text - Text to split
 * @returns {string[]} - Array of text chunks
 */
function splitTextForTTS(text) {
    const maxLength = TTS_CONFIG.maxTextLength - 100; // Buffer for safety
    const chunks = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const paragraph of paragraphs) {
        // If paragraph itself is too long, split by sentences
        if (paragraph.length > maxLength) {
            // Save current chunk
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            // Split long paragraph by sentences
            const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
            for (const sentence of sentences) {
                if ((currentChunk + sentence).length > maxLength) {
                    if (currentChunk.trim()) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = sentence;
                } else {
                    currentChunk += sentence;
                }
            }
        } else if ((currentChunk + '\n\n' + paragraph).length > maxLength) {
            // Save current chunk and start new one
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = paragraph;
        } else {
            // Add paragraph to current chunk
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Generate and store audio for a studio output
 * @param {string} studioId - Studio ID
 * @param {object} scriptContent - Script content from output generation
 * @param {object} options - Generation options
 * @returns {Promise<object>} - Audio file info
 */
async function generateStudioAudio(studioId, scriptContent, options = {}) {
    const script = scriptContent.script || scriptContent.text || '';

    if (!script) {
        throw new Error('No script content provided for audio generation');
    }

    if (script.length > TTS_CONFIG.maxTotalLength) {
        throw new Error(`Script too long (${script.length} chars). Maximum: ${TTS_CONFIG.maxTotalLength}`);
    }

    // Generate audio
    const audioBuffer = await generateSpeech(script, {
        voice: options.voice || TTS_CONFIG.defaultVoice,
        model: options.model || TTS_CONFIG.defaultModel
    });

    // Generate unique filename
    const filename = `audio_${studioId}_${uuidv4()}.mp3`;
    const filePath = `${studioId}/${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
        .from(TTS_CONFIG.storageBucket)
        .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error(`Failed to upload audio: ${error.message}`);
    }

    // Get signed URL for playback
    const { data: urlData } = await supabase.storage
        .from(TTS_CONFIG.storageBucket)
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 day expiry

    return {
        file_path: filePath,
        filename: filename,
        size_bytes: audioBuffer.length,
        duration_estimate: scriptContent.duration_estimate || estimateDuration(script),
        signed_url: urlData?.signedUrl,
        voice_used: options.voice || TTS_CONFIG.defaultVoice,
        model_used: options.model || TTS_CONFIG.defaultModel
    };
}

/**
 * Estimate audio duration from text length
 * Average speaking rate: ~150 words per minute
 * @param {string} text - Input text
 * @returns {string} - Duration estimate string
 */
function estimateDuration(text) {
    const words = text.split(/\s+/).length;
    const minutes = Math.ceil(words / 150);

    if (minutes < 1) {
        return 'Less than 1 minute';
    } else if (minutes === 1) {
        return '1 minute';
    } else {
        return `${minutes} minutes`;
    }
}

/**
 * Get download URL for stored audio
 * @param {string} filePath - Storage path
 * @returns {Promise<string>} - Signed download URL
 */
async function getAudioUrl(filePath) {
    const { data, error } = await supabase.storage
        .from(TTS_CONFIG.storageBucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
        throw new Error(`Failed to get audio URL: ${error.message}`);
    }

    return data.signedUrl;
}

/**
 * Delete audio file from storage
 * @param {string} filePath - Storage path
 * @returns {Promise<void>}
 */
async function deleteAudio(filePath) {
    const { error } = await supabase.storage
        .from(TTS_CONFIG.storageBucket)
        .remove([filePath]);

    if (error) {
        throw new Error(`Failed to delete audio: ${error.message}`);
    }
}

/**
 * List available voices
 * @returns {object} - Voice configurations
 */
function getAvailableVoices() {
    return TTS_CONFIG.voices;
}

/**
 * Check if audio service is available
 * @returns {boolean}
 */
function isAvailable() {
    return !!process.env.OPENAI_API_KEY;
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Core generation
    generateSpeech,
    generateLongSpeech,
    generateStudioAudio,

    // Storage operations
    getAudioUrl,
    deleteAudio,

    // Utilities
    splitTextForTTS,
    estimateDuration,
    getAvailableVoices,
    isAvailable,

    // Configuration
    TTS_CONFIG
};

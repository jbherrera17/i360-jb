/**
 * Voice Service - Phase 2 Fixed
 * 
 * Unified voice functionality using OpenAI audio models:
 * - Speech-to-Text (STT): gpt-4o-transcribe, gpt-4o-mini-transcribe
 * - Text-to-Speech (TTS): gpt-4o-mini-tts
 */

const openaiService = require('./openai');

// Available TTS voices
const TTS_VOICES = {
    alloy: { name: 'Alloy', description: 'Neutral and balanced' },
    echo: { name: 'Echo', description: 'Warm and conversational' },
    fable: { name: 'Fable', description: 'British and narrative' },
    onyx: { name: 'Onyx', description: 'Deep and authoritative' },
    nova: { name: 'Nova', description: 'Friendly and energetic' },
    shimmer: { name: 'Shimmer', description: 'Clear and expressive' }
};

// STT models
const STT_MODELS = {
    'gpt-4o-transcribe': {
        name: 'GPT-4o Transcribe',
        description: 'Most accurate - best for challenging audio'
    },
    'gpt-4o-mini-transcribe': {
        name: 'GPT-4o Mini Transcribe',
        description: 'Fast and affordable - good for clear audio'
    },
    'whisper-1': {
        name: 'Whisper',
        description: 'Legacy model - budget option'
    }
};

// TTS models
const TTS_MODELS = {
    'gpt-4o-mini-tts': {
        name: 'GPT-4o Mini TTS',
        description: 'Steerable - can control how to say it',
        supportsInstructions: true
    },
    'tts-1': {
        name: 'TTS-1',
        description: 'Standard quality - fast'
    },
    'tts-1-hd': {
        name: 'TTS-1 HD',
        description: 'High definition - slower but clearer'
    }
};

let isInitialized = false;

/**
 * Initialize voice service
 */
function initialize() {
    if (openaiService.isAvailable()) {
        isInitialized = true;
        console.log('✓ Voice Service initialized');
        return true;
    }
    console.warn('⚠ Voice Service requires OpenAI - not available');
    return false;
}

/**
 * Check if voice service is available
 */
function isAvailable() {
    return isInitialized && openaiService.isAvailable();
}

/**
 * Transcribe audio to text
 * @param {Buffer|File} audio - Audio data
 * @param {Object} options - Transcription options
 */
async function transcribe(audio, options = {}) {
    if (!isAvailable()) {
        throw new Error('Voice service not available');
    }
    
    const {
        model = 'gpt-4o-transcribe',
        language = null,
        prompt = null
    } = options;
    
    try {
        const result = await openaiService.transcribeAudio(audio, {
            model,
            language,
            prompt
        });
        
        return {
            text: result.text,
            model,
            modelName: STT_MODELS[model]?.name || model
        };
    } catch (error) {
        console.error('Transcription error:', error);
        throw new Error(`Transcription failed: ${error.message}`);
    }
}

/**
 * Convert text to speech
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 */
async function speak(text, options = {}) {
    if (!isAvailable()) {
        throw new Error('Voice service not available');
    }
    
    const {
        model = 'gpt-4o-mini-tts',
        voice = 'nova',
        speed = 1.0,
        instructions = null
    } = options;
    
    // Validate voice
    if (!TTS_VOICES[voice]) {
        throw new Error(`Invalid voice: ${voice}. Available: ${Object.keys(TTS_VOICES).join(', ')}`);
    }
    
    // Validate speed
    if (speed < 0.25 || speed > 4.0) {
        throw new Error('Speed must be between 0.25 and 4.0');
    }
    
    try {
        const result = await openaiService.textToSpeech(text, {
            model,
            voice,
            speed,
            instructions
        });
        
        return {
            audio: result.audio,
            model,
            modelName: TTS_MODELS[model]?.name || model,
            voice,
            voiceName: TTS_VOICES[voice]?.name || voice,
            contentType: 'audio/mpeg'
        };
    } catch (error) {
        console.error('TTS error:', error);
        throw new Error(`Text-to-speech failed: ${error.message}`);
    }
}

/**
 * Get available STT models
 */
function getSTTModels() {
    return Object.entries(STT_MODELS).map(([id, info]) => ({
        id,
        ...info
    }));
}

/**
 * Get available TTS models
 */
function getTTSModels() {
    return Object.entries(TTS_MODELS).map(([id, info]) => ({
        id,
        ...info
    }));
}

/**
 * Get available voices
 */
function getVoices() {
    return Object.entries(TTS_VOICES).map(([id, info]) => ({
        id,
        ...info
    }));
}

module.exports = {
    initialize,
    isAvailable,
    transcribe,
    speak,
    getSTTModels,
    getTTSModels,
    getVoices,
    TTS_VOICES,
    STT_MODELS,
    TTS_MODELS
};

/**
 * INSIGHT 360 - Source Processor Service
 * Version: 1.0.0
 *
 * Handles document processing, text extraction, and storage for Research Studio.
 * Extends fileProcessor with Supabase Storage integration and enhanced metadata extraction.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const axios = require('axios');
// Lazy-loaded to avoid jsdom ESM/require hang on Node.js 24
let JSDOM = null;
let Readability = null;

function loadJsdom() {
    if (!JSDOM) {
        JSDOM = require('jsdom').JSDOM;
    }
    if (!Readability) {
        Readability = require('@mozilla/readability').Readability;
    }
}

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Storage bucket name
const STORAGE_BUCKET = 'studio-sources';

// Supported file types
const SUPPORTED_TYPES = {
    'application/pdf': { type: 'pdf', maxSize: 50 * 1024 * 1024 }, // 50MB
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'docx', maxSize: 20 * 1024 * 1024 },
    'text/plain': { type: 'txt', maxSize: 10 * 1024 * 1024 },
    'text/markdown': { type: 'markdown', maxSize: 10 * 1024 * 1024 },
    'text/csv': { type: 'csv', maxSize: 20 * 1024 * 1024 }
};

/**
 * Initialize storage bucket (call on startup)
 */
async function initializeStorage() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

        if (!bucketExists) {
            const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
                public: false,
                fileSizeLimit: 50 * 1024 * 1024 // 50MB
            });

            if (error && !error.message.includes('already exists')) {
                console.error('Failed to create storage bucket:', error);
            } else {
                console.log(`Storage bucket '${STORAGE_BUCKET}' created`);
            }
        }

        // Also create outputs bucket
        const outputsBucket = 'studio-outputs';
        const outputsExists = buckets?.some(b => b.name === outputsBucket);
        if (!outputsExists) {
            await supabase.storage.createBucket(outputsBucket, {
                public: false,
                fileSizeLimit: 100 * 1024 * 1024 // 100MB for audio
            });
        }
    } catch (error) {
        console.error('Storage initialization error:', error);
    }
}

/**
 * Check if file type is supported
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
function isSupported(mimeType) {
    return mimeType in SUPPORTED_TYPES;
}

/**
 * Process and upload a source file
 * @param {object} file - Multer file object
 * @param {string} studioId - Studio ID
 * @returns {Promise<object>} - Processed source data
 */
async function processSourceFile(file, studioId) {
    const { buffer, mimetype, originalname, size } = file;

    // Validate file type
    if (!isSupported(mimetype)) {
        throw new Error(`Unsupported file type: ${mimetype}. Supported: PDF, DOCX, TXT, MD, CSV`);
    }

    // Validate file size
    const maxSize = SUPPORTED_TYPES[mimetype].maxSize;
    if (size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024);
        throw new Error(`File too large. Maximum size for ${SUPPORTED_TYPES[mimetype].type} is ${maxMB}MB`);
    }

    // Generate storage path
    const fileId = uuidv4();
    const ext = getExtension(mimetype);
    const storagePath = `${studioId}/${fileId}${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
            contentType: mimetype,
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Extract text content
    const { text, metadata } = await extractContent(buffer, mimetype, originalname);

    return {
        title: originalname.replace(/\.[^/.]+$/, ''), // Remove extension for title
        source_type: SUPPORTED_TYPES[mimetype].type,
        content: text,
        file_path: storagePath,
        file_name: originalname,
        file_size: size,
        mime_type: mimetype,
        metadata: {
            ...metadata,
            uploaded_at: new Date().toISOString()
        }
    };
}

/**
 * Extract content from file buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - MIME type
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - Extracted text and metadata
 */
async function extractContent(buffer, mimeType, filename) {
    let text = '';
    let metadata = {};

    try {
        switch (mimeType) {
            case 'application/pdf':
                const pdfResult = await extractPdfContent(buffer);
                text = pdfResult.text;
                metadata = pdfResult.metadata;
                break;

            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxResult = await extractDocxContent(buffer);
                text = docxResult.text;
                metadata = docxResult.metadata;
                break;

            case 'text/plain':
            case 'text/markdown':
            case 'text/csv':
                text = buffer.toString('utf-8');
                metadata = {
                    encoding: 'utf-8'
                };
                break;

            default:
                throw new Error(`No extractor for type: ${mimeType}`);
        }

        // Add common metadata
        metadata.character_count = text.length;
        metadata.word_count = countWords(text);
        metadata.line_count = text.split('\n').length;

    } catch (error) {
        console.error(`Content extraction error for ${filename}:`, error);
        throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
    }

    return { text: text.trim(), metadata };
}

/**
 * Extract content from PDF
 * @param {Buffer} buffer - PDF buffer
 * @returns {Promise<object>} - Text and metadata
 */
async function extractPdfContent(buffer) {
    const data = await pdfParse(buffer);

    return {
        text: data.text,
        metadata: {
            page_count: data.numpages,
            pdf_version: data.info?.PDFFormatVersion,
            title: data.info?.Title,
            author: data.info?.Author,
            subject: data.info?.Subject,
            creator: data.info?.Creator,
            creation_date: data.info?.CreationDate
        }
    };
}

/**
 * Extract content from DOCX
 * @param {Buffer} buffer - DOCX buffer
 * @returns {Promise<object>} - Text and metadata
 */
async function extractDocxContent(buffer) {
    const result = await mammoth.extractRawText({ buffer });

    // Try to extract metadata using mammoth's convertToHtml for structure
    let metadata = {};
    try {
        const htmlResult = await mammoth.convertToHtml({ buffer });
        const paragraphCount = (htmlResult.value.match(/<p>/g) || []).length;
        metadata.paragraph_count = paragraphCount;
    } catch (e) {
        // Ignore metadata extraction errors
    }

    return {
        text: result.value,
        metadata
    };
}

/**
 * Process a URL source
 * @param {string} url - URL to fetch
 * @param {string} studioId - Studio ID
 * @returns {Promise<object>} - Processed source data
 */
async function processUrlSource(url, studioId) {
    // Validate URL
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (e) {
        throw new Error('Invalid URL format');
    }

    // Fetch content
    let response;
    try {
        response = await axios.get(url, {
            timeout: 30000,
            maxContentLength: 10 * 1024 * 1024, // 10MB limit
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Insight360Bot/1.0)'
            }
        });
    } catch (error) {
        throw new Error(`Failed to fetch URL: ${error.message}`);
    }

    const contentType = response.headers['content-type'] || '';
    let text = '';
    let title = parsedUrl.hostname + parsedUrl.pathname;
    let metadata = {
        url,
        fetched_at: new Date().toISOString()
    };

    if (contentType.includes('text/html')) {
        // Parse HTML and extract article content
        loadJsdom();
        const dom = new JSDOM(response.data, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (article) {
            text = article.textContent;
            title = article.title || title;
            metadata.excerpt = article.excerpt;
            metadata.byline = article.byline;
            metadata.site_name = article.siteName;
        } else {
            // Fallback: extract text from body
            text = dom.window.document.body?.textContent || '';
        }
    } else if (contentType.includes('text/plain')) {
        text = response.data;
    } else if (contentType.includes('application/json')) {
        text = JSON.stringify(response.data, null, 2);
        title = `JSON from ${parsedUrl.hostname}`;
    } else {
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();

    metadata.character_count = text.length;
    metadata.word_count = countWords(text);

    return {
        title,
        source_type: 'url',
        content: text,
        url,
        metadata
    };
}

/**
 * Process plain text input
 * @param {string} text - Text content
 * @param {string} title - Source title
 * @returns {object} - Processed source data
 */
function processTextSource(text, title) {
    return {
        title: title || 'Text Note',
        source_type: 'text',
        content: text.trim(),
        metadata: {
            character_count: text.length,
            word_count: countWords(text),
            created_at: new Date().toISOString()
        }
    };
}

/**
 * Get download URL for a stored file
 * @param {string} filePath - Storage path
 * @param {number} [expiresIn] - Expiration in seconds (default 1 hour)
 * @returns {Promise<string>} - Signed download URL
 */
async function getDownloadUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, expiresIn);

    if (error) {
        throw new Error(`Failed to create download URL: ${error.message}`);
    }

    return data.signedUrl;
}

/**
 * Delete a file from storage
 * @param {string} filePath - Storage path
 * @returns {Promise<void>}
 */
async function deleteFile(filePath) {
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

    if (error) {
        console.error(`Failed to delete file ${filePath}:`, error);
    }
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} - File extension
 */
function getExtension(mimeType) {
    const extensions = {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
        'text/markdown': '.md',
        'text/csv': '.csv'
    };
    return extensions[mimeType] || '.bin';
}

/**
 * Count words in text
 * @param {string} text - Text to count
 * @returns {number} - Word count
 */
function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Validate file before processing
 * @param {object} file - Multer file object
 * @returns {object} - Validation result
 */
function validateFile(file) {
    const errors = [];

    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    if (!isSupported(file.mimetype)) {
        errors.push(`Unsupported file type: ${file.mimetype}`);
    }

    const typeConfig = SUPPORTED_TYPES[file.mimetype];
    if (typeConfig && file.size > typeConfig.maxSize) {
        const maxMB = Math.round(typeConfig.maxSize / 1024 / 1024);
        errors.push(`File too large. Maximum size is ${maxMB}MB`);
    }

    return {
        valid: errors.length === 0,
        errors,
        fileType: typeConfig?.type,
        fileSize: file.size
    };
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    initializeStorage,
    isSupported,
    processSourceFile,
    processUrlSource,
    processTextSource,
    extractContent,
    getDownloadUrl,
    deleteFile,
    validateFile,
    SUPPORTED_TYPES,
    STORAGE_BUCKET
};

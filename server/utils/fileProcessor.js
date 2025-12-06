/**
 * File Processor Utility - Phase 2 Fixed
 * 
 * Handles document and image processing for chat
 */

const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

// Supported file types
const SUPPORTED_TYPES = {
    // Images
    'image/jpeg': { type: 'image', ext: '.jpg' },
    'image/png': { type: 'image', ext: '.png' },
    'image/gif': { type: 'image', ext: '.gif' },
    'image/webp': { type: 'image', ext: '.webp' },
    // Documents
    'application/pdf': { type: 'document', ext: '.pdf' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'document', ext: '.docx' },
    'text/plain': { type: 'document', ext: '.txt' },
    'text/markdown': { type: 'document', ext: '.md' },
    'text/csv': { type: 'document', ext: '.csv' }
};

/**
 * Check if a file type is supported
 */
function isSupported(mimeType) {
    return mimeType in SUPPORTED_TYPES;
}

/**
 * Get file type category (image or document)
 */
function getFileCategory(mimeType) {
    return SUPPORTED_TYPES[mimeType]?.type || 'unknown';
}

/**
 * Process an uploaded file
 */
async function processFile(file) {
    const { buffer, mimetype, originalname } = file;
    
    if (!isSupported(mimetype)) {
        throw new Error(`Unsupported file type: ${mimetype}`);
    }
    
    const category = getFileCategory(mimetype);
    
    if (category === 'image') {
        return processImage(buffer, mimetype, originalname);
    } else if (category === 'document') {
        return processDocument(buffer, mimetype, originalname);
    }
    
    throw new Error(`Unknown file category: ${category}`);
}

/**
 * Process an image file
 */
function processImage(buffer, mimeType, filename) {
    const base64 = buffer.toString('base64');
    
    return {
        type: 'image',
        filename,
        mediaType: mimeType,
        data: base64,
        size: buffer.length
    };
}

/**
 * Process a document file
 */
async function processDocument(buffer, mimeType, filename) {
    let text = '';
    
    try {
        switch (mimeType) {
            case 'application/pdf':
                text = await extractPdfText(buffer);
                break;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                text = await extractDocxText(buffer);
                break;
            case 'text/plain':
            case 'text/markdown':
            case 'text/csv':
                text = buffer.toString('utf-8');
                break;
            default:
                throw new Error(`No extractor for type: ${mimeType}`);
        }
    } catch (error) {
        console.error('Document extraction error:', error);
        throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
    }
    
    return {
        type: 'document',
        filename,
        mediaType: mimeType,
        text: text.trim(),
        characterCount: text.length,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length
    };
}

/**
 * Extract text from PDF
 */
async function extractPdfText(buffer) {
    const data = await pdfParse(buffer);
    return data.text;
}

/**
 * Extract text from DOCX
 */
async function extractDocxText(buffer) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

/**
 * Validate file size
 */
function validateFileSize(file, maxSizeMB = 20) {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new Error(`File too large. Maximum size is ${maxSizeMB}MB`);
    }
    return true;
}

/**
 * Get file info summary
 */
function getFileInfo(file) {
    const category = getFileCategory(file.mimetype);
    return {
        name: file.originalname,
        type: file.mimetype,
        category,
        size: file.size,
        sizeFormatted: formatBytes(file.size)
    };
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a temporary file and return its path
 */
async function createTempFile(buffer, extension) {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const filename = `upload_${Date.now()}${extension}`;
    const filepath = path.join(tempDir, filename);
    
    await fs.writeFile(filepath, buffer);
    
    return {
        path: filepath,
        cleanup: async () => {
            try {
                await fs.unlink(filepath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    };
}

module.exports = {
    isSupported,
    getFileCategory,
    processFile,
    processImage,
    processDocument,
    validateFileSize,
    getFileInfo,
    createTempFile,
    SUPPORTED_TYPES
};

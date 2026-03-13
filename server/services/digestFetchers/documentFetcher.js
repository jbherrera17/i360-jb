/**
 * INSIGHT 360 - Document Fetcher
 * Processes uploaded documents (PDF, DOCX, TXT) for digest ingestion.
 * Reuses sourceProcessor patterns for extraction.
 */

const { createClient } = require('@supabase/supabase-js');
const { randomUUID: uuidv4 } = require('crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const STORAGE_BUCKET = 'digest-sources';

/**
 * Initialize storage bucket for digest documents
 */
async function initializeStorage() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === STORAGE_BUCKET);
        if (!exists) {
            await supabase.storage.createBucket(STORAGE_BUCKET, {
                public: false,
                fileSizeLimit: 50 * 1024 * 1024
            });
            console.log(`[DigestDoc] Storage bucket '${STORAGE_BUCKET}' created`);
        }
    } catch (error) {
        console.error('[DigestDoc] Storage init error:', error.message);
    }
}

/**
 * Process an uploaded file and create a source item
 * @param {object} file - Multer file object {buffer, mimetype, originalname, size}
 * @param {object} source - digest_sources row
 * @returns {object} - Processed item data
 */
async function processUpload(file, source) {
    const { buffer, mimetype, originalname, size } = file;

    // Extract text
    let text = '';
    let metadata = {};

    if (mimetype === 'application/pdf') {
        const result = await pdfParse(buffer);
        text = result.text;
        metadata = { pages: result.numpages, info: result.info };
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
    } else if (mimetype === 'text/plain' || mimetype === 'text/markdown' || mimetype === 'text/csv') {
        text = buffer.toString('utf-8');
    } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
    }

    // Upload to storage
    const fileId = uuidv4();
    const ext = getExtension(mimetype);
    const storagePath = `${source.org_id}/${source.id}/${fileId}${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
            contentType: mimetype,
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    return {
        external_id: `doc-${fileId}`,
        title: originalname.replace(/\.[^/.]+$/, ''),
        raw_content: text.substring(0, 100000),
        file_path: storagePath,
        file_size: size,
        mime_type: mimetype,
        metadata: {
            ...metadata,
            original_name: originalname,
            word_count: text.split(/\s+/).filter(Boolean).length
        }
    };
}

function getExtension(mimetype) {
    const map = {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
        'text/markdown': '.md',
        'text/csv': '.csv'
    };
    return map[mimetype] || '';
}

module.exports = { processUpload, initializeStorage };

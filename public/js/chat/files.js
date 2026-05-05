/* chat files — attachment selection, multimodal payload building */
/**
 * Handle file selection
 */
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    attachedFiles = files;
    
    if (!filePreview) return;
    
    if (files.length > 0) {
        filePreview.classList.remove('hidden');
        filePreview.innerHTML = files.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <button onclick="removeFile('${file.name}')">&times;</button>
            </div>
        `).join('');
    } else {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    }
}

/**
 * Remove attached file
 */
function removeFile(filename) {
    attachedFiles = attachedFiles.filter(f => f.name !== filename);
    if (fileInput) fileInput.value = '';

    if (!filePreview) return;

    if (attachedFiles.length === 0) {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    } else {
        filePreview.innerHTML = attachedFiles.map(file => `
            <div class="file-item">
                <span>${file.name}</span>
                <button onclick="removeFile('${file.name}')">&times;</button>
            </div>
        `).join('');
    }
}

/**
 * Clear all attached files
 */
function clearAttachedFiles() {
    attachedFiles = [];
    if (fileInput) fileInput.value = '';
    if (filePreview) {
        filePreview.classList.add('hidden');
        filePreview.innerHTML = '';
    }
}

/**
 * Process attached files for API submission
 * Converts files to base64 and extracts metadata
 * @param {File[]} files - Array of File objects
 * @returns {Promise<Array>} Processed file data
 */
async function processAttachedFiles(files) {
    const processed = [];

    for (const file of files) {
        try {
            const base64 = await fileToBase64(file);
            const fileType = getFileType(file);

            processed.push({
                name: file.name,
                type: file.type,
                fileType: fileType,
                size: file.size,
                data: base64
            });
        } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
        }
    }

    return processed;
}

/**
 * Convert file to base64 string
 * @param {File} file - File object
 * @returns {Promise<string>} Base64 encoded string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix (e.g., "data:image/png;base64,")
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Determine file type category
 * @param {File} file - File object
 * @returns {string} File type category
 */
function getFileType(file) {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.includes('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
    if (name.endsWith('.csv')) return 'csv';
    if (type.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'document';

    return 'file';
}

/**
 * Build multimodal content array for Claude API
 * @param {string} text - User's text message
 * @param {Array} files - Processed file data
 * @returns {Array} Content array for API
 */
function buildMultimodalContent(text, files) {
    const content = [];

    // Add files first
    for (const file of files) {
        if (file.fileType === 'image') {
            // Images go as image blocks
            content.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: file.type,
                    data: file.data
                }
            });
        } else if (file.fileType === 'pdf') {
            // PDFs go as document blocks (Claude supports this)
            content.push({
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: file.data
                }
            });
        } else if (file.fileType === 'text' || file.fileType === 'csv') {
            // Text files: decode base64 and include as text
            try {
                const textContent = atob(file.data);
                content.push({
                    type: 'text',
                    text: `[File: ${file.name}]\n\n${textContent}`
                });
            } catch (e) {
                content.push({
                    type: 'text',
                    text: `[File: ${file.name}] (Could not decode content)`
                });
            }
        } else {
            // Other files: note them but can't process directly
            content.push({
                type: 'text',
                text: `[Attached file: ${file.name} (${file.type || 'unknown type'})]`
            });
        }
    }

    // Add user's text message
    content.push({
        type: 'text',
        text: text
    });

    return content;
}


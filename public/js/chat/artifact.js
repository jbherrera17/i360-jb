/* chat artifact — modal injection, multi-format export, context-asset/snippet save
 * (duplicate escapeHtml at orig 3498-3502 removed; downloadBlob moved to utils) */

// ============================================
// ARTIFACT CREATION SYSTEM
// ============================================

// Create and append artifact modal to body
const artifactModalHtml = `
<div id="artifactModal" class="artifact-modal">
    <div class="artifact-modal-content">
        <div class="artifact-modal-header">
            <h3>Artifacts and Assets</h3>
            <button class="artifact-modal-close" onclick="closeArtifactModal()">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div class="artifact-options">
            <div class="artifact-section-label">Create Artifact</div>
            <div class="artifact-name-section">
                <label class="artifact-name-label" for="artifactNameInput">Export Name:</label>
                <input type="text" id="artifactNameInput" class="artifact-name-input" placeholder="Enter file name...">
            </div>
            <div class="artifact-option" onclick="exportAsDocument('markdown')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-text"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Markdown</div>
                    <div class="artifact-option-desc">Download as .md file for docs or notes</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('pdf')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-type"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as PDF</div>
                    <div class="artifact-option-desc">Download as formatted PDF document</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('docx')">
                <div class="artifact-option-icon">
                    <i data-lucide="file-text"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Word</div>
                    <div class="artifact-option-desc">Download as .docx for Microsoft Word</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="exportAsDocument('xlsx')">
                <div class="artifact-option-icon">
                    <i data-lucide="table"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Export as Excel</div>
                    <div class="artifact-option-desc">Download tables as .xlsx spreadsheet</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>

            <div class="artifact-section-label artifact-section-divider">Create Asset</div>

            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('skill')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="wand-2"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Skill</div>
                    <div class="artifact-option-desc">Transform into a reusable workflow skill</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('voice_dna')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="mic"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Voice DNA</div>
                    <div class="artifact-option-desc">Extract brand voice & writing style</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('icp')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="users"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create ICP</div>
                    <div class="artifact-option-desc">Build an ideal customer profile</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
            <div class="artifact-option" onclick="ChatAssetCreator.createFromArtifact('agent')">
                <div class="artifact-option-icon" style="color: var(--primary);">
                    <i data-lucide="bot"></i>
                </div>
                <div class="artifact-option-content">
                    <div class="artifact-option-title">Create Agent</div>
                    <div class="artifact-option-desc">Create an AI agent with role & capabilities</div>
                </div>
                <div class="artifact-option-arrow">
                    <i data-lucide="chevron-right"></i>
                </div>
            </div>
        </div>
    </div>
</div>
`;

// Inject modal into DOM when script loads
document.addEventListener('DOMContentLoaded', function() {
    document.body.insertAdjacentHTML('beforeend', artifactModalHtml);
    lucide.createIcons();
});

// Store reference to current artifact content
let currentArtifactContent = '';
let currentArtifactHtmlContent = ''; // HTML content for PDF export
let currentArtifactMessageEl = null;
let currentArtifactName = '';

/**
 * Open artifact modal for a message
 */
function openArtifactModal(button) {
    const messageDiv = button.closest('.message');
    const contentDiv = messageDiv.querySelector('.message-content');

    if (!contentDiv) return;

    // Use stored raw markdown if available, otherwise fall back to innerText
    currentArtifactContent = contentDiv.dataset.rawContent || contentDiv.innerText;
    currentArtifactHtmlContent = contentDiv.innerHTML; // Store HTML for PDF export
    currentArtifactMessageEl = messageDiv;

    // Auto-generate a default name from the first heading or first meaningful line
    currentArtifactName = generateArtifactName(currentArtifactContent);

    const modal = document.getElementById('artifactModal');
    if (modal) {
        const nameInput = document.getElementById('artifactNameInput');
        if (nameInput) {
            nameInput.value = currentArtifactName;
            // Sync name on user edit
            nameInput.oninput = () => { currentArtifactName = nameInput.value.trim(); };
        }
        modal.classList.add('active');
        lucide.createIcons();
    }
}

/**
 * Generate a default artifact name from message content
 */
function generateArtifactName(content) {
    if (!content) return '';

    // Try to find the first markdown heading
    const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim().substring(0, 80);
    }

    // Fall back to first non-empty line, cleaned up
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
        // Remove markdown formatting
        let name = lines[0].replace(/^[#*_>\-`]+\s*/, '').trim();
        if (name.length > 80) name = name.substring(0, 77) + '...';
        return name;
    }

    return '';
}

/**
 * Close artifact modal
 */
function closeArtifactModal() {
    const modal = document.getElementById('artifactModal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentArtifactContent = '';
    currentArtifactHtmlContent = '';
    currentArtifactMessageEl = null;
    currentArtifactName = '';
}

// Close modal on outside click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('artifactModal');
    if (modal && e.target === modal) {
        closeArtifactModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeArtifactModal();
    }
});

/**
 * Export message as document
 */
async function exportAsDocument(format) {
    if (!currentArtifactContent) {
        alert('No content to export');
        return;
    }

    // Read the latest name from the input (user may have edited it)
    const nameInput = document.getElementById('artifactNameInput');
    if (nameInput) currentArtifactName = nameInput.value.trim();

    const timestamp = new Date().toISOString().slice(0, 10);
    const _exportName = (typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName().toLowerCase().replace(/\s+/g, '-') : 'higgins';

    // Use artifact name for filename if provided, otherwise fall back to default
    let filename;
    if (currentArtifactName) {
        filename = currentArtifactName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
    } else {
        filename = `${_exportName}-response-${timestamp}`;
    }

    try {
        if (format === 'markdown') {
            // Download as Markdown
            const blob = new Blob([currentArtifactContent], { type: 'text/markdown' });
            downloadBlob(blob, `${filename}.md`);
        } else if (format === 'pdf') {
            // For PDF, use professional HTML template with print styles
            const printWindow = window.open('', '_blank');
            // Use HTML content directly (preserves tables, formatting) or fallback to markdown parsing
            const formattedContent = currentArtifactHtmlContent
                ? cleanHtmlForPrint(currentArtifactHtmlContent)
                : formatContentForPrint(currentArtifactContent);
            const dateStr = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${currentArtifactName || 'Insight 360 - AI Response'}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                        * {
                            box-sizing: border-box;
                        }

                        @page {
                            size: letter;
                            margin: 1in 0.75in;
                        }

                        body {
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            font-size: 11pt;
                            line-height: 1.7;
                            color: #1a1a2e;
                            max-width: 100%;
                            margin: 0;
                            padding: 0;
                            background: #fff;
                        }

                        .document {
                            max-width: 7.5in;
                            margin: 0 auto;
                            padding: 0;
                        }

                        /* Header */
                        .document-header {
                            border-bottom: 3px solid #6366f1;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }

                        .document-header h1 {
                            font-size: 24pt;
                            font-weight: 700;
                            color: #1a1a2e;
                            margin: 0 0 8px 0;
                            letter-spacing: -0.5px;
                        }

                        .document-meta {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            color: #64748b;
                            font-size: 9pt;
                        }

                        .document-meta .brand {
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-weight: 500;
                        }

                        .document-meta .brand-icon {
                            width: 20px;
                            height: 20px;
                            background: linear-gradient(135deg, #6366f1, #8b5cf6);
                            border-radius: 4px;
                        }

                        /* Content Styling */
                        .document-content {
                            font-size: 11pt;
                        }

                        .document-content p {
                            margin: 0 0 14px 0;
                            text-align: justify;
                        }

                        .document-content h1 {
                            font-size: 18pt;
                            font-weight: 700;
                            color: #1a1a2e;
                            margin: 28px 0 14px 0;
                            padding-bottom: 8px;
                            border-bottom: 2px solid #e2e8f0;
                        }

                        .document-content h2 {
                            font-size: 14pt;
                            font-weight: 600;
                            color: #334155;
                            margin: 24px 0 12px 0;
                        }

                        .document-content h3 {
                            font-size: 12pt;
                            font-weight: 600;
                            color: #475569;
                            margin: 20px 0 10px 0;
                        }

                        .document-content h4 {
                            font-size: 11pt;
                            font-weight: 600;
                            color: #64748b;
                            margin: 16px 0 8px 0;
                        }

                        /* Lists */
                        .document-content ul,
                        .document-content ol {
                            margin: 12px 0;
                            padding-left: 24px;
                        }

                        .document-content li {
                            margin: 6px 0;
                        }

                        /* Code Blocks */
                        .document-content pre {
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-left: 4px solid #6366f1;
                            border-radius: 6px;
                            padding: 16px;
                            margin: 16px 0;
                            overflow-x: auto;
                            font-family: var(--font-mono);
                            font-size: 9pt;
                            line-height: 1.5;
                        }

                        .document-content code {
                            font-family: var(--font-mono);
                            background: #f1f5f9;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 9pt;
                            color: #6366f1;
                        }

                        .document-content pre code {
                            background: transparent;
                            padding: 0;
                            color: inherit;
                        }

                        /* Blockquotes */
                        .document-content blockquote {
                            border-left: 4px solid #6366f1;
                            background: #f8fafc;
                            margin: 16px 0;
                            padding: 12px 16px;
                            font-style: italic;
                            color: #475569;
                        }

                        /* Tables */
                        .document-content table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 16px 0;
                            font-size: 10pt;
                        }

                        .document-content th,
                        .document-content td {
                            border: 1px solid #e2e8f0;
                            padding: 10px 12px;
                            text-align: left;
                        }

                        .document-content th {
                            background: #f8fafc;
                            font-weight: 600;
                            color: #334155;
                        }

                        .document-content tr:nth-child(even) td {
                            background: #fafafa;
                        }

                        /* Horizontal Rule */
                        .document-content hr {
                            border: none;
                            border-top: 1px solid #e2e8f0;
                            margin: 24px 0;
                        }

                        /* Strong/Bold */
                        .document-content strong {
                            font-weight: 600;
                            color: #1a1a2e;
                        }

                        /* Footer */
                        .document-footer {
                            margin-top: 40px;
                            padding-top: 16px;
                            border-top: 1px solid #e2e8f0;
                            font-size: 8pt;
                            color: #94a3b8;
                            text-align: center;
                        }

                        /* Print-specific */
                        @media print {
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }

                            .document-header {
                                page-break-after: avoid;
                            }

                            .document-content h1,
                            .document-content h2,
                            .document-content h3 {
                                page-break-after: avoid;
                            }

                            .document-content pre,
                            .document-content table {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="document">
                        <div class="document-header">
                            <h1>${currentArtifactName || 'AI-Generated Response'}</h1>
                            <div class="document-meta">
                                <div class="brand">
                                    <div class="brand-icon"></div>
                                    <span>${(typeof BrandingService !== 'undefined') ? BrandingService.getAppName() : 'Insight 360'} | ${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} AI Assistant</span>
                                </div>
                                <div class="date">${dateStr}</div>
                            </div>
                        </div>
                        <div class="document-content">
                            ${formattedContent}
                        </div>
                        <div class="document-footer">
                            Generated by Insight 360 &bull; Powered by AI &bull; For internal use
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();

            // Wait for fonts to load before printing
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } else if (format === 'docx') {
            // For DOCX, create a simple HTML-based download that Word can open
            const htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
                <head><meta charset='utf-8'><title>${currentArtifactName || ((typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins') + ' Response'}</title></head>
                <body style="font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.5;">
                <h1>${currentArtifactName || ((typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins') + ' Response'}</h1>
                <p><small>Generated: ${new Date().toLocaleString()}</small></p>
                <hr>
                ${formatContentForPrint(currentArtifactContent)}
                </body></html>
            `;
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            downloadBlob(blob, `${filename}.doc`);
        } else if (format === 'xlsx') {
            // Export tables as Excel spreadsheet using SheetJS
            if (typeof XLSX === 'undefined') {
                alert('Excel export library not loaded. Please refresh the page and try again.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            const htmlContent = currentArtifactHtmlContent || formatContentForPrint(currentArtifactContent);

            // Parse HTML to find tables
            const temp = document.createElement('div');
            temp.innerHTML = htmlContent;
            const tables = temp.querySelectorAll('table');

            if (tables.length === 0) {
                // No HTML tables found — try parsing markdown tables from raw content
                const mdTables = extractMarkdownTables(currentArtifactContent);
                if (mdTables.length === 0) {
                    alert('No tables found in this response. Excel export works best with tabular data.');
                    return;
                }
                mdTables.forEach((table, i) => {
                    const ws = XLSX.utils.aoa_to_sheet(table.rows);
                    // Auto-size columns
                    ws['!cols'] = table.rows[0].map((_, colIdx) => ({
                        wch: Math.max(...table.rows.map(row => (row[colIdx] || '').toString().length), 10)
                    }));
                    const sheetName = table.title || `Sheet${i + 1}`;
                    XLSX.utils.book_append_sheet(workbook, ws, sheetName.slice(0, 31));
                });
            } else {
                tables.forEach((table, i) => {
                    const ws = XLSX.utils.table_to_sheet(table);
                    // Auto-size columns based on content
                    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                    const cols = [];
                    for (let c = range.s.c; c <= range.e.c; c++) {
                        let maxLen = 10;
                        for (let r = range.s.r; r <= range.e.r; r++) {
                            const cell = ws[XLSX.utils.encode_cell({ r, c })];
                            if (cell && cell.v) maxLen = Math.max(maxLen, cell.v.toString().length);
                        }
                        cols.push({ wch: Math.min(maxLen + 2, 50) });
                    }
                    ws['!cols'] = cols;
                    const sheetName = `Sheet${i + 1}`;
                    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
                });
            }

            // Also add a full text sheet with the complete response
            const textWs = XLSX.utils.aoa_to_sheet([
                [currentArtifactName || `${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} AI Response`],
                [`Generated: ${new Date().toLocaleString()}`],
                [''],
                ...currentArtifactContent.split('\n').map(line => [line])
            ]);
            textWs['!cols'] = [{ wch: 100 }];
            XLSX.utils.book_append_sheet(workbook, textWs, 'Full Response');

            XLSX.writeFile(workbook, `${filename}.xlsx`);
        }

        closeArtifactModal();
        setStatus(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export: ' + error.message);
    }
}

/**
 * Format content for print/export
 * Converts markdown-style content to properly formatted HTML
 */
function formatContentForPrint(text) {
    // First, handle code blocks to protect them from other transformations
    const codeBlocks = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
        codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`);
        return placeholder;
    });

    // Handle markdown tables
    const tables = [];
    text = text.replace(/^(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm, (match, headerRow, separatorRow, bodyRows) => {
        const placeholder = `__TABLE_${tables.length}__`;

        // Parse header
        const headers = headerRow.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim());

        // Parse alignment from separator row
        const alignments = separatorRow.split('|').filter(cell => cell.trim() !== '').map(cell => {
            const trimmed = cell.trim();
            if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
            if (trimmed.endsWith(':')) return 'right';
            return 'left';
        });

        // Parse body rows
        const rows = bodyRows.trim().split('\n').map(row =>
            row.split('|').filter(cell => cell.trim() !== '').map(cell => cell.trim())
        );

        // Build HTML table
        let tableHtml = '<table>\n<thead>\n<tr>\n';
        headers.forEach((header, i) => {
            const align = alignments[i] || 'left';
            tableHtml += `<th style="text-align: ${align}">${header}</th>\n`;
        });
        tableHtml += '</tr>\n</thead>\n<tbody>\n';

        rows.forEach(row => {
            tableHtml += '<tr>\n';
            row.forEach((cell, i) => {
                const align = alignments[i] || 'left';
                tableHtml += `<td style="text-align: ${align}">${cell}</td>\n`;
            });
            tableHtml += '</tr>\n';
        });

        tableHtml += '</tbody>\n</table>';
        tables.push(tableHtml);
        return placeholder;
    });

    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle headers (must be at start of line)
    text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Handle horizontal rules (but not table separators which we've already processed)
    text = text.replace(/^---+$/gm, '<hr>');
    text = text.replace(/^\*\*\*+$/gm, '<hr>');

    // Handle bold and italic
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Handle unordered lists (detect contiguous list items)
    text = text.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');

    // Handle numbered lists
    text = text.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> items in <ul> or <ol>
    text = text.replace(/(<li>.*?<\/li>\n?)+/gs, (match) => {
        return '<ul>' + match + '</ul>';
    });

    // Handle blockquotes
    text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    text = text.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // Handle paragraphs - split by double newlines
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs.map(p => {
        p = p.trim();
        // Don't wrap if already wrapped in block element or is a placeholder
        if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') ||
            p.startsWith('<pre') || p.startsWith('<blockquote') || p.startsWith('<hr') ||
            p.startsWith('__CODE_BLOCK_') || p.startsWith('__TABLE_')) {
            return p;
        }
        // Convert single newlines to <br> within paragraphs
        p = p.replace(/\n/g, '<br>');
        return `<p>${p}</p>`;
    }).join('\n');

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
        text = text.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Restore tables
    tables.forEach((table, i) => {
        text = text.replace(`__TABLE_${i}__`, table);
    });

    // Clean up any empty paragraphs
    text = text.replace(/<p>\s*<\/p>/g, '');
    text = text.replace(/<p>(<h[1-4]>)/g, '$1');
    text = text.replace(/(<\/h[1-4]>)<\/p>/g, '$1');
    text = text.replace(/<p>(<table>)/g, '$1');
    text = text.replace(/(<\/table>)<\/p>/g, '$1');

    return text;
}

/**
 * Clean HTML content for print/PDF export
 * Removes interactive elements and normalizes styles for print
 */
function cleanHtmlForPrint(html) {
    // Create a temporary container to parse and clean the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remove any interactive elements (buttons, inputs, etc.)
    temp.querySelectorAll('button, input, select, .message-action, .copy-button').forEach(el => el.remove());

    // Remove any script tags
    temp.querySelectorAll('script').forEach(el => el.remove());

    // Remove any data attributes and event handlers by cloning
    const cleanNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            // Remove onclick and other event attributes
            const attrs = Array.from(node.attributes);
            attrs.forEach(attr => {
                if (attr.name.startsWith('on') || attr.name.startsWith('data-')) {
                    node.removeAttribute(attr.name);
                }
            });
        }
    };

    temp.querySelectorAll('*').forEach(cleanNode);

    // Ensure tables have proper styling classes
    temp.querySelectorAll('table').forEach(table => {
        if (!table.classList.contains('print-table')) {
            table.classList.add('print-table');
        }
    });

    return temp.innerHTML;
}

/**
 * Extract markdown tables from raw text content
 * Returns array of { title, rows } where rows is array of arrays
 */
function extractMarkdownTables(text) {
    const tables = [];
    const tableRegex = /(?:^|\n)(?:#+\s*(.+)\n+)?(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm;
    let match;

    while ((match = tableRegex.exec(text)) !== null) {
        const title = match[1] ? match[1].trim() : null;
        const headerRow = match[2];
        const bodyText = match[4];

        // Parse header cells
        const headers = headerRow.split('|').filter(c => c.trim() !== '').map(c => c.trim());

        // Parse body rows
        const bodyRows = bodyText.trim().split('\n').map(row =>
            row.split('|').filter(c => c.trim() !== '').map(c => c.trim().replace(/\*\*/g, ''))
        );

        tables.push({
            title,
            rows: [headers, ...bodyRows]
        });
    }

    return tables;
}


/**
 * Save as Context Asset
 */
async function saveAsContextAsset() {
    if (!currentArtifactContent) {
        alert('No content to save');
        return;
    }

    const name = prompt('Enter a name for this Context Asset:', 'AI Response - ' + new Date().toLocaleDateString());
    if (!name) return;

    try {
        const fetchFn = window.authFetch || fetch;
        const response = await fetchFn('/api/context/assets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                asset_type: 'i360_knowledge',
                content_json: { content: currentArtifactContent },
                description: `Saved from ${(typeof BrandingService !== 'undefined') ? BrandingService.getAssistantName() : 'Higgins'} conversation`
            })
        });

        const data = await response.json();

        if (data.success) {
            closeArtifactModal();
            setStatus('Saved as Context Asset');
            alert('Context Asset created successfully!');
        } else {
            throw new Error(data.error || 'Failed to save');
        }
    } catch (error) {
        console.error('Save as Context Asset failed:', error);
        alert('Failed to save: ' + error.message);
    }
}

/**
 * Save as Snippet/Template
 */
async function saveAsSnippet() {
    if (!currentArtifactContent) {
        alert('No content to save');
        return;
    }

    const name = prompt('Enter a name for this snippet:', 'Saved Response - ' + new Date().toLocaleDateString());
    if (!name) return;

    try {
        // Save to localStorage as a simple snippet store
        const snippets = JSON.parse(localStorage.getItem('chat_snippets') || '[]');
        snippets.push({
            id: Date.now(),
            name: name,
            content: currentArtifactContent,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('chat_snippets', JSON.stringify(snippets));

        closeArtifactModal();
        setStatus('Snippet saved');
        alert('Snippet saved! You can access it from the snippets menu.');
    } catch (error) {
        console.error('Save as snippet failed:', error);
        alert('Failed to save: ' + error.message);
    }
}

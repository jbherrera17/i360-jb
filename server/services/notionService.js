/**
 * Notion Service
 * Publishes content to Notion pages
 */

const { Client } = require('@notionhq/client');

class NotionService {
    constructor() {
        this.client = null;
        this.pageId = process.env.NOTION_PAGE_ID;

        if (process.env.NOTION_API_KEY) {
            this.client = new Client({
                auth: process.env.NOTION_API_KEY
            });
        }
    }

    isConfigured() {
        return this.client !== null && this.pageId;
    }

    /**
     * Convert markdown to Notion blocks
     * @param {string} markdown - The markdown content
     * @param {object} options - Options for conversion
     * @param {boolean} options.useToggles - Use toggle headings for H2 sections
     */
    markdownToBlocks(markdown, options = {}) {
        const blocks = [];
        const lines = markdown.split('\n');
        let i = 0;
        let inCodeBlock = false;
        let codeContent = '';
        let codeLanguage = '';

        while (i < lines.length) {
            const line = lines[i];

            // Code block handling
            if (line.startsWith('```')) {
                if (!inCodeBlock) {
                    inCodeBlock = true;
                    codeLanguage = line.slice(3).trim() || 'plain text';
                    codeContent = '';
                } else {
                    inCodeBlock = false;
                    // Notion has a 2000 character limit for code blocks
                    const trimmedCode = codeContent.trim();
                    if (trimmedCode.length <= 2000) {
                        blocks.push({
                            object: 'block',
                            type: 'code',
                            code: {
                                rich_text: [{ type: 'text', text: { content: trimmedCode } }],
                                language: this.mapLanguage(codeLanguage)
                            }
                        });
                    } else {
                        // Split long code blocks into multiple blocks
                        const chunks = this.splitText(trimmedCode, 1900);
                        chunks.forEach((chunk) => {
                            blocks.push({
                                object: 'block',
                                type: 'code',
                                code: {
                                    rich_text: [{ type: 'text', text: { content: chunk } }],
                                    language: this.mapLanguage(codeLanguage)
                                }
                            });
                        });
                    }
                }
                i++;
                continue;
            }

            if (inCodeBlock) {
                codeContent += line + '\n';
                i++;
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Horizontal rule
            if (line.match(/^---+$/)) {
                blocks.push({
                    object: 'block',
                    type: 'divider',
                    divider: {}
                });
                i++;
                continue;
            }

            // Headers - use toggle headings when option is set
            if (line.startsWith('# ')) {
                blocks.push({
                    object: 'block',
                    type: options.useToggles ? 'toggle' : 'heading_1',
                    [options.useToggles ? 'toggle' : 'heading_1']: {
                        rich_text: this.parseInlineText(line.slice(2)),
                        ...(options.useToggles ? { color: 'default' } : {})
                    }
                });
                i++;
                continue;
            }

            if (line.startsWith('## ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_2',
                    heading_2: {
                        rich_text: this.parseInlineText(line.slice(3)),
                        is_toggleable: options.useToggles || false
                    }
                });
                i++;
                continue;
            }

            if (line.startsWith('### ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: this.parseInlineText(line.slice(4)),
                        is_toggleable: options.useToggles || false
                    }
                });
                i++;
                continue;
            }

            // Bulleted list
            if (line.match(/^[\-\*] /)) {
                blocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: this.parseInlineText(line.slice(2))
                    }
                });
                i++;
                continue;
            }

            // Numbered list
            if (line.match(/^\d+\. /)) {
                const content = line.replace(/^\d+\. /, '');
                blocks.push({
                    object: 'block',
                    type: 'numbered_list_item',
                    numbered_list_item: {
                        rich_text: this.parseInlineText(content)
                    }
                });
                i++;
                continue;
            }

            // Table handling (simplified - convert to paragraphs)
            if (line.startsWith('|')) {
                // Skip table separator rows
                if (line.match(/^\|[\-\s|]+\|$/)) {
                    i++;
                    continue;
                }

                const cells = line.split('|').filter(c => c.trim());
                const tableText = cells.map(c => c.trim()).join(' | ');
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: tableText } }]
                    }
                });
                i++;
                continue;
            }

            // Regular paragraph
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: this.parseInlineText(line)
                }
            });
            i++;
        }

        return blocks;
    }

    /**
     * Parse inline markdown formatting
     */
    parseInlineText(text) {
        const richText = [];
        let remaining = text;

        // Simple parser - handle bold, italic, code
        while (remaining.length > 0) {
            // Bold **text**
            const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
            if (boldMatch) {
                richText.push({
                    type: 'text',
                    text: { content: boldMatch[1] },
                    annotations: { bold: true }
                });
                remaining = remaining.slice(boldMatch[0].length);
                continue;
            }

            // Italic *text*
            const italicMatch = remaining.match(/^\*(.+?)\*/);
            if (italicMatch) {
                richText.push({
                    type: 'text',
                    text: { content: italicMatch[1] },
                    annotations: { italic: true }
                });
                remaining = remaining.slice(italicMatch[0].length);
                continue;
            }

            // Code `text`
            const codeMatch = remaining.match(/^`(.+?)`/);
            if (codeMatch) {
                richText.push({
                    type: 'text',
                    text: { content: codeMatch[1] },
                    annotations: { code: true }
                });
                remaining = remaining.slice(codeMatch[0].length);
                continue;
            }

            // Regular text (up to next special character or end)
            const nextSpecial = remaining.search(/[\*`]/);
            if (nextSpecial === -1) {
                richText.push({
                    type: 'text',
                    text: { content: remaining }
                });
                break;
            } else if (nextSpecial === 0) {
                // Special char at start but not matched - treat as regular
                richText.push({
                    type: 'text',
                    text: { content: remaining[0] }
                });
                remaining = remaining.slice(1);
            } else {
                richText.push({
                    type: 'text',
                    text: { content: remaining.slice(0, nextSpecial) }
                });
                remaining = remaining.slice(nextSpecial);
            }
        }

        return richText.length > 0 ? richText : [{ type: 'text', text: { content: text } }];
    }

    /**
     * Split text into chunks at line boundaries
     */
    splitText(text, maxLength) {
        const chunks = [];
        const lines = text.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Map language names to Notion's supported languages
     */
    mapLanguage(lang) {
        const languageMap = {
            'js': 'javascript',
            'javascript': 'javascript',
            'ts': 'typescript',
            'typescript': 'typescript',
            'py': 'python',
            'python': 'python',
            'sh': 'bash',
            'shell': 'bash',
            'bash': 'bash',
            'sql': 'sql',
            'json': 'json',
            'html': 'html',
            'xml': 'xml',
            'css': 'css',
            'md': 'markdown',
            'markdown': 'markdown',
            'yaml': 'yaml',
            'yml': 'yaml',
            'plain text': 'plain text',
            'text': 'plain text',
            '': 'plain text'
        };
        return languageMap[lang.toLowerCase()] || 'plain text';
    }

    /**
     * Clear all children from a page
     */
    async clearPage(pageId) {
        const children = await this.client.blocks.children.list({
            block_id: pageId,
            page_size: 100
        });

        for (const block of children.results) {
            await this.client.blocks.delete({
                block_id: block.id
            });
        }
    }

    /**
     * Publish markdown content to a Notion page
     * @param {string} markdown - The markdown content
     * @param {object} options - Publishing options
     * @param {string} options.pageId - Override the default page ID
     * @param {boolean} options.clearFirst - Clear the page before adding (default: false)
     * @param {string} options.toggleTitle - Wrap content in a toggle heading with this title
     * @param {boolean} options.useToggles - Use toggle headings for sections
     */
    async publishToPage(markdown, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('Notion is not configured. Set NOTION_API_KEY and NOTION_PAGE_ID.');
        }

        const pageId = options.pageId || this.pageId;
        const clearFirst = options.clearFirst === true; // Default to false (append mode)

        // Clear existing content if explicitly requested
        if (clearFirst) {
            await this.clearPage(pageId);
        }

        // Convert markdown to Notion blocks
        const contentBlocks = this.markdownToBlocks(markdown, {
            useToggles: options.useToggles
        });

        let blocksToAppend;

        // If a toggle title is provided, wrap all content inside a toggle heading
        if (options.toggleTitle) {
            // Create the toggle heading 1 with all content as children
            const toggleBlock = {
                object: 'block',
                type: 'heading_1',
                heading_1: {
                    rich_text: [{ type: 'text', text: { content: options.toggleTitle } }],
                    is_toggleable: true,
                    color: 'default'
                }
            };

            // First, append the toggle heading
            const toggleResult = await this.client.blocks.children.append({
                block_id: pageId,
                children: [toggleBlock]
            });

            // Get the ID of the newly created toggle
            const toggleId = toggleResult.results[0].id;

            // Now append all content blocks as children of the toggle
            const chunks = [];
            for (let i = 0; i < contentBlocks.length; i += 100) {
                chunks.push(contentBlocks.slice(i, i + 100));
            }

            for (const chunk of chunks) {
                await this.client.blocks.children.append({
                    block_id: toggleId,
                    children: chunk
                });
            }

            blocksToAppend = contentBlocks;
        } else {
            // No toggle - just append blocks directly
            blocksToAppend = contentBlocks;

            const chunks = [];
            for (let i = 0; i < blocksToAppend.length; i += 100) {
                chunks.push(blocksToAppend.slice(i, i + 100));
            }

            for (const chunk of chunks) {
                await this.client.blocks.children.append({
                    block_id: pageId,
                    children: chunk
                });
            }
        }

        // Get page info
        const page = await this.client.pages.retrieve({ page_id: pageId });

        return {
            success: true,
            pageId: pageId,
            url: page.url,
            blocksCreated: blocksToAppend.length + (options.toggleTitle ? 1 : 0)
        };
    }

    /**
     * Create a new page under a parent page
     */
    async createSubpage(title, markdown, parentPageId) {
        if (!this.isConfigured()) {
            throw new Error('Notion is not configured.');
        }

        const parent = parentPageId || this.pageId;

        // Create the page
        const page = await this.client.pages.create({
            parent: { page_id: parent },
            properties: {
                title: {
                    title: [{ text: { content: title } }]
                }
            }
        });

        // Add content
        const blocks = this.markdownToBlocks(markdown);

        const chunks = [];
        for (let i = 0; i < blocks.length; i += 100) {
            chunks.push(blocks.slice(i, i + 100));
        }

        for (const chunk of chunks) {
            await this.client.blocks.children.append({
                block_id: page.id,
                children: chunk
            });
        }

        return {
            success: true,
            pageId: page.id,
            url: page.url,
            blocksCreated: blocks.length
        };
    }
}

module.exports = new NotionService();

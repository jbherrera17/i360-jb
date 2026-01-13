/**
 * Notion Service
 * Publishes content to Notion pages and manages Content Calendar
 */

const { Client } = require('@notionhq/client');

class NotionService {
    constructor() {
        this.client = null;
        this.pageId = process.env.NOTION_PAGE_ID;
        this.contentCalendarDbId = process.env.NOTION_CONTENT_CALENDAR_DB_ID || 'e5228731-3073-4081-a379-c09beb2a9412';

        if (process.env.NOTION_API_KEY) {
            this.client = new Client({
                auth: process.env.NOTION_API_KEY
            });
        }
    }

    isConfigured() {
        return this.client !== null && this.pageId;
    }

    isCalendarConfigured() {
        // Check that client is properly initialized with databases.query method
        return this.client !== null &&
               this.contentCalendarDbId &&
               typeof this.client.databases?.query === 'function';
    }

    // ============================================
    // CONTENT CALENDAR CRUD OPERATIONS
    // ============================================

    /**
     * Get content calendar entries with optional filters
     * @param {object} filters - Filter options
     * @param {string} filters.status - Filter by status
     * @param {string} filters.pillar - Filter by pillar name
     * @param {Date} filters.startDate - Start of date range
     * @param {Date} filters.endDate - End of date range
     * @param {number} filters.pageSize - Number of results (default 100)
     */
    async getContentCalendarEntries(filters = {}) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured. Set NOTION_CONTENT_CALENDAR_DB_ID.');
        }

        const filterConditions = [];

        // Status filter
        if (filters.status) {
            filterConditions.push({
                property: 'Status',
                select: { equals: filters.status }
            });
        }

        // Pillar filter
        if (filters.pillar) {
            filterConditions.push({
                property: 'Pillar',
                select: { equals: filters.pillar }
            });
        }

        // Date range filter
        if (filters.startDate) {
            filterConditions.push({
                property: 'Date',
                date: { on_or_after: filters.startDate.toISOString().split('T')[0] }
            });
        }

        if (filters.endDate) {
            filterConditions.push({
                property: 'Date',
                date: { on_or_before: filters.endDate.toISOString().split('T')[0] }
            });
        }

        const queryParams = {
            database_id: this.contentCalendarDbId,
            page_size: filters.pageSize || 100,
            sorts: [{ property: 'Date', direction: 'ascending' }]
        };

        // Add filter if we have conditions
        if (filterConditions.length > 0) {
            queryParams.filter = filterConditions.length === 1
                ? filterConditions[0]
                : { and: filterConditions };
        }

        const response = await this.client.databases.query(queryParams);

        return response.results.map(page => this.parseCalendarPage(page));
    }

    /**
     * Get a single calendar entry by Notion page ID
     */
    async getCalendarEntry(pageId) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        const page = await this.client.pages.retrieve({ page_id: pageId });
        return this.parseCalendarPage(page);
    }

    /**
     * Create a new calendar entry
     * @param {object} entry - Calendar entry data
     */
    async createCalendarEntry(entry) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        const properties = this.buildCalendarProperties(entry);

        const page = await this.client.pages.create({
            parent: { database_id: this.contentCalendarDbId },
            properties
        });

        return {
            success: true,
            pageId: page.id,
            url: page.url,
            entry: this.parseCalendarPage(page)
        };
    }

    /**
     * Update an existing calendar entry
     * @param {string} pageId - Notion page ID
     * @param {object} updates - Properties to update
     */
    async updateCalendarEntry(pageId, updates) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        const properties = this.buildCalendarProperties(updates);

        const page = await this.client.pages.update({
            page_id: pageId,
            properties
        });

        return {
            success: true,
            pageId: page.id,
            url: page.url,
            entry: this.parseCalendarPage(page)
        };
    }

    /**
     * Delete (archive) a calendar entry
     */
    async deleteCalendarEntry(pageId) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        await this.client.pages.update({
            page_id: pageId,
            archived: true
        });

        return { success: true, pageId };
    }

    /**
     * Add content blocks to a calendar entry page
     * @param {string} pageId - Notion page ID
     * @param {string} markdown - Markdown content to add
     * @param {object} options - Options for content placement
     */
    async addContentToCalendarEntry(pageId, markdown, options = {}) {
        const blocks = this.markdownToBlocks(markdown, options);

        const chunks = [];
        for (let i = 0; i < blocks.length; i += 100) {
            chunks.push(blocks.slice(i, i + 100));
        }

        for (const chunk of chunks) {
            if (chunk && chunk.length > 0) {
                await this.client.blocks.children.append({
                    block_id: pageId,
                    children: chunk
                });
            }
        }

        return {
            success: true,
            pageId,
            blocksCreated: blocks.length
        };
    }

    /**
     * Parse Notion page to local calendar entry format
     */
    parseCalendarPage(page) {
        const props = page.properties;

        // Helper to safely get property values
        const getTitle = (prop) => prop?.title?.[0]?.plain_text || '';
        const getRichText = (prop) => prop?.rich_text?.[0]?.plain_text || '';
        const getSelect = (prop) => prop?.select?.name || null;
        const getDate = (prop) => prop?.date?.start || null;
        const getCheckbox = (prop) => prop?.checkbox || false;
        const getNumber = (prop) => prop?.number || null;

        return {
            notion_page_id: page.id,
            notion_url: page.url,
            notion_last_edited: page.last_edited_time,

            // Core fields
            title: getTitle(props['Name']),
            scheduled_date: getDate(props['Date']),
            pillar: getSelect(props['Pillar']),
            event_type: getSelect(props['Event Type']),
            status: getSelect(props['Status']),
            goal: getRichText(props['Goal']),
            monthly_topic: getRichText(props['Monthly Topic']),

            // Week info
            week_number: getNumber(props['Week']),

            // Publishing targets
            publish_substack: getCheckbox(props['Substack']),
            publish_x: getCheckbox(props['X']),
            publish_li_page: getCheckbox(props['LI Page']),
            publish_li_personal: getCheckbox(props['LI-JBH']),
            publish_website: getCheckbox(props['Website']),
            publish_facebook_personal: getCheckbox(props['FB-JBH']),
            publish_facebook_page: getCheckbox(props['FB-PI']),
            publish_facebook_group: getCheckbox(props['FB-IDB'])
        };
    }

    /**
     * Build Notion properties object from local entry data
     */
    buildCalendarProperties(entry) {
        const properties = {};

        // Title (Name)
        if (entry.title !== undefined) {
            properties['Name'] = {
                title: [{ text: { content: entry.title } }]
            };
        }

        // Date
        if (entry.scheduled_date !== undefined) {
            properties['Date'] = {
                date: entry.scheduled_date ? { start: entry.scheduled_date } : null
            };
        }

        // Select properties
        if (entry.pillar !== undefined) {
            properties['Pillar'] = {
                select: entry.pillar ? { name: entry.pillar } : null
            };
        }

        if (entry.event_type !== undefined) {
            properties['Event Type'] = {
                select: entry.event_type ? { name: entry.event_type } : null
            };
        }

        if (entry.status !== undefined) {
            properties['Status'] = {
                select: entry.status ? { name: entry.status } : null
            };
        }

        // Rich text properties
        if (entry.goal !== undefined) {
            properties['Goal'] = {
                rich_text: [{ text: { content: entry.goal || '' } }]
            };
        }

        if (entry.monthly_topic !== undefined) {
            properties['Monthly Topic'] = {
                rich_text: [{ text: { content: entry.monthly_topic || '' } }]
            };
        }

        // Number
        if (entry.week_number !== undefined) {
            properties['Week'] = {
                number: entry.week_number
            };
        }

        // Checkbox properties (publishing targets)
        if (entry.publish_substack !== undefined) {
            properties['Substack'] = { checkbox: entry.publish_substack };
        }
        if (entry.publish_x !== undefined) {
            properties['X'] = { checkbox: entry.publish_x };
        }
        if (entry.publish_li_page !== undefined) {
            properties['LI Page'] = { checkbox: entry.publish_li_page };
        }
        if (entry.publish_li_personal !== undefined) {
            properties['LI-JBH'] = { checkbox: entry.publish_li_personal };
        }
        if (entry.publish_website !== undefined) {
            properties['Website'] = { checkbox: entry.publish_website };
        }
        if (entry.publish_facebook_personal !== undefined) {
            properties['FB-JBH'] = { checkbox: entry.publish_facebook_personal };
        }
        if (entry.publish_facebook_page !== undefined) {
            properties['FB-PI'] = { checkbox: entry.publish_facebook_page };
        }
        if (entry.publish_facebook_group !== undefined) {
            properties['FB-IDB'] = { checkbox: entry.publish_facebook_group };
        }

        return properties;
    }

    /**
     * Sync local entry to Notion (create or update)
     */
    async syncLocalToNotion(localEntry) {
        if (localEntry.notion_page_id) {
            // Update existing
            return this.updateCalendarEntry(localEntry.notion_page_id, localEntry);
        } else {
            // Create new
            return this.createCalendarEntry(localEntry);
        }
    }

    /**
     * Get calendar database schema (for property discovery)
     */
    async getCalendarSchema() {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        const database = await this.client.databases.retrieve({
            database_id: this.contentCalendarDbId
        });

        return {
            id: database.id,
            title: database.title?.[0]?.plain_text || 'Content Calendar',
            properties: Object.entries(database.properties).map(([name, prop]) => ({
                name,
                type: prop.type,
                options: prop.select?.options || prop.multi_select?.options || null
            }))
        };
    }

    /**
     * Get pillar options from calendar database
     */
    async getPillarOptions() {
        const schema = await this.getCalendarSchema();
        const pillarProp = schema.properties.find(p => p.name === 'Pillar');
        return pillarProp?.options || [];
    }

    /**
     * Get entries for a specific week
     */
    async getWeekEntries(year, weekNumber) {
        // Calculate week start and end dates
        const jan1 = new Date(year, 0, 1);
        const daysOffset = (jan1.getDay() <= 4 ? 1 : 8) - jan1.getDay();
        const firstMonday = new Date(year, 0, 1 + daysOffset);

        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        return this.getContentCalendarEntries({
            startDate: weekStart,
            endDate: weekEnd
        });
    }

    // ============================================
    // END CONTENT CALENDAR OPERATIONS
    // ============================================

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
                if (chunk && chunk.length > 0) {
                    await this.client.blocks.children.append({
                        block_id: toggleId,
                        children: chunk
                    });
                }
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
                if (chunk && chunk.length > 0) {
                    await this.client.blocks.children.append({
                        block_id: pageId,
                        children: chunk
                    });
                }
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

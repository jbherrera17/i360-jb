/**
 * Notion Service
 * Publishes content to Notion pages and manages Content Calendar
 */

const { Client } = require('@notionhq/client');

class NotionService {
    constructor() {
        this.client = null;
        this.pageId = this.extractNotionId(process.env.NOTION_PAGE_ID);
        this.contentCalendarDbId = this.extractNotionId(process.env.NOTION_CONTENT_CALENDAR_DB_ID) || 'e5228731-3073-4081-a379-c09beb2a9412';

        if (process.env.NOTION_API_KEY) {
            this.client = new Client({
                auth: process.env.NOTION_API_KEY
            });
        }

        console.log('[NotionService] Initialized with calendar DB:', this.contentCalendarDbId);
    }

    /**
     * Extract Notion ID from URL or return as-is if already an ID
     * Handles: full URLs, URLs with view params, or plain IDs
     */
    extractNotionId(input) {
        if (!input) return null;

        // If it's a full URL, extract the ID
        if (input.includes('notion.so') || input.includes('notion.site')) {
            // Match the 32-char hex ID (with or without dashes)
            const match = input.match(/([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) {
                // Return with dashes (Notion API format)
                const id = match[1].replace(/-/g, '');
                return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
            }
        }

        // Already an ID (with or without dashes)
        const cleaned = input.replace(/-/g, '');
        if (/^[a-f0-9]{32}$/i.test(cleaned)) {
            return `${cleaned.slice(0,8)}-${cleaned.slice(8,12)}-${cleaned.slice(12,16)}-${cleaned.slice(16,20)}-${cleaned.slice(20)}`;
        }

        return input; // Return as-is if we can't parse it
    }

    isConfigured() {
        return this.client !== null && this.pageId;
    }

    isCalendarConfigured() {
        // Check that client is properly initialized
        // Note: In Notion SDK v5.x, query moved from databases to dataSources
        const configured = this.client !== null &&
               this.contentCalendarDbId &&
               (typeof this.client.databases?.query === 'function' ||
                typeof this.client.dataSources?.query === 'function');

        if (!configured) {
            console.log('[NotionService] Calendar not configured:', {
                hasClient: this.client !== null,
                hasDbId: !!this.contentCalendarDbId,
                hasDbQuery: typeof this.client?.databases?.query === 'function',
                hasDsQuery: typeof this.client?.dataSources?.query === 'function'
            });
        }
        return configured;
    }

    /**
     * Helper to query database (handles SDK version differences)
     */
    async queryDatabase(params) {
        // Notion SDK v5.x moved query to dataSources
        if (typeof this.client.dataSources?.query === 'function') {
            // v5.x: use dataSources.query with data_source_id
            const { database_id, ...rest } = params;
            return this.client.dataSources.query({ data_source_id: database_id, ...rest });
        } else if (typeof this.client.databases?.query === 'function') {
            // v2.x: use databases.query
            return this.client.databases.query(params);
        } else {
            throw new Error('Notion SDK query method not found');
        }
    }

    /**
     * Helper to retrieve database schema
     */
    async retrieveDatabase(databaseId) {
        // Notion SDK v5.x moved retrieve to dataSources
        if (typeof this.client.dataSources?.retrieve === 'function') {
            return this.client.dataSources.retrieve({ data_source_id: databaseId });
        } else if (typeof this.client.databases?.retrieve === 'function') {
            return this.client.databases.retrieve({ database_id: databaseId });
        } else {
            throw new Error('Notion SDK retrieve method not found');
        }
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

        // Status filter (uses Notion 'status' type, not 'select')
        if (filters.status) {
            filterConditions.push({
                property: 'Status',
                status: { equals: filters.status }
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

        const response = await this.queryDatabase(queryParams);

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
     * Get page content (block children) as markdown
     * @param {string} pageId - Notion page ID
     * @returns {object} - { markdown, blocks }
     */
    async getPageContent(pageId) {
        if (!this.client) {
            throw new Error('Notion client is not configured.');
        }

        const blocks = [];
        let cursor = undefined;

        // Fetch all blocks (handles pagination)
        do {
            const response = await this.client.blocks.children.list({
                block_id: pageId,
                start_cursor: cursor,
                page_size: 100
            });

            blocks.push(...response.results);
            cursor = response.has_more ? response.next_cursor : undefined;
        } while (cursor);

        // Convert blocks to markdown
        const markdown = this.blocksToMarkdown(blocks);

        return {
            markdown,
            blocks,
            blockCount: blocks.length
        };
    }

    /**
     * Convert Notion blocks to markdown
     */
    blocksToMarkdown(blocks) {
        return blocks.map(block => {
            const type = block.type;
            const content = block[type];

            switch (type) {
                case 'paragraph':
                    return this.richTextToMarkdown(content?.rich_text) + '\n';

                case 'heading_1':
                    return `# ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'heading_2':
                    return `## ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'heading_3':
                    return `### ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'bulleted_list_item':
                    return `- ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'numbered_list_item':
                    return `1. ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'quote':
                    return `> ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'code':
                    const lang = content?.language || '';
                    return `\`\`\`${lang}\n${this.richTextToMarkdown(content?.rich_text)}\n\`\`\`\n`;

                case 'divider':
                    return '---\n';

                case 'callout':
                    const icon = content?.icon?.emoji || '';
                    return `> ${icon} ${this.richTextToMarkdown(content?.rich_text)}\n`;

                case 'toggle':
                    return `<details>\n<summary>${this.richTextToMarkdown(content?.rich_text)}</summary>\n</details>\n`;

                case 'image':
                    const url = content?.file?.url || content?.external?.url || '';
                    const caption = content?.caption?.[0]?.plain_text || 'image';
                    return url ? `![${caption}](${url})\n` : '';

                default:
                    return '';
            }
        }).join('\n');
    }

    /**
     * Convert Notion rich text array to markdown
     */
    richTextToMarkdown(richText) {
        if (!richText || !Array.isArray(richText)) return '';

        return richText.map(text => {
            let content = text.plain_text || '';
            const annotations = text.annotations || {};

            if (annotations.bold) content = `**${content}**`;
            if (annotations.italic) content = `*${content}*`;
            if (annotations.strikethrough) content = `~~${content}~~`;
            if (annotations.code) content = `\`${content}\``;

            if (text.href) content = `[${content}](${text.href})`;

            return content;
        }).join('');
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
        const getStatus = (prop) => prop?.status?.name || null; // Notion status type (different from select)
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
            status: getStatus(props['Status']),
            goal: getSelect(props['Goal']),
            monthly_topic: getRichText(props['Monthly Topic']),
            month_yr: getRichText(props['Month/YR']),
            quarter: getSelect(props['Quarter']),
            url: props['userDefined:URL']?.url || props['URL']?.url || null,

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

        // Status uses Notion's 'status' property type (NOT 'select')
        if (entry.status !== undefined) {
            properties['Status'] = {
                status: entry.status ? { name: entry.status } : null
            };
        }

        // Goal is a 'select' property (NOT 'rich_text')
        if (entry.goal !== undefined) {
            properties['Goal'] = {
                select: entry.goal ? { name: entry.goal } : null
            };
        }

        if (entry.monthly_topic !== undefined) {
            properties['Monthly Topic'] = {
                rich_text: [{ text: { content: entry.monthly_topic || '' } }]
            };
        }

        // Month/YR (rich text)
        if (entry.month_yr !== undefined) {
            properties['Month/YR'] = {
                rich_text: [{ text: { content: entry.month_yr || '' } }]
            };
        }

        // Quarter (select)
        if (entry.quarter !== undefined) {
            properties['Quarter'] = {
                select: entry.quarter ? { name: entry.quarter } : null
            };
        }

        // URL (url type, mapped to 'userDefined:URL' in the database schema)
        if (entry.url !== undefined) {
            properties['URL'] = {
                url: entry.url || null
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

        const database = await this.retrieveDatabase(this.contentCalendarDbId);

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
        try {
            const children = await this.client.blocks.children.list({
                block_id: pageId,
                page_size: 100
            });

            for (const block of children.results) {
                try {
                    await this.client.blocks.delete({
                        block_id: block.id
                    });
                } catch (deleteErr) {
                    console.warn(`[NotionService] Could not delete block ${block.id}:`, deleteErr.message);
                }
            }
        } catch (err) {
            console.warn('[NotionService] Could not clear page:', err.message);
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
     * Publish a full Thought Leadership article page to the Content Calendar database.
     * Creates a database entry with all properties + 4 toggle sections:
     *   1. Image — header image
     *   2. Article — human-readable article
     *   3. AI Article — AI-optimized structured article
     *   4. Marketing — LinkedIn posts with schedule
     *
     * @param {Object} article - Article data
     * @param {string} article.title - Article title
     * @param {string} article.articleMarkdown - Human-readable article content
     * @param {string} article.articleAiOptimized - AI-optimized article content
     * @param {string} article.headerImageUrl - Header image URL (Supabase Storage)
     * @param {Object[]} article.linkedinPosts - Array of 5 LinkedIn posts
     * @param {Object} properties - Notion database properties
     * @param {string} properties.pillar - Content pillar name
     * @param {string} properties.goal - Content goal
     * @param {string} properties.monthlyTopic - Monthly topic
     * @param {string} properties.quarter - e.g. "Q1 2026"
     * @param {string} properties.monthYr - e.g. "Mar 2026"
     * @param {string} properties.scheduledDate - ISO date string
     * @param {string} properties.url - Published article URL
     * @param {Object} properties.publishTargets - Checkbox values for each platform
     * @returns {Object} - { success, pageId, url, blocksCreated }
     */
    async publishArticlePage(article, properties = {}) {
        if (!this.isCalendarConfigured()) {
            throw new Error('Content Calendar is not configured.');
        }

        const {
            title,
            articleMarkdown,
            articleAiOptimized,
            headerImageUrl,
            linkedinPosts = []
        } = article;

        if (!title || !articleMarkdown) {
            throw new Error('Title and article content are required');
        }

        // Step 1: Create the database page with all properties
        const entryData = {
            title,
            scheduled_date: properties.scheduledDate || new Date().toISOString().split('T')[0],
            event_type: 'Article',
            pillar: properties.pillar || null,
            goal: properties.goal || null,
            status: 'Published',
            monthly_topic: properties.monthlyTopic || null,
            month_yr: properties.monthYr || null,
            quarter: properties.quarter || null,
            url: properties.url || null,
            // Publishing checkboxes
            publish_substack: properties.publishTargets?.substack || false,
            publish_x: properties.publishTargets?.x || false,
            publish_li_page: properties.publishTargets?.li_page || false,
            publish_li_personal: properties.publishTargets?.li_personal || false,
            publish_website: properties.publishTargets?.website || false,
            publish_facebook_personal: properties.publishTargets?.fb_personal || false,
            publish_facebook_page: properties.publishTargets?.fb_page || false,
            publish_facebook_group: properties.publishTargets?.fb_group || false
        };

        const calendarProperties = this.buildCalendarProperties(entryData);

        const page = await this.client.pages.create({
            parent: { database_id: this.contentCalendarDbId },
            properties: calendarProperties
        });

        const pageId = page.id;
        let totalBlocks = 0;

        // Step 2: Add Image toggle section
        if (headerImageUrl) {
            const imageToggle = {
                object: 'block',
                type: 'heading_1',
                heading_1: {
                    rich_text: [{ type: 'text', text: { content: 'Image' } }],
                    is_toggleable: true,
                    color: 'default'
                }
            };

            const imageToggleResult = await this.client.blocks.children.append({
                block_id: pageId,
                children: [imageToggle]
            });

            const imageToggleId = imageToggleResult.results[0].id;

            // Add image block inside toggle
            await this.client.blocks.children.append({
                block_id: imageToggleId,
                children: [{
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: { url: headerImageUrl }
                    }
                }]
            });

            totalBlocks += 2;
        }

        // Step 3: Add Article toggle section
        await this._appendToggleSection(pageId, 'Article', articleMarkdown);
        totalBlocks += 1;

        // Step 4: Add AI Article toggle section (if available)
        if (articleAiOptimized) {
            await this._appendToggleSection(pageId, 'AI Article', articleAiOptimized);
            totalBlocks += 1;
        }

        // Step 5: Add Marketing toggle section (LinkedIn posts)
        if (linkedinPosts && linkedinPosts.length > 0) {
            const marketingContent = this._buildMarketingMarkdown(linkedinPosts, title);
            await this._appendToggleSection(pageId, 'Marketing', marketingContent);
            totalBlocks += 1;
        }

        console.log(`[NotionService] Published article page: ${pageId} with ${totalBlocks} sections`);

        return {
            success: true,
            pageId: page.id,
            url: page.url,
            blocksCreated: totalBlocks,
            entry: this.parseCalendarPage(page)
        };
    }

    /**
     * Helper: Append a toggle section with markdown content to a page
     * @private
     */
    async _appendToggleSection(pageId, toggleTitle, markdownContent) {
        // Create the toggle heading
        const toggleBlock = {
            object: 'block',
            type: 'heading_1',
            heading_1: {
                rich_text: [{ type: 'text', text: { content: toggleTitle } }],
                is_toggleable: true,
                color: 'default'
            }
        };

        const toggleResult = await this.client.blocks.children.append({
            block_id: pageId,
            children: [toggleBlock]
        });

        const toggleId = toggleResult.results[0].id;

        // Convert markdown to blocks and append as children
        const contentBlocks = this.markdownToBlocks(markdownContent);

        // Notion API limits to 100 blocks per request
        for (let i = 0; i < contentBlocks.length; i += 100) {
            const chunk = contentBlocks.slice(i, i + 100);
            if (chunk.length > 0) {
                await this.client.blocks.children.append({
                    block_id: toggleId,
                    children: chunk
                });
            }
        }

        return toggleId;
    }

    /**
     * Helper: Build marketing section markdown from LinkedIn posts
     * @private
     */
    _buildMarketingMarkdown(linkedinPosts, articleTitle) {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dayThemes = {
            monday: 'Insight Launch',
            tuesday: 'Problem Spotlight',
            wednesday: 'Framework Reveal',
            thursday: 'Story/Example',
            friday: 'Call to Reflect'
        };

        let md = `# LinkedIn Posts: ${articleTitle}\n\n`;
        md += `**Article:** ${articleTitle}\n\n---\n\n`;

        for (let i = 0; i < linkedinPosts.length; i++) {
            const post = linkedinPosts[i];
            const dayName = dayNames[i] || `Day ${i + 1}`;
            const day = post.day || dayName.toLowerCase();
            const theme = post.theme || dayThemes[day] || '';

            md += `## **${dayName}: ${theme}**\n\n`;

            if (post.content) {
                md += `${post.content}\n\n`;
            }

            if (post.hashtags && post.hashtags.length > 0) {
                md += `${post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}\n\n`;
            }

            md += `---\n\n`;
        }

        // Post scheduling summary
        md += `## **Post Scheduling Summary**\n\n`;
        md += `| Day | Post | Hashtags |\n`;
        md += `|-----|------|----------|\n`;

        for (let i = 0; i < linkedinPosts.length; i++) {
            const post = linkedinPosts[i];
            const dayName = dayNames[i] || `Day ${i + 1}`;
            const theme = post.theme || dayThemes[post.day] || '';
            const hashtags = (post.hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(', ');
            md += `| ${dayName} | ${theme} | ${hashtags} |\n`;
        }

        return md;
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

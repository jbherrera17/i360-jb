/**
 * INSIGHT 360 - Google Sheets Integration
 * Phase 73: Embeddable Chat Widgets
 *
 * Reads spreadsheet data, validates/sanitizes content [SEC-12],
 * and syncs to a context_asset row for use in widget context injection.
 *
 * Credentials are server-side only — never exposed to clients [SEC-13].
 */

const logger = require('../../../logger');

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// ── Sanitization Patterns [SEC-12] ──────────────────────────

const INJECTION_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,          // onclick=, onerror=, etc.
    /\bSELECT\b.*\bFROM\b/gi,
    /\bDROP\b.*\bTABLE\b/gi,
    /\bINSERT\b.*\bINTO\b/gi,
    /\bDELETE\b.*\bFROM\b/gi,
    /ignore\s+(all\s+)?(your\s+)?(previous|prior)\s+(instructions|rules)/gi,
    /\bsystem\s*prompt\b/gi
];

function sanitizeCell(value) {
    if (typeof value !== 'string') return String(value || '');

    let clean = value;
    for (const pattern of INJECTION_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(clean)) {
            logger.warn('[Sheets] Injection pattern detected in cell content, sanitizing');
            clean = clean.replace(pattern, '[SANITIZED]');
        }
    }
    return clean.trim();
}

function validateRow(row, expectedColumns) {
    if (!Array.isArray(row)) return false;
    // Allow rows shorter than expected (missing trailing cells)
    // but reject completely empty rows
    return row.some(cell => cell && String(cell).trim().length > 0);
}

class SheetsService {
    /**
     * Read all rows from a specific sheet/tab.
     * @param {string} accessToken - Google OAuth access token
     * @param {string} spreadsheetId - Google Sheets ID
     * @param {object} options - { range, includeHeaders }
     * @returns {{ headers: string[], rows: object[], rawRowCount: number }}
     */
    async getSheet(accessToken, spreadsheetId, options = {}) {
        const {
            range = 'Sheet1',
            includeHeaders = true
        } = options;

        const response = await fetch(
            `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Sheets API error ${response.status}: ${error}`);
        }

        const data = await response.json();
        const values = data.values || [];

        if (values.length === 0) {
            return { headers: [], rows: [], rawRowCount: 0 };
        }

        // First row as headers if enabled
        const headers = includeHeaders ? values[0].map(h => sanitizeCell(h)) : [];
        const dataRows = includeHeaders ? values.slice(1) : values;

        // Convert to objects and sanitize [SEC-12]
        const rows = dataRows
            .filter(row => validateRow(row, headers.length))
            .map(row => {
                if (headers.length > 0) {
                    const obj = {};
                    headers.forEach((header, i) => {
                        obj[header] = sanitizeCell(row[i] || '');
                    });
                    return obj;
                }
                return row.map(cell => sanitizeCell(cell));
            });

        return {
            headers,
            rows,
            rawRowCount: dataRows.length
        };
    }

    /**
     * Get spreadsheet metadata (title, sheets/tabs).
     */
    async getMetadata(accessToken, spreadsheetId) {
        const response = await fetch(
            `${SHEETS_API}/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
            throw new Error(`Sheets API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            title: data.properties?.title || 'Untitled',
            sheets: (data.sheets || []).map(s => ({
                id: s.properties?.sheetId,
                title: s.properties?.title,
                rowCount: s.properties?.gridProperties?.rowCount,
                columnCount: s.properties?.gridProperties?.columnCount
            }))
        };
    }

    /**
     * Format spreadsheet data into structured text suitable for context injection.
     * This is the primary integration point — output gets written to a context_asset.
     *
     * @param {object[]} rows - Sanitized row objects from getSheet()
     * @param {string[]} headers - Column headers
     * @param {object} options - { title, format }
     * @returns {string} - Formatted text for context_asset.content_text
     */
    formatForContext(rows, headers, options = {}) {
        const { title = 'Spreadsheet Data' } = options;

        if (!rows || rows.length === 0) {
            return `# ${title}\n\nNo data available.`;
        }

        const sections = [];
        sections.push(`# ${title}`);
        sections.push(`Last synced: ${new Date().toISOString()}`);
        sections.push(`Total entries: ${rows.length}`);
        sections.push('');

        // Format each row as a structured section
        for (const row of rows) {
            // Use the first column value as the section heading
            const firstKey = headers[0] || Object.keys(row)[0];
            const sectionTitle = row[firstKey] || 'Entry';
            sections.push(`## ${sectionTitle}`);

            for (const [key, value] of Object.entries(row)) {
                if (key === firstKey || !value) continue;
                sections.push(`- **${key}:** ${value}`);
            }
            sections.push('');
        }

        return sections.join('\n');
    }

    /**
     * Sync spreadsheet data to a context_asset row.
     * Creates the asset if it doesn't exist, updates if it does.
     *
     * @param {object} supabase - Supabase client (service key)
     * @param {string} accessToken - Google OAuth access token
     * @param {object} syncConfig - { spreadsheetId, range, orgId, contextAssetId, assetName }
     * @returns {{ success: boolean, rowCount: number, assetId: string }}
     */
    async syncToContextAsset(supabase, accessToken, syncConfig) {
        const {
            spreadsheetId,
            range = 'Sheet1',
            orgId,
            contextAssetId,
            assetName = 'Spreadsheet Data'
        } = syncConfig;

        // Fetch sheet data
        const { headers, rows, rawRowCount } = await this.getSheet(accessToken, spreadsheetId, { range });

        // Format for context injection
        const contentText = this.formatForContext(rows, headers, { title: assetName });

        // Upsert context asset
        if (contextAssetId) {
            // Update existing asset
            const { error } = await supabase
                .from('context_assets')
                .update({
                    content_text: contentText,
                    metadata: {
                        source: 'google_sheets',
                        spreadsheet_id: spreadsheetId,
                        range,
                        row_count: rows.length,
                        raw_row_count: rawRowCount,
                        last_sync: new Date().toISOString(),
                        headers
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', contextAssetId)
                .eq('org_id', orgId);

            if (error) throw error;

            logger.info('[Sheets] Synced to existing context asset', {
                assetId: contextAssetId,
                rows: rows.length
            });

            return { success: true, rowCount: rows.length, assetId: contextAssetId };
        } else {
            // Create new asset
            const { data, error } = await supabase
                .from('context_assets')
                .insert({
                    org_id: orgId,
                    name: assetName,
                    description: `Auto-synced from Google Sheets (${rows.length} entries)`,
                    type: 'reference_data',
                    content_text: contentText,
                    metadata: {
                        source: 'google_sheets',
                        spreadsheet_id: spreadsheetId,
                        range,
                        row_count: rows.length,
                        raw_row_count: rawRowCount,
                        last_sync: new Date().toISOString(),
                        headers
                    }
                })
                .select()
                .single();

            if (error) throw error;

            logger.info('[Sheets] Created new context asset from Sheets sync', {
                assetId: data.id,
                rows: rows.length
            });

            return { success: true, rowCount: rows.length, assetId: data.id };
        }
    }
}

module.exports = SheetsService;

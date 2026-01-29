/**
 * INSIGHT 360 - Google Drive Integration
 *
 * List files, read file content, and create files via Drive API.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

class DriveService {
    /**
     * List files
     */
    async listFiles(accessToken, options = {}) {
        const { maxResults = 20, query = '', mimeType, orderBy = 'modifiedTime desc' } = options;

        let q = query;
        if (mimeType) {
            q = q ? `${q} and mimeType='${mimeType}'` : `mimeType='${mimeType}'`;
        }

        const params = new URLSearchParams({
            pageSize: String(maxResults),
            fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink,owners)',
            orderBy
        });
        if (q) params.set('q', q);

        const response = await fetch(`${DRIVE_API}/files?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Drive API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            files: (data.files || []).map(f => ({
                id: f.id,
                name: f.name,
                mimeType: f.mimeType,
                modifiedTime: f.modifiedTime,
                size: f.size,
                webViewLink: f.webViewLink,
                owner: f.owners?.[0]?.displayName || ''
            }))
        };
    }

    /**
     * Get file metadata
     */
    async getFile(accessToken, fileId) {
        const response = await fetch(`${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,modifiedTime,size,webViewLink,description`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Drive API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Get file content (for text-based files)
     */
    async getFileContent(accessToken, fileId) {
        const response = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Drive API error: ${response.status}`);
        }

        return response.text();
    }

    /**
     * Export Google Docs/Sheets/Slides as text
     */
    async exportFile(accessToken, fileId, mimeType = 'text/plain') {
        const response = await fetch(`${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) {
            throw new Error(`Drive export error: ${response.status}`);
        }

        return response.text();
    }

    /**
     * Search files
     */
    async search(accessToken, searchQuery, options = {}) {
        const safeQuery = searchQuery.replace(/'/g, "\\'");
        return this.listFiles(accessToken, {
            ...options,
            query: `name contains '${safeQuery}' or fullText contains '${safeQuery}'`
        });
    }

    /**
     * Format files for agent context injection
     */
    formatForContext(files) {
        if (!files || files.length === 0) return 'No recent files.';

        return files.map((f, i) =>
            `${i + 1}. ${f.name} (${f.mimeType})\n   Modified: ${f.modifiedTime}\n   Link: ${f.webViewLink}`
        ).join('\n\n');
    }
}

module.exports = DriveService;

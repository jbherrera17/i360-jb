/**
 * MCP Tool Bridge Tests
 *
 * Tests for tool namespacing, schema conversion, and name parsing.
 */

const {
    namespaceTool,
    parseToolName,
    toAnthropicTool,
    toOpenAITool,
    findConnectionByPrefix,
    sanitizeToolName
} = require('../../../server/services/mcpToolBridge');

describe('MCP Tool Bridge', () => {
    // ─── sanitizeToolName ───────────────────────

    describe('sanitizeToolName', () => {
        it('should pass through valid names', () => {
            expect(sanitizeToolName('search_code')).toBe('search_code');
            expect(sanitizeToolName('get-user')).toBe('get-user');
        });

        it('should replace invalid characters with underscores', () => {
            expect(sanitizeToolName('search.code')).toBe('search_code');
            expect(sanitizeToolName('get user')).toBe('get_user');
            expect(sanitizeToolName('tool@v2!')).toBe('tool_v2_');
        });

        it('should truncate to 64 characters', () => {
            const longName = 'a'.repeat(100);
            expect(sanitizeToolName(longName)).toHaveLength(64);
        });
    });

    // ─── namespaceTool ──────────────────────────

    describe('namespaceTool', () => {
        const connId = '12345678-abcd-efgh-ijkl-mnopqrstuvwx';

        it('should create namespaced tool name with 8-char prefix', () => {
            const result = namespaceTool(connId, 'search');
            expect(result).toBe('mcp__12345678__search');
        });

        it('should strip hyphens from connection ID prefix', () => {
            const result = namespaceTool('ab-cd-ef-gh-12345678', 'tool');
            // Hyphens removed: abcdefgh -> first 8 chars
            expect(result).toBe('mcp__abcdefgh__tool');
        });

        it('should sanitize tool name', () => {
            const result = namespaceTool(connId, 'my.tool.v2');
            expect(result).toBe('mcp__12345678__my_tool_v2');
        });

        it('should truncate total to 64 characters', () => {
            const longTool = 'a'.repeat(100);
            const result = namespaceTool(connId, longTool);
            expect(result.length).toBeLessThanOrEqual(64);
            expect(result.startsWith('mcp__12345678__')).toBe(true);
        });
    });

    // ─── parseToolName ──────────────────────────

    describe('parseToolName', () => {
        it('should parse a valid namespaced name', () => {
            const result = parseToolName('mcp__12345678__search_code');
            expect(result).toEqual({
                connectionPrefix: '12345678',
                toolName: 'search_code'
            });
        });

        it('should handle tool names containing double underscores', () => {
            const result = parseToolName('mcp__12345678__my__nested__tool');
            expect(result).toEqual({
                connectionPrefix: '12345678',
                toolName: 'my__nested__tool'
            });
        });

        it('should return null for non-MCP names', () => {
            expect(parseToolName('web_search')).toBeNull();
            expect(parseToolName('search')).toBeNull();
        });

        it('should return null for empty/null input', () => {
            expect(parseToolName(null)).toBeNull();
            expect(parseToolName('')).toBeNull();
            expect(parseToolName(undefined)).toBeNull();
        });

        it('should return null for malformed MCP names', () => {
            expect(parseToolName('mcp__')).toBeNull();
            expect(parseToolName('mcp__onlyprefix')).toBeNull();
        });
    });

    // ─── toAnthropicTool ────────────────────────

    describe('toAnthropicTool', () => {
        const connId = '12345678-abcd-efgh-ijkl-000000000000';
        const mcpTool = {
            name: 'search',
            description: 'Search for content',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string' }
                },
                required: ['query']
            }
        };

        it('should convert to Anthropic format with namespaced name', () => {
            const result = toAnthropicTool(connId, mcpTool);
            expect(result.name).toBe('mcp__12345678__search');
            expect(result.description).toBe('Search for content');
            expect(result.input_schema).toEqual(mcpTool.inputSchema);
        });

        it('should provide default description if missing', () => {
            const result = toAnthropicTool(connId, { name: 'fetch' });
            expect(result.description).toBe('MCP tool: fetch');
        });

        it('should provide default input_schema if missing', () => {
            const result = toAnthropicTool(connId, { name: 'fetch' });
            expect(result.input_schema).toEqual({ type: 'object', properties: {} });
        });
    });

    // ─── toOpenAITool ───────────────────────────

    describe('toOpenAITool', () => {
        const connId = '12345678-abcd-efgh-ijkl-000000000000';
        const mcpTool = {
            name: 'create_page',
            description: 'Create a new page',
            inputSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string' }
                }
            }
        };

        it('should convert to OpenAI function-calling format', () => {
            const result = toOpenAITool(connId, mcpTool);
            expect(result.type).toBe('function');
            expect(result.function.name).toBe('mcp__12345678__create_page');
            expect(result.function.description).toBe('Create a new page');
            expect(result.function.parameters).toEqual(mcpTool.inputSchema);
        });
    });

    // ─── findConnectionByPrefix ─────────────────

    describe('findConnectionByPrefix', () => {
        const connMap = {
            '12345678-abcd-efgh-ijkl-000000000000': { name: 'conn1' },
            'aabbccdd-1234-5678-9abc-def000000000': { name: 'conn2' }
        };

        it('should find connection by 8-char prefix (object)', () => {
            const result = findConnectionByPrefix(connMap, '12345678');
            expect(result).toBe('12345678-abcd-efgh-ijkl-000000000000');
        });

        it('should find connection by prefix (Map)', () => {
            const map = new Map(Object.entries(connMap));
            const result = findConnectionByPrefix(map, 'aabbccdd');
            expect(result).toBe('aabbccdd-1234-5678-9abc-def000000000');
        });

        it('should return null for unknown prefix', () => {
            expect(findConnectionByPrefix(connMap, 'xxxxxxxx')).toBeNull();
        });
    });
});

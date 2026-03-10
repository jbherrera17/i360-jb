/**
 * MCP Catalog Service Tests
 *
 * Tests for catalog CRUD operations and bulk import.
 */

// Mock the MCP SDK to prevent real connections
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        close: jest.fn(),
        listTools: jest.fn().mockResolvedValue({ tools: [] }),
        listResources: jest.fn().mockResolvedValue({ resources: [] }),
        listPrompts: jest.fn().mockResolvedValue({ prompts: [] })
    }))
}));
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
    StreamableHTTPClientTransport: jest.fn()
}));

const mcpCatalogService = require('../../../server/services/mcpCatalogService');

describe('MCP Catalog Service', () => {
    let mockSupabase;

    beforeEach(() => {
        mockSupabase = createMockSupabase();
    });

    function createMockSupabase(overrides = {}) {
        const chainable = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            ...overrides
        };

        return {
            from: jest.fn(() => chainable),
            rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
            _chain: chainable
        };
    }

    describe('listCatalog', () => {
        it('should query mcp_server_catalog with default ordering', async () => {
            mockSupabase._chain.order.mockReturnValue({
                ...mockSupabase._chain,
                then: (resolve) => resolve({ data: [{ id: '1', name: 'Test' }], error: null })
            });

            // Override to return data directly
            const mockChain = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockResolvedValue({ data: [{ id: '1', name: 'Test' }], error: null }),
                eq: jest.fn().mockReturnThis()
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const result = await mcpCatalogService.listCatalog(mockSupabase);
            expect(mockSupabase.from).toHaveBeenCalledWith('mcp_server_catalog');
            expect(result).toEqual([{ id: '1', name: 'Test' }]);
        });

        it('should apply status filter when provided', async () => {
            const mockChain = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            await mcpCatalogService.listCatalog(mockSupabase, { status: 'approved' });
            expect(mockChain.eq).toHaveBeenCalledWith('status', 'approved');
        });
    });

    describe('createCatalogEntry', () => {
        it('should insert with correct fields and defaults', async () => {
            const entryData = {
                slug: 'github-mcp',
                name: 'GitHub',
                transport_type: 'streamable_http',
                default_url: 'https://mcp.github.com/mcp'
            };

            const mockChain = {
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { id: 'new-id', ...entryData, status: 'pending' },
                    error: null
                })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const result = await mcpCatalogService.createCatalogEntry(mockSupabase, entryData, 'admin-1');
            expect(mockChain.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    slug: 'github-mcp',
                    name: 'GitHub',
                    transport_type: 'streamable_http',
                    icon: 'plug',
                    auth_type: 'none',
                    created_by: 'admin-1'
                })
            );
            expect(result.id).toBe('new-id');
        });
    });

    describe('bulkCreateCatalogEntries', () => {
        it('should insert valid entries and count results', async () => {
            const mockChain = {
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn()
                    .mockResolvedValueOnce({ data: { id: '1', slug: 'a' }, error: null })
                    .mockResolvedValueOnce({ data: { id: '2', slug: 'b' }, error: null })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const entries = [
                { slug: 'a', name: 'A', transport_type: 'streamable_http' },
                { slug: 'b', name: 'B', transport_type: 'streamable_http' }
            ];

            const result = await mcpCatalogService.bulkCreateCatalogEntries(mockSupabase, entries, 'admin-1');
            expect(result.inserted).toBe(2);
            expect(result.skipped).toBe(0);
            expect(result.entries).toHaveLength(2);
        });

        it('should skip entries with duplicate slugs (23505)', async () => {
            const mockChain = {
                insert: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn()
                    .mockResolvedValueOnce({ data: { id: '1' }, error: null })
                    .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const entries = [
                { slug: 'a', name: 'A', transport_type: 'streamable_http' },
                { slug: 'a', name: 'A duplicate', transport_type: 'streamable_http' }
            ];

            const result = await mcpCatalogService.bulkCreateCatalogEntries(mockSupabase, entries, 'admin-1');
            expect(result.inserted).toBe(1);
            expect(result.skipped).toBe(1);
        });

        it('should skip entries missing required fields', async () => {
            const entries = [
                { slug: 'a', name: 'A' }, // missing transport_type
                { name: 'B', transport_type: 'streamable_http' }, // missing slug
                { slug: 'c', transport_type: 'streamable_http' } // missing name
            ];

            const result = await mcpCatalogService.bulkCreateCatalogEntries(mockSupabase, entries, 'admin-1');
            expect(result.inserted).toBe(0);
            expect(result.skipped).toBe(3);
        });
    });

    describe('approveCatalogEntry', () => {
        it('should set status to approved with admin info', async () => {
            const mockChain = {
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { id: '1', status: 'approved' },
                    error: null
                })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const result = await mcpCatalogService.approveCatalogEntry(mockSupabase, '1', 'admin-1');
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'approved',
                    approved_by: 'admin-1',
                    rejection_reason: null
                })
            );
            expect(result.status).toBe('approved');
        });
    });

    describe('rejectCatalogEntry', () => {
        it('should set status to rejected with reason', async () => {
            const mockChain = {
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { id: '1', status: 'rejected' },
                    error: null
                })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const result = await mcpCatalogService.rejectCatalogEntry(mockSupabase, '1', 'Security concern');
            expect(mockChain.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'rejected',
                    rejection_reason: 'Security concern'
                })
            );
        });
    });

    describe('getConnectionCounts', () => {
        it('should aggregate counts by catalog_id', async () => {
            const mockChain = {
                select: jest.fn().mockResolvedValue({
                    data: [
                        { catalog_id: 'cat1', status: 'connected' },
                        { catalog_id: 'cat1', status: 'connected' },
                        { catalog_id: 'cat1', status: 'error' },
                        { catalog_id: 'cat2', status: 'connected' }
                    ],
                    error: null
                })
            };
            mockSupabase.from = jest.fn(() => mockChain);

            const result = await mcpCatalogService.getConnectionCounts(mockSupabase);
            expect(result.cat1).toEqual({ total: 3, connected: 2 });
            expect(result.cat2).toEqual({ total: 1, connected: 1 });
        });
    });
});

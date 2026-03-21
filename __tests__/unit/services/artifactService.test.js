/**
 * Artifact Service Tests
 * Phase 85: Artifact System
 */

const { createArtifactService } = require('../../../server/services/artifactService');

function createChainable(data = null, error = null) {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data, error }),
    };
    // Override order/limit to also resolve for getRecentForUser
    chain.limit.mockResolvedValue({ data: Array.isArray(data) ? data : [], error });
    chain.order.mockReturnValue(chain);
    return chain;
}

function createMockSupabase() {
    return {
        from: jest.fn().mockImplementation(() => createChainable()),
        storage: {
            from: jest.fn().mockReturnValue({
                upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
                remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
                createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.url' }, error: null })
            })
        }
    };
}

describe('ArtifactService', () => {
    let supabase;
    let service;

    beforeEach(() => {
        supabase = createMockSupabase();
        service = createArtifactService(supabase);
    });

    describe('createBundle', () => {
        it('should require orgId, userId, and name', async () => {
            await expect(service.createBundle({ orgId: null, userId: 'u1', name: 'test' }))
                .rejects.toThrow('orgId, userId, and name are required');

            await expect(service.createBundle({ orgId: 'o1', userId: null, name: 'test' }))
                .rejects.toThrow('orgId, userId, and name are required');

            await expect(service.createBundle({ orgId: 'o1', userId: 'u1', name: '' }))
                .rejects.toThrow('orgId, userId, and name are required');
        });

        it('should create a bundle with correct fields', async () => {
            const mockBundle = { id: 'b1', name: 'Test Bundle', org_id: 'o1' };
            const bundleChain = createChainable(mockBundle);
            supabase.from.mockReturnValue(bundleChain);

            await service.createBundle({
                orgId: 'o1',
                userId: 'u1',
                name: 'Test Bundle',
                sourceType: 'agent_execution',
                tags: ['tag1'],
                visibility: 'org'
            });

            expect(supabase.from).toHaveBeenCalledWith('artifact_bundles');
            expect(bundleChain.insert).toHaveBeenCalled();
            const insertArg = bundleChain.insert.mock.calls[0][0];
            expect(insertArg.name).toBe('Test Bundle');
            expect(insertArg.org_id).toBe('o1');
            expect(insertArg.source_type).toBe('agent_execution');
            expect(insertArg.tags).toEqual(['tag1']);
            expect(insertArg.visibility).toBe('org');
        });

        it('should create inline parts when provided', async () => {
            const mockBundle = { id: 'b1', name: 'Test' };
            const bundleChain = createChainable(mockBundle);
            const partsChain = createChainable();
            partsChain.insert = jest.fn().mockResolvedValue({ error: null });

            supabase.from.mockImplementation((table) => {
                if (table === 'artifact_parts') return partsChain;
                return bundleChain;
            });

            await service.createBundle({
                orgId: 'o1',
                userId: 'u1',
                name: 'Test',
                parts: [
                    { name: 'Part 1', partType: 'markdown', contentText: '# Hello' },
                    { name: 'Part 2', partType: 'json', contentJson: { key: 'value' } }
                ]
            });

            expect(supabase.from).toHaveBeenCalledWith('artifact_parts');
            expect(partsChain.insert).toHaveBeenCalled();
            expect(partsChain.insert.mock.calls[0][0]).toHaveLength(2);
        });
    });

    describe('uploadPart', () => {
        it('should require bundleId, buffer, and filename', async () => {
            await expect(service.uploadPart(null, { buffer: Buffer.from('x'), filename: 'f' }))
                .rejects.toThrow('bundleId, buffer, and filename are required');

            await expect(service.uploadPart('b1', { buffer: null, filename: 'f' }))
                .rejects.toThrow('bundleId, buffer, and filename are required');
        });

        it('should upload to storage and create part record', async () => {
            const mockPart = { id: 'p1', name: 'image.png' };
            supabase.from.mockReturnValue(createChainable(mockPart));

            await service.uploadPart('b1', {
                name: 'image.png',
                partType: 'image',
                buffer: Buffer.from('fake-image'),
                mimeType: 'image/png',
                filename: 'image.png',
                orgId: 'o1',
                userId: 'u1'
            });

            expect(supabase.storage.from).toHaveBeenCalledWith('artifacts');
            expect(supabase.from).toHaveBeenCalledWith('artifact_parts');
        });
    });

    describe('getRecentForUser', () => {
        it('should query with correct filters', async () => {
            const chain = createChainable([]);
            supabase.from.mockReturnValue(chain);

            await service.getRecentForUser('u1', 'o1', 5);

            expect(supabase.from).toHaveBeenCalledWith('artifact_bundles');
            expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
            expect(chain.eq).toHaveBeenCalledWith('org_id', 'o1');
            expect(chain.eq).toHaveBeenCalledWith('is_current', true);
            expect(chain.limit).toHaveBeenCalledWith(5);
        });
    });

    describe('getBundleWithParts', () => {
        it('should return bundle with parts array', async () => {
            const mockBundle = { id: 'b1', name: 'Test', org_id: 'o1' };
            const mockParts = [{ id: 'p1', name: 'Part 1' }];

            const bundleChain = createChainable(mockBundle);
            const partsChain = createChainable();
            partsChain.order.mockResolvedValue({ data: mockParts, error: null });

            supabase.from.mockImplementation((table) => {
                if (table === 'artifact_parts') return partsChain;
                return bundleChain;
            });

            const result = await service.getBundleWithParts('b1', 'o1');

            expect(result).toEqual({ ...mockBundle, parts: mockParts });
        });
    });

    describe('deleteBundle', () => {
        it('should delete storage files and bundle', async () => {
            const mockParts = [
                { file_path: 'o1/u1/b1/p1/file.png' },
                { file_path: null }
            ];

            const partsChain = createChainable();
            partsChain.eq.mockResolvedValue({ data: mockParts, error: null });

            const bundleChain = createChainable();
            // Chain: .delete().eq(id).eq(org_id).eq(user_id)
            const deleteChain = {
                eq: jest.fn()
            };
            // Each .eq() returns the chain, last one resolves
            deleteChain.eq
                .mockReturnValueOnce(deleteChain)   // .eq('id', bundleId)
                .mockReturnValueOnce(deleteChain)   // .eq('org_id', orgId)
                .mockResolvedValueOnce({ error: null }); // .eq('user_id', userId) -> resolve
            bundleChain.delete.mockReturnValue(deleteChain);

            supabase.from.mockImplementation((table) => {
                if (table === 'artifact_parts') return partsChain;
                return bundleChain;
            });

            await service.deleteBundle('b1', 'u1', 'o1');

            expect(supabase.storage.from).toHaveBeenCalledWith('artifacts');
            const removeCall = supabase.storage.from().remove;
            // Storage remove should have been called with file paths
            expect(supabase.from).toHaveBeenCalledWith('artifact_parts');
            expect(supabase.from).toHaveBeenCalledWith('artifact_bundles');
        });
    });

    describe('getPartDownloadUrl', () => {
        it('should return signed URL', async () => {
            const url = await service.getPartDownloadUrl('path/to/file.png');
            expect(url).toBe('https://signed.url');
            expect(supabase.storage.from).toHaveBeenCalledWith('artifacts');
        });
    });

    describe('updateBundle', () => {
        it('should only allow whitelisted fields', async () => {
            const chain = createChainable({ id: 'b1', name: 'Updated' });
            supabase.from.mockReturnValue(chain);

            await service.updateBundle('b1', 'o1', {
                name: 'Updated',
                description: 'New desc',
                tags: ['new-tag'],
                visibility: 'org',
                status: 'complete',
                // These should be filtered out
                org_id: 'hacker-org',
                user_id: 'hacker'
            });

            expect(chain.update).toHaveBeenCalled();
            const updateArg = chain.update.mock.calls[0][0];
            expect(updateArg.name).toBe('Updated');
            expect(updateArg.org_id).toBeUndefined();
            expect(updateArg.user_id).toBeUndefined();
        });
    });
});

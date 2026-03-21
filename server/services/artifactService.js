/**
 * Artifact Service
 * Programmatic API for creating, retrieving, and managing artifact bundles.
 * Used by agents, workflows, chat, and skills to persist deliverables.
 *
 * Phase 85: Artifact System
 */

const { randomUUID } = require('crypto');

/**
 * Create an ArtifactService instance
 * @param {object} supabase - Supabase client
 */
function createArtifactService(supabase) {
    const STORAGE_BUCKET = 'artifacts';

    /**
     * Create a bundle with optional inline parts
     */
    async function createBundle({ orgId, userId, name, description, sourceType = 'manual_upload', sourceId, agentId, departmentId, tags, visibility, status, modelUsed, tokensUsed, generationTimeMs, contextAssetsUsed, skillUsed, parts = [] }) {
        if (!orgId || !userId || !name) {
            throw new Error('orgId, userId, and name are required');
        }

        const bundleId = randomUUID();

        const { data: bundle, error: bundleError } = await supabase
            .from('artifact_bundles')
            .insert({
                id: bundleId,
                org_id: orgId,
                user_id: userId,
                name,
                description: description || null,
                source_type: sourceType,
                source_id: sourceId || null,
                agent_id: agentId || null,
                department_id: departmentId || null,
                tags: tags || [],
                visibility: visibility || 'private',
                status: status || 'complete',
                model_used: modelUsed || null,
                tokens_used: tokensUsed || null,
                generation_time_ms: generationTimeMs || null,
                context_assets_used: contextAssetsUsed || [],
                skill_used: skillUsed || null
            })
            .select()
            .single();

        if (bundleError) throw bundleError;

        // Create inline parts if provided
        if (parts.length > 0) {
            const partRows = parts.map((part, idx) => ({
                id: randomUUID(),
                bundle_id: bundleId,
                name: part.name || `Part ${idx + 1}`,
                part_type: part.partType || 'text',
                content_text: part.contentText || null,
                content_json: part.contentJson || null,
                sort_order: part.sortOrder ?? idx
            }));

            const { error: partsError } = await supabase
                .from('artifact_parts')
                .insert(partRows);

            if (partsError) throw partsError;

            bundle.parts = partRows;
        }

        return bundle;
    }

    /**
     * Upload a binary file as a part of an existing bundle
     */
    async function uploadPart(bundleId, { name, partType, buffer, mimeType, filename, orgId, userId }) {
        if (!bundleId || !buffer || !filename) {
            throw new Error('bundleId, buffer, and filename are required');
        }

        const partId = randomUUID();
        const storagePath = `${orgId}/${userId}/${bundleId}/${partId}/${filename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, buffer, {
                contentType: mimeType || 'application/octet-stream',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Create part record
        const { data: part, error: partError } = await supabase
            .from('artifact_parts')
            .insert({
                id: partId,
                bundle_id: bundleId,
                name: name || filename,
                part_type: partType || 'text',
                file_path: storagePath,
                file_size: buffer.length,
                mime_type: mimeType || 'application/octet-stream',
                sort_order: 999 // appended at end; caller can reorder
            })
            .select()
            .single();

        if (partError) throw partError;

        return part;
    }

    /**
     * Get recent bundles for a user (for Execute 120 card)
     */
    async function getRecentForUser(userId, orgId, limit = 5) {
        const { data, error } = await supabase
            .from('artifact_bundles')
            .select('id, name, source_type, status, created_at, tags, skill_used')
            .eq('user_id', userId)
            .eq('org_id', orgId)
            .eq('is_current', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    }

    /**
     * Get a bundle with all its parts
     */
    async function getBundleWithParts(bundleId, orgId) {
        const { data: bundle, error: bundleError } = await supabase
            .from('artifact_bundles')
            .select('*')
            .eq('id', bundleId)
            .eq('org_id', orgId)
            .single();

        if (bundleError) throw bundleError;
        if (!bundle) return null;

        const { data: parts, error: partsError } = await supabase
            .from('artifact_parts')
            .select('*')
            .eq('bundle_id', bundleId)
            .order('sort_order', { ascending: true });

        if (partsError) throw partsError;

        bundle.parts = parts || [];
        return bundle;
    }

    /**
     * List bundles with filtering and pagination
     */
    async function listBundles(orgId, { userId, sourceType, agentId, departmentId, tags, search, page = 1, limit = 20 } = {}) {
        let query = supabase
            .from('artifact_bundles')
            .select('id, name, description, source_type, status, tags, visibility, created_at, updated_at, skill_used, agent_id, department_id, user_id, version', { count: 'exact' })
            .eq('org_id', orgId)
            .eq('is_current', true);

        if (userId) query = query.eq('user_id', userId);
        if (sourceType) query = query.eq('source_type', sourceType);
        if (agentId) query = query.eq('agent_id', agentId);
        if (departmentId) query = query.eq('department_id', departmentId);
        if (tags && tags.length > 0) query = query.overlaps('tags', tags);
        if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

        const offset = (page - 1) * limit;
        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        return { data: data || [], total: count || 0, page, limit };
    }

    /**
     * Update bundle metadata
     */
    async function updateBundle(bundleId, orgId, updates) {
        const allowed = ['name', 'description', 'tags', 'visibility', 'status'];
        const filtered = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) filtered[key] = updates[key];
        }

        const { data, error } = await supabase
            .from('artifact_bundles')
            .update(filtered)
            .eq('id', bundleId)
            .eq('org_id', orgId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create a new version of a bundle (clone + increment version)
     */
    async function createVersion(bundleId, userId, orgId) {
        // Get existing bundle + parts
        const existing = await getBundleWithParts(bundleId, orgId);
        if (!existing) throw new Error('Bundle not found');

        // Mark old version as not current
        await supabase
            .from('artifact_bundles')
            .update({ is_current: false })
            .eq('id', bundleId);

        // Create new bundle
        const newBundleId = randomUUID();
        const { data: newBundle, error: bundleError } = await supabase
            .from('artifact_bundles')
            .insert({
                id: newBundleId,
                org_id: existing.org_id,
                user_id: userId,
                name: existing.name,
                description: existing.description,
                source_type: existing.source_type,
                source_id: existing.source_id,
                agent_id: existing.agent_id,
                department_id: existing.department_id,
                tags: existing.tags,
                visibility: existing.visibility,
                status: 'complete',
                version: existing.version + 1,
                is_current: true,
                previous_version_id: bundleId,
                model_used: existing.model_used,
                skill_used: existing.skill_used
            })
            .select()
            .single();

        if (bundleError) throw bundleError;

        // Clone parts (text parts only; file parts reference same storage)
        if (existing.parts.length > 0) {
            const clonedParts = existing.parts.map(p => ({
                id: randomUUID(),
                bundle_id: newBundleId,
                name: p.name,
                part_type: p.part_type,
                content_text: p.content_text,
                content_json: p.content_json,
                file_path: p.file_path,
                file_size: p.file_size,
                mime_type: p.mime_type,
                sort_order: p.sort_order
            }));

            await supabase.from('artifact_parts').insert(clonedParts);
            newBundle.parts = clonedParts;
        }

        return newBundle;
    }

    /**
     * Delete a bundle, its parts, and associated storage files
     */
    async function deleteBundle(bundleId, userId, orgId) {
        // Get parts to clean up storage
        const { data: parts } = await supabase
            .from('artifact_parts')
            .select('file_path')
            .eq('bundle_id', bundleId);

        // Delete storage files
        const filePaths = (parts || []).filter(p => p.file_path).map(p => p.file_path);
        if (filePaths.length > 0) {
            await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
        }

        // Cascade delete (parts deleted via FK cascade)
        const { error } = await supabase
            .from('artifact_bundles')
            .delete()
            .eq('id', bundleId)
            .eq('org_id', orgId)
            .eq('user_id', userId);

        if (error) throw error;
        return { deleted: true };
    }

    /**
     * Get a signed download URL for a file part
     */
    async function getPartDownloadUrl(filePath, expiresIn = 3600) {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(filePath, expiresIn);

        if (error) throw error;
        return data.signedUrl;
    }

    return {
        createBundle,
        uploadPart,
        getRecentForUser,
        getBundleWithParts,
        listBundles,
        updateBundle,
        createVersion,
        deleteBundle,
        getPartDownloadUrl
    };
}

module.exports = { createArtifactService };

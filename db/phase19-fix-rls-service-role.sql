-- Phase 19: Fix RLS Policies for Service Role Access
-- Allows service role (SUPABASE_SERVICE_KEY) to bypass RLS on context_assets
-- This is needed because the server uses service key for admin operations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own assets" ON context_assets;
DROP POLICY IF EXISTS "Users can insert own assets" ON context_assets;
DROP POLICY IF EXISTS "Users can update own assets" ON context_assets;
DROP POLICY IF EXISTS "Users can delete own assets" ON context_assets;

-- Create new policies that allow service role OR authenticated users
-- Service role check: auth.role() = 'service_role'
-- User check: auth.uid() = user_id

CREATE POLICY "Allow service role full access to assets" ON context_assets
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view own or public assets" ON context_assets
    FOR SELECT USING (
        auth.uid() = user_id
        OR visibility = 'public'
        OR user_id IS NULL
    );

CREATE POLICY "Users can insert own assets" ON context_assets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR user_id IS NULL
    );

CREATE POLICY "Users can update own assets" ON context_assets
    FOR UPDATE USING (
        auth.uid() = user_id
    );

CREATE POLICY "Users can delete own assets" ON context_assets
    FOR DELETE USING (
        auth.uid() = user_id
    );

-- Also fix agent_context_mappings policies
DROP POLICY IF EXISTS "Users can view own mappings" ON agent_context_mappings;
DROP POLICY IF EXISTS "Users can manage own mappings" ON agent_context_mappings;

CREATE POLICY "Allow service role full access to mappings" ON agent_context_mappings
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view own mappings" ON agent_context_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND (agents.user_id = auth.uid() OR agents.is_public = true)
        )
    );

CREATE POLICY "Users can manage own mappings" ON agent_context_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_context_mappings.agent_id
            AND agents.user_id = auth.uid()
        )
    );

-- Fix context_asset_versions policies
DROP POLICY IF EXISTS "Users can view own asset versions" ON context_asset_versions;

CREATE POLICY "Allow service role full access to versions" ON context_asset_versions
    FOR ALL USING (
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can view own asset versions" ON context_asset_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM context_assets
            WHERE context_assets.id = context_asset_versions.asset_id
            AND (context_assets.user_id = auth.uid() OR context_assets.user_id IS NULL)
        )
    );

COMMENT ON POLICY "Allow service role full access to assets" ON context_assets IS
    'Service role (server-side operations) can perform all operations';
COMMENT ON POLICY "Users can view own or public assets" ON context_assets IS
    'Users can view their own assets, public assets, or assets with no owner';

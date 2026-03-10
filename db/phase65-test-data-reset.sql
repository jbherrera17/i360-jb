-- Phase 65: Test Data Reset Function
-- Provides a safe way to delete all organizations and users EXCEPT Synergi
-- and clean up orphaned data from SET NULL foreign keys.
--
-- Usage: SELECT reset_test_data();
-- Returns: JSON summary of what was deleted

CREATE OR REPLACE FUNCTION reset_test_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_synergi_org_id UUID;
    v_synergi_user_ids UUID[];
    v_non_synergi_org_ids UUID[];
    v_non_synergi_user_ids UUID[];
    v_deleted_orgs INT := 0;
    v_deleted_users INT := 0;
    v_cleaned_agents INT := 0;
    v_cleaned_conversations INT := 0;
    v_cleaned_context_assets INT := 0;
    v_cleaned_departments INT := 0;
    v_cleaned_okrs INT := 0;
    v_cleaned_skills INT := 0;
    v_cleaned_workflows INT := 0;
    v_cleaned_actions INT := 0;
    v_cleaned_align120 INT := 0;
    v_cleaned_company_profiles INT := 0;
    v_cleaned_research_studios INT := 0;
    v_cleaned_strategy_initiatives INT := 0;
    v_cleaned_tl_profiles INT := 0;
BEGIN
    -- Step 1: Identify Synergi (platform owner org)
    SELECT id INTO v_synergi_org_id
    FROM organizations
    WHERE is_platform_owner = TRUE
    LIMIT 1;

    IF v_synergi_org_id IS NULL THEN
        RAISE EXCEPTION 'No platform owner organization found. Aborting reset.';
    END IF;

    -- Step 2: Identify Synergi member user IDs (these survive)
    SELECT ARRAY_AGG(user_id) INTO v_synergi_user_ids
    FROM organization_members
    WHERE org_id = v_synergi_org_id
      AND status = 'active';

    -- Default to empty array if no members found
    IF v_synergi_user_ids IS NULL THEN
        v_synergi_user_ids := ARRAY[]::UUID[];
    END IF;

    -- Step 3: Identify non-Synergi organizations
    SELECT ARRAY_AGG(id) INTO v_non_synergi_org_ids
    FROM organizations
    WHERE id != v_synergi_org_id;

    -- Step 4: Identify non-Synergi users (users NOT in Synergi org)
    SELECT ARRAY_AGG(id) INTO v_non_synergi_user_ids
    FROM users
    WHERE id != ALL(v_synergi_user_ids);

    -- =============================================
    -- PHASE A: Delete non-Synergi organizations
    -- (CASCADE handles ~30+ dependent tables)
    -- =============================================
    IF v_non_synergi_org_ids IS NOT NULL THEN
        DELETE FROM organizations WHERE id = ANY(v_non_synergi_org_ids);
        GET DIAGNOSTICS v_deleted_orgs = ROW_COUNT;
    END IF;

    -- =============================================
    -- PHASE B: Clean up SET NULL orphans
    -- These are rows where org_id was set to NULL
    -- after org deletion, owned by non-Synergi users
    -- =============================================

    -- Clean orphaned agents (org_id became NULL, user not in Synergi)
    IF v_non_synergi_user_ids IS NOT NULL THEN
        DELETE FROM agents WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_agents = ROW_COUNT;

        DELETE FROM conversations WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_conversations = ROW_COUNT;

        DELETE FROM context_assets WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_context_assets = ROW_COUNT;

        DELETE FROM departments WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_departments = ROW_COUNT;

        DELETE FROM okrs WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_okrs = ROW_COUNT;

        DELETE FROM skills WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_skills = ROW_COUNT;

        DELETE FROM workflows WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_workflows = ROW_COUNT;

        DELETE FROM actions WHERE org_id IS NULL AND user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_actions = ROW_COUNT;

        -- Tables without org_id but owned by non-Synergi users
        DELETE FROM research_studios WHERE user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_research_studios = ROW_COUNT;

        DELETE FROM thought_leadership_profiles WHERE user_id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_cleaned_tl_profiles = ROW_COUNT;
    END IF;

    -- Clean align120_sessions and company_profiles (have org_id SET NULL)
    DELETE FROM align120_sessions WHERE org_id IS NULL
        AND user_id IS NOT NULL AND user_id = ANY(COALESCE(v_non_synergi_user_ids, ARRAY[]::UUID[]));
    GET DIAGNOSTICS v_cleaned_align120 = ROW_COUNT;

    DELETE FROM company_profiles WHERE org_id IS NULL
        AND user_id IS NOT NULL AND user_id = ANY(COALESCE(v_non_synergi_user_ids, ARRAY[]::UUID[]));
    GET DIAGNOSTICS v_cleaned_company_profiles = ROW_COUNT;

    -- Clean strategy_initiatives with NULL org_id owned by non-Synergi users
    DELETE FROM strategy_initiatives WHERE org_id IS NULL
        AND user_id IS NOT NULL AND user_id = ANY(COALESCE(v_non_synergi_user_ids, ARRAY[]::UUID[]));
    GET DIAGNOSTICS v_cleaned_strategy_initiatives = ROW_COUNT;

    -- =============================================
    -- PHASE C: Delete non-Synergi users from public.users
    -- (CASCADE handles agents, conversations, etc. for any remaining)
    -- =============================================
    IF v_non_synergi_user_ids IS NOT NULL THEN
        DELETE FROM users WHERE id = ANY(v_non_synergi_user_ids);
        GET DIAGNOSTICS v_deleted_users = ROW_COUNT;
    END IF;

    -- =============================================
    -- PHASE D: Clean dangling references
    -- =============================================

    -- user_integrations with dangling org_id
    UPDATE user_integrations SET org_id = NULL
    WHERE org_id IS NOT NULL
      AND org_id NOT IN (SELECT id FROM organizations);

    -- Reset default_org_id for Synergi users pointing to deleted orgs
    UPDATE users SET default_org_id = v_synergi_org_id
    WHERE default_org_id IS NULL
      AND id = ANY(v_synergi_user_ids);

    -- Return summary
    RETURN jsonb_build_object(
        'success', true,
        'synergi_org_id', v_synergi_org_id,
        'synergi_users_preserved', COALESCE(array_length(v_synergi_user_ids, 1), 0),
        'organizations_deleted', v_deleted_orgs,
        'users_deleted', v_deleted_users,
        'orphans_cleaned', jsonb_build_object(
            'agents', v_cleaned_agents,
            'conversations', v_cleaned_conversations,
            'context_assets', v_cleaned_context_assets,
            'departments', v_cleaned_departments,
            'okrs', v_cleaned_okrs,
            'skills', v_cleaned_skills,
            'workflows', v_cleaned_workflows,
            'actions', v_cleaned_actions,
            'align120_sessions', v_cleaned_align120,
            'company_profiles', v_cleaned_company_profiles,
            'research_studios', v_cleaned_research_studios,
            'strategy_initiatives', v_cleaned_strategy_initiatives,
            'thought_leadership_profiles', v_cleaned_tl_profiles
        )
    );
END;
$$;

-- Grant execute to authenticated users (API will enforce platform admin check)
GRANT EXECUTE ON FUNCTION reset_test_data() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_test_data() TO service_role;

COMMENT ON FUNCTION reset_test_data() IS 'Deletes all organizations and users except the platform owner (Synergi). Cleans up orphaned data from SET NULL foreign keys. Used for test environment resets.';

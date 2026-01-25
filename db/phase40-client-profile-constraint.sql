-- ============================================
-- Phase 40: 1:1 Client-Profile Enforcement
-- Ensures each client has exactly one company profile
-- ============================================
--
-- This schema enforces:
-- - One active company_profile per client (unique constraint)
-- - Profile versioning for historical tracking
-- - Auto-linking of profiles to clients via session triggers
--
-- ============================================

-- ============================================
-- 1. ADD VERSIONING COLUMNS TO COMPANY_PROFILES
-- ============================================

-- Profile versioning for evolution tracking
ALTER TABLE company_profiles
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_profile_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS evolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_company_profiles_parent ON company_profiles(parent_profile_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_version ON company_profiles(client_id, version);

COMMENT ON COLUMN company_profiles.version IS 'Version number for profile evolution tracking';
COMMENT ON COLUMN company_profiles.parent_profile_id IS 'Reference to previous version of this profile';
COMMENT ON COLUMN company_profiles.evolved_at IS 'Timestamp when profile was evolved from parent';


-- ============================================
-- 2. UNIQUE CONSTRAINT: ONE PROFILE PER CLIENT
-- ============================================

-- Use a partial unique index to enforce 1:1 when client_id is set
-- This allows multiple profiles with NULL client_id (personal/unlinked profiles)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_profile
ON company_profiles(client_id)
WHERE client_id IS NOT NULL AND status != 'archived';

COMMENT ON INDEX idx_unique_client_profile IS 'Enforces one active company profile per client';


-- ============================================
-- 3. FUNCTION: GET OR CREATE CLIENT PROFILE
-- ============================================

-- Function to get existing client profile or create a new one
CREATE OR REPLACE FUNCTION get_or_create_client_profile(
    p_client_id UUID,
    p_company_name TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_org_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_client_name TEXT;
BEGIN
    -- Check for existing profile for this client
    SELECT id INTO v_profile_id
    FROM company_profiles
    WHERE client_id = p_client_id
    AND status != 'archived'
    LIMIT 1;

    -- If found, return existing profile
    IF v_profile_id IS NOT NULL THEN
        RETURN v_profile_id;
    END IF;

    -- Get client name if company_name not provided
    IF p_company_name IS NULL THEN
        SELECT name INTO v_client_name
        FROM clients
        WHERE id = p_client_id;
        p_company_name := COALESCE(v_client_name, 'Unnamed Company');
    END IF;

    -- Get org_id from client if not provided
    IF p_org_id IS NULL THEN
        SELECT org_id INTO p_org_id
        FROM clients
        WHERE id = p_client_id;
    END IF;

    -- Create new profile for this client
    INSERT INTO company_profiles (
        client_id,
        org_id,
        user_id,
        company_name,
        status,
        version
    ) VALUES (
        p_client_id,
        p_org_id,
        p_user_id,
        p_company_name,
        'active',
        1
    )
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_client_profile IS 'Returns existing client profile or creates new one, enforcing 1:1 relationship';

GRANT EXECUTE ON FUNCTION get_or_create_client_profile(UUID, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_client_profile(UUID, TEXT, UUID, UUID) TO service_role;


-- ============================================
-- 4. TRIGGER: AUTO-LINK SESSION PROFILE TO CLIENT
-- ============================================

-- When a session with client_id is created/updated with a profile,
-- ensure that profile is linked to the client
CREATE OR REPLACE FUNCTION ensure_session_profile_client_link()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if we have both client_id and company_profile_id
    IF NEW.client_id IS NOT NULL AND NEW.company_profile_id IS NOT NULL THEN
        -- Update the company_profile to be linked to this client if not already linked
        UPDATE company_profiles
        SET
            client_id = NEW.client_id,
            org_id = COALESCE(org_id, NEW.org_id),
            updated_at = NOW()
        WHERE id = NEW.company_profile_id
        AND (client_id IS NULL OR client_id = NEW.client_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger on session insert/update
DROP TRIGGER IF EXISTS trg_link_session_profile_to_client ON align120_sessions;
CREATE TRIGGER trg_link_session_profile_to_client
    AFTER INSERT OR UPDATE OF company_profile_id, client_id ON align120_sessions
    FOR EACH ROW
    WHEN (NEW.company_profile_id IS NOT NULL AND NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION ensure_session_profile_client_link();

COMMENT ON TRIGGER trg_link_session_profile_to_client ON align120_sessions IS 'Auto-links company profile to client when session is created/updated';


-- ============================================
-- 5. FUNCTION: EVOLVE CLIENT PROFILE
-- ============================================

-- Create a new version of a client profile (for major updates)
-- Archives the old version and creates a new one linked to it
CREATE OR REPLACE FUNCTION evolve_client_profile(
    p_client_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_old_profile_id UUID;
    v_old_version INTEGER;
    v_new_profile_id UUID;
    v_profile_data RECORD;
BEGIN
    -- Get current profile
    SELECT id, version, company_name, industry, industry_segment,
           company_size, employee_count, founding_year, headquarters_location,
           user_id, org_id
    INTO v_profile_data
    FROM company_profiles
    WHERE client_id = p_client_id
    AND status != 'archived'
    ORDER BY version DESC
    LIMIT 1;

    IF v_profile_data.id IS NULL THEN
        RAISE EXCEPTION 'No active profile found for client %', p_client_id;
    END IF;

    v_old_profile_id := v_profile_data.id;
    v_old_version := v_profile_data.version;

    -- Archive old profile (remove client_id to allow new unique profile)
    UPDATE company_profiles
    SET
        status = 'archived',
        client_id = NULL,  -- Remove constraint so new profile can be created
        updated_at = NOW()
    WHERE id = v_old_profile_id;

    -- Create new profile version
    INSERT INTO company_profiles (
        client_id,
        org_id,
        user_id,
        company_name,
        industry,
        industry_segment,
        company_size,
        employee_count,
        founding_year,
        headquarters_location,
        status,
        version,
        parent_profile_id,
        evolved_at
    ) VALUES (
        p_client_id,
        v_profile_data.org_id,
        v_profile_data.user_id,
        v_profile_data.company_name,
        v_profile_data.industry,
        v_profile_data.industry_segment,
        v_profile_data.company_size,
        v_profile_data.employee_count,
        v_profile_data.founding_year,
        v_profile_data.headquarters_location,
        'active',
        v_old_version + 1,
        v_old_profile_id,
        NOW()
    )
    RETURNING id INTO v_new_profile_id;

    RETURN v_new_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION evolve_client_profile IS 'Creates a new version of client profile, archiving the previous version';

GRANT EXECUTE ON FUNCTION evolve_client_profile(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION evolve_client_profile(UUID, TEXT) TO service_role;


-- ============================================
-- 6. VIEW: CLIENT PROFILE HISTORY
-- ============================================

CREATE OR REPLACE VIEW client_profile_history AS
SELECT
    cp.id AS profile_id,
    cp.client_id,
    c.name AS client_name,
    cp.org_id,
    o.name AS org_name,
    cp.company_name,
    cp.version,
    cp.status,
    cp.parent_profile_id,
    cp.evolved_at,
    cp.created_at,
    cp.updated_at,
    (SELECT COUNT(*) FROM align120_sessions WHERE company_profile_id = cp.id) AS session_count,
    (SELECT MAX(created_at) FROM align120_sessions WHERE company_profile_id = cp.id) AS last_session_at
FROM company_profiles cp
LEFT JOIN clients c ON cp.client_id = c.id
LEFT JOIN organizations o ON cp.org_id = o.id
WHERE cp.client_id IS NOT NULL
ORDER BY cp.client_id, cp.version DESC;

COMMENT ON VIEW client_profile_history IS 'Historical view of all profile versions per client';

GRANT SELECT ON client_profile_history TO authenticated;
GRANT SELECT ON client_profile_history TO service_role;


-- ============================================
-- 7. VIEW: CURRENT CLIENT PROFILES
-- ============================================

CREATE OR REPLACE VIEW current_client_profiles AS
SELECT
    cp.id AS profile_id,
    cp.client_id,
    c.name AS client_name,
    c.status AS client_status,
    cp.org_id,
    o.name AS org_name,
    cp.company_name,
    cp.industry,
    cp.industry_segment,
    cp.company_size,
    cp.employee_count,
    cp.version,
    cp.created_at,
    cp.updated_at,

    -- Session stats
    (SELECT COUNT(*) FROM align120_sessions WHERE company_profile_id = cp.id) AS total_sessions,
    (SELECT COUNT(*) FROM align120_sessions WHERE company_profile_id = cp.id AND status = 'completed') AS completed_sessions,
    (SELECT MAX(created_at) FROM align120_sessions WHERE company_profile_id = cp.id) AS last_session_at,

    -- Assessment scores (from most recent completed session)
    (SELECT overall_score FROM ai_maturity_assessments WHERE company_profile_id = cp.id ORDER BY created_at DESC LIMIT 1) AS maturity_score,
    (SELECT overall_readiness_score FROM team_readiness_assessments WHERE company_profile_id = cp.id ORDER BY created_at DESC LIMIT 1) AS readiness_score

FROM company_profiles cp
JOIN clients c ON cp.client_id = c.id
LEFT JOIN organizations o ON cp.org_id = o.id
WHERE cp.status = 'active'
AND c.status != 'archived';

COMMENT ON VIEW current_client_profiles IS 'Current active profile for each client with session and assessment stats';

GRANT SELECT ON current_client_profiles TO authenticated;
GRANT SELECT ON current_client_profiles TO service_role;


-- ============================================
-- 8. DATA MIGRATION: LINK ORPHANED PROFILES
-- ============================================

-- Function to migrate existing profiles to clients based on session data
CREATE OR REPLACE FUNCTION migrate_profiles_to_clients()
RETURNS TABLE (
    profiles_linked INTEGER,
    sessions_updated INTEGER,
    conflicts_found INTEGER
) AS $$
DECLARE
    v_profiles_linked INTEGER := 0;
    v_sessions_updated INTEGER := 0;
    v_conflicts INTEGER := 0;
    v_row_count INTEGER := 0;
    v_session RECORD;
    v_existing_profile_id UUID;
BEGIN
    -- Find sessions with client_id but profile not linked to client
    FOR v_session IN
        SELECT DISTINCT ON (s.client_id)
            s.client_id,
            s.org_id,
            s.company_profile_id,
            s.company_name,
            s.user_id,
            cp.client_id AS profile_client_id
        FROM align120_sessions s
        LEFT JOIN company_profiles cp ON s.company_profile_id = cp.id
        WHERE s.client_id IS NOT NULL
        AND s.company_profile_id IS NOT NULL
        AND (cp.client_id IS NULL OR cp.client_id != s.client_id)
        ORDER BY s.client_id, s.created_at DESC
    LOOP
        -- Check if client already has a profile
        SELECT id INTO v_existing_profile_id
        FROM company_profiles
        WHERE client_id = v_session.client_id
        AND status != 'archived'
        LIMIT 1;

        IF v_existing_profile_id IS NOT NULL THEN
            -- Client already has a profile - conflict
            v_conflicts := v_conflicts + 1;

            -- Update sessions to use the existing client profile
            UPDATE align120_sessions
            SET company_profile_id = v_existing_profile_id
            WHERE client_id = v_session.client_id
            AND company_profile_id != v_existing_profile_id;

            GET DIAGNOSTICS v_row_count = ROW_COUNT;
            v_sessions_updated := v_sessions_updated + v_row_count;
        ELSE
            -- Link this profile to the client
            UPDATE company_profiles
            SET
                client_id = v_session.client_id,
                org_id = COALESCE(org_id, v_session.org_id),
                updated_at = NOW()
            WHERE id = v_session.company_profile_id;

            v_profiles_linked := v_profiles_linked + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_profiles_linked, v_sessions_updated, v_conflicts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_profiles_to_clients IS 'One-time migration to link existing profiles to clients based on session data. Run after applying this schema.';

-- Note: To run the migration, execute:
-- SELECT * FROM migrate_profiles_to_clients();


-- ============================================
-- 9. VALIDATION FUNCTION
-- ============================================

-- Function to validate client-profile integrity
CREATE OR REPLACE FUNCTION validate_client_profiles()
RETURNS TABLE (
    issue_type TEXT,
    client_id UUID,
    client_name TEXT,
    profile_count INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Find clients with multiple active profiles (shouldn't happen with constraint)
    RETURN QUERY
    SELECT
        'MULTIPLE_PROFILES'::TEXT,
        c.id,
        c.name,
        COUNT(cp.id)::INTEGER,
        'Client has multiple active profiles'::TEXT
    FROM clients c
    JOIN company_profiles cp ON cp.client_id = c.id AND cp.status != 'archived'
    GROUP BY c.id, c.name
    HAVING COUNT(cp.id) > 1;

    -- Find clients with no profile
    RETURN QUERY
    SELECT
        'NO_PROFILE'::TEXT,
        c.id,
        c.name,
        0::INTEGER,
        'Client has no company profile'::TEXT
    FROM clients c
    LEFT JOIN company_profiles cp ON cp.client_id = c.id AND cp.status != 'archived'
    WHERE cp.id IS NULL
    AND c.status = 'active';

    -- Find sessions with client but no profile link
    RETURN QUERY
    SELECT
        'ORPHAN_SESSION'::TEXT,
        s.client_id,
        c.name,
        COUNT(s.id)::INTEGER,
        'Sessions with client but no profile'::TEXT
    FROM align120_sessions s
    JOIN clients c ON s.client_id = c.id
    WHERE s.client_id IS NOT NULL
    AND s.company_profile_id IS NULL
    GROUP BY s.client_id, c.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_client_profiles IS 'Validates client-profile integrity and reports any issues';

GRANT EXECUTE ON FUNCTION validate_client_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_client_profiles() TO service_role;


-- ============================================
-- 10. RLS POLICIES FOR NEW VIEWS
-- ============================================

-- Views inherit RLS from underlying tables, but we can add explicit grants
-- for service role access to ensure they work properly

-- Note: Views don't need RLS directly - they use the RLS of underlying tables
-- The GRANT SELECT statements above handle access control

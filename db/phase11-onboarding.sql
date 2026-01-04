-- ============================================
-- Insight 360 - Phase 11: Onboarding System
-- User onboarding state tracking and profile extensions
-- Version: 1.0
-- Date: January 2026
-- ============================================

-- ============================================
-- PART 1: EXTEND USERS TABLE
-- Add profile fields for onboarding
-- ============================================

-- Add avatar and department to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.avatar_url IS 'URL or emoji for user avatar';
COMMENT ON COLUMN users.department_id IS 'Primary department for the user';

-- Create index for department lookups
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

-- ============================================
-- PART 2: ONBOARDING STATE TABLE
-- Track user progress through onboarding
-- ============================================

CREATE TABLE IF NOT EXISTS onboarding_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Overall status
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),

    -- Step tracking
    current_step INTEGER DEFAULT 0,
    completed_steps TEXT[] DEFAULT '{}',

    -- Individual milestone tracking
    profile_completed BOOLEAN DEFAULT false,
    tour_completed BOOLEAN DEFAULT false,
    first_workflow_completed BOOLEAN DEFAULT false,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_dismissed_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One onboarding record per user
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_state(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_onboarding_state_updated_at ON onboarding_state;
CREATE TRIGGER update_onboarding_state_updated_at
    BEFORE UPDATE ON onboarding_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE onboarding_state IS 'Tracks user progress through the onboarding wizard';

-- ============================================
-- PART 3: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

-- Users can only see their own onboarding state
CREATE POLICY "Users can view own onboarding state" ON onboarding_state
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding state" ON onboarding_state
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding state" ON onboarding_state
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- PART 4: HELPER FUNCTION
-- Get or create onboarding state for user
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_onboarding_state(p_user_id UUID)
RETURNS onboarding_state AS $$
DECLARE
    v_state onboarding_state;
BEGIN
    -- Try to get existing state
    SELECT * INTO v_state
    FROM onboarding_state
    WHERE user_id = p_user_id;

    -- If not found, create new
    IF NOT FOUND THEN
        INSERT INTO onboarding_state (user_id, status, current_step)
        VALUES (p_user_id, 'not_started', 0)
        RETURNING * INTO v_state;
    END IF;

    RETURN v_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ONBOARDING SCHEMA CREATED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'New Table:';
    RAISE NOTICE '  - onboarding_state (user onboarding progress)';
    RAISE NOTICE '';
    RAISE NOTICE 'Users Table Extensions:';
    RAISE NOTICE '  - avatar_url (profile image/emoji)';
    RAISE NOTICE '  - department_id (user primary department)';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Function:';
    RAISE NOTICE '  - get_or_create_onboarding_state(user_id)';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;

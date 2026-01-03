-- ============================================
-- Insight 360 - Sync Users Migration
-- Version: 1.0
-- Description: Syncs users from auth.users to public.users table
-- ============================================

-- Sync all users from auth.users to public.users
-- This ensures any user who has logged in via Supabase Auth
-- has a corresponding row in the public.users table

INSERT INTO public.users (id, email, display_name, role, created_at, updated_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    COALESCE(
        (SELECT role FROM public.users WHERE id = au.id),
        'user'
    ) as role,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Create a trigger to auto-sync new users from auth.users to public.users
-- This ensures future signups are automatically added to public.users

-- First, create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'user',
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verification
DO $$
DECLARE
    auth_count INTEGER;
    public_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    SELECT COUNT(*) INTO public_count FROM public.users;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'USER SYNC COMPLETED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Users in auth.users: %', auth_count;
    RAISE NOTICE 'Users in public.users: %', public_count;
    RAISE NOTICE '';
    RAISE NOTICE 'A trigger has been created to auto-sync new users.';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;

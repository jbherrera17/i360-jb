# Production Bug Fixes - January 10, 2026

## Critical P1 Bugs Identified

Total: 13 P1 bugs found in Bug Tracker
Status: Most are "Reopened" indicating previous fixes didn't work

## Root Cause Analysis

### Primary Issue: RLS Policies Not Applied to Database

**Status**: SUPABASE_SERVICE_KEY is already set in Railway ✓

**Problem**: The RLS policy fix SQL files exist in the codebase but have **not been executed** against the Supabase database. The database still has the old restrictive policies that block server operations.

**Evidence**:
- Multiple "row violates row-level security policy" errors across different tables
- Errors persist even though SERVICE_KEY is configured
- SQL fix files exist but show no deployment/migration history
- Files created: `db/phase3.2-fix-all-rls-bugs.sql` (Jan 10) and `db/fix-rls-production-bugs.sql` (Jan 10)

**Solution**: Apply the RLS fix SQL to the Supabase database

### How to Apply the Fix

**Location**: [db/phase3.2-fix-all-rls-bugs.sql](db/phase3.2-fix-all-rls-bugs.sql)

**Problem**: RLS policy fix SQL files exist but haven't been applied to production database

**Solution**: Apply the comprehensive RLS fix SQL to Supabase

## Bug-by-Bug Breakdown

### 1. Align120NewStartSessionError (CRITICAL)
**Status**: Reopened
**Module**: Align 120
**Error**: "new row violates row-level security policy for table 'align120_sessions'"

**Code Location**: [server/routes/align120.js:84-118](server/routes/align120.js#L84-L118)

**Root Cause**:
- Server using anon key instead of service key
- RLS policy blocking INSERT even though code is correct

**Fix Applied**:
- Created RLS policy in phase3.2-fix-all-rls-bugs.sql
- Policy allows INSERT when `auth.uid() = user_id OR auth.role() = 'service_role'`

**Action Required**:
1. Set SUPABASE_SERVICE_KEY environment variable
2. OR apply RLS SQL fix to database

### 2. StrategyS2EUnabletoSaveandContinue (CRITICAL)
**Status**: Reopened
**Module**: Strategy (S2E)
**Error**: "invalid input syntax for type uuid: 'null'"

**Root Cause**: Same as #1 - RLS blocking INSERT to strategic_foundations table

**Fix Applied**: RLS policy in phase3.2-fix-all-rls-bugs.sql

### 3. ContextAssetDeletionNotWorking (HIGH)
**Status**: Reopened
**Module**: Context Assets
**Issue**: "Content deleted but record name remains"

**Code Location**: [server/routes/context.js:453-504](server/routes/context.js#L453-L504)

**Analysis**:
- Frontend correctly calls hard delete with `?hard=true` (context.js:525)
- Backend delete route is properly implemented
- Soft delete: sets `is_current: false`
- Hard delete: removes from database
- Frontend correctly filters by `current: true` when loading

**Root Cause**:
- Hard delete is being blocked by RLS policy
- Database record remains because DELETE operation fails silently or returns error

**Fix Applied**:
- RLS policy in phase3.2-fix-all-rls-bugs.sql allows DELETE when `auth.uid() = user_id`
- Policy also allows service role full access

**Action Required**:
1. Set SUPABASE_SERVICE_KEY (preferred)
2. OR apply RLS fix

### 4. Context Asset Creation (HIGH)
**Status**: Reopened
**Issue**: Non-technical users need markdown editor

**Previous Fix**: Changed UI to make markdown editor primary interface (completed in previous session)

**Why Reopened**: User (JA) encountered same issue on Windows/Edge on 01-10-26

**Possible Causes**:
1. Fix wasn't deployed to production
2. Browser cache showing old version
3. Different issue than originally reported

**Action Required**: Verify deployment and clear browser cache

### 5. Context Asset Editing (CRITICAL)
**Status**: Reopened
**Issue**: No edit capability after creation

**Previous Fix**: Made markdown editor editable (completed in previous session)

**Why Reopened**: Same as #4

**Action Required**: Verify deployment

### 6. PromptTransformerNotSavingProperly (HIGH)
**Status**: Reopened
**Module**: Prompt Transformer
**Error**: "Authentication required to save transformations. Please log in"

**Analysis**: User is already logged in but getting auth error

**Possible Causes**:
1. Session token expired
2. Auth middleware not recognizing session
3. RLS policy blocking save

**Action Required**: Investigate prompt transformer auth flow

### 7-9. ParthenonDept* (Multiple Department Issues)
- **ParthenonDeptAddSaveError** (Closed): RLS violation when adding departments
- **ParthenonDeptDeleteNotWorking** (New): Delete vs deactivate confusion

**Root Cause**: RLS policies for departments table

**Fix Applied**: Covered in phase3.1-fix-departments-rls.sql but may need service key

### 10-11. Align120/Chat Previous Sessions Incorrect (Resolved)
**Status**: Resolved
**Issue**: Previous sessions showing for wrong users

**Root Cause**: Missing user_id filter in queries

### 12. WorkFlowBuilderHelp* (Resolved/New)
- Help content loading issues
- Help content doesn't match UI

## Deployment Checklist

### Immediate Actions (Required)

- [x] **SUPABASE_SERVICE_KEY already set in Railway** ✓

- [ ] **Apply RLS fixes to Supabase database** (CRITICAL)
  - **Method 1 (Recommended)**: Via Supabase Dashboard
    1. Go to https://supabase.com/dashboard → Your Project → SQL Editor
    2. Click "New Query"
    3. Copy entire contents of `db/phase3.2-fix-all-rls-bugs.sql`
    4. Paste and click "Run"
    5. Verify no errors

  - **Method 2**: Via deployment script
    ```bash
    ./scripts/deploy-rls-fixes.sh
    ```
    This will guide you through the process and copy SQL to clipboard

  - **Method 3**: Via Supabase CLI (if installed)
    ```bash
    supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < db/phase3.2-fix-all-rls-bugs.sql
    ```

- [ ] **Test all P1 bugs** after applying SQL

### Verification Steps

- [ ] Test Align 120 session creation
- [ ] Test Strategy (S2E) save and continue
- [ ] Test Context Asset deletion (hard delete)
- [ ] Test Parthenon department creation
- [ ] Test all reopened bugs

### Optional (If Service Key Doesn't Work)

- [ ] Debug JWT token flow
- [ ] Verify auth.uid() matches user_id in database
- [ ] Check auth middleware configuration

## SQL Deployment Instructions

### Connect to Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `db/phase3.2-fix-all-rls-bugs.sql`
4. Execute query
5. Verify no errors
6. Run verification query at end of file to see updated policies

### Alternative: Supabase CLI

```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" < db/phase3.2-fix-all-rls-bugs.sql
```

## Long-term Recommendations

1. **Use Service Key for Server Operations**: Always use SUPABASE_SERVICE_KEY on server to bypass RLS
2. **RLS for Client-side Only**: Design RLS policies for direct client-side access, not server routes
3. **Automated Testing**: Add integration tests that verify RLS policies don't block server operations
4. **Environment Validation**: Add startup check to warn if SERVICE_KEY is missing in production
5. **Deployment Automation**: Include SQL migrations in CI/CD pipeline

## Files Modified/Created

1. `db/phase3.2-fix-all-rls-bugs.sql` - Comprehensive RLS fixes
2. `PRODUCTION_BUG_FIXES.md` - This document
3. Previous fixes (already deployed):
   - `public/context.html` - UI redesign
   - `public/js/context.js` - Markdown editor functionality
   - `server/routes/context.js` - Version history fix

## Next Steps

1. **Immediate**: Set SUPABASE_SERVICE_KEY in production `.env`
2. **Within 24h**: Apply phase3.2-fix-all-rls-bugs.sql to database
3. **Verification**: Test all 13 P1 bugs
4. **Update Notion**: Mark bugs as "Ready for Testing" once deployed
5. **Monitor**: Watch for any new RLS-related errors in logs

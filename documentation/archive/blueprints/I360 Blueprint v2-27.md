# Insight 360 Blueprint v2.27

**Version:** 2.27
**Date:** January 2, 2026
**Status:** Phase 9 | Security Fixes & Production Hardening

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.27

### Phase 9: Security Fixes & Production Hardening

Phase 9 focuses on addressing critical security vulnerabilities, bug fixes, and production readiness improvements identified during the security audit.

---

### Security Fixes (Critical)

#### Authentication Bypass Fix (BUG-001)

Fixed development mode auto-authentication that could bypass security when `NODE_ENV` is unset.

**Before (Vulnerable):**
```javascript
// Any non-production environment bypassed auth
if (process.env.NODE_ENV !== 'production') {
    // Auto-authenticate
}
```

**After (Fixed):**
```javascript
// Requires BOTH development mode AND explicit bypass flag
if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
    // Auto-authenticate (development only)
}
```

**Files:** `server/middleware/auth.js` (lines 104-110, 137-145, 199-206)

---

#### ReDoS Vulnerability Fix (BUG-008)

Added protection against Regular Expression Denial of Service attacks in context injection.

```javascript
// New security functions in contextInjection.js
function isReDoSVulnerable(pattern) {
    // Detects dangerous patterns: nested quantifiers, overlapping alternations
    const dangerousPatterns = [
        /\([^)]*\+[^)]*\)\+/,    // (a+)+
        /\([^)]*\*[^)]*\)\*/,    // (a*)*
        /\([^)]*\?\)[+*]/,       // (a?)+
    ];
    return dangerousPatterns.some(p => p.test(pattern));
}

function safeRegexTest(pattern, input, maxLength = 10000) {
    if (input.length > maxLength) return false;
    if (isReDoSVulnerable(pattern)) throw new Error('Potentially dangerous regex pattern');
    // ... safe execution
}
```

**File:** `server/services/contextInjection.js`

---

#### XSS Sanitization (BUG-009)

Added HTML escaping functions to prevent Cross-Site Scripting attacks.

```javascript
// Added to navigation.js and help-modal.js
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
```

**Protections Added:**
- Sanitized user-generated content before innerHTML insertion
- Blocked `javascript:` URLs in links
- Escaped special characters in dynamic content

**Files:** `public/js/navigation.js`, `public/js/help-modal.js`

---

#### Rate Limit Memory Bounds (BUG-004)

Added memory management for the in-memory rate limiting Map to prevent unbounded growth.

```javascript
// server/middleware/auth.js
const MAX_ENTRIES = 10000;

// Periodic cleanup every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitMap) {
        if (now - data.timestamp > 60000) {
            rateLimitMap.delete(key);
        }
    }
    // Enforce max entries
    if (rateLimitMap.size > MAX_ENTRIES) {
        const entriesToDelete = rateLimitMap.size - MAX_ENTRIES;
        let deleted = 0;
        for (const key of rateLimitMap.keys()) {
            if (deleted >= entriesToDelete) break;
            rateLimitMap.delete(key);
            deleted++;
        }
    }
}, 300000);
```

---

### Bug Fixes (High Priority)

#### Action Execution Implementation (BUG-005)

Replaced placeholder mock data with real AI-powered action execution.

```javascript
// server/routes/actions.js - executeActionNow()
const result = await anthropicService.chat({
    message: actionPrompt,
    systemPrompt: 'You are an AI action executor...',
    model: 'claude-3-5-sonnet-20241022'
});
```

---

#### Date Math Fix (BUG-006)

Fixed fragile implicit Date coercion in action duration calculation.

```javascript
// Before (fragile)
const duration = (endTime - startTime) / 1000;

// After (explicit)
const duration = (endTime.getTime() - startTime.getTime()) / 1000;
```

---

#### Pagination Bounds Validation (BUG-007)

Added maximum limit enforcement and NaN handling for pagination.

```javascript
// server/routes/actions.js
const MAX_LIMIT = 100;
const MAX_FEATURED_LIMIT = 20;

const limit = Math.min(
    Math.max(1, parseInt(req.query.limit) || 20),
    MAX_LIMIT
);
```

---

### User Management Enhancements

#### RLS Policy Fix (Database)

Fixed infinite recursion in Row Level Security policies that prevented admin role loading.

**Problem:** The admin check policy queried the same `users` table it was protecting, causing infinite recursion.

**Solution:** Created a `SECURITY DEFINER` function to bypass RLS during admin checks.

```sql
-- db/migration-users-rls-fix-v2.sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND role = 'admin'
    );
$$;

-- Updated policies use this function
CREATE POLICY "users_update_own_or_admin" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin(auth.uid()));
```

---

#### User Sync Functionality

Added ability to sync users from `auth.users` to `public.users` table.

**Endpoint:** `POST /api/auth/sync-users` (Admin only)

**Features:**
- Identifies users in auth.users not in public.users
- Creates missing public.users records
- Preserves existing user data during sync

---

#### Password Reset Role Preservation

Fixed password reset flow to preserve existing user roles.

```javascript
// server/routes/auth.js
const { data: existingUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

// Preserve existing role on upsert
role: existingUser?.role || 'user'
```

---

### UI Improvements

#### Roadmap Modal Markdown Parser

Improved markdown parser for the roadmap modal with better support for:
- Tables with proper header/body separation
- Task lists (`- [x]` and `- [ ]`)
- Nested list items
- Bold/italic text spanning multiple elements

```javascript
// Improved table parsing
const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n)+)/g;
html = html.replace(tableRegex, (match, tableBlock) => {
    const rows = tableBlock.trim().split('\n');
    let tableHtml = '<table>';
    // ... proper thead/tbody generation
});
```

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `db/migration-security-fixes.sql` | Security-related database migrations |
| `db/migration-sync-users.sql` | User sync migration scripts |
| `db/migration-users-rls-fix.sql` | Initial RLS fix attempt |
| `db/migration-users-rls-fix-v2.sql` | Final RLS fix with SECURITY DEFINER |
| `documentation/I360-ROADMAP.md` | Production readiness roadmap |

### Modified Files

| File | Changes |
|------|---------|
| `server/middleware/auth.js` | Auth bypass fix, rate limit bounds |
| `server/routes/auth.js` | Debug endpoint, role preservation, user sync |
| `server/routes/actions.js` | Pagination validation, action execution |
| `server/routes/agents.js` | User ID standardization |
| `server/services/contextInjection.js` | ReDoS protection |
| `server/index.js` | Service key warning |
| `public/js/navigation.js` | XSS sanitization |
| `public/js/help-modal.js` | XSS sanitization |
| `public/admin.html` | Markdown parser improvements |

---

## Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Authentication bypass | Fixed | Requires explicit DEV_AUTH_BYPASS |
| ReDoS vulnerability | Fixed | Pattern detection + input limits |
| XSS sanitization | Fixed | escapeHTML() in frontend |
| Rate limit memory | Fixed | Periodic cleanup + MAX_ENTRIES |
| RLS infinite recursion | Fixed | SECURITY DEFINER function |
| Pagination bounds | Fixed | MAX_LIMIT enforcement |
| Date math | Fixed | Explicit .getTime() calls |
| Action execution | Fixed | Real AI implementation |

---

## Production Readiness Score

**Updated Score: 5.8/10** (improved from 5.4/10)

| Area | Previous | Current | Change |
|------|----------|---------|--------|
| Architecture | 7/10 | 7/10 | - |
| Security | 6/10 | 7/10 | +1 |
| Error Handling | 7/10 | 7/10 | - |
| Database | 6/10 | 6.5/10 | +0.5 |
| Testing | 0/10 | 0/10 | - |
| Observability | 1/10 | 1.5/10 | +0.5 |
| Documentation | 5/10 | 5.5/10 | +0.5 |

---

## Next Steps (Phase 10)

- [ ] Implement proper JWT validation with expiration
- [ ] Add refresh token rotation
- [ ] Strengthen password requirements
- [ ] Add Zod/Joi schema validation to endpoints
- [ ] Implement comprehensive test suite
- [ ] Add structured logging with Winston/Pino

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.27 | Jan 2, 2026 | Security fixes, RLS policy fix, user management |
| v2.26 | Jan 2, 2026 | Navigation redesign, UI consistency |
| v2.25 | Jan 1, 2026 | Help system & documentation hub |
| v2.24 | Jan 1, 2026 | User management & RBAC |
| v2.23 | Dec 31, 2025 | Strategy 120 enhancements |

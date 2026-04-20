-- REQ-002a Step 6: Rename platform_modules nav labels for the Chat Support System.
-- Run in Supabase SQL Editor. Idempotent — safe to re-run.
--
-- Source of truth: platform_modules.name is what the sidebar renders (see
-- public/js/navigation.js line ~196). JS does not need changes; this SQL does.

UPDATE platform_modules
SET name = 'Chat Support System Settings'
WHERE id = 'embeddable_chat';

UPDATE platform_modules
SET name = 'Support System Dashboard'
WHERE id = 'support_ai';

-- Verify (optional):
SELECT id, name, route_path FROM platform_modules
WHERE id IN ('embeddable_chat', 'support_ai');

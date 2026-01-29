-- ===========================================
-- PHASE 49: Integration Addon Pricing Per Tier
-- ===========================================
-- Moves integration addon pricing from hardcoded provider values
-- to admin-configurable per-tier settings.

-- Add integration_addons JSONB column to subscription_tiers
-- Structure:
-- {
--   "productivity": { "monthly_price": 99, "api_call_limit": 10000, "user_limit": 10 },
--   "client_system": { "monthly_price": 299, "api_call_limit": 50000, "user_limit": 25 }
-- }
ALTER TABLE subscription_tiers
ADD COLUMN IF NOT EXISTS integration_addons JSONB DEFAULT '{}'::jsonb;

-- Seed default addon pricing per tier
UPDATE subscription_tiers SET integration_addons = '{
  "productivity": { "monthly_price": 0, "api_call_limit": 0, "user_limit": 0 },
  "client_system": { "monthly_price": 0, "api_call_limit": 0, "user_limit": 0 }
}'::jsonb WHERE id = 'starter';

UPDATE subscription_tiers SET integration_addons = '{
  "productivity": { "monthly_price": 49, "api_call_limit": 5000, "user_limit": 5 },
  "client_system": { "monthly_price": 149, "api_call_limit": 10000, "user_limit": 10 }
}'::jsonb WHERE id = 'business';

UPDATE subscription_tiers SET integration_addons = '{
  "productivity": { "monthly_price": 99, "api_call_limit": 25000, "user_limit": 50 },
  "client_system": { "monthly_price": 299, "api_call_limit": 100000, "user_limit": 100 }
}'::jsonb WHERE id = 'enterprise';

UPDATE subscription_tiers SET integration_addons = '{
  "productivity": { "monthly_price": 99, "api_call_limit": 50000, "user_limit": 50 },
  "client_system": { "monthly_price": 299, "api_call_limit": 200000, "user_limit": 200 }
}'::jsonb WHERE id = 'agency';

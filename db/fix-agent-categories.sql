-- Fix invalid agent categories
-- Maps old categories to valid master list categories

-- brand -> content
UPDATE agents SET category = 'content' WHERE category = 'brand';

-- customer_perspective -> sales
UPDATE agents SET category = 'sales' WHERE category = 'customer_perspective';

-- decision_support -> strategy
UPDATE agents SET category = 'strategy' WHERE category = 'decision_support';

-- financial_perspective -> analysis
UPDATE agents SET category = 'analysis' WHERE category = 'financial_perspective';

-- fundamentals -> strategy
UPDATE agents SET category = 'strategy' WHERE category = 'fundamentals';

-- intelligence -> research
UPDATE agents SET category = 'research' WHERE category = 'intelligence';

-- investment -> analysis
UPDATE agents SET category = 'analysis' WHERE category = 'investment';

-- learning_perspective -> productivity
UPDATE agents SET category = 'productivity' WHERE category = 'learning_perspective';

-- marketing -> content
UPDATE agents SET category = 'content' WHERE category = 'marketing';

-- orchestration -> operations
UPDATE agents SET category = 'operations' WHERE category = 'orchestration';

-- planning -> strategy
UPDATE agents SET category = 'strategy' WHERE category = 'planning';

-- platform -> operations
UPDATE agents SET category = 'operations' WHERE category = 'platform';

-- process_perspective -> operations
UPDATE agents SET category = 'operations' WHERE category = 'process_perspective';

-- upskilling -> productivity
UPDATE agents SET category = 'productivity' WHERE category = 'upskilling';

-- Verify no invalid categories remain
SELECT category, COUNT(*) as count
FROM agents
WHERE category NOT IN ('research', 'productivity', 'communication', 'strategy', 'development', 'governance', 'analysis', 'content', 'sales', 'operations', 'custom')
GROUP BY category;

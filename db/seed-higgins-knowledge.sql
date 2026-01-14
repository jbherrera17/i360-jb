-- ============================================================
-- INSIGHT 360 - HIGGINS KNOWLEDGE BASE
-- i360 System Knowledge Context Assets for Higgins AI Assistant
-- Run this AFTER phase3-complete-schema.sql and seed-asset-types.sql
-- ============================================================

-- ============================================================
-- SECTION 1: ADD i360_knowledge ASSET TYPE
-- ============================================================

INSERT INTO context_asset_types (type_key, display_name, description, icon, sort_order, json_schema) VALUES
('i360_knowledge', 'i360 System Knowledge', 'Documentation and conceptual knowledge about Insight 360 modules and architecture', '🎓', 5,
'{
  "type": "object",
  "properties": {
    "knowledge_type": {"type": "string", "enum": ["overview", "module", "concept", "workflow", "how-to"]},
    "audience": {"type": "string", "enum": ["admin", "user", "all"]},
    "module_name": {"type": "string"},
    "summary": {"type": "string"},
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "heading": {"type": "string"},
          "content": {"type": "string"},
          "examples": {"type": "array", "items": {"type": "string"}}
        }
      }
    },
    "related_modules": {"type": "array", "items": {"type": "string"}},
    "key_concepts": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["knowledge_type", "audience", "summary"]
}'::jsonb)
ON CONFLICT (type_key) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    json_schema = EXCLUDED.json_schema;

-- ============================================================
-- SECTION 2: USER-LEVEL KNOWLEDGE (For All Users)
-- ============================================================

-- Asset 1: i360 User Guide Overview
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags, version, is_current
) VALUES (
    'ca100001-0000-4000-a000-000000000001',
    NULL,
    'i360_knowledge',
    'i360 User Guide Overview',
    'How to use Insight 360 effectively - getting started guide for all users',
    '{
        "knowledge_type": "overview",
        "audience": "all",
        "summary": "Insight 360 helps you work with AI assistants that understand your organization. You can chat with different AI models, use specialized agents for specific tasks, and provide context about your business to get better, more relevant results.",
        "sections": [
            {
                "heading": "What is Insight 360?",
                "content": "Insight 360 is a values-based AI command center. It brings together multiple AI models (Claude, GPT, Perplexity) and gives them knowledge about your organization so they can help you more effectively. Think of it as AI that actually understands your business.",
                "examples": []
            },
            {
                "heading": "The Three Pillars: Align, Strategy, Execute",
                "content": "Insight 360 is organized around three pillars. Align 120 helps establish your organizational foundation - values, voice, and identity. Strategy 120 helps with planning, research, and decision-making. Execute 120 helps you take action - creating content, managing communications, and getting things done.",
                "examples": []
            },
            {
                "heading": "Key Features Overview",
                "content": "Higgins Chat: Talk with AI models, switch between Claude and GPT, use voice input, upload files for analysis. Agent Library: Find specialized AI assistants for specific tasks like writing, research, or strategy. Context Assets: Store information about your company, brand voice, and customers so AI can use it. Dashboards: Track your work and see system status at a glance.",
                "examples": []
            },
            {
                "heading": "Getting Help",
                "content": "You can ask Higgins (that is me!) any question about how to use Insight 360. I know the system well and can guide you through features, explain concepts, or help you accomplish specific tasks. Just ask!",
                "examples": ["How do I create an agent?", "What is a context asset?", "How do I switch AI models?"]
            }
        ],
        "related_modules": ["Higgins", "Agent Library", "Context Assets", "Dashboard"],
        "key_concepts": ["three pillars", "agents", "context assets", "multi-LLM"]
    }'::jsonb,
    'INSIGHT 360 USER GUIDE

WHAT IS INSIGHT 360?
Insight 360 is a values-based AI command center that brings together multiple AI models (Claude, GPT, Perplexity) with organizational knowledge. It helps AI understand your business so it can help you more effectively.

THE THREE PILLARS
- Align 120: Establish organizational foundation (values, voice, identity)
- Strategy 120: Planning, research, and decision-making
- Execute 120: Take action (content, communications, delivery)

KEY FEATURES
- Higgins Chat: Multi-model AI chat with voice and file support
- Agent Library: Specialized AI assistants for specific tasks
- Context Assets: Store company info, brand voice, customer profiles
- Dashboards: Track work and system status

GETTING HELP
Ask Higgins any question about using Insight 360. Higgins knows the system and can guide you through features or help accomplish tasks.',
    'public',
    ARRAY['higgins', 'user', 'guide', 'getting-started'],
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- Asset 2: i360 Feature How-To Guide
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags, version, is_current
) VALUES (
    'ca100001-0000-4000-a000-000000000002',
    NULL,
    'i360_knowledge',
    'i360 Feature How-To Guide',
    'Step-by-step guidance for using Insight 360 features',
    '{
        "knowledge_type": "how-to",
        "audience": "all",
        "summary": "Practical guidance for using Insight 360 features including chat, agents, context assets, and more.",
        "sections": [
            {
                "heading": "Using Higgins Chat",
                "content": "Open Higgins from the sidebar navigation. Select your preferred AI model from the dropdown (Claude Sonnet is recommended for most tasks, Opus for complex reasoning). Type your message and press Enter or click Send. Enable Web Search toggle to include current information from the internet. Use the voice button to speak instead of type. Upload files by clicking the attachment icon - Higgins can analyze images, PDFs, and documents.",
                "examples": ["Select Claude Sonnet 4.5 for balanced performance", "Enable web search when asking about current events", "Upload a PDF for analysis and summary"]
            },
            {
                "heading": "Working with Agents",
                "content": "Open Agent Library from the sidebar. Browse agents by category (content, research, strategy) or search by name. Click an agent to see its description and capabilities. Click Execute or Chat to start a conversation with that agent. Each agent has specialized knowledge and a specific purpose - the Content Writer helps with copywriting, the Research Agent helps gather information, etc.",
                "examples": ["Use Content Writer for blog posts and articles", "Use Research Agent for market analysis", "Use Strategy agents for planning sessions"]
            },
            {
                "heading": "Creating and Using Context Assets",
                "content": "Open Context Assets from the sidebar. Click Create New to add organizational knowledge. Choose an asset type (Company Description, VoiceDNA, ICP, etc.). Fill in the structured fields with your information. Save the asset - it becomes available for agents to use. Map assets to specific agents to give them that knowledge automatically.",
                "examples": ["Create VoiceDNA to define your brand voice", "Create ICP to describe your ideal customers", "Map Company Description to all customer-facing agents"]
            },
            {
                "heading": "Managing Conversations",
                "content": "Your chat history is saved automatically. Use the History panel on the right to see past conversations. Click a conversation to reload it. Start a new conversation with the New Chat button. Conversations are private to your account.",
                "examples": []
            },
            {
                "heading": "Voice Features",
                "content": "Click the microphone icon to speak your message. Select a voice profile for AI responses (Nova, Alloy, Echo, etc.). Enable auto-play to hear responses automatically. Voice works best in a quiet environment with a good microphone.",
                "examples": []
            },
            {
                "heading": "Switching AI Models",
                "content": "Use the model dropdown at the top of chat. Claude models: Opus (most capable, complex tasks), Sonnet (balanced, recommended), Haiku (fast, simple tasks). GPT models: GPT-4o (multimodal), o1 (reasoning). Perplexity: Built-in web search. You can switch models mid-conversation - the new model will have context from previous messages.",
                "examples": ["Use Opus for strategic planning", "Use Haiku for quick questions", "Use Perplexity for research with citations"]
            }
        ],
        "related_modules": ["Higgins", "Agent Library", "Context Assets"],
        "key_concepts": ["model selection", "agents", "context assets", "voice", "file upload"]
    }'::jsonb,
    'INSIGHT 360 FEATURE HOW-TO GUIDE

USING HIGGINS CHAT
1. Select AI model from dropdown (Claude Sonnet recommended)
2. Type message and press Enter
3. Enable Web Search for current information
4. Use voice button to speak instead of type
5. Upload files via attachment icon

WORKING WITH AGENTS
1. Open Agent Library from sidebar
2. Browse by category or search
3. Click agent to see details
4. Click Execute/Chat to start conversation
Agents: Content Writer (copywriting), Research Agent (analysis), Strategy agents (planning)

CREATING CONTEXT ASSETS
1. Open Context Assets from sidebar
2. Click Create New
3. Choose asset type (Company Description, VoiceDNA, ICP, etc.)
4. Fill in fields and save
5. Map to agents for automatic injection

MANAGING CONVERSATIONS
- History auto-saved in right panel
- Click conversation to reload
- New Chat button starts fresh

VOICE FEATURES
- Microphone icon to speak
- Select voice profile for responses
- Enable auto-play for audio responses

SWITCHING AI MODELS
- Claude Opus: Most capable, complex tasks
- Claude Sonnet: Balanced, recommended
- Claude Haiku: Fast, simple tasks
- GPT-4o: Multimodal
- Perplexity: Built-in web search
Switch mid-conversation - new model has full context.',
    'public',
    ARRAY['higgins', 'user', 'how-to', 'features'],
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- SECTION 3: ADMIN-LEVEL KNOWLEDGE (For Administrators)
-- ============================================================

-- Asset 3: i360 System Architecture (Admin)
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags, version, is_current
) VALUES (
    'ca100001-0000-4000-a000-000000000003',
    NULL,
    'i360_knowledge',
    'i360 System Architecture (Admin)',
    'Complete architectural overview of Insight 360 for administrators',
    '{
        "knowledge_type": "overview",
        "audience": "admin",
        "summary": "Insight 360 is a values-based AI command center built on three pillars: Align 120 (foundation and values alignment), Strategy 120 (planning and research), and Execute 120 (action and delivery). The system uses a database-centric architecture with multi-LLM orchestration.",
        "sections": [
            {
                "heading": "Core Architecture",
                "content": "i360 follows a database-centric architecture with Node.js/Express REST API connecting to Supabase PostgreSQL for persistence. External LLM APIs (Anthropic Claude, OpenAI GPT, Perplexity) provide intelligence. The frontend consists of purpose-built HTML/JavaScript dashboards for specific organizational functions. Row Level Security (RLS) ensures data isolation between users.",
                "examples": []
            },
            {
                "heading": "The 360 Framework",
                "content": "The 360 represents a holistic annual cycle. Align 120 (days 1-120) establishes organizational foundation and values. Strategy 120 (days 121-240) develops plans and conducts research. Execute 120 (days 241-360) delivers actions and results. This creates continuous alignment, planning, and execution.",
                "examples": []
            },
            {
                "heading": "Key Subsystems",
                "content": "Agents: AI personalities with specific roles, system prompts, temperature settings, model selection, and context mappings. Context Assets: Reusable knowledge chunks (VoiceDNA, ICP, Company Description) that inject organizational context into AI interactions via agent-context mappings. Parthenon Actions: Structured workflows that orchestrate multi-step processes with roles, OKRs, and defined success metrics. Skills: Exportable AI capabilities following the WHO YOU ARE / WHAT YOU DO pattern.",
                "examples": []
            },
            {
                "heading": "Data Model Concepts",
                "content": "All entities use UUID primary keys. User ownership tracked via user_id foreign keys (NULL for system entities). RLS policies enforce data isolation per user. Versioning supported through is_current flags and previous_version_id references. Agent-context relationships managed through junction tables with injection_mode controls (always, on_demand, conditional).",
                "examples": []
            },
            {
                "heading": "Context Injection Flow",
                "content": "When an agent executes: 1) Load agent configuration (model, system prompt, temperature). 2) Query active context mappings ordered by priority. 3) For each mapping, check injection_mode conditions. 4) Format assets as Markdown with metadata. 5) Build final system prompt: base prompt + injected context. 6) Execute via appropriate LLM provider. 7) Log execution with full audit trail.",
                "examples": []
            },
            {
                "heading": "Multi-LLM Support",
                "content": "LLM Registry maintains model definitions for Anthropic (Claude Opus, Sonnet, Haiku), OpenAI (GPT-4o, o1 series), and Perplexity (Sonar). Each provider has a service wrapper with circuit breaker pattern, retry logic, and streaming support. Model switching works mid-conversation with full context preservation.",
                "examples": []
            }
        ],
        "related_modules": ["All modules"],
        "key_concepts": ["RLS", "context injection", "agent-context mappings", "multi-LLM", "Parthenon", "three pillars"]
    }'::jsonb,
    'INSIGHT 360 SYSTEM ARCHITECTURE (ADMIN)

CORE ARCHITECTURE
- Backend: Node.js/Express REST API
- Database: Supabase PostgreSQL with Row Level Security (RLS)
- AI: Multi-LLM support (Claude, GPT, Perplexity)
- Frontend: Purpose-built HTML/JS dashboards

THE 360 FRAMEWORK
- Align 120 (days 1-120): Foundation, values, identity
- Strategy 120 (days 121-240): Planning, research, decisions
- Execute 120 (days 241-360): Action, content, delivery
Creates continuous annual cycle of alignment and execution.

KEY SUBSYSTEMS
1. Agents: AI personalities with system prompts, temperature, model selection, context mappings
2. Context Assets: Reusable knowledge chunks (VoiceDNA, ICP, etc.) injected into AI interactions
3. Parthenon Actions: Multi-step orchestrated workflows with roles, OKRs, processes
4. Skills: Exportable AI capabilities (WHO YOU ARE / WHAT YOU DO pattern)

DATA MODEL
- UUID primary keys throughout
- user_id for ownership (NULL = system entity)
- RLS policies enforce data isolation
- Versioning via is_current flag and previous_version_id
- injection_mode controls: always, on_demand, conditional

CONTEXT INJECTION FLOW
1. Load agent config (model, prompt, temperature)
2. Query active context mappings by priority
3. Check injection_mode conditions
4. Format assets as Markdown
5. Build system prompt: base + context
6. Execute via LLM provider
7. Log with full audit trail

MULTI-LLM SUPPORT
- Anthropic: Claude Opus, Sonnet, Haiku
- OpenAI: GPT-4o, o1 series
- Perplexity: Sonar with web search
Circuit breaker, retry logic, streaming for all providers.',
    'public',
    ARRAY['higgins', 'admin', 'architecture', 'technical'],
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- Asset 4: i360 Modules Reference (Admin)
INSERT INTO context_assets (
    id, user_id, asset_type, name, description,
    content_json, content_text, visibility, tags, version, is_current
) VALUES (
    'ca100001-0000-4000-a000-000000000004',
    NULL,
    'i360_knowledge',
    'i360 Modules Reference (Admin)',
    'Detailed reference for all i360 modules and admin-specific features',
    '{
        "knowledge_type": "module",
        "audience": "admin",
        "summary": "Complete reference of all Insight 360 modules, their purposes, admin capabilities, and how they interconnect.",
        "sections": [
            {
                "heading": "Dashboard Module",
                "content": "Central hub showing system status, quick actions, and activity summaries. Admin view includes system health indicators, active user count, and resource usage metrics.",
                "examples": []
            },
            {
                "heading": "Higgins (Chat)",
                "content": "Multi-LLM chat interface supporting Claude, GPT, and Perplexity models. Features: model switching mid-conversation, web search integration, voice I/O, file upload analysis, conversation history management. Higgins injects JB Brand Voice DNA and i360 knowledge for consistent, knowledgeable responses.",
                "examples": []
            },
            {
                "heading": "Agent Library",
                "content": "Repository of AI agents organized by suite (Align, Strategy, Execute) and category. Admin capabilities: create system-level agents (user_id NULL), manage agent-context mappings, set guardrails, configure temperature and model selection. Agents can be public or private, active or inactive.",
                "examples": []
            },
            {
                "heading": "Context Assets",
                "content": "Knowledge management system with 18+ asset types. Admin features: create system-level assets, manage visibility (private/team/public), version history and rollback, bulk import/export, AI-assisted asset generation. Assets inject into agents via mappings with priority and injection_mode.",
                "examples": []
            },
            {
                "heading": "Align 120 Module",
                "content": "Foundation module for organizational alignment. Contains specialized agents: Integrity Auditor (values alignment assessment), Risk Sentinel (early warning detection), Values Excavator (discover organizational values), Counterfactual Analyst (alternative scenario analysis). Outputs flow to DIGM governance framework.",
                "examples": []
            },
            {
                "heading": "Strategy 120 / S2E",
                "content": "Strategic planning with Strategy-to-Execution (S2E) workflows. Admin features: manage strategic initiatives, configure OKR hierarchies, customize research agent prompts. Contains BSC perspective agents (Financial, Customer, Internal, Learning) and decision support agents.",
                "examples": []
            },
            {
                "heading": "Execute 120",
                "content": "Execution module for content and delivery. Contains content creation agents, sales assistants, email generators. Integrates with Thought Leadership module for content pipelines. Skills from Content Creation System available here.",
                "examples": []
            },
            {
                "heading": "Parthenon Framework (Admin)",
                "content": "Action orchestration system. Actions are multi-step workflows combining agents, context assets, roles, OKRs, and processes. Admin can create/edit actions, define success metrics, map context assets to action steps. Named for structured, principled approach (like Greek architecture).",
                "examples": []
            },
            {
                "heading": "DIGM Governance (Admin)",
                "content": "Four-layer governance framework: Data (integrity of information), Intelligence (quality of insights), Governance (decision frameworks), Momentum (execution tracking). Admin dashboard shows governance health scores and alerts.",
                "examples": []
            },
            {
                "heading": "Integrity Dashboard (Admin)",
                "content": "Values alignment monitoring. Tracks: values drift indicators, front-page test results, bright line violations, leading indicators of potential issues. Admin can configure alert thresholds and review audit logs.",
                "examples": []
            },
            {
                "heading": "Skills Module",
                "content": "Exportable AI capabilities from Content Creation System. Available skills: article-generator, weekly-article-package, theme-factory, canvas-design, document generators (pptx, docx, xlsx, pdf). Admin can import new skills and configure context mappings.",
                "examples": []
            }
        ],
        "related_modules": [],
        "key_concepts": ["system agents", "context mappings", "RLS", "DIGM", "Parthenon", "governance"]
    }'::jsonb,
    'INSIGHT 360 MODULES REFERENCE (ADMIN)

DASHBOARD
Central hub with system status, quick actions, activity. Admin: health indicators, user count, resource metrics.

HIGGINS (CHAT)
Multi-LLM chat (Claude, GPT, Perplexity). Model switching, web search, voice, file upload. Injects JB Voice DNA + i360 knowledge.

AGENT LIBRARY
Agents by suite (Align/Strategy/Execute) and category. Admin: create system agents, manage mappings, set guardrails, configure models.

CONTEXT ASSETS
18+ asset types. Admin: system-level assets, visibility control, versioning, bulk import/export, AI generation.

ALIGN 120
Foundation module. Agents: Integrity Auditor, Risk Sentinel, Values Excavator, Counterfactual Analyst. Outputs to DIGM.

STRATEGY 120 / S2E
Strategic planning. Admin: manage initiatives, OKR hierarchies, research prompts. BSC perspective agents, decision support.

EXECUTE 120
Content and delivery. Content agents, sales assistants, email generators. Thought Leadership integration, Skills.

PARTHENON (ADMIN)
Action orchestration. Multi-step workflows with agents, context, roles, OKRs. Admin creates actions, defines metrics.

DIGM GOVERNANCE (ADMIN)
Four layers: Data, Intelligence, Governance, Momentum. Admin dashboard shows health scores, alerts.

INTEGRITY DASHBOARD (ADMIN)
Values alignment monitoring. Tracks drift, front-page test, bright lines, leading indicators. Configure alerts, review audits.

SKILLS
From Content Creation System. article-generator, weekly-article-package, theme-factory, document generators. Admin imports skills.',
    'public',
    ARRAY['higgins', 'admin', 'modules', 'reference'],
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================================
-- SECTION 4: VERIFICATION QUERIES
-- ============================================================

-- Verify asset type was created
-- SELECT * FROM context_asset_types WHERE type_key = 'i360_knowledge';

-- Verify all 4 Higgins knowledge assets were created
-- SELECT id, name, asset_type,
--        (content_json->>'audience')::text as audience,
--        array_length(tags, 1) as tag_count
-- FROM context_assets
-- WHERE id LIKE 'ca100001%'
-- ORDER BY id;

-- ============================================================
-- END OF HIGGINS KNOWLEDGE SEED
-- ============================================================

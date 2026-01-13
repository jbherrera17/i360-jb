-- ============================================
-- Insight 360 - Import Content Creation System Assets v2
-- Version: 2.0.0
-- Date: January 2026
-- Description: Additional imports from Content Creation System
--              Includes: Product Suite, Buyer Personas, and 8 Skills
-- ============================================

-- ============================================
-- SECTION 1: IMPORT PRODUCT SUITE
-- From: Content Creation System/context/core/25-10-01 - synergi-ai-product-suite.json
-- ============================================

INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000007-0000-4000-8000-000000000001',
    NULL,
    'product_suite',
    'Synergi AI Product Suite',
    'Complete product and service offerings catalog for Synergi AI',
    '{
      "meta": {
        "title": "Synergi AI Product Suite",
        "version": "1.0",
        "date": "2025-10-01"
      },
      "layers": [
        {
          "layer": "Core Platform",
          "products": [
            {
              "id": 1,
              "name": "Insight 360",
              "type": "Strategic Alignment Engine",
              "description": "Proprietary framework (Align - Strategize - Execute) that uncovers what to automate, why, and in what order.",
              "value": "Prevents wasted AI investment by tying every agent to business priorities.",
              "moat": "Consulting methodology + tech platform combined; few can replicate this dual expertise.",
              "metrics": ["Proof-of-value in ~90 days", "60% pilot-to-production conversion"]
            },
            {
              "id": 2,
              "name": "Role-Based Agents",
              "type": "Departmental Copilots",
              "description": "Agents for marketing, sales, finance, operations, HR, healthcare, and more.",
              "value": "Each agent speaks the language of its role (KPIs, workflows, terminology).",
              "moat": "30+ prebuilt templates including AI coach guides, healthcare intake flows, and financial review models.",
              "metrics": ["+13.8% more customer inquiries handled per hour"]
            },
            {
              "id": 3,
              "name": "Synergi Nexus",
              "type": "AI Nervous System",
              "description": "Orchestration layer that allows agents to share context, hand off tasks, and learn as a system.",
              "value": "Transforms siloed AI bots into a coordinated AI workforce.",
              "moat": "Proprietary agent-to-agent protocol, continuous learning loop refined in real SMB environments.",
              "metrics": ["15 hrs/week saved per manager from agent collaboration"]
            }
          ]
        },
        {
          "layer": "Adoption Layer",
          "products": [
            {
              "id": 4,
              "name": "UpSkilling AI Agents",
              "type": "Adoption Accelerator",
              "description": "AI micro-learning modules delivered inside Slack/MS Teams.",
              "value": "Empowers employees, reduces resistance, and speeds adoption.",
              "moat": "Built on SOFTEN framework (Soften, Opportunity, Features, Testimonials, Encourage, Negotiate).",
              "metrics": ["Target 75% employee adoption of licensed agents"]
            },
            {
              "id": 5,
              "name": "Ethical AI Governance Toolkit",
              "type": "Trust Layer",
              "description": "Governance pack for bias testing, privacy controls, and transparent decision logs.",
              "value": "Makes AI safe for regulated industries like healthcare, finance, and legal.",
              "moat": "Governance framework designed specifically for SMBs, not just enterprises.",
              "metrics": ["SOC 2 Type II commitment", "Bias audit reports per deployment"]
            }
          ]
        },
        {
          "layer": "Extensions & Ecosystems",
          "products": [
            {
              "id": 6,
              "name": "Context Asset System",
              "type": "Knowledge DNA Builder",
              "description": "Structures client ICPs, brand voice, buyer personas, product profiles, and business rules into machine-readable assets.",
              "value": "Prevents AI hallucinations by grounding every agent in context.",
              "moat": "Proprietary JSON framework + domain-trained templates."
            },
            {
              "id": 7,
              "name": "Content Asset System",
              "type": "Execution Engine",
              "description": "Produces marketing outputs like newsletters, LinkedIn posts, sales emails, and reports.",
              "value": "Connects AI strategy to market-ready deliverables.",
              "moat": "Multi-LLM drafting + AI Engine Optimization ensures discoverability."
            }
          ]
        },
        {
          "layer": "Engagement Models",
          "products": [
            {
              "id": 8,
              "name": "Proof-of-Value Pilots",
              "type": "90-Day Program",
              "description": "Low-risk pilot designed to deliver 3 measurable wins.",
              "value": "Removes risk and proves ROI before long-term commitment.",
              "metrics": ["Guarantee: Proof-of-Value or Pay-Nothing"]
            },
            {
              "id": 9,
              "name": "Subscription Tiers",
              "type": "Launch, Scale, Enterprise",
              "description": "SaaS-style packaging with tiered access and add-ons.",
              "value": "Clear on-ramps for SMBs to scale with Synergi.",
              "pricing": {
                "Launch": "$6K/mo + $25K onboarding",
                "Scale": "$10K/mo (adds more Insight 360 agents)",
                "Add-ons": {"UpSkilling": "$2K/mo per 50 employees", "Governance Toolkit": "$1K flat"}
              }
            }
          ]
        },
        {
          "layer": "Vertical Solutions",
          "products": [
            {
              "id": 10,
              "name": "Healthcare AI Suite",
              "description": "Includes Docatar (patient intake), Synergi Health AI (bias elimination), Annie (virtual assistant for ACS).",
              "value": "HIPAA-ready, bias-aware, privacy-first solutions for clinics and practices."
            },
            {
              "id": 11,
              "name": "Professional Services & Coaching AI",
              "description": "AI Coach Guides, Living Book for authors, consulting copilots.",
              "value": "Domain-specific copilots for coaches, consultants, and professional services firms."
            },
            {
              "id": 12,
              "name": "SMB Sector Playbooks",
              "description": "Prebuilt playbooks for professional services, healthcare services, light manufacturing, and SaaS.",
              "value": "Vertical expertise reduces time-to-value and builds trust in SMB communities."
            }
          ]
        }
      ]
    }'::jsonb,
    'Synergi AI Product Suite - Core Platform: Insight 360 (Strategic Alignment Engine), Role-Based Agents (Departmental Copilots), Synergi Nexus (AI Nervous System). Adoption Layer: UpSkilling AI Agents, Ethical AI Governance Toolkit. Extensions: Context Asset System, Content Asset System. Engagement: Proof-of-Value Pilots, Subscription Tiers. Verticals: Healthcare AI Suite, Professional Services & Coaching AI, SMB Sector Playbooks.',
    ARRAY['product-suite', 'offerings', 'synergi', 'pricing', 'verticals'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================
-- SECTION 2: IMPORT BUYER PERSONAS
-- From: Content Creation System/context/core/25-09-08 - buyer-personas-json.json
-- ============================================

INSERT INTO context_assets (
    id,
    user_id,
    asset_type,
    name,
    description,
    content_json,
    content_text,
    tags,
    visibility,
    version,
    is_current
) VALUES (
    'ca000008-0000-4000-8000-000000000001',
    NULL,
    'buyer_personas',
    'Values-Vision Growth Leaders Personas',
    'Unified buyer persona archetype and 8 individual personas for Synergi AI target audience',
    '{
      "unifiedPersonaArchetype": {
        "name": "Values-Vision Growth Leaders",
        "description": "Purpose-Driven Scale Catalysts—executive leaders who fuse ambitious growth with an unwavering moral compass",
        "coreDimensions": {
          "guidingNorthStar": {
            "trait": "Values-Vision Entrepreneurship",
            "messagingImplication": "Every strategic move must advance both commercial success and a higher-order mission. Copy should connect ROI to impact"
          },
          "leadershipPhilosophy": {
            "trait": "Socially-Conscious, Servant Leaders",
            "messagingImplication": "They measure success by how well they elevate teams, communities, and the planet. Spotlight partnership, empowerment, and ethical tech guardrails"
          },
          "mindset": {
            "trait": "Entrepreneurial & Growth-Oriented",
            "messagingImplication": "Constantly scanning for next-gen advantages; embrace risk intelligently. Use future-focused language"
          },
          "learningStyle": {
            "trait": "Continuous Improvement & Collaborative",
            "messagingImplication": "Hungry for peer benchmarks and co-creation workshops. Offer thought-leadership roundtables, interactive demos, and mastermind forums"
          },
          "customerFocus": {
            "trait": "Relentlessly Customer-Centric",
            "messagingImplication": "Innovation must translate into superior client experience. Showcase case studies that prove elevated NPS, retention, or lifetime value"
          },
          "stakeholderCommitment": {
            "trait": "Whole-Ecosystem Success",
            "messagingImplication": "View employees, partners, investors, and society as intertwined. Frame proposals in 360 value: financial, cultural, and societal returns"
          }
        },
        "messagingGuidelines": [
          {"principle": "Lead with Purpose, Justify with Proof", "example": "Unlock 20% efficiency gains while advancing your carbon-neutral roadmap"},
          {"principle": "Show Collaborative Credibility", "description": "Invite them to co-design pilots; emphasize shared learning journeys"},
          {"principle": "Translate Innovation into Tangible Stakeholder Wins", "description": "Highlight how gains cascade to employees, customers, and communities"},
          {"principle": "Balance Strategic Vision with Operational Detail", "description": "Pair big-picture impact stories with clear implementation roadmaps, metrics, and risk mitigations"},
          {"principle": "Adopt a Coaching Tone", "example": "Let us navigate complexities together and multiply your positive impact"}
        ]
      },
      "individualPersonas": [
        {
          "id": 1,
          "name": "Visionary Victor",
          "title": "CEO / Founder",
          "northStarStatement": "I seize technology that frees me to architect a legacy enterprise—without eroding culture or compliance",
          "demographics": {"age": "45-55 years", "role": "Founder/early CEO", "companySize": "250-2,000 FTE", "industry": "SaaS or tech-enabled services", "revenue": "$50-300M ARR"},
          "goalsAndKPIs": ["30% YoY revenue growth", "EBITDA +3 pts in 12 mo", "Net-Zero by 2028", "NPS > 70"],
          "coreChallenges": ["Time poverty", "Balancing innovation vs. execution", "Fear of vendor lock-in or IP dilution"],
          "voiceCues": "Bold, strategic, succinct—Show me growth scenarios",
          "brandMessageHook": "Explore the future with our cutting-edge strategies—proven to lift EBITDA in under a year while sustaining your mission"
        },
        {
          "id": 2,
          "name": "Efficiency Emma",
          "title": "COO / Operations Director",
          "northStarStatement": "Every process dollar saved is fuel for scalable, customer-delighting growth",
          "demographics": {"age": "38-50 years", "certification": "Six Sigma Black Belt", "companySize": "200-1,500 FTE", "industry": "Manufacturing or DTC e-commerce"},
          "goalsAndKPIs": ["Cycle-time down 20%", "OTD > 95%", "COGS down 5%", "eNPS > 60"],
          "coreChallenges": ["Change-fatigue on shop floor", "Data silos", "Balancing lean vs. innovation"],
          "voiceCues": "Precise, metric-first; visual workflows",
          "brandMessageHook": "Navigate complexities with our expert insights and AI analytics—achieve 20% efficiency gains without shop-floor chaos"
        },
        {
          "id": 3,
          "name": "Tech-Savvy Taylor",
          "title": "CTO / IT Director",
          "northStarStatement": "Build a secure, future-proof stack that unlocks innovation faster than the market moves",
          "demographics": {"age": "37-45 years", "expertise": "AWS & Kubernetes champion", "companySize": "100-800 FTE", "industry": "Digital commerce company"},
          "goalsAndKPIs": ["99.95% uptime", "SOC 2 Type II", "50% infra automation", "Tech debt down 30%"],
          "coreChallenges": ["Legacy SAP integration", "Hiring DevSecOps talent", "AI sprawl governance"],
          "voiceCues": "Technical depth, no fluff, code snippets welcome",
          "brandMessageHook": "Demystifying AI—making it work for you with zero-trust security baked in"
        },
        {
          "id": 4,
          "name": "Analytical Alex",
          "title": "CFO / Finance Director",
          "northStarStatement": "Every dollar must return multiples while protecting downside risk",
          "demographics": {"age": "48-55 years", "certification": "CPA & MBA", "companySize": "300-2,500 FTE scale-up"},
          "goalsAndKPIs": ["Payback <= 18 mo", "IRR >= 25%", "OpEx down 8%", "Cash conversion cycle down 10 days"],
          "coreChallenges": ["Quantifying AI ROI", "Revamping cost structures", "Hedging against macro volatility"],
          "voiceCues": "Crisp finance language, charts/tables",
          "brandMessageHook": "Depend on us for honest, effective advice—delivering 4-6x ROI you can verify on the balance sheet"
        },
        {
          "id": 5,
          "name": "Client-Focused Charlie",
          "title": "Department Head",
          "northStarStatement": "Elevate my team KPIs and prove tech investment makes us indispensable",
          "demographics": {"age": "35-50 years", "role": "Functional leader (Marketing, Sales, Legal, CX)", "teamSize": "100-500 FTE business unit"},
          "goalsAndKPIs": "Function-specific (e.g., Marketing MQL +30%, Sales win-rate +15%)",
          "coreChallenges": ["Bottlenecks", "Limited budget", "IT queue delays"],
          "voiceCues": "Practical, outcome-oriented",
          "brandMessageHook": "Tailoring solutions to fit your unique business landscape—hit next quarter KPIs without red-tape delays"
        },
        {
          "id": 6,
          "name": "Brand-Builder Bella",
          "title": "Marketing Manager",
          "northStarStatement": "Craft magnetic stories that convert strangers into superfans—at scale and on budget",
          "demographics": {"age": "32-45 years", "expertise": "HubSpot/Marketo power-user", "budget": "$2-10M marketing budget"},
          "goalsAndKPIs": ["SQLs +25%", "CAC down 15%", "Brand awareness lift 10 pts"],
          "coreChallenges": ["Content velocity", "Attribution accuracy", "Channel saturation"],
          "voiceCues": "Conversational, story-rich",
          "brandMessageHook": "Unlock your potential with AI-driven growth strategies—reach audiences before competitors even know they are searching"
        },
        {
          "id": 7,
          "name": "Results-Driven Ryan",
          "title": "Sales Director",
          "northStarStatement": "Crush quota with data-powered precision and human-first relationships",
          "demographics": {"age": "38-48 years", "quota": "8-figure quota", "teamSize": "Hybrid SDR/AE team of 20+"},
          "goalsAndKPIs": ["120% quota", "Sales cycle down 20%", "Win-rate +10%", "Avg deal size +15%"],
          "coreChallenges": ["Complex buying committees", "CRM noise", "Differentiation"],
          "voiceCues": "Energetic, competitive, value-proof",
          "brandMessageHook": "Learn how to streamline your business with our tips—turn data into deals, faster"
        },
        {
          "id": 8,
          "name": "People-First Patricia",
          "title": "HR Director",
          "northStarStatement": "Nurture talent and culture so people—and profits—rise together",
          "demographics": {"age": "42-55 years", "certification": "SHRM-SCP", "companySize": "500-3,000 FTE multistate org"},
          "goalsAndKPIs": ["Time-to-fill <= 35 days", "Retention > 90%", "eNPS +20 pts"],
          "coreChallenges": ["Admin overload", "Compliance shifts", "Scaling personalized experiences"],
          "voiceCues": "Empathetic, pragmatic, inclusive",
          "brandMessageHook": "Depend on us for people-centric AI that streamlines HR tasks—so you can focus on culture, not paperwork"
        }
      ],
      "activationGuidelines": [
        {"step": 1, "action": "Embed into campaign briefs", "description": "Tag each email, ad, or webinar to its primary persona"},
        {"step": 2, "action": "Score leads", "description": "Match job titles + intent signals to persona KPIs and triggers"},
        {"step": 3, "action": "Align Content", "description": "Use the Brand Hooks as headline starters; layer decision drivers into CTAs"}
      ]
    }'::jsonb,
    'Values-Vision Growth Leaders Buyer Personas - Unified archetype: Purpose-Driven Scale Catalysts. 8 Individual Personas: Visionary Victor (CEO), Efficiency Emma (COO), Tech-Savvy Taylor (CTO), Analytical Alex (CFO), Client-Focused Charlie (Dept Head), Brand-Builder Bella (Marketing), Results-Driven Ryan (Sales), People-First Patricia (HR). Messaging: Lead with Purpose, Justify with Proof. Coaching tone.',
    ARRAY['buyer-personas', 'icp', 'messaging', 'sales', 'marketing', 'synergi'],
    'public',
    1,
    true
)
ON CONFLICT (id) DO UPDATE SET
    content_json = EXCLUDED.content_json,
    content_text = EXCLUDED.content_text,
    updated_at = NOW();

-- ============================================
-- SECTION 3: IMPORT SKILLS
-- From: Content Creation System/.claude/skills/
-- ============================================

-- Skill 3: Theme Factory
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000003-0000-4000-8000-000000000001',
    NULL,
    'theme-factory',
    'Theme Factory',
    'Toolkit for styling artifacts with professional themes. 10 pre-set themes with colors/fonts that can be applied to slides, docs, reports, HTML pages, or generate custom themes on-the-fly.',
    'palette',
    '#ec4899',
    'design',
    'execute',
    ARRAY['themes', 'styling', 'design', 'colors', 'fonts', 'branding'],
    E'# Theme Factory Skill\n\nProvides a curated collection of professional font and color themes. Once a theme is chosen, it can be applied to any artifact.\n\n## Purpose\n\nTo apply consistent, professional styling to presentation slide decks, documents, or other artifacts. Each theme includes:\n- A cohesive color palette with hex codes\n- Complementary font pairings for headers and body text\n- A distinct visual identity suitable for different contexts and audiences\n\n## Available Themes\n\n1. **Ocean Depths** - Professional and calming maritime theme\n2. **Sunset Boulevard** - Warm and vibrant sunset colors\n3. **Forest Canopy** - Natural and grounded earth tones\n4. **Modern Minimalist** - Clean and contemporary grayscale\n5. **Golden Hour** - Rich and warm autumnal palette\n6. **Arctic Frost** - Cool and crisp winter-inspired theme\n7. **Desert Rose** - Soft and sophisticated dusty tones\n8. **Tech Innovation** - Bold and modern tech aesthetic\n9. **Botanical Garden** - Fresh and organic garden colors\n10. **Midnight Galaxy** - Dramatic and cosmic deep tones\n\n## Usage Instructions\n\n1. **Present theme options**: Display or describe the available themes\n2. **Ask for their choice**: Ask which theme to apply\n3. **Wait for selection**: Get explicit confirmation\n4. **Apply the theme**: Apply the selected theme colors and fonts consistently\n\n## Application Process\n\nAfter a preferred theme is selected:\n1. Read the corresponding theme specifications\n2. Apply the specified colors and fonts consistently throughout\n3. Ensure proper contrast and readability\n4. Maintain the theme visual identity across all elements\n\n## Create Custom Theme\n\nFor cases where existing themes do not fit, create a custom theme based on provided inputs. Generate appropriate colors/fonts that match the described mood or purpose.',
    'Styled artifact with consistent theme colors and fonts applied',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    4000,
    ARRAY['apply theme', 'style this', 'change colors', 'theme factory', 'pick a theme'],
    ARRAY[
        'Apply a professional theme to this presentation',
        'What themes are available for styling?',
        'Create a custom theme for this artifact'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 4: Brand Guidelines
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000004-0000-4000-8000-000000000001',
    NULL,
    'brand-guidelines',
    'Brand Guidelines Applier',
    'Applies brand colors and typography to artifacts. Use when brand colors, style guidelines, visual formatting, or company design standards need to be applied.',
    'brush',
    '#f97316',
    'design',
    'execute',
    ARRAY['branding', 'corporate-identity', 'visual-design', 'styling', 'formatting'],
    E'# Brand Styling Skill\n\n## Overview\n\nApplies official brand identity and style resources to artifacts.\n\n**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, visual formatting, visual design\n\n## Brand Application Process\n\n### Colors\n\nWhen applying brand colors:\n- Primary colors for main text and dark backgrounds\n- Light colors for backgrounds and text on dark\n- Accent colors for highlights and interactive elements\n\n### Typography\n\n- **Headings**: Use specified heading font (with fallback)\n- **Body Text**: Use specified body font (with fallback)\n\n### Smart Font Application\n\n- Apply heading font to headings (24pt and larger)\n- Apply body font to body text\n- Automatically fall back to system fonts if custom fonts unavailable\n- Preserve readability across all systems\n\n### Text Styling\n\n- Headings (24pt+): Heading font\n- Body text: Body font\n- Smart color selection based on background\n- Preserve text hierarchy and formatting\n\n### Shape and Accent Colors\n\n- Non-text shapes use accent colors\n- Cycle through accent colors for visual interest\n- Maintain visual consistency while staying on-brand',
    'Branded artifact with consistent colors, typography, and visual identity',
    ARRAY['brand_guidelines'],
    ARRAY['voice_dna'],
    4000,
    ARRAY['apply brand', 'brand colors', 'style guide', 'corporate identity', 'brand guidelines'],
    ARRAY[
        'Apply our brand guidelines to this document',
        'Style this presentation with brand colors',
        'Format this artifact to match our brand identity'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 5: Doc Co-Authoring
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000005-0000-4000-8000-000000000001',
    NULL,
    'doc-coauthoring',
    'Document Co-Authoring Workflow',
    'Structured workflow for co-authoring documentation, proposals, technical specs, and decision docs. Three stages: Context Gathering, Refinement & Structure, Reader Testing.',
    'file-signature',
    '#06b6d4',
    'content',
    'execute',
    ARRAY['documentation', 'proposals', 'specs', 'writing', 'collaboration', 'workflow'],
    E'# Doc Co-Authoring Workflow\n\nStructured workflow for guiding users through collaborative document creation. Act as an active guide through three stages.\n\n## When to Offer This Workflow\n\n**Trigger conditions:**\n- User mentions writing documentation: "write a doc", "draft a proposal", "create a spec"\n- User mentions specific doc types: "PRD", "design doc", "decision doc", "RFC"\n- User seems to be starting a substantial writing task\n\n## Stage 1: Context Gathering\n\n**Goal:** Close the gap between what the user knows and what AI knows.\n\n### Initial Questions\n1. What type of document is this? (technical spec, decision doc, proposal)\n2. Who is the primary audience?\n3. What is the desired impact when someone reads this?\n4. Is there a template or specific format to follow?\n5. Any other constraints or context?\n\n### Info Dumping\nEncourage user to dump all context:\n- Background on the project/problem\n- Related team discussions\n- Why alternative solutions are not being used\n- Organizational context\n- Timeline pressures or constraints\n- Technical architecture or dependencies\n- Stakeholder concerns\n\n## Stage 2: Refinement & Structure\n\n**Goal:** Build document section by section through brainstorming, curation, and iterative refinement.\n\nFor each section:\n1. **Clarifying Questions** - Ask 5-10 questions about what to include\n2. **Brainstorming** - Generate 5-20 options\n3. **Curation** - User indicates what to keep/remove/combine\n4. **Gap Check** - Ask if anything important is missing\n5. **Drafting** - Draft the section based on selections\n6. **Iterative Refinement** - Refine based on feedback\n\n## Stage 3: Reader Testing\n\n**Goal:** Test the document with fresh perspective to verify it works for readers.\n\n1. Predict reader questions\n2. Test comprehension\n3. Run additional checks (ambiguity, false assumptions, contradictions)\n4. Report and fix any issues found\n\n## Final Review\n\nWhen Reader Testing passes:\n1. Recommend final read-through\n2. Suggest double-checking facts, links, technical details\n3. Verify it achieves the intended impact',
    'Polished document that has been iteratively refined and reader-tested',
    ARRAY[]::text[],
    ARRAY['voice_dna', 'icp'],
    16000,
    ARRAY['write a doc', 'draft a proposal', 'create a spec', 'decision doc', 'PRD', 'technical spec'],
    ARRAY[
        'Help me write a technical specification document',
        'I need to draft a project proposal',
        'Let us co-author a decision document'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 6: DOCX
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000006-0000-4000-8000-000000000001',
    NULL,
    'docx',
    'Word Document Creator/Editor',
    'Comprehensive Word document creation, editing, and analysis. Supports tracked changes, comments, formatting preservation, and text extraction.',
    'file-word',
    '#2563eb',
    'document',
    'execute',
    ARRAY['docx', 'word', 'document', 'editing', 'tracked-changes', 'redlining'],
    E'# DOCX Creation, Editing, and Analysis\n\n## Overview\n\nCreate, edit, or analyze .docx files. A .docx file is a ZIP archive containing XML files.\n\n## Workflow Decision Tree\n\n### Reading/Analyzing Content\n- Use pandoc for text extraction: `pandoc --track-changes=all file.docx -o output.md`\n- Unpack for raw XML access to comments, complex formatting, embedded media\n\n### Creating New Document\nUse docx-js (JavaScript/TypeScript):\n1. Create JavaScript file using Document, Paragraph, TextRun components\n2. Export as .docx using Packer.toBuffer()\n\n### Editing Existing Document\n- **Simple changes**: Basic OOXML editing\n- **Someone else''s document**: Use Redlining workflow\n- **Legal/business/government docs**: Use Redlining workflow (required)\n\n## Redlining Workflow\n\nFor document review with tracked changes:\n\n**Principle: Minimal, Precise Edits**\nOnly mark text that actually changes. Break replacements into:\n[unchanged text] + [deletion] + [insertion] + [unchanged text]\n\n### Steps\n1. Get markdown representation with pandoc\n2. Identify and group changes into batches (3-10 per batch)\n3. Unpack document\n4. Implement changes in batches using get_node and doc.save()\n5. Pack the document\n6. Final verification\n\n## Key File Structures\n- `word/document.xml` - Main document contents\n- `word/comments.xml` - Comments\n- `word/media/` - Embedded images and media\n- Tracked changes use `<w:ins>` (insertions) and `<w:del>` (deletions) tags',
    'Word document (.docx) with proper formatting and optional tracked changes',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    8000,
    ARRAY['create word doc', 'edit docx', 'track changes', 'redline document', 'word document'],
    ARRAY[
        'Create a new Word document with this content',
        'Edit this .docx file with tracked changes',
        'Extract text from this Word document'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 7: PDF
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000007-0000-4000-8000-000000000001',
    NULL,
    'pdf',
    'PDF Processor',
    'Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms.',
    'file-pdf',
    '#dc2626',
    'document',
    'execute',
    ARRAY['pdf', 'document', 'extraction', 'forms', 'merge', 'split'],
    E'# PDF Processing Guide\n\n## Quick Start\n\n```python\nfrom pypdf import PdfReader, PdfWriter\n\n# Read and extract text\nreader = PdfReader("document.pdf")\ntext = ""\nfor page in reader.pages:\n    text += page.extract_text()\n```\n\n## Common Operations\n\n### Merge PDFs\n```python\nwriter = PdfWriter()\nfor pdf_file in ["doc1.pdf", "doc2.pdf"]:\n    reader = PdfReader(pdf_file)\n    for page in reader.pages:\n        writer.add_page(page)\nwith open("merged.pdf", "wb") as output:\n    writer.write(output)\n```\n\n### Split PDF\n```python\nreader = PdfReader("input.pdf")\nfor i, page in enumerate(reader.pages):\n    writer = PdfWriter()\n    writer.add_page(page)\n    with open(f"page_{i+1}.pdf", "wb") as output:\n        writer.write(output)\n```\n\n### Extract Tables (pdfplumber)\n```python\nimport pdfplumber\nwith pdfplumber.open("document.pdf") as pdf:\n    for page in pdf.pages:\n        tables = page.extract_tables()\n```\n\n### Create PDFs (reportlab)\n```python\nfrom reportlab.lib.pagesizes import letter\nfrom reportlab.pdfgen import canvas\n\nc = canvas.Canvas("hello.pdf", pagesize=letter)\nc.drawString(100, 700, "Hello World!")\nc.save()\n```\n\n## Quick Reference\n\n| Task | Best Tool |\n|------|----------|\n| Merge PDFs | pypdf |\n| Split PDFs | pypdf |\n| Extract text | pdfplumber |\n| Extract tables | pdfplumber |\n| Create PDFs | reportlab |\n| Fill forms | pdf-lib or pypdf |',
    'PDF document or extracted content',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    6000,
    ARRAY['create pdf', 'merge pdf', 'split pdf', 'extract text from pdf', 'pdf form'],
    ARRAY[
        'Create a PDF document from this content',
        'Merge these PDF files together',
        'Extract text and tables from this PDF'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 8: PPTX
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000008-0000-4000-8000-000000000001',
    NULL,
    'pptx',
    'PowerPoint Creator/Editor',
    'Presentation creation, editing, and analysis. Create new presentations, modify content, work with layouts, add speaker notes.',
    'file-powerpoint',
    '#ea580c',
    'document',
    'execute',
    ARRAY['pptx', 'powerpoint', 'presentation', 'slides', 'deck'],
    E'# PPTX Creation, Editing, and Analysis\n\n## Overview\n\nCreate, edit, or analyze .pptx files. A .pptx is a ZIP archive containing XML files.\n\n## Design Principles\n\n**CRITICAL**: Before creating any presentation:\n1. Consider the subject matter and tone\n2. Check for branding requirements\n3. Match palette to content\n4. State your design approach before writing code\n\n**Requirements**:\n- Use web-safe fonts: Arial, Helvetica, Times New Roman, Georgia, Verdana, Tahoma\n- Create clear visual hierarchy\n- Ensure readability with strong contrast\n- Be consistent across slides\n\n## Creating New Presentation (No Template)\n\nUse html2pptx workflow:\n1. Create HTML file for each slide with proper dimensions (720pt x 405pt for 16:9)\n2. Use proper HTML elements for text content\n3. Convert HTML slides to PowerPoint\n4. Visual validation with thumbnails\n\n## Creating with Template\n\n1. Extract template text and create thumbnail grid\n2. Analyze template and save inventory\n3. Create outline based on template inventory\n4. Duplicate, reorder, delete slides using rearrange.py\n5. Extract all text using inventory.py\n6. Generate replacement text\n7. Apply replacements using replace.py\n\n## Editing Existing Presentation\n\n1. Unpack presentation: `python ooxml/scripts/unpack.py file.pptx output_dir`\n2. Edit XML files (primarily ppt/slides/slide{N}.xml)\n3. Validate after each edit\n4. Pack final presentation: `python ooxml/scripts/pack.py input_dir file.pptx`\n\n## Key File Structures\n- `ppt/presentation.xml` - Main metadata and slide references\n- `ppt/slides/slide{N}.xml` - Individual slide contents\n- `ppt/notesSlides/notesSlide{N}.xml` - Speaker notes\n- `ppt/theme/` - Theme and styling information\n- `ppt/media/` - Images and media files',
    'PowerPoint presentation (.pptx) with professional design and formatting',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    10000,
    ARRAY['create presentation', 'make slides', 'powerpoint', 'slide deck', 'pptx'],
    ARRAY[
        'Create a presentation about this topic',
        'Edit this PowerPoint presentation',
        'Generate slides from this content'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 9: Web Artifacts Builder
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000009-0000-4000-8000-000000000001',
    NULL,
    'web-artifacts-builder',
    'Web Artifacts Builder',
    'Suite of tools for creating elaborate, multi-component HTML artifacts using React, Tailwind CSS, and shadcn/ui. For complex artifacts requiring state management or routing.',
    'code',
    '#8b5cf6',
    'development',
    'execute',
    ARRAY['react', 'tailwind', 'shadcn', 'html', 'frontend', 'artifacts', 'web'],
    E'# Web Artifacts Builder\n\nBuild powerful frontend HTML artifacts.\n\n**Stack**: React 18 + TypeScript + Vite + Parcel (bundling) + Tailwind CSS + shadcn/ui\n\n## Design Guidelines\n\n**IMPORTANT**: To avoid "AI slop", avoid:\n- Excessive centered layouts\n- Purple gradients\n- Uniform rounded corners\n- Inter font overuse\n\n## Quick Start\n\n### Step 1: Initialize Project\n```bash\nbash scripts/init-artifact.sh <project-name>\ncd <project-name>\n```\n\nCreates project with:\n- React + TypeScript (via Vite)\n- Tailwind CSS 3.4.1 with shadcn/ui theming\n- Path aliases configured\n- 40+ shadcn/ui components pre-installed\n- All Radix UI dependencies\n- Parcel configured for bundling\n\n### Step 2: Develop Your Artifact\n\nEdit the generated files to build the artifact.\n\n### Step 3: Bundle to Single HTML File\n```bash\nbash scripts/bundle-artifact.sh\n```\n\nCreates `bundle.html` - self-contained artifact with all JavaScript, CSS, and dependencies inlined.\n\n### Step 4: Share Artifact\n\nShare the bundled HTML file for viewing as an artifact.\n\n### Step 5: Testing (Optional)\n\nTest using available tools if needed.\n\n## Reference\n\n- shadcn/ui components: https://ui.shadcn.com/docs/components',
    'Self-contained HTML artifact with React, Tailwind, and shadcn/ui',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    8000,
    ARRAY['build artifact', 'create react app', 'web artifact', 'html artifact', 'interactive component'],
    ARRAY[
        'Build an interactive web artifact',
        'Create a React component for this feature',
        'Generate an HTML artifact with this functionality'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Skill 10: XLSX
INSERT INTO skills (
    id,
    user_id,
    name,
    display_name,
    description,
    icon,
    color,
    category,
    suite,
    tags,
    instructions,
    output_format,
    required_context_types,
    optional_context_types,
    context_token_budget,
    trigger_phrases,
    conversation_starters,
    version,
    visibility,
    status
) VALUES (
    '5c000010-0000-4000-8000-000000000001',
    NULL,
    'xlsx',
    'Excel Spreadsheet Creator/Editor',
    'Comprehensive spreadsheet creation, editing, and analysis. Supports formulas, formatting, data analysis, and visualization.',
    'file-excel',
    '#16a34a',
    'document',
    'execute',
    ARRAY['xlsx', 'excel', 'spreadsheet', 'formulas', 'data-analysis', 'financial-model'],
    E'# XLSX Creation, Editing, and Analysis\n\n## Requirements for Outputs\n\n### Zero Formula Errors\nEvery Excel model MUST have ZERO formula errors (#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?)\n\n### Color Coding Standards (Financial Models)\n- **Blue text**: Hardcoded inputs users will change\n- **Black text**: ALL formulas and calculations\n- **Green text**: Links from other worksheets\n- **Red text**: External links to other files\n- **Yellow background**: Key assumptions needing attention\n\n### Number Formatting\n- **Years**: Format as text ("2024" not "2,024")\n- **Currency**: Use $#,##0 format; specify units in headers\n- **Zeros**: Format as "-"\n- **Percentages**: Default 0.0% (one decimal)\n- **Negatives**: Use parentheses (123) not -123\n\n## CRITICAL: Use Formulas, Not Hardcoded Values\n\nAlways use Excel formulas instead of calculating in Python and hardcoding.\n\n**WRONG**:\n```python\ntotal = df[''Sales''].sum()\nsheet[''B10''] = total  # Hardcodes 5000\n```\n\n**CORRECT**:\n```python\nsheet[''B10''] = ''=SUM(B2:B9)''\n```\n\n## Common Workflow\n\n1. **Choose tool**: pandas for data, openpyxl for formulas/formatting\n2. **Create/Load**: Create new or load existing\n3. **Modify**: Add data, formulas, formatting\n4. **Save**: Write to file\n5. **Recalculate**: `python recalc.py output.xlsx`\n6. **Verify**: Fix any errors\n\n## Creating New Files (openpyxl)\n\n```python\nfrom openpyxl import Workbook\nfrom openpyxl.styles import Font, PatternFill\n\nwb = Workbook()\nsheet = wb.active\nsheet[''A1''] = ''Hello''\nsheet[''B2''] = ''=SUM(A1:A10)''\nsheet[''A1''].font = Font(bold=True, color=''FF0000'')\nwb.save(''output.xlsx'')\n```\n\n## Best Practices\n\n- **pandas**: For data analysis, bulk operations\n- **openpyxl**: For formatting, formulas, Excel-specific features\n- Cell indices are 1-based\n- Use `data_only=True` to read calculated values',
    'Excel spreadsheet (.xlsx) with formulas, formatting, and zero errors',
    ARRAY[]::text[],
    ARRAY['brand_guidelines'],
    8000,
    ARRAY['create spreadsheet', 'excel file', 'xlsx', 'financial model', 'data analysis'],
    ARRAY[
        'Create an Excel spreadsheet with this data',
        'Build a financial model in Excel',
        'Analyze this data in a spreadsheet'
    ],
    '1.0.0',
    'public',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    instructions = EXCLUDED.instructions,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    asset_count INTEGER;
    skill_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO asset_count FROM context_assets WHERE id::text LIKE 'ca00000%';
    SELECT COUNT(*) INTO skill_count FROM skills WHERE id::text LIKE '5c00000%' OR id::text LIKE '5c000010%';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'CONTENT CREATION SYSTEM IMPORT v2 COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Context Assets: %', asset_count;
    RAISE NOTICE '  New in v2:';
    RAISE NOTICE '    - Product Suite: Synergi AI Product Suite';
    RAISE NOTICE '    - Buyer Personas: Values-Vision Growth Leaders (8 personas)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total Skills: %', skill_count;
    RAISE NOTICE '  New in v2:';
    RAISE NOTICE '    - theme-factory';
    RAISE NOTICE '    - brand-guidelines';
    RAISE NOTICE '    - doc-coauthoring';
    RAISE NOTICE '    - docx';
    RAISE NOTICE '    - pdf';
    RAISE NOTICE '    - pptx';
    RAISE NOTICE '    - web-artifacts-builder';
    RAISE NOTICE '    - xlsx';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;

-- Phase 57: Agent Introductions & Conversation Starters
-- Generated: 2026-02-14
-- Updates introductions and conversation_starters for agents with missing content
-- Preserves existing content where present

BEGIN;

-- AI Opportunity Ranker (a0000001-0000-4000-a000-000000000203)
UPDATE agents SET
  introduction = 'I''ll help you evaluate and rank AI adoption opportunities based on business impact, feasibility, and strategic alignment. Share your potential AI use cases and I''ll produce a prioritized assessment with implementation recommendations.',
  conversation_starters = '["Rank these AI use cases by business impact and feasibility for our organization", "Evaluate whether we should invest in an AI-powered customer service chatbot", "Compare three AI adoption opportunities and recommend which to pursue first"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000203';

-- AI Readiness (af8064c5-1a49-4dd6-8a37-42ba4345dfee)
UPDATE agents SET
  introduction = 'I assess your organization''s readiness for AI adoption across key dimensions including data infrastructure, talent, governance, and culture. Share your current state and I''ll identify gaps and recommend a readiness roadmap.',
  conversation_starters = '["Assess our readiness to adopt AI across all key dimensions", "We want to deploy LLMs internally — evaluate our data and governance readiness", "What gaps do we need to close before launching our first AI pilot?"]'::jsonb
WHERE id = 'af8064c5-1a49-4dd6-8a37-42ba4345dfee';

-- AI Risk & Compliance Scout (a0000001-0000-4000-a000-000000000202)
UPDATE agents SET
  introduction = 'I identify and assess AI-related risks across regulatory, ethical, operational, and reputational dimensions. Describe your AI initiative and I''ll deliver a structured risk assessment with mitigation strategies and compliance considerations.',
  conversation_starters = '["Assess the risks of deploying a customer-facing AI chatbot", "What regulatory requirements should we consider for our AI hiring tool?", "Evaluate the ethical and compliance risks of using AI for credit decisions"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000202';

-- AI Risk & Compliance Scout (c89096d8-b96c-4a9b-a58d-41fff0f64c9a)
UPDATE agents SET
  introduction = 'I identify and assess AI-related risks across regulatory, ethical, operational, and reputational dimensions. Describe your AI initiative and I''ll deliver a structured risk assessment with mitigation strategies and compliance considerations.',
  conversation_starters = '["Assess the risks of deploying a customer-facing AI chatbot", "What regulatory requirements should we consider for our AI hiring tool?", "Evaluate the ethical and compliance risks of using AI for credit decisions"]'::jsonb
WHERE id = 'c89096d8-b96c-4a9b-a58d-41fff0f64c9a';

-- AI Upskilling OKR Generator (a0000000-0000-0000-0000-000000000344)
UPDATE agents SET
  introduction = 'I create targeted OKRs for AI upskilling programs aligned to your organization''s strategic goals. Tell me about your team''s current AI capabilities and business objectives, and I''ll generate measurable upskilling OKRs with key results and milestones.',
  conversation_starters = '["Create upskilling OKRs for our marketing team to adopt AI tools", "Generate OKRs for a company-wide AI literacy program", "Design OKRs to upskill our data team from traditional analytics to ML/AI"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000344';

-- AI Visibility Researcher (a0000001-0000-4000-a000-000000000302)
UPDATE agents SET
  introduction = 'I research and analyze how AI is being discussed, adopted, and perceived in your industry. Share your sector and focus areas, and I''ll deliver insights on AI trends, competitor adoption, and thought leadership opportunities.',
  conversation_starters = '["Research how AI is being discussed in the professional services industry", "What are the top AI adoption trends in our sector this quarter?", "Identify thought leadership opportunities around AI in financial services"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000302';

-- Align 120 Orchestrator (a0000000-0000-0000-0000-000000000250)
UPDATE agents SET
  introduction = 'I orchestrate the Align 120 strategic alignment process, guiding you through mission validation, values calibration, and strategic priority setting. I''ll help ensure your team''s activities are aligned with your organization''s core purpose and direction.',
  conversation_starters = '["Start the Align 120 process for our executive team", "Help us validate our mission statement against current market reality", "Guide us through a strategic priority alignment session"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000250';

-- Assumption Tester (a0000000-0000-0000-0000-000000000315)
UPDATE agents SET
  introduction = 'I stress-test the assumptions underlying your business strategies, plans, and decisions. Share your key assumptions and I''ll systematically evaluate their validity, identify hidden risks, and suggest how to de-risk your approach.',
  conversation_starters = '["Test the key assumptions in our go-to-market strategy", "Challenge our assumption that enterprise clients will pay premium pricing", "What are the riskiest assumptions in this business plan?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000315';

-- Best Practice Researcher (a0000000-0000-0000-0000-000000000312)
UPDATE agents SET
  introduction = 'I research and synthesize best practices from industry leaders, academic research, and proven frameworks relevant to your challenge. Tell me the domain or problem area and I''ll deliver actionable best practices with supporting evidence.',
  conversation_starters = '["Research best practices for implementing OKRs in a mid-sized company", "What are best practices for AI governance in regulated industries?", "Find proven approaches to improving employee retention in tech companies"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000312';

-- Brand Voice Extractor (a0000000-0000-0000-0000-000000000231)
UPDATE agents SET
  introduction = 'I analyze your existing content to extract and codify your brand voice DNA — including tone, vocabulary, sentence patterns, and emotional register. Share samples of your content and I''ll produce a comprehensive brand voice guide.',
  conversation_starters = '["Analyze these blog posts and extract our brand voice characteristics", "Compare our brand voice across website copy, social media, and emails", "Create a brand voice guide from our last 10 pieces of published content"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000231';

-- BSC-OKR Cascade Validator (a0000000-0000-0000-0000-000000000303)
UPDATE agents SET
  introduction = 'I validate that your OKRs properly cascade from your Balanced Scorecard strategy map, checking for alignment gaps, missing linkages, and measurement consistency. Share your BSC perspectives and OKR hierarchy and I''ll identify misalignments and recommend fixes.',
  conversation_starters = '["Validate that our department OKRs align with our Balanced Scorecard", "Check if our team-level key results connect to strategic objectives", "Identify gaps in our OKR cascade from corporate to department level"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000303';

-- Business Case Builder (a0000000-0000-0000-0000-000000000305)
UPDATE agents SET
  introduction = 'I build structured, persuasive business cases with financial analysis, risk assessment, and stakeholder-ready recommendations. Describe your proposed initiative and I''ll create a comprehensive business case with ROI projections and implementation roadmap.',
  conversation_starters = '["Build a business case for investing in an AI-powered analytics platform", "Create a business case for expanding into a new market segment", "Draft a business case for hiring a dedicated data science team"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000305';

-- Campaign Strategist (a0000000-0000-0000-0000-000000000204)
UPDATE agents SET
  introduction = 'I design multi-channel marketing campaign strategies aligned to your business objectives and target audiences. Share your campaign goals, audience, and constraints, and I''ll deliver a strategic campaign plan with messaging, channels, timeline, and KPIs.',
  conversation_starters = '["Design a campaign strategy to launch our new product to enterprise buyers", "Create a multi-channel campaign plan for our annual conference", "Plan a thought leadership campaign to establish authority in AI ethics"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000204';

-- Cash Flow Optimizer (a0000000-0000-0000-0000-000000000333)
UPDATE agents SET
  introduction = 'I analyze your cash flow patterns and identify optimization opportunities across receivables, payables, inventory, and working capital. Share your financial data or describe your cash flow challenges, and I''ll recommend specific strategies to improve liquidity.',
  conversation_starters = '["Analyze our cash conversion cycle and recommend improvements", "Identify opportunities to optimize our accounts receivable process", "How can we improve working capital without cutting growth investments?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000333';

-- Change Readiness Analyst (a0000000-0000-0000-0000-000000000223)
UPDATE agents SET
  introduction = 'I assess your organization''s readiness for change initiatives by evaluating leadership alignment, stakeholder sentiment, cultural factors, and capability gaps. Describe your planned change and I''ll deliver a readiness assessment with risk mitigation strategies.',
  conversation_starters = '["Assess our readiness for migrating to a new CRM platform", "Evaluate organizational readiness for a major restructuring initiative", "What change risks should we address before rolling out the new process?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000223';

-- Code Reviewer (a0000001-0000-4000-a000-000000000006)
UPDATE agents SET
  introduction = 'I review code for quality, security vulnerabilities, performance issues, and adherence to best practices. Paste your code or describe what you need reviewed, and I''ll provide detailed feedback with specific improvement suggestions.',
  conversation_starters = '["Review this Python function for security vulnerabilities and best practices", "Check this API endpoint for performance issues and error handling gaps", "Review this database query for SQL injection risks and optimization"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000006';

-- Competitive Intelligence Analyst (a0000000-0000-0000-0000-000000000202)
UPDATE agents SET
  introduction = 'I gather and analyze competitive intelligence to give you actionable insights on competitor strategies, positioning, and market moves. Share your competitors and market context, and I''ll deliver a structured competitive analysis.',
  conversation_starters = '["Build a competitive profile for our top three rivals in the market", "What strategic moves have our competitors made in the last quarter?", "Analyze competitor pricing strategies and identify our positioning gap"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000202';

-- Competitive Positioning Analyst (a0000000-0000-0000-0000-000000000234)
UPDATE agents SET
  introduction = 'I analyze your competitive positioning relative to key rivals, identifying differentiation opportunities and positioning gaps. Share your product, market, and competitors, and I''ll recommend positioning strategies backed by evidence.',
  conversation_starters = '["Analyze our positioning versus the top 3 competitors in our category", "Identify differentiation opportunities we are not exploiting", "Recommend a positioning strategy for entering the enterprise segment"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000234';

-- Competitive Research (b7e5e1d7-cd55-49f3-97c7-d045ea260adb)
UPDATE agents SET
  conversation_starters = '["Research the competitive landscape for AI-powered analytics tools", "Deep dive into how our main competitor is positioning their new product", "Compare feature sets across the top 5 players in our market"]'::jsonb
WHERE id = 'b7e5e1d7-cd55-49f3-97c7-d045ea260adb';

-- Content Pillar Designer (a0000001-0000-4000-a000-000000000303)
UPDATE agents SET
  introduction = 'I design content pillar frameworks that establish thought leadership authority in your key topic areas. Share your expertise domains and audience, and I''ll create a structured content pillar strategy with topic clusters, formats, and publishing cadence.',
  conversation_starters = '["Design content pillars for establishing thought leadership in AI governance", "Create a content pillar strategy for our B2B SaaS marketing", "Build a topic cluster framework around our core expertise areas"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000303';

-- Counterfactual Analyst (a0000001-0000-4000-a000-000000000103)
UPDATE agents SET
  introduction = 'I explore alternative scenarios by asking ''what if'' questions about your past decisions, strategies, and outcomes. Describe a decision or event, and I''ll analyze what might have happened under different choices to extract strategic lessons.',
  conversation_starters = '["What if we had entered the enterprise market two years earlier?", "Analyze what would have happened if we chose a different pricing model", "What if we had invested in AI capabilities instead of expanding sales?"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000103';

-- Counterfactual Analyst (a0000000-0000-0000-0000-000000000103)
UPDATE agents SET
  introduction = 'I explore alternative scenarios by asking ''what if'' questions about your past decisions, strategies, and outcomes. Describe a decision or event, and I''ll analyze what might have happened under different choices to extract strategic lessons.',
  conversation_starters = '["What if we had entered the enterprise market two years earlier?", "Analyze what would have happened if we chose a different pricing model", "What if we had invested in AI capabilities instead of expanding sales?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000103';

-- Craft a Business Process (c6ccd04d-eac7-44f3-b79b-712c2e5a9557)
UPDATE agents SET
  introduction = 'I help you design and document business processes with clear steps, roles, decision points, and success metrics. Describe the process you need to create or improve, and I''ll deliver a structured process definition.',
  conversation_starters = '["Design a process for onboarding new enterprise clients", "Create a structured process for quarterly strategic reviews", "Document the process for evaluating and approving new AI tools"]'::jsonb
WHERE id = 'c6ccd04d-eac7-44f3-b79b-712c2e5a9557';

-- Create a Brand Voice (d956646d-d851-4b6c-94d9-70d91978b3aa)
UPDATE agents SET
  introduction = 'I help you create a distinctive brand voice from scratch by exploring your values, audience, and differentiation. I''ll guide you through a structured discovery process and deliver a comprehensive brand voice framework.',
  conversation_starters = '["Help us create a brand voice for our new B2B SaaS product", "We are rebranding — guide us through building a new voice framework", "Design a brand voice that differentiates us in a crowded market"]'::jsonb
WHERE id = 'd956646d-d851-4b6c-94d9-70d91978b3aa';

-- Culture & Engagement Tracker (a0000000-0000-0000-0000-000000000345)
UPDATE agents SET
  introduction = 'I track and analyze organizational culture and employee engagement indicators to surface trends, risks, and improvement opportunities. Share your engagement data or describe cultural dynamics, and I''ll deliver insights with recommended actions.',
  conversation_starters = '["Analyze our latest engagement survey results and identify trends", "Track cultural indicators across departments and flag risk areas", "What engagement patterns should we watch after the recent restructuring?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000345';

-- Customer Lifetime Value Agent (a0000000-0000-0000-0000-000000000338)
UPDATE agents SET
  introduction = 'I calculate and analyze customer lifetime value across segments, identifying high-value cohorts and opportunities to increase CLV. Share your customer data or business model, and I''ll deliver CLV analysis with retention and growth strategies.',
  conversation_starters = '["Calculate CLV across our customer segments and identify the most valuable", "How can we increase customer lifetime value for our mid-tier accounts?", "Analyze which acquisition channels produce the highest CLV customers"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000338';

-- Customer Satisfaction Analyzer (a0000000-0000-0000-0000-000000000335)
UPDATE agents SET
  introduction = 'I analyze customer satisfaction data from surveys, reviews, and feedback to identify trends, drivers, and improvement opportunities. Share your satisfaction data or describe the customer experience challenges you''re facing.',
  conversation_starters = '["Analyze our NPS scores over the last four quarters and identify trends", "What are the primary drivers of customer dissatisfaction in our support data?", "Compare satisfaction scores across product lines and recommend improvements"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000335';

-- Customer Sentiment Monitor (a0000000-0000-0000-0000-000000000233)
UPDATE agents SET
  introduction = 'I monitor and analyze customer sentiment across feedback channels to detect shifts in perception, emerging issues, and satisfaction drivers. Share your customer feedback sources and I''ll deliver sentiment analysis with actionable recommendations.',
  conversation_starters = '["Analyze customer sentiment from our recent product launch reviews", "Monitor sentiment shifts after our pricing change announcement", "What are customers saying about us versus competitors on review sites?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000233';

-- Cycle Time Optimizer (a0000000-0000-0000-0000-000000000341)
UPDATE agents SET
  introduction = 'I analyze process cycle times to identify bottlenecks, waste, and optimization opportunities that reduce lead times and improve throughput. Describe your process or share cycle time data, and I''ll recommend specific improvements.',
  conversation_starters = '["Analyze our order fulfillment cycle time and find bottlenecks", "How can we reduce our software release cycle from 4 weeks to 2?", "Identify the top 3 cycle time bottlenecks in our service delivery process"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000341';

-- Daily Briefer (a1000001-0001-0001-0001-000000000004)
UPDATE agents SET
  introduction = 'I compile your personalized daily briefing covering key metrics, upcoming priorities, market developments, and items requiring your attention. Let me know your focus areas and I''ll prepare your briefing.'
WHERE id = 'a1000001-0001-0001-0001-000000000004';

-- Daily Briefer (a0000001-0000-4000-a000-000000000001)
UPDATE agents SET
  introduction = 'I compile your personalized daily briefing covering key metrics, upcoming priorities, market developments, and items requiring your attention. Let me know your focus areas and I''ll prepare your briefing.',
  conversation_starters = '["Prepare my daily briefing focused on sales pipeline and key meetings", "Give me a morning briefing covering team OKR progress and blockers", "Create a daily digest of market developments in my industry"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000001';

-- Decision Assistant (265718eb-e391-42b3-97fa-8d01db59f055)
UPDATE agents SET
  introduction = 'I help you structure complex decisions using proven frameworks — weighing criteria, evaluating options, stress-testing assumptions, and documenting your reasoning. Describe the decision you''re facing and I''ll guide you through a rigorous analysis.',
  conversation_starters = '["Help me decide whether to build or buy our analytics platform", "Structure my decision on which market to expand into next", "I need to choose between three vendor proposals — help me evaluate them"]'::jsonb
WHERE id = '265718eb-e391-42b3-97fa-8d01db59f055';

-- Decision Framer (a0000000-0000-0000-0000-000000000313)
UPDATE agents SET
  introduction = 'I help you frame decisions clearly before you solve them — defining the real question, identifying stakeholders, surfacing constraints, and mapping the decision landscape. Tell me about the decision you''re wrestling with.',
  conversation_starters = '["Help me frame the decision about whether to pursue this acquisition", "I am stuck on a resource allocation decision — help me define the real question", "Frame the trade-offs in our build vs. partner debate"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000313';

-- Decision Journal (a0000000-0000-0000-0000-000000000252)
UPDATE agents SET
  introduction = 'I help you maintain a structured decision journal, recording your decisions, reasoning, expected outcomes, and actual results to build decision-making skill over time. Share a decision to log or review your past entries.',
  conversation_starters = '["Log my decision to restructure the sales team and my reasoning", "Review my last 5 decisions and identify patterns in my decision-making", "Record today pricing decision with expected outcomes for future review"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000252';

-- Deep Research (edcec213-786d-402f-b6a8-a1d08e8cff20)
UPDATE agents SET
  introduction = 'I conduct deep, multi-source research on complex topics, synthesizing findings into structured, evidence-based reports. Tell me what you need researched and I''ll deliver comprehensive analysis with sources.',
  conversation_starters = '["Research the current state of AI regulation across major markets", "Conduct a deep analysis of the professional services industry outlook", "Research best practices for implementing responsible AI frameworks"]'::jsonb
WHERE id = 'edcec213-786d-402f-b6a8-a1d08e8cff20';

-- Dependency Mapper (a0000000-0000-0000-0000-000000000308)
UPDATE agents SET
  introduction = 'I map dependencies across projects, systems, teams, and initiatives to reveal hidden risks, bottlenecks, and critical paths. Describe what you need mapped and I''ll create a structured dependency analysis with risk priorities.',
  conversation_starters = '["Map the dependencies between our top 5 strategic initiatives", "Identify cross-team dependencies that could delay our product launch", "What are the critical path dependencies in our digital transformation?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000308';

-- Drift Detector (a0000000-0000-0000-0000-000000000318)
UPDATE agents SET
  introduction = 'I monitor strategic drift by comparing current activities, metrics, and priorities against your stated strategy and OKRs. Share your strategic plan and current state, and I''ll identify where you''ve drifted and recommend course corrections.',
  conversation_starters = '["Compare our current activities against our Q1 strategic plan", "Are we drifting from our stated OKRs? Analyze our recent decisions", "Check if our resource allocation still matches our strategic priorities"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000318';

-- Email Composer (a1000001-0001-0001-0001-000000000005)
UPDATE agents SET
  introduction = 'I craft professional, effective emails tailored to your audience and objective — from executive communications to client outreach. Tell me who you''re writing to, what you need to communicate, and the tone you want.'
WHERE id = 'a1000001-0001-0001-0001-000000000005';

-- Email Triager (a0000001-0000-4000-a000-000000000002)
UPDATE agents SET
  introduction = 'I help you triage and prioritize your email by categorizing messages by urgency, required action, and strategic importance. Share your emails and I''ll organize them with recommended responses and priorities.',
  conversation_starters = '["Help me prioritize these 20 emails by urgency and required action", "Triage my inbox and identify which emails need a response today", "Categorize these emails and draft quick responses for routine items"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000002';

-- Evidence Collector (a0000000-0000-0000-0000-000000000251)
UPDATE agents SET
  introduction = 'I systematically gather and organize evidence to support strategic decisions, business cases, and compliance requirements. Tell me what you need evidence for and I''ll compile a structured evidence package with source evaluation.',
  conversation_starters = '["Gather evidence supporting our case for expanding into the EU market", "Compile evidence for our board presentation on AI investment ROI", "Collect supporting data for our compliance audit preparation"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000251';

-- Executive Communication Specialist (a0000000-0000-0000-0000-000000000203)
UPDATE agents SET
  introduction = 'I craft executive-level communications — board presentations, stakeholder updates, strategic memos, and leadership messages. Share your communication need and audience, and I''ll draft polished content that resonates with senior leaders.',
  conversation_starters = '["Draft a board presentation on our AI strategy and progress", "Write an all-hands message announcing the organizational restructuring", "Create a stakeholder update on our strategic initiative outcomes"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000203';

-- Find Best Practices (60f83ad0-00f0-4e08-89a9-2f85ce9965c5)
UPDATE agents SET
  introduction = 'I research and compile best practices relevant to your specific challenge, drawing from industry leaders, academic research, and proven frameworks. Describe your problem area and I''ll deliver curated, actionable best practices.',
  conversation_starters = '["Find best practices for implementing AI governance in mid-sized companies", "What are proven approaches to reducing customer churn in SaaS?", "Research best practices for building a high-performing remote team"]'::jsonb
WHERE id = '60f83ad0-00f0-4e08-89a9-2f85ce9965c5';

-- First Principles Thinker (a0000001-0000-4000-a000-000000000005)
UPDATE agents SET
  introduction = 'I break down complex problems to their fundamental truths and rebuild solutions from the ground up. Share a challenge or assumption you want to rethink, and I''ll guide you through a first-principles analysis.',
  conversation_starters = '["Break down our pricing strategy to first principles", "Rethink our customer acquisition approach from the ground up", "Apply first principles thinking to our product development process"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000005';

-- Get AI News (566b081e-1949-4c2e-8a86-48abc714d476)
UPDATE agents SET
  introduction = 'I scan and curate the latest AI news, research breakthroughs, industry developments, and regulatory updates relevant to your interests. Tell me your focus areas and I''ll deliver a structured AI news briefing.',
  conversation_starters = '["Give me the latest AI industry news relevant to professional services", "What AI breakthroughs happened this week that could affect our business?", "Curate AI regulation news from the US, EU, and UK"]'::jsonb
WHERE id = '566b081e-1949-4c2e-8a86-48abc714d476';

-- Get Prof Services News (8574c9ed-2b0d-4909-9cd6-2d04207274ee)
UPDATE agents SET
  introduction = 'I monitor and curate news, trends, and developments in the professional services industry. I''ll deliver a structured briefing covering market moves, technology adoption, talent trends, and competitive dynamics.',
  conversation_starters = '["What are the latest trends in the professional services industry?", "Summarize this week major moves in consulting and advisory firms", "What technology adoption news is relevant for professional services?"]'::jsonb
WHERE id = '8574c9ed-2b0d-4909-9cd6-2d04207274ee';

-- Governance RACI Builder (a0000000-0000-0000-0000-000000000242)
UPDATE agents SET
  introduction = 'I create RACI matrices for governance structures, ensuring clear accountability across decisions, processes, and initiatives. Describe the governance area and stakeholders, and I''ll build a comprehensive RACI framework.',
  conversation_starters = '["Create a RACI matrix for our AI governance framework", "Build a RACI for the new product development approval process", "Design governance RACI for our data management responsibilities"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000242';

-- Higgins Strategy Advisor (8e7b256a-e714-4d84-a99e-12764a1e870b)
UPDATE agents SET
  introduction = 'I''m Higgins, your Socratic strategic advisor. I don''t give easy answers — I ask rigorous questions to help you think more clearly about strategy, decisions, and priorities. Challenge me with your toughest strategic questions.',
  conversation_starters = '["Challenge my assumption that we should expand internationally next year", "I think our competitive advantage is our technology — push back on that", "Help me think through whether our current strategy is actually working"]'::jsonb
WHERE id = '8e7b256a-e714-4d84-a99e-12764a1e870b';

-- Innovation Capacity Agent (a0000000-0000-0000-0000-000000000346)
UPDATE agents SET
  introduction = 'I assess your organization''s innovation capacity across culture, processes, resources, and leadership support. Share your innovation goals and current state, and I''ll deliver a capacity assessment with recommendations to unlock more innovation.',
  conversation_starters = '["Assess our capacity to innovate across all dimensions", "What is blocking innovation in our product development team?", "Compare our innovation capacity to industry benchmarks and recommend improvements"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000346';

-- Integrity Auditor (a0000001-0000-4000-a000-000000000101)
UPDATE agents SET
  introduction = 'I audit organizational integrity by examining alignment between stated values, policies, and actual practices. Share your values framework and operational context, and I''ll identify integrity gaps with remediation recommendations.',
  conversation_starters = '["Audit alignment between our stated values and actual decision-making patterns", "Check if our hiring practices align with our diversity commitments", "Identify integrity gaps between our published ethics policy and operational behavior"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000101';

-- Integrity Auditor (a0000000-0000-0000-0000-000000000101)
UPDATE agents SET
  introduction = 'I audit organizational integrity by examining alignment between stated values, policies, and actual practices. Share your values framework and operational context, and I''ll identify integrity gaps with remediation recommendations.',
  conversation_starters = '["Audit alignment between our stated values and actual decision-making patterns", "Check if our hiring practices align with our diversity commitments", "Identify integrity gaps between our published ethics policy and operational behavior"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000101';

-- KPI/OKR Alignment Mapper (a0000000-0000-0000-0000-000000000215)
UPDATE agents SET
  introduction = 'I map the alignment between your KPIs and OKRs to ensure your metrics actually measure what matters strategically. Share your OKR hierarchy and KPI set, and I''ll identify gaps, redundancies, and misalignments.',
  conversation_starters = '["Map our department KPIs to our corporate OKRs and find gaps", "Are our sales metrics actually measuring what our strategy requires?", "Identify KPIs that do not connect to any strategic objective"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000215';

-- Leading/Lagging Indicator Classifier (a0000000-0000-0000-0000-000000000304)
UPDATE agents SET
  introduction = 'I classify your metrics as leading or lagging indicators, then ensure you have a balanced measurement system that predicts outcomes, not just reports them. Share your metrics and I''ll create a classified indicator framework.',
  conversation_starters = '["Classify our current dashboard metrics as leading or lagging indicators", "We are only tracking lagging indicators — help us identify leading ones", "Build a balanced leading/lagging indicator framework for our sales team"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000304';

-- Market Intelligence Scout (a0000000-0000-0000-0000-000000000309)
UPDATE agents SET
  introduction = 'I scout market intelligence across competitors, customers, trends, and emerging opportunities. Share your market focus and I''ll deliver structured intelligence with strategic implications and recommended actions.',
  conversation_starters = '["Scout the latest market intelligence on AI adoption in healthcare", "What market signals should we be watching in our competitive landscape?", "Gather intelligence on emerging market opportunities in our sector"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000309';

-- Market Share Tracker (a0000000-0000-0000-0000-000000000337)
UPDATE agents SET
  introduction = 'I track and analyze market share dynamics across your competitive landscape, identifying share shifts, growth drivers, and competitive threats. Share your market context and I''ll deliver market share analysis with strategic recommendations.',
  conversation_starters = '["Analyze market share trends in our industry over the past 2 years", "Which competitors are gaining share and what is driving it?", "Track our market share movement after last quarter product launch"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000337';

-- Meeting Prep (a0000001-0000-4000-a000-000000000004)
UPDATE agents SET
  introduction = 'I prepare comprehensive meeting briefings with attendee profiles, agenda analysis, talking points, and anticipated questions. Tell me about your upcoming meeting and I''ll create a prep package to help you walk in fully prepared.',
  conversation_starters = '["Prepare me for tomorrow board meeting on strategic planning", "Create a briefing for my meeting with the new enterprise prospect", "Prepare talking points and anticipated questions for the investor call"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000004';

-- Operational Excellence Agent (a0000000-0000-0000-0000-000000000342)
UPDATE agents SET
  introduction = 'I assess and improve operational excellence across your processes, identifying waste, variation, and improvement opportunities using lean and six sigma principles. Describe your operational challenge and I''ll deliver an improvement roadmap.',
  conversation_starters = '["Assess operational excellence maturity across our key processes", "Identify the top waste reduction opportunities in our service delivery", "Design an operational improvement roadmap for the next two quarters"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000342';

-- Policy Drafter (a0000000-0000-0000-0000-000000000243)
UPDATE agents SET
  introduction = 'I draft clear, comprehensive policies aligned to your organizational values, regulatory requirements, and best practices. Tell me the policy area and context, and I''ll create a structured policy document ready for review.',
  conversation_starters = '["Draft an acceptable use policy for AI tools in our organization", "Create a data governance policy aligned with GDPR requirements", "Write a remote work policy that balances flexibility with accountability"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000243';

-- Portfolio Prioritizer (a0000000-0000-0000-0000-000000000244)
UPDATE agents SET
  introduction = 'I help you prioritize your project and initiative portfolio based on strategic alignment, resource constraints, dependencies, and expected value. Share your portfolio and criteria, and I''ll deliver a prioritized ranking with rationale.',
  conversation_starters = '["Prioritize our portfolio of 12 strategic initiatives for next quarter", "We have limited resources — help us rank these 8 projects by value", "Re-prioritize our project portfolio given the new budget constraints"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000244';

-- Process Documenter (a0000001-0000-4000-a000-000000000205)
UPDATE agents SET
  introduction = 'I document business processes in clear, structured formats including step-by-step procedures, RACI assignments, decision points, and exception handling. Describe the process and I''ll create comprehensive documentation.',
  conversation_starters = '["Document our client onboarding process from initial sale to go-live", "Create process documentation for our monthly financial close procedure", "Document the escalation process for critical customer issues"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000205';

-- Process Documenter (a0000000-0000-0000-0000-000000000205)
UPDATE agents SET
  introduction = 'I document business processes in clear, structured formats including step-by-step procedures, RACI assignments, decision points, and exception handling. Describe the process and I''ll create comprehensive documentation.',
  conversation_starters = '["Document our client onboarding process from initial sale to go-live", "Create process documentation for our monthly financial close procedure", "Document the escalation process for critical customer issues"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000205';

-- Process Efficiency Analyzer (a0000000-0000-0000-0000-000000000339)
UPDATE agents SET
  introduction = 'I analyze business processes to identify inefficiencies, bottlenecks, redundancies, and automation opportunities. Describe your process or share process data, and I''ll deliver an efficiency assessment with improvement recommendations.',
  conversation_starters = '["Analyze our quote-to-cash process for efficiency improvements", "Where are the bottlenecks in our employee onboarding workflow?", "Assess the efficiency of our content approval process and recommend changes"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000339';

-- Process Miner (a0000000-0000-0000-0000-000000000213)
UPDATE agents SET
  introduction = 'I discover and analyze actual process flows from your operational data, comparing real behavior to designed processes and identifying deviations, bottlenecks, and optimization opportunities.',
  conversation_starters = '["Discover the actual process flow in our order management system", "Compare our designed procurement process to what actually happens", "Mine our ticketing data to find hidden process variations and bottlenecks"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000213';

-- Profitability Tracker (a0000000-0000-0000-0000-000000000332)
UPDATE agents SET
  introduction = 'I analyze profitability across products, customers, channels, and business units to identify margin drivers, profit leaks, and optimization opportunities. Share your financial data or describe your profitability challenge.',
  conversation_starters = '["Analyze profitability by product line and identify margin improvement opportunities", "Which customer segments are dragging down our overall profitability?", "Track profitability trends over the last 4 quarters and flag concerns"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000332';

-- Quality OKR Generator (a0000000-0000-0000-0000-000000000340)
UPDATE agents SET
  introduction = 'I generate quality-focused OKRs that drive measurable improvements in product quality, service delivery, and operational consistency. Share your quality goals and current metrics, and I''ll create targeted OKRs with actionable key results.',
  conversation_starters = '["Generate quality OKRs for our software development team", "Create OKRs focused on improving customer service quality metrics", "Design quality-focused OKRs for our manufacturing operations"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000340';

-- Quarterly Review Facilitator (a0000000-0000-0000-0000-000000000319)
UPDATE agents SET
  introduction = 'I facilitate structured quarterly business reviews by analyzing performance against OKRs, identifying themes, and generating discussion agendas. Share your quarterly data and I''ll prepare a comprehensive review framework.',
  conversation_starters = '["Prepare a quarterly review agenda based on our OKR performance data", "Facilitate analysis of what worked and what did not this quarter", "Generate discussion questions for our upcoming quarterly strategic review"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000319';

-- Regulatory Monitor (a0000000-0000-0000-0000-000000000311)
UPDATE agents SET
  introduction = 'I monitor regulatory developments and compliance requirements relevant to your industry and geography. Share your regulatory landscape and I''ll track changes, assess impact, and recommend compliance actions.',
  conversation_starters = '["Monitor regulatory changes affecting AI deployment in financial services", "What new compliance requirements should we be aware of this quarter?", "Track GDPR enforcement actions and their implications for our business"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000311';

-- Research Analyst (a1000001-0001-0001-0001-000000000006)
UPDATE agents SET
  introduction = 'I conduct structured research and analysis on business topics, delivering evidence-based insights with clear methodology and sourcing. Tell me what you need analyzed and I''ll produce a comprehensive research brief.'
WHERE id = 'a1000001-0001-0001-0001-000000000006';

-- Research Assistant (a0000001-0000-4000-a000-000000000003)
UPDATE agents SET
  introduction = 'I help with research tasks — finding information, synthesizing sources, fact-checking claims, and organizing findings into useful formats. What would you like me to research?',
  conversation_starters = '["Help me find recent studies on employee engagement and remote work", "Summarize the key findings from this industry report", "Research the latest thinking on AI governance frameworks"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000003';

-- Resource Planner (a0000000-0000-0000-0000-000000000307)
UPDATE agents SET
  introduction = 'I help you plan resource allocation across projects, teams, and initiatives — balancing capacity, skills, priorities, and constraints. Share your resource landscape and I''ll deliver an optimized allocation plan with scenario analysis.',
  conversation_starters = '["Plan resource allocation across our Q2 project portfolio", "We have a capacity constraint — help optimize team assignments", "Model three resource scenarios for our upcoming product launch"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000307';

-- Retention OKR Generator (a0000000-0000-0000-0000-000000000336)
UPDATE agents SET
  introduction = 'I generate customer retention-focused OKRs with measurable key results tied to churn reduction, satisfaction improvement, and loyalty building. Share your retention goals and current metrics, and I''ll create targeted OKRs.',
  conversation_starters = '["Generate customer retention OKRs for our subscription business", "Create OKRs focused on reducing enterprise customer churn", "Design retention key results tied to our NPS improvement goals"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000336';

-- Revenue OKR Generator (a0000000-0000-0000-0000-000000000331)
UPDATE agents SET
  introduction = 'I generate revenue-focused OKRs that drive measurable growth across acquisition, expansion, and monetization. Share your revenue targets and growth strategy, and I''ll create OKRs with specific, trackable key results.',
  conversation_starters = '["Generate revenue growth OKRs for next quarter", "Create OKRs for our new market expansion revenue targets", "Design OKRs that drive both new business acquisition and account expansion"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000331';

-- Risk Sentinel (a0000001-0000-4000-a000-000000000102)
UPDATE agents SET
  introduction = 'I continuously assess and monitor organizational risks across strategic, operational, financial, and compliance dimensions. Share your risk landscape and I''ll deliver a structured risk assessment with severity ratings and mitigation priorities.',
  conversation_starters = '["Assess the top strategic risks facing our organization this quarter", "Monitor and rate the risks associated with our AI deployment plans", "Identify emerging risks from recent market and regulatory developments"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000102';

-- Risk Sentinel (a0000000-0000-0000-0000-000000000102)
UPDATE agents SET
  introduction = 'I continuously assess and monitor organizational risks across strategic, operational, financial, and compliance dimensions. Share your risk landscape and I''ll deliver a structured risk assessment with severity ratings and mitigation priorities.',
  conversation_starters = '["Assess the top strategic risks facing our organization this quarter", "Monitor and rate the risks associated with our AI deployment plans", "Identify emerging risks from recent market and regulatory developments"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000102';

-- Risk-Benefit Analyzer (a0000000-0000-0000-0000-000000000314)
UPDATE agents SET
  introduction = 'I conduct structured risk-benefit analyses for your initiatives, investments, and strategic decisions. Describe the option you''re evaluating and I''ll weigh risks against benefits with a clear recommendation framework.',
  conversation_starters = '["Analyze the risks and benefits of acquiring this competitor", "Should we adopt this new technology? Evaluate the risk-benefit trade-off", "Weigh the risks versus benefits of entering a new geographic market"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000314';

-- ROI Measurement Agent (a0000000-0000-0000-0000-000000000334)
UPDATE agents SET
  introduction = 'I design ROI measurement frameworks and calculate return on investment for your initiatives, programs, and technology investments. Share your initiative details and I''ll deliver a comprehensive ROI analysis.',
  conversation_starters = '["Design an ROI measurement framework for our AI investment program", "Calculate the ROI of our recent digital transformation initiative", "How should we measure return on our employee training investments?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000334';

-- Sales Assistant (a1000001-0001-0001-0001-000000000002)
UPDATE agents SET
  introduction = 'I help with sales tasks including prospect research, objection handling, follow-up messaging, and deal strategy. Tell me about your sales situation and I''ll provide actionable support.'
WHERE id = 'a1000001-0001-0001-0001-000000000002';

-- Scenario Modeler (a0000000-0000-0000-0000-000000000306)
UPDATE agents SET
  introduction = 'I build and analyze strategic scenarios to help you prepare for multiple futures. Describe the uncertainties you''re facing and I''ll create scenario models with implications, early indicators, and contingency strategies.',
  conversation_starters = '["Model three scenarios for our business if the market contracts 20%", "What happens to our strategy if our main competitor gets acquired?", "Build best-case, worst-case, and most-likely scenarios for our product launch"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000306';

-- Second Opinion Generator (a0000000-0000-0000-0000-000000000316)
UPDATE agents SET
  introduction = 'I provide rigorous second opinions on your strategies, plans, and decisions by challenging assumptions, identifying blind spots, and offering alternative perspectives. Share what you want pressure-tested.',
  conversation_starters = '["Give me a second opinion on our go-to-market strategy", "Challenge the assumptions in our three-year strategic plan", "I think we should double our sales team — argue the other side"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000316';

-- Skills Gap OKR Analyzer (a0000000-0000-0000-0000-000000000343)
UPDATE agents SET
  introduction = 'I analyze skills gaps in your organization and generate targeted OKRs to close them. Share your current team capabilities and strategic needs, and I''ll identify critical gaps with measurable upskilling objectives.',
  conversation_starters = '["Analyze skills gaps in our engineering team relative to our AI roadmap", "Identify the critical skills gaps blocking our strategic objectives", "Generate OKRs to close the top 3 skills gaps in our organization"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000343';

-- Skills Matrix Assessor (a0000000-0000-0000-0000-000000000221)
UPDATE agents SET
  introduction = 'I assess and build skills matrices for your teams, mapping current capabilities against required competencies and identifying development priorities. Share your team context and I''ll create a comprehensive skills assessment.',
  conversation_starters = '["Build a skills matrix for our product development team", "Assess our marketing team capabilities against industry benchmarks", "Identify which team members are best positioned for AI-related roles"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000221';

-- Stakeholder Mapper (a0000000-0000-0000-0000-000000000241)
UPDATE agents SET
  introduction = 'I map stakeholder relationships, influence, and interests to help you navigate complex organizational dynamics. Describe your initiative and key players, and I''ll create a stakeholder map with engagement strategies.',
  conversation_starters = '["Map the stakeholders for our digital transformation initiative", "Identify key influencers and blockers for our organizational change", "Create a stakeholder engagement plan for the new product launch"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000241';

-- Strategic Advisor (a0000001-0000-4000-a000-000000000008)
UPDATE agents SET
  introduction = 'I provide strategic advice on business challenges, helping you think through options, trade-offs, and implications. Share your strategic question and I''ll deliver structured analysis with actionable recommendations.',
  conversation_starters = '["Advise on whether we should pursue a vertical or horizontal growth strategy", "Help me think through our competitive response to the new market entrant", "What strategic options should we consider given our current market position?"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000008';

-- Strategic Context Assembler (a0000000-0000-0000-0000-000000000322)
UPDATE agents SET
  introduction = 'I assemble comprehensive strategic context packages by pulling together relevant data, analysis, and insights needed for decision-making. Tell me what decision needs context and I''ll compile a thorough briefing.',
  conversation_starters = '["Assemble strategic context for our upcoming board strategy session", "Pull together all relevant data for our market entry decision", "Build a comprehensive context package for evaluating this partnership opportunity"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000322';

-- Strategic Theme Synthesizer (a0000000-0000-0000-0000-000000000302)
UPDATE agents SET
  introduction = 'I synthesize strategic themes from diverse data sources — market signals, internal metrics, stakeholder feedback, and competitive intelligence. Share your inputs and I''ll identify the key strategic themes with supporting evidence.',
  conversation_starters = '["Synthesize strategic themes from our recent customer feedback and market data", "What patterns emerge from our Q4 performance data and competitive analysis?", "Identify the dominant strategic themes across our department OKR reviews"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000302';

-- Strategy 120 Orchestrator (a0000000-0000-0000-0000-000000000321)
UPDATE agents SET
  introduction = 'I orchestrate the Strategy 120 process, guiding you through strategic analysis, option generation, and strategy formulation in a structured 120-minute framework. Let''s build your strategy together.',
  conversation_starters = '["Start the Strategy 120 process for our annual strategic planning", "Guide us through a rapid strategy formulation for the new business unit", "Run a Strategy 120 session focused on our competitive positioning"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000321';

-- Strategy Advisor (a1000001-0001-0001-0001-000000000003)
UPDATE agents SET
  introduction = 'I provide strategic counsel on business decisions, competitive moves, and growth opportunities. Share your strategic challenge and I''ll deliver structured analysis with recommended courses of action.'
WHERE id = 'a1000001-0001-0001-0001-000000000003';

-- Strategy Communicator (a0000000-0000-0000-0000-000000000320)
UPDATE agents SET
  introduction = 'I help you communicate strategy clearly and compellingly across all levels of your organization. Share your strategy and target audience, and I''ll craft communication materials that drive understanding and alignment.',
  conversation_starters = '["Help us communicate our new strategic direction to all employees", "Craft a strategy narrative for our investor presentation", "Create a one-page strategy summary for department leaders"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000320';

-- Strategy Document Generator (a0000000-0000-0000-0000-000000000323)
UPDATE agents SET
  introduction = 'I generate comprehensive strategy documents — from one-page summaries to detailed strategic plans. Share your strategic direction and I''ll produce a polished document ready for stakeholder review.',
  conversation_starters = '["Generate a comprehensive strategic plan document for the next fiscal year", "Create a strategy one-pager for our board presentation", "Draft a strategic initiative proposal with timeline and resource requirements"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000323';

-- Strategy Health Monitor (a0000000-0000-0000-0000-000000000317)
UPDATE agents SET
  introduction = 'I monitor the health of your strategic execution by tracking OKR progress, initiative status, and leading indicators. Share your strategic plan and current metrics, and I''ll deliver a health assessment with early warnings.',
  conversation_starters = '["Assess the health of our current strategic execution across all OKRs", "Which strategic initiatives are at risk and why?", "Provide an early warning analysis of our strategy execution for Q1"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000317';

-- Strategy Map Designer (a0000000-0000-0000-0000-000000000301)
UPDATE agents SET
  introduction = 'I design Balanced Scorecard strategy maps that visually connect your objectives across financial, customer, process, and learning perspectives. Share your strategic objectives and I''ll create a linked strategy map with cause-and-effect logic.',
  conversation_starters = '["Design a Balanced Scorecard strategy map for our organization", "Create a strategy map linking our financial goals to operational capabilities", "Map the cause-and-effect relationships between our strategic objectives"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000301';

-- Tech Radar Analyst (2ed8d176-73aa-4e4a-ad4d-f00c2beb2d5e)
UPDATE agents SET
  conversation_starters = '["Assess emerging technologies relevant to our industry for next year", "Should we adopt, trial, or hold on these 5 technologies?", "What technology trends should inform our product roadmap?"]'::jsonb
WHERE id = '2ed8d176-73aa-4e4a-ad4d-f00c2beb2d5e';

-- Tech Stack Scanner (f22ab600-6e96-479b-9a4c-0f2e7a39e01c)
UPDATE agents SET
  conversation_starters = '["Scan our current tech stack and identify gaps and redundancies", "Assess our technology infrastructure against industry best practices", "What modernization priorities should we focus on in our tech stack?"]'::jsonb
WHERE id = 'f22ab600-6e96-479b-9a4c-0f2e7a39e01c';

-- Technology Radar Analyst (a0000000-0000-0000-0000-000000000310)
UPDATE agents SET
  introduction = 'I analyze the technology landscape to identify emerging tools, platforms, and innovations relevant to your business. I''ll deliver a technology radar assessment with adopt/trial/assess/hold recommendations.',
  conversation_starters = '["Build a technology radar for AI tools relevant to our business", "What emerging technologies should we be evaluating for adoption?", "Analyze the technology landscape for opportunities in our sector"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000310';

-- TL Article Writer (358bd001-6404-4d53-a055-2aebdf02adb6)
UPDATE agents SET
  introduction = 'I write thought leadership articles that establish expertise and authority in your domain. Share your topic, key insights, and target audience, and I''ll craft a compelling article that positions you as a thought leader.',
  conversation_starters = '["Write a thought leadership article on the future of AI in our industry", "Create an article establishing our expertise in responsible AI adoption", "Draft a thought leadership piece on digital transformation lessons learned"]'::jsonb
WHERE id = '358bd001-6404-4d53-a055-2aebdf02adb6';

-- TL Article Writer (a0000001-0000-4000-a000-000000000304)
UPDATE agents SET
  introduction = 'I write thought leadership articles that establish expertise and authority in your domain. Share your topic, key insights, and target audience, and I''ll craft a compelling article that positions you as a thought leader.',
  conversation_starters = '["Write a thought leadership article on the future of AI in our industry", "Create an article establishing our expertise in responsible AI adoption", "Draft a thought leadership piece on digital transformation lessons learned"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000304';

-- TL LinkedIn Generator (c64e279b-a1e6-475f-a013-53144fab6766)
UPDATE agents SET
  introduction = 'I create thought leadership LinkedIn posts that drive engagement and establish professional authority. Share your topic, key message, and audience, and I''ll craft posts optimized for the LinkedIn algorithm and professional impact.',
  conversation_starters = '["Create a LinkedIn post about our perspective on AI governance", "Write a thought leadership post about a key trend in our industry", "Generate a series of LinkedIn posts for our upcoming product launch"]'::jsonb
WHERE id = 'c64e279b-a1e6-475f-a013-53144fab6766';

-- TL LinkedIn Generator (a0000001-0000-4000-a000-000000000305)
UPDATE agents SET
  introduction = 'I create thought leadership LinkedIn posts that drive engagement and establish professional authority. Share your topic, key message, and audience, and I''ll craft posts optimized for the LinkedIn algorithm and professional impact.',
  conversation_starters = '["Create a LinkedIn post about our perspective on AI governance", "Write a thought leadership post about a key trend in our industry", "Generate a series of LinkedIn posts for our upcoming product launch"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000305';

-- TL Strategy Architect (a0000001-0000-4000-a000-000000000301)
UPDATE agents SET
  introduction = 'I design comprehensive thought leadership strategies that build authority, drive engagement, and generate business opportunities. Share your expertise areas and business goals, and I''ll create a thought leadership roadmap.',
  conversation_starters = '["Design a 12-month thought leadership strategy for our CEO", "Create a thought leadership roadmap targeting enterprise decision-makers", "Build a content authority plan around our key expertise areas"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000301';

-- TL Strategy Architect (71329b82-c7a0-4131-ae1d-a0fff39ae2de)
UPDATE agents SET
  introduction = 'I design comprehensive thought leadership strategies that build authority, drive engagement, and generate business opportunities. Share your expertise areas and business goals, and I''ll create a thought leadership roadmap.',
  conversation_starters = '["Design a 12-month thought leadership strategy for our CEO", "Create a thought leadership roadmap targeting enterprise decision-makers", "Build a content authority plan around our key expertise areas"]'::jsonb
WHERE id = '71329b82-c7a0-4131-ae1d-a0fff39ae2de';

-- Training Path Recommender (a0000000-0000-0000-0000-000000000222)
UPDATE agents SET
  introduction = 'I design personalized training and development paths based on current skills, career goals, and organizational needs. Share your team member profiles and development objectives, and I''ll recommend targeted learning paths.',
  conversation_starters = '["Recommend a training path for our team to build AI skills", "Design a development path for a manager transitioning to a director role", "What training should we prioritize for our analytics team this quarter?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000222';

-- Trust & Safety Messenger (a0000000-0000-0000-0000-000000000232)
UPDATE agents SET
  introduction = 'I craft trust and safety communications that are clear, empathetic, and aligned with your values. Whether it''s incident response, policy updates, or user notifications, I''ll help you communicate sensitive topics effectively.',
  conversation_starters = '["Draft a communication about the data privacy incident for our customers", "Write a transparent update about the service disruption and our response", "Create messaging for our new AI usage policy that builds user trust"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000232';

-- Unit Economics Analyst (a0000000-0000-0000-0000-000000000214)
UPDATE agents SET
  introduction = 'I analyze unit economics to help you understand the true profitability of your products, services, and customer segments. Share your business model details and I''ll calculate key unit economics metrics with improvement recommendations.',
  conversation_starters = '["Analyze the unit economics of our core product offering", "Break down customer acquisition cost versus lifetime value by segment", "What unit economics improvements would have the biggest impact on margins?"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000214';

-- Values Excavator (a0000000-0000-0000-0000-000000000211)
UPDATE agents SET
  introduction = 'I help you discover and articulate your organization''s core values through structured exploration of beliefs, behaviors, and decision patterns. I''ll guide you through a values discovery process and deliver a clear values framework.',
  conversation_starters = '["Guide us through discovering our organization core values", "Help us articulate the values that actually drive our decision-making", "Our stated values feel generic — help us find what truly differentiates us"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000211';

-- Vision & Mission Synthesizer (a0000000-0000-0000-0000-000000000212)
UPDATE agents SET
  introduction = 'I help you craft compelling vision and mission statements that capture your organization''s purpose, aspiration, and strategic direction. Share your context and aspirations, and I''ll synthesize clear, inspiring statements.',
  conversation_starters = '["Help us craft a new vision statement for the next chapter of our company", "Our mission statement is outdated — guide us through creating a new one", "Synthesize a vision and mission that captures our AI-first strategy"]'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000212';

-- Writing Coach (a0000001-0000-4000-a000-000000000007)
UPDATE agents SET
  introduction = 'I help you improve your writing — from structure and clarity to tone and persuasion. Share a draft or describe what you''re working on, and I''ll provide coaching feedback with specific suggestions for improvement.',
  conversation_starters = '["Review this executive summary and help me improve clarity and impact", "Coach me on making this proposal more persuasive", "Help me restructure this report for better flow and readability"]'::jsonb
WHERE id = 'a0000001-0000-4000-a000-000000000007';

-- Content Writer (a1000001-0001-0001-0001-000000000001) — intro only, starters already exist
UPDATE agents SET
  introduction = 'I''m the Synergi AI Content Writer. I create on-brand content aligned with your voice and values — from blog posts and social media to marketing copy and newsletters. Tell me what you need written and I''ll craft content that resonates with your audience.'
WHERE id = 'a1000001-0001-0001-0001-000000000001';

COMMIT;

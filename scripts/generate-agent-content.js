#!/usr/bin/env node
/**
 * Generate introductions and conversation starters for agents missing them.
 * Reads from /tmp/agents_gaps.json (exported from DB) and writes SQL migration.
 */

const fs = require('fs');
const path = require('path');

const agents = JSON.parse(fs.readFileSync('/tmp/agents_gaps.json', 'utf8'));

function esc(s) { return s.replace(/'/g, "''"); }

// --- Introductions keyed by agent name ---
const introductions = {
  'AI Opportunity Ranker': "I'll help you evaluate and rank AI adoption opportunities based on business impact, feasibility, and strategic alignment. Share your potential AI use cases and I'll produce a prioritized assessment with implementation recommendations.",
  'AI Readiness': "I assess your organization's readiness for AI adoption across key dimensions including data infrastructure, talent, governance, and culture. Share your current state and I'll identify gaps and recommend a readiness roadmap.",
  'AI Risk & Compliance Scout': "I identify and assess AI-related risks across regulatory, ethical, operational, and reputational dimensions. Describe your AI initiative and I'll deliver a structured risk assessment with mitigation strategies and compliance considerations.",
  'AI Upskilling OKR Generator': "I create targeted OKRs for AI upskilling programs aligned to your organization's strategic goals. Tell me about your team's current AI capabilities and business objectives, and I'll generate measurable upskilling OKRs with key results and milestones.",
  'AI Visibility Researcher': "I research and analyze how AI is being discussed, adopted, and perceived in your industry. Share your sector and focus areas, and I'll deliver insights on AI trends, competitor adoption, and thought leadership opportunities.",
  'Align 120 Orchestrator': "I orchestrate the Align 120 strategic alignment process, guiding you through mission validation, values calibration, and strategic priority setting. I'll help ensure your team's activities are aligned with your organization's core purpose and direction.",
  'Assumption Tester': "I stress-test the assumptions underlying your business strategies, plans, and decisions. Share your key assumptions and I'll systematically evaluate their validity, identify hidden risks, and suggest how to de-risk your approach.",
  'Best Practice Researcher': "I research and synthesize best practices from industry leaders, academic research, and proven frameworks relevant to your challenge. Tell me the domain or problem area and I'll deliver actionable best practices with supporting evidence.",
  'Brand Voice Extractor': "I analyze your existing content to extract and codify your brand voice DNA — including tone, vocabulary, sentence patterns, and emotional register. Share samples of your content and I'll produce a comprehensive brand voice guide.",
  'BSC-OKR Cascade Validator': "I validate that your OKRs properly cascade from your Balanced Scorecard strategy map, checking for alignment gaps, missing linkages, and measurement consistency. Share your BSC perspectives and OKR hierarchy and I'll identify misalignments and recommend fixes.",
  'Business Case Builder': "I build structured, persuasive business cases with financial analysis, risk assessment, and stakeholder-ready recommendations. Describe your proposed initiative and I'll create a comprehensive business case with ROI projections and implementation roadmap.",
  'Campaign Strategist': "I design multi-channel marketing campaign strategies aligned to your business objectives and target audiences. Share your campaign goals, audience, and constraints, and I'll deliver a strategic campaign plan with messaging, channels, timeline, and KPIs.",
  'Cash Flow Optimizer': "I analyze your cash flow patterns and identify optimization opportunities across receivables, payables, inventory, and working capital. Share your financial data or describe your cash flow challenges, and I'll recommend specific strategies to improve liquidity.",
  'Change Readiness Analyst': "I assess your organization's readiness for change initiatives by evaluating leadership alignment, stakeholder sentiment, cultural factors, and capability gaps. Describe your planned change and I'll deliver a readiness assessment with risk mitigation strategies.",
  'Code Reviewer': "I review code for quality, security vulnerabilities, performance issues, and adherence to best practices. Paste your code or describe what you need reviewed, and I'll provide detailed feedback with specific improvement suggestions.",
  'Competitive Intelligence Analyst': "I gather and analyze competitive intelligence to give you actionable insights on competitor strategies, positioning, and market moves. Share your competitors and market context, and I'll deliver a structured competitive analysis.",
  'Competitive Positioning Analyst': "I analyze your competitive positioning relative to key rivals, identifying differentiation opportunities and positioning gaps. Share your product, market, and competitors, and I'll recommend positioning strategies backed by evidence.",
  'Content Pillar Designer': "I design content pillar frameworks that establish thought leadership authority in your key topic areas. Share your expertise domains and audience, and I'll create a structured content pillar strategy with topic clusters, formats, and publishing cadence.",
  'Counterfactual Analyst': "I explore alternative scenarios by asking 'what if' questions about your past decisions, strategies, and outcomes. Describe a decision or event, and I'll analyze what might have happened under different choices to extract strategic lessons.",
  'Craft a Business Process': "I help you design and document business processes with clear steps, roles, decision points, and success metrics. Describe the process you need to create or improve, and I'll deliver a structured process definition.",
  'Create a Brand Voice': "I help you create a distinctive brand voice from scratch by exploring your values, audience, and differentiation. I'll guide you through a structured discovery process and deliver a comprehensive brand voice framework.",
  'Culture & Engagement Tracker': "I track and analyze organizational culture and employee engagement indicators to surface trends, risks, and improvement opportunities. Share your engagement data or describe cultural dynamics, and I'll deliver insights with recommended actions.",
  'Customer Lifetime Value Agent': "I calculate and analyze customer lifetime value across segments, identifying high-value cohorts and opportunities to increase CLV. Share your customer data or business model, and I'll deliver CLV analysis with retention and growth strategies.",
  'Customer Satisfaction Analyzer': "I analyze customer satisfaction data from surveys, reviews, and feedback to identify trends, drivers, and improvement opportunities. Share your satisfaction data or describe the customer experience challenges you're facing.",
  'Customer Sentiment Monitor': "I monitor and analyze customer sentiment across feedback channels to detect shifts in perception, emerging issues, and satisfaction drivers. Share your customer feedback sources and I'll deliver sentiment analysis with actionable recommendations.",
  'Cycle Time Optimizer': "I analyze process cycle times to identify bottlenecks, waste, and optimization opportunities that reduce lead times and improve throughput. Describe your process or share cycle time data, and I'll recommend specific improvements.",
  'Daily Briefer': "I compile your personalized daily briefing covering key metrics, upcoming priorities, market developments, and items requiring your attention. Let me know your focus areas and I'll prepare your briefing.",
  'Decision Assistant': "I help you structure complex decisions using proven frameworks — weighing criteria, evaluating options, stress-testing assumptions, and documenting your reasoning. Describe the decision you're facing and I'll guide you through a rigorous analysis.",
  'Decision Framer': "I help you frame decisions clearly before you solve them — defining the real question, identifying stakeholders, surfacing constraints, and mapping the decision landscape. Tell me about the decision you're wrestling with.",
  'Decision Journal': "I help you maintain a structured decision journal, recording your decisions, reasoning, expected outcomes, and actual results to build decision-making skill over time. Share a decision to log or review your past entries.",
  'Deep Research': "I conduct deep, multi-source research on complex topics, synthesizing findings into structured, evidence-based reports. Tell me what you need researched and I'll deliver comprehensive analysis with sources.",
  'Dependency Mapper': "I map dependencies across projects, systems, teams, and initiatives to reveal hidden risks, bottlenecks, and critical paths. Describe what you need mapped and I'll create a structured dependency analysis with risk priorities.",
  'Drift Detector': "I monitor strategic drift by comparing current activities, metrics, and priorities against your stated strategy and OKRs. Share your strategic plan and current state, and I'll identify where you've drifted and recommend course corrections.",
  'Email Composer': "I craft professional, effective emails tailored to your audience and objective — from executive communications to client outreach. Tell me who you're writing to, what you need to communicate, and the tone you want.",
  'Email Triager': "I help you triage and prioritize your email by categorizing messages by urgency, required action, and strategic importance. Share your emails and I'll organize them with recommended responses and priorities.",
  'Evidence Collector': "I systematically gather and organize evidence to support strategic decisions, business cases, and compliance requirements. Tell me what you need evidence for and I'll compile a structured evidence package with source evaluation.",
  'Executive Communication Specialist': "I craft executive-level communications — board presentations, stakeholder updates, strategic memos, and leadership messages. Share your communication need and audience, and I'll draft polished content that resonates with senior leaders.",
  'Find Best Practices': "I research and compile best practices relevant to your specific challenge, drawing from industry leaders, academic research, and proven frameworks. Describe your problem area and I'll deliver curated, actionable best practices.",
  'First Principles Thinker': "I break down complex problems to their fundamental truths and rebuild solutions from the ground up. Share a challenge or assumption you want to rethink, and I'll guide you through a first-principles analysis.",
  'Get AI News': "I scan and curate the latest AI news, research breakthroughs, industry developments, and regulatory updates relevant to your interests. Tell me your focus areas and I'll deliver a structured AI news briefing.",
  'Get Prof Services News': "I monitor and curate news, trends, and developments in the professional services industry. I'll deliver a structured briefing covering market moves, technology adoption, talent trends, and competitive dynamics.",
  'Governance RACI Builder': "I create RACI matrices for governance structures, ensuring clear accountability across decisions, processes, and initiatives. Describe the governance area and stakeholders, and I'll build a comprehensive RACI framework.",
  'Higgins Strategy Advisor': "I'm Higgins, your Socratic strategic advisor. I don't give easy answers — I ask rigorous questions to help you think more clearly about strategy, decisions, and priorities. Challenge me with your toughest strategic questions.",
  'Innovation Capacity Agent': "I assess your organization's innovation capacity across culture, processes, resources, and leadership support. Share your innovation goals and current state, and I'll deliver a capacity assessment with recommendations to unlock more innovation.",
  'Integrity Auditor': "I audit organizational integrity by examining alignment between stated values, policies, and actual practices. Share your values framework and operational context, and I'll identify integrity gaps with remediation recommendations.",
  'KPI/OKR Alignment Mapper': "I map the alignment between your KPIs and OKRs to ensure your metrics actually measure what matters strategically. Share your OKR hierarchy and KPI set, and I'll identify gaps, redundancies, and misalignments.",
  'Leading/Lagging Indicator Classifier': "I classify your metrics as leading or lagging indicators, then ensure you have a balanced measurement system that predicts outcomes, not just reports them. Share your metrics and I'll create a classified indicator framework.",
  'Market Intelligence Scout': "I scout market intelligence across competitors, customers, trends, and emerging opportunities. Share your market focus and I'll deliver structured intelligence with strategic implications and recommended actions.",
  'Market Share Tracker': "I track and analyze market share dynamics across your competitive landscape, identifying share shifts, growth drivers, and competitive threats. Share your market context and I'll deliver market share analysis with strategic recommendations.",
  'Meeting Prep': "I prepare comprehensive meeting briefings with attendee profiles, agenda analysis, talking points, and anticipated questions. Tell me about your upcoming meeting and I'll create a prep package to help you walk in fully prepared.",
  'Operational Excellence Agent': "I assess and improve operational excellence across your processes, identifying waste, variation, and improvement opportunities using lean and six sigma principles. Describe your operational challenge and I'll deliver an improvement roadmap.",
  'Policy Drafter': "I draft clear, comprehensive policies aligned to your organizational values, regulatory requirements, and best practices. Tell me the policy area and context, and I'll create a structured policy document ready for review.",
  'Portfolio Prioritizer': "I help you prioritize your project and initiative portfolio based on strategic alignment, resource constraints, dependencies, and expected value. Share your portfolio and criteria, and I'll deliver a prioritized ranking with rationale.",
  'Process Documenter': "I document business processes in clear, structured formats including step-by-step procedures, RACI assignments, decision points, and exception handling. Describe the process and I'll create comprehensive documentation.",
  'Process Efficiency Analyzer': "I analyze business processes to identify inefficiencies, bottlenecks, redundancies, and automation opportunities. Describe your process or share process data, and I'll deliver an efficiency assessment with improvement recommendations.",
  'Process Miner': "I discover and analyze actual process flows from your operational data, comparing real behavior to designed processes and identifying deviations, bottlenecks, and optimization opportunities.",
  'Profitability Tracker': "I analyze profitability across products, customers, channels, and business units to identify margin drivers, profit leaks, and optimization opportunities. Share your financial data or describe your profitability challenge.",
  'Quality OKR Generator': "I generate quality-focused OKRs that drive measurable improvements in product quality, service delivery, and operational consistency. Share your quality goals and current metrics, and I'll create targeted OKRs with actionable key results.",
  'Quarterly Review Facilitator': "I facilitate structured quarterly business reviews by analyzing performance against OKRs, identifying themes, and generating discussion agendas. Share your quarterly data and I'll prepare a comprehensive review framework.",
  'Regulatory Monitor': "I monitor regulatory developments and compliance requirements relevant to your industry and geography. Share your regulatory landscape and I'll track changes, assess impact, and recommend compliance actions.",
  'Research Analyst': "I conduct structured research and analysis on business topics, delivering evidence-based insights with clear methodology and sourcing. Tell me what you need analyzed and I'll produce a comprehensive research brief.",
  'Research Assistant': "I help with research tasks — finding information, synthesizing sources, fact-checking claims, and organizing findings into useful formats. What would you like me to research?",
  'Resource Planner': "I help you plan resource allocation across projects, teams, and initiatives — balancing capacity, skills, priorities, and constraints. Share your resource landscape and I'll deliver an optimized allocation plan with scenario analysis.",
  'Retention OKR Generator': "I generate customer retention-focused OKRs with measurable key results tied to churn reduction, satisfaction improvement, and loyalty building. Share your retention goals and current metrics, and I'll create targeted OKRs.",
  'Revenue OKR Generator': "I generate revenue-focused OKRs that drive measurable growth across acquisition, expansion, and monetization. Share your revenue targets and growth strategy, and I'll create OKRs with specific, trackable key results.",
  'Risk Sentinel': "I continuously assess and monitor organizational risks across strategic, operational, financial, and compliance dimensions. Share your risk landscape and I'll deliver a structured risk assessment with severity ratings and mitigation priorities.",
  'Risk-Benefit Analyzer': "I conduct structured risk-benefit analyses for your initiatives, investments, and strategic decisions. Describe the option you're evaluating and I'll weigh risks against benefits with a clear recommendation framework.",
  'ROI Measurement Agent': "I design ROI measurement frameworks and calculate return on investment for your initiatives, programs, and technology investments. Share your initiative details and I'll deliver a comprehensive ROI analysis.",
  'Sales Assistant': "I help with sales tasks including prospect research, objection handling, follow-up messaging, and deal strategy. Tell me about your sales situation and I'll provide actionable support.",
  'Scenario Modeler': "I build and analyze strategic scenarios to help you prepare for multiple futures. Describe the uncertainties you're facing and I'll create scenario models with implications, early indicators, and contingency strategies.",
  'Second Opinion Generator': "I provide rigorous second opinions on your strategies, plans, and decisions by challenging assumptions, identifying blind spots, and offering alternative perspectives. Share what you want pressure-tested.",
  'Skills Gap OKR Analyzer': "I analyze skills gaps in your organization and generate targeted OKRs to close them. Share your current team capabilities and strategic needs, and I'll identify critical gaps with measurable upskilling objectives.",
  'Skills Matrix Assessor': "I assess and build skills matrices for your teams, mapping current capabilities against required competencies and identifying development priorities. Share your team context and I'll create a comprehensive skills assessment.",
  'Stakeholder Mapper': "I map stakeholder relationships, influence, and interests to help you navigate complex organizational dynamics. Describe your initiative and key players, and I'll create a stakeholder map with engagement strategies.",
  'Strategic Advisor': "I provide strategic advice on business challenges, helping you think through options, trade-offs, and implications. Share your strategic question and I'll deliver structured analysis with actionable recommendations.",
  'Strategic Context Assembler': "I assemble comprehensive strategic context packages by pulling together relevant data, analysis, and insights needed for decision-making. Tell me what decision needs context and I'll compile a thorough briefing.",
  'Strategic Theme Synthesizer': "I synthesize strategic themes from diverse data sources — market signals, internal metrics, stakeholder feedback, and competitive intelligence. Share your inputs and I'll identify the key strategic themes with supporting evidence.",
  'Strategy 120 Orchestrator': "I orchestrate the Strategy 120 process, guiding you through strategic analysis, option generation, and strategy formulation in a structured 120-minute framework. Let's build your strategy together.",
  'Strategy Advisor': "I provide strategic counsel on business decisions, competitive moves, and growth opportunities. Share your strategic challenge and I'll deliver structured analysis with recommended courses of action.",
  'Strategy Communicator': "I help you communicate strategy clearly and compellingly across all levels of your organization. Share your strategy and target audience, and I'll craft communication materials that drive understanding and alignment.",
  'Strategy Document Generator': "I generate comprehensive strategy documents — from one-page summaries to detailed strategic plans. Share your strategic direction and I'll produce a polished document ready for stakeholder review.",
  'Strategy Health Monitor': "I monitor the health of your strategic execution by tracking OKR progress, initiative status, and leading indicators. Share your strategic plan and current metrics, and I'll deliver a health assessment with early warnings.",
  'Strategy Map Designer': "I design Balanced Scorecard strategy maps that visually connect your objectives across financial, customer, process, and learning perspectives. Share your strategic objectives and I'll create a linked strategy map with cause-and-effect logic.",
  'Tech Radar Analyst': "I track and analyze emerging technologies relevant to your industry, assessing maturity, adoption trends, and strategic implications. I'll help you decide what to adopt, trial, assess, or hold.",
  'Tech Stack Scanner': "I scan and assess your technology stack against best practices, identifying gaps, redundancies, security concerns, and modernization opportunities.",
  'Technology Radar Analyst': "I analyze the technology landscape to identify emerging tools, platforms, and innovations relevant to your business. I'll deliver a technology radar assessment with adopt/trial/assess/hold recommendations.",
  'TL Article Writer': "I write thought leadership articles that establish expertise and authority in your domain. Share your topic, key insights, and target audience, and I'll craft a compelling article that positions you as a thought leader.",
  'TL LinkedIn Generator': "I create thought leadership LinkedIn posts that drive engagement and establish professional authority. Share your topic, key message, and audience, and I'll craft posts optimized for the LinkedIn algorithm and professional impact.",
  'TL Strategy Architect': "I design comprehensive thought leadership strategies that build authority, drive engagement, and generate business opportunities. Share your expertise areas and business goals, and I'll create a thought leadership roadmap.",
  'Training Path Recommender': "I design personalized training and development paths based on current skills, career goals, and organizational needs. Share your team member profiles and development objectives, and I'll recommend targeted learning paths.",
  'Trust & Safety Messenger': "I craft trust and safety communications that are clear, empathetic, and aligned with your values. Whether it's incident response, policy updates, or user notifications, I'll help you communicate sensitive topics effectively.",
  'Unit Economics Analyst': "I analyze unit economics to help you understand the true profitability of your products, services, and customer segments. Share your business model details and I'll calculate key unit economics metrics with improvement recommendations.",
  'Values Excavator': "I help you discover and articulate your organization's core values through structured exploration of beliefs, behaviors, and decision patterns. I'll guide you through a values discovery process and deliver a clear values framework.",
  'Vision & Mission Synthesizer': "I help you craft compelling vision and mission statements that capture your organization's purpose, aspiration, and strategic direction. Share your context and aspirations, and I'll synthesize clear, inspiring statements.",
  'Writing Coach': "I help you improve your writing — from structure and clarity to tone and persuasion. Share a draft or describe what you're working on, and I'll provide coaching feedback with specific suggestions for improvement.",
  // Agents that only need starters (already have intro)
  'Competitive Research': null,
  'Content Writer': null,
};

// --- Conversation starters keyed by agent name ---
const starters = {
  'AI Opportunity Ranker': ['Rank these AI use cases by business impact and feasibility for our organization', 'Evaluate whether we should invest in an AI-powered customer service chatbot', 'Compare three AI adoption opportunities and recommend which to pursue first'],
  'AI Readiness': ['Assess our readiness to adopt AI across all key dimensions', 'We want to deploy LLMs internally — evaluate our data and governance readiness', 'What gaps do we need to close before launching our first AI pilot?'],
  'AI Risk & Compliance Scout': ['Assess the risks of deploying a customer-facing AI chatbot', 'What regulatory requirements should we consider for our AI hiring tool?', 'Evaluate the ethical and compliance risks of using AI for credit decisions'],
  'AI Upskilling OKR Generator': ['Create upskilling OKRs for our marketing team to adopt AI tools', 'Generate OKRs for a company-wide AI literacy program', 'Design OKRs to upskill our data team from traditional analytics to ML/AI'],
  'AI Visibility Researcher': ['Research how AI is being discussed in the professional services industry', 'What are the top AI adoption trends in our sector this quarter?', 'Identify thought leadership opportunities around AI in financial services'],
  'Align 120 Orchestrator': ['Start the Align 120 process for our executive team', 'Help us validate our mission statement against current market reality', 'Guide us through a strategic priority alignment session'],
  'Assumption Tester': ['Test the key assumptions in our go-to-market strategy', 'Challenge our assumption that enterprise clients will pay premium pricing', 'What are the riskiest assumptions in this business plan?'],
  'Best Practice Researcher': ['Research best practices for implementing OKRs in a mid-sized company', 'What are best practices for AI governance in regulated industries?', 'Find proven approaches to improving employee retention in tech companies'],
  'Brand Voice Extractor': ['Analyze these blog posts and extract our brand voice characteristics', 'Compare our brand voice across website copy, social media, and emails', 'Create a brand voice guide from our last 10 pieces of published content'],
  'BSC-OKR Cascade Validator': ['Validate that our department OKRs align with our Balanced Scorecard', 'Check if our team-level key results connect to strategic objectives', 'Identify gaps in our OKR cascade from corporate to department level'],
  'Business Case Builder': ['Build a business case for investing in an AI-powered analytics platform', 'Create a business case for expanding into a new market segment', 'Draft a business case for hiring a dedicated data science team'],
  'Campaign Strategist': ['Design a campaign strategy to launch our new product to enterprise buyers', 'Create a multi-channel campaign plan for our annual conference', 'Plan a thought leadership campaign to establish authority in AI ethics'],
  'Cash Flow Optimizer': ['Analyze our cash conversion cycle and recommend improvements', 'Identify opportunities to optimize our accounts receivable process', 'How can we improve working capital without cutting growth investments?'],
  'Change Readiness Analyst': ['Assess our readiness for migrating to a new CRM platform', 'Evaluate organizational readiness for a major restructuring initiative', 'What change risks should we address before rolling out the new process?'],
  'Code Reviewer': ['Review this Python function for security vulnerabilities and best practices', 'Check this API endpoint for performance issues and error handling gaps', 'Review this database query for SQL injection risks and optimization'],
  'Competitive Intelligence Analyst': ['Build a competitive profile for our top three rivals in the market', 'What strategic moves have our competitors made in the last quarter?', 'Analyze competitor pricing strategies and identify our positioning gap'],
  'Competitive Positioning Analyst': ['Analyze our positioning versus the top 3 competitors in our category', 'Identify differentiation opportunities we are not exploiting', 'Recommend a positioning strategy for entering the enterprise segment'],
  'Competitive Research': ['Research the competitive landscape for AI-powered analytics tools', 'Deep dive into how our main competitor is positioning their new product', 'Compare feature sets across the top 5 players in our market'],
  'Content Pillar Designer': ['Design content pillars for establishing thought leadership in AI governance', 'Create a content pillar strategy for our B2B SaaS marketing', 'Build a topic cluster framework around our core expertise areas'],
  'Content Writer': ['Write a blog post about the future of AI in professional services', 'Draft a case study showcasing our recent client success story', 'Create compelling copy for our new product landing page'],
  'Counterfactual Analyst': ['What if we had entered the enterprise market two years earlier?', 'Analyze what would have happened if we chose a different pricing model', 'What if we had invested in AI capabilities instead of expanding sales?'],
  'Craft a Business Process': ['Design a process for onboarding new enterprise clients', 'Create a structured process for quarterly strategic reviews', 'Document the process for evaluating and approving new AI tools'],
  'Create a Brand Voice': ['Help us create a brand voice for our new B2B SaaS product', 'We are rebranding — guide us through building a new voice framework', 'Design a brand voice that differentiates us in a crowded market'],
  'Culture & Engagement Tracker': ['Analyze our latest engagement survey results and identify trends', 'Track cultural indicators across departments and flag risk areas', 'What engagement patterns should we watch after the recent restructuring?'],
  'Customer Lifetime Value Agent': ['Calculate CLV across our customer segments and identify the most valuable', 'How can we increase customer lifetime value for our mid-tier accounts?', 'Analyze which acquisition channels produce the highest CLV customers'],
  'Customer Satisfaction Analyzer': ['Analyze our NPS scores over the last four quarters and identify trends', 'What are the primary drivers of customer dissatisfaction in our support data?', 'Compare satisfaction scores across product lines and recommend improvements'],
  'Customer Sentiment Monitor': ['Analyze customer sentiment from our recent product launch reviews', 'Monitor sentiment shifts after our pricing change announcement', 'What are customers saying about us versus competitors on review sites?'],
  'Cycle Time Optimizer': ['Analyze our order fulfillment cycle time and find bottlenecks', 'How can we reduce our software release cycle from 4 weeks to 2?', 'Identify the top 3 cycle time bottlenecks in our service delivery process'],
  'Daily Briefer': ['Prepare my daily briefing focused on sales pipeline and key meetings', 'Give me a morning briefing covering team OKR progress and blockers', 'Create a daily digest of market developments in my industry'],
  'Decision Assistant': ['Help me decide whether to build or buy our analytics platform', 'Structure my decision on which market to expand into next', 'I need to choose between three vendor proposals — help me evaluate them'],
  'Decision Framer': ['Help me frame the decision about whether to pursue this acquisition', 'I am stuck on a resource allocation decision — help me define the real question', 'Frame the trade-offs in our build vs. partner debate'],
  'Decision Journal': ['Log my decision to restructure the sales team and my reasoning', 'Review my last 5 decisions and identify patterns in my decision-making', 'Record today pricing decision with expected outcomes for future review'],
  'Deep Research': ['Research the current state of AI regulation across major markets', 'Conduct a deep analysis of the professional services industry outlook', 'Research best practices for implementing responsible AI frameworks'],
  'Dependency Mapper': ['Map the dependencies between our top 5 strategic initiatives', 'Identify cross-team dependencies that could delay our product launch', 'What are the critical path dependencies in our digital transformation?'],
  'Drift Detector': ['Compare our current activities against our Q1 strategic plan', 'Are we drifting from our stated OKRs? Analyze our recent decisions', 'Check if our resource allocation still matches our strategic priorities'],
  'Email Composer': ['Draft a follow-up email to a prospect after a demo call', 'Write a professional email declining a partnership proposal', 'Compose an executive update email on our quarterly results'],
  'Email Triager': ['Help me prioritize these 20 emails by urgency and required action', 'Triage my inbox and identify which emails need a response today', 'Categorize these emails and draft quick responses for routine items'],
  'Evidence Collector': ['Gather evidence supporting our case for expanding into the EU market', 'Compile evidence for our board presentation on AI investment ROI', 'Collect supporting data for our compliance audit preparation'],
  'Executive Communication Specialist': ['Draft a board presentation on our AI strategy and progress', 'Write an all-hands message announcing the organizational restructuring', 'Create a stakeholder update on our strategic initiative outcomes'],
  'Find Best Practices': ['Find best practices for implementing AI governance in mid-sized companies', 'What are proven approaches to reducing customer churn in SaaS?', 'Research best practices for building a high-performing remote team'],
  'First Principles Thinker': ['Break down our pricing strategy to first principles', 'Rethink our customer acquisition approach from the ground up', 'Apply first principles thinking to our product development process'],
  'Get AI News': ['Give me the latest AI industry news relevant to professional services', 'What AI breakthroughs happened this week that could affect our business?', 'Curate AI regulation news from the US, EU, and UK'],
  'Get Prof Services News': ['What are the latest trends in the professional services industry?', 'Summarize this week major moves in consulting and advisory firms', 'What technology adoption news is relevant for professional services?'],
  'Governance RACI Builder': ['Create a RACI matrix for our AI governance framework', 'Build a RACI for the new product development approval process', 'Design governance RACI for our data management responsibilities'],
  'Higgins Strategy Advisor': ['Challenge my assumption that we should expand internationally next year', 'I think our competitive advantage is our technology — push back on that', 'Help me think through whether our current strategy is actually working'],
  'Innovation Capacity Agent': ['Assess our capacity to innovate across all dimensions', 'What is blocking innovation in our product development team?', 'Compare our innovation capacity to industry benchmarks and recommend improvements'],
  'Integrity Auditor': ['Audit alignment between our stated values and actual decision-making patterns', 'Check if our hiring practices align with our diversity commitments', 'Identify integrity gaps between our published ethics policy and operational behavior'],
  'KPI/OKR Alignment Mapper': ['Map our department KPIs to our corporate OKRs and find gaps', 'Are our sales metrics actually measuring what our strategy requires?', 'Identify KPIs that do not connect to any strategic objective'],
  'Leading/Lagging Indicator Classifier': ['Classify our current dashboard metrics as leading or lagging indicators', 'We are only tracking lagging indicators — help us identify leading ones', 'Build a balanced leading/lagging indicator framework for our sales team'],
  'Market Intelligence Scout': ['Scout the latest market intelligence on AI adoption in healthcare', 'What market signals should we be watching in our competitive landscape?', 'Gather intelligence on emerging market opportunities in our sector'],
  'Market Share Tracker': ['Analyze market share trends in our industry over the past 2 years', 'Which competitors are gaining share and what is driving it?', 'Track our market share movement after last quarter product launch'],
  'Meeting Prep': ['Prepare me for tomorrow board meeting on strategic planning', 'Create a briefing for my meeting with the new enterprise prospect', 'Prepare talking points and anticipated questions for the investor call'],
  'Operational Excellence Agent': ['Assess operational excellence maturity across our key processes', 'Identify the top waste reduction opportunities in our service delivery', 'Design an operational improvement roadmap for the next two quarters'],
  'Policy Drafter': ['Draft an acceptable use policy for AI tools in our organization', 'Create a data governance policy aligned with GDPR requirements', 'Write a remote work policy that balances flexibility with accountability'],
  'Portfolio Prioritizer': ['Prioritize our portfolio of 12 strategic initiatives for next quarter', 'We have limited resources — help us rank these 8 projects by value', 'Re-prioritize our project portfolio given the new budget constraints'],
  'Process Documenter': ['Document our client onboarding process from initial sale to go-live', 'Create process documentation for our monthly financial close procedure', 'Document the escalation process for critical customer issues'],
  'Process Efficiency Analyzer': ['Analyze our quote-to-cash process for efficiency improvements', 'Where are the bottlenecks in our employee onboarding workflow?', 'Assess the efficiency of our content approval process and recommend changes'],
  'Process Miner': ['Discover the actual process flow in our order management system', 'Compare our designed procurement process to what actually happens', 'Mine our ticketing data to find hidden process variations and bottlenecks'],
  'Profitability Tracker': ['Analyze profitability by product line and identify margin improvement opportunities', 'Which customer segments are dragging down our overall profitability?', 'Track profitability trends over the last 4 quarters and flag concerns'],
  'Quality OKR Generator': ['Generate quality OKRs for our software development team', 'Create OKRs focused on improving customer service quality metrics', 'Design quality-focused OKRs for our manufacturing operations'],
  'Quarterly Review Facilitator': ['Prepare a quarterly review agenda based on our OKR performance data', 'Facilitate analysis of what worked and what did not this quarter', 'Generate discussion questions for our upcoming quarterly strategic review'],
  'Regulatory Monitor': ['Monitor regulatory changes affecting AI deployment in financial services', 'What new compliance requirements should we be aware of this quarter?', 'Track GDPR enforcement actions and their implications for our business'],
  'Research Analyst': ['Analyze the market opportunity for AI-powered analytics in our sector', 'Research the impact of recent regulatory changes on our industry', 'Provide a research brief on emerging business models in professional services'],
  'Research Assistant': ['Help me find recent studies on employee engagement and remote work', 'Summarize the key findings from this industry report', 'Research the latest thinking on AI governance frameworks'],
  'Resource Planner': ['Plan resource allocation across our Q2 project portfolio', 'We have a capacity constraint — help optimize team assignments', 'Model three resource scenarios for our upcoming product launch'],
  'Retention OKR Generator': ['Generate customer retention OKRs for our subscription business', 'Create OKRs focused on reducing enterprise customer churn', 'Design retention key results tied to our NPS improvement goals'],
  'Revenue OKR Generator': ['Generate revenue growth OKRs for next quarter', 'Create OKRs for our new market expansion revenue targets', 'Design OKRs that drive both new business acquisition and account expansion'],
  'Risk Sentinel': ['Assess the top strategic risks facing our organization this quarter', 'Monitor and rate the risks associated with our AI deployment plans', 'Identify emerging risks from recent market and regulatory developments'],
  'Risk-Benefit Analyzer': ['Analyze the risks and benefits of acquiring this competitor', 'Should we adopt this new technology? Evaluate the risk-benefit trade-off', 'Weigh the risks versus benefits of entering a new geographic market'],
  'ROI Measurement Agent': ['Design an ROI measurement framework for our AI investment program', 'Calculate the ROI of our recent digital transformation initiative', 'How should we measure return on our employee training investments?'],
  'Sales Assistant': ['Help me prepare for a discovery call with an enterprise prospect', 'Draft follow-up talking points after today product demo', 'What objections should I anticipate for this deal and how do I handle them?'],
  'Scenario Modeler': ['Model three scenarios for our business if the market contracts 20%', 'What happens to our strategy if our main competitor gets acquired?', 'Build best-case, worst-case, and most-likely scenarios for our product launch'],
  'Second Opinion Generator': ['Give me a second opinion on our go-to-market strategy', 'Challenge the assumptions in our three-year strategic plan', 'I think we should double our sales team — argue the other side'],
  'Skills Gap OKR Analyzer': ['Analyze skills gaps in our engineering team relative to our AI roadmap', 'Identify the critical skills gaps blocking our strategic objectives', 'Generate OKRs to close the top 3 skills gaps in our organization'],
  'Skills Matrix Assessor': ['Build a skills matrix for our product development team', 'Assess our marketing team capabilities against industry benchmarks', 'Identify which team members are best positioned for AI-related roles'],
  'Stakeholder Mapper': ['Map the stakeholders for our digital transformation initiative', 'Identify key influencers and blockers for our organizational change', 'Create a stakeholder engagement plan for the new product launch'],
  'Strategic Advisor': ['Advise on whether we should pursue a vertical or horizontal growth strategy', 'Help me think through our competitive response to the new market entrant', 'What strategic options should we consider given our current market position?'],
  'Strategic Context Assembler': ['Assemble strategic context for our upcoming board strategy session', 'Pull together all relevant data for our market entry decision', 'Build a comprehensive context package for evaluating this partnership opportunity'],
  'Strategic Theme Synthesizer': ['Synthesize strategic themes from our recent customer feedback and market data', 'What patterns emerge from our Q4 performance data and competitive analysis?', 'Identify the dominant strategic themes across our department OKR reviews'],
  'Strategy 120 Orchestrator': ['Start the Strategy 120 process for our annual strategic planning', 'Guide us through a rapid strategy formulation for the new business unit', 'Run a Strategy 120 session focused on our competitive positioning'],
  'Strategy Advisor': ['Help me evaluate our current competitive strategy', 'What strategic pivots should we consider given the market shift?', 'Advise on our resource allocation strategy for the next fiscal year'],
  'Strategy Communicator': ['Help us communicate our new strategic direction to all employees', 'Craft a strategy narrative for our investor presentation', 'Create a one-page strategy summary for department leaders'],
  'Strategy Document Generator': ['Generate a comprehensive strategic plan document for the next fiscal year', 'Create a strategy one-pager for our board presentation', 'Draft a strategic initiative proposal with timeline and resource requirements'],
  'Strategy Health Monitor': ['Assess the health of our current strategic execution across all OKRs', 'Which strategic initiatives are at risk and why?', 'Provide an early warning analysis of our strategy execution for Q1'],
  'Strategy Map Designer': ['Design a Balanced Scorecard strategy map for our organization', 'Create a strategy map linking our financial goals to operational capabilities', 'Map the cause-and-effect relationships between our strategic objectives'],
  'Tech Radar Analyst': ['Assess emerging technologies relevant to our industry for next year', 'Should we adopt, trial, or hold on these 5 technologies?', 'What technology trends should inform our product roadmap?'],
  'Tech Stack Scanner': ['Scan our current tech stack and identify gaps and redundancies', 'Assess our technology infrastructure against industry best practices', 'What modernization priorities should we focus on in our tech stack?'],
  'Technology Radar Analyst': ['Build a technology radar for AI tools relevant to our business', 'What emerging technologies should we be evaluating for adoption?', 'Analyze the technology landscape for opportunities in our sector'],
  'TL Article Writer': ['Write a thought leadership article on the future of AI in our industry', 'Create an article establishing our expertise in responsible AI adoption', 'Draft a thought leadership piece on digital transformation lessons learned'],
  'TL LinkedIn Generator': ['Create a LinkedIn post about our perspective on AI governance', 'Write a thought leadership post about a key trend in our industry', 'Generate a series of LinkedIn posts for our upcoming product launch'],
  'TL Strategy Architect': ['Design a 12-month thought leadership strategy for our CEO', 'Create a thought leadership roadmap targeting enterprise decision-makers', 'Build a content authority plan around our key expertise areas'],
  'Training Path Recommender': ['Recommend a training path for our team to build AI skills', 'Design a development path for a manager transitioning to a director role', 'What training should we prioritize for our analytics team this quarter?'],
  'Trust & Safety Messenger': ['Draft a communication about the data privacy incident for our customers', 'Write a transparent update about the service disruption and our response', 'Create messaging for our new AI usage policy that builds user trust'],
  'Unit Economics Analyst': ['Analyze the unit economics of our core product offering', 'Break down customer acquisition cost versus lifetime value by segment', 'What unit economics improvements would have the biggest impact on margins?'],
  'Values Excavator': ['Guide us through discovering our organization core values', 'Help us articulate the values that actually drive our decision-making', 'Our stated values feel generic — help us find what truly differentiates us'],
  'Vision & Mission Synthesizer': ['Help us craft a new vision statement for the next chapter of our company', 'Our mission statement is outdated — guide us through creating a new one', 'Synthesize a vision and mission that captures our AI-first strategy'],
  'Writing Coach': ['Review this executive summary and help me improve clarity and impact', 'Coach me on making this proposal more persuasive', 'Help me restructure this report for better flow and readability'],
};

// Build SQL
let sql = '-- Phase 57: Agent Introductions & Conversation Starters\n';
sql += '-- Generated: ' + new Date().toISOString().split('T')[0] + '\n';
sql += '-- Updates introductions and conversation_starters for agents with missing content\n';
sql += '-- Preserves existing content where present\n\n';
sql += 'BEGIN;\n\n';

let updateCount = 0;

agents.forEach(agent => {
  const needsIntro = !agent.has_introduction;
  const needsStarters = !agent.has_starters;

  if (!needsIntro && !needsStarters) return;

  const intro = needsIntro ? introductions[agent.name] : null;
  const starterList = needsStarters ? starters[agent.name] : null;

  // Skip if we have nothing to set (intro explicitly null means agent already has one)
  if (intro === null && starterList === null) return;
  if (intro === undefined && starterList === undefined) return;

  const parts = [];
  if (intro) {
    parts.push(`  introduction = '${esc(intro)}'`);
  }
  if (starterList) {
    const startersSql = starterList.map(s => `'${esc(s)}'`).join(', ');
    parts.push(`  conversation_starters = ARRAY[${startersSql}]`);
  }

  if (parts.length === 0) return;

  sql += `-- ${agent.name} (${agent.id})\n`;
  sql += `UPDATE agents SET\n`;
  sql += parts.join(',\n');
  sql += `\nWHERE id = '${agent.id}';\n\n`;
  updateCount++;
});

sql += 'COMMIT;\n';

const outputPath = path.join(__dirname, '..', 'db', 'phase57-agent-introductions.sql');
fs.writeFileSync(outputPath, sql);
console.log(`Wrote ${updateCount} UPDATE statements to db/phase57-agent-introductions.sql`);

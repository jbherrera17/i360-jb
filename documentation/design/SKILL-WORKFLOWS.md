# Skill Workflows in Insight 360

This document defines the two agent workflows: Standard Agents (without skills) and Skill-Powered Agents.

---

## Workflow 1: Standard Agent (No Skill)

```
┌─────────────────────────────────────────────────────────────────┐
│                    STANDARD AGENT WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

User creates agent via UI
        │
        ▼
┌───────────────────────────────────────┐
│           AGENT DEFINITION            │
│  • Name, description, icon            │
│  • System prompt (manual entry)       │
│  • LLM provider + model               │
│  • Category + suite                   │
│  • Conversation starters              │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│         CONTEXT MAPPINGS              │
│  • Select context assets              │
│  • Set injection mode per asset       │
│    (always/on_demand/conditional)     │
│  • Set priority + token limits        │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│            EXECUTION                  │
│  1. User sends message                │
│  2. System assembles context          │
│  3. Builds: system_prompt + context   │
│  4. Calls LLM                         │
│  5. Returns response                  │
└───────────────────────────────────────┘
```

### Characteristics

- Prompt is free-form, written by user
- Context assets optional
- Generic - can do anything
- No structured output expectations
- No versioning/updates from external source

---

## Workflow 2: Skill-Powered Agent

```
┌─────────────────────────────────────────────────────────────────┐
│                  SKILL-POWERED AGENT WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │         SKILL DEFINITION        │
                    │  (Created via Skill Creator)    │
                    │                                 │
                    │  • Name + description           │
                    │  • Purpose & triggers           │
                    │  • Required context types       │
                    │  • Step-by-step instructions    │
                    │  • Output format/structure      │
                    │  • Examples & templates         │
                    │  • Version number               │
                    └────────────────┬────────────────┘
                                     │
                                     │ attach skill
                                     ▼
┌───────────────────────────────────────────────────────────────────┐
│                        AGENT DEFINITION                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ INHERITED FROM SKILL:                                        │ │
│  │  • System prompt (from SKILL.md)                            │ │
│  │  • Required context types (voice_dna, icp, etc.)            │ │
│  │  • Output expectations                                       │ │
│  │  • Conversation starters (from skill triggers)              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ CONFIGURED PER AGENT:                                        │ │
│  │  • LLM provider + model                                     │ │
│  │  • Specific context asset selections                        │ │
│  │  • Custom guardrails/overrides                              │ │
│  │  • Agent-specific metadata                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                     CONTEXT VALIDATION                            │
│  • Check required context types are mapped                        │
│  • Warn if missing required assets                                │
│  • Auto-suggest compatible assets                                 │
└───────────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────┐
│                        EXECUTION                                  │
│  1. User sends message                                            │
│  2. Validate required context present                             │
│  3. Assemble context (respecting skill's token budget)            │
│  4. Build: skill_instructions + context + user_message            │
│  5. Call LLM                                                      │
│  6. Validate output against skill expectations (optional)         │
│  7. Return structured response                                    │
└───────────────────────────────────────────────────────────────────┘
```

### Characteristics

- Prompt is structured, from skill definition
- Context assets required (enforced)
- Specialized - does one thing well
- Structured output expectations
- Versioned - can update skill, agents inherit changes
- Reusable - one skill → many agents with different context

---

## Side-by-Side Comparison

| Aspect | Standard Agent | Skill-Powered Agent |
|--------|---------------|---------------------|
| **System Prompt** | Manual entry, free-form | Inherited from skill, structured |
| **Context Assets** | Optional, user choice | Required types enforced by skill |
| **Purpose** | General-purpose assistant | Specialized task execution |
| **Output** | Unstructured | Defined format (article, package, etc.) |
| **Versioning** | None | Skill versions, agents can update |
| **Reusability** | One-off | Skill reused across multiple agents |
| **Creation Time** | Quick | Requires skill first |
| **Maintenance** | Per-agent | Update skill → all agents benefit |
| **Examples** | "Help me brainstorm" | "Generate article using my voice" |

---

## Two Paths for Agent Creation

```
                         AGENT CREATION
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌────────────────┐              ┌────────────────┐
     │  FROM SCRATCH  │              │  FROM SKILL    │
     │  (Standard)    │              │  (Powered)     │
     └───────┬────────┘              └───────┬────────┘
             │                               │
             ▼                               ▼
     • Write prompt                  • Select skill
     • Choose context                • Map context assets
     • Configure LLM                 • Configure LLM
     • Free-form                     • Inherits structure
             │                               │
             └───────────────┬───────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │     AGENT      │
                    │   Execution    │
                    └────────────────┘
```

---

## Skill Creator Tool

The Skill Creator is a dedicated interface in Insight 360 for building, testing, and managing skills.

### Skill Creator Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SKILL CREATOR TOOL                          │
│                    /dashboard/skills/create                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: SKILL IDENTITY                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Skill Name:     [article-generator____________]                │
│  Display Name:   [Article Generator____________]                │
│  Description:    [Generates thought leadership articles...]     │
│                                                                  │
│  Category:       [Content ▼]   Suite: [Execute ▼]               │
│  Tags:           [content] [writing] [marketing] [+]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: CONTEXT REQUIREMENTS                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Required Context Types:                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [✓] voice_dna      - Writing style and tone             │    │
│  │ [✓] icp            - Target audience profile            │    │
│  │ [ ] products       - Product/service information        │    │
│  │ [ ] company_desc   - Company background                 │    │
│  │ [ ] competitors    - Competitive landscape              │    │
│  │ [ ] custom...      - [Add custom type]                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Token Budget:   [4000____] per context type                    │
│  Total Budget:   [8000____] max context tokens                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: SKILL INSTRUCTIONS                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ## Purpose                                               │    │
│  │ You are an expert content writer specializing in...      │    │
│  │                                                          │    │
│  │ ## Process                                               │    │
│  │ 1. Analyze the topic and target audience                │    │
│  │ 2. Structure using the 5-section framework:             │    │
│  │    - Opening Hook                                        │    │
│  │    - Problem Statement                                   │    │
│  │    ...                                                   │    │
│  │                                                          │    │
│  │ ## Output Format                                         │    │
│  │ Return a markdown article with:                          │    │
│  │ - Title (H1)                                            │    │
│  │ - Sections (H2)                                         │    │
│  │ ...                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Rich Editor] [Markdown] [AI Assist]                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: TRIGGERS & STARTERS                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  When should this skill be suggested?                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • "create an article about..."                          │    │
│  │ • "write thought leadership on..."                      │    │
│  │ • "generate marketing content for..."                   │    │
│  │ [+ Add trigger phrase]                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Conversation Starters (shown to user):                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • "Create an article about [topic]"                     │    │
│  │ • "Write a thought leadership piece on [subject]"       │    │
│  │ [+ Add starter]                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: EXAMPLES & TEMPLATES (Optional)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Example Outputs:                                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [+ Add Example]  Shows the skill what good output looks   │  │
│  │                  like. Used for few-shot learning.        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Templates:                                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [+ Add Template] Reusable structures the skill can        │  │
│  │                  reference during generation.             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: TEST & VALIDATE                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Test your skill before saving:                                  │
│                                                                  │
│  Context Assets:  [Voice DNA - JB v2 ▼] [ICP - Small Prof ▼]   │
│                                                                  │
│  Test Input:      [Write an article about AI adoption_______]   │
│                                                                  │
│  [Run Test]                                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Output Preview:                                          │    │
│  │                                                          │    │
│  │ # How Small Firms Can Master AI Adoption                │    │
│  │                                                          │    │
│  │ The promise of artificial intelligence has never...      │    │
│  │ ...                                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [✓] Output matches expected format                              │
│  [✓] Voice DNA reflected in tone                                 │
│  [✓] ICP audience addressed                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: SAVE & PUBLISH                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Version:    [1.0.0_____]                                       │
│  Changelog:  [Initial release_______________________]           │
│                                                                  │
│  Visibility: (•) Private  ( ) Team  ( ) Public                  │
│                                                                  │
│  [Save as Draft]  [Save & Publish]  [Export SKILL.md]           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Skill Creator Features

| Feature | Description |
|---------|-------------|
| **AI Assist** | Use Claude to help write skill instructions |
| **Context Validation** | Warns if required context types don't exist |
| **Live Preview** | Test skill with real context assets |
| **Version Control** | Track changes, rollback to previous versions |
| **Export/Import** | Export as `SKILL.md` file, import from file |
| **Skill Templates** | Start from pre-built skill templates |
| **Usage Analytics** | See which agents use this skill, execution stats |

---

## Skill Library Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  SKILL LIBRARY                            [+ Create New Skill]   │
│  /dashboard/skills                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [All] [Content] [Research] [Analysis] [Workflow]  Search       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Article Generator                              v1.2.0   │    │
│  │ Generates thought leadership articles                    │    │
│  │ Required: voice_dna, icp                                │    │
│  │ Used by: 3 agents  |  127 executions                    │    │
│  │ [Edit] [Duplicate] [Create Agent] [Export]              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Weekly Article Package                         v1.0.0   │    │
│  │ Generates complete weekly content packages               │    │
│  │ Required: voice_dna, icp, editorial_calendar            │    │
│  │ Used by: 1 agent   |  23 executions                     │    │
│  │ [Edit] [Duplicate] [Create Agent] [Export]              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Skill Creator                                  v1.0.0   │    │
│  │ Meta-skill for creating new skills                       │    │
│  │ Required: none                                          │    │
│  │ Used by: 0 agents  |  5 executions                      │    │
│  │ [Edit] [Duplicate] [Create Agent] [Export]              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Creating an Agent from a Skill

```
┌─────────────────────────────────────────────────────────────────┐
│  CREATE AGENT FROM SKILL                                         │
│  Skill: Article Generator v1.2.0                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent Name:     [JB Article Writer_______________]             │
│  Description:    [Auto-filled from skill, editable]             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  INHERITED FROM SKILL (read-only):                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ System Prompt: [View] (213 lines from skill)            │    │
│  │ Required Context: voice_dna, icp                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  CONFIGURE FOR THIS AGENT:                                       │
│                                                                  │
│  LLM Provider:   [Anthropic ▼]                                  │
│  Model:          [claude-sonnet-4-5-20250929 ▼]                 │
│                                                                  │
│  Map Required Context:                                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ voice_dna  →  [JB Brand Voice DNA v2 ▼]     ✓ Mapped    │    │
│  │ icp        →  [Small Prof Services ICP ▼]   ✓ Mapped    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Additional Context (optional):                                  │
│  [+ Add more context assets]                                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  [ ] Auto-update when skill version changes                      │
│  [✓] Active                                                      │
│                                                                  │
│  [Cancel]                              [Create Agent]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

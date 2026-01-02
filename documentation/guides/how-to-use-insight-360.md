# How To Use Insight 360

**A Practical Guide to Building AI-Powered Workflows**

---

## Understanding the Core Concepts

Insight 360 has four key building blocks that work together to create powerful, reusable AI workflows:

| Component | What It Is | Analogy |
|-----------|------------|---------|
| **System Prompts** | Raw instruction text for a single chat | A sticky note |
| **Context Assets** | Reusable information (brand voice, ICPs, etc.) | A reference document |
| **Skills** | Reusable workflow templates | A recipe |
| **Agents** | AI personas that execute work | A specialist employee |

---

## The Four Building Blocks Explained

### 1. System Prompts (in Chat)

**What**: Raw instruction text that guides an LLM's behavior for a single conversation.

- **Scope**: Per-conversation (not reusable)
- **Storage**: Text field in `conversations` table
- **Versioning**: None
- **Purpose**: One-off chat guidance, experimentation
- **Can be transformed into**: Skills, Agents, or Context Assets via the Prompt Transformer

**When to use**: Quick experiments, one-time tasks, testing ideas before formalizing them.

---

### 2. Context Assets

**What**: Reusable information that gets injected into AI conversations automatically.

**Common Types**:
| Type | Purpose | Example |
|------|---------|---------|
| `voice_dna` | Brand voice guidelines | Tone, vocabulary, personality |
| `icp` | Ideal Customer Profile | Pain points, goals, objections |
| `products` | Product information | Features, benefits, pricing |
| `competitors` | Competitive intel | Strengths, weaknesses, positioning |

**Key Features**:
- Create once, use across multiple agents
- Update in one place, affects all linked agents
- Can be injected `always`, `on_demand`, or `conditionally`

---

### 3. Skills

**What**: Reusable workflow templates that define *what to do* - the repeatable process.

**Key Fields**:
- `instructions` - Step-by-step guidance
- `required_context_types` - What context is needed (e.g., voice_dna, icp)
- `examples` - Input/output samples
- `templates` - Reusable content templates
- `trigger_phrases` - When to suggest the skill

**Key Features**:
- **Versioned**: Every change creates a new version (can rollback)
- **Attachable**: Can be linked to multiple agents
- **Auto-update**: Agents can sync when skill improves

**When to use**: Any workflow you want to run repeatedly with consistent quality.

---

### 4. Agents

**What**: Persistent AI personas that combine skills with context to execute work.

**Key Fields**:
- `system_prompt` - Core instructions (or inherited from skill)
- `llm_provider` / `llm_model` - Which AI to use
- `temperature` - Creativity level (0.0 = precise, 1.0 = creative)
- `skill_id` - Optional link to a skill
- `context_mappings` - Which context assets to inject

**Agent Types**:
- **Custom/LLM** - Uses system_prompt directly
- **MindStudio** - Delegates to external workflow
- **Skill-attached** - Uses skill's instructions as prompt

**When to use**: Any task you want to execute consistently with the right context.

---

## How They Work Together

```
CONTEXT ASSETS          SKILLS
(the knowledge)         (the workflow)
      │                      │
      └──────────┬───────────┘
                 │
                 ▼
              AGENTS
         (the executor)
                 │
                 ▼
          CONVERSATIONS
          (the output)
```

---

## Practical Example: Email Campaign Workflow

### The Goal
Create reusable email campaigns that:
- Use company brand voice consistently
- Target a specific ICP
- Can be run repeatedly for different products

---

### Step 1: Create Context Assets (One-Time Setup)

**Brand Voice Asset** (`voice_dna`):
```
Tone: Professional yet approachable
Voice: Trusted advisors, not salespeople
Vocabulary: Clear business language, no jargon
Do: Use "you", ask questions, provide value first
Don't: Be pushy, use ALL CAPS, make empty promises
```

**ICP Asset** (`icp`):
```
Title: Chief Marketing Officer
Company Size: 500-5000 employees
Pain Points: Proving ROI, aligning with sales, scaling content
Goals: Pipeline growth, brand awareness, team efficiency
Communication Style: Data-driven, concise, strategic
```

---

### Step 2: Create a Skill (The Workflow)

**Email Campaign Generator** skill:

```markdown
# Email Campaign Generator

## Purpose
Generate complete email sequences using brand voice and targeting the ICP.

## Required Context
- voice_dna: Company brand voice
- icp: Target audience profile

## Process
1. Review brand voice guidelines
2. Understand ICP pain points and goals
3. Ask for: Campaign goal, product/offer, number of emails, CTA
4. Generate the email sequence with:
   - Subject lines (2-3 options)
   - Preview text
   - Body copy
   - CTA button text

## Output Format
### Email [N]: [Purpose]
**Subject Options:**
1. [Option 1]
2. [Option 2]

**Preview Text:** [Preview]
**Body:** [Email content]
**CTA:** [Button text]
```

---

### Step 3: Create an Agent (The Executor)

**Email Campaign Specialist** agent:
- **Skill**: email-campaign-generator (auto-update enabled)
- **Context**: Brand Voice (always), Enterprise CMO (always)
- **Model**: Claude Sonnet
- **Temperature**: 0.7 (creative but consistent)

---

### Step 4: Use It (Repeatedly)

Each time you need a campaign:

1. Open chat with **Email Campaign Specialist**
2. Prompt: *"Create a 4-email nurture sequence for our AI Analytics launch"*
3. Agent automatically:
   - Loads brand voice
   - Loads ICP profile
   - Follows skill workflow
   - Generates complete campaign
4. Iterate: *"Make email 2 more urgent"*

---

## Visual Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    ONE-TIME SETUP                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTEXT ASSETS              SKILL                          │
│  ┌──────────────┐           ┌──────────────────────┐       │
│  │ Brand Voice  │           │ Email Campaign       │       │
│  │ (voice_dna)  │           │ Generator            │       │
│  └──────────────┘           │                      │       │
│  ┌──────────────┐           │ • Instructions       │       │
│  │ Enterprise   │           │ • Required context   │       │
│  │ CMO (icp)    │           │ • Output format      │       │
│  └──────────────┘           └──────────────────────┘       │
│         │                            │                      │
│         └────────────┬───────────────┘                      │
│                      ▼                                      │
│              ┌──────────────────┐                           │
│              │ EMAIL CAMPAIGN   │                           │
│              │ SPECIALIST       │                           │
│              │ (Agent)          │                           │
│              └──────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    REPEATED USE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Create a 4-email sequence for AI Analytics launch"  │
│                      │                                      │
│                      ▼                                      │
│  Agent assembles: Brand Voice + ICP + Skill Instructions    │
│                      │                                      │
│                      ▼                                      │
│  OUTPUT: Complete 4-email campaign                          │
│  • On-brand (uses voice_dna)                               │
│  • Targeted (uses ICP pain points)                         │
│  • Structured (follows skill format)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: When to Use What

| I want to... | Use |
|--------------|-----|
| Experiment quickly | System Prompt in Chat |
| Store reusable information | Context Asset |
| Define a repeatable workflow | Skill |
| Execute with consistent quality | Agent |
| Link to business structure (OKRs, depts) | Action |

---

## Benefits of This Architecture

| Benefit | How It's Achieved |
|---------|-------------------|
| **Consistency** | Same skill = same quality every time |
| **Reusability** | Context assets shared across agents |
| **Maintainability** | Update once, all linked items benefit |
| **Scalability** | Clone agents for different ICPs |
| **Versioning** | Skills track changes, can rollback |

---

## Advanced: Actions vs Agents

**Agents** are for chat-based AI execution with injected context.

**Actions** are for business-aligned web app experiences that connect to:
- OKRs (supports, measures, drives)
- Departments (serves, owned_by)
- Processes (executes, automates)
- Roles (view, execute, configure, admin)

Use **Actions** when you need organizational context from Parthenon (your business structure), not just content context.

---

## Getting Started Checklist

1. [ ] Create your **Brand Voice** context asset
2. [ ] Create your primary **ICP** context asset
3. [ ] Build your first **Skill** (start simple)
4. [ ] Create an **Agent** that uses the skill
5. [ ] Map context assets to the agent
6. [ ] Test with a real task
7. [ ] Iterate on the skill instructions
8. [ ] Scale by creating more ICPs and skills

---

## Summary

**System Prompts** = Quick experiments (the sticky note)
**Context Assets** = Reusable knowledge (the reference docs)
**Skills** = Reusable workflows (the recipe)
**Agents** = AI personas (the specialist)

Separate *what you know* (context) from *what you do* (skills) from *who does it* (agents) for maximum reusability and maintainability.

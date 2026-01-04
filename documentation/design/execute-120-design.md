# Execute 120 Design Document

**The Department-Focused Execution Hub**

Execute 120 completes the Insight 360 "120" trilogy:
- **Align 120**: Values alignment and integrity governance
- **Strategy 120**: Strategic planning with specialized agents
- **Execute 120**: Departmental execution with role-based workflows

---

## Vision

Execute 120 provides department-specific landing pages that present the most relevant agents, use cases, and workflows for each functional area. Users see what matters to their role immediately, reducing cognitive load and accelerating time-to-value.

---

## User Flow Options

### Option A: Department Selector Landing Page

**Structure:**
```
/execute120 → Department selection → Department-specific view
```

**Landing Page:**
- Grid of 5 department cards (Executive, Marketing, Sales, Finance, Operations)
- Each card shows:
  - Department name and icon
  - Key agents available
  - Sample use cases
  - "Enter" button

**Pros:**
- Single entry point
- Clear mental model
- Easy to find any department
- Users can explore other departments

**Cons:**
- Extra click to reach content
- May feel redundant for daily users

---

### Option B: Direct Department URLs

**Structure:**
```
/execute120/executive
/execute120/marketing
/execute120/sales
/execute120/finance
/execute120/operations
```

**Navigation:**
- Sidebar or top nav shows all departments
- Can bookmark specific department
- Direct links from onboarding

**Pros:**
- Fastest path to daily work
- Can share direct links
- Supports role-based defaults

**Cons:**
- More routes to maintain
- Discovery of other departments less obvious

---

### Option C: Unified Page with Department Tabs (Recommended)

**Structure:**
```
/execute120 → Tab-based navigation between departments
```

**Layout:**
- Horizontal department tabs at top
- Remember last-selected tab
- Deep-link support (/execute120?dept=sales)

**Pros:**
- Single page, easy to maintain
- Fast switching between departments
- Can compare agents across teams
- Works well with URL parameters

**Cons:**
- All content loads (can lazy-load)

---

## Recommended Design: Option C with Enhancements

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Execute 120                                    [Settings]  │
│  Department Execution Hub                                   │
├─────────────────────────────────────────────────────────────┤
│  [Executive] [Marketing] [Sales] [Finance] [Operations]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MARKETING                                           │   │
│  │  "Craft magnetic stories that convert"               │   │
│  │                                                      │   │
│  │  Key Metrics: SQLs +25% | CAC ↓15% | Awareness +10  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ QUICK START  │  │  AGENTS      │  │  WORKFLOWS   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RECOMMENDED AGENTS FOR MARKETING                    │   │
│  │                                                      │   │
│  │  [Campaign Strategist] [Competitive Intel] [Writing] │   │
│  │  [Research Assistant]  [Content Atomizer]            │   │
│  │                                                      │   │
│  │  + View All Strategy 120 Agents                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  COMMON WORKFLOWS                                    │   │
│  │                                                      │   │
│  │  📝 Create Campaign Strategy                         │   │
│  │  🎯 Generate Competitive Battlecard                  │   │
│  │  ✍️  Write Blog Post with Brand Voice                │   │
│  │  📧 Build Email Nurture Sequence                     │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  QUICK START PROMPTS                                 │   │
│  │                                                      │   │
│  │  "Generate a Q2 campaign strategy for..."            │   │
│  │  "Create a battlecard for [competitor]..."           │   │
│  │  "Write a blog post on [topic]..."                   │   │
│  │                                                      │   │
│  │  [Copy] [Start Chat with This]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Department Content Configuration

### Data Structure

```javascript
const departments = {
  executive: {
    id: 'executive',
    name: 'Executive',
    tagline: 'Architect your legacy enterprise',
    icon: 'crown',
    color: '#6366f1', // Primary purple
    metrics: ['30% YoY Growth', 'EBITDA +3pts', 'NPS > 70'],
    roles: ['CEO', 'Founder', 'President'],
    agents: [
      'Executive Communication Specialist',
      'Strategic Advisor',
      'First Principles Thinker',
      'Daily Briefer',
      'Integrity Auditor'
    ],
    workflows: [
      { name: 'Board Meeting Prep', icon: 'presentation' },
      { name: 'Investor Update', icon: 'trending-up' },
      { name: 'Strategic Decision Analysis', icon: 'git-branch' },
      { name: 'Crisis Communication', icon: 'alert-triangle' }
    ],
    prompts: [
      'Prepare board materials for our Q4 review covering...',
      'Draft an investor update highlighting...',
      'Analyze this strategic decision using first principles...'
    ],
    useGuideUrl: '/documentation/use-cases/01-ceo-founder.md'
  },

  marketing: {
    id: 'marketing',
    name: 'Marketing',
    tagline: 'Craft magnetic stories that convert',
    icon: 'megaphone',
    color: '#ec4899', // Pink
    metrics: ['SQLs +25%', 'CAC ↓15%', 'Awareness +10pts'],
    roles: ['CMO', 'VP Marketing', 'Marketing Manager', 'Content Strategist'],
    agents: [
      'Campaign Strategist',
      'Competitive Intelligence Analyst',
      'Writing Coach',
      'Research Assistant',
      'First Principles Thinker'
    ],
    workflows: [
      { name: 'Campaign Strategy', icon: 'layout' },
      { name: 'Competitive Battlecard', icon: 'target' },
      { name: 'Content Creation', icon: 'edit-3' },
      { name: 'Brand Voice Review', icon: 'check-circle' }
    ],
    prompts: [
      'Develop a Q2 campaign strategy for [product] targeting...',
      'Create a competitive battlecard for [competitor]...',
      'Write a thought leadership blog post on...',
      'Generate 5 LinkedIn posts from this article...'
    ],
    useGuideUrl: '/documentation/use-cases/02-cmo-vp-marketing.md'
  },

  sales: {
    id: 'sales',
    name: 'Sales',
    tagline: 'Crush quota with precision and relationships',
    icon: 'dollar-sign',
    color: '#10b981', // Green
    metrics: ['120% Quota', 'Cycle ↓20%', 'Win Rate +10%'],
    roles: ['CRO', 'VP Sales', 'Sales Director', 'Account Executive'],
    agents: [
      'Proposal Generator',
      'Competitive Intelligence Analyst',
      'Meeting Prep',
      'Writing Coach',
      'Strategic Advisor'
    ],
    workflows: [
      { name: 'Proposal Creation', icon: 'file-text' },
      { name: 'Meeting Preparation', icon: 'users' },
      { name: 'Deal Strategy', icon: 'trending-up' },
      { name: 'Win/Loss Analysis', icon: 'bar-chart-2' }
    ],
    prompts: [
      'Create a proposal for [company] addressing...',
      'Prepare me for a meeting with [company] about...',
      'Help me respond to this objection: "..."',
      'Generate discovery questions for a CFO about...'
    ],
    useGuideUrl: '/documentation/use-cases/04-cro-vp-sales.md'
  },

  finance: {
    id: 'finance',
    name: 'Finance',
    tagline: 'Every dollar returns multiples',
    icon: 'pie-chart',
    color: '#f59e0b', // Amber
    metrics: ['Payback ≤18mo', 'IRR ≥25%', 'OpEx ↓8%'],
    roles: ['CFO', 'Finance Director', 'Finance Manager', 'FP&A'],
    agents: [
      'First Principles Thinker',
      'Risk Sentinel',
      'Research Assistant',
      'Writing Coach',
      'Counterfactual Analyst'
    ],
    workflows: [
      { name: 'Board Financial Summary', icon: 'file-text' },
      { name: 'Investment Analysis', icon: 'trending-up' },
      { name: 'Variance Explanation', icon: 'activity' },
      { name: 'Risk Assessment', icon: 'shield' }
    ],
    prompts: [
      'Prepare a board financial summary for Q4...',
      'Analyze this investment opportunity with...',
      'Explain these budget variances...',
      'Assess financial risks for this initiative...'
    ],
    useGuideUrl: '/documentation/use-cases/06-cfo-finance-director.md'
  },

  operations: {
    id: 'operations',
    name: 'Operations',
    tagline: 'Process excellence fuels growth',
    icon: 'settings',
    color: '#8b5cf6', // Purple
    metrics: ['Cycle ↓20%', 'OTD >95%', 'COGS ↓5%'],
    roles: ['COO', 'VP Operations', 'Operations Manager', 'Process Analyst'],
    agents: [
      'Process Documenter',
      'Risk Sentinel',
      'First Principles Thinker',
      'Writing Coach',
      'Research Assistant'
    ],
    workflows: [
      { name: 'SOP Creation', icon: 'clipboard-list' },
      { name: 'Process Mapping', icon: 'git-branch' },
      { name: 'Vendor Evaluation', icon: 'check-square' },
      { name: 'Training Materials', icon: 'book-open' }
    ],
    prompts: [
      'Create an SOP for [process]...',
      'Document this process with decision points...',
      'Evaluate these vendors for [category]...',
      'Develop training materials for [topic]...'
    ],
    useGuideUrl: '/documentation/use-cases/08-coo-vp-operations.md'
  }
};
```

---

## Feature Details

### 1. Department Header
- Department name and tagline from buyer personas
- Key metrics relevant to that function
- Quick access to use case documentation

### 2. Recommended Agents Section
- Filtered list of most relevant agents for department
- Card display with:
  - Agent name and icon
  - Brief description
  - "Start Chat" button → Opens chat with agent pre-selected
- Link to Strategy 120 for full agent catalog

### 3. Common Workflows Section
- Pre-defined workflow templates
- Each workflow:
  - Name and icon
  - Brief description
  - Click to expand shows:
    - Step-by-step guide
    - Relevant agents for each step
    - Example prompts
    - Link to detailed use case doc

### 4. Quick Start Prompts
- Copy-paste ready prompts
- "Start Chat" opens chat with prompt pre-filled
- Organized by common tasks
- Pulls from use case documentation

### 5. Settings/Preferences
- Default department (remembered)
- Favorite agents (pinned)
- Custom workflow creation
- Role selection (CMO vs Marketing Manager)

---

## Technical Implementation

### Routes
```javascript
// Server routes (server/index.js)
app.get('/execute120', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/execute120.html'));
});

// API routes for department data
app.get('/api/execute120/departments', (req, res) => { ... });
app.get('/api/execute120/departments/:id', (req, res) => { ... });
app.get('/api/execute120/departments/:id/agents', (req, res) => { ... });
```

### Database Schema (Optional Enhancement)
```sql
-- Department configuration (if we want admin-editable)
CREATE TABLE department_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  icon text,
  color text,
  metrics jsonb,
  roles text[],
  agent_ids uuid[],
  workflows jsonb,
  prompts text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## User Onboarding Flow

### First-Time Execute 120 User

1. **Welcome Modal**
   - "Welcome to Execute 120"
   - "Select your primary department"
   - Department cards to choose from

2. **Optional Role Selection**
   - After department selection
   - "What's your role?"
   - Options based on department (CMO vs Marketing Manager)

3. **Personalized View**
   - Remember selection
   - Show role-appropriate prompts and workflows
   - Can change anytime from settings

---

## Relationship to Other Pages

### Navigation Integration
```
┌─────────────────────────────────────────────────────────┐
│  [Dashboard] [Chat] [Agents] [Parthenon]                │
│                                                         │
│  [Align 120] [Strategy 120] [Execute 120] [Briefings]   │
└─────────────────────────────────────────────────────────┘
```

### Cross-Linking
- Execute 120 agents link to Strategy 120 for full details
- Workflows link to use case documentation in /guides
- Prompts open Chat with context

---

## Success Metrics

1. **Adoption**: Users who visit Execute 120 regularly
2. **Engagement**: Click-through to agents and workflows
3. **Efficiency**: Time from Execute 120 → Chat completion
4. **Satisfaction**: User feedback on department relevance

---

## Implementation Phases

### Phase 1: Basic Structure
- Create execute120.html page
- Implement department tabs
- Static department content
- Link to existing agents

### Phase 2: Dynamic Content
- Department data from database/config
- Agent filtering by department
- Workflow definitions

### Phase 3: Personalization
- User preferences storage
- Role-based content
- Favorite agents

### Phase 4: Analytics
- Usage tracking
- Popular workflows
- Content optimization

---

## Questions for Decision

1. **Should department configs be database-driven or static?**
   - Static: Simpler, faster to implement
   - Database: Admin can edit without code changes

2. **How deep should role differentiation go?**
   - Just departments (5 views)
   - Roles within departments (10+ views)

3. **Should workflows be executable or just guides?**
   - Guides: Show steps, link to agents
   - Executable: Multi-step wizard with agent chaining

4. **How to handle agents that span departments?**
   - Show in all relevant departments
   - Primary assignment with "also useful for" tags

---

*Last Updated: January 2026*

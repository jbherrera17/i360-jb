# SynergiNexus User Guide

**For:** Insight 360 Users
**Last Updated:** January 9, 2026

---

## What Is SynergiNexus?

SynergiNexus is your organization's AI governance dashboard. It ensures that all AI assistants in Insight 360 operate according to your organizational values and principles.

Think of it as the "constitution" for your AI systems - defining who they are, how they think, how they communicate, and what they can and cannot do.

---

## Key Concepts

### The DIGM Model

The **Disciplined Intelligence Governance Model** has four layers:

| Layer | What It Controls | Example |
|-------|------------------|---------|
| **Identity** | Who the AI is | "Advisory partner, not decision-maker" |
| **Cognitive** | How the AI thinks | "Surface assumptions, cite sources" |
| **Voice** | How the AI speaks | "Calm, grounded, never alarmist" |
| **Adaptation** | What can flex | "Adjust depth for audience" |

### Values & Principles

- **Values**: Core beliefs your organization holds (e.g., Integrity, Transparency)
- **Principles**: Specific rules derived from values (e.g., "Never fabricate data")
- **Non-negotiable**: Values that can never be compromised

### Conflicts & Escalation

When AI encounters a situation that might violate values, it logs a **conflict**. These are routed to appropriate administrators based on severity.

---

## Getting Started

### Accessing SynergiNexus

1. Log into Insight 360
2. In the sidebar, find **SynergiNexus** section
3. Click **Governance**

### Understanding the Dashboard

The top of the page shows four summary cards:

| Card | Shows |
|------|-------|
| **DIGM Configs** | Total governance configurations |
| **Governance Values** | Organizational values defined |
| **Principles** | Rules derived from values |
| **Open Conflicts** | Issues needing attention |

---

## Using the Tabs

### DIGM Layers Tab

View and manage the four governance layers.

**What You See:**
- Four expandable layer cards
- Each layer shows its configurations
- Active/inactive status for each config

**Common Tasks:**

**View Configuration Details:**
1. Find the layer (Identity, Cognitive, Voice, Adaptation)
2. Click the eye icon next to any configuration
3. Review the full configuration JSON

**Understand the Prompt Injection:**
Each DIGM config has a `prompt_injection` field - this text is automatically added to AI prompts to shape behavior.

### Values & Principles Tab

Manage your organizational values and their derived principles.

**What You See:**
- Value cards with associated principles
- Non-negotiable badge on critical values
- Principle type badges (Requirement, Prohibition, etc.)

**Understanding Principle Types:**

| Type | Meaning | Example |
|------|---------|---------|
| **Requirement** | Must always do | "Acknowledge uncertainty" |
| **Prohibition** | Must never do | "Never fabricate citations" |
| **Disclosure** | Must inform about | "Disclose limitations" |
| **Boundary** | Limit scope | "Minimize data collection" |

**Common Tasks:**

**Add a New Value:**
1. Click **Add Value** button
2. Enter:
   - Name (e.g., "Sustainability")
   - Plain meaning (simple explanation)
   - Why it matters (importance)
   - Toggle non-negotiable if critical
3. Click Save

**Add a Principle to a Value:**
1. Find the value card
2. Click **Add Principle**
3. Enter:
   - Statement (the rule)
   - Constraint type
   - When it applies
   - DIGM touchpoint (when in reasoning to apply)
4. Click Save

### Conflicts Tab

Monitor and resolve governance conflicts.

**What You See:**
- List of conflicts with severity indicators
- Status (Pending, Escalated, Resolved, Dismissed)
- Values involved in each conflict

**Severity Levels:**

| Level | Color | Meaning |
|-------|-------|---------|
| Low | Gray | Minor issue, low risk |
| Medium | Yellow | Moderate concern |
| High | Orange | Significant issue |
| Critical | Red | Urgent, values at risk |

**Resolving a Conflict:**
1. Click on a conflict to view details
2. Review the description and context
3. Choose action:
   - **Resolve**: Issue addressed, add notes
   - **Dismiss**: Not a real conflict, explain why
   - **Escalate**: Needs higher authority
4. Add resolution notes
5. Click Save

### Escalation Rules Tab

Configure how conflicts are routed by severity.

**What You See:**
- Rules for each severity level
- Resolver level assignment
- Auto-escalation timeframes
- Notification channels

**Configuration Options:**

| Setting | Purpose |
|---------|---------|
| **Resolver Level** | Who handles (Dept Admin, System Admin, Super Admin) |
| **Auto-Escalate After** | Hours before auto-escalation |
| **Notification Channels** | How to alert (Email, In-App, Slack, SMS) |

---

## Best Practices

### Setting Up Governance

1. **Start with Values**: Define 5-10 core organizational values
2. **Mark Non-Negotiables**: Identify which values can never flex
3. **Create Principles**: Add 2-5 principles per value
4. **Review DIGM**: Ensure identity, cognitive, voice, adaptation are configured

### Ongoing Management

- **Weekly**: Review pending conflicts
- **Monthly**: Analyze conflict patterns
- **Quarterly**: Review and update values/principles

### Responding to Conflicts

- **Don't ignore**: All conflicts should be addressed
- **Document decisions**: Add clear resolution notes
- **Learn patterns**: Recurring conflicts indicate governance gaps

---

## Understanding DIGM Touchpoints

Principles can be applied at different stages of AI reasoning:

| Touchpoint | Stage | When Applied |
|------------|-------|--------------|
| **Context** | 1 | When gathering information |
| **Decomposition** | 2 | When breaking down problems |
| **Reasoning** | 3 | During logical analysis |
| **Alternatives** | 4 | When considering options |
| **Synthesis** | 5 | When forming conclusions |

**Example:**
- "Never fabricate data" → Applied at **Reasoning** stage
- "Disclose limitations" → Applied at **Context** stage
- "Present multiple perspectives" → Applied at **Alternatives** stage

---

## Troubleshooting

**"Failed to load DIGM configuration"**
- Refresh the page
- Check your network connection
- Contact administrator if persists

**Conflicts not appearing**
- Ensure you have appropriate permissions
- Check filter settings
- Verify conflicts exist in the system

**Cannot edit values/principles**
- Verify you have admin permissions
- Non-negotiable values may have restrictions
- Contact super admin for access

**Escalation not working**
- Verify escalation rules are configured
- Check notification channel settings
- Ensure resolver levels are assigned

---

## Permissions

| Role | View | Create | Edit | Delete | Resolve Conflicts |
|------|------|--------|------|--------|-------------------|
| User | ✓ | - | - | - | - |
| Dept Admin | ✓ | - | - | - | Low/Medium |
| System Admin | ✓ | ✓ | ✓ | - | High |
| Super Admin | ✓ | ✓ | ✓ | ✓ | All |

---

## Related Guides

| Guide | Topic |
|-------|-------|
| [Tag Management Guide](./tags-user-guide.md) | Managing tags for role matching |
| [Role Management Guide](./roles-user-guide.md) | Department roles and access |
| [Strategy Governance Guide](./governance-user-guide.md) | Strategy health monitoring |

---

## Glossary

| Term | Definition |
|------|------------|
| **DIGM** | Disciplined Intelligence Governance Model |
| **Non-negotiable** | Value that can never be compromised |
| **Principle** | Specific rule derived from a value |
| **Constraint Type** | Category of principle (requirement, prohibition, etc.) |
| **Touchpoint** | Stage in AI reasoning where principle applies |
| **Escalation** | Routing conflict to higher authority |

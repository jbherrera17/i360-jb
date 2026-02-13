# Strategy 120 User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## What Is Strategy 120?

Strategy 120 is your AI-powered strategic planning command center. It provides specialized AI agents organized by strategic function, helping you plan, execute, and monitor strategic initiatives with intelligent assistance.

The "120" represents the comprehensive coverage across all strategic perspectives, from financial planning to learning and growth.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **AI Agent Categories** | 45+ specialized strategy agents organized by function |
| **Strategic Initiatives** | Track and manage strategic projects |
| **Decision Log** | Document and reference key strategic decisions |
| **Intelligence Briefs** | Gather and organize market intelligence |
| **Integrated Chat** | Direct conversation with any agent |

---

## Agent Categories

Strategy 120 organizes AI agents into functional categories:

| Category | Purpose | Example Agents |
|----------|---------|----------------|
| **Orchestration** | Coordinate strategic activities | Strategy Orchestrator |
| **Platform** | Technical and platform strategy | Platform Strategist |
| **Planning** | Strategic planning support | Strategic Planner |
| **Financial** | Financial perspective analysis | Financial Analyst |
| **Customer** | Customer-focused strategy | Customer Insights Agent |
| **Process** | Operational excellence | Process Optimizer |
| **Learning & Growth** | Capability development | Learning Strategist |
| **Investment** | Investment and portfolio | Investment Advisor |
| **Intelligence** | Market and competitive intel | Market Intelligence Scout |
| **Decision Support** | Decision frameworks | Decision Framer |
| **Governance** | Strategic governance | Governance Monitor |

---

## Using Strategy 120

### Navigating the Interface

1. **Left Panel**: Agent categories sidebar
   - Click a category to filter agents
   - "All Agents" shows the complete list
   - Badge numbers show agent count per category
   - **Department Filter**: Select a department from the dropdown to scope agents and portfolio data to a specific department

2. **Main Panel**: Five tabs for different functions
   - **Agents**: Browse and chat with AI agents
   - **Portfolio**: Align 120 integration, BSC performance, and initiative pipeline
   - **Initiatives**: Track strategic initiatives
   - **Decisions**: Log strategic decisions
   - **Intelligence**: Manage intelligence briefs

### Working with Agents

**Viewing Agent Details:**
1. Find the agent card in the grid
2. Click the **Details** button
3. Review agent description, model, and system prompt
4. Click **Start Chat** to begin a conversation

**Chatting with Agents:**
1. Click **Chat** on any agent card
2. The AgentDialogService opens a full-featured agent dialog with the agent's context pre-loaded
3. Type your question or request
4. The agent responds with strategic guidance via streaming
5. Continue the conversation with full chat history, markdown rendering, and copy support
6. Click X to close when finished

### Using the Portfolio Tab

The Portfolio tab provides a strategic overview that bridges Align 120 assessment insights with your Strategy 120 planning.

**Align 120 Integration:**
1. Click the **Import Insights** button at the top of the Portfolio tab
2. The Align 120 Import Modal opens, showing available completed sessions
3. Select a session to import its assessment outputs (values, maturity scores, brand voice, etc.)
4. Imported insights populate the Portfolio view and provide context to your strategic agents

**BSC Perspective Performance:**
- A scores grid displays Balanced Scorecard performance across four perspectives: Financial, Customer, Internal Process, and Learning & Growth
- Each perspective shows a performance score derived from linked OKRs and initiative progress
- Use these scores to identify strategic gaps and prioritize investments

**Portfolio Summary Cards:**
- **Active Initiatives**: Count of in-progress strategic initiatives
- **Decisions Logged**: Total decisions recorded in the decision log
- **Intel Briefs**: Number of intelligence briefs created
- **Linked OKRs**: Count of OKRs connected to strategic initiatives

**Initiative Pipeline:**
- A visual pipeline displays all initiatives with color-coded status bars
- Status colors indicate stage: planning (blue), in-progress (amber), completed (green), at-risk (red)
- Click any initiative bar to view details or navigate to the Initiatives tab

### Align 120 Import Modal

When you click **Import Insights** on the Portfolio tab:

1. The modal displays all completed Align 120 sessions for your organization
2. Each session card shows company name, completion date, and module summary
3. Select a session and click **Import** to pull in assessment data
4. Imported data includes: company profile, values, maturity score, brand voice, stakeholder map, and governance RACI
5. Insights are linked to the current Strategy 120 session for agent context enrichment

### Managing Initiatives

1. Switch to the **Initiatives** tab
2. View existing strategic initiatives
3. Click **New Initiative** to create one
4. Track status, owner, and progress

### Logging Decisions

1. Switch to the **Decisions** tab
2. Review the decision log
3. Click **Log Decision** to record a new decision
4. Document rationale, stakeholders, and outcomes

### Intelligence Briefs

1. Switch to the **Intelligence** tab
2. Browse existing intelligence briefs
3. Click **New Brief** to create one
4. Organize insights by topic or source

---

## Tips for Best Results

### Choosing the Right Agent

- **Financial questions** → Financial perspective agents
- **Customer insights** → Customer perspective agents
- **Process improvement** → Process perspective agents
- **Capability building** → Learning & Growth agents
- **Market analysis** → Intelligence agents
- **Complex decisions** → Decision Support agents

### Effective Agent Conversations

1. **Be specific**: Include relevant context
2. **Share data**: Provide numbers and metrics when available
3. **Ask follow-ups**: Agents can drill deeper on topics
4. **Request formats**: Ask for tables, lists, or frameworks

### Connecting to S2E

Strategy 120 agents work best when connected to your S2E foundation:
- Agents automatically receive context from active strategy
- OKRs and objectives inform agent responses
- Strategic themes guide recommendations

---

## Navigation

- **Help**: Open this guide (click the help button in the page header)

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [S2E Guide](./strategy-user-guide.md) | Strategy-to-Execution setup |
| [Align 120 Guide](./align120-user-guide.md) | Foundation assessment |
| [Parthenon Guide](./parthenon-user-guide.md) | OKRs and processes |
| [Agents Guide](./agents-user-guide.md) | General agent usage |

---

## Troubleshooting

**Agents not loading:**
- Check your internet connection
- Verify the server is running
- Refresh the page

**Chat not responding:**
- Ensure API keys are configured
- Check for error messages in the chat
- Try a different agent

**Category counts showing zero:**
- Agents may need to be seeded in the database
- Check Supabase connection status

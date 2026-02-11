# Parthenon User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Parthenon Is Important

Parthenon is the organizational backbone of Insight 360. It defines your company's structure and ensures AI understands:

- **Who does what**: Departments, teams, and roles
- **What you're achieving**: OKRs and objectives at every level
- **How work gets done**: Processes and workflows
- **Strategic alignment**: How OKRs connect to strategic objectives

Without this structure, AI operates in a vacuum. With Parthenon, AI understands your organizational context and can make relevant suggestions.

---

## What It Does

Parthenon manages four organizational components:

| Component | Description |
|-----------|-------------|
| **Departments** | Organizational units with custom icons and colors |
| **Roles** | Job functions with seniority levels and responsibilities |
| **OKRs** | Objectives and Key Results at company, department, team, and individual levels |
| **Processes** | Business workflows categorized by type (procedure, policy, standard, workflow, checklist) |

---

## Step by Step Use

### Navigating Parthenon

1. Click **Parthenon** in the sidebar
2. View the stats overview:
   - Total departments
   - Total roles
   - Active OKRs
   - Documented processes
3. Use the tabs to switch between components

### Managing Departments

**Viewing Departments:**
1. Click the **Departments** tab
2. See the department grid
3. Each department card shows:
   - Custom icon with color badge
   - Name and description
   - Number of roles
   - Delete button

**Creating a Department:**
1. Click **Add Department**
2. Fill in:
   - **Name**: Department name
   - **Description**: What this department does
   - **Parent**: Select parent department (optional for hierarchy)
   - **Icon**: Choose a Lucide icon (default: building-2)
   - **Color**: Pick a color for the icon badge
3. Click **Save**

**Editing a Department:**
1. Click a department card
2. Click the **Edit** button
3. Modify details
4. Save changes

**Seeding Default Departments:**
- Use the **Seed Defaults** option to populate sample departments
- Useful for initial setup and testing

**Note:** Department hierarchy is stored (parent/child relationships) but displayed as a flat grid in the current UI.

### Managing Roles

**Viewing Roles:**
1. Click the **Roles** tab
2. Browse all defined roles
3. Each role card shows:
   - Title (clickable for details)
   - Department badge
   - Level badge (color-coded by seniority)
   - Delete button

**Understanding Role Levels:**
Each role has a seniority level that appears as a colored badge:
- **Executive**: C-suite and senior leadership
- **Director**: Department and team leadership
- **Manager**: Team leads and supervisors
- **Individual**: Individual contributors

**Creating a Role:**
1. Click **Add Role**
2. Fill in:
   - **Title**: Role name
   - **Department**: Where this role belongs
   - **Level**: Executive, Director, Manager, or Individual
   - **Description**: Role overview
   - **Responsibilities**: Key duties (list)
   - **Required Skills**: Competencies needed
   - **Reports To**: Manager role
   - **Authority**: Decision-making scope (optional)
3. Click **Save**

**Linking Roles to Departments:**
1. Select the appropriate department when creating
2. Roles automatically appear under their department
3. Update department to move a role

### Managing OKRs

**Viewing OKRs:**
1. Click the **OKRs** tab
2. See all objectives organized by scope:
   - Company-level
   - Department-level
   - Team-level
   - Individual-level
3. Each OKR shows:
   - Title and scope badge (color-coded)
   - Period
   - Progress bar
   - Strategy alignment badge (if linked)

**OKR Status:**
- **Draft**: In development, not yet active
- **Active**: Currently tracked and reported

**Creating an Objective:**
1. Click **Add OKR**
2. Fill in:
   - **Title**: What you want to achieve
   - **Description**: Context and details
   - **Scope**: Company, Department, Team, or Individual
   - **Department**: Link to a department (for department/team scope)
   - **Period**: Time frame (e.g., "2026 Q1")
   - **Start/End Date**: Duration of the OKR
   - **Parent OKR**: Nest under a higher-level OKR (optional)
   - **Status**: Draft or Active
3. Add Key Results (measurable outcomes)
4. Click **Save**

**Adding Key Results:**
1. Open an objective
2. Click **Add Key Result**
3. Define:
   - **Description**: What to measure
   - **Target**: Numeric goal
   - **Current**: Starting/current value
   - **Unit**: Measurement type (%, $, #)
4. Save the key result

**Tracking Progress:**
1. Open a Key Result
2. Update the current value
3. Progress automatically calculates as: (completed key results / total key results) x 100%
4. View trends over time

**Linking OKRs to Strategy:**
OKRs can be connected to Strategic Objectives in the Strategy-to-Execution (S2E) system:
1. Open an OKR
2. In the "Strategy Links" section, click **Add Link**
3. Select a Strategic Objective
4. Specify the link type (Supports, Drives, Enables, Measures)
5. Mark as Primary if this is the main strategic connection
6. View alignment scores and contribution descriptions

### Managing Processes

**Viewing Processes:**
1. Click the **Processes** tab
2. Browse documented workflows
3. Each process card shows:
   - Name with icon
   - Description
   - Type badge
   - Step count
   - Delete button

**Process Types:**
When creating a process, select from five types:
- **Procedure**: Step-by-step process documentation
- **Policy**: Governing rules and standards
- **Standard**: Best practice procedures
- **Workflow**: Multi-step execution sequences
- **Checklist**: Task completion checklists

**Process Status:**
- **Draft**: Being developed
- **Active**: Currently in use
- **Archived**: Historical reference only

**Creating a Process:**
1. Click **Add Process**
2. Fill in:
   - **Name**: Process title
   - **Description**: What this process accomplishes
   - **Type**: Select from the five types above
   - **Department**: Assign to a department
   - **Owner Role**: Process owner (select a role)
   - **Status**: Draft, Active, or Archived
   - **Tags**: Keywords for discovery
3. Add steps in sequence
4. Click **Save**

**Defining Process Steps:**
1. Click **Add Step**
2. For each step, define:
   - **Name**: Step title
   - **Description**: What happens
   - **Role**: Who performs it
   - **Duration**: Expected time
   - **Inputs**: What's needed
   - **Outputs**: What's produced
3. Steps are ordered sequentially

**Importing Processes:**
Quickly import processes from structured text:
1. Click **Import Process**
2. Paste process data in one of these formats:
   - Numbered list (1. Step, 2. Step, ...)
   - Bullet list (- Step, - Step, ...)
   - JSON array
3. Preview the parsed steps
4. Confirm to import

---

## Understanding the Structure

### Organizational Hierarchy

```
Company
├── Department A
│   ├── Role 1 (Executive)
│   ├── Role 2 (Manager)
│   └── Sub-Department A1
│       └── Role 3 (Individual)
├── Department B
│   ├── Role 4 (Director)
│   └── Role 5 (Individual)
└── Department C
    └── Role 6 (Manager)
```

### OKR Hierarchy

```
Company Objective
├── Key Result 1
├── Key Result 2
└── Department Objective (child OKR)
    ├── Key Result 3
    └── Team Objective (child OKR)
        ├── Key Result 4
        └── Individual Objective (child OKR)
            └── Key Result 5
```

### How AI Uses Parthenon

When you interact with agents or chat:
- AI knows your department structure
- AI understands role responsibilities and seniority levels
- AI references relevant OKRs and their strategic alignment
- AI follows documented processes

---

## Tips for Best Results

### Departments
- Start with high-level structure
- Add detail progressively
- Keep hierarchies shallow (3 levels max)
- Customize icons and colors for quick visual identification
- Update as organization evolves

### Roles
- Always assign a seniority level (Executive, Director, Manager, Individual)
- Be specific about responsibilities
- Link skills to actual needs
- Define clear reporting lines
- Avoid overlapping duties

### OKRs
- Make objectives inspirational
- Make key results measurable
- Limit to 3-5 key results per objective
- Use parent OKR nesting to show how goals cascade
- Link OKRs to strategic objectives for alignment tracking
- Update progress regularly

### Processes
- Document critical workflows first
- Choose the correct type (procedure, policy, standard, workflow, checklist)
- Specify handoffs clearly
- Use tags for discoverability
- Review and update quarterly

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Strategy Guide | S2E planning system | [strategy-user-guide.md](./strategy-user-guide.md) |
| Governance Guide | Monitoring alignment | [governance-user-guide.md](./governance-user-guide.md) |
| Actions Guide | Executable actions | [actions-user-guide.md](./actions-user-guide.md) |
| Company Dashboard | Organizational health overview | [company-user-guide.md](./company-user-guide.md) |

---

## Troubleshooting

**Department hierarchy not displaying:**
- Verify parent relationships are set correctly
- Refresh the page
- Note: Hierarchy is stored but displayed as a flat grid

**OKR progress not calculating:**
- Ensure key results have targets set
- Verify current values are entered
- Check that units match
- Confirm OKR status is Active

**Process steps out of order:**
- Steps are displayed in the order they were added
- Re-create steps in the correct order if needed
- Save after making changes

**Can't delete a department:**
- Move or delete child departments first
- Reassign roles to other departments
- Remove department from OKRs

**Can't delete a role or process:**
- Items are soft-deleted by default (archived)
- Use `?hard=true` parameter for permanent deletion (admin only)

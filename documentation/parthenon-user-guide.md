# Parthenon User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

---

## Why Parthenon Is Important

Parthenon is the organizational backbone of Insight 360. It defines your company's structure and ensures AI understands:

- **Who does what**: Departments, teams, and roles
- **What you're achieving**: OKRs and objectives
- **How work gets done**: Processes and workflows

Without this structure, AI operates in a vacuum. With Parthenon, AI understands your organizational context and can make relevant suggestions.

---

## What It Does

Parthenon manages four organizational components:

| Component | Description |
|-----------|-------------|
| **Departments** | Organizational units and hierarchy |
| **Roles** | Job functions and responsibilities |
| **OKRs** | Objectives and Key Results tracking |
| **Processes** | Business workflows and procedures |

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
2. See the department hierarchy
3. Each department shows:
   - Name and description
   - Parent department (if nested)
   - Number of roles
   - Status

**Creating a Department:**
1. Click **Add Department**
2. Fill in:
   - **Name**: Department name
   - **Description**: What this department does
   - **Parent**: Select parent department (optional)
   - **Head**: Department leader
3. Click **Save**

**Editing a Department:**
1. Click a department to expand
2. Click the **Edit** button
3. Modify details
4. Save changes

**Creating Department Hierarchy:**
1. Create top-level departments first
2. When creating sub-departments, select a Parent
3. The hierarchy displays visually

### Managing Roles

**Viewing Roles:**
1. Click the **Roles** tab
2. Browse all defined roles
3. Each role shows:
   - Title
   - Department
   - Key responsibilities
   - Required skills

**Creating a Role:**
1. Click **Add Role**
2. Fill in:
   - **Title**: Role name
   - **Department**: Where this role belongs
   - **Description**: Role overview
   - **Responsibilities**: Key duties (list)
   - **Skills**: Required competencies
   - **Reports To**: Manager role
3. Click **Save**

**Linking Roles to Departments:**
1. Select the appropriate department when creating
2. Roles automatically appear under their department
3. Update department to move a role

### Managing OKRs

**Viewing OKRs:**
1. Click the **OKRs** tab
2. See all objectives organized by:
   - Company-level
   - Department-level
   - Team-level
3. Each OKR shows progress percentage

**Creating an Objective:**
1. Click **Add OKR**
2. Fill in:
   - **Objective**: What you want to achieve
   - **Level**: Company, Department, or Team
   - **Owner**: Responsible party
   - **Time Period**: Quarter or year
3. Add Key Results (measurable outcomes)
4. Click **Save**

**Adding Key Results:**
1. Open an objective
2. Click **Add Key Result**
3. Define:
   - **Description**: What to measure
   - **Target**: Numeric goal
   - **Current**: Starting value
   - **Unit**: Measurement type (%, $, #)
4. Save the key result

**Tracking Progress:**
1. Open a Key Result
2. Update the current value
3. Progress automatically calculates
4. View trends over time

### Managing Processes

**Viewing Processes:**
1. Click the **Processes** tab
2. Browse documented workflows
3. Each process shows:
   - Name
   - Category
   - Step count
   - Owner

**Creating a Process:**
1. Click **Add Process**
2. Fill in:
   - **Name**: Process title
   - **Description**: What this process accomplishes
   - **Category**: Type of process
   - **Owner**: Process owner
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
3. Reorder steps by dragging
4. Add decision points for branches

---

## Understanding the Structure

### Organizational Hierarchy

```
Company
├── Department A
│   ├── Role 1
│   ├── Role 2
│   └── Sub-Department A1
│       └── Role 3
├── Department B
│   ├── Role 4
│   └── Role 5
└── Department C
    └── Role 6
```

### OKR Hierarchy

```
Company Objective
├── Key Result 1
├── Key Result 2
└── Department Objective
    ├── Key Result 3
    └── Team Objective
        └── Key Result 4
```

### How AI Uses Parthenon

When you interact with agents or chat:
- AI knows your department structure
- AI understands role responsibilities
- AI references relevant OKRs
- AI follows documented processes

---

## Tips for Best Results

### Departments
- Start with high-level structure
- Add detail progressively
- Keep hierarchies shallow (3 levels max)
- Update as organization evolves

### Roles
- Be specific about responsibilities
- Link skills to actual needs
- Define clear reporting lines
- Avoid overlapping duties

### OKRs
- Make objectives inspirational
- Make key results measurable
- Limit to 3-5 key results per objective
- Update progress regularly

### Processes
- Document critical workflows first
- Include decision points
- Specify handoffs clearly
- Review and update quarterly

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Strategy Guide | S2E planning system | [strategy-user-guide.md](./strategy-user-guide.md) |
| Governance Guide | Monitoring alignment | [governance-user-guide.md](./governance-user-guide.md) |
| Actions Guide | Executable actions | [actions-user-guide.md](./actions-user-guide.md) |

---

## Troubleshooting

**Department hierarchy not displaying:**
- Verify parent relationships are set
- Refresh the page
- Check for circular references

**OKR progress not calculating:**
- Ensure key results have targets
- Verify current values are entered
- Check that units match

**Process steps out of order:**
- Use drag-and-drop to reorder
- Save after making changes
- Refresh if order doesn't update

**Can't delete a department:**
- Move or delete child departments first
- Reassign roles to other departments
- Remove department from OKRs

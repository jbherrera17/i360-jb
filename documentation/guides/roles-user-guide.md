# Title Management User Guide

**For:** Insight 360 Users
**Last Updated:** Wednesday, February 12, 2026

---

## What Are Titles?

Titles define job functions within your organization. Each title belongs to a department and has a level (like Individual Contributor or Manager). Titles determine what AI agents and workflows you can access.

**Key Concept:** You don't directly choose your AI tools - your title's tags automatically match you with relevant content.

---

## Title Components

### Department
The organizational unit the title belongs to:
- Marketing, Sales, Finance
- HR, Operations, Executive
- Engineering (if configured)

### Level
Career level of the title:

| Level | Code | Typical Positions |
|-------|------|-------------------|
| Individual Contributor | IC | Analyst, Specialist, Coordinator |
| Manager | MGR | Team Lead, Manager |
| Director | DIR | Director, Senior Director |
| Vice President | VP | VP, SVP |
| C-Level | C | CEO, CFO, CMO, etc. |

### Responsibilities
Specific duties and responsibilities associated with the title. Responsibilities help define what the title involves.

### Tags
Skills, domains, and functions associated with the title. Tags determine content matching.

---

## System Titles

Each department has a special "All [Department]" title (e.g., "All Marketing", "All Sales") that provides access to all agents and workflows tagged for that department.

**When is this used?**
- When a user doesn't specify a specific title during onboarding
- When a user's job doesn't match any predefined title
- For users who need broad departmental access

System titles are automatically tagged with all domain-related tags for their department.

---

## Accessing Title Management

1. Log into Insight 360
2. Navigate to the **Administrator** hub page
3. Click **Title Management** (or go directly to `/roles.html`)

---

## Understanding the Interface

### Overview Cards

Summary statistics at the top:
- **Total Titles**: All titles in the system
- **Responsibilities**: Number of responsibilities defined
- **Templates**: Pre-built role templates available
- **Users Assigned**: Users currently assigned to titles

### Tabs

- **Department Titles**: View and manage titles by department
- **Responsibilities**: Manage responsibilities that can be assigned to titles

### Department Filter

Filter titles by department:
- Click a department name
- Or select "All Departments"

### Search

Type to filter titles by name.

---

## Viewing Titles

### Title Cards

Each title card shows:
- **Department badge** (colored)
- **Title name**
- **Level badge** (IC, Manager, etc.)
- **Description**
- **Tag count**
- **System Title badge** (if applicable)

### Title Details

Click a title to see:
- Full description
- All assigned tags (by category)
- Associated responsibilities
- Users with this title

---

## Understanding Your Title

### Finding Your Title

1. Go to your **Profile** page
2. See **My Titles** section
3. Your primary title is highlighted

### What Your Title Determines

| Aspect | How It's Affected |
|--------|-------------------|
| **Agents** | See agents matching your tags and role level |
| **Workflows** | See workflows matching your tags and role level |
| **OKRs** | See department/level appropriate goals |
| **Content** | Personalized to your domain |
| **Execute 120** | Auto-selects department, shows role-appropriate cards |
| **Daily Briefing** | Department-specific intelligence |
| **Strategy Overview** | Visible only to executives/directors |

### Multiple Titles

You can have multiple titles:
- One **primary title** (main job function)
- Additional titles (cross-functional work)
- Tags from all titles are combined

---

## For Administrators

### Using Templates

The page header includes a **Templates** button that opens a modal with pre-built role templates.

1. Click the **Templates** button in the header
2. Browse available role templates by department
3. Select a template to pre-fill a new title with recommended settings (level, tags, responsibilities)
4. Customize the pre-filled values as needed
5. Save the new title

This is the fastest way to set up standard positions across departments.

### Creating a Title

1. Click **New Title** button
2. The 3-column Edit modal opens:

   **Column 1 - Basic Information:**
   - **Department**: Select from list
   - **Level**: IC, Manager, Director, VP, or C-Level
   - **Title Name**: The job title
   - **Description**: What this title does

   **Column 2 - Responsibilities:**
   - Check responsibilities that apply
   - Use inline "Add" to create new responsibilities

   **Column 3 - Associated Tags:**
   - Select tags from each category
   - Skills (what they do)
   - Domains (what area)
   - Functions (what activities)

3. Click **Save Title**

**Tip:** Assign 3-8 tags per title for best matching.

### Managing Responsibilities

Responsibilities are reusable descriptions of duties that can be assigned to multiple titles.

**Creating a Responsibility:**
1. Go to the **Responsibilities** tab
2. Click **Add Responsibility**
3. Enter name and description
4. Click **Save**

**Editing a Responsibility:**
1. Find the responsibility in the list
2. Click the pencil icon
3. Update fields
4. Click **Save**

**Deleting a Responsibility:**
1. Click the trash icon
2. Confirm deletion
3. Note: Cannot delete if assigned to titles

**Inline Creation:**
- While editing a title, type a new responsibility name
- Click the "+" button to create it immediately
- It's automatically assigned to the current title

### Editing a Title

1. Find the title card
2. Click the edit icon (pencil)
3. Update fields in the 3-column modal
4. Click **Save Title**

### Deactivating a Title

1. Edit the title
2. Toggle "Active" to off
3. Save

**Warning:** Deactivated titles:
- No longer appear in assignment lists
- Users keep title until reassigned
- Can be reactivated later

---

## Title Templates

System templates are pre-defined titles for common positions:

### Marketing Department
- All Marketing (System Title)
- Content Strategist (IC)
- Content Creator (IC)
- Marketing Analyst (IC)
- Campaign Manager (Manager)
- Marketing Director (Director)
- VP of Marketing (VP)
- CMO (C-Level)

### Sales Department
- All Sales (System Title)
- Sales Development Rep (IC)
- Account Executive (IC)
- Sales Manager (Manager)
- Sales Director (Director)
- VP of Sales (VP)
- CRO (C-Level)

### Finance Department
- All Finance (System Title)
- Financial Analyst (IC)
- Accountant (IC)
- Finance Manager (Manager)
- Finance Director (Director)
- VP of Finance (VP)
- CFO (C-Level)

Templates can be customized or used as-is.

---

## Best Practices

### For Administrators

**Title Design:**
- Match titles to actual job functions
- Use clear, recognizable names
- Write descriptions that explain responsibilities
- Assign appropriate level
- Add relevant responsibilities

**Tag Assignment:**
- Be specific but not excessive
- Include domain + skills + functions
- Review assignments when titles change
- Audit quarterly

**Responsibility Management:**
- Create reusable responsibilities
- Keep descriptions concise but clear
- Group related responsibilities logically

### For Users

**Understanding Your Access:**
- Your tags determine your content
- Request title updates through HR/Admin
- Multiple titles = more tag coverage
- Primary title affects dashboard defaults

**During Onboarding:**
- Enter your job title when prompted
- This helps personalize your experience
- Leave blank to get broad department access

---

## Troubleshooting

**Can't see an agent I need**
- Check if agent has matching tags
- Verify your title has necessary tags
- Contact admin about tag assignments

**Wrong content appearing**
- Check your title assignments
- Verify tags on your titles
- Clear browser cache and refresh

**Title not in the list**
- May need admin to create it
- Check department filter
- Search by partial name

**Can't edit titles**
- Verify you have admin permissions
- System titles have some restrictions
- Contact super admin

---

## Permissions

| Action | User | Dept Admin | System Admin | Super Admin |
|--------|------|------------|--------------|-------------|
| View all titles | ✓ | ✓ | ✓ | ✓ |
| View title details | ✓ | ✓ | ✓ | ✓ |
| Create titles | - | Dept only | ✓ | ✓ |
| Edit titles | - | Dept only | ✓ | ✓ |
| Delete titles | - | - | - | ✓ |
| Assign tags | - | Dept only | ✓ | ✓ |
| Assign users | - | Dept only | ✓ | ✓ |
| Manage responsibilities | - | ✓ | ✓ | ✓ |

---

## Related Guides

| Guide | Topic |
|-------|-------|
| [Tag Management Guide](./tags-user-guide.md) | Understanding and managing tags |
| [SynergiNexus Guide](./synerginexus-user-guide.md) | AI governance system |
| [Platform Administration Guide](./admin-platform-user-guide.md) | Managing users and permissions |
| [Execute 120 Guide](./execute120-user-guide.md) | Personalized execution hub |

---

## Glossary

| Term | Definition |
|------|------------|
| **Title** | Job function with department, level, responsibilities, and tags |
| **Level** | Career tier (IC, Manager, Director, VP, C-Level) |
| **Primary Title** | Main title for a user (affects defaults) |
| **System Title** | Auto-generated "All [Department]" title for broad access |
| **Responsibility** | Specific duty that can be assigned to titles |
| **Template** | Pre-defined title that can be customized |
| **Tag Inheritance** | Users get tags from all their titles |
| **Content Matching** | System connecting users to relevant agents/workflows |

# Role Management User Guide

**For:** Insight 360 Users
**Last Updated:** January 9, 2026

---

## What Are Roles?

Roles define job functions within your organization. Each role belongs to a department and has a level (like Individual Contributor or Manager). Roles determine what AI agents and workflows you can access.

**Key Concept:** You don't directly choose your AI tools - your role's tags automatically match you with relevant content.

---

## Role Components

### Department
The organizational unit the role belongs to:
- Marketing, Sales, Finance
- HR, Operations, Executive
- Engineering (if configured)

### Level
Career level of the role:

| Level | Code | Typical Positions |
|-------|------|-------------------|
| Individual Contributor | IC | Analyst, Specialist, Coordinator |
| Manager | MGR | Team Lead, Manager |
| Director | DIR | Director, Senior Director |
| Vice President | VP | VP, SVP |
| C-Level | C | CEO, CFO, CMO, etc. |

### Tags
Skills, domains, and functions associated with the role. Tags determine content matching.

---

## Accessing Role Management

1. Log into Insight 360
2. In the sidebar, find **SynergiNexus** section
3. Click **Role Management**

---

## Understanding the Interface

### Overview Cards

Summary statistics at the top:
- **Total Roles**: All roles in the system
- **Departments**: Number of departments covered
- **Levels**: Role levels in use
- **With Tags**: Roles that have tags assigned

### Department Filter

Filter roles by department:
- Click a department name
- Or select "All Departments"

### Search

Type to filter roles by name.

---

## Viewing Roles

### Role Cards

Each role card shows:
- **Department badge** (colored)
- **Role name**
- **Level badge** (IC, Manager, etc.)
- **Description**
- **Tag count**

### Role Details

Click a role to see:
- Full description
- All assigned tags (by category)
- Associated responsibilities
- Users in this role

---

## Understanding Your Role

### Finding Your Roles

1. Go to your **Profile** page
2. See **My Roles** section
3. Your primary role is highlighted

### What Your Role Determines

| Aspect | How It's Affected |
|--------|-------------------|
| **Agents** | See agents matching your tags |
| **Workflows** | See workflows matching your tags |
| **OKRs** | See department/level appropriate goals |
| **Content** | Personalized to your domain |

### Multiple Roles

You can have multiple roles:
- One **primary role** (main job function)
- Additional roles (cross-functional work)
- Tags from all roles are combined

---

## For Administrators

### Creating a Role

1. Click **Add Role** button
2. Fill in the form:
   - **Department**: Select from list
   - **Name**: Role title
   - **Description**: What this role does
   - **Level**: IC, Manager, Director, VP, or C-Level
3. Click **Create**
4. Assign tags (next step)

### Assigning Tags to a Role

1. Find the role card
2. Click the tag icon or **Manage Tags**
3. Select tags from each category:
   - Skills (what they do)
   - Domains (what area)
   - Functions (what activities)
4. Click **Save**

**Tip:** Assign 3-8 tags per role for best matching.

### Editing a Role

1. Find the role card
2. Click the edit icon (pencil)
3. Update fields
4. Click **Save**

### Deactivating a Role

1. Edit the role
2. Toggle "Active" to off
3. Save

**Warning:** Deactivated roles:
- No longer appear in assignment lists
- Users keep role until reassigned
- Can be reactivated later

---

## Role Templates

System templates are pre-defined roles for common positions:

### Marketing Department
- Content Strategist (IC)
- Content Creator (IC)
- Marketing Analyst (IC)
- Campaign Manager (Manager)
- Marketing Director (Director)
- VP of Marketing (VP)
- CMO (C-Level)

### Sales Department
- Sales Development Rep (IC)
- Account Executive (IC)
- Sales Manager (Manager)
- Sales Director (Director)
- VP of Sales (VP)
- CRO (C-Level)

### Finance Department
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

**Role Design:**
- Match roles to actual job functions
- Use clear, recognizable names
- Write descriptions that explain responsibilities
- Assign appropriate level

**Tag Assignment:**
- Be specific but not excessive
- Include domain + skills + functions
- Review assignments when roles change
- Audit quarterly

### For Users

**Understanding Your Access:**
- Your tags determine your content
- Request role updates through HR/Admin
- Multiple roles = more tag coverage
- Primary role affects dashboard defaults

---

## Troubleshooting

**Can't see an agent I need**
- Check if agent has matching tags
- Verify your role has necessary tags
- Contact admin about tag assignments

**Wrong content appearing**
- Check your role assignments
- Verify tags on your roles
- Clear browser cache and refresh

**Role not in the list**
- May need admin to create it
- Check department filter
- Search by partial name

**Can't edit roles**
- Verify you have admin permissions
- System templates may have restrictions
- Contact super admin

---

## Permissions

| Action | User | Dept Admin | System Admin | Super Admin |
|--------|------|------------|--------------|-------------|
| View all roles | ✓ | ✓ | ✓ | ✓ |
| View role details | ✓ | ✓ | ✓ | ✓ |
| Create roles | - | Dept only | ✓ | ✓ |
| Edit roles | - | Dept only | ✓ | ✓ |
| Delete roles | - | - | - | ✓ |
| Assign tags | - | Dept only | ✓ | ✓ |
| Assign users | - | Dept only | ✓ | ✓ |

---

## Related Guides

| Guide | Topic |
|-------|-------|
| [Tag Management Guide](./tags-user-guide.md) | Understanding and managing tags |
| [SynergiNexus Guide](./synerginexus-user-guide.md) | AI governance system |
| [User Administration Guide](./admin-user-guide.md) | Managing users and permissions |
| [Execute 120 Guide](./execute120-user-guide.md) | Personalized execution hub |

---

## Glossary

| Term | Definition |
|------|------------|
| **Role** | Job function with department, level, and tags |
| **Level** | Career tier (IC, Manager, Director, VP, C-Level) |
| **Primary Role** | Main role for a user (affects defaults) |
| **Template** | Pre-defined role that can be customized |
| **Tag Inheritance** | Users get tags from all their roles |
| **Content Matching** | System connecting users to relevant agents/workflows |

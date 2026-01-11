# Tag Management User Guide

**For:** Insight 360 Users
**Last Updated:** January 11, 2026

---

## What Are Tags?

Tags are labels that categorize skills, expertise areas, and work functions. They connect people to the right AI agents and workflows.

**How It Works:**
1. Tags are assigned to titles
2. Users are assigned to titles
3. Users automatically see agents/workflows matching their tags

---

## Tag Categories

### Skill Tags
Technical and soft skills people possess.

**Examples:**
- Analytics, Writing, Leadership
- Data Interpretation, Copywriting, Coaching
- Presentation, Strategic Planning

### Domain Tags
Business areas and expertise domains.

**Examples:**
- Marketing, Sales, Finance, HR
- Content Marketing, Account Management
- Talent Acquisition, Financial Planning

### Function Tags
Work activities and responsibilities.

**Examples:**
- Content Creation, Data Reporting
- Customer Support, Project Management
- Planning, Research, Review

---

## Accessing Tag Management

1. Log into Insight 360
2. In the sidebar, find **SynergiNexus** section
3. Click **Tag Management**

---

## Understanding the Interface

### Overview Cards

The top shows summary statistics:
- **Total Tags**: All tags in the system
- **Skills**: Skill category count
- **Domains**: Domain category count
- **Functions**: Function category count

### Filter Options

Filter tags by category:
- **All**: Show all tags
- **Skills**: Technical/soft skills only
- **Domains**: Business areas only
- **Functions**: Work activities only

### View Modes

- **Grid View**: Cards showing tag details
- **List View**: Compact table format

---

## Working with Tags

### Viewing Tags

1. Select a category filter (or "All")
2. Browse the tag grid/list
3. Click a tag to see details

**Tag Card Shows:**
- Tag name
- Category (skill, domain, function)
- Parent tag (if hierarchical)
- Description
- Usage count (how many titles use it)

### Understanding Tag Hierarchy

Tags can be organized hierarchically:

```
marketing (domain)
├── content-marketing
├── digital-marketing
├── brand
└── product-marketing
```

**Benefits:**
- More granular categorization
- Inherit parent tag properties
- Better filtering and matching

### Searching Tags

1. Use the search box
2. Type part of a tag name
3. Results filter in real-time

---

## Creating Tags (Admin Only)

### Add a New Tag

1. Click **Add Tag** button
2. Fill in the form:
   - **Name**: Short, lowercase, hyphenated (e.g., "data-analysis")
   - **Category**: skill, domain, or function
   - **Parent**: Optional, select parent tag for hierarchy
   - **Description**: Brief explanation of the tag
3. Click **Create**

### Naming Guidelines

| Do | Don't |
|----|-------|
| Use lowercase | Use Mixed Case |
| Separate with hyphens | Use spaces or underscores |
| Be specific | Be too generic |
| Keep short (2-3 words) | Make overly long |

**Good Examples:**
- `data-visualization`
- `content-strategy`
- `budget-management`

**Avoid:**
- `Data Visualization`
- `data_visualization`
- `misc` or `other`

---

## Editing Tags (Admin Only)

### Modify a Tag

1. Find the tag in the grid
2. Click the edit icon (pencil)
3. Update fields as needed
4. Click **Save**

**What You Can Change:**
- Name
- Description
- Parent tag
- Active status

**What You Cannot Change:**
- Category (create new tag instead)

### Deactivating Tags

1. Edit the tag
2. Toggle "Active" to off
3. Save changes

**Note:** Inactive tags:
- Still exist in the system
- Don't appear in selection lists
- Existing assignments remain

---

## Tag Assignment

Tags are assigned to titles, not directly to users. See [Title Management Guide](./roles-user-guide.md) for details.

### How Assignment Works

1. Admin creates a title (e.g., "Marketing Manager")
2. Admin assigns tags to title (e.g., `marketing`, `leadership`, `analytics`)
3. Users assigned to that title inherit those tags
4. System matches users to agents/workflows by tag overlap

### Checking Your Tags

1. Go to your **Profile** page
2. View **My Titles** section
3. See inherited tags from all your titles

---

## Best Practices

### For Administrators

**When Creating Tags:**
- Start with broad categories, add specific ones as needed
- Use consistent naming conventions
- Write clear descriptions
- Review existing tags before creating new ones

**When Assigning Tags:**
- Assign minimum necessary tags
- Review tag assignments quarterly
- Remove unused tags

### For Users

**Understanding Your Tags:**
- Tags determine what you see in Execute 120
- More relevant tags = more relevant content
- Request tag changes through your manager

---

## Troubleshooting

**Can't see the tag I need**
- Check the category filter
- Search by name
- Tag may be inactive
- Contact admin to create new tag

**Tag not showing correct content**
- Tags are assigned to titles, not users
- Check which titles you have
- Contact admin about title-tag assignments

**Created tag not appearing**
- Refresh the page
- Check if tag was saved successfully
- Verify you have create permissions

---

## Permissions

| Title | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| User | ✓ | - | - | - |
| Dept Admin | ✓ | - | - | - |
| System Admin | ✓ | ✓ | ✓ | - |
| Super Admin | ✓ | ✓ | ✓ | ✓ |

---

## Related Guides

| Guide | Topic |
|-------|-------|
| [Title Management Guide](./roles-user-guide.md) | Managing department titles |
| [SynergiNexus Guide](./synerginexus-user-guide.md) | AI governance |
| [Execute 120 Guide](./execute120-user-guide.md) | Personalized execution hub |

---

## Glossary

| Term | Definition |
|------|------------|
| **Tag** | Label for categorizing skills, domains, or functions |
| **Category** | Type of tag (skill, domain, function) |
| **Hierarchy** | Parent-child relationship between tags |
| **Tag Matching** | System that connects users to content via shared tags |
| **Effective Tags** | All tags a user has through their titles |

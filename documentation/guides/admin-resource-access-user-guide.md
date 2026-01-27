# Resource Access Management User Guide

**For:** Organization Administrators
**Last Updated:** January 2026

---

## Why Resource Access Management Is Important

Resource Access Management allows you to control who can see and use your organization's agents, skills, context assets, and workflows. Proper access controls ensure:

- **Privacy**: Sensitive resources stay private to their owners
- **Collaboration**: Team resources are shared within departments
- **Organization-wide Access**: Standard resources are available to all members
- **Public Sharing**: Selected resources can be shared externally

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Visibility Control** | Set who can access each resource (Private, Team, Organization, Public) |
| **Bulk Updates** | Update visibility for multiple resources at once |
| **Department Assignment** | Assign resources to specific departments |
| **Role Requirements** | Set minimum business role required to access sensitive resources |
| **Onboarding Templates** | Apply pre-configured visibility settings for new organizations |
| **Summary Dashboard** | View visibility distribution across all resource types |

---

## Visibility Levels

| Level | Who Can Access | Use Case |
|-------|----------------|----------|
| **Private** | Only the resource owner | Personal work, drafts, sensitive data |
| **Team** | Owner + department members | Department-specific tools and assets |
| **Organization** | All organization members | Company-wide resources |
| **Public** | Everyone (including external users) | Shared templates, public documentation |

---

## Step by Step Use

### Viewing Resource Summary

1. Navigate to **Administration > Resource Access**
2. The top section shows visibility distribution for each resource type:
   - Agents
   - Skills
   - Context Assets
   - Workflows
3. Use this to understand your organization's current access configuration

### Filtering Resources

1. Use the **Resource Type Tabs** to filter by:
   - All Resources
   - Agents only
   - Skills only
   - Context Assets only
   - Workflows only

2. Use the **Filter Dropdowns** to narrow results:
   - Visibility level (Private, Team, Organization, Public)
   - Department assignment
   - Search by name

### Changing Visibility for a Single Resource

1. Find the resource in the table
2. Click the **Edit** button (pencil icon) in the Actions column
3. In the modal:
   - Select the new visibility level
   - Optionally assign to a department
   - Optionally set a minimum business role
4. Click **Update Visibility**

### Bulk Visibility Updates

1. Check the boxes next to resources you want to update
2. Use the **Select All** checkbox to select all visible resources
3. Choose the desired visibility from the **Set Visibility** dropdown
4. Click **Apply to Selected**
5. Confirm the bulk update

### Setting Role Requirements

For sensitive resources, you can require a minimum business role:

1. Edit the resource (click the pencil icon)
2. Under **Minimum Role Required**, select:
   - Individual Contributor (IC)
   - Supervisor
   - Manager
   - Director
   - Executive
3. Users below this role level will not see the resource, even if visibility would normally allow access

### Using Onboarding Templates

Templates quickly configure visibility for system resources:

| Template | Best For | What It Does |
|----------|----------|--------------|
| **Starter Pack** | New organizations | Basic agents with org visibility |
| **Business Pack** | Growing teams | Adds strategy and research agents |
| **Enterprise Pack** | Large organizations | All system agents with role-based access |

To apply a template:
1. Scroll to the **Onboarding Templates** section
2. Click on the template card
3. Confirm the action
4. System resources will be updated with the template's visibility settings

### Viewing Tier Settings

1. Click **Tier Settings** in the header
2. View your organization's:
   - Current subscription tier
   - Default visibility for new resources
   - Whether public resources are allowed

---

## System vs User Resources

| Type | Description | Module Gating |
|------|-------------|---------------|
| **System Resources** | Built-in agents and skills | Require module access |
| **User Resources** | Custom-created resources | No module gating |

System resources (marked with a "System" badge) are automatically gated by module access. Users must have access to the corresponding module to see these resources, regardless of visibility settings.

---

## Tips & Best Practices

- **Start Private**: Create resources as Private, then expand access as needed
- **Use Departments**: Assign resources to departments for better organization
- **Role Requirements**: Use sparingly for truly sensitive resources
- **Regular Audits**: Review visibility settings periodically
- **Templates**: Use onboarding templates to quickly set up new organizations
- **Bulk Updates**: Save time by updating multiple resources at once

---

## Visibility Quick Reference

| Visibility | Owner | Same Dept | Same Org | Everyone |
|------------|-------|-----------|----------|----------|
| Private | Yes | No | No | No |
| Team | Yes | Yes | No | No |
| Organization | Yes | Yes | Yes | No |
| Public | Yes | Yes | Yes | Yes |

**Note:** Role requirements can further restrict access regardless of visibility level.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't see expected resources | Check visibility filter and department filter settings |
| Can't set Public visibility | Your tier may not allow public resources |
| Users can't access shared resource | Check if role requirement is blocking access |
| Bulk update not working | Ensure resources are selected (checkboxes checked) |
| Templates not applying | Verify you have admin permissions |

---

## Related Pages

- **Administrator** - Overall system administration
- **Tier Setup** - Configure subscription tier settings
- **Organization Settings** - Manage organization configuration

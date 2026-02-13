# Agent Categories User Guide

**For:** Insight 360 Administrators
**Last Updated:** 2026-02-12

---

## Why Agent Categories Matter

Agent categories organize your AI agents by function, making it easier for users to find the right agent for their task. Categories appear in agent dropdowns, filters, and the Agent Library.

---

## What You Can Do

| Action | Description |
|--------|-------------|
| **View Categories** | See all categories with their key, icon, color, and status |
| **Add Category** | Create a new category with a unique key and display name |
| **Edit Category** | Update any category's name, description, icon, color, or sort order |
| **Deactivate Category** | Soft-delete a category (agents keep working, category hides from dropdowns) |
| **Reactivate Category** | Edit an inactive category and check the Active checkbox |

---

## Step by Step Use

### Adding a New Category

1. Click **+ Add Category** in the page header
2. Enter a **Key** (lowercase, no spaces - used internally, e.g., `marketing`)
3. Enter a **Display Name** (shown to users, e.g., "Marketing & Branding")
4. Optionally add a **Description**, **Emoji Icon**, **Color**, and **Sort Order**
5. Click **Save Category**

### Editing a Category

1. Find the category in the table
2. Click the **pencil icon** in the Actions column
3. Update the desired fields
4. Click **Save Category**

### Deactivating a Category

1. Click the **trash icon** next to the category
2. Confirm the deactivation in the dialog
3. The category will become inactive (shown at 50% opacity)

### Reactivating a Category

1. Click the **pencil icon** on an inactive category
2. Check the **Active** checkbox
3. Click **Save Category**

---

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| **Key** | Yes | Unique internal identifier (lowercase, no spaces) |
| **Display Name** | Yes | Human-readable name shown in the UI |
| **Description** | No | Brief explanation of the category's purpose |
| **Icon** | No | Emoji icon (defaults to folder icon) |
| **Color** | No | Accent color for the category dot (defaults to indigo) |
| **Sort Order** | No | Controls display order (1-99, lower = first) |
| **Active** | Edit only | Toggle category visibility in dropdowns |

---

## Tips & Best Practices

- Use meaningful, descriptive keys that won't need to change (the key is used internally)
- Set sort order to control the order categories appear in dropdowns
- Deactivating a category is safe - existing agent assignments are preserved
- Use distinct colors and emoji icons to help users visually differentiate categories

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Category not showing in dropdowns | Check that the category is Active |
| Duplicate key error | Each category key must be unique - choose a different key |
| Changes not appearing | Refresh the page to reload categories from the server |

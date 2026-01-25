# Organization Customization User Guide

**For:** Insight 360 Agency Administrators
**Last Updated:** January 2026

---

## Why Customization Is Important

Organization Customization allows you to tailor Insight 360 to match your agency's brand and methodology. Configure custom module names, set up your branding for client-facing reports, create reusable prompt templates, and define report structures.

---

## What It Does

| Tab | Description |
|-----|-------------|
| **Modules** | Enable/disable and customize Align 120 modules |
| **Branding** | Set logo, colors, report headers/footers |
| **Prompt Templates** | Create reusable prompts for agents |
| **Report Templates** | Define custom report structures |

---

## Step by Step Use

### Configuring Modules

1. Go to the **Modules** tab
2. Each module card shows:
   - Module name (customizable)
   - Module key (internal identifier)
   - Enable/disable toggle
3. Click the toggle to enable or disable a module
4. Click **Configure** to customize:
   - **Custom Display Name**: Replace the default module name
   - **Custom Description**: Update the module description
   - **System Prompt Override**: Customize the AI agent's behavior
5. Click **Save Changes** to apply

### Setting Up Branding

1. Go to the **Branding** tab
2. Configure your visual identity:
   - **Logo URL**: Enter URL to your organization's logo (200x60px recommended)
   - **Primary Color**: Your main brand color (used in headers, buttons)
   - **Secondary Color**: Accent color for highlights
   - **Report Header**: Text displayed at top of generated reports
   - **Report Footer**: Text displayed at bottom (e.g., confidentiality notice)
   - **Email Signature**: Default signature for automated emails
3. Preview your branding on the right side
4. Click **Save Changes** to apply

### Creating Prompt Templates

1. Go to the **Prompt Templates** tab
2. Click **Add Template**
3. Fill in the template details:
   - **Template Name**: Descriptive name for easy identification
   - **Category**: Group prompts by type (Discovery, Analysis, Reporting, General)
   - **Prompt Text**: The actual prompt content
   - **Variables**: Comma-separated list of dynamic placeholders
4. Click **Create Template**
5. Variables can be used in prompts like `{company_name}` and will be replaced at runtime

### Defining Report Templates

1. Go to the **Report Templates** tab
2. Click **Add Template**
3. Configure the template:
   - **Template Name**: Name for this report structure
   - **Report Type**: Align 120, Strategy, Executive, or Detailed
   - **Sections**: JSON array defining report sections
4. Section format example:
```json
[
  {"title": "Executive Summary", "type": "text"},
  {"title": "Key Findings", "type": "list"},
  {"title": "Recommendations", "type": "recommendations"}
]
```
5. Click **Create Template**

---

## Tips & Best Practices

- Test branding changes in a preview before sharing reports with clients
- Use consistent naming conventions for prompt templates
- Create templates for recurring report types to save time
- Back up your configurations periodically by exporting settings

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Logo not displaying | Ensure URL is publicly accessible and CORS-enabled |
| Colors not updating | Use valid hex color codes (e.g., #6366f1) |
| Prompt template not saving | Check that all required fields are filled |
| Report template JSON error | Validate JSON syntax at jsonlint.com |
| Changes not persisting | Ensure you click "Save Changes" before leaving |

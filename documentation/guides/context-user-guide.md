# Context Assets User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Why Context Assets Are Important

Context Assets are the knowledge foundation of your AI ecosystem. They store everything your AI needs to know about your business:

- **Company information**: Mission, values, history, products
- **Brand guidelines**: Voice, tone, visual standards
- **Customer profiles**: ICPs, personas, segments
- **Processes**: Workflows, procedures, best practices
- **Custom data**: Any structured knowledge

Without context, AI gives generic responses. With context, AI speaks with your voice, knows your customers, and follows your processes.

---

## What It Does

The Context Assets interface provides:

| Feature | Description |
|---------|-------------|
| **Asset Library** | Browse all stored business knowledge with filtering and search |
| **Editor** | Create and modify assets with JSON or Markdown/plain text editors |
| **AI Generation** | Auto-generate assets from text descriptions |
| **Import** | Import structured JSON asset files |
| **AI Parse** | Use AI to convert raw content into structured assets |
| **Version Control** | Track changes and rollback if needed |
| **Export** | Backup or share your knowledge base |
| **Department Scoping** | Assign assets to specific departments |
| **Visibility Control** | Set assets as public, private, or archived |

---

## Step by Step Use

### Understanding the Interface

The Context Assets page has three resizable panels:

1. **Left Panel**: Asset list with filters and search
2. **Center Panel**: Metadata form and JSON editor for selected asset
3. **Right Panel**: Markdown/plain text content editor and preview

You can drag the dividers between panels to resize them. Your panel width preferences are saved automatically.

### Browsing Context Assets

1. Click **Context Assets** in the sidebar
2. View the asset list on the left
3. Each asset shows:
   - Icon based on type (emoji or Lucide icon)
   - Asset name
   - Type badge (e.g., "company_description", "voice_dna", "icp")
   - Last modified date

### Filtering Assets

**By Type:**
1. Click the type dropdown
2. Select an asset type from the full list of 21+ types (see Asset Types section below)

**By Department:**
1. Use the department filter dropdown
2. Select a department to see only its assets
3. Assets without a department show under "All"

**By Search:**
1. Type in the search box
2. Matches name, description, and content text
3. Results filter in real-time

### Creating a New Asset

**Manual Creation:**
1. Click **New Asset** button
2. A modal dialog opens with fields:
   - **Name**: Descriptive title
   - **Type**: Select from dropdown
   - **Description**: What this asset contains
   - **Tags**: Keywords for discovery
   - **Department**: Optionally assign to a department
   - **Visibility**: Public, Private, or Archived
3. Click **Create** to add the asset
4. The asset loads in the editor panels
5. Enter content using the JSON editor (center) or Markdown editor (right)
6. Click **Save**

**AI-Assisted Generation:**
1. Click **Generate** button
2. Describe what you need in natural language
3. The AI generates a structured asset based on your description and the selected type
4. Review and edit the result
5. Save when satisfied

### Editing an Asset

1. Click an asset in the list
2. It loads in the editor panels
3. Edit metadata in the center panel form
4. Edit content using either:
   - **JSON Editor**: For structured data with syntax highlighting and validation
   - **Markdown Editor**: For free-form content in the right panel
5. Click **Save** when done

### Using the JSON Editor

1. Select the **JSON** editing mode
2. Edit the structured data
3. Color coding helps identify:
   - Keys (orange)
   - Strings (green)
   - Numbers (blue)
   - Booleans (purple)
4. Red underline indicates errors
5. Fix errors before saving

### Using the Markdown Editor

1. Use the right panel's Markdown editor
2. Write free-form content
3. Useful for:
   - Narrative descriptions
   - Guidelines and policies
   - Documentation
4. Content is stored as-is and also indexed for full-text search

### Importing Content

1. Click **Import** button
2. Paste JSON content into the import dialog
3. The system validates and imports the structured asset data
4. Review the imported asset
5. Edit if needed, then save

**Supported Import Format:**
- JSON files (structured asset data)

**AI-Powered Parsing:**
- Use the **Parse** feature to convert raw, unstructured content into structured assets
- The AI analyzes your content and generates a properly formatted asset

### Viewing Asset History

1. Open an asset
2. Click **History** in the preview panel
3. View all previous versions
4. Each version shows:
   - Version number
   - Timestamp
5. Click a version to preview
6. Click **Restore** to rollback to that version

### Checking Asset Dependencies

Before deleting an asset, the system automatically checks for dependencies:
- Agent context mappings using this asset
- Workflow context assignments
- Action context assignments

If dependencies exist, you'll be warned before deletion to prevent broken references.

### Exporting Assets

**Single Asset:**
1. Open the asset
2. Click **Export**
3. Download as JSON file

**All Assets:**
1. Click **Export All** button
2. Download complete backup
3. Use for migration or backup

---

## Asset Types

Context Assets support 21+ types organized into categories:

### Core Types
| Type | Description |
|------|-------------|
| `company_description` | Company overview, mission, and purpose |
| `why_we_win` | Competitive advantages and differentiators |
| `products` | Product and service descriptions |
| `pain_points` | Customer pain points and challenges |
| `voice_dna` | Brand voice, tone, and communication style |
| `icp` | Ideal Customer Profiles and personas |
| `core_values` | Company values and principles |
| `custom_processes` | Business workflows and procedures |

### Extended Types
| Type | Description |
|------|-------------|
| `case_studies` | Customer success stories |
| `competitors` | Competitive landscape analysis |
| `faqs` | Frequently asked questions |
| `team_bios` | Team member profiles |
| `industry_trends` | Industry insights and trends |
| `testimonials` | Customer testimonials and reviews |
| `pricing` | Pricing structures and tiers |
| `partnerships` | Partner ecosystem information |
| `compliance` | Regulatory and compliance data |
| `brand_assets` | Visual brand guidelines |
| `custom` | Any other structured knowledge |

### Example: company_description
```json
{
  "name": "Company Name",
  "mission": "Our mission statement",
  "values": ["Value 1", "Value 2"],
  "products": [...],
  "history": "Founded in..."
}
```

### Example: voice_dna
```json
{
  "tone": "Professional yet approachable",
  "personality": ["Friendly", "Expert", "Helpful"],
  "do": ["Use active voice", "Be concise"],
  "dont": ["Use jargon", "Be condescending"]
}
```

### Example: icp (Ideal Customer Profile)
```json
{
  "name": "Enterprise Decision Maker",
  "demographics": {...},
  "pain_points": [...],
  "goals": [...],
  "objections": [...]
}
```

---

## Tips for Best Results

### Creating Effective Assets
- Be specific and detailed
- Use consistent structure within types
- Include examples where helpful
- Tag assets for easy discovery
- Assign departments to keep content organized

### AI Generation Tips
- Provide detailed descriptions
- Mention your industry and audience
- Review and customize generated content
- Iterate to improve quality

### Organization Best Practices
- Name assets clearly and consistently
- Use tags liberally
- Group related assets by type and department
- Document asset purposes in descriptions
- Set visibility to control who can access each asset

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Agents User Guide | Using context with agents | [agents-user-guide.md](./agents-user-guide.md) |
| Skills User Guide | Skills that use context | [skills-user-guide.md](./skills-user-guide.md) |
| Prompt Transformer | Convert prompts to context | [prompt-transformer-user-guide.md](./prompt-transformer-user-guide.md) |

---

## Troubleshooting

**JSON validation errors:**
- Check for missing commas
- Ensure all brackets match
- Verify quote consistency
- Use the error messages as guides

**Import fails:**
- Ensure the content is valid JSON format
- Try smaller files first
- Check the JSON structure matches expected format

**Asset not appearing:**
- Refresh the page
- Check filter settings (type, department, search)
- Verify save completed successfully
- Check visibility settings

**AI generation issues:**
- Provide more detailed descriptions
- Try different phrasing
- Check that AI services are online (Dashboard → System Status)

**Cannot delete asset:**
- Check for dependencies (agents, workflows, actions using this asset)
- Remove dependencies first, then retry deletion
- Or archive the asset instead of deleting

**Organization limit reached:**
- Your subscription tier may have a limit on context assets
- Contact your administrator to upgrade or remove unused assets

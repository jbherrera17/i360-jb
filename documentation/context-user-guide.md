# Context Assets User Guide

**For:** Insight 360 Users
**Last Updated:** December 30, 2025

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
| **Asset Library** | Browse all stored business knowledge |
| **Editor** | Create and modify assets with JSON or plain text |
| **AI Generation** | Auto-generate assets from descriptions |
| **Import** | Convert existing documents to structured assets |
| **Version Control** | Track changes and rollback if needed |
| **Export** | Backup or share your knowledge base |

---

## Step by Step Use

### Understanding the Interface

The Context Assets page has three panels:

1. **Left Panel**: Asset list with filters and search
2. **Center Panel**: Editor for selected asset
3. **Right Panel**: Preview and metadata

### Browsing Context Assets

1. Click **Context Assets** in the sidebar
2. View the asset list on the left
3. Each asset shows:
   - Icon based on type
   - Asset name
   - Type badge (e.g., "company_info", "icp")
   - Last modified date

### Filtering Assets

**By Type:**
1. Click the type dropdown
2. Select an asset type:
   - `company_info`: Company details
   - `brand_voice`: Voice and tone guidelines
   - `icp`: Ideal Customer Profiles
   - `processes`: Business workflows
   - `custom`: Other knowledge

**By Search:**
1. Type in the search box
2. Matches name, description, and tags
3. Results filter in real-time

### Creating a New Asset

**Manual Creation:**
1. Click **New Asset** button
2. Fill in metadata:
   - **Name**: Descriptive title
   - **Type**: Select from dropdown
   - **Description**: What this asset contains
   - **Tags**: Keywords for discovery
3. Switch to the editor tab
4. Enter content in JSON or Plain Text mode
5. Click **Save**

**AI-Assisted Generation:**
1. Click **Generate** button
2. Choose a generation method:
   - **From Description**: Describe what you need
   - **From Template**: Use a preset structure
3. Enter your input
4. Click **Generate**
5. Review and edit the result
6. Save when satisfied

### Editing an Asset

1. Click an asset in the list
2. It loads in the center editor
3. Choose editor mode:
   - **JSON**: Structured data editing
   - **Plain Text**: Free-form content
4. Make your changes
5. The editor validates JSON automatically
6. Click **Save** when done

### Using the JSON Editor

1. Select **JSON** tab
2. Edit the structured data
3. Color coding helps identify:
   - Keys (orange)
   - Strings (green)
   - Numbers (blue)
   - Booleans (purple)
4. Red underline indicates errors
5. Fix errors before saving

### Using Plain Text Mode

1. Select **Plain Text** tab
2. Write free-form content
3. Useful for:
   - Narrative descriptions
   - Guidelines and policies
   - Documentation
4. Content is stored as-is

### Importing Content

1. Click **Import** button
2. Choose import method:
   - **File Upload**: Select a document
   - **Paste Content**: Copy-paste text
3. Select target asset type
4. AI structures the content automatically
5. Review the generated asset
6. Edit if needed, then save

**Supported Import Formats:**
- PDF documents
- Word documents
- Plain text files
- Markdown files
- JSON files

### Viewing Asset History

1. Open an asset
2. Click **History** in the preview panel
3. View all previous versions
4. Each version shows:
   - Version number
   - Timestamp
   - Changes summary
5. Click a version to preview
6. Click **Restore** to rollback

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

## Asset Types Explained

### company_info
Core company information:
```json
{
  "name": "Company Name",
  "mission": "Our mission statement",
  "values": ["Value 1", "Value 2"],
  "products": [...],
  "history": "Founded in..."
}
```

### brand_voice
Voice and tone guidelines:
```json
{
  "tone": "Professional yet approachable",
  "personality": ["Friendly", "Expert", "Helpful"],
  "do": ["Use active voice", "Be concise"],
  "dont": ["Use jargon", "Be condescending"]
}
```

### icp (Ideal Customer Profile)
Target audience definitions:
```json
{
  "name": "Enterprise Decision Maker",
  "demographics": {...},
  "pain_points": [...],
  "goals": [...],
  "objections": [...]
}
```

### processes
Business workflows:
```json
{
  "name": "Content Review Process",
  "steps": [...],
  "roles": [...],
  "sla": "24 hours"
}
```

---

## Tips for Best Results

### Creating Effective Assets
- Be specific and detailed
- Use consistent structure within types
- Include examples where helpful
- Tag assets for easy discovery

### AI Generation Tips
- Provide detailed descriptions
- Mention your industry and audience
- Review and customize generated content
- Iterate to improve quality

### Organization Best Practices
- Name assets clearly and consistently
- Use tags liberally
- Group related assets by type
- Document asset purposes in descriptions

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
- Check file format is supported
- Try smaller files first
- Ensure file isn't password protected

**Asset not appearing:**
- Refresh the page
- Check filter settings
- Verify save completed successfully

**AI generation issues:**
- Provide more detailed descriptions
- Try different phrasing
- Check that AI services are online

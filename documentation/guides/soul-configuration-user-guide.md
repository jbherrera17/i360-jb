# Soul Configuration User Guide

**For:** Insight 360 Users
**Last Updated:** February 2026

---

## Why Soul Configuration Is Important

Soul Configuration defines your organization's ethical foundation in Insight 360. It tells AI assistants:
- What your organization values most
- What lines should never be crossed (bright lines)
- How to communicate in your brand voice
- When to escalate decisions to humans

Without Soul Configuration, AI agents operate with generic guidelines. With it, they become aligned partners that understand your organizational culture.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Values Definition** | Document core values with observable behaviors |
| **Bright Lines** | Set non-negotiable ethical boundaries |
| **Voice & Persona** | Configure AI personality and communication style |
| **Domain Knowledge** | Teach AI your industry terminology |
| **Ethics Framework** | Apply SCU Framework for ethical decisions |
| **Values Alignment** | Compare stated vs. practiced values |

---

## Step by Step Use

### Creating Your First Soul Configuration

1. Navigate to **Administration** > **Soul Configuration** in the sidebar
2. Click **New Configuration** button
3. Follow the 7-step wizard:

#### Step 1: Organization Profile
- Enter your organization name
- Select your industry
- Write your mission statement (purpose - why you exist)
- Write your vision statement (future state - where you're going)
- **Tip:** Click "Import from Strategic Foundations" to pull existing data

#### Step 2: Core Values
- Click **Add Value** for each organizational value
- For each value, provide:
  - Name (e.g., "Integrity")
  - Meaning in plain terms
  - Observable behaviors (how it shows up)
  - Priority level
  - Whether it's non-negotiable
- **Tip:** Click "Import from Align 120" to see values discovered from assessments

#### Step 3: Bright Lines
- Platform bright lines are shown (immutable)
- Add your organization-specific bright lines:
  - Name the boundary
  - Describe what it means
  - Add a test question ("Would we cross this even if...?")

#### Step 4: Guardrails
- Add rules for each category:
  - Communication (how AI should communicate)
  - Decision (when to escalate)
  - Scope (boundaries of AI authority)
  - Emotional (handling sensitive topics)

#### Step 5: Voice & Persona
- Set the AI assistant name (default: Higgins)
- Define role and archetype
- Set personality temperature (formal ↔ casual)
- Add tone descriptors
- Specify words to use and avoid

#### Step 6: Domain Knowledge
- Add industry-specific terms
- List your products/services
- Define target audiences
- Note competitive landscape

#### Step 7: Review & Generate
- Review configuration summary
- Preview the generated soul.md
- Choose activation options
- Click **Publish Configuration**

### Managing Existing Configuration

1. Go to **Administration** > **Soul Configuration**
2. View the dashboard with stats and hierarchy
3. Use tabs to explore different sections:
   - **Overview** - Configuration hierarchy
   - **Values** - View and edit core values
   - **Bright Lines** - Platform and org boundaries
   - **Voice** - Persona and communication
   - **History** - Version changes and rollback
   - **Soul.md** - Export and regenerate

### Version Management

**Viewing History:**
1. Go to the **History** tab
2. See all versions with change summaries
3. Click **View** to see a version's details

**Rolling Back:**
1. Find the version you want to restore
2. Click **Rollback** icon
3. Confirm the action
4. A new version is created with restored content

### Exporting Soul.md

1. Go to the **Soul.md** tab
2. Click **Export** button
3. Save the downloaded markdown file
4. Use it for documentation or backup

---

## Understanding the Completeness Score

The completeness score (0-100%) indicates how fully your configuration is defined:

| Score | Rating | What's Missing |
|-------|--------|----------------|
| 90-100% | Excellent | Fully configured |
| 70-89% | Good | Minor sections incomplete |
| 50-69% | Moderate | Several sections need work |
| Below 50% | Needs Work | Major sections missing |

**Score Breakdown:**
- Organization Profile: 15%
- Core Values: 25%
- Bright Lines: 15%
- Guardrails: 15%
- Voice: 15%
- Domain: 15%

---

## Tips & Best Practices

### Values
- Define 3-5 core values (quality over quantity)
- Include observable behaviors for each
- Mark truly non-negotiable values appropriately
- Review against Align 120 discovered values

### Bright Lines
- Don't duplicate platform bright lines
- Focus on organization-specific boundaries
- Include test questions for clarity
- Be specific about what constitutes a violation

### Voice
- Match your actual brand voice
- Test with sample conversations
- Update when brand guidelines change
- Be specific about words to avoid

### Maintenance
- Review quarterly
- Update after organizational changes
- Run Values Alignment Audit periodically
- Monitor Integrity Dashboard metrics

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't save configuration | Check required fields are filled |
| Import not working | Verify Strategic Foundations/Align 120 data exists |
| Low completeness score | Add missing sections per the breakdown |
| Changes not appearing | Publish the configuration to activate |
| Version rollback failed | Check you have admin permissions |

---

## Related Features

- **Integrity Dashboard** - View soul-based metrics
- **SynergiNexus** - Explore ethical lenses
- **Align 120** - Discover organizational values
- **Strategy 120** - Define strategic foundations

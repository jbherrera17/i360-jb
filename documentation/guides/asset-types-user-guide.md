# Asset Types User Guide

## Overview

The **Asset Types** page allows administrators to manage the types of context assets available in Insight 360. Asset types define categories for organizing your organization's knowledge base, such as Company Description, Products, VoiceDNA, ICPs, and more.

## Key Concepts

### What are Asset Types?

Asset types are templates that categorize and structure your context assets. Each type has:

- **Type Key**: A unique identifier (lowercase letters and underscores only)
- **Display Name**: A human-readable name shown in the UI
- **Category**: Either "Core" (essential types) or "Extended" (additional types)
- **Icon**: A visual icon from the Lucide icon library

### Core vs Extended Categories

- **Core Types** (8): Essential types that every organization should have
  - Company Description, Why We Win, Products, Pain Points
  - VoiceDNA, ICP, Core Values, Custom Processes

- **Extended Types** (10+): Additional types for comprehensive context
  - Competitors, Case Studies, FAQs, Team Bios
  - Industry Context, Terminology, Templates, Pricing
  - Brand Guidelines, Personas

## Using the Asset Types Page

### Viewing Asset Types

The main table displays all asset types with:
- Icon and type key
- Display name
- Category badge (Core/Extended)
- Number of assets using this type
- Edit and delete actions

Use the search box to filter types by name or key.

### Statistics Cards

The top of the page shows:
- **Total Types**: Number of asset types defined
- **Core Types**: Number of core category types
- **Extended Types**: Number of extended category types
- **Total Assets**: Sum of all assets across all types

### Creating a New Asset Type

1. Click the **Add Type** button
2. Fill in the form:
   - **Type Key**: Enter a unique identifier (e.g., `market_research`)
   - **Display Name**: Enter the name shown to users
   - **Category**: Select Core or Extended
   - **Icon**: Search and select an icon from the picker
3. Click **Create Type**

> **Note**: The type key cannot be changed after creation.

### Editing an Asset Type

1. Click the **pencil icon** on any type row
2. Modify the display name, category, or icon
3. Click **Save Changes**

> **Note**: Built-in core types can be customized but not deleted.

### Deleting an Asset Type

1. Click the **trash icon** on any type row
2. Confirm the deletion in the modal

> **Warning**: You cannot delete types that have assets associated with them. Move or delete those assets first.

## Icon Picker

The icon picker provides access to the Lucide icon library:

- **Recommended Icons**: Curated icons suitable for asset types
- **Search**: Type to search all 1000+ available icons
- **Preview**: Selected icon is shown in the text field

Popular icons for asset types include:
- `building` - Company/Organization
- `trophy` - Achievements/Why We Win
- `package` - Products
- `target` - Pain Points/Goals
- `mic` - Voice/Communication
- `user` - Personas/ICPs
- `gem` - Values
- `settings` - Processes

## Best Practices

### Naming Conventions

- **Type Keys**: Use lowercase with underscores (e.g., `case_studies`, `voice_dna`)
- **Display Names**: Use Title Case (e.g., "Case Studies", "VoiceDNA")

### Organization Tips

1. Start with core types before adding extended types
2. Use consistent icons across related types
3. Keep type names concise but descriptive
4. Review asset counts regularly to identify unused types

### When to Create Custom Types

Create new asset types when:
- Your organization has unique knowledge categories
- Existing types don't fit your content structure
- You need specific JSON schemas for structured data

## Troubleshooting

### Cannot Delete a Type
- Check if assets are using this type
- Go to Context Assets and filter by this type
- Move assets to a different type or delete them first

### Icon Not Displaying
- Make sure the icon name is valid (lowercase with hyphens)
- Try searching for the icon in the picker to verify it exists
- Legacy emoji icons will display as text

### Changes Not Saving
- Ensure all required fields are filled
- Check browser console for error messages
- Verify your session hasn't expired

## Related Pages

- **[Context Assets](/context.html)**: Create and manage individual assets
- **[Icon Library](/admin-icons.html)**: Browse all available icons
- **[Agents](/agents.html)**: Configure which assets are available to agents

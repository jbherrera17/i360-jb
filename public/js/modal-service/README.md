# ModalService

A unified modal system for Insight 360 providing consistent, accessible, and feature-rich dialogs.

## Features

- **Unified API**: Single service for all modal types
- **Theme Support**: Automatic light/dark mode matching
- **Accessibility**: ARIA labels, keyboard navigation, focus trapping
- **Stacking**: Multiple modals with proper z-index management
- **Mixins**: Composable features (drag, resize, fullscreen, persistence)
- **Specialized Modals**: Alert, Confirm, Prompt, Form, Content, Chat, Agent

## Quick Start

### 1. Include the Loader

```html
<script src="/js/modal-service/loader.js" data-auto-load></script>
```

### 2. Use ModalService

```javascript
// Basic alerts
await ModalService.alert({ title: 'Hello', message: 'World!' });
await ModalService.success('Operation completed!');
await ModalService.error('Something went wrong');

// Confirmations
const confirmed = await ModalService.confirm({
    title: 'Delete Item',
    message: 'Are you sure?',
    type: 'danger'
});

// Prompts
const name = await ModalService.prompt({
    title: 'Enter Name',
    placeholder: 'Your name...'
});

// Forms
const data = await ModalService.form({
    title: 'User Settings',
    fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'email', name: 'email', label: 'Email' },
        { type: 'select', name: 'role', label: 'Role', options: ['Admin', 'User'] }
    ]
});
```

## API Reference

### ModalService Methods

#### `ModalService.alert(options)` → Promise<void>
Show an alert dialog.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Alert' | Modal title |
| `message` | string | - | Alert message |
| `type` | string | 'info' | Type: info, success, warning, error |
| `buttonText` | string | 'OK' | Button text |

#### `ModalService.confirm(options)` → Promise<boolean>
Show a confirmation dialog.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Confirm' | Modal title |
| `message` | string | - | Confirmation message |
| `type` | string | 'info' | Type: info, warning, danger |
| `confirmText` | string | 'Confirm' | Confirm button text |
| `cancelText` | string | 'Cancel' | Cancel button text |

#### `ModalService.prompt(options)` → Promise<string|null>
Show a text input dialog.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Input' | Modal title |
| `message` | string | '' | Prompt message |
| `placeholder` | string | '' | Input placeholder |
| `defaultValue` | string | '' | Default input value |
| `inputType` | string | 'text' | Input type (text, email, password, etc.) |

#### `ModalService.form(options)` → Promise<Object|null>
Show a form dialog.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | 'Form' | Modal title |
| `fields` | Array | [] | Field definitions |
| `submitText` | string | 'Submit' | Submit button text |
| `cancelText` | string | 'Cancel' | Cancel button text |

#### `ModalService.content(options)` → ContentModal
Create a content viewer modal.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | '' | Modal title |
| `content` | string | '' | Content to display (URL for image/video) |
| `contentType` | string | 'markdown' | Type: markdown, html, code, image, video |
| `language` | string | 'plaintext' | Code language for syntax highlighting |
| `copyable` | boolean | false | Show copy button for code |
| `imageAlt` | string | 'Image' | Alt text for images |
| `autoplay` | boolean | false | Autoplay video |
| `loop` | boolean | false | Loop video |
| `muted` | boolean | false | Mute video |
| `controls` | boolean | true | Show video controls |
| `poster` | string | '' | Video poster image URL |

**Video Support:** ContentModal supports native video files, YouTube URLs, and Vimeo URLs. YouTube and Vimeo links are automatically detected and rendered as embeds.

```javascript
// Native video
ModalService.content({
    title: 'Video Player',
    content: '/videos/demo.mp4',
    contentType: 'video',
    controls: true,
    autoplay: false
});

// YouTube (auto-detected)
ModalService.content({
    title: 'YouTube Video',
    content: 'https://www.youtube.com/watch?v=VIDEO_ID',
    contentType: 'video'
});
```

#### `ModalService.chat(options)` → ChatModal
Create a chat interface modal.

#### `ModalService.agent(options)` → AgentModal
Create an AI agent chat modal with file attachment and context asset support.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agent` | Object | - | Agent object with id, name, prompt, context_assets, etc. |
| `context` | Object | {} | Initial context variables for prompt injection |
| `contextAssets` | Array | [] | Context assets to display (alternative to agent.context_assets) |
| `model` | string | 'claude-sonnet-4-5-20250929' | LLM model to use |
| `maxFileSize` | number | 10485760 | Maximum file size in bytes (10MB default) |
| `allowedFileTypes` | Array | ['image/*', 'text/*', ...] | Allowed MIME types and extensions |
| `autoStart` | boolean | true | Auto-start agent on open |
| `showControls` | boolean | true | Show model selector and stop button |
| `onComplete` | Function | - | Callback when agent completes |
| `onError` | Function | - | Callback on error |

**Context Assets Panel:** AgentModal displays applied context assets in a collapsible panel. Users can click the eye icon to view the full content of each asset.

```javascript
// Agent with context assets
const modal = new AgentModal({
    agent: {
        id: 'context-agent',
        name: 'Context-Aware Agent',
        prompt: 'You have access to brand guidelines...',
        context_assets: [
            { id: '1', asset_type: 'voice_dna', name: 'Brand Voice', content_text: '...' },
            { id: '2', asset_type: 'icp', name: 'Target Customer', content_text: '...' }
        ]
    }
});

// Update context assets dynamically
modal.setContextAssets(newAssets);
```

**File Attachment Support:** AgentModal includes a paperclip button for attaching files. Users can also drag and drop files onto the input area.

```javascript
// Agent with file attachments
const modal = new AgentModal({
    agent: {
        id: 'file-analyzer',
        name: 'File Analyzer',
        prompt: 'Analyze uploaded files...'
    },
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    allowedFileTypes: ['image/*', 'text/*', '.pdf', '.json']
});

// Access attached files
const files = modal.getAttachments();

// Clear attachments programmatically
modal.clearAttachments();
```

**Selection Dialogs:** AgentModal provides methods for collecting user choices during agent interactions.

```javascript
// Single selection (radio buttons)
const choice = await modal.showSelection({
    title: 'Choose Model',
    message: 'Which AI model should I use?',
    options: [
        { value: 'claude', label: 'Claude Sonnet' },
        { value: 'gpt4', label: 'GPT-4o' }
    ],
    showInChat: true  // Shows selection in chat history
});
// Returns: 'claude' or 'gpt4' or null

// Multi-selection (checkboxes)
const features = await modal.showSelection({
    title: 'Select Features',
    message: 'Choose features to enable:',
    multiple: true,
    minSelect: 1,      // Require at least 1
    maxSelect: 3,      // Allow up to 3
    options: [
        { value: 'auth', label: 'Authentication', description: 'User login' },
        { value: 'api', label: 'REST API', description: 'External access' },
        { value: 'analytics', label: 'Analytics' }
    ]
});
// Returns: ['auth', 'api'] or null

// Convenience method for multi-selection
const items = await modal.showMultiSelection({
    title: 'Select Items',
    options: ['Option A', 'Option B', 'Option C']
});
```

#### `ModalService.loading(options)` → ModalBase
Show a loading spinner.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | string | 'Loading...' | Loading message |

#### `ModalService.toast(options)`
Show a toast notification.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `message` | string | - | Toast message |
| `type` | string | 'info' | Type: info, success, warning, error |
| `duration` | number | 3000 | Duration in ms |

### Helper Methods

```javascript
ModalService.success(message, title);   // Success alert
ModalService.error(message, title);     // Error alert
ModalService.warning(message, title);   // Warning alert
ModalService.info(message, title);      // Info alert
ModalService.confirmDanger(message, title);  // Danger confirmation
```

### Management Methods

```javascript
ModalService.closeAll();        // Close all open modals
ModalService.closeTop();        // Close topmost modal
ModalService.get(modalId);      // Get modal by ID
ModalService.getOpenModals();   // Get all open modals
ModalService.bringToFront(modal);  // Bring modal to front
```

## Form Field Types

### Text Fields

```javascript
{ type: 'text', name: 'username', label: 'Username', required: true }
{ type: 'email', name: 'email', label: 'Email', placeholder: 'user@example.com' }
{ type: 'password', name: 'pass', label: 'Password' }
{ type: 'number', name: 'age', label: 'Age', min: 0, max: 120 }
{ type: 'textarea', name: 'bio', label: 'Bio', rows: 4 }
```

### Selection Fields

```javascript
// Dropdown
{
    type: 'select',
    name: 'country',
    label: 'Country',
    options: [
        { value: 'us', label: 'United States' },
        { value: 'uk', label: 'United Kingdom' }
    ]
}

// Radio buttons
{
    type: 'radio',
    name: 'plan',
    label: 'Plan',
    options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' }
    ]
}

// Checkbox group (multi-select)
{
    type: 'checkbox-group',
    name: 'features',
    label: 'Select Features',
    options: [
        { value: 'f1', label: 'Feature 1', description: 'Description text' },
        { value: 'f2', label: 'Feature 2', description: 'More details' }
    ]
}
```

### Special Fields

```javascript
// Single checkbox
{ type: 'checkbox', name: 'agree', label: 'I agree to terms', required: true }

// Avatar picker
{
    type: 'avatar',
    name: 'profile_image',
    label: 'Profile Picture',
    avatars: [
        { url: '/avatars/default1.png', name: 'Default 1' },
        { url: '/avatars/default2.png', name: 'Default 2' }
    ]
}
```

## Modal Options

All modals support these common options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | number | 450 | Modal width in pixels |
| `height` | number | auto | Modal height in pixels |
| `draggable` | boolean | true | Enable dragging |
| `resizable` | boolean | false | Enable resizing |
| `maximizable` | boolean | false | Enable maximize button |
| `closable` | boolean | true | Show close button |
| `closeOnEscape` | boolean | true | Close on Escape key |
| `closeOnOverlayClick` | boolean | true | Close on overlay click |
| `className` | string | '' | Additional CSS class |
| `position` | Object | center | Initial position { x, y } or 'cascade' |

## Events

```javascript
const modal = ModalService.create({ title: 'Demo' });

modal.on('open', () => {});
modal.on('close', (result) => {});
modal.on('beforeclose', () => {}); // Return false to prevent close
modal.on('drag', ({ x, y }) => {});
modal.on('resize', ({ width, height }) => {});
modal.on('maximize', () => {});
modal.on('restore', () => {});
```

## Custom Modals

```javascript
const modal = ModalService.create({
    title: 'Custom Modal',
    content: `
        <div class="custom-content">
            <p>Custom HTML content</p>
            <button id="customBtn">Click Me</button>
        </div>
    `,
    footer: `
        <button class="i360-btn i360-btn-secondary" data-action="close">Close</button>
        <button class="i360-btn i360-btn-primary" id="saveBtn">Save</button>
    `,
    draggable: true,
    resizable: true,
    maximizable: true,
    width: 500,
    onOpen: () => {
        document.getElementById('customBtn').addEventListener('click', () => {
            console.log('Button clicked!');
        });
    }
});

modal.open();
```

## Theming

ModalService automatically uses the page theme via `html[data-theme]` attribute:

```css
/* Custom theme overrides */
:root {
    --i360-modal-primary: #your-color;
    --i360-modal-bg: #your-bg;
}
```

## Files Structure

```
/js/modal-service/
├── index.js           # Main ModalService singleton
├── loader.js          # Dynamic loader utility
├── ModalBase.js       # Base modal class
├── modal-service.css  # Styles
├── utils/
│   ├── sanitize.js    # HTML sanitization
│   └── position.js    # Position calculations
├── mixins/
│   ├── DraggableMixin.js   # Drag functionality
│   ├── ResizableMixin.js   # Resize functionality
│   ├── FullscreenMixin.js  # Maximize/restore
│   └── PersistenceMixin.js # State persistence
└── modals/
    ├── AlertModal.js
    ├── ConfirmModal.js
    ├── PromptModal.js
    ├── FormModal.js
    ├── ContentModal.js
    ├── ChatModal.js
    └── AgentModal.js
```

## Testing

Open `/modal-test.html` to test all modal features interactively.

## Migration

See [MIGRATION.md](./MIGRATION.md) for migrating from legacy modal implementations.

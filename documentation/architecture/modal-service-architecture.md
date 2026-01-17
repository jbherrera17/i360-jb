# ModalService Architecture Specification

**Version:** 1.0.0
**Date:** January 16, 2026
**Status:** Design Document
**Author:** Claude Code

---

## Executive Summary

This document specifies a unified modal service architecture for Insight 360 that consolidates four existing modal implementations into a single, extensible system. The design supports all current use cases while enabling new capabilities like running agents in modal windows with full chat.html functionality.

---

## Current State Analysis

### Existing Implementations

| Component | Lines | Pattern | Features |
|-----------|-------|---------|----------|
| ModalManager | 523 | Class | Drag, resize (8 handles) |
| AgentDialogService | 900 | Class | Chat, streaming, drag, resize |
| HelpModal | 537 | IIFE | Markdown, fullscreen, drag, resize (3 handles) |
| OnboardingWizard | 1,179 | IIFE | Multi-step, forms, progress |

### Problems to Solve

1. **Code duplication** - Drag/resize logic repeated ~150 lines across files
2. **Inconsistent z-index** - 1000, 2000, 10000 with no management
3. **Mixed CSS approaches** - Some inline, some external
4. **Different naming** - `.modal-*`, `.agent-dialog-*`, `.help-modal-*`
5. **No shared utilities** - Markdown, XSS, positioning duplicated
6. **Agent runner limitation** - Currently a full page, needs modal capability

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ModalService                                   │
│                     (Central Registry & Factory)                         │
├─────────────────────────────────────────────────────────────────────────┤
│  • Modal stack management (z-index)                                      │
│  • Global keyboard handling (Escape)                                     │
│  • Overlay management                                                    │
│  • Modal instance registry                                               │
│  • Configuration defaults                                                │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ModalBase                                       │
│                    (Abstract Base Class)                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Core Features:                                                          │
│  • Create/destroy lifecycle                                              │
│  • Show/hide with animations                                             │
│  • Header with title, subtitle, close button                             │
│  • Body container                                                        │
│  • Footer with actions                                                   │
│  • Event system (onOpen, onClose, onResize, etc.)                       │
│                                                                          │
│  Optional Mixins:                                                        │
│  • DraggableMixin - Header drag functionality                           │
│  • ResizableMixin - 8-direction resize handles                          │
│  • FullscreenMixin - Maximize/restore toggle                            │
│  • PersistenceMixin - Remember size/position                            │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ AlertModal    │   │ ConfirmModal  │   │ FormModal     │   │ ContentModal  │
│               │   │               │   │               │   │               │
│ • Message     │   │ • Message     │   │ • Form fields │   │ • HTML/MD     │
│ • OK button   │   │ • Yes/No/Cancel│  │ • Validation  │   │ • Scrollable  │
│ • Icon        │   │ • Callbacks   │   │ • Submit      │   │ • File load   │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘

        ┌───────────────────┬───────────────────┬───────────────────┐
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ WizardModal   │   │ ChatModal     │   │ AgentModal    │   │ PreviewModal  │
│               │   │               │   │               │   │               │
│ • Steps       │   │ • Messages    │   │ • Extends     │   │ • Code/JSON   │
│ • Progress    │   │ • Streaming   │   │   ChatModal   │   │ • Syntax HL   │
│ • Navigation  │   │ • Input       │   │ • Agent config│   │ • Copy button │
│ • Validation  │   │ • Typing ind. │   │ • Context     │   │ • Download    │
└───────────────┘   └───────────────┘   │ • Model select│   └───────────────┘
                                        │ • File attach │
                                        │ • Full chat.js│
                                        └───────────────┘
```

---

## Core Components

### 1. ModalService (Singleton)

Central registry and factory for all modals.

```javascript
/**
 * ModalService - Central modal management
 * @singleton
 */
class ModalService {
    constructor() {
        this.modals = new Map();        // Active modal instances
        this.stack = [];                // Z-index stack (LIFO)
        this.baseZIndex = 10000;        // Starting z-index
        this.config = {                 // Global defaults
            animation: 'fade-scale',    // 'fade', 'slide', 'fade-scale', 'none'
            animationDuration: 200,
            closeOnOverlay: true,
            closeOnEscape: true,
            trapFocus: true
        };

        this._initGlobalHandlers();
    }

    // Factory methods
    alert(options)      → AlertModal
    confirm(options)    → ConfirmModal
    form(options)       → FormModal
    content(options)    → ContentModal
    wizard(options)     → WizardModal
    chat(options)       → ChatModal
    agent(options)      → AgentModal
    preview(options)    → PreviewModal
    custom(options)     → ModalBase

    // Stack management
    register(modal)     → void
    unregister(modal)   → void
    getTopModal()       → ModalBase | null
    closeAll()          → void
    closeTop()          → void

    // Z-index management
    bringToFront(modal) → void
    getNextZIndex()     → number

    // Global event handlers
    _initGlobalHandlers()
    _handleEscape(event)
    _handleOverlayClick(event)
}

// Singleton export
export const modalService = new ModalService();
```

### 2. ModalBase (Abstract Class)

Base class all modals extend.

```javascript
/**
 * ModalBase - Abstract base class for all modals
 */
class ModalBase {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.options = {
            // Content
            title: '',
            subtitle: '',
            icon: null,

            // Dimensions
            width: 500,
            height: 'auto',
            minWidth: 300,
            minHeight: 200,
            maxWidth: '90vw',
            maxHeight: '90vh',

            // Position
            position: 'center',         // 'center', 'top', {x, y}

            // Features
            draggable: true,
            resizable: true,
            closable: true,
            maximizable: false,

            // Behavior
            modal: true,                // Show overlay
            closeOnOverlay: true,
            closeOnEscape: true,
            destroyOnClose: true,

            // Animation
            animation: 'fade-scale',

            // Callbacks
            onOpen: null,
            onClose: null,
            onResize: null,
            onDragEnd: null,
            onBeforeClose: null,        // Return false to prevent close

            ...options
        };

        this.state = {
            isOpen: false,
            isMaximized: false,
            isDragging: false,
            isResizing: false,
            position: { x: 0, y: 0 },
            size: { width: 0, height: 0 },
            restoreState: null          // For maximize/restore
        };

        this.elements = {
            overlay: null,
            container: null,
            header: null,
            body: null,
            footer: null,
            closeBtn: null,
            resizeHandles: {}
        };
    }

    // Lifecycle
    render()            → HTMLElement
    open()              → Promise<void>
    close()             → Promise<void>
    destroy()           → void

    // Content
    setTitle(title)     → void
    setSubtitle(text)   → void
    setBody(content)    → void
    setFooter(content)  → void

    // State
    maximize()          → void
    restore()           → void
    toggleMaximize()    → void
    bringToFront()      → void

    // Protected methods (for subclasses)
    _createStructure()  → void
    _bindEvents()       → void
    _applyAnimation(type) → Promise<void>

    // Events
    on(event, handler)  → void
    off(event, handler) → void
    emit(event, data)   → void
}
```

### 3. Mixins

Composable functionality modules.

```javascript
/**
 * DraggableMixin - Adds drag capability
 */
const DraggableMixin = {
    initDraggable() {
        this._dragState = { startX: 0, startY: 0, startLeft: 0, startTop: 0 };
        this.elements.header.style.cursor = 'move';
        this.elements.header.addEventListener('mousedown', this._onDragStart.bind(this));
    },

    _onDragStart(e) { /* ... */ },
    _onDragMove(e) { /* ... */ },
    _onDragEnd(e) { /* ... */ }
};

/**
 * ResizableMixin - Adds resize handles
 */
const ResizableMixin = {
    initResizable() {
        this._resizeState = { handle: null, startX: 0, startY: 0, startW: 0, startH: 0 };
        this._createResizeHandles();
    },

    _createResizeHandles() {
        // Creates 8 handles: n, ne, e, se, s, sw, w, nw
        const handles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
        handles.forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `i360-modal-resize i360-modal-resize-${dir}`;
            handle.dataset.direction = dir;
            handle.addEventListener('mousedown', this._onResizeStart.bind(this));
            this.elements.container.appendChild(handle);
            this.elements.resizeHandles[dir] = handle;
        });
    },

    _onResizeStart(e) { /* ... */ },
    _onResizeMove(e) { /* ... */ },
    _onResizeEnd(e) { /* ... */ }
};

/**
 * FullscreenMixin - Adds maximize/restore
 */
const FullscreenMixin = {
    initFullscreen() {
        // Add maximize button to header
    },

    maximize() {
        this.state.restoreState = { ...this.state.position, ...this.state.size };
        this.state.isMaximized = true;
        // Apply fullscreen styles
    },

    restore() {
        if (!this.state.restoreState) return;
        // Restore previous state
        this.state.isMaximized = false;
    }
};

/**
 * PersistenceMixin - Remember size/position
 */
const PersistenceMixin = {
    initPersistence(storageKey) {
        this._storageKey = storageKey;
        this._loadState();
    },

    _loadState() {
        const saved = localStorage.getItem(this._storageKey);
        if (saved) {
            const { position, size } = JSON.parse(saved);
            this.state.position = position;
            this.state.size = size;
        }
    },

    _saveState() {
        localStorage.setItem(this._storageKey, JSON.stringify({
            position: this.state.position,
            size: this.state.size
        }));
    }
};
```

---

## Modal Types

### 4. AlertModal

Simple message display with OK button.

```javascript
class AlertModal extends ModalBase {
    constructor(options) {
        super({
            width: 400,
            height: 'auto',
            draggable: false,
            resizable: false,
            ...options
        });

        this.alertOptions = {
            type: 'info',           // 'info', 'success', 'warning', 'error'
            message: '',
            buttonText: 'OK',
            onConfirm: null
        };
    }
}

// Usage
modalService.alert({
    title: 'Success',
    type: 'success',
    message: 'Agent created successfully!',
    onConfirm: () => console.log('Acknowledged')
});
```

### 5. ConfirmModal

Yes/No/Cancel confirmation dialog.

```javascript
class ConfirmModal extends ModalBase {
    constructor(options) {
        super({
            width: 450,
            draggable: false,
            resizable: false,
            ...options
        });

        this.confirmOptions = {
            type: 'question',       // 'question', 'warning', 'danger'
            message: '',
            confirmText: 'Yes',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: null,
            onCancel: null
        };
    }
}

// Usage
const confirmed = await modalService.confirm({
    title: 'Delete Agent',
    type: 'danger',
    message: 'Are you sure you want to delete this agent? This cannot be undone.',
    confirmText: 'Delete',
    onConfirm: () => deleteAgent(id)
});
```

### 6. FormModal

Modal with form fields and validation.

```javascript
class FormModal extends ModalBase {
    constructor(options) {
        super({
            width: 500,
            ...options
        });

        this.formOptions = {
            fields: [],             // Field definitions
            submitText: 'Submit',
            cancelText: 'Cancel',
            onSubmit: null,
            onCancel: null,
            validate: null          // Custom validation function
        };
    }

    // Field definition example
    // { name: 'email', type: 'email', label: 'Email', required: true, placeholder: '...' }

    getValues()         → object
    setValues(values)   → void
    validate()          → { valid: boolean, errors: object }
    setErrors(errors)   → void
    clearErrors()       → void
}

// Usage
modalService.form({
    title: 'Create Agent',
    fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'description', type: 'textarea', label: 'Description' },
        { name: 'model', type: 'select', label: 'Model', options: models }
    ],
    onSubmit: async (values) => {
        await createAgent(values);
    }
});
```

### 7. ContentModal

Display HTML/Markdown content (replaces HelpModal).

```javascript
class ContentModal extends ModalBase {
    constructor(options) {
        super({
            width: 700,
            height: 500,
            maximizable: true,
            ...options
        });

        this.contentOptions = {
            content: '',            // HTML or Markdown string
            contentType: 'html',    // 'html', 'markdown', 'text'
            loadUrl: null,          // URL to fetch content from
            sanitize: true          // XSS protection
        };
    }

    setContent(content, type)   → void
    loadFromUrl(url)            → Promise<void>
    scrollTo(selector)          → void
}

// Usage
modalService.content({
    title: 'Help: Workflow Builder',
    loadUrl: '/help/workflow-builder.md',
    contentType: 'markdown'
});
```

### 8. WizardModal

Multi-step wizard (replaces OnboardingWizard pattern).

```javascript
class WizardModal extends ModalBase {
    constructor(options) {
        super({
            width: 600,
            height: 500,
            closable: true,
            draggable: false,
            resizable: false,
            ...options
        });

        this.wizardOptions = {
            steps: [],              // Step definitions
            showProgress: true,
            allowSkip: false,
            onStepChange: null,
            onComplete: null
        };

        this.currentStep = 0;
    }

    // Step definition
    // { id: 'welcome', title: 'Welcome', content: HTMLElement | string, validate: fn }

    nextStep()          → Promise<boolean>
    prevStep()          → void
    goToStep(index)     → void
    getCurrentStep()    → object
    isFirstStep()       → boolean
    isLastStep()        → boolean
}

// Usage
modalService.wizard({
    title: 'Setup Wizard',
    steps: [
        { id: 'welcome', title: 'Welcome', content: welcomeHtml },
        { id: 'profile', title: 'Your Profile', content: profileForm, validate: validateProfile },
        { id: 'preferences', title: 'Preferences', content: prefsForm },
        { id: 'complete', title: 'All Done!', content: completeHtml }
    ],
    onComplete: (data) => saveOnboarding(data)
});
```

### 9. ChatModal

Full chat interface in a modal (core for AgentModal).

```javascript
class ChatModal extends ModalBase {
    constructor(options) {
        super({
            width: 700,
            height: 600,
            minWidth: 400,
            minHeight: 400,
            maximizable: true,
            ...options
        });

        this.chatOptions = {
            // API
            endpoint: '/api/chat',
            streaming: true,

            // Model
            model: 'claude-sonnet-4-5-20250929',
            models: [],             // Available models for selector
            showModelSelector: true,

            // Features
            enableFileUpload: true,
            enableVoice: false,
            enableSearch: false,
            showTypingIndicator: true,

            // Messages
            systemPrompt: null,
            welcomeMessage: null,
            conversationStarters: [],

            // History
            conversationHistory: [],
            saveHistory: true,

            // Callbacks
            onSend: null,
            onReceive: null,
            onError: null
        };

        this.state = {
            ...this.state,
            isStreaming: false,
            messages: [],
            attachedFiles: []
        };
    }

    // Methods
    sendMessage(content, files)     → Promise<void>
    addMessage(role, content)       → void
    clearMessages()                 → void
    setModel(modelId)               → void
    attachFile(file)                → void
    removeFile(index)               → void
    stopStreaming()                 → void
    exportConversation()            → object

    // Internal
    _handleStream(response)         → Promise<void>
    _formatMessage(content)         → string
    _scrollToBottom()               → void
    _renderTypingIndicator()        → void
}
```

### 10. AgentModal (Primary Use Case)

**Full agent runner in a modal** - This is the key new capability.

```javascript
class AgentModal extends ChatModal {
    constructor(options) {
        super({
            width: 800,
            height: 650,
            ...options
        });

        this.agentOptions = {
            // Agent
            agentId: null,
            agent: null,            // Pre-loaded agent object

            // Context
            showContextPanel: true,
            contextPanelPosition: 'right',  // 'right', 'bottom', 'hidden'
            contextAssets: [],
            onDemandAssets: [],

            // Callbacks
            onAgentLoad: null,
            onContextChange: null
        };
    }

    // Agent-specific methods
    loadAgent(agentId)              → Promise<void>
    setAgent(agent)                 → void
    getAgent()                      → object

    // Context management
    loadContextAssets()             → Promise<void>
    addContextAsset(assetId)        → void
    removeContextAsset(assetId)     → void
    toggleOnDemandAsset(assetId)    → void
    getActiveContext()              → object[]

    // Execute
    executePrompt(message)          → Promise<void>

    // Override chat endpoint
    _buildRequest(message) {
        return {
            message,
            agent_id: this.agentOptions.agentId,
            model: this.chatOptions.model,
            context_asset_ids: this.getActiveContextIds(),
            conversation_history: this.state.messages
        };
    }
}

// Usage - Launch agent runner in modal
modalService.agent({
    agentId: 'abc-123',
    title: 'Technology Radar Analyst',
    onClose: () => console.log('Agent session ended')
});

// Or with pre-loaded agent
modalService.agent({
    agent: agentData,
    contextAssets: preloadedAssets,
    welcomeMessage: 'Hello! I can help analyze technologies.',
    conversationStarters: [
        'Assess Claude 3.5 Sonnet',
        'Compare GPT-4 vs Claude',
        'Technology radar for LangChain'
    ]
});
```

### 11. PreviewModal

Code/JSON preview with syntax highlighting.

```javascript
class PreviewModal extends ModalBase {
    constructor(options) {
        super({
            width: 700,
            height: 500,
            ...options
        });

        this.previewOptions = {
            content: '',
            language: 'json',       // 'json', 'javascript', 'html', 'markdown', 'text'
            lineNumbers: true,
            copyButton: true,
            downloadButton: false,
            downloadFilename: 'preview.txt'
        };
    }

    setContent(content, language)   → void
    copyToClipboard()               → Promise<void>
    download()                      → void
}
```

---

## CSS Architecture

### Naming Convention

All modal classes use `i360-modal-` prefix to avoid conflicts.

```css
/* Base structure */
.i360-modal-overlay { }
.i360-modal-container { }
.i360-modal-header { }
.i360-modal-title { }
.i360-modal-subtitle { }
.i360-modal-close { }
.i360-modal-body { }
.i360-modal-footer { }

/* Resize handles */
.i360-modal-resize { }
.i360-modal-resize-n { }
.i360-modal-resize-ne { }
.i360-modal-resize-e { }
/* ... etc */

/* States */
.i360-modal-container.is-dragging { }
.i360-modal-container.is-resizing { }
.i360-modal-container.is-maximized { }

/* Variants */
.i360-modal-container.i360-modal-alert { }
.i360-modal-container.i360-modal-confirm { }
.i360-modal-container.i360-modal-chat { }
.i360-modal-container.i360-modal-agent { }

/* Animations */
.i360-modal-enter { }
.i360-modal-enter-active { }
.i360-modal-exit { }
.i360-modal-exit-active { }
```

### CSS File Structure

```
public/css/
├── modal-service.css           # Base modal styles (required)
├── modal-components.css        # Alert, Confirm, Form, Preview
├── modal-chat.css              # Chat and Agent modal styles
├── modal-wizard.css            # Wizard-specific styles
└── modal-themes.css            # Dark/light theme overrides
```

### Z-Index Management

```javascript
// ModalService manages z-index stack
const Z_INDEX = {
    OVERLAY_BASE: 10000,
    MODAL_BASE: 10001,
    MODAL_INCREMENT: 10,    // Each new modal adds 10
    RESIZE_HANDLE: 1,       // Relative to modal
    TYPING_INDICATOR: 2     // Relative to chat body
};

// When modal opens:
modal.zIndex = this.baseZIndex + (this.stack.length * Z_INDEX.MODAL_INCREMENT);
overlay.zIndex = modal.zIndex - 1;
```

---

## File Structure

```
public/js/
├── modal-service/
│   ├── index.js                # Main export, ModalService singleton
│   ├── ModalBase.js            # Base class
│   ├── mixins/
│   │   ├── DraggableMixin.js
│   │   ├── ResizableMixin.js
│   │   ├── FullscreenMixin.js
│   │   └── PersistenceMixin.js
│   ├── modals/
│   │   ├── AlertModal.js
│   │   ├── ConfirmModal.js
│   │   ├── FormModal.js
│   │   ├── ContentModal.js
│   │   ├── WizardModal.js
│   │   ├── ChatModal.js
│   │   ├── AgentModal.js
│   │   └── PreviewModal.js
│   └── utils/
│       ├── markdown.js         # Shared markdown parser
│       ├── sanitize.js         # XSS protection
│       └── position.js         # Positioning utilities

public/css/
├── modal-service.css           # All modal styles (single file)
```

---

## Migration Plan

### Phase 1: Build Core (Week 1)
1. Create ModalService singleton
2. Create ModalBase with mixins
3. Create AlertModal and ConfirmModal
4. Create base CSS

### Phase 2: Replace Simple Modals (Week 2)
1. Create FormModal
2. Create PreviewModal
3. Migrate inline modals in HTML files
4. Remove ModalManager.js

### Phase 3: Content & Wizard (Week 3)
1. Create ContentModal
2. Create WizardModal
3. Migrate HelpModal usages
4. Migrate OnboardingWizard
5. Remove help-modal.js, onboarding-wizard.js

### Phase 4: Chat & Agent (Week 4)
1. Create ChatModal with full chat.js features
2. Create AgentModal extending ChatModal
3. Migrate AgentDialogService usages
4. Add "Run in Modal" button to Agent Library
5. Remove agent-dialog-service.js

### Phase 5: Cleanup (Week 5)
1. Remove old CSS files
2. Update documentation
3. Add unit tests
4. Performance optimization

---

## Usage Examples

### Quick Alert
```javascript
await modalService.alert({
    title: 'Success',
    message: 'Agent saved successfully!'
});
```

### Confirmation with Danger
```javascript
const confirmed = await modalService.confirm({
    title: 'Delete Agent',
    type: 'danger',
    message: 'This cannot be undone.',
    confirmText: 'Delete'
});
if (confirmed) {
    await deleteAgent(id);
}
```

### Form Dialog
```javascript
const result = await modalService.form({
    title: 'Edit Agent',
    fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, value: agent.name },
        { name: 'prompt', label: 'System Prompt', type: 'textarea', value: agent.prompt }
    ]
});
if (result) {
    await updateAgent(id, result);
}
```

### Launch Agent in Modal
```javascript
// From Agent Library card
function runAgentInModal(agentId) {
    modalService.agent({
        agentId,
        onClose: (conversation) => {
            // Optionally save conversation
            console.log('Session ended with', conversation.messages.length, 'messages');
        }
    });
}

// Button in agent card
<button onclick="runAgentInModal('${agent.id}')">
    <i data-lucide="play"></i> Run
</button>
```

### Help Content
```javascript
modalService.content({
    title: 'Workflow Builder Guide',
    loadUrl: '/help/workflows.md',
    contentType: 'markdown',
    maximizable: true
});
```

---

## Events

All modals emit standardized events:

| Event | Data | Description |
|-------|------|-------------|
| `open` | `{ modal }` | Modal opened |
| `close` | `{ modal, reason }` | Modal closed |
| `beforeClose` | `{ modal, preventDefault }` | Before close (cancelable) |
| `resize` | `{ modal, width, height }` | Modal resized |
| `dragEnd` | `{ modal, x, y }` | Drag completed |
| `maximize` | `{ modal }` | Modal maximized |
| `restore` | `{ modal }` | Modal restored from maximize |

ChatModal/AgentModal additional events:

| Event | Data | Description |
|-------|------|-------------|
| `messageSent` | `{ content, files }` | User sent message |
| `messageReceived` | `{ content, role }` | Response received |
| `streamStart` | `{ }` | Streaming started |
| `streamEnd` | `{ fullContent }` | Streaming ended |
| `modelChange` | `{ model }` | Model changed |
| `error` | `{ error }` | Error occurred |

---

## Configuration

### Global Defaults

```javascript
// Set global defaults
modalService.configure({
    animation: 'fade-scale',
    animationDuration: 200,
    closeOnOverlay: true,
    closeOnEscape: true,
    trapFocus: true,
    defaultWidth: 500,
    defaultHeight: 'auto'
});
```

### Per-Modal Override

```javascript
modalService.alert({
    animation: 'none',          // Override for this modal
    closeOnEscape: false
});
```

---

## Accessibility

- **Focus trap**: Tab cycles within modal
- **Escape key**: Closes modal (configurable)
- **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Focus management**: Focus first focusable element on open, restore on close
- **Screen reader**: Announce modal open/close

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## Next Steps

1. Review and approve architecture
2. Create implementation plan with task breakdown
3. Begin Phase 1 implementation
4. Set up testing framework for modals

---

*This architecture document serves as the specification for the unified ModalService implementation.*

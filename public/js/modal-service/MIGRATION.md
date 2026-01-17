# ModalService Migration Guide

This guide helps you migrate from legacy modal implementations to the new unified ModalService.

## Quick Start

Include the ModalService loader in your HTML:

```html
<script src="/js/modal-service/loader.js" data-auto-load></script>
```

Or load dynamically:

```javascript
await ModalServiceLoader.load();
```

## Migration Map

### Legacy: `alert()` / `window.alert()`
```javascript
// Before
alert('Something happened');

// After
await ModalService.alert({
    title: 'Alert',
    message: 'Something happened'
});

// Or use shortcuts
await ModalService.info('Something happened');
await ModalService.success('Operation completed!');
await ModalService.warning('Be careful!');
await ModalService.error('Something went wrong');
```

### Legacy: `confirm()` / `window.confirm()`
```javascript
// Before
if (confirm('Are you sure?')) {
    doSomething();
}

// After
const confirmed = await ModalService.confirm({
    title: 'Confirm',
    message: 'Are you sure?'
});
if (confirmed) {
    doSomething();
}

// Danger confirmation
const confirmed = await ModalService.confirmDanger('Delete this item?', 'Delete Item');
```

### Legacy: `prompt()` / `window.prompt()`
```javascript
// Before
const name = prompt('Enter your name:', 'Default');

// After
const name = await ModalService.prompt({
    title: 'Enter Name',
    message: 'Enter your name:',
    defaultValue: 'Default'
});
```

## Migrating from ModalManager

The legacy `ModalManager` provided drag and resize functionality. Replace with:

```javascript
// Before (ModalManager)
const modal = new ModalManager({
    containerId: 'my-modal',
    minWidth: 400,
    minHeight: 300
});
modal.init();
modal.open();

// After (ModalService)
const modal = ModalService.create({
    title: 'My Modal',
    content: '<div>Modal content</div>',
    draggable: true,
    resizable: true,
    width: 400,
    height: 300
});
modal.open();
```

## Migrating from HelpModal

Replace the `HelpModal` IIFE with `ContentModal`:

```javascript
// Before (HelpModal)
HelpModal.init();
HelpModal.open('path/to/help.md', 'Help Topic');

// After (ModalService)
const content = await fetch('path/to/help.md').then(r => r.text());
const modal = ModalService.content({
    title: 'Help Topic',
    content: content,
    contentType: 'markdown',
    maximizable: true
});
modal.open();
```

## Migrating from AgentDialogService

Replace `AgentDialogService` with `AgentModal`:

```javascript
// Before (AgentDialogService)
const dialog = new AgentDialogService({
    containerId: 'agent-dialog',
    minWidth: 400
});
const result = await dialog.runAgent('agent-123', context, {
    title: 'AI Agent',
    subtitle: 'Assessment',
    onAccept: (result) => saveResult(result)
});

// After (ModalService)
const modal = ModalService.agent({
    title: 'AI Agent',
    agentName: 'Assessment Agent',
    agentDescription: 'Assessment',
    modelSelector: true,
    models: [
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' }
    ],
    defaultModel: 'claude-sonnet-4-5-20250929',
    onSubmit: async (message) => {
        return await callAgentAPI(message);
    }
});
modal.open();
```

## Migrating Inline Modals

Replace inline modal HTML with ModalService calls:

```html
<!-- Before: Inline modal HTML -->
<div class="add-context-modal" id="addContextModal">
    <div class="modal-content">
        <!-- ... modal content ... -->
    </div>
</div>

<script>
function openModal() {
    document.getElementById('addContextModal').classList.add('active');
}
</script>
```

```javascript
// After: ModalService
async function openModal() {
    const result = await ModalService.form({
        title: 'Add Context',
        fields: [
            {
                type: 'select',
                name: 'mode',
                label: 'Injection Mode',
                options: [
                    { value: 'always', label: 'Always' },
                    { value: 'on_demand', label: 'On Demand' }
                ]
            },
            {
                type: 'checkbox-group',
                name: 'assets',
                label: 'Select Assets',
                options: availableAssets.map(a => ({
                    value: a.id,
                    label: a.name,
                    description: a.type
                }))
            }
        ]
    });

    if (result) {
        // Handle form submission
        await addAssets(result.assets, result.mode);
    }
}
```

## Field Type Reference

FormModal supports these field types:

| Type | Description | Options |
|------|-------------|---------|
| `text` | Single line text input | `placeholder`, `pattern`, `required` |
| `password` | Password input | `placeholder`, `required` |
| `email` | Email input | `placeholder`, `required` |
| `number` | Numeric input | `min`, `max`, `step`, `required` |
| `textarea` | Multi-line text | `rows`, `placeholder`, `required` |
| `select` | Dropdown select | `options`, `placeholder`, `required` |
| `checkbox` | Single checkbox | `required` |
| `radio` | Radio button group | `options`, `required` |
| `checkbox-group` | Multiple checkboxes | `options` (with `value`, `label`, `description`) |
| `avatar` | Avatar picker with upload | `avatars` (predefined options) |

## Toast Notifications

Replace inline toasts with ModalService:

```javascript
// Before
showToast('Success!', 'success');

// After
ModalService.toast({
    message: 'Success!',
    type: 'success',  // info, success, warning, error
    duration: 3000
});
```

## Loading States

```javascript
// Show loading modal
const loading = ModalService.loading({ message: 'Processing...' });

// Do work
await doAsyncWork();

// Close loading
loading.close();
```

## Event Handling

```javascript
const modal = ModalService.create({
    title: 'Events Demo',
    content: '<div>Content</div>'
});

// Listen to events
modal.on('open', () => console.log('Modal opened'));
modal.on('close', (result) => console.log('Modal closed', result));
modal.on('maximize', () => console.log('Maximized'));
modal.on('restore', () => console.log('Restored'));
modal.on('drag', ({ x, y }) => console.log('Dragged to', x, y));
modal.on('resize', ({ width, height }) => console.log('Resized to', width, height));
```

## Stacking & Z-Index

ModalService automatically handles z-index stacking:

```javascript
// Open multiple modals - they stack automatically
const modal1 = ModalService.create({ title: 'First' });
const modal2 = ModalService.create({ title: 'Second' });
const modal3 = ModalService.create({ title: 'Third' });

modal1.open();
modal2.open();
modal3.open();

// Click any modal to bring to front
// Use ModalService.closeAll() to close all
```

## Files to Remove After Migration

Once all pages are migrated, these legacy files can be deprecated:

- `/public/js/modal-manager.js` - Legacy drag/resize modal
- `/public/js/help-modal.js` - Legacy help modal
- `/public/js/agent-dialog-service.js` - Legacy agent dialog
- `/public/js/onboarding-wizard.js` - Consider keeping or migrating

## Testing

After migration, test your page at:
- `/modal-test.html` - Comprehensive modal tests
- `/admin-icons.html` - Lucide icons browser

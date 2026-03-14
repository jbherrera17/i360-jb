# Insight 360 Blueprint v2.21

**Version:** 2.21
**Date:** December 30, 2025
**Status:** Phase 6.1 | Chat UX Enhancements

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.21

### Chat UX Enhancements

This release focuses on improving the Multi-LLM Chat experience with better file handling, visual polish, and consistent panel resizing across the application.

### Multimodal File Upload Support
- **PDF Document Support** — Upload and analyze PDF documents with Claude
- **Image Support** — Attach images (PNG, JPG, GIF, WebP) for visual analysis
- **Text File Support** — Include text files (.txt, .md, .csv) in conversations
- **File Preview** — See attached files before sending with remove option
- **Processing Feedback** — Status indicator during file processing

### Rotating Loading Messages
- **Engaging Wait Experience** — Rotating motivational messages during AI response generation
- **Smooth Transitions** — Fade animations between messages
- **Configurable Presets** — Chat-specific message sets
- **Graceful Cleanup** — Messages stop on response, error, or completion

### Chat Welcome Screen Update
- **Higgins Avatar** — Updated welcome icon with Higgins02.svg branding
- **New Introduction** — "Welcome! I'm Higgins, your guide to the world's leading AI system for SMBs"
- **Engaging Description** — "Engage with the smartest language models, switch between AI engines, and discover answers from different perspectives."
- **Quick Actions** — Functional prompt starter buttons (Explain, Code, Analyze, Search)

### Context Assets Preview Enhancement
- **Markdown Rendering** — Preview panel now renders markdown formatting
- **Headers** — H1, H2, H3 support
- **Text Formatting** — Bold, italic, inline code
- **Links** — Clickable links open in new tab
- **Clean Typography** — Proper spacing and styling

### Resizable Panels
- **Context Assets Page** — Both left (Asset List) and right (Preview) panels resizable
- **Chat History Panel** — Right panel resize with drag handle
- **localStorage Persistence** — Panel widths saved across sessions
- **Consistent Pattern** — Same resize UX as Agents page

---

## Technical Implementation

### File Upload Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FILE UPLOAD PIPELINE                            │
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ File Input   │───▶│ FileReader   │───▶│ Base64 Encoding      │  │
│  │ (onChange)   │    │ (readAsDataURL)│   │ (split data prefix)  │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                  │                   │
│                                                  ▼                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                   buildMultimodalContent()                      │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │ Images     → { type: 'image', source: { base64 } }      │   │ │
│  │  │ PDFs       → { type: 'document', source: { base64 } }   │   │ │
│  │  │ Text/CSV   → { type: 'text', text: decoded content }    │   │ │
│  │  │ Other      → { type: 'text', text: file reference }     │   │ │
│  │  └─────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                  │                   │
│                                                  ▼                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Backend Processing                          │ │
│  │  extractMessageContent() → { text, images[], documents[] }     │ │
│  │  normalizeHistoryMessages() → text-only for continuity         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                  │                   │
│                                                  ▼                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                     Claude API Request                          │ │
│  │  buildMessages() → content[] with document blocks for PDFs     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Loading Messages System

```javascript
// LoadingMessages API
const controller = LoadingMessages.start(element, {
    preset: 'chat',    // Message set
    interval: 2500     // Rotation interval (ms)
});

// Stops and cleans up
controller.stop();

// Presets available:
// - 'chat': Conversational messages for AI responses
// - 'analysis': For document/data analysis
// - 'search': For web search operations
```

### Panel Resize Pattern

```javascript
// Standard panel resize implementation
function initPanelResize() {
    const panel = document.querySelector('.panel');
    const handle = document.getElementById('resizeHandle');

    let isResizing = false;
    let startX, startWidth;

    // Restore saved width
    const saved = localStorage.getItem('panelWidth');
    if (saved) panel.style.width = saved + 'px';

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = panel.offsetWidth;
        handle.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const delta = e.clientX - startX;
        const newWidth = Math.max(MIN, Math.min(MAX, startWidth + delta));
        panel.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            handle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem('panelWidth', panel.offsetWidth);
        }
    });
}
```

---

## Files Modified

### Frontend
| File | Changes |
|------|---------|
| `public/chat.html` | Higgins welcome screen, panel resize, loading styles |
| `public/js/chat.js` | File upload processing, loading messages, multimodal content |
| `public/js/loading-messages.js` | New file - rotating loading message system |
| `public/context.html` | Dual panel resize, markdown preview styles |
| `public/js/context.js` | Markdown rendering function |
| `public/css/styles.css` | Welcome icon sizing, Higgins avatar |
| `public/css/loading-spinner.css` | Rotating text animations |

### Backend
| File | Changes |
|------|---------|
| `server/routes/chat.js` | extractMessageContent, normalizeHistoryMessages |
| `server/services/anthropic.js` | PDF document block support in buildMessages |

### Assets
| File | Purpose |
|------|---------|
| `public/assets/Higgins02.svg` | Chat welcome screen avatar |
| `public/assets/25-08-20 - Higgins Mona Lisa Smile-T.png` | Chat message avatar |

---

## API Reference

### Chat Endpoints (Updated)

#### POST /api/chat/stream
Stream a message response with multimodal support.

**Request Body:**
```json
{
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": "base64-encoded-pdf..."
                    }
                },
                {
                    "type": "text",
                    "text": "Summarize this document"
                }
            ]
        }
    ],
    "model": "claude-sonnet-4-5-20250929"
}
```

**SSE Response:**
```
data: {"type": "content", "text": "The document..."}
data: {"type": "content", "text": " discusses..."}
data: {"type": "done", "usage": {"input_tokens": 1500, "output_tokens": 200}}
data: [DONE]
```

---

## Development Progress

### Completed
- [x] Phase 1: Foundation (Agents, Context, Actions, Chat)
- [x] Phase 2: Integrity Metrics & Security
- [x] Phase 3: Multi-Agent Orchestration
- [x] Phase 4: Parthenon Action Framework (OKRs)
- [x] Phase 5: Strategy-to-Execution (S2E) Module
- [x] Phase 5.1: S2E Service Layer & Governance
- [x] Phase 6: Daily Briefing & Workflows
- [x] **Phase 6.1: Chat UX Enhancements** ← Current

### In Progress
- [ ] Phase 7: Advanced Agent Workflows
- [ ] Voice Input/Output Integration
- [ ] Real-time Collaboration Features

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 2.21 | 2025-12-30 | Chat UX Enhancements & Panel Resizing |
| 2.20 | 2025-12-30 | S2E Enhancement with Governance & Parthenon Integration |
| 2.19 | 2025-12-29 | Daily Briefing & Workflows (Phase 6) |
| 2.18 | 2025-12-28 | Strategy-to-Execution Module |
| 2.17 | 2025-12-28 | Parthenon & Skills Integration |
| 2.16 | 2025-12-28 | Multi-Agent Orchestration |

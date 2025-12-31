# Insight 360 Blueprint v2.22

**Version:** 2.22
**Date:** December 30, 2025
**Status:** Phase 6.3 | OpenAI SDK v6.x Update & Model Capabilities UI

---

## Executive Summary

Insight 360 is a **Values-Based AI Ecosystem** — a personal AI command center that aligns automated systems with organizational ethics. The platform combines multi-LLM capabilities with structured context assets to power intelligent agents that understand your business identity, voice, and values.

**Core Philosophy:** *"Technology should augment human brilliance—not replace it."*

---

## What's New in v2.22

### OpenAI SDK v6.x Upgrade

This release brings full support for OpenAI's latest GPT-5.2 model family and the newest OpenAI SDK, ensuring compatibility with cutting-edge AI capabilities.

### GPT-5.2 Model Family Support
- **GPT-5.2 Thinking** — Best for structured work like coding and planning (400K context)
- **GPT-5.2 Instant** — Faster at writing and information seeking
- **GPT-5.2 Pro** — Most accurate answers for difficult questions
- **API Compatibility** — Uses `max_completion_tokens` parameter for GPT-5.x and o1 models

### GPT Image 1.5 Support
- **Latest Image Generation** — Better instruction-following, 4x faster generation
- **Multiple Sizes** — 1024x1024, 1024x1792, 1792x1024
- **Quality Options** — Standard and HD
- **Style Options** — Vivid and Natural

### Model Capabilities UI
- **Capability Badges** — Visual indicators next to selected model showing supported features
- **Custom Tooltips** — Hover over badges for detailed descriptions
- **Dynamic Updates** — Badges update when switching between models

### Capability Icons
| Icon | Capability | Description |
|------|------------|-------------|
| 👁️ | Vision | Analyzes images |
| 📄 | PDF | Reads documents |
| 🎤 | Audio | Voice input/output |
| 🖼️ | Image Generation | DALL-E / GPT Image |
| 🧠 | Advanced Reasoning | Complex analysis |

---

## Technical Implementation

### Token Parameter Handling

GPT-5.x and o1 models require `max_completion_tokens` instead of `max_tokens`:

```javascript
// GPT-5.x and o-series use max_completion_tokens, others use max_tokens
const tokenLimit = Math.min(maxTokens, modelInfo.maxTokens || 16384);
if (resolvedModel.startsWith('gpt-5') || resolvedModel.startsWith('o1')) {
    requestParams.max_completion_tokens = tokenLimit;
} else {
    requestParams.max_tokens = tokenLimit;
}
```

### Model Configuration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODEL CAPABILITIES SYSTEM                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    OPENAI_MODELS (Service)                    │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ gpt-5.2:                                                │ │   │
│  │  │   - name: 'GPT-5.2 Thinking'                            │ │   │
│  │  │   - maxTokens: 128000                                   │ │   │
│  │  │   - contextWindow: 400000                               │ │   │
│  │  │   - vision: true, reasoning: true                       │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  CHAT ROUTE (/api/chat/models)                │   │
│  │  - Returns models with capability flags                       │   │
│  │  - Includes imageModels for DALL-E / GPT Image               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    CHAT UI (Frontend)                         │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ modelCapabilities = {}  // Stored on load               │ │   │
│  │  │ updateModelIndicator()  // Renders capability badges    │ │   │
│  │  │                                                         │ │   │
│  │  │ <span class="cap-badge" data-tooltip="Vision">👁️</span> │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Available OpenAI Models (December 2025)

| Model ID | Name | Tier | Context | Capabilities |
|----------|------|------|---------|--------------|
| gpt-5.2 | GPT-5.2 Thinking | Flagship | 400K | Vision, Reasoning |
| gpt-5.2-chat-latest | GPT-5.2 Instant | Flagship | 400K | Vision |
| gpt-5.2-pro | GPT-5.2 Pro | Premium | 400K | Vision, Reasoning |
| gpt-4o | GPT-4o | Standard | 128K | Vision, Audio |
| gpt-4o-mini | GPT-4o Mini | Efficient | 128K | Vision |
| o1 | o1 | Reasoning | 200K | Vision, Reasoning |
| o1-mini | o1-mini | Reasoning | 128K | Reasoning |
| gpt-4-turbo | GPT-4 Turbo | Legacy | 128K | Vision |

### Image Generation Models

| Model ID | Name | Tier | Sizes |
|----------|------|------|-------|
| gpt-image-1.5 | GPT Image 1.5 | Flagship | 1024x1024, 1024x1792, 1792x1024 |
| dall-e-3 | DALL-E 3 | Premium | 1024x1024, 1024x1792, 1792x1024 |
| dall-e-2 | DALL-E 2 | Standard | 256x256, 512x512, 1024x1024 |

---

## File Changes

### Modified Files
- `package.json` — Updated openai dependency to ^6.15.0
- `server/services/openai.js` — Added GPT-5.2 models, image generation, token handling
- `server/routes/chat.js` — Updated model list with capabilities, fixed model IDs
- `public/js/chat.js` — Added capability badges UI with custom tooltips

### Documentation
- Moved all user guides to `documentation/guides/` folder

---

## API Reference

### Image Generation

```javascript
const openai = require('./services/openai');

// Generate image with DALL-E 3
const result = await openai.generateImage('A sunset over mountains', {
    model: 'dall-e-3',      // or 'gpt-image-1.5', 'dall-e-2'
    size: '1024x1024',      // Model-specific sizes
    quality: 'hd',          // 'standard' or 'hd'
    style: 'vivid',         // 'vivid' or 'natural'
    responseFormat: 'url'   // 'url' or 'base64'
});

console.log(result.images[0].url);
```

### Chat with GPT-5.2

```javascript
const response = await openai.chat({
    message: 'Explain quantum computing',
    model: 'gpt-5.2',
    maxTokens: 4096
});
// Automatically uses max_completion_tokens for GPT-5.x
```

---

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=sk-...           # Required for OpenAI models
ANTHROPIC_API_KEY=sk-ant-...    # Required for Claude models
```

---

## Next Steps

- [ ] Add image generation UI to chat interface
- [ ] Implement voice input/output for audio-capable models
- [ ] Add model cost estimation display
- [ ] Create model comparison view

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| v2.22 | Dec 30, 2025 | OpenAI SDK v6.x, GPT-5.2 support, model capabilities UI |
| v2.21 | Dec 30, 2025 | Chat UX enhancements, file upload, rotating messages |
| v2.20 | Dec 29, 2025 | Help modal system, user guides, three-panel layout |

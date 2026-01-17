# Adding a New LLM Provider to Insight 360

This document outlines the complete process for integrating a new LLM provider into the Insight 360 platform.

## Overview

Adding a new LLM provider requires updates across multiple layers:
1. **Service Layer** - API wrapper with reliability features
2. **Registry** - Model definitions and capabilities
3. **Routes** - Chat and agent execution endpoints
4. **Health & Availability** - Monitoring and status checks
5. **Frontend** - Dashboard cards and model selectors

---

## Phase 1: Service Layer

### 1.1 Create Provider Service File

Create `server/services/{provider}.js` with:

```javascript
/**
 * {Provider} Service - Insight 360
 * Wrapper for {Provider}'s API
 */

const { withRetry, CircuitBreaker } = require('./reliability');
const logger = require('./logger');

// API configuration
const BASE_URL = 'https://api.{provider}.com/v1';

// Circuit breaker
const circuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 30000
});

// API key storage
let apiKey = null;

// Model definitions
const MODELS = {
    'model-id': {
        name: 'Model Display Name',
        provider: '{provider}',
        description: 'Model description',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['vision', 'tool_use', 'reasoning'],
        tier: 'standard',  // premium, standard, fast, experimental
        default: true      // Mark one as default
    }
};

function initialize(key) {
    if (!key) throw new Error('{Provider} API key is required');
    apiKey = key;
    logger.info('{Provider} initialized with reliability features');
}

function isInitialized() {
    return !!apiKey;
}

function getModels() {
    return Object.entries(MODELS).map(([id, model]) => ({ id, ...model }));
}

async function chat(options) {
    // Implement non-streaming chat
}

async function* streamChat(options) {
    // Implement streaming chat (generator function)
}

module.exports = {
    initialize,
    isInitialized,
    getModels,
    chat,
    streamChat,
    MODELS
};
```

### 1.2 Required Functions

| Function | Purpose |
|----------|---------|
| `initialize(key)` | Store API key, initialize client |
| `isInitialized()` | Check if service is ready |
| `getModels()` | Return array of available models |
| `chat(options)` | Non-streaming completion |
| `streamChat(options)` | Streaming completion (async generator) |

### 1.3 Chat Options Interface

```javascript
{
    message: string,      // User message
    model: string,        // Model ID
    systemPrompt: string, // System prompt
    history: array,       // Previous messages [{role, content}]
    images: array,        // For vision models [{data, mediaType}]
    maxTokens: number,    // Max output tokens
    temperature: number   // 0-1 creativity
}
```

### 1.4 Response Format

```javascript
// Non-streaming
{
    content: string,
    model: string,
    usage: { promptTokens, completionTokens, totalTokens },
    finishReason: string
}

// Streaming yields
{ type: 'text', content: string }
{ type: 'done', content: string, usage: object }
{ type: 'error', error: string }
```

---

## Phase 2: LLM Registry

### 2.1 Update `server/services/llmRegistry.js`

Add model definitions:

```javascript
const {PROVIDER}_MODELS = {
    'model-id': {
        name: 'Model Name',
        provider: '{provider}',
        description: 'Description',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: ['vision', 'tool_use'],
        tier: 'standard',
        default: true
    }
};
```

### 2.2 Update Combined Registry

```javascript
const ALL_MODELS = {
    ...ANTHROPIC_MODELS,
    ...OPENAI_MODELS,
    ...PERPLEXITY_MODELS,
    ...{PROVIDER}_MODELS  // Add new provider
};
```

### 2.3 Update Helper Functions

1. **`getModelsByProvider()`** - Add case for new provider
2. **`getProvider()`** - Add model prefix detection
3. **`getAvailableModels()`** - Add provider section with API key check
4. **`getAllChatModels()`** - Add provider iteration

---

## Phase 3: Chat Routes

### 3.1 Update `server/routes/chat.js`

Import and initialize:
```javascript
const {provider} = require('../services/{provider}');

if (process.env.{PROVIDER}_API_KEY) {
    {provider}.initialize(process.env.{PROVIDER}_API_KEY);
}
```

Update `/models` endpoint:
```javascript
const apiKeys = {
    // ... existing
    {provider}: !!process.env.{PROVIDER}_API_KEY
};
```

Add provider cases in chat handlers:
```javascript
} else if (provider === '{provider}') {
    response = await {provider}.chat({ ... });
}

// For streaming:
} else if (provider === '{provider}') {
    stream = {provider}.streamChat({ ... });
}
```

---

## Phase 4: Agent Service

### 4.1 Update `server/services/agentService.js`

Import service:
```javascript
const {provider} = require('./{provider}');
```

Initialize:
```javascript
if (process.env.{PROVIDER}_API_KEY) {
    {provider}.initialize(process.env.{PROVIDER}_API_KEY);
}
```

Add execution function:
```javascript
async function executeWith{Provider}(agent, systemPrompt, messages) {
    // Convert messages to provider format
    // Call {provider}.chat()
    // Return standardized response
}
```

Add streaming function:
```javascript
async function streamWith{Provider}(agent, systemPrompt, messages, onToken) {
    // Convert messages to provider format
    // Iterate {provider}.streamChat()
    // Call onToken() for each chunk
    // Return final metadata
}
```

Update switch statements in `executeAgent()` and `streamAgent()`:
```javascript
case '{provider}':
    result = await executeWith{Provider}(agent, systemPrompt, messages);
    break;
```

Update model override detection:
```javascript
} else if (modelOverride.startsWith('{model-prefix}')) {
    effectiveProvider = '{provider}';
}
```

---

## Phase 5: Health Checks

### 5.1 Update `server/routes/health.js`

Add to services object:
```javascript
const services = {
    // ... existing
    {provider}: false
};

if (process.env.{PROVIDER}_API_KEY) {
    services.{provider} = true;
}
```

Add to externalApis in detailed health:
```javascript
health.externalApis = {
    // ... existing
    {provider}: !!process.env.{PROVIDER}_API_KEY
};
```

### 5.2 Update `server/services/modelAvailabilityService.js`

Add API key variable:
```javascript
let {provider}ApiKey = null;
```

Initialize in `initializeClients()`:
```javascript
if (process.env.{PROVIDER}_API_KEY) {
    {provider}ApiKey = process.env.{PROVIDER}_API_KEY;
}
```

Add availability check function:
```javascript
async function check{Provider}Availability() {
    if (!{provider}ApiKey) {
        return {
            provider: '{provider}',
            status: 'unavailable',
            error_message: 'API key not configured',
            response_time_ms: 0
        };
    }

    const startTime = Date.now();

    try {
        // Make minimal API call (1 token)
        const response = await fetch('{API_ENDPOINT}', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${​{provider}ApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: '{cheapest-model}',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hi' }]
            })
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            // Handle error statuses
            return { provider: '{provider}', status: 'unavailable', ... };
        }

        return {
            provider: '{provider}',
            status: 'available',
            error_message: null,
            response_time_ms: responseTime
        };
    } catch (error) {
        return {
            provider: '{provider}',
            status: 'unavailable',
            error_message: error.message,
            response_time_ms: Date.now() - startTime
        };
    }
}
```

Add to `checkAllProviders()`:
```javascript
const results = await Promise.all([
    // ... existing
    check{Provider}Availability()
]);
```

---

## Phase 6: Frontend Updates

### 6.1 Update `public/js/dashboard.js`

Add to all `providerConfig` objects (there are 3):
```javascript
{provider}: { name: '{Provider Name}', icon: '🔮' }
```

Add tier class if needed:
```javascript
const tierClasses = {
    // ... existing
    '{new-tier}': 'tier-{new-tier}'
};
```

### 6.2 Update `public/system-health.html`

Add provider section:
```html
<!-- {Provider} Section -->
<div class="provider-section">
    <div class="provider-header">
        <span class="provider-icon">🔮</span>
        <h3>{Provider Name}</h3>
        <span id="{provider}Status" class="status-badge">Checking...</span>
    </div>
    <div class="models-grid" id="{provider}Models">
        <!-- Model cards -->
        <div class="model-card">
            <div class="model-header">
                <span class="model-name">Model Name</span>
                <span class="model-tier tier-standard">STANDARD</span>
            </div>
            <p class="model-description">Description</p>
            <div class="model-capabilities">
                <span class="capability">vision</span>
            </div>
        </div>
    </div>
</div>
```

Update JavaScript providerMap:
```javascript
const providerMap = {
    // ... existing
    '{provider}': '{provider}Status'
};
```

### 6.3 Update CSS (if new tier)

Add to `public/css/dashboard-styles.css`:
```css
.tier-{new-tier} {
    background: rgba(R, G, B, 0.2);
    color: #RRGGBB;
}
```

Add to `public/css/theme.css`:
```css
.model-tier.tier-{new-tier} {
    background: rgba(R, G, B, 0.15);
    color: #RRGGBB;
}
```

---

## Phase 7: Environment Configuration

### 7.1 Update `.env.example`

```bash
# {Provider} Configuration
{PROVIDER}_API_KEY=your-api-key-here
```

### 7.2 Update Documentation

Add to `docs/SETUP.md`:
- API key acquisition instructions
- Configuration steps
- Available models

---

## Checklist

### Service Layer
- [ ] Create `server/services/{provider}.js`
- [ ] Implement `initialize()`, `isInitialized()`, `getModels()`
- [ ] Implement `chat()` with retry and circuit breaker
- [ ] Implement `streamChat()` as async generator
- [ ] Define all models with capabilities and tiers

### Registry
- [ ] Add models to `server/services/llmRegistry.js`
- [ ] Update `ALL_MODELS` combined registry
- [ ] Update `getModelsByProvider()`
- [ ] Update `getProvider()` for model detection
- [ ] Update `getAvailableModels()` with API key check
- [ ] Update `getAllChatModels()`

### Routes
- [ ] Import and initialize in `server/routes/chat.js`
- [ ] Add to `/models` API key checks
- [ ] Add provider cases in non-streaming chat
- [ ] Add provider cases in streaming chat
- [ ] Add provider cases in agent chat

### Agent Service
- [ ] Import in `server/services/agentService.js`
- [ ] Initialize with API key
- [ ] Add `executeWith{Provider}()` function
- [ ] Add `streamWith{Provider}()` function
- [ ] Update switch in `executeAgent()`
- [ ] Update switch in `streamAgent()`
- [ ] Update model override detection

### Health & Availability
- [ ] Add to services in `server/routes/health.js`
- [ ] Add to externalApis in detailed health
- [ ] Add API key variable in `modelAvailabilityService.js`
- [ ] Add `check{Provider}Availability()` function
- [ ] Add to `checkAllProviders()` Promise.all

### Frontend
- [ ] Add to providerConfig in `public/js/dashboard.js` (3 places)
- [ ] Add tier class if new tier needed
- [ ] Add section to `public/system-health.html`
- [ ] Update providerMap in system-health.html JS
- [ ] Add CSS for new tiers if needed

### Configuration
- [ ] Add to `.env.example`
- [ ] Update setup documentation

---

## Testing

1. **Service Test**: Call `{provider}.chat()` directly
2. **API Test**: `curl http://localhost:3000/api/chat/models`
3. **Health Test**: `curl http://localhost:3000/api/health`
4. **Availability Test**: `curl -X POST http://localhost:3000/api/models/availability/check`
5. **Chat Test**: Send message via UI with new provider model
6. **Agent Test**: Create agent with new provider, execute
7. **Streaming Test**: Verify real-time token streaming

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Model not in dropdown | Missing from `getAvailableModels()` | Add API key check and model mapping |
| Agent stuck on "Thinking" | Missing case in agentService | Add provider case to switch statements |
| Health shows unavailable | Wrong model in availability check | Use cheapest/most stable model |
| Streaming not working | Generator not yielding correctly | Check async generator syntax |
| Provider shows offline | API key not loaded | Check env variable name |

---

## Example: Adding Gemini

Files modified:
1. `server/services/gemini.js` (new)
2. `server/services/llmRegistry.js`
3. `server/services/agentService.js`
4. `server/services/modelAvailabilityService.js`
5. `server/routes/chat.js`
6. `server/routes/health.js`
7. `public/js/dashboard.js`
8. `public/css/dashboard-styles.css`
9. `public/css/theme.css`
10. `public/system-health.html`

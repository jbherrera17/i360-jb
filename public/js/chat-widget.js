/**
 * Insight 360 — Embeddable Chat Widget
 * Phase 73: Public-facing chat widget for external websites
 *
 * Usage on host page:
 *   <script src="https://your-i360-domain/js/chat-widget.js"
 *           data-widget-id="UUID"
 *           data-token="HMAC_TOKEN"></script>
 *
 * Or programmatic:
 *   I360Widget.init({ widgetId: 'UUID', token: 'HMAC_TOKEN' });
 */

(function () {
    'use strict';

    // eslint-disable-next-line no-unused-vars
    const WIDGET_VERSION = '1.1.0';

    // ── Configuration ────────────────────────────────────────

    const defaults = {
        position: 'bottom-right',  // bottom-right | bottom-left
        width: '380px',
        height: '580px',
        zIndex: 999999
    };

    // ── State ────────────────────────────────────────────────

    let config = {};
    let widgetConfig = null;
    let sessionId = null;
    let sessionToken = null; // eslint-disable-line no-unused-vars
    let isOpen = false;
    let isInitialized = false;
    let container = null;
    let chatMessages = [];
    let userData = null;
    const eventHandlers = {};

    // ── API Helpers ──────────────────────────────────────────

    function getBaseUrl() {
        const script = document.querySelector('script[data-widget-id]');
        if (script) {
            const src = script.getAttribute('src');
            try {
                const url = new URL(src, window.location.origin);
                return url.origin;
            } catch (e) {
                // Fallback
            }
        }
        return config.baseUrl || window.location.origin;
    }

    async function apiCall(path, options = {}) {
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/chat/public/${config.widgetId}${path}`;

        const headers = {
            'Content-Type': 'application/json',
            'X-Widget-Token': config.token,
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(error.error || `API error: ${response.status}`);
        }
        return response;
    }

    // ── Widget Config Loading ────────────────────────────────

    async function loadConfig() {
        const baseUrl = getBaseUrl();
        const response = await fetch(
            `${baseUrl}/api/chat/public/${config.widgetId}/config`,
            { headers: { 'X-Widget-Token': config.token } }
        );
        if (!response.ok) throw new Error('Failed to load widget config');
        return response.json();
    }

    // ── Session Management ───────────────────────────────────

    async function createSession(formData = {}) {
        const response = await apiCall('/session', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        return response.json();
    }

    // ── Streaming Chat ───────────────────────────────────────

    async function sendMessage(message) {
        if (!sessionId) throw new Error('No active session');

        // Add user message to UI
        appendMessage('user', message);

        // Show typing indicator
        let typingEl = showTyping();

        try {
            const response = await apiCall('/stream', {
                method: 'POST',
                body: JSON.stringify({ session_id: sessionId, message })
            });

            // Parse SSE response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullResponse = '';
            let streamingMsgEl = null;

            for (;;) { // eslint-disable-line no-constant-condition
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.type === 'chunk') {
                            // Progressive streaming — append chunk to message
                            if (!streamingMsgEl) {
                                removeTyping(typingEl);
                                typingEl = null;
                                streamingMsgEl = document.createElement('div');
                                streamingMsgEl.className = 'i360-msg assistant';
                                document.getElementById('i360-messages').appendChild(streamingMsgEl);
                            }
                            fullResponse += data.content;
                            streamingMsgEl.innerHTML = escapeHtml(fullResponse)
                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                                .replace(/\n/g, '<br>');
                            document.getElementById('i360-messages').scrollTop = document.getElementById('i360-messages').scrollHeight;
                        } else if (data.type === 'text') {
                            fullResponse = data.content;
                        } else if (data.type === 'done') {
                            // Use the final filtered content from done event if available
                            if (data.content) fullResponse = data.content;
                        } else if (data.type === 'error') {
                            fullResponse = data.content;
                        }
                    } catch (e) {
                        // Skip malformed SSE lines
                    }
                }
            }

            // Remove typing indicator and show final response
            if (typingEl) removeTyping(typingEl);
            if (streamingMsgEl) {
                // Update streaming message with final filtered content + rich cards
                streamingMsgEl.innerHTML = formatRichContent(
                    escapeHtml(fullResponse)
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                        .replace(/\n/g, '<br>')
                );
                chatMessages.push({ role: 'assistant', content: fullResponse });
                saveSession();
                emitEvent('message', { role: 'assistant', content: fullResponse });
            } else if (fullResponse) {
                appendMessage('assistant', fullResponse);
            }
        } catch (error) {
            removeTyping(typingEl);
            appendMessage('assistant', 'I\'m temporarily unavailable. Please try again or contact us directly.');
            emitEvent('error', { type: 'message', message: error.message });
        }
    }

    // ── UI Rendering ─────────────────────────────────────────

    function createWidget() {
        const branding = widgetConfig.branding || {};
        const primaryColor = branding.primary_color || '#6366f1';
        const widgetName = widgetConfig.name || 'Chat';
        const avatarUrl = branding.avatar_url;
        const disclaimer = branding.disclaimer || 'This AI provides general information only.';

        // Create container
        container = document.createElement('div');
        container.id = 'i360-widget-container';
        container.innerHTML = `
            <style>
                #i360-widget-container {
                    position: fixed;
                    ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
                    bottom: 20px;
                    z-index: ${defaults.zIndex};
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                #i360-toggle-btn {
                    width: 60px; height: 60px;
                    border-radius: 50%;
                    background: ${primaryColor};
                    border: none;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                    transition: transform 0.2s;
                }
                #i360-toggle-btn:hover { transform: scale(1.1); }
                #i360-toggle-btn svg { width: 28px; height: 28px; fill: white; }
                #i360-chat-window {
                    display: none;
                    width: ${defaults.width}; height: ${defaults.height};
                    background: #fff;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    overflow: hidden;
                    flex-direction: column;
                    position: absolute;
                    bottom: 72px;
                    ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
                }
                #i360-chat-window.open { display: flex; }
                .i360-header {
                    background: ${primaryColor};
                    color: white;
                    padding: 16px;
                    display: flex; align-items: center; gap: 12px;
                }
                .i360-header-avatar {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                    background: rgba(255,255,255,0.2);
                }
                .i360-header-info h3 { margin: 0; font-size: 15px; font-weight: 600; }
                .i360-header-info p { margin: 2px 0 0; font-size: 12px; opacity: 0.85; }
                .i360-header-close {
                    margin-left: auto;
                    background: none; border: none; color: white;
                    cursor: pointer; font-size: 20px; padding: 4px;
                }
                .i360-messages {
                    flex: 1; overflow-y: auto;
                    padding: 16px;
                    display: flex; flex-direction: column; gap: 12px;
                }
                .i360-msg {
                    max-width: 85%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    white-space: pre-wrap;
                }
                .i360-msg.user {
                    background: ${primaryColor};
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 4px;
                }
                .i360-msg.assistant {
                    background: #f0f0f5;
                    color: #1a1a2e;
                    align-self: flex-start;
                    border-bottom-left-radius: 4px;
                }
                .i360-msg.system {
                    background: transparent;
                    color: #666;
                    font-size: 12px;
                    text-align: center;
                    align-self: center;
                    max-width: 95%;
                }
                .i360-typing {
                    display: flex; gap: 4px; padding: 10px 14px;
                    background: #f0f0f5; border-radius: 12px;
                    align-self: flex-start; width: fit-content;
                }
                .i360-typing span {
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: #999;
                    animation: i360-bounce 1.4s ease-in-out infinite;
                }
                .i360-typing span:nth-child(2) { animation-delay: 0.2s; }
                .i360-typing span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes i360-bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }
                .i360-input-area {
                    padding: 12px 16px;
                    border-top: 1px solid #e5e5e5;
                    display: flex; gap: 8px;
                }
                .i360-input {
                    flex: 1; border: 1px solid #ddd;
                    border-radius: 24px;
                    padding: 10px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .i360-input:focus { border-color: ${primaryColor}; }
                .i360-send-btn {
                    width: 40px; height: 40px;
                    border-radius: 50%;
                    background: ${primaryColor};
                    border: none; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    transition: opacity 0.2s;
                }
                .i360-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .i360-send-btn svg { width: 18px; height: 18px; fill: white; }
                .i360-disclaimer {
                    padding: 6px 16px;
                    font-size: 10px;
                    color: #999;
                    text-align: center;
                    background: #fafafa;
                    border-top: 1px solid #f0f0f0;
                }
                .i360-disclaimer a { color: #666; text-decoration: none; }
                .i360-disclaimer a:hover { text-decoration: underline; }
                .i360-branding {
                    padding: 4px 16px;
                    font-size: 9px;
                    color: #bbb;
                    text-align: center;
                    background: #fafafa;
                }
                .i360-branding a { color: #999; text-decoration: none; }
                .i360-branding a:hover { text-decoration: underline; }
                .i360-csat {
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-top: 1px solid #e5e5e5;
                    text-align: center;
                }
                .i360-csat p { margin: 0 0 8px; font-size: 13px; color: #555; }
                .i360-csat-stars { display: flex; justify-content: center; gap: 8px; }
                .i360-csat-star {
                    background: none; border: none; font-size: 24px;
                    cursor: pointer; opacity: 0.4; transition: opacity 0.2s, transform 0.2s;
                }
                .i360-csat-star:hover, .i360-csat-star.active { opacity: 1; transform: scale(1.2); }
                .i360-csat-thanks { font-size: 13px; color: #22c55e; }
                .i360-proactive-bubble {
                    position: absolute; bottom: 72px;
                    ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
                    background: white; color: #333;
                    padding: 12px 16px; border-radius: 12px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                    font-size: 14px; max-width: 260px;
                    animation: i360-fadeIn 0.3s;
                    cursor: pointer;
                }
                .i360-proactive-bubble::after {
                    content: ''; position: absolute; bottom: -8px;
                    ${config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
                    width: 16px; height: 16px; background: white;
                    transform: rotate(45deg);
                    box-shadow: 2px 2px 4px rgba(0,0,0,0.05);
                }
                @keyframes i360-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                /* Pre-chat form */
                .i360-prechat {
                    padding: 24px 20px;
                    flex: 1; display: flex; flex-direction: column; gap: 16px;
                    justify-content: center;
                }
                .i360-prechat h4 { margin: 0; font-size: 16px; color: #333; }
                .i360-prechat p { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }
                .i360-prechat label {
                    font-size: 13px; font-weight: 500; color: #444;
                    display: flex; flex-direction: column; gap: 4px;
                }
                .i360-prechat input[type="text"],
                .i360-prechat input[type="email"] {
                    padding: 10px 12px; border: 1px solid #ddd;
                    border-radius: 8px; font-size: 14px; outline: none;
                }
                .i360-prechat input:focus { border-color: ${primaryColor}; }
                .i360-consent-row {
                    display: flex; gap: 8px; align-items: flex-start;
                    font-size: 12px; color: #666;
                }
                .i360-consent-row input[type="checkbox"] { margin-top: 2px; }
                .i360-consent-row a { color: ${primaryColor}; }
                .i360-prechat-btn {
                    padding: 12px; border: none;
                    background: ${primaryColor}; color: white;
                    border-radius: 8px; font-size: 14px; font-weight: 600;
                    cursor: pointer; transition: opacity 0.2s;
                }
                .i360-prechat-btn:hover { opacity: 0.9; }
                .i360-prechat-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .i360-skip-btn {
                    background: none; border: none; color: #999;
                    font-size: 13px; cursor: pointer; text-decoration: underline;
                    align-self: center;
                }
                .i360-error { color: #dc2626; font-size: 12px; }
                /* Rich content cards (video + Calendly) */
                .i360-video-card {
                    display: flex; align-items: center; gap: 10px;
                    background: #f8f9fa; border: 1px solid #e5e5e5;
                    border-radius: 10px; padding: 10px 12px;
                    margin: 6px 0; text-decoration: none; color: inherit;
                    transition: background 0.15s;
                }
                .i360-video-card:hover { background: #eef0f4; }
                .i360-video-card-icon {
                    width: 40px; height: 40px; border-radius: 8px;
                    background: #1ab7ea; display: flex; align-items: center;
                    justify-content: center; flex-shrink: 0;
                }
                .i360-video-card-icon svg { width: 20px; height: 20px; fill: white; }
                .i360-video-card-text {
                    font-size: 13px; font-weight: 500; color: #333;
                    flex: 1; line-height: 1.3;
                }
                .i360-video-card-label {
                    font-size: 10px; color: #888; text-transform: uppercase;
                    letter-spacing: 0.5px; margin-top: 2px;
                }
                .i360-calendly-card {
                    display: flex; flex-direction: column; gap: 8px;
                    background: #f0f7ff; border: 1px solid #cce0ff;
                    border-radius: 10px; padding: 12px 14px;
                    margin: 6px 0;
                }
                .i360-calendly-card-header {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 14px; font-weight: 600; color: #1a5276;
                }
                .i360-calendly-card-header svg { width: 18px; height: 18px; fill: #1a5276; }
                .i360-calendly-card p { margin: 0; font-size: 12px; color: #555; }
                .i360-calendly-btn {
                    display: inline-block; padding: 8px 16px;
                    background: ${primaryColor}; color: white;
                    border: none; border-radius: 6px;
                    font-size: 13px; font-weight: 600;
                    cursor: pointer; text-decoration: none;
                    text-align: center; transition: opacity 0.15s;
                }
                .i360-calendly-btn:hover { opacity: 0.9; }
                /* Mobile responsive */
                @media (max-width: 480px) {
                    #i360-chat-window {
                        width: 100vw; height: 100vh;
                        border-radius: 0;
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                    }
                    #i360-toggle-btn { width: 52px; height: 52px; }
                }
            </style>

            <div id="i360-chat-window">
                <div class="i360-header">
                    ${avatarUrl ? `<img class="i360-header-avatar" src="${avatarUrl}" alt="${widgetName}">` : ''}
                    <div class="i360-header-info">
                        <h3>${widgetName}</h3>
                        <p>AI Assistant</p>
                    </div>
                    <button class="i360-header-close" onclick="I360Widget.toggle()" aria-label="Close chat">&times;</button>
                </div>

                <div id="i360-prechat-form" class="i360-prechat" style="display:none;"></div>
                <div id="i360-messages" class="i360-messages" style="display:none;"></div>

                <div id="i360-input-area" class="i360-input-area" style="display:none;">
                    <input id="i360-input" class="i360-input" type="text" placeholder="Type a message..." maxlength="2000" autocomplete="off">
                    <button id="i360-send" class="i360-send-btn" aria-label="Send">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>

                <div class="i360-disclaimer">
                    ${disclaimer}
                    ${getPrivacyPolicyLink()}
                    | <a href="#" onclick="I360Widget.deleteData();return false;">Delete My Data</a>
                </div>
                ${branding.hide_branding ? '' : `<div class="i360-branding">
                    Powered by <a href="https://insight360.ai" target="_blank" rel="noopener">Insight 360</a>
                </div>`}
                <div id="i360-csat-area"></div>
            </div>

            <button id="i360-toggle-btn" onclick="I360Widget.toggle()" aria-label="Open chat">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            </button>
        `;

        document.body.appendChild(container);

        // Set up event listeners
        const input = document.getElementById('i360-input');
        const sendBtn = document.getElementById('i360-send');

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        sendBtn.addEventListener('click', handleSend);
    }

    function getPrivacyPolicyLink() {
        const baseUrl = getBaseUrl();
        return ` | <a href="${baseUrl}/api/chat/public/${config.widgetId}/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>`;
    }

    // ── Pre-Chat Form ────────────────────────────────────────

    function renderPreChatForm() {
        const preChatConfig = widgetConfig.pre_chat || {};
        const mode = preChatConfig.mode || 'lead_capture';
        const fields = preChatConfig.fields || {};
        const consentText = widgetConfig.consent_text || 'I agree to the Privacy Policy.';

        const formEl = document.getElementById('i360-prechat-form');
        const messagesEl = document.getElementById('i360-messages');
        const inputArea = document.getElementById('i360-input-area');

        if (mode === 'open_chat') {
            // No form — go straight to chat
            formEl.style.display = 'none';
            messagesEl.style.display = 'flex';
            inputArea.style.display = 'flex';
            startSession({
                consent: true,
                fingerprint: generateFingerprint()
            });
            return;
        }

        formEl.style.display = 'flex';
        messagesEl.style.display = 'none';
        inputArea.style.display = 'none';

        const baseUrl = getBaseUrl();
        const privacyUrl = `${baseUrl}/api/chat/public/${config.widgetId}/privacy-policy`;

        let html = '<h4>Welcome!</h4>';
        html += '<p>You are chatting with an AI assistant. This AI does not provide medical diagnoses or replace professional medical advice.</p>';

        if (mode === 'custom') {
            // Custom mode: iterate all configured fields generically
            for (const [key, fieldConfig] of Object.entries(fields)) {
                if (!fieldConfig?.enabled) continue;
                const req = fieldConfig.required ? 'required' : '';
                const label = fieldConfig.label || key;
                const placeholder = fieldConfig.placeholder || '';
                const inputType = key === 'email' ? 'email' : (fieldConfig.type || 'text');
                html += `<label>${label}${req ? ' *' : ''}<input type="${inputType}" id="i360-field-${key}" data-field="${key}" placeholder="${placeholder}" ${req} class="i360-custom-field"></label>`;
            }
        } else {
            // Standard modes: email + name fields
            if (fields.email?.enabled !== false) {
                const req = fields.email?.required ? 'required' : '';
                const label = fields.email?.label || 'Email';
                const placeholder = fields.email?.placeholder || 'your@email.com';
                html += `<label>${label}${req ? ' *' : ''}<input type="email" id="i360-email" placeholder="${placeholder}" ${req}></label>`;
            }

            if (fields.name?.enabled !== false) {
                const req = fields.name?.required ? 'required' : '';
                const label = fields.name?.label || 'Name';
                const placeholder = fields.name?.placeholder || 'Your name';
                html += `<label>${label}${req ? ' *' : ''}<input type="text" id="i360-name" placeholder="${placeholder}" ${req}></label>`;
            }
        }

        // Consent checkbox
        if (preChatConfig.show_consent_checkbox !== false) {
            html += `<div class="i360-consent-row">
                <input type="checkbox" id="i360-consent">
                <label for="i360-consent">${consentText.replace(/\[Privacy Policy\]/g, `<a href="${privacyUrl}" target="_blank" rel="noopener">Privacy Policy</a>`)}</label>
            </div>`;
        }

        html += '<div id="i360-prechat-error" class="i360-error"></div>';
        html += '<button class="i360-prechat-btn" id="i360-start-btn">Start Chat</button>';

        if (mode === 'optional_info') {
            html += '<button class="i360-skip-btn" id="i360-skip-btn">Skip and start chatting</button>';
        }

        formEl.innerHTML = html;

        // Button handlers
        document.getElementById('i360-start-btn').addEventListener('click', handlePreChatSubmit);

        const skipBtn = document.getElementById('i360-skip-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                startSession({ consent: true, fingerprint: generateFingerprint() });
            });
        }
    }

    async function handlePreChatSubmit() {
        const errorEl = document.getElementById('i360-prechat-error');
        errorEl.textContent = '';

        const preChatConfig = widgetConfig.pre_chat || {};
        const mode = preChatConfig.mode || 'lead_capture';
        const fields = preChatConfig.fields || {};
        const consentEl = document.getElementById('i360-consent');

        // Consent validation (all modes)
        if (preChatConfig.show_consent_checkbox !== false && consentEl && !consentEl.checked) {
            errorEl.textContent = 'Please agree to the privacy policy to continue.';
            return;
        }

        let formData;

        if (mode === 'custom') {
            // Custom mode: collect all custom fields
            formData = { consent: consentEl ? consentEl.checked : true, fingerprint: generateFingerprint() };
            const customFields = document.querySelectorAll('.i360-custom-field');
            for (const input of customFields) {
                const key = input.dataset.field;
                const fieldConfig = fields[key];
                if (fieldConfig?.required && !input.value.trim()) {
                    errorEl.textContent = `${fieldConfig.label || key} is required.`;
                    return;
                }
                if (input.value.trim()) {
                    if (key === 'email') formData.email = input.value.trim();
                    else if (key === 'name') formData.name = input.value.trim();
                    else {
                        formData.metadata = formData.metadata || {};
                        formData.metadata[key] = input.value.trim();
                    }
                }
            }
        } else {
            // Standard modes: email + name
            const emailEl = document.getElementById('i360-email');
            const nameEl = document.getElementById('i360-name');

            if (fields.email?.required && emailEl && !emailEl.value.trim()) {
                errorEl.textContent = 'Email is required.';
                return;
            }
            if (fields.name?.required && nameEl && !nameEl.value.trim()) {
                errorEl.textContent = 'Name is required.';
                return;
            }

            formData = {
                email: emailEl?.value?.trim() || undefined,
                name: nameEl?.value?.trim() || undefined,
                consent: consentEl ? consentEl.checked : true,
                fingerprint: generateFingerprint()
            };
        }

        const startBtn = document.getElementById('i360-start-btn');
        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';

        try {
            await startSession(formData);
        } catch (error) {
            errorEl.textContent = error.message || 'Failed to start chat. Please try again.';
            startBtn.disabled = false;
            startBtn.textContent = 'Start Chat';
        }
    }

    async function startSession(formData) {
        // Merge userData from setUser() if available
        if (userData) {
            if (userData.name && !formData.name) formData.name = userData.name;
            if (userData.email && !formData.email) formData.email = userData.email;
            if (userData.metadata) formData.metadata = userData.metadata;
        }

        const session = await createSession(formData);
        sessionId = session.session_id;
        sessionToken = session.session_token;

        // Show chat UI
        const formEl = document.getElementById('i360-prechat-form');
        const messagesEl = document.getElementById('i360-messages');
        const inputArea = document.getElementById('i360-input-area');

        formEl.style.display = 'none';
        messagesEl.style.display = 'flex';
        inputArea.style.display = 'flex';

        // Show welcome message
        const branding = widgetConfig.branding || {};
        appendMessage('assistant', branding.welcome_message || 'Hi! How can I help you today?');

        // Save session for persistence
        saveSession();
        emitEvent('sessionStart', { sessionId });

        // Focus input
        document.getElementById('i360-input').focus();
    }

    // ── Message Handling ─────────────────────────────────────

    /**
     * Transform plain-text links into rich content cards (video + Calendly).
     * Applied to assistant messages after basic markdown formatting.
     */
    function formatRichContent(html) {
        // Vimeo video cards
        html = html.replace(
            /<a href="(https?:\/\/(?:www\.)?vimeo\.com\/(\d+)[^"]*)"[^>]*>([^<]*)<\/a>/gi,
            (match, url, videoId, linkText) => {
                const title = linkText || 'Watch Video';
                return `<a href="${url}" target="_blank" rel="noopener" class="i360-video-card">
                    <div class="i360-video-card-icon"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                    <div><div class="i360-video-card-text">${escapeHtml(title)}</div><div class="i360-video-card-label">Vimeo Video</div></div>
                </a>`;
            }
        );

        // YouTube video cards
        html = html.replace(
            /<a href="(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, url, linkText) => {
                const title = linkText || 'Watch Video';
                return `<a href="${url}" target="_blank" rel="noopener" class="i360-video-card">
                    <div class="i360-video-card-icon" style="background:#ff0000"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
                    <div><div class="i360-video-card-text">${escapeHtml(title)}</div><div class="i360-video-card-label">YouTube Video</div></div>
                </a>`;
            }
        );

        // Calendly booking cards
        html = html.replace(
            /<a href="(https?:\/\/calendly\.com\/[^"]+)"[^>]*>([^<]*)<\/a>/gi,
            (match, url, linkText) => {
                return `<div class="i360-calendly-card">
                    <div class="i360-calendly-card-header"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/></svg>Book a Consultation</div>
                    <p>Schedule a time that works for you.</p>
                    <a href="${url}" target="_blank" rel="noopener" class="i360-calendly-btn">Schedule Now</a>
                </div>`;
            }
        );

        return html;
    }

    function appendMessage(role, content) {
        const messagesEl = document.getElementById('i360-messages');
        const msgEl = document.createElement('div');
        msgEl.className = `i360-msg ${role}`;

        // Simple markdown-like formatting
        let formatted = escapeHtml(content)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/\n/g, '<br>');

        // Rich content cards for assistant messages (video, Calendly)
        if (role === 'assistant') {
            formatted = formatRichContent(formatted);
        }

        msgEl.innerHTML = formatted;
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        chatMessages.push({ role, content });
        saveSession();
        emitEvent('message', { role, content });
        checkCSAT();
    }

    function showTyping() {
        const messagesEl = document.getElementById('i360-messages');
        const typingEl = document.createElement('div');
        typingEl.className = 'i360-typing';
        typingEl.innerHTML = '<span></span><span></span><span></span>';
        messagesEl.appendChild(typingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return typingEl;
    }

    function removeTyping(typingEl) {
        if (typingEl && typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
        }
    }

    async function handleSend() {
        const input = document.getElementById('i360-input');
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.focus();

        const sendBtn = document.getElementById('i360-send');
        sendBtn.disabled = true;

        await sendMessage(message);
        sendBtn.disabled = false;
    }

    // ── Utilities ────────────────────────────────────────────

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function generateFingerprint() {
        // Non-PII fingerprint based on browser characteristics
        const data = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ].join('|');

        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }

    // ── Session Persistence (localStorage) ──────────────────

    const STORAGE_PREFIX = 'i360_widget_';

    function saveSession() {
        if (!config.widgetId || !sessionId) return;
        try {
            const data = {
                sessionId,
                sessionToken,
                chatMessages,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_PREFIX + config.widgetId, JSON.stringify(data));
        } catch (e) { /* localStorage not available or full */ }
    }

    function loadSession() {
        if (!config.widgetId) return null;
        try {
            const raw = localStorage.getItem(STORAGE_PREFIX + config.widgetId);
            if (!raw) return null;
            const data = JSON.parse(raw);
            // Expire sessions after 24 hours
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(STORAGE_PREFIX + config.widgetId);
                return null;
            }
            return data;
        } catch (e) { return null; }
    }

    function clearSession() {
        if (config.widgetId) {
            try { localStorage.removeItem(STORAGE_PREFIX + config.widgetId); } catch (e) { /* */ }
        }
        sessionId = null;
        sessionToken = null;
        chatMessages = [];
    }

    // ── Event Hooks ──────────────────────────────────────────

    function emitEvent(eventName, data) {
        const handlers = eventHandlers[eventName] || [];
        for (const handler of handlers) {
            try { handler(data); } catch (e) { console.error('[I360 Widget] Event handler error:', e); }
        }
    }

    // ── CSAT Rating ────────────────────────────────────────────

    let csatShown = false;
    const CSAT_TRIGGER_MESSAGES = 6; // Show after 6 messages (3 user + 3 assistant)

    function checkCSAT() {
        if (csatShown || chatMessages.length < CSAT_TRIGGER_MESSAGES) return;
        csatShown = true;
        const area = document.getElementById('i360-csat-area');
        if (!area) return;
        area.innerHTML = `
            <div class="i360-csat">
                <p>How was your experience?</p>
                <div class="i360-csat-stars">
                    ${[1,2,3,4,5].map(n => `<button class="i360-csat-star" data-rating="${n}" onclick="I360Widget._submitCSAT(${n})">&#9733;</button>`).join('')}
                </div>
            </div>`;
    }

    async function submitCSAT(rating) {
        const area = document.getElementById('i360-csat-area');
        if (area) area.innerHTML = '<div class="i360-csat"><p class="i360-csat-thanks">Thank you for your feedback!</p></div>';
        // Highlight selected stars
        emitEvent('csat', { rating, sessionId });
        try {
            await apiCall('/session/csat', {
                method: 'POST',
                body: JSON.stringify({ session_id: sessionId, rating })
            });
        } catch (e) { /* CSAT is best-effort */ }
        setTimeout(() => { if (area) area.innerHTML = ''; }, 3000);
    }

    // ── Proactive Triggers ────────────────────────────────────

    let proactiveTriggered = false;

    function setupProactiveTriggers() {
        const triggers = widgetConfig.branding?.proactive_triggers;
        if (!triggers || isOpen || sessionId) return;

        // Time on page trigger
        if (triggers.time_on_page && triggers.time_on_page > 0) {
            setTimeout(() => {
                if (!isOpen && !proactiveTriggered && !sessionId) {
                    showProactiveBubble(triggers.message || 'Need help? I\'m here to answer your questions.');
                }
            }, triggers.time_on_page * 1000);
        }

        // Scroll depth trigger
        if (triggers.scroll_depth && triggers.scroll_depth > 0) {
            const scrollHandler = () => {
                const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
                if (scrollPercent >= triggers.scroll_depth && !isOpen && !proactiveTriggered && !sessionId) {
                    showProactiveBubble(triggers.message || 'Questions about what you\'re reading? I can help!');
                    window.removeEventListener('scroll', scrollHandler);
                }
            };
            window.addEventListener('scroll', scrollHandler, { passive: true });
        }
    }

    function showProactiveBubble(message) {
        if (proactiveTriggered || !container) return;
        proactiveTriggered = true;
        const bubble = document.createElement('div');
        bubble.className = 'i360-proactive-bubble';
        bubble.textContent = message;
        bubble.addEventListener('click', () => {
            bubble.remove();
            window.I360Widget.toggle();
        });
        container.appendChild(bubble);
        // Auto-dismiss after 15 seconds
        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 15000);
    }

    // ── Data Deletion ────────────────────────────────────────

    async function requestDataDeletion() {
        if (!sessionId) return;
        try {
            await apiCall(`/data/${sessionId}`, { method: 'DELETE' });
            clearSession();
            appendMessage('system', 'Your conversation data has been deleted.');
            emitEvent('dataDeleted', { sessionId });
        } catch (error) {
            appendMessage('system', 'Could not delete data. Please contact us directly.');
        }
    }

    // ── Public API ───────────────────────────────────────────

    window.I360Widget = {
        init: async function (options) {
            if (isInitialized) return;

            config = {
                widgetId: options.widgetId || options.widget_id,
                token: options.token,
                baseUrl: options.baseUrl,
                position: options.position || defaults.position
            };

            try {
                widgetConfig = await loadConfig();
                createWidget();
                isInitialized = true;
                setupProactiveTriggers();
                emitEvent('ready', { widgetId: config.widgetId });
            } catch (error) {
                console.error('[I360 Widget] Failed to initialize:', error.message);
                emitEvent('error', { type: 'init', message: error.message });
            }
        },

        toggle: function () {
            if (!isInitialized) return;
            const window_ = document.getElementById('i360-chat-window');
            const toggleBtn = document.getElementById('i360-toggle-btn');

            isOpen = !isOpen;
            window_.classList.toggle('open', isOpen);
            toggleBtn.style.display = isOpen ? 'none' : 'flex';

            if (isOpen && !sessionId) {
                // Check for saved session first
                const saved = loadSession();
                if (saved && saved.sessionId) {
                    sessionId = saved.sessionId;
                    sessionToken = saved.sessionToken;
                    chatMessages = saved.chatMessages || [];
                    // Restore messages in UI
                    const formEl = document.getElementById('i360-prechat-form');
                    const messagesEl = document.getElementById('i360-messages');
                    const inputArea = document.getElementById('i360-input-area');
                    formEl.style.display = 'none';
                    messagesEl.style.display = 'flex';
                    inputArea.style.display = 'flex';
                    messagesEl.innerHTML = '';
                    for (const msg of chatMessages) {
                        const msgEl = document.createElement('div');
                        msgEl.className = `i360-msg ${msg.role}`;
                        msgEl.innerHTML = escapeHtml(msg.content)
                            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
                            .replace(/\n/g, '<br>');
                        messagesEl.appendChild(msgEl);
                    }
                    messagesEl.scrollTop = messagesEl.scrollHeight;
                    emitEvent('sessionRestored', { sessionId });
                } else {
                    renderPreChatForm();
                }
            }

            if (isOpen) {
                const input = document.getElementById('i360-input');
                if (input && input.offsetParent !== null) {
                    setTimeout(() => input.focus(), 100);
                }
            }
        },

        destroy: function () {
            if (container) {
                container.remove();
                container = null;
            }
            isInitialized = false;
            isOpen = false;
            sessionId = null;
            chatMessages = [];
        },

        /** Set user identity for authenticated sites */
        setUser: function (user) {
            userData = {
                name: user.name || undefined,
                email: user.email || undefined,
                metadata: user.metadata || undefined
            };
        },

        /** Register event handler: ready, message, error, sessionStart, sessionRestored, dataDeleted */
        on: function (eventName, handler) {
            if (typeof handler !== 'function') return;
            if (!eventHandlers[eventName]) eventHandlers[eventName] = [];
            eventHandlers[eventName].push(handler);
        },

        /** Remove event handler */
        off: function (eventName, handler) {
            if (!eventHandlers[eventName]) return;
            eventHandlers[eventName] = eventHandlers[eventName].filter(h => h !== handler);
        },

        /** Request deletion of conversation data */
        deleteData: requestDataDeletion,

        /** Internal: submit CSAT rating (called from inline onclick) */
        _submitCSAT: submitCSAT
    };

    // ── Auto-init from script tag ────────────────────────────

    document.addEventListener('DOMContentLoaded', function () {
        const script = document.querySelector('script[data-widget-id]');
        if (script) {
            const widgetId = script.getAttribute('data-widget-id');
            const token = script.getAttribute('data-token');
            const position = script.getAttribute('data-position');
            const baseUrl = script.getAttribute('data-base-url');

            if (widgetId && token) {
                window.I360Widget.init({ widgetId, token, position, baseUrl });
            }
        }
    });

})();

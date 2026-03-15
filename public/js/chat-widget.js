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
    const WIDGET_VERSION = '1.0.0';

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
        const typingEl = showTyping();

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
                        if (data.type === 'text') {
                            fullResponse = data.content;
                        } else if (data.type === 'error') {
                            fullResponse = data.content;
                        }
                    } catch (e) {
                        // Skip malformed SSE lines
                    }
                }
            }

            // Remove typing indicator and show response
            removeTyping(typingEl);
            if (fullResponse) {
                appendMessage('assistant', fullResponse);
            }
        } catch (error) {
            removeTyping(typingEl);
            appendMessage('assistant', 'I\'m temporarily unavailable. Please try again or contact us directly.');
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
                .i360-disclaimer a { color: #666; }
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
                </div>
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

        // Email field
        if (fields.email?.enabled !== false && mode !== 'open_chat') {
            const req = fields.email?.required ? 'required' : '';
            const label = fields.email?.label || 'Email';
            const placeholder = fields.email?.placeholder || 'your@email.com';
            html += `<label>${label}${req ? ' *' : ''}<input type="email" id="i360-email" placeholder="${placeholder}" ${req}></label>`;
        }

        // Name field
        if (fields.name?.enabled !== false && mode !== 'open_chat') {
            const req = fields.name?.required ? 'required' : '';
            const label = fields.name?.label || 'Name';
            const placeholder = fields.name?.placeholder || 'Your name';
            html += `<label>${label}${req ? ' *' : ''}<input type="text" id="i360-name" placeholder="${placeholder}" ${req}></label>`;
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
        const fields = preChatConfig.fields || {};

        const emailEl = document.getElementById('i360-email');
        const nameEl = document.getElementById('i360-name');
        const consentEl = document.getElementById('i360-consent');

        // Validate required fields
        if (fields.email?.required && emailEl && !emailEl.value.trim()) {
            errorEl.textContent = 'Email is required.';
            return;
        }
        if (fields.name?.required && nameEl && !nameEl.value.trim()) {
            errorEl.textContent = 'Name is required.';
            return;
        }
        if (preChatConfig.show_consent_checkbox !== false && consentEl && !consentEl.checked) {
            errorEl.textContent = 'Please agree to the privacy policy to continue.';
            return;
        }

        const formData = {
            email: emailEl?.value?.trim() || undefined,
            name: nameEl?.value?.trim() || undefined,
            consent: consentEl ? consentEl.checked : true,
            fingerprint: generateFingerprint()
        };

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

        // Focus input
        document.getElementById('i360-input').focus();
    }

    // ── Message Handling ─────────────────────────────────────

    function appendMessage(role, content) {
        const messagesEl = document.getElementById('i360-messages');
        const msgEl = document.createElement('div');
        msgEl.className = `i360-msg ${role}`;

        // Simple markdown-like formatting
        let formatted = escapeHtml(content)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
            .replace(/\n/g, '<br>');

        msgEl.innerHTML = formatted;
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        chatMessages.push({ role, content });
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
            } catch (error) {
                console.error('[I360 Widget] Failed to initialize:', error.message);
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
                renderPreChatForm();
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
        }
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

/* chat models — model registry loading + active-model indicator UI */
/**
 * Load available models from API
 */
async function loadModels() {
    try {
        const response = await authFetch('/api/chat/models');
        const data = await response.json();

        if (data.success && data.models) {
            const claudeGroup = document.getElementById('claudeModels');
            const gptGroup = document.getElementById('gptModels');
            const geminiGroup = document.getElementById('geminiModels');
            const perplexityGroup = document.getElementById('perplexityModels');

            // Build capabilities map and populate dropdowns
            if (data.models.anthropic) {
                data.models.anthropic.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (claudeGroup) {
                    claudeGroup.innerHTML = data.models.anthropic.map(m =>
                        `<option value="${m.id}" ${m.id === data.default ? 'selected' : ''}>${m.name}</option>`
                    ).join('');
                }
            }

            if (data.models.openai) {
                data.models.openai.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (gptGroup) {
                    gptGroup.innerHTML = data.models.openai.map(m =>
                        `<option value="${m.id}">${m.name}</option>`
                    ).join('');
                }
            }

            if (data.models.google) {
                data.models.google.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (geminiGroup) {
                    geminiGroup.innerHTML = data.models.google.map(m =>
                        `<option value="${m.id}">${m.name}</option>`
                    ).join('');
                }
            }

            if (data.models.perplexity) {
                data.models.perplexity.forEach(m => {
                    modelCapabilities[m.id] = m;
                });
                if (perplexityGroup) {
                    perplexityGroup.innerHTML = data.models.perplexity.map(m =>
                        `<option value="${m.id}">${m.name}</option>`
                    ).join('');
                }
            }

            currentModel = data.default || currentModel;
            updateModelIndicator();
        }
    } catch (error) {
        console.error('Failed to load models:', error);
    }
}


/**
 * Update model indicator badge with capability icons
 */
function updateModelIndicator() {
    if (!modelIndicator) return;

    const option = modelSelect?.querySelector(`option[value="${currentModel}"]`);
    const modelName = option ? option.textContent : currentModel;
    const caps = modelCapabilities[currentModel] || {};

    // Build capability badges with custom tooltips
    const badges = [];
    if (caps.vision) badges.push('<span class="cap-badge" data-tooltip="Vision - analyzes images">👁️</span>');
    if (caps.pdf) badges.push('<span class="cap-badge" data-tooltip="PDF - reads documents">📄</span>');
    if (caps.audio) badges.push('<span class="cap-badge" data-tooltip="Audio - voice input/output">🎤</span>');
    if (caps.imageGen) badges.push('<span class="cap-badge" data-tooltip="Image Generation">🖼️</span>');
    if (caps.reasoning) badges.push('<span class="cap-badge" data-tooltip="Advanced Reasoning">🧠</span>');
    if (caps.search) badges.push('<span class="cap-badge" data-tooltip="Built-in Web Search">🔍</span>');
    if (caps.research) badges.push('<span class="cap-badge" data-tooltip="Deep Research Mode">📚</span>');

    modelIndicator.innerHTML = `
        <span class="model-name">${modelName}</span>
        ${badges.length > 0 ? `<span class="cap-badges">${badges.join('')}</span>` : ''}
    `;
}


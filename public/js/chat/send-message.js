/* chat send-message — main streaming/LLM dispatch path */
/**
 * Send message
 */
async function sendMessage() {
    const message = chatInput?.value.trim();
    if (!message || isStreaming) return;

    // Hide welcome message
    const welcomeMessage = chatMessages?.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    // Create conversation if this is the first message
    if (!currentConversationId) {
        await createConversation();
    }

    // Process attached files before sending
    let processedFiles = [];
    if (attachedFiles.length > 0) {
        setStatus('Processing files...');
        processedFiles = await processAttachedFiles(attachedFiles);
    }

    // Add user message to UI (with file indicator if applicable)
    const displayMessage = processedFiles.length > 0
        ? `${message}\n\n📎 ${processedFiles.map(f => f.name).join(', ')}`
        : message;
    // Add message without auto-scroll, then scroll to show user message at top
    const userMessageDiv = addMessage('user', displayMessage, false, false);

    // Scroll user message to top of viewport (use requestAnimationFrame to ensure DOM is updated)
    requestAnimationFrame(() => {
        scrollMessageToTop(userMessageDiv);
    });

    // Clear input and files
    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
    }
    clearAttachedFiles();

    // Build message content with files for API
    let messageContent = message;
    if (processedFiles.length > 0) {
        // Build content array for multimodal messages
        messageContent = buildMultimodalContent(message, processedFiles);
    }

    // Add to history
    conversationHistory.push({ role: 'user', content: messageContent });

    // Save user message to database
    saveMessage('user', message);

    // Check if this is an image generation request
    if (isImageGenerationRequest(message)) {
        await handleImageGeneration(message);
        return;
    }

    // Update status
    const useSearchStatus = enableSearch?.checked;
    setStatus(useSearchStatus ? 'Searching the web...' : 'Thinking...');
    isStreaming = true;

    try {
        // Create assistant message placeholder with loading spinner (don't auto-scroll)
        const assistantDiv = addMessage('assistant', '', true, false);
        const contentDiv = assistantDiv.querySelector('.message-content');

        // Determine if we should use search
        const useSearch = enableSearch?.checked;
        const endpoint = useSearch ? '/api/chat/with-search' : '/api/chat/stream';

        // Source citation instructions for all LLMs
        const sourceCitationInstructions = `

When your response references external information, facts, statistics, or claims that would benefit from verification:
1. Include a Sources section at the end of your response
2. Format sources as a numbered list with clickable markdown links:

---

**Sources:**
1. [Source Title or Domain](https://example.com/full-url)

Only include sources when you reference specific external information. For general knowledge or reasoning, you may omit sources.`;

        // Build request body
        const requestBody = {
            messages: conversationHistory,
            model: currentModel,
            systemPrompt: sourceCitationInstructions
        };

        if (useSearch) {
            // For search endpoint, use the user's message as the search query
            requestBody.searchQuery = message;
            requestBody.systemPrompt = 'Use the web search results provided to answer the user\'s question with current, accurate information. Always cite sources when using search results.' + sourceCitationInstructions;
        }

        // Stream response (or use non-streaming for search)
        const response = await authFetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        let fullResponse = '';

        if (useSearch) {
            // Non-streaming JSON response for search endpoint
            const data = await response.json();

            // Stop loading messages
            stopLoadingMessages();

            if (!data.success) {
                throw new Error(data.error || 'Search failed');
            }

            fullResponse = data.response;

            // Show fallback notification if applicable
            if (data.fallback && typeof showToast === 'function') {
                const fb = data.fallback;
                showToast(
                    `${fb.original_model_name || fb.original_model} is unavailable. Using ${fb.fallback_model_name || fb.fallback_model} instead.`,
                    'warning'
                );
            }

            // Show search results indicator if available
            if (data.searchResults && data.searchResults.length > 0) {
                setStatus(`Found ${data.searchResults.length} search results`);
            }

            if (contentDiv) {
                contentDiv.innerHTML = formatMessage(fullResponse);
                contentDiv.dataset.rawContent = fullResponse;
            }
        } else {
            // Streaming SSE response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let citations = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'fallback' && parsed.fallback) {
                                // Provider fallback notification
                                const fb = parsed.fallback;
                                if (typeof showToast === 'function') {
                                    showToast(
                                        `${fb.original_model_name || fb.original_model} is unavailable. Using ${fb.fallback_model_name || fb.fallback_model} instead.`,
                                        'warning'
                                    );
                                }
                            } else if (parsed.type === 'guardrail_blocked') {
                                // Guardrail or bright line enforcement blocked the message
                                stopLoadingMessages();
                                fullResponse = parsed.message || 'This request was blocked by organizational guardrails.';
                                if (contentDiv) {
                                    contentDiv.innerHTML = renderGuardrailBlock(parsed);
                                    if (typeof lucide !== 'undefined') lucide.createIcons();
                                    autoScrollIfNearBottom();
                                }
                            } else if (parsed.type === 'content' && parsed.text) {
                                // Stop loading messages on first content
                                if (fullResponse === '') {
                                    stopLoadingMessages();
                                }
                                fullResponse += parsed.text;
                                if (contentDiv) {
                                    contentDiv.innerHTML = formatMessage(fullResponse);
                                    // Auto-scroll to keep new tokens visible (if user is near bottom)
                                    autoScrollIfNearBottom();
                                    // Check if content overflows and show scroll button
                                    updateScrollToBottomButton();
                                }
                            } else if (parsed.type === 'citations' && parsed.citations) {
                                // Capture citations from Perplexity
                                citations = parsed.citations;
                            } else if (parsed.type === 'error') {
                                stopLoadingMessages();
                                throw new Error(parsed.error);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            // Append citations as sources if available (from Perplexity)
            if (citations.length > 0) {
                fullResponse += formatCitations(citations);
                if (contentDiv) {
                    contentDiv.innerHTML = formatMessage(fullResponse);
                    autoScrollIfNearBottom();
                }
            }
        }

        // Store raw markdown on the content element for export/copy
        if (contentDiv) {
            contentDiv.dataset.rawContent = fullResponse;
        }

        // Add to history
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        // Save assistant message to database
        saveMessage('assistant', fullResponse, currentModel);

        setStatus('Ready');

    } catch (error) {
        console.error('Chat error:', error);
        setStatus('Error: ' + error.message);

        // Stop loading messages on error
        stopLoadingMessages();

        // Show error in chat
        const lastMessage = chatMessages?.lastElementChild;
        if (lastMessage?.classList.contains('assistant')) {
            lastMessage.querySelector('.message-content').innerHTML =
                `<span style="color: var(--danger);">Error: ${error.message}</span>`;
        }
    } finally {
        isStreaming = false;
        // Ensure loading messages are stopped
        stopLoadingMessages();
        // Final check for scroll button visibility
        updateScrollToBottomButton();
    }
}


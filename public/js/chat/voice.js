/* chat voice — speech-to-text input + text-to-speech playback (self-contained IIFE) */
// ============================================
// VOICE INPUT / OUTPUT MODULE
// ============================================

(function() {
    console.log('[Voice] Module initializing...');

    // Local toast helper — showToast doesn't exist on the chat page
    function voiceToast(message, type) {
        try {
            if (typeof ModalService !== 'undefined' && ModalService.toast) {
                ModalService.toast({ message, type });
            } else {
                console[type === 'error' ? 'warn' : 'log']('[Voice]', message);
            }
        } catch (e) {
            console.warn('[Voice] Toast failed:', message);
        }
    }

    // DOM elements
    const voiceInputBtn = document.getElementById('voiceInputBtn');
    const voiceModal = document.getElementById('voiceModal');
    const voiceStatus = document.getElementById('voiceStatus');
    const stopRecordingBtn = document.getElementById('stopRecording');
    const cancelRecordingBtn = document.getElementById('cancelRecording');
    const voicePlayback = document.getElementById('voicePlayback');
    const playResponseBtn = document.getElementById('playResponseBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const chatInputEl = document.getElementById('chatInput');
    const enableVoiceEl = document.getElementById('enableVoice');
    const voiceActions = document.getElementById('voiceActions');
    const voiceDots = document.getElementById('voiceDots');
    const voiceSpinner = document.getElementById('voiceSpinner');

    console.log('[Voice] DOM elements:', {
        voiceInputBtn: !!voiceInputBtn,
        voiceModal: !!voiceModal,
        stopRecordingBtn: !!stopRecordingBtn,
        voicePlayback: !!voicePlayback,
        playResponseBtn: !!playResponseBtn,
        enableVoiceEl: !!enableVoiceEl
    });

    // State
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingStream = null;
    let currentAudio = null;
    let isPlaying = false;
    let lastAssistantText = '';
    let adminConfig = null;
    let pendingAutoRead = false;

    // Load admin voice configuration
    async function loadVoiceConfig() {
        try {
            const res = await authFetch('/api/chat/voice/config');
            const data = await res.json();
            console.log('[Voice] Config loaded:', { available: data.available, stt: data.config?.stt_enabled, tts: data.config?.tts_enabled });
            if (data.success) {
                adminConfig = data.config;
                // Apply admin defaults
                if (!data.available || !adminConfig.stt_enabled) {
                    console.log('[Voice] STT disabled — hiding mic button');
                    if (voiceInputBtn) voiceInputBtn.style.display = 'none';
                }
                if (!data.available || !adminConfig.tts_enabled) {
                    console.log('[Voice] TTS disabled — hiding playback');
                    if (voicePlayback) voicePlayback.classList.add('hidden');
                }
                // Set default voice from admin config if no user preference
                if (!localStorage.getItem('insight360-voice') && adminConfig.default_voice && voiceSelect) {
                    voiceSelect.value = adminConfig.default_voice;
                }
            }
        } catch (e) {
            console.warn('[Voice] Config fetch failed:', e.message);
        }
    }
    loadVoiceConfig();

    // Load saved voice preference
    const savedVoice = localStorage.getItem('insight360-voice');
    if (savedVoice && voiceSelect) {
        voiceSelect.value = savedVoice;
    }

    // Save voice preference on change
    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            localStorage.setItem('insight360-voice', voiceSelect.value);
        });
    }

    // ---- RECORDING ----

    if (voiceInputBtn) {
        voiceInputBtn.addEventListener('click', startRecording);
    }

    if (stopRecordingBtn) {
        stopRecordingBtn.addEventListener('click', stopRecording);
    }

    if (cancelRecordingBtn) {
        cancelRecordingBtn.addEventListener('click', cancelRecording);
    }

    async function startRecording() {
        console.log('[Voice] startRecording called');
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('[Voice] getUserMedia not available — page may not be in a secure context');
                voiceToast('Voice recording requires HTTPS or localhost', 'error');
                return;
            }
            console.log('[Voice] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[Voice] Microphone access granted');
            recordingStream = stream;
            audioChunks = [];

            // Prefer webm/opus, fallback to whatever browser supports
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : '';
            console.log('[Voice] Using mimeType:', mimeType || '(browser default)');

            mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                // Stream cleanup happens in stop/cancel handlers
            };

            mediaRecorder.start(100); // collect data every 100ms
            console.log('[Voice] Recording started');

            // Show modal
            if (voiceModal) {
                voiceModal.style.display = '';
                voiceModal.classList.remove('hidden');
                voiceModal.classList.add('active');
            }
            if (voiceStatus) voiceStatus.textContent = 'Listening...';

        } catch (err) {
            console.error('[Voice] Microphone access error:', err);
            if (err.name === 'NotAllowedError') {
                voiceToast('Microphone access denied. Please allow microphone permission.', 'error');
            } else {
                voiceToast('Could not access microphone: ' + err.message, 'error');
            }
        }
    }

    async function stopRecording() {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

        // Switch to transcribing state: swap dots for spinner, hide buttons
        if (voiceDots) voiceDots.style.display = 'none';
        if (voiceSpinner) voiceSpinner.style.display = '';
        if (voiceStatus) voiceStatus.textContent = 'Transcribing...';
        if (voiceActions) voiceActions.style.display = 'none';

        // Wait for final data
        await new Promise(resolve => {
            mediaRecorder.onstop = resolve;
            mediaRecorder.stop();
        });

        // Stop mic stream
        if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
            recordingStream = null;
        }

        // Build blob and send
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];
        console.log('[Voice] Recording stopped. Blob size:', audioBlob.size, 'mimeType:', mimeType);

        if (audioBlob.size < 1000) {
            // Too short to be useful
            hideVoiceModal();
            console.warn('[Voice] Recording too short:', audioBlob.size, 'bytes');
            voiceToast('Recording too short. Please try again.', 'error');
            return;
        }

        try {
            const formData = new FormData();
            const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'm4a' : 'wav';
            formData.append('audio', audioBlob, `recording.${ext}`);
            console.log('[Voice] Sending transcription request...');

            const response = await authFetch('/api/chat/voice/transcribe', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('[Voice] Transcription response:', { status: response.status, success: data.success, hasText: !!data.text, error: data.error });

            if (data.success && data.text) {
                // Insert transcribed text into chat input
                if (chatInputEl) {
                    chatInputEl.value = data.text;
                    chatInputEl.focus();
                    // Auto-resize textarea
                    chatInputEl.style.height = 'auto';
                    chatInputEl.style.height = chatInputEl.scrollHeight + 'px';
                }
                // Auto-enable voice mode so TTS plays the response
                if (enableVoiceEl && !enableVoiceEl.checked) {
                    enableVoiceEl.checked = true;
                    enableVoiceEl.dispatchEvent(new Event('change'));
                }
                pendingAutoRead = true;
                voiceToast('Voice transcribed', 'success');
                // Close modal first, then auto-send
                hideVoiceModal();
                if (typeof sendMessage === 'function') {
                    setTimeout(() => sendMessage(), 100);
                }
                return; // hideVoiceModal already called
            } else {
                voiceToast(data.error || 'Transcription failed', 'error');
            }
        } catch (err) {
            console.error('Transcription request error:', err);
            voiceToast('Failed to transcribe: ' + err.message, 'error');
        }

        hideVoiceModal();
    }

    function cancelRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
            recordingStream = null;
        }
        audioChunks = [];
        hideVoiceModal();
    }

    function hideVoiceModal() {
        console.log('[Voice] hideVoiceModal called');
        if (voiceModal) {
            voiceModal.classList.remove('active');
            voiceModal.classList.add('hidden');
            voiceModal.style.display = 'none';
        }
        // Reset to recording state for next use
        if (voiceDots) voiceDots.style.display = '';
        if (voiceSpinner) voiceSpinner.style.display = 'none';
        if (voiceActions) voiceActions.style.display = '';
        if (stopRecordingBtn) stopRecordingBtn.disabled = false;
        if (voiceStatus) voiceStatus.textContent = 'Listening...';
    }

    // ---- PLAYBACK ----

    if (playResponseBtn) {
        playResponseBtn.addEventListener('click', togglePlayback);
    }

    async function togglePlayback() {
        if (isPlaying && currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            isPlaying = false;
            updatePlayButton(false);
            return;
        }

        if (!lastAssistantText) {
            voiceToast('No response to read aloud', 'error');
            return;
        }

        // Strip markdown for cleaner speech
        const cleanText = lastAssistantText
            .replace(/```[\s\S]*?```/g, ' code block ')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[`~]/g, '')
            .trim();

        if (!cleanText) {
            voiceToast('No text content to read', 'error');
            return;
        }

        const voice = voiceSelect?.value || adminConfig?.default_voice || 'nova';
        const speed = adminConfig?.default_speed || 1.0;
        const model = adminConfig?.default_tts_model || 'gpt-4o-mini-tts';

        try {
            updatePlayButton(true);
            setStatus('Generating speech...');

            const ttsBody = { text: cleanText, voice, speed, model };
            if (adminConfig?.tts_instructions) {
                ttsBody.instructions = adminConfig.tts_instructions;
            }

            const response = await authFetch('/api/chat/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ttsBody)
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'TTS failed' }));
                throw new Error(err.error || 'TTS request failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);

            currentAudio.onended = () => {
                isPlaying = false;
                updatePlayButton(false);
                URL.revokeObjectURL(audioUrl);
                setStatus('Ready');
            };

            currentAudio.onerror = () => {
                isPlaying = false;
                updatePlayButton(false);
                URL.revokeObjectURL(audioUrl);
                voiceToast('Audio playback error', 'error');
                setStatus('Ready');
            };

            isPlaying = true;
            currentAudio.play();
            setStatus('Playing response...');

        } catch (err) {
            console.error('TTS error:', err);
            isPlaying = false;
            updatePlayButton(false);
            voiceToast('Text-to-speech failed: ' + err.message, 'error');
            setStatus('Ready');
        }
    }

    function updatePlayButton(playing) {
        if (!playResponseBtn) return;
        const icon = playResponseBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', playing ? 'square' : 'volume-2');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // ---- INTEGRATION WITH CHAT ----

    // Track last assistant response for TTS
    // Override the global conversationHistory push to capture assistant messages
    const origPush = Array.prototype.push;
    const historyRef = typeof conversationHistory !== 'undefined' ? conversationHistory : null;

    if (historyRef) {
        // Use a MutationObserver on the chat messages container to detect new assistant messages
    }

    // Observe new assistant messages to capture text and show playback controls
    const chatMessagesEl = document.getElementById('chatMessages');
    if (chatMessagesEl) {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.classList?.contains('message-assistant')) {
                        // Extract text from the assistant message content
                        const contentDiv = node.querySelector('.message-content');
                        if (contentDiv) {
                            // Use a small delay to let streaming finish
                            setTimeout(() => {
                                lastAssistantText = contentDiv.textContent || '';
                                // Show playback controls if voice is enabled
                                if (enableVoiceEl?.checked && voicePlayback) {
                                    voicePlayback.classList.remove('hidden');
                                }
                            }, 500);
                        }
                    }
                }
            }
        });
        observer.observe(chatMessagesEl, { childList: true });
    }

    // Also listen for streaming completion to capture final text
    // We hook into the global isStreaming state change
    let streamCheckInterval = null;
    const origSetStatus = typeof setStatus === 'function' ? setStatus : null;

    // Poll for streaming completion and capture final assistant text
    if (chatMessagesEl) {
        setInterval(() => {
            if (typeof isStreaming !== 'undefined' && !isStreaming && enableVoiceEl?.checked) {
                const messages = chatMessagesEl.querySelectorAll('.message-assistant .message-content');
                if (messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    const text = lastMsg.textContent || '';
                    if (text && text !== lastAssistantText) {
                        lastAssistantText = text;
                        if (voicePlayback) voicePlayback.classList.remove('hidden');
                        // Auto-read response if voice input was used
                        if (pendingAutoRead) {
                            pendingAutoRead = false;
                            togglePlayback();
                        }
                    }
                }
            }
        }, 1000);
    }

    // Hide playback when voice is toggled off
    if (enableVoiceEl) {
        enableVoiceEl.addEventListener('change', () => {
            if (!enableVoiceEl.checked) {
                if (voicePlayback) voicePlayback.classList.add('hidden');
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                    isPlaying = false;
                }
            }
        });
    }
})();

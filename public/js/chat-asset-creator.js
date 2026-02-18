/**
 * ChatAssetCreator - Orchestrates asset creation from the Chat page
 *
 * Provides two entry points:
 *   1. Toolbar "Create" button → opens TransformAssetModal with blank content
 *   2. Artifact menu "Create X" → opens TransformAssetModal pre-filled with message content
 *
 * Requires: ModalServiceLoader, TransformAssetModal
 *
 * @version 1.0.0
 */
window.ChatAssetCreator = (function() {
    'use strict';

    let _initialized = false;

    /**
     * Initialize the asset creator
     */
    function init() {
        if (_initialized) return;
        _initialized = true;
    }

    /**
     * Open transform modal with blank content (from toolbar)
     */
    async function createFromToolbar() {
        await _ensureModalService();
        _openTransformModal('', null);
    }

    /**
     * Open transform modal pre-filled with a chat message's content
     * @param {HTMLElement} messageEl - The .message element
     */
    async function createFromMessage(messageEl) {
        await _ensureModalService();
        const content = _extractMessageContent(messageEl);
        _openTransformModal(content, null);
    }

    /**
     * Open transform modal pre-filled with content and a preselected type
     * @param {HTMLElement} messageEl - The .message element
     * @param {string} targetType - One of: skill, voice_dna, icp, agent
     */
    async function createAs(messageEl, targetType) {
        await _ensureModalService();
        const content = _extractMessageContent(messageEl);
        _openTransformModal(content, targetType);
    }

    /**
     * Open transform modal from artifact menu (called by onclick)
     * @param {string} targetType - One of: skill, voice_dna, icp, agent
     */
    async function createFromArtifact(targetType) {
        await _ensureModalService();

        // Use the currently stored artifact content and name
        const content = window.currentArtifactContent || '';
        const name = window.currentArtifactName || '';

        // Close the artifact modal
        if (typeof closeArtifactModal === 'function') {
            closeArtifactModal();
        }

        _openTransformModal(content, targetType, name);
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    /**
     * Ensure ModalService is loaded
     */
    async function _ensureModalService() {
        if (typeof ModalServiceLoader !== 'undefined' && !ModalServiceLoader.isLoaded()) {
            await ModalServiceLoader.load();
        }
    }

    /**
     * Extract raw markdown content from a message element
     */
    function _extractMessageContent(messageEl) {
        if (!messageEl) return '';

        const contentDiv = messageEl.querySelector('.message-content');
        if (!contentDiv) return '';

        // Prefer stored raw markdown, fall back to innerText
        return contentDiv.dataset.rawContent || contentDiv.innerText || '';
    }

    /**
     * Open the TransformAssetModal
     */
    function _openTransformModal(sourceContent, targetType, sourceName) {
        if (typeof TransformAssetModal === 'undefined') {
            console.error('TransformAssetModal not loaded');
            if (typeof showToast === 'function') {
                showToast('Asset creator not available. Please refresh the page.', 'error');
            }
            return;
        }

        const modal = new TransformAssetModal({
            sourceContent: sourceContent,
            targetType: targetType,
            sourceName: sourceName || '',
            onSave: (result) => {
                _handleSaveSuccess(result);
            },
            onCancel: () => {
                // Nothing special needed
            }
        });

        if (typeof ModalService !== 'undefined') {
            ModalService.register(modal);
        }

        modal.init().open();
    }

    /**
     * Handle successful save
     */
    function _handleSaveSuccess(result) {
        if (!result) return;

        const typeLabels = {
            skill: 'Skill',
            voice_dna: 'Voice DNA',
            icp: 'ICP',
            agent: 'Agent',
            business_profile: 'Business Profile'
        };

        const typePages = {
            skill: '/skills.html',
            voice_dna: '/context.html',
            icp: '/context.html',
            agent: '/agents.html',
            business_profile: '/context.html'
        };

        const label = typeLabels[result.type] || result.type;
        const page = typePages[result.type] || '#';
        const name = result.saved?.name || 'Asset';

        if (typeof showToast === 'function') {
            showToast(`${label} "${name}" saved successfully!`, 'success');
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    return {
        init,
        createFromToolbar,
        createFromMessage,
        createAs,
        createFromArtifact
    };
})();

/**
 * ModalService Loader - Integration helper for Insight 360
 *
 * This file provides easy integration of the ModalService into any page.
 * Include this single file to load all modal service dependencies.
 *
 * Usage:
 *   <script src="/js/modal-service/loader.js"></script>
 *
 * Or load dynamically:
 *   await ModalServiceLoader.load();
 *   ModalService.alert({ title: 'Hello', message: 'World' });
 *
 * @version 1.0.0
 */

const ModalServiceLoader = (function() {
    'use strict';

    const BASE_PATH = '/js/modal-service';

    // Files to load in order (dependencies first)
    const FILES = [
        // Utilities
        'utils/sanitize.js',
        'utils/position.js',

        // Mixins
        'mixins/DraggableMixin.js',
        'mixins/ResizableMixin.js',
        'mixins/FullscreenMixin.js',
        'mixins/PersistenceMixin.js',

        // Utilities
        'utils/helpBanner.js',

        // Base class
        'ModalBase.js',

        // Modal types
        'modals/AlertModal.js',
        'modals/ConfirmModal.js',
        'modals/PromptModal.js',
        'modals/FormModal.js',
        'modals/ContentModal.js',
        'modals/ChatModal.js',
        'modals/AgentModal.js',
        'modals/CreateAssetModal.js',
        'modals/TransformAssetModal.js',

        // Service
        'index.js',

        // CSS (loaded separately)
    ];

    const CSS_FILE = 'modal-service.css';

    let _loaded = false;
    let _loadPromise = null;

    /**
     * Load a script file
     * @private
     */
    function _loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Load a CSS file
     * @private
     */
    function _loadCSS(href) {
        return new Promise((resolve) => {
            // Check if already loaded
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve; // Don't fail on CSS errors
            document.head.appendChild(link);
        });
    }

    return {
        /**
         * Load all ModalService dependencies
         * @returns {Promise<void>}
         */
        async load() {
            if (_loaded) return;
            if (_loadPromise) return _loadPromise;

            _loadPromise = (async () => {
                // Load CSS first
                await _loadCSS(`${BASE_PATH}/${CSS_FILE}`);

                // Load scripts in order
                for (const file of FILES) {
                    await _loadScript(`${BASE_PATH}/${file}`);
                }

                _loaded = true;

                // Extend ModalService with specialized modal factories
                this._extendService();
            })();

            return _loadPromise;
        },

        /**
         * Check if ModalService is loaded
         * @returns {boolean}
         */
        isLoaded() {
            return _loaded && typeof ModalService !== 'undefined';
        },

        /**
         * Extend ModalService with additional factory methods
         * @private
         */
        _extendService() {
            if (typeof ModalService === 'undefined') return;

            /**
             * Create a form modal
             * @param {Object} options - Form options
             * @returns {Promise<Object|null>}
             */
            ModalService.form = function(options) {
                return new Promise(resolve => {
                    const modal = new FormModal({
                        title: options.title || 'Form',
                        fields: options.fields || [],
                        submitText: options.submitText || 'Submit',
                        cancelText: options.cancelText || 'Cancel',
                        onSubmit: (values) => resolve(values),
                        onCancel: () => resolve(null),
                        ...options
                    });

                    this.register(modal);
                    modal.init().open();
                });
            };

            /**
             * Create a content viewer modal
             * @param {Object} options - Content options
             * @returns {ContentModal}
             */
            ModalService.content = function(options) {
                const modal = new ContentModal({
                    title: options.title || '',
                    content: options.content || '',
                    contentType: options.contentType || 'html',
                    ...options
                });

                this.register(modal);
                modal.init().open();
                return modal;
            };

            /**
             * Create a chat modal
             * @param {Object} options - Chat options
             * @returns {ChatModal}
             */
            ModalService.chat = function(options) {
                const modal = new ChatModal({
                    title: options.title || 'Chat',
                    ...options
                });

                this.register(modal);
                modal.init().open();
                return modal;
            };

            /**
             * Create an agent modal
             * @param {Object} options - Agent options
             * @returns {AgentModal}
             */
            ModalService.agent = function(options) {
                const modal = new AgentModal({
                    title: options.title || 'Agent',
                    agentName: options.agentName || options.title || 'AI Agent',
                    ...options
                });

                this.register(modal);
                modal.init().open();
                return modal;
            };

            /**
             * Create a create asset modal
             * @param {Object} options - Create asset options
             * @returns {CreateAssetModal}
             */
            ModalService.createAsset = function(options) {
                const modal = new CreateAssetModal({
                    assetTypes: options.assetTypes || [],
                    onGenerate: options.onGenerate,
                    onImport: options.onImport,
                    onCancel: options.onCancel,
                    ...options
                });

                this.register(modal);
                modal.init().open();
                return modal;
            };

            /**
             * Create a transform asset modal
             * @param {Object} options - Transform options
             * @returns {TransformAssetModal}
             */
            ModalService.transformAsset = function(options) {
                const modal = new TransformAssetModal({
                    sourceContent: options.sourceContent || '',
                    targetType: options.targetType || null,
                    onSave: options.onSave,
                    onCancel: options.onCancel,
                    ...options
                });

                this.register(modal);
                modal.init().open();
                return modal;
            };

            /**
             * Quick helper: Show a success alert
             */
            ModalService.success = function(message, title = 'Success') {
                return this.alert({ title, message, type: 'success' });
            };

            /**
             * Quick helper: Show an error alert
             */
            ModalService.error = function(message, title = 'Error') {
                return this.alert({ title, message, type: 'error' });
            };

            /**
             * Quick helper: Show a warning alert
             */
            ModalService.warning = function(message, title = 'Warning') {
                return this.alert({ title, message, type: 'warning' });
            };

            /**
             * Quick helper: Show an info alert
             */
            ModalService.info = function(message, title = 'Info') {
                return this.alert({ title, message, type: 'info' });
            };

            /**
             * Quick helper: Danger confirmation
             */
            ModalService.confirmDanger = function(message, title = 'Confirm') {
                return this.confirm({
                    title,
                    message,
                    type: 'danger',
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                });
            };
        }
    };
})();

// Auto-load if data attribute is present
// <script src="/js/modal-service/loader.js" data-auto-load></script>
if (document.currentScript && document.currentScript.hasAttribute('data-auto-load')) {
    document.addEventListener('DOMContentLoaded', () => {
        ModalServiceLoader.load();
    });
}

// Expose globally
if (typeof window !== 'undefined') {
    window.ModalServiceLoader = ModalServiceLoader;
}

/**
 * Insight 360 - Rotating Loading Messages
 *
 * Provides rotating status text for loading indicators across the app.
 * Similar to Claude Code's notification system.
 *
 * Usage:
 *   // Start rotating messages
 *   const controller = LoadingMessages.start(element);
 *
 *   // Stop when done
 *   controller.stop();
 *
 *   // Or use with custom messages
 *   const controller = LoadingMessages.start(element, {
 *       messages: ['Custom message 1...', 'Custom message 2...'],
 *       interval: 3000
 *   });
 */

const LoadingMessages = (function() {
    // Default messages - general AI processing
    const DEFAULT_MESSAGES = [
        'Thinking...',
        'Processing your request...',
        'Analyzing context...',
        'Generating response...',
        'Working on it...',
        'Almost there...',
        'Putting the pieces together...',
        'Consulting the knowledge base...',
        'Crafting a thoughtful response...',
        'Running through possibilities...'
    ];

    // Chat-specific messages
    const CHAT_MESSAGES = [
        'Thinking...',
        'Processing your message...',
        'Analyzing context...',
        'Generating response...',
        'Working on it...',
        'Considering your question...',
        'Searching for insights...',
        'Crafting a response...',
        'Connecting the dots...',
        'Almost ready...'
    ];

    // Strategy/S2E messages
    const STRATEGY_MESSAGES = [
        'Analyzing strategy...',
        'Evaluating alignment...',
        'Calculating health scores...',
        'Reviewing objectives...',
        'Processing OKR data...',
        'Generating insights...',
        'Assessing execution...',
        'Building recommendations...',
        'Analyzing patterns...',
        'Finalizing report...'
    ];

    // Briefing messages
    const BRIEFING_MESSAGES = [
        'Gathering your briefing...',
        'Compiling today\'s insights...',
        'Analyzing recent activity...',
        'Preparing your summary...',
        'Reviewing key metrics...',
        'Assembling recommendations...',
        'Checking strategic alignment...',
        'Processing context assets...',
        'Building your daily view...',
        'Almost ready...'
    ];

    // Health check messages
    const HEALTH_CHECK_MESSAGES = [
        'Running health analysis...',
        'Checking alignment scores...',
        'Evaluating execution metrics...',
        'Analyzing OKR progress...',
        'Detecting potential issues...',
        'Calculating overall health...',
        'Reviewing strategic gaps...',
        'Generating observations...',
        'Building recommendations...',
        'Finalizing health report...'
    ];

    // Message presets
    const PRESETS = {
        default: DEFAULT_MESSAGES,
        chat: CHAT_MESSAGES,
        strategy: STRATEGY_MESSAGES,
        briefing: BRIEFING_MESSAGES,
        healthCheck: HEALTH_CHECK_MESSAGES
    };

    /**
     * Start rotating messages on an element
     * @param {HTMLElement} element - Element to update text in
     * @param {Object} options - Configuration options
     * @param {string[]} options.messages - Array of messages to rotate
     * @param {string} options.preset - Use a preset message set ('chat', 'strategy', etc.)
     * @param {number} options.interval - Milliseconds between rotations (default: 2500)
     * @param {boolean} options.randomize - Start at random message (default: true)
     * @returns {Object} Controller with stop() method
     */
    function start(element, options = {}) {
        if (!element) {
            console.warn('LoadingMessages: No element provided');
            return { stop: () => {} };
        }

        const messages = options.messages || PRESETS[options.preset] || DEFAULT_MESSAGES;
        const interval = options.interval || 2500;
        const randomize = options.randomize !== false;

        let currentIndex = randomize ? Math.floor(Math.random() * messages.length) : 0;
        let intervalId = null;
        let isRunning = true;

        // Set initial message
        element.textContent = messages[currentIndex];
        element.classList.add('rotating-text');

        // Start rotation
        intervalId = setInterval(() => {
            if (!isRunning) return;

            // Fade out
            element.classList.add('fade-out');

            setTimeout(() => {
                // Change text
                currentIndex = (currentIndex + 1) % messages.length;
                element.textContent = messages[currentIndex];

                // Fade in
                element.classList.remove('fade-out');
            }, 200); // Match CSS transition duration

        }, interval);

        // Return controller
        return {
            stop: function() {
                isRunning = false;
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                element.classList.remove('rotating-text', 'fade-out');
            },

            // Allow updating the element text manually
            setText: function(text) {
                element.textContent = text;
            },

            // Check if still running
            isRunning: function() {
                return isRunning;
            }
        };
    }

    /**
     * Create a loading indicator with rotating text
     * @param {Object} options - Configuration options
     * @param {string} options.preset - Message preset to use
     * @param {string} options.spinnerSrc - Path to spinner image (default: /assets/loading-spinner.svg)
     * @param {string} options.size - Size class: 'small', 'medium', 'large' (default: 'medium')
     * @returns {Object} { element: HTMLElement, controller: Object }
     */
    function createIndicator(options = {}) {
        const container = document.createElement('div');
        container.className = 'message-loading';

        const spinnerSrc = options.spinnerSrc || '/assets/loading-spinner.svg';
        const sizeClass = options.size === 'small' ? 'small' : options.size === 'large' ? 'large' : '';

        container.innerHTML = `
            <img src="${spinnerSrc}" alt="Loading" class="loading-spinner ${sizeClass}">
            <span class="loading-text"></span>
        `;

        const textElement = container.querySelector('.loading-text');
        const controller = start(textElement, options);

        return {
            element: container,
            controller: controller
        };
    }

    /**
     * Get a random message from a preset
     * @param {string} preset - Preset name
     * @returns {string} Random message
     */
    function getRandomMessage(preset = 'default') {
        const messages = PRESETS[preset] || DEFAULT_MESSAGES;
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Public API
    return {
        start,
        createIndicator,
        getRandomMessage,
        PRESETS
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingMessages;
}

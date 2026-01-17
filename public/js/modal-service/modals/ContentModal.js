/**
 * ContentModal - Modal for displaying rich content (markdown, code, images, video)
 * @extends ModalBase
 * @version 1.1.0
 */

class ContentModal extends ModalBase {
    /**
     * Create a content modal
     * @param {Object} options - Content modal options
     * @param {string} options.title - Modal title
     * @param {string} options.content - Content to display (URL for image/video)
     * @param {string} [options.contentType='html'] - Content type: html, markdown, code, image, video
     * @param {string} [options.language] - Code language for syntax highlighting
     * @param {boolean} [options.copyable=false] - Show copy button for code
     * @param {string} [options.imageAlt] - Alt text for images
     * @param {boolean} [options.autoplay=false] - Autoplay video
     * @param {boolean} [options.loop=false] - Loop video
     * @param {boolean} [options.muted=false] - Mute video
     * @param {string} [options.poster] - Video poster image URL
     */
    constructor(options = {}) {
        super({
            ...options,
            title: options.title || '',
            draggable: options.draggable !== false,
            resizable: options.resizable !== false,
            maximizable: options.maximizable !== false,
            className: `i360-content-modal i360-content-${options.contentType || 'html'} ${options.className || ''}`.trim()
        });

        this.contentOptions = {
            content: options.content || '',
            contentType: options.contentType || 'html',
            language: options.language || 'plaintext',
            copyable: options.copyable || false,
            imageAlt: options.imageAlt || 'Image',
            // Video options
            autoplay: options.autoplay || false,
            loop: options.loop || false,
            muted: options.muted || false,
            controls: options.controls !== false, // Default true
            poster: options.poster || ''
        };
    }

    /**
     * Create modal elements
     * @protected
     */
    _createElements() {
        super._createElements();

        // Render content based on type
        this._renderContent();
    }

    /**
     * Render content based on type
     * @private
     */
    _renderContent() {
        const { content, contentType, language, copyable, imageAlt } = this.contentOptions;

        switch (contentType) {
            case 'markdown':
                this._renderMarkdown(content);
                break;

            case 'code':
                this._renderCode(content, language, copyable);
                break;

            case 'image':
                this._renderImage(content, imageAlt);
                break;

            case 'video':
                this._renderVideo(content);
                break;

            case 'html':
            default:
                this.elements.body.innerHTML = `<div class="i360-content-html">${content}</div>`;
                break;
        }
    }

    /**
     * Render markdown content
     * @private
     */
    _renderMarkdown(content) {
        // Check if marked is available
        if (typeof marked !== 'undefined') {
            const html = marked.parse(content);
            this.elements.body.innerHTML = `<div class="i360-content-markdown">${html}</div>`;
        } else {
            // Basic markdown conversion fallback
            const html = this._basicMarkdown(content);
            this.elements.body.innerHTML = `<div class="i360-content-markdown">${html}</div>`;
        }
    }

    /**
     * Basic markdown conversion fallback
     * @private
     */
    _basicMarkdown(content) {
        let html = this._escapeHtml(content);

        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Bold and italic
        html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Lists
        html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

        // Numbered lists
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Line breaks
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    /**
     * Render code content
     * @private
     */
    _renderCode(content, language, copyable) {
        const codeHtml = this._escapeHtml(content);

        let copyButton = '';
        if (copyable) {
            copyButton = `
                <button type="button" class="i360-content-copy" title="Copy to clipboard">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    <span>Copy</span>
                </button>
            `;
        }

        this.elements.body.innerHTML = `
            <div class="i360-content-code-wrapper">
                ${copyButton}
                <pre class="i360-content-code"><code class="language-${language}">${codeHtml}</code></pre>
            </div>
        `;

        // Bind copy button
        if (copyable) {
            const copyBtn = this.elements.body.querySelector('.i360-content-copy');
            copyBtn.addEventListener('click', () => this._copyToClipboard(content, copyBtn));
        }

        // Apply syntax highlighting if available
        if (typeof hljs !== 'undefined') {
            const codeEl = this.elements.body.querySelector('code');
            hljs.highlightElement(codeEl);
        } else if (typeof Prism !== 'undefined') {
            Prism.highlightAllUnder(this.elements.body);
        }
    }

    /**
     * Copy content to clipboard
     * @private
     */
    async _copyToClipboard(content, button) {
        try {
            await navigator.clipboard.writeText(content);

            // Show success state
            const span = button.querySelector('span');
            const originalText = span.textContent;
            span.textContent = 'Copied!';
            button.classList.add('is-copied');

            setTimeout(() => {
                span.textContent = originalText;
                button.classList.remove('is-copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Render image content
     * @private
     */
    _renderImage(src, alt) {
        this.elements.body.innerHTML = `
            <div class="i360-content-image-wrapper">
                <img src="${this._escapeHtml(src)}" alt="${this._escapeHtml(alt)}" class="i360-content-image" />
            </div>
        `;

        // Handle image load
        const img = this.elements.body.querySelector('img');
        img.addEventListener('load', () => {
            this.emit('imageLoad', { modal: this, width: img.naturalWidth, height: img.naturalHeight });
        });
        img.addEventListener('error', () => {
            this.elements.body.innerHTML = `
                <div class="i360-content-image-error">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p>Failed to load image</p>
                </div>
            `;
            this.emit('imageError', { modal: this, src });
        });
    }

    /**
     * Render video content
     * @private
     */
    _renderVideo(src) {
        const { autoplay, loop, muted, controls, poster } = this.contentOptions;

        // Check if it's a YouTube or Vimeo URL
        const youtubeMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const vimeoMatch = src.match(/(?:vimeo\.com\/)(\d+)/);

        if (youtubeMatch) {
            this._renderYouTube(youtubeMatch[1], autoplay);
        } else if (vimeoMatch) {
            this._renderVimeo(vimeoMatch[1], autoplay);
        } else {
            // Regular video file
            this._renderVideoElement(src, autoplay, loop, muted, controls, poster);
        }
    }

    /**
     * Render YouTube embed
     * @private
     */
    _renderYouTube(videoId, autoplay) {
        const origin = encodeURIComponent(window.location.origin);
        const autoplayParam = autoplay ? '&autoplay=1' : '';
        this.elements.body.innerHTML = `
            <div class="i360-content-video-wrapper i360-content-video-youtube">
                <iframe
                    src="https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&origin=${origin}${autoplayParam}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    class="i360-content-video-iframe"
                ></iframe>
            </div>
        `;

        this.emit('videoLoad', { modal: this, type: 'youtube', videoId });
    }

    /**
     * Render Vimeo embed
     * @private
     */
    _renderVimeo(videoId, autoplay) {
        const autoplayParam = autoplay ? '&autoplay=1' : '';
        this.elements.body.innerHTML = `
            <div class="i360-content-video-wrapper i360-content-video-vimeo">
                <iframe
                    src="https://player.vimeo.com/video/${videoId}?${autoplayParam}"
                    frameborder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowfullscreen
                    class="i360-content-video-iframe"
                ></iframe>
            </div>
        `;

        this.emit('videoLoad', { modal: this, type: 'vimeo', videoId });
    }

    /**
     * Render native video element
     * @private
     */
    _renderVideoElement(src, autoplay, loop, muted, controls, poster) {
        const attrs = [];
        if (autoplay) attrs.push('autoplay');
        if (loop) attrs.push('loop');
        if (muted) attrs.push('muted');
        if (controls) attrs.push('controls');
        if (poster) attrs.push(`poster="${this._escapeHtml(poster)}"`);

        this.elements.body.innerHTML = `
            <div class="i360-content-video-wrapper">
                <video
                    src="${this._escapeHtml(src)}"
                    class="i360-content-video"
                    ${attrs.join(' ')}
                    playsinline
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        `;

        const video = this.elements.body.querySelector('video');

        video.addEventListener('loadedmetadata', () => {
            this.emit('videoLoad', {
                modal: this,
                type: 'native',
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration
            });
        });

        video.addEventListener('error', () => {
            this.elements.body.innerHTML = `
                <div class="i360-content-video-error">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    <p>Failed to load video</p>
                </div>
            `;
            this.emit('videoError', { modal: this, src });
        });

        video.addEventListener('play', () => this.emit('videoPlay', { modal: this }));
        video.addEventListener('pause', () => this.emit('videoPause', { modal: this }));
        video.addEventListener('ended', () => this.emit('videoEnded', { modal: this }));

        // Store reference for control methods
        this.elements.video = video;
    }

    /**
     * Play video (native video only)
     */
    play() {
        if (this.elements.video) {
            this.elements.video.play();
        }
    }

    /**
     * Pause video (native video only)
     */
    pause() {
        if (this.elements.video) {
            this.elements.video.pause();
        }
    }

    /**
     * Toggle play/pause (native video only)
     */
    togglePlay() {
        if (this.elements.video) {
            if (this.elements.video.paused) {
                this.elements.video.play();
            } else {
                this.elements.video.pause();
            }
        }
    }

    /**
     * Seek to time (native video only)
     * @param {number} time - Time in seconds
     */
    seek(time) {
        if (this.elements.video) {
            this.elements.video.currentTime = time;
        }
    }

    /**
     * Escape HTML
     * @private
     */
    _escapeHtml(str) {
        if (typeof Sanitize !== 'undefined' && Sanitize.escapeHtml) {
            return Sanitize.escapeHtml(str);
        }
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Update content
     * @param {string} content - New content
     * @param {string} [contentType] - New content type
     */
    setContent(content, contentType) {
        this.contentOptions.content = content;
        if (contentType) {
            this.contentOptions.contentType = contentType;
        }
        this._renderContent();
    }

    /**
     * Append content (for streaming)
     * @param {string} chunk - Content chunk to append
     */
    appendContent(chunk) {
        this.contentOptions.content += chunk;

        // For code, re-render entirely
        if (this.contentOptions.contentType === 'code') {
            this._renderContent();
        } else {
            // For text/markdown, append to existing element
            const container = this.elements.body.querySelector('.i360-content-html, .i360-content-markdown');
            if (container) {
                if (this.contentOptions.contentType === 'markdown') {
                    this._renderMarkdown(this.contentOptions.content);
                } else {
                    container.innerHTML += chunk;
                }
            }
        }
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentModal;
}

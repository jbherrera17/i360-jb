/**
 * Insight 360 - Content Adapter Service
 * Phase 60: Social Media Publishing
 *
 * Transforms content from the Thought Leadership module into platform-specific
 * formats with appropriate character limits, hashtag handling, and media rules.
 */

const logger = require('./logger');

// Platform content constraints
const PLATFORM_LIMITS = {
    twitter: {
        maxChars: 280,
        maxImages: 4,
        maxVideoLength: 140, // seconds
        supportsThreads: true,
        supportsHashtags: true,
        supportsLinks: true,
        linkChars: 23 // t.co shortened
    },
    linkedin: {
        maxChars: 3000,
        maxImages: 20,
        maxVideoLength: 600,
        supportsHashtags: true,
        supportsLinks: true
    },
    instagram: {
        maxChars: 2200,
        maxHashtags: 30,
        maxImages: 10,
        supportsHashtags: true,
        supportsLinks: false // links only in bio
    },
    tiktok: {
        maxChars: 2200,
        maxHashtags: 30,
        supportsHashtags: true,
        supportsLinks: false
    },
    facebook: {
        maxChars: 63206,
        maxImages: 10,
        supportsHashtags: true,
        supportsLinks: true
    },
    youtube: {
        titleMaxChars: 100,
        descriptionMaxChars: 5000,
        maxTags: 500,
        supportsHashtags: true,
        supportsLinks: true
    },
    pinterest: {
        titleMaxChars: 100,
        descriptionMaxChars: 500,
        supportsHashtags: true,
        supportsLinks: true,
        requiresImage: true
    },
    threads: {
        maxChars: 500,
        maxImages: 10,
        supportsHashtags: true,
        supportsLinks: true
    }
};

/**
 * Extract hashtags from text
 */
function extractHashtags(text) {
    const matches = text.match(/#\w+/g);
    return matches || [];
}

/**
 * Strip hashtags from text
 */
function stripHashtags(text) {
    return text.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Truncate text to character limit with ellipsis
 */
function truncateText(text, maxChars, suffix = '...') {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars - suffix.length).trim() + suffix;
}

/**
 * Split long content into a Twitter thread
 */
function createTwitterThread(content, hashtags = []) {
    const maxTweetChars = 280;
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.slice(0, 3).join(' ') : '';

    // If it fits in one tweet, return as-is
    if (content.length + hashtagStr.length <= maxTweetChars) {
        return [content + hashtagStr];
    }

    const tweets = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let currentTweet = '';

    for (const sentence of sentences) {
        const threadIndicator = tweets.length > 0 ? '' : '';
        const testTweet = currentTweet
            ? `${currentTweet} ${sentence}`
            : `${threadIndicator}${sentence}`;

        // Reserve space for thread counter (e.g., " 1/5")
        if (testTweet.length > maxTweetChars - 5) {
            if (currentTweet) {
                tweets.push(currentTweet);
                currentTweet = sentence;
            } else {
                // Single sentence too long, truncate
                tweets.push(truncateText(sentence, maxTweetChars - 5));
                currentTweet = '';
            }
        } else {
            currentTweet = testTweet;
        }
    }

    if (currentTweet) {
        tweets.push(currentTweet);
    }

    // Add thread numbering and hashtags to last tweet
    const total = tweets.length;
    return tweets.map((tweet, i) => {
        const num = `${i + 1}/${total}`;
        if (i === total - 1 && hashtagStr) {
            return truncateText(`${tweet}${hashtagStr}`, maxTweetChars - num.length - 1) + ` ${num}`;
        }
        return `${tweet} ${num}`;
    });
}

/**
 * Adapt content for a specific platform
 *
 * @param {string} content - Original content text
 * @param {string} platform - Target platform identifier
 * @param {Object} options - Additional options
 * @param {string[]} options.hashtags - Hashtags to include
 * @param {string} options.articleUrl - Link to the full article
 * @param {string} options.articleTitle - Title of the article
 * @param {string[]} options.mediaUrls - Media attachment URLs
 * @returns {Object} Adapted content for the platform
 */
function adaptContent(content, platform, options = {}) {
    const {
        hashtags = [],
        articleUrl = null,
        articleTitle = null,
        mediaUrls = []
    } = options;

    const limits = PLATFORM_LIMITS[platform];
    if (!limits) {
        logger.warn(`[ContentAdapter] Unknown platform: ${platform}, returning raw content`);
        return { text: content, media: mediaUrls };
    }

    // Extract existing hashtags from content
    const contentHashtags = extractHashtags(content);
    const allHashtags = [...new Set([...hashtags, ...contentHashtags])];
    const cleanContent = stripHashtags(content);

    switch (platform) {
        case 'twitter':
            return adaptForTwitter(cleanContent, allHashtags, articleUrl, mediaUrls);

        case 'linkedin':
            return adaptForLinkedIn(cleanContent, allHashtags, articleUrl, articleTitle, mediaUrls);

        case 'instagram':
            return adaptForInstagram(cleanContent, allHashtags, mediaUrls);

        case 'tiktok':
            return adaptForTikTok(cleanContent, allHashtags);

        case 'facebook':
            return adaptForFacebook(cleanContent, allHashtags, articleUrl, articleTitle, mediaUrls);

        case 'youtube':
            return adaptForYouTube(cleanContent, allHashtags, articleUrl, articleTitle);

        case 'pinterest':
            return adaptForPinterest(cleanContent, allHashtags, articleUrl, mediaUrls);

        case 'threads':
            return adaptForThreads(cleanContent, allHashtags, mediaUrls);

        default:
            return { text: content, media: mediaUrls };
    }
}

function adaptForTwitter(content, hashtags, articleUrl, mediaUrls) {
    const limits = PLATFORM_LIMITS.twitter;
    const hashtagStr = hashtags.slice(0, 3).join(' ');
    const linkStr = articleUrl ? `\n${articleUrl}` : '';

    const available = limits.maxChars - (articleUrl ? limits.linkChars + 1 : 0) - (hashtagStr ? hashtagStr.length + 2 : 0);

    if (content.length <= available) {
        const text = [content, hashtagStr, articleUrl].filter(Boolean).join('\n\n');
        return { text: truncateText(text, limits.maxChars), media: mediaUrls.slice(0, limits.maxImages) };
    }

    // Content too long -- create a thread
    const thread = createTwitterThread(content, hashtags);
    // Add link to first tweet if provided
    if (articleUrl && thread.length > 0) {
        thread[0] = truncateText(`${thread[0]}\n${articleUrl}`, limits.maxChars);
    }

    return {
        text: thread[0],
        thread,
        isThread: true,
        media: mediaUrls.slice(0, limits.maxImages)
    };
}

function adaptForLinkedIn(content, hashtags, articleUrl, articleTitle, mediaUrls) {
    const limits = PLATFORM_LIMITS.linkedin;
    const hashtagStr = hashtags.slice(0, 5).join(' ');

    let text = content;
    if (articleUrl) {
        text += `\n\n${articleTitle ? `📖 ${articleTitle}\n` : ''}${articleUrl}`;
    }
    if (hashtagStr) {
        text += `\n\n${hashtagStr}`;
    }

    return {
        text: truncateText(text, limits.maxChars),
        media: mediaUrls.slice(0, limits.maxImages),
        articleUrl,
        articleTitle
    };
}

function adaptForInstagram(content, hashtags, mediaUrls) {
    const limits = PLATFORM_LIMITS.instagram;
    const hashtagStr = hashtags.slice(0, limits.maxHashtags).join(' ');

    // Instagram: hashtags go at the end, separated by line breaks
    let text = content;
    if (hashtagStr) {
        text += '\n\n.\n.\n.\n' + hashtagStr;
    }

    return {
        text: truncateText(text, limits.maxChars),
        media: mediaUrls.slice(0, limits.maxImages),
        requiresMedia: true
    };
}

function adaptForTikTok(content, hashtags) {
    const limits = PLATFORM_LIMITS.tiktok;
    const hashtagStr = hashtags.slice(0, limits.maxHashtags).join(' ');

    let text = content;
    if (hashtagStr) {
        text += '\n\n' + hashtagStr;
    }

    return {
        text: truncateText(text, limits.maxChars),
        requiresVideo: true
    };
}

function adaptForFacebook(content, hashtags, articleUrl, articleTitle, mediaUrls) {
    const limits = PLATFORM_LIMITS.facebook;
    const hashtagStr = hashtags.slice(0, 5).join(' ');

    let text = content;
    if (articleUrl) {
        text += `\n\n🔗 ${articleTitle || 'Read more'}: ${articleUrl}`;
    }
    if (hashtagStr) {
        text += `\n\n${hashtagStr}`;
    }

    return {
        text: truncateText(text, limits.maxChars),
        media: mediaUrls.slice(0, limits.maxImages),
        articleUrl
    };
}

function adaptForYouTube(content, hashtags, articleUrl, articleTitle) {
    const limits = PLATFORM_LIMITS.youtube;

    // YouTube community post or video description
    const title = articleTitle
        ? truncateText(articleTitle, limits.titleMaxChars)
        : truncateText(content.split('\n')[0] || content.substring(0, 80), limits.titleMaxChars);

    let description = content;
    if (articleUrl) {
        description += `\n\n🔗 Full article: ${articleUrl}`;
    }
    if (hashtags.length > 0) {
        description += '\n\n' + hashtags.slice(0, 15).join(' ');
    }

    return {
        title,
        text: truncateText(description, limits.descriptionMaxChars),
        tags: hashtags.map(h => h.replace('#', '')).slice(0, 30)
    };
}

function adaptForPinterest(content, hashtags, articleUrl, mediaUrls) {
    const limits = PLATFORM_LIMITS.pinterest;

    const title = truncateText(content.split('\n')[0] || content.substring(0, 80), limits.titleMaxChars);

    let description = content;
    if (hashtags.length > 0) {
        description += '\n\n' + hashtags.slice(0, 20).join(' ');
    }

    return {
        title,
        text: truncateText(description, limits.descriptionMaxChars),
        link: articleUrl,
        media: mediaUrls.slice(0, 1),
        requiresImage: true
    };
}

function adaptForThreads(content, hashtags, mediaUrls) {
    const limits = PLATFORM_LIMITS.threads;
    const hashtagStr = hashtags.slice(0, 5).join(' ');

    let text = content;
    if (hashtagStr) {
        text += '\n\n' + hashtagStr;
    }

    return {
        text: truncateText(text, limits.maxChars),
        media: mediaUrls.slice(0, limits.maxImages)
    };
}

/**
 * Adapt content for multiple platforms at once
 *
 * @param {string} content - Original content
 * @param {string[]} platforms - Target platforms
 * @param {Object} options - Adaptation options
 * @returns {Object} Map of platform -> adapted content
 */
function adaptForAllPlatforms(content, platforms, options = {}) {
    const result = {};
    for (const platform of platforms) {
        try {
            result[platform] = adaptContent(content, platform, options);
        } catch (err) {
            logger.error(`[ContentAdapter] Failed to adapt for ${platform}:`, err);
            result[platform] = { text: content, error: err.message };
        }
    }
    return result;
}

/**
 * Get platform limits info (for UI display)
 */
function getPlatformLimits() {
    return PLATFORM_LIMITS;
}

/**
 * Get supported platforms list
 */
function getSupportedPlatforms() {
    return [
        { id: 'twitter', name: 'Twitter / X', icon: 'twitter', color: '#1DA1F2' },
        { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin', color: '#0A66C2' },
        { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E4405F' },
        { id: 'tiktok', name: 'TikTok', icon: 'music', color: '#000000' },
        { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2' },
        { id: 'youtube', name: 'YouTube', icon: 'youtube', color: '#FF0000' },
        { id: 'pinterest', name: 'Pinterest', icon: 'pin', color: '#BD081C' },
        { id: 'threads', name: 'Threads', icon: 'at-sign', color: '#000000' }
    ];
}

module.exports = {
    adaptContent,
    adaptForAllPlatforms,
    getPlatformLimits,
    getSupportedPlatforms,
    PLATFORM_LIMITS,
    // Utilities
    extractHashtags,
    stripHashtags,
    truncateText,
    createTwitterThread
};

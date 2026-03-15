/**
 * PII Redaction Service
 * Phase 73: Embeddable Chat Widgets
 *
 * Scans visitor messages and redacts PII before storage.
 * Required by compliance controls R-01/R-02 (HIPAA PHI avoidance).
 *
 * Design decisions:
 * - Conservative patterns: prefer false positives (over-redact) over false negatives (leak PII)
 * - Fail-safe: if redaction throws, caller MUST NOT store the message
 * - Pre-chat fields (email, name) stored separately in widget_sessions, not in message content
 * - Redaction markers are descriptive: [REDACTED-EMAIL], [REDACTED-PHONE], etc.
 */

const logger = require('./logger');

// ── Redaction Patterns ──────────────────────────────────────

const REDACTION_PATTERNS = [
    {
        type: 'EMAIL',
        // Standard email pattern
        pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        replacement: '[REDACTED-EMAIL]'
    },
    {
        type: 'PHONE',
        // US phone: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1xxxxxxxxxx
        pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        replacement: '[REDACTED-PHONE]'
    },
    {
        type: 'SSN',
        // Social Security Number: xxx-xx-xxxx
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[REDACTED-SSN]'
    },
    {
        type: 'DOB',
        // Date of birth patterns: MM/DD/YYYY, MM-DD-YYYY, Month DD YYYY
        pattern: /\b(?:0?[1-9]|1[0-2])[\/\-](?:0?[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g,
        replacement: '[REDACTED-DOB]'
    },
    {
        type: 'DOB_WRITTEN',
        // Written dates: "January 15, 1990", "Jan 15 1990"
        pattern: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi,
        replacement: '[REDACTED-DOB]'
    },
    {
        type: 'CREDIT_CARD',
        // Credit card: 4 groups of 4 digits, with optional separators
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: '[REDACTED-CC]'
    },
    {
        type: 'MRN',
        // Medical Record Number: common patterns like MRN: 12345, MRN#12345
        pattern: /\b(?:MRN|Medical\s+Record(?:\s+Number)?)\s*[:#]?\s*\d{4,10}\b/gi,
        replacement: '[REDACTED-MRN]'
    },
    {
        type: 'ADDRESS',
        // Street address: number + street name + type
        pattern: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Court|Ct|Way|Place|Pl|Circle|Cir|Trail|Trl)\b\.?/gi,
        replacement: '[REDACTED-ADDRESS]'
    },
    {
        type: 'ZIP',
        // ZIP code (only when preceded by state abbreviation or comma)
        pattern: /(?:,\s*|\b[A-Z]{2}\s+)\d{5}(?:-\d{4})?\b/g,
        replacement: '[REDACTED-ZIP]'
    },
    {
        type: 'INSURANCE_ID',
        // Insurance/policy ID patterns
        pattern: /\b(?:insurance|policy|member|subscriber|group)\s*(?:id|#|number|no)?\s*[:#]?\s*[A-Z0-9]{6,15}\b/gi,
        replacement: '[REDACTED-INSURANCE]'
    }
];

// ── Main Redaction Function ─────────────────────────────────

/**
 * Redact PII from a text string.
 *
 * @param {string} text - The raw visitor message
 * @returns {{ redactedText: string, redactions: object[] }} - Redacted text and list of redaction types applied
 * @throws {Error} - If redaction fails. Caller MUST NOT store the original text.
 */
function redactPII(text) {
    if (!text || typeof text !== 'string') {
        return { redactedText: text || '', redactions: [] };
    }

    let redactedText = text;
    const redactions = [];

    for (const { type, pattern, replacement } of REDACTION_PATTERNS) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;

        const matches = redactedText.match(pattern);
        if (matches && matches.length > 0) {
            redactions.push({
                type,
                count: matches.length
            });
            redactedText = redactedText.replace(pattern, replacement);
        }
    }

    return { redactedText, redactions };
}

/**
 * Check if a text string contains PII (without redacting).
 * Useful for validation checks.
 *
 * @param {string} text - Text to check
 * @returns {{ hasPII: boolean, types: string[] }} - Whether PII was found and which types
 */
function detectPII(text) {
    if (!text || typeof text !== 'string') {
        return { hasPII: false, types: [] };
    }

    const types = [];

    for (const { type, pattern } of REDACTION_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
            types.push(type);
        }
    }

    return { hasPII: types.length > 0, types };
}

/**
 * Redact PII from a message and log the redaction event.
 * This is the primary entry point for the widget chat pipeline.
 *
 * @param {string} message - Raw visitor message
 * @param {string} widgetId - Widget ID for logging context
 * @returns {{ redactedMessage: string, redactionCount: number, redactionTypes: string[] }}
 * @throws {Error} - Caller MUST NOT store the original message if this throws
 */
function redactAndLog(message, widgetId) {
    try {
        const { redactedText, redactions } = redactPII(message);
        const totalRedactions = redactions.reduce((sum, r) => sum + r.count, 0);

        if (totalRedactions > 0) {
            logger.info('[PII-Redaction] Redacted PII from widget message', {
                widgetId,
                redactionCount: totalRedactions,
                types: redactions.map(r => r.type)
                // Never log the original message content
            });
        }

        return {
            redactedMessage: redactedText,
            redactionCount: totalRedactions,
            redactionTypes: redactions.map(r => r.type)
        };
    } catch (error) {
        logger.error('[PII-Redaction] CRITICAL: Redaction failed — message must NOT be stored', {
            widgetId,
            error: error.message
        });
        throw new Error('PII redaction failed — message cannot be stored safely');
    }
}

module.exports = {
    redactPII,
    detectPII,
    redactAndLog
};

/**
 * ESLint Plugin: no-raw-fetch
 *
 * Prevents raw fetch() calls to /api/ endpoints in frontend code.
 * All API calls must use authFetch() to ensure authentication tokens
 * and x-org-id headers are attached for multi-tenant data isolation.
 *
 * Phase 82: Structural prevention of cross-org data leakage.
 */

module.exports = {
    rules: {
        'no-raw-fetch': {
            meta: {
                type: 'problem',
                docs: {
                    description: 'Disallow raw fetch() calls to /api/ endpoints. Use authFetch() instead.',
                    category: 'Security',
                    recommended: true
                },
                messages: {
                    noRawFetch: 'Use authFetch() instead of fetch() for API calls. Raw fetch() sends no auth token or org context, causing multi-tenant data leakage.'
                },
                schema: []
            },
            create(context) {
                return {
                    CallExpression(node) {
                        // Only flag calls to `fetch` (not `authFetch`, `window.authFetch`, etc.)
                        const callee = node.callee;
                        const isFetchCall =
                            (callee.type === 'Identifier' && callee.name === 'fetch') ||
                            (callee.type === 'MemberExpression' &&
                                callee.object.type === 'Identifier' &&
                                callee.object.name === 'window' &&
                                callee.property.type === 'Identifier' &&
                                callee.property.name === 'fetch');

                        if (!isFetchCall) return;
                        if (node.arguments.length === 0) return;

                        const firstArg = node.arguments[0];

                        // Check string literal: fetch('/api/...')
                        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
                            if (firstArg.value.startsWith('/api/')) {
                                context.report({ node, messageId: 'noRawFetch' });
                            }
                            return;
                        }

                        // Check template literal: fetch(`/api/...`)
                        if (firstArg.type === 'TemplateLiteral' && firstArg.quasis.length > 0) {
                            const firstQuasi = firstArg.quasis[0].value.raw;
                            if (firstQuasi.startsWith('/api/')) {
                                context.report({ node, messageId: 'noRawFetch' });
                            }
                        }
                    }
                };
            }
        }
    }
};

/**
 * Platform Admin — Pricing Sync to Marketing Site.
 *
 * requirePlatformAdmin is applied by the coordinator. requireAdminWrite is per-route.
 */

const express = require('express');

const websiteSyncService = require('../../services/websiteSyncService');
const pricingDiffService = require('../../services/pricingDiffService');
const githubPrService = require('../../services/githubPrService');

module.exports = function (supabase, requireAdminWrite) {
    const router = express.Router();


    // ============================================
    // PRICING SYNC TO SYNERGI WEBSITE (Phase 87 — REQ-003)
    // ============================================
    // POST /sync-pricing-to-website         — open a PR with the latest payload
    // POST /sync-pricing-to-website/preview — dry run; return payload + diff
    // GET  /sync-pricing-status              — last 10 sync attempts

    /**
     * Internal helper: build payload, find prior payload, compute diff.
     * Returns { payload, sha, prevPayload, diffMarkdown }.
     */
    async function buildPayloadWithDiff(generatedBy) {
        const { payload, sha256 } = await websiteSyncService.buildPricingPayload(supabase, { generatedBy });

        // Most recent successfully-opened or merged sync to compare against
        const { data: prior } = await supabase
            .from('pricing_sync_history')
            .select('payload, payload_sha256')
            .in('status', ['opened', 'merged'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const prevPayload = prior ? prior.payload : null;
        const diffMarkdown = pricingDiffService.diffPayloads(prevPayload, payload);

        return { payload, sha256, prevPayload, diffMarkdown, priorSha: prior?.payload_sha256 };
    }

    /**
     * POST /api/platform/sync-pricing-to-website
     * Auto-on-save trigger. Opens a GitHub PR against synergi-website with
     * the new pricing-tiers.json. Idempotent: if the SHA matches the most
     * recent successful sync, status='skipped' is recorded and no PR opens.
     */
    router.post('/sync-pricing-to-website', requireAdminWrite, async (req, res) => {
        try {
            if (process.env.WEBSITE_SYNC_ENABLED === 'false') {
                return res.status(503).json({ success: false, error: 'WEBSITE_SYNC_ENABLED is false — sync is disabled' });
            }

            const { payload, sha256, priorSha, diffMarkdown } = await buildPayloadWithDiff(req.userEmail || req.userId);

            // Idempotency short-circuit
            if (priorSha === sha256) {
                await supabase.from('pricing_sync_history').insert({
                    triggered_by_user_id: req.userId,
                    triggered_by_email: req.userEmail || null,
                    payload,
                    payload_sha256: sha256,
                    diff_markdown: diffMarkdown,
                    status: 'skipped'
                });
                return res.json({
                    success: true,
                    synced: false,
                    reason: 'No changes since last sync (payload SHA matches)',
                    sha256
                });
            }

            // Open the PR
            const summary = summarizeFromDiff(diffMarkdown);
            let pr;
            try {
                pr = await githubPrService.openPricingPr({ payload, summary, diffMarkdown });
            } catch (err) {
                await supabase.from('pricing_sync_history').insert({
                    triggered_by_user_id: req.userId,
                    triggered_by_email: req.userEmail || null,
                    payload,
                    payload_sha256: sha256,
                    diff_markdown: diffMarkdown,
                    status: 'failed',
                    error: err.message || String(err)
                });

                const status = err.code === 'AUTH_FAILED' ? 401
                             : err.code === 'PERMISSION_DENIED' ? 403
                             : err.code === 'CONFIG' ? 500
                             : 502;
                return res.status(status).json({ success: false, error: err.message, code: err.code || 'UNKNOWN' });
            }

            // Record success
            await supabase.from('pricing_sync_history').insert({
                triggered_by_user_id: req.userId,
                triggered_by_email: req.userEmail || null,
                payload,
                payload_sha256: sha256,
                diff_markdown: diffMarkdown,
                pr_url: pr.pr_url,
                pr_number: pr.pr_number,
                branch_name: pr.branch_name,
                status: 'opened'
            });

            res.json({
                success: true,
                synced: true,
                pr_url: pr.pr_url,
                pr_number: pr.pr_number,
                branch_name: pr.branch_name,
                sha256
            });
        } catch (error) {
            console.error('Error in sync-pricing-to-website:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * POST /api/platform/sync-pricing-to-website/preview
     * Dry run — builds the payload + diff but doesn't open a PR.
     * Useful for showing the admin "here's what would happen" before save.
     */
    router.post('/sync-pricing-to-website/preview', async (req, res) => {
        try {
            const { payload, sha256, priorSha, diffMarkdown } = await buildPayloadWithDiff(req.userEmail || req.userId);
            res.json({
                success: true,
                payload,
                sha256,
                diff_markdown: diffMarkdown,
                would_skip: priorSha === sha256
            });
        } catch (error) {
            console.error('Error in sync preview:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * GET /api/platform/sync-pricing-status
     * Returns the most recent sync attempt and a short history list.
     */
    router.get('/sync-pricing-status', async (req, res) => {
        try {
            const { data: latest } = await supabase
                .from('pricing_sync_history')
                .select('id, triggered_by_email, payload_sha256, pr_url, pr_number, branch_name, status, error, created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const { data: history } = await supabase
                .from('pricing_sync_history')
                .select('id, triggered_by_email, payload_sha256, pr_url, pr_number, branch_name, status, error, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            res.json({
                success: true,
                data: { latest: latest || null, history: history || [] }
            });
        } catch (error) {
            console.error('Error fetching sync status:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Internal: build a short PR-title summary from the markdown diff.
     * "## Pricing Changes\n\n- **Business** monthly..." → "Pricing change: Business monthly"
     */
    function summarizeFromDiff(md) {
        if (!md) return 'sync from Insight 360';
        const sections = ['Pricing Changes', 'Module Access Changes', 'Add-on Price Changes', 'Marketing Copy Changes', 'New / Removed Tiers', 'New / Removed Modules'];
        for (const s of sections) {
            if (md.includes(`## ${s}`)) return s.toLowerCase();
        }
        return 'sync from Insight 360';
    }


    return router;
};

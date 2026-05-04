/**
 * Thought Leadership — Publishing Pipeline (Phase 72).
 *
 * Module-access gating is applied by the coordinator (see ./index.js).
 */

const express = require('express');
const notionService = require('../../services/notionService');

module.exports = function (supabase) {
    const router = express.Router();

    // ============================================================================
    // PUBLISHING PIPELINE ENDPOINTS (Phase 72)
    // ============================================================================

    /**
     * POST /api/thought-leadership/publish/web
     * Publish article to the public blog
     */
    router.post('/publish/web', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const { calendar_entry_id } = req.body;
            if (!calendar_entry_id) return res.status(400).json({ error: 'calendar_entry_id is required' });

            // Get calendar entry with article content
            const { data: entry, error: entryErr } = await supabase
                .from('content_calendar_entries')
                .select('*, content_pillars(name, color)')
                .eq('id', calendar_entry_id)
                .single();

            if (entryErr || !entry) return res.status(404).json({ error: 'Calendar entry not found' });
            if (!entry.article_markdown) return res.status(400).json({ error: 'No article content to publish. Generate an article first.' });

            // Get user profile for author info
            const { data: profile } = await supabase
                .from('thought_leadership_profiles')
                .select('author_bio')
                .eq('user_id', userId)
                .single();

            const { data: user } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', userId)
                .single();

            // Generate slug
            const { generateSlug, renderMarkdown } = require('./blog');
            let slug = generateSlug(entry.title);

            // Handle slug collision — append suffix
            const { data: existing } = await supabase
                .from('blog_articles')
                .select('slug')
                .like('slug', `${slug}%`);

            if (existing && existing.length > 0) {
                const existingSlugs = existing.map(e => e.slug);
                if (existingSlugs.includes(slug)) {
                    let suffix = 2;
                    while (existingSlugs.includes(`${slug}-${suffix}`)) suffix++;
                    slug = `${slug}-${suffix}`;
                }
            }

            // Render HTML from markdown (sanitized)
            const articleHtml = renderMarkdown(entry.article_markdown);

            // Extract subtitle from first paragraph if not set
            const subtitleMatch = entry.article_markdown.match(/^(?:#.*\n+)?([^#\n].{20,150})/);
            const subtitle = subtitleMatch ? subtitleMatch[1].replace(/\*\*/g, '').trim() : null;

            // Create SEO metadata
            const seoTitle = entry.title.substring(0, 60);
            const seoDescription = (subtitle || entry.title).substring(0, 160);

            // Upsert blog article
            const { data: blogArticle, error: blogErr } = await supabase
                .from('blog_articles')
                .upsert({
                    calendar_entry_id,
                    org_id: orgId,
                    user_id: userId,
                    slug,
                    title: entry.title,
                    subtitle,
                    article_html: articleHtml,
                    article_markdown: entry.article_markdown,
                    header_image_url: entry.header_image_url || null,
                    author_name: user?.full_name || 'Synergi AI',
                    author_bio: profile?.author_bio || null,
                    pillar: entry.content_pillars?.name || null,
                    pillar_color: entry.content_pillars?.color || null,
                    published_at: new Date().toISOString(),
                    seo_title: seoTitle,
                    seo_description: seoDescription,
                    og_image_url: entry.header_image_url || null,
                    is_published: true
                }, { onConflict: 'calendar_entry_id' })
                .select()
                .single();

            if (blogErr) throw blogErr;

            // Update calendar entry
            await supabase
                .from('content_calendar_entries')
                .update({
                    blog_slug: slug,
                    blog_published: true,
                    blog_published_at: new Date().toISOString()
                })
                .eq('id', calendar_entry_id);

            const publicUrl = `/blog/${slug}`;

            console.log(`[TL Publish] Published to web: ${publicUrl}`);

            res.json({
                success: true,
                url: publicUrl,
                slug,
                blog_article_id: blogArticle.id
            });
        } catch (err) {
            console.error('Error publishing to web:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/publish/notion
     * Publish full article page to Notion Content Calendar
     */
    router.post('/publish/notion', async (req, res) => {
        try {
            const userId = req.userId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const { calendar_entry_id, publish_url } = req.body;
            if (!calendar_entry_id) return res.status(400).json({ error: 'calendar_entry_id is required' });

            // Get calendar entry with all content
            const { data: entry, error: entryErr } = await supabase
                .from('content_calendar_entries')
                .select('*, content_pillars(name)')
                .eq('id', calendar_entry_id)
                .single();

            if (entryErr || !entry) return res.status(404).json({ error: 'Calendar entry not found' });
            if (!entry.article_markdown) return res.status(400).json({ error: 'No article content. Generate an article first.' });

            // Derive quarter and month/yr from scheduled_date
            const pubDate = entry.scheduled_date ? new Date(entry.scheduled_date) : new Date();
            const quarter = `Q${Math.ceil((pubDate.getMonth() + 1) / 3)} ${pubDate.getFullYear()}`;
            const monthYr = pubDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            // Publish to Notion with full page structure
            const result = await notionService.publishArticlePage(
                {
                    title: entry.title,
                    articleMarkdown: entry.article_markdown,
                    articleAiOptimized: entry.article_ai_optimized || null,
                    headerImageUrl: entry.header_image_url || null,
                    linkedinPosts: entry.linkedin_posts || []
                },
                {
                    pillar: entry.content_pillars?.name || null,
                    goal: entry.goal || null,
                    monthlyTopic: entry.monthly_topic || null,
                    quarter,
                    monthYr,
                    scheduledDate: entry.scheduled_date || new Date().toISOString().split('T')[0],
                    url: publish_url || entry.blog_slug ? `/blog/${entry.blog_slug}` : null,
                    publishTargets: {
                        website: entry.publish_website || !!entry.blog_published,
                        substack: entry.publish_substack || false,
                        li_personal: entry.publish_li_personal || false,
                        li_page: entry.publish_li_page || false,
                        x: entry.publish_x || false,
                        fb_personal: entry.publish_facebook_personal || false,
                        fb_page: entry.publish_facebook_page || false,
                        fb_group: entry.publish_facebook_group || false
                    }
                }
            );

            // Update calendar entry
            await supabase
                .from('content_calendar_entries')
                .update({
                    notion_page_id: result.pageId,
                    notion_url: result.url,
                    notion_content_synced: true,
                    notion_content_synced_at: new Date().toISOString(),
                    sync_status: 'synced'
                })
                .eq('id', calendar_entry_id);

            console.log(`[TL Publish] Published to Notion: ${result.url}`);

            res.json({
                success: true,
                notion_page_id: result.pageId,
                notion_url: result.url,
                blocks_created: result.blocksCreated
            });
        } catch (err) {
            console.error('Error publishing to Notion:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/thought-leadership/publish/substack
     * Publish article to Substack (beta)
     */
    router.post('/publish/substack', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const { calendar_entry_id } = req.body;
            if (!calendar_entry_id) return res.status(400).json({ error: 'calendar_entry_id is required' });

            const substackService = require('../services/substackService');

            // Check if Substack is configured
            const configured = await substackService.isConfigured(orgId);
            if (!configured) {
                return res.status(400).json({
                    error: 'Substack not configured',
                    hint: 'Add your Substack credentials in Thought Leadership settings'
                });
            }

            // Get calendar entry
            const { data: entry, error: entryErr } = await supabase
                .from('content_calendar_entries')
                .select('title, article_markdown, header_image_url')
                .eq('id', calendar_entry_id)
                .single();

            if (entryErr || !entry) return res.status(404).json({ error: 'Calendar entry not found' });
            if (!entry.article_markdown) return res.status(400).json({ error: 'No article content. Generate an article first.' });

            const result = await substackService.publishArticle(orgId, {
                title: entry.title,
                subtitle: '',
                markdown: entry.article_markdown,
                headerImageUrl: entry.header_image_url || null
            });

            console.log(`[TL Publish] Published to Substack: ${result.url}`);

            res.json({
                success: true,
                beta: true,
                substack_url: result.url,
                substack_post_id: result.postId
            });
        } catch (err) {
            console.error('Error publishing to Substack:', err);
            res.status(500).json({
                error: err.message,
                beta: true,
                hint: err.message.includes('expired') ? 'Refresh your Substack cookies in settings' : undefined
            });
        }
    });

    /**
     * POST /api/thought-leadership/publish/package
     * Unified publish to all selected targets in one action
     * Runs pre-flight checks first, then publishes to each target
     */
    router.post('/publish/package', async (req, res) => {
        try {
            const userId = req.userId;
            const orgId = req.headers['x-org-id'] || req.orgId;
            if (!userId) return res.status(401).json({ error: 'User ID required' });

            const {
                calendar_entry_id,
                targets = ['web', 'notion'],
                social_platforms = [],
                social_content
            } = req.body;

            if (!calendar_entry_id) return res.status(400).json({ error: 'calendar_entry_id is required' });

            const results = {};
            const startTime = Date.now();

            // Publish to Web
            if (targets.includes('web')) {
                try {
                    const webRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/thought-leadership/publish/web`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': req.headers.cookie,
                            'x-org-id': orgId
                        },
                        body: JSON.stringify({ calendar_entry_id })
                    });
                    results.web = await webRes.json();
                } catch (webErr) {
                    results.web = { success: false, error: webErr.message };
                }
            }

            // Publish to Notion
            if (targets.includes('notion')) {
                try {
                    const notionRes = await fetch(`http://localhost:${process.env.PORT || 3000}/api/thought-leadership/publish/notion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': req.headers.cookie,
                            'x-org-id': orgId
                        },
                        body: JSON.stringify({
                            calendar_entry_id,
                            publish_url: results.web?.url || null
                        })
                    });
                    results.notion = await notionRes.json();
                } catch (notionErr) {
                    results.notion = { success: false, error: notionErr.message };
                }
            }

            // Publish to Social Media (via Postiz)
            if (targets.includes('social') && social_platforms.length > 0) {
                try {
                    const { data: entry } = await supabase
                        .from('content_calendar_entries')
                        .select('title, article_markdown, header_image_url, linkedin_posts')
                        .eq('id', calendar_entry_id)
                        .single();

                    const contentAdapter = require('../services/contentAdapterService');
                    const postizService = require('../services/postizService');
                    const postContent = social_content || entry?.title || '';

                    const adapted = contentAdapter.adaptForAllPlatforms(postContent, {
                        articleUrl: results.web?.url ? `${process.env.ALLOWED_ORIGINS || 'http://localhost:3000'}${results.web.url}` : null,
                        articleTitle: entry?.title,
                        hashtags: []
                    });

                    const socialResult = await postizService.createPost(orgId, userId, {
                        platforms: social_platforms,
                        content: postContent,
                        mediaUrls: entry?.header_image_url ? [entry.header_image_url] : [],
                        platformContent: adapted,
                        sourceType: 'thought_leadership',
                        sourceId: calendar_entry_id
                    });

                    results.social = { success: true, post_id: socialResult.id, platforms: social_platforms };
                } catch (socialErr) {
                    results.social = { success: false, error: socialErr.message };
                }
            }

            // Publish to Substack (beta)
            if (targets.includes('substack')) {
                try {
                    const substackService = require('../services/substackService');
                    const { data: entry } = await supabase
                        .from('content_calendar_entries')
                        .select('title, article_markdown, header_image_url')
                        .eq('id', calendar_entry_id)
                        .single();

                    const substackResult = await substackService.publishArticle(orgId, {
                        title: entry.title,
                        subtitle: '',
                        markdown: entry.article_markdown,
                        headerImageUrl: entry.header_image_url
                    });

                    results.substack = { success: true, beta: true, url: substackResult.url };
                } catch (substackErr) {
                    results.substack = { success: false, beta: true, error: substackErr.message };
                }
            }

            // Compute overall result
            const targetResults = Object.values(results);
            const allSucceeded = targetResults.every(r => r.success);
            const someSucceeded = targetResults.some(r => r.success);

            res.json({
                success: allSucceeded,
                partial: !allSucceeded && someSucceeded,
                results,
                metadata: {
                    targets_requested: targets,
                    targets_succeeded: Object.entries(results).filter(([_, r]) => r.success).map(([k]) => k),
                    targets_failed: Object.entries(results).filter(([_, r]) => !r.success).map(([k]) => k),
                    duration_ms: Date.now() - startTime
                }
            });
        } catch (err) {
            console.error('Error in publish package:', err);
            res.status(500).json({ error: err.message });
        }
    });


    return router;
};

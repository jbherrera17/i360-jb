/**
 * INSIGHT 360 - Public Blog Routes
 * Version: 1.0.0
 *
 * Serves published thought leadership articles as public web pages.
 * No authentication required for reading — these are public-facing blog pages.
 *
 * Security:
 * - Markdown rendered with `marked` + `sanitize-html` (XSS protection per SEC-001)
 * - Only `is_published = TRUE` articles are served (slug enumeration protection per SEC-004)
 * - 404 returned for unpublished/nonexistent slugs (no existence confirmation)
 */

const express = require('express');
const marked = require('marked');
const sanitizeHtml = require('sanitize-html');

// Configure marked for safe rendering
marked.setOptions({
    gfm: true,
    breaks: true
});

// Sanitization rules — allow standard HTML but strip scripts/events
const SANITIZE_OPTIONS = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'details', 'summary', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ]),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
        'a': ['href', 'title', 'target', 'rel'],
        'th': ['colspan', 'rowspan'],
        'td': ['colspan', 'rowspan']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard'
};

/**
 * Render markdown to sanitized HTML
 */
function renderMarkdown(markdown) {
    const rawHtml = marked.parse(markdown || '');
    return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
}

/**
 * Generate a URL-safe slug from a title
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
}

/**
 * Blog Routes Factory
 * @param {object} supabase - Supabase client instance
 * @returns {Router} Express router
 */
module.exports = function(supabase) {
    const router = express.Router();

    /**
     * GET /blog
     * Public blog index page — lists all published articles
     */
    router.get('/', async (req, res) => {
        try {
            const { data: articles, error } = await supabase
                .from('blog_articles')
                .select('slug, title, subtitle, header_image_url, author_name, pillar, pillar_color, published_at, seo_description, tags, view_count')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            const articleCards = (articles || []).map(a => `
                <article class="blog-card">
                    ${a.header_image_url ? `<a href="/blog/${a.slug}"><img src="${sanitizeHtml(a.header_image_url, { allowedTags: [] })}" alt="${sanitizeHtml(a.title, { allowedTags: [] })}" loading="lazy" class="blog-card-image"></a>` : ''}
                    <div class="blog-card-content">
                        ${a.pillar ? `<span class="blog-pillar-tag" ${a.pillar_color ? `style="background:${sanitizeHtml(a.pillar_color, { allowedTags: [] })}"` : ''}>${sanitizeHtml(a.pillar, { allowedTags: [] })}</span>` : ''}
                        <h2><a href="/blog/${a.slug}">${sanitizeHtml(a.title, { allowedTags: [] })}</a></h2>
                        ${a.subtitle ? `<p class="blog-subtitle">${sanitizeHtml(a.subtitle, { allowedTags: [] })}</p>` : ''}
                        <div class="blog-meta">
                            <span>${sanitizeHtml(a.author_name, { allowedTags: [] })}</span>
                            <span>${new Date(a.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                </article>
            `).join('\n');

            res.send(blogLayout({
                title: 'Blog — Synergi AI',
                description: 'Thought leadership on values-driven AI, human-aligned intelligence, and ethical technology.',
                content: `
                    <div class="blog-index">
                        <header class="blog-index-header">
                            <h1>Thought Leadership</h1>
                            <p>Values-driven perspectives on AI alignment, ethical architecture, and human-centered intelligence.</p>
                        </header>
                        <div class="blog-grid">
                            ${articleCards || '<p>No articles published yet.</p>'}
                        </div>
                    </div>
                `
            }));
        } catch (err) {
            console.error('Error rendering blog index:', err);
            res.status(500).send(blogLayout({
                title: 'Blog — Synergi AI',
                content: '<div class="blog-error"><h1>Something went wrong</h1><p>Please try again later.</p></div>'
            }));
        }
    });

    /**
     * GET /blog/:slug
     * Public article page
     */
    router.get('/:slug', async (req, res) => {
        try {
            const { slug } = req.params;

            // Only fetch published articles (SEC-004)
            const { data: article, error } = await supabase
                .from('blog_articles')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (error && error.code === 'PGRST116') {
                return res.status(404).send(blogLayout({
                    title: 'Not Found — Synergi AI',
                    content: '<div class="blog-error"><h1>Article not found</h1><p><a href="/blog">Back to blog</a></p></div>'
                }));
            }

            if (error) throw error;

            // Increment view count (fire and forget)
            supabase.rpc('increment_blog_view_count', { p_slug: slug }).catch(() => {});

            // Render article HTML from markdown (sanitized — SEC-001)
            const articleHtml = article.article_html || renderMarkdown(article.article_markdown);

            // Get prev/next articles for navigation
            const { data: prevArticle } = await supabase
                .from('blog_articles')
                .select('slug, title')
                .eq('is_published', true)
                .lt('published_at', article.published_at)
                .order('published_at', { ascending: false })
                .limit(1)
                .single();

            const { data: nextArticle } = await supabase
                .from('blog_articles')
                .select('slug, title')
                .eq('is_published', true)
                .gt('published_at', article.published_at)
                .order('published_at', { ascending: true })
                .limit(1)
                .single();

            const publishDate = new Date(article.published_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            res.send(blogLayout({
                title: `${article.seo_title || article.title} — Synergi AI`,
                description: article.seo_description || article.subtitle || '',
                ogImage: article.og_image_url || article.header_image_url,
                ogUrl: `/blog/${slug}`,
                content: `
                    <article class="blog-article">
                        ${article.header_image_url ? `<img src="${sanitizeHtml(article.header_image_url, { allowedTags: [] })}" alt="${sanitizeHtml(article.title, { allowedTags: [] })}" class="blog-header-image">` : ''}
                        <header class="blog-article-header">
                            ${article.pillar ? `<span class="blog-pillar-tag" ${article.pillar_color ? `style="background:${sanitizeHtml(article.pillar_color, { allowedTags: [] })}"` : ''}>${sanitizeHtml(article.pillar, { allowedTags: [] })}</span>` : ''}
                            <h1>${sanitizeHtml(article.title, { allowedTags: [] })}</h1>
                            ${article.subtitle ? `<p class="blog-subtitle">${sanitizeHtml(article.subtitle, { allowedTags: [] })}</p>` : ''}
                            <div class="blog-meta">
                                <span class="blog-author">${sanitizeHtml(article.author_name, { allowedTags: [] })}</span>
                                <time datetime="${article.published_at}">${publishDate}</time>
                            </div>
                        </header>

                        <div class="blog-content">
                            ${articleHtml}
                        </div>

                        ${article.author_bio ? `
                        <footer class="blog-author-bio">
                            <h3>About the Author</h3>
                            <p>${sanitizeHtml(article.author_bio, { allowedTags: ['a', 'strong', 'em'], allowedAttributes: { a: ['href'] } })}</p>
                        </footer>` : ''}

                        <nav class="blog-nav">
                            ${prevArticle ? `<a href="/blog/${prevArticle.slug}" class="blog-nav-prev">&larr; ${sanitizeHtml(prevArticle.title, { allowedTags: [] })}</a>` : '<span></span>'}
                            ${nextArticle ? `<a href="/blog/${nextArticle.slug}" class="blog-nav-next">${sanitizeHtml(nextArticle.title, { allowedTags: [] })} &rarr;</a>` : '<span></span>'}
                        </nav>
                    </article>
                `
            }));
        } catch (err) {
            console.error('Error rendering blog article:', err);
            res.status(500).send(blogLayout({
                title: 'Error — Synergi AI',
                content: '<div class="blog-error"><h1>Something went wrong</h1><p><a href="/blog">Back to blog</a></p></div>'
            }));
        }
    });

    /**
     * GET /api/blog/articles
     * Public API for blog article listing (JSON)
     */
    router.get('/api/articles', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const offset = parseInt(req.query.offset) || 0;
            const pillar = req.query.pillar;

            let query = supabase
                .from('blog_articles')
                .select('slug, title, subtitle, header_image_url, author_name, pillar, published_at, seo_description, tags, view_count')
                .eq('is_published', true)
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (pillar) {
                query = query.eq('pillar', pillar);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            res.json({
                articles: data || [],
                pagination: { offset, limit, total: count }
            });
        } catch (err) {
            console.error('Error listing blog articles:', err);
            res.status(500).json({ error: 'Failed to load articles' });
        }
    });

    return router;
};

// Export helpers for use by publish endpoints
module.exports.generateSlug = generateSlug;
module.exports.renderMarkdown = renderMarkdown;

/**
 * Blog page HTML layout
 */
function blogLayout({ title, description, ogImage, ogUrl, content }) {
    const safeTitle = sanitizeHtml(title || 'Synergi AI Blog', { allowedTags: [] });
    const safeDesc = sanitizeHtml(description || 'Thought leadership on values-driven AI.', { allowedTags: [] });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}">

    <!-- Open Graph -->
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:type" content="article">
    ${ogImage ? `<meta property="og:image" content="${sanitizeHtml(ogImage, { allowedTags: [] })}">` : ''}
    ${ogUrl ? `<meta property="og:url" content="${sanitizeHtml(ogUrl, { allowedTags: [] })}">` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    ${ogImage ? `<meta name="twitter:image" content="${sanitizeHtml(ogImage, { allowedTags: [] })}">` : ''}

    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --text: #1a1a2e;
            --text-muted: #6b7280;
            --bg: #ffffff;
            --bg-muted: #f9fafb;
            --primary: #4f46e5;
            --primary-light: #e0e7ff;
            --border: #e5e7eb;
            --max-width: 780px;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Source Sans 3', -apple-system, sans-serif;
            color: var(--text);
            background: var(--bg);
            line-height: 1.7;
            font-size: 18px;
        }
        .blog-container { max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }

        /* Index */
        .blog-index-header { text-align: center; margin-bottom: 3rem; }
        .blog-index-header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .blog-index-header p { color: var(--text-muted); font-size: 1.1rem; }
        .blog-grid { display: grid; gap: 2rem; }
        .blog-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; transition: box-shadow 0.2s; }
        .blog-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .blog-card-image { width: 100%; height: 220px; object-fit: cover; }
        .blog-card-content { padding: 1.5rem; }
        .blog-card-content h2 { font-size: 1.3rem; margin-bottom: 0.5rem; }
        .blog-card-content h2 a { color: var(--text); text-decoration: none; }
        .blog-card-content h2 a:hover { color: var(--primary); }

        /* Article */
        .blog-header-image { width: 100%; max-height: 450px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; }
        .blog-article-header { margin-bottom: 2.5rem; }
        .blog-article-header h1 { font-size: 2.2rem; line-height: 1.3; margin-bottom: 0.75rem; }
        .blog-subtitle { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 1rem; }
        .blog-meta { color: var(--text-muted); font-size: 0.95rem; display: flex; gap: 1.5rem; }
        .blog-pillar-tag {
            display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px;
            background: var(--primary-light); color: var(--primary); font-size: 0.8rem;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.75rem;
        }
        .blog-content h1, .blog-content h2, .blog-content h3 { margin: 2rem 0 1rem; }
        .blog-content h2 { font-size: 1.5rem; }
        .blog-content h3 { font-size: 1.25rem; }
        .blog-content p { margin-bottom: 1.25rem; }
        .blog-content blockquote {
            border-left: 4px solid var(--primary); padding: 1rem 1.5rem; margin: 1.5rem 0;
            background: var(--bg-muted); border-radius: 0 8px 8px 0; font-style: italic;
        }
        .blog-content ul, .blog-content ol { margin: 1rem 0; padding-left: 1.5rem; }
        .blog-content li { margin-bottom: 0.5rem; }
        .blog-content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
        .blog-content img { max-width: 100%; border-radius: 8px; margin: 1.5rem 0; }
        .blog-content table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
        .blog-content th, .blog-content td { padding: 0.75rem; border: 1px solid var(--border); text-align: left; }
        .blog-content th { background: var(--bg-muted); font-weight: 600; }

        /* Author bio */
        .blog-author-bio { margin-top: 3rem; padding: 1.5rem; background: var(--bg-muted); border-radius: 12px; }
        .blog-author-bio h3 { font-size: 1rem; margin-bottom: 0.75rem; }

        /* Navigation */
        .blog-nav {
            display: flex; justify-content: space-between; margin-top: 3rem;
            padding-top: 2rem; border-top: 1px solid var(--border);
        }
        .blog-nav a { color: var(--primary); text-decoration: none; max-width: 45%; font-size: 0.95rem; }
        .blog-nav a:hover { text-decoration: underline; }

        /* Error */
        .blog-error { text-align: center; padding: 4rem 0; }
        .blog-error h1 { margin-bottom: 1rem; }
        .blog-error a { color: var(--primary); }

        @media (max-width: 640px) {
            body { font-size: 16px; }
            .blog-article-header h1 { font-size: 1.75rem; }
            .blog-index-header h1 { font-size: 2rem; }
        }
    </style>
</head>
<body>
    <div class="blog-container">
        ${content}
    </div>
</body>
</html>`;
}

# Environment Configuration Template

Copy this template to create your `.env` file for new client deployments.

---

## Complete .env Template

```env
# ============================================
# Insight 360 - Environment Configuration
# ============================================

# --------------------------------------------
# SERVER CONFIGURATION
# --------------------------------------------
PORT=3000
NODE_ENV=production

# CORS - Comma-separated list of allowed origins
ALLOWED_ORIGINS=https://client-domain.com,https://www.client-domain.com

# --------------------------------------------
# SUPABASE (Required)
# Get these from: Supabase Dashboard > Settings > API
# --------------------------------------------
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# --------------------------------------------
# AI PROVIDERS (At least Anthropic required)
# --------------------------------------------

# Anthropic Claude (Required)
# Get from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI GPT + Voice (Recommended)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...

# Perplexity Sonar (Optional - search-enhanced AI)
# Get from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=pplx-...

# Google AI (Optional)
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=AIza...

# --------------------------------------------
# SEARCH PROVIDERS (At least one required)
# --------------------------------------------

# Brave Search (Recommended)
# Get from: https://brave.com/search/api/
BRAVE_SEARCH_API_KEY=BSA...

# Tavily (Alternative)
# Get from: https://tavily.com/
TAVILY_API_KEY=tvly-...

# Serper (Alternative)
# Get from: https://serper.dev/
SERPER_API_KEY=...

# --------------------------------------------
# OPTIONAL INTEGRATIONS
# --------------------------------------------

# Notion (for roadmap sync)
NOTION_API_KEY=ntn_...
NOTION_ROADMAP_DATABASE_ID=...

# Email (for briefings)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@client-domain.com
```

---

## Configuration by Priority

### Must Have (System Won't Work Without These)

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Database connection |
| `SUPABASE_ANON_KEY` | Client-side database access |
| `SUPABASE_SERVICE_KEY` | Server-side database access |
| `ANTHROPIC_API_KEY` | Primary AI (Claude) |

### Should Have (Core Features)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | GPT + Voice features |
| `BRAVE_SEARCH_API_KEY` | Web search in agents |

### Nice to Have (Enhanced Features)

| Variable | Purpose |
|----------|---------|
| `PERPLEXITY_API_KEY` | Search-enhanced AI responses |
| `GOOGLE_API_KEY` | Alternative AI provider |
| `TAVILY_API_KEY` | Alternative search |

---

## Supabase Setup Steps

1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project details:
   - Name: `insight360-[client-name]`
   - Database Password: (save this securely)
   - Region: Choose closest to client
4. Wait for project to provision (~2 minutes)
5. Go to Settings > API
6. Copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`

---

## Security Notes

- **Never commit `.env` to version control**
- Add `.env` to `.gitignore`
- Use separate API keys per environment (dev/staging/prod)
- Rotate API keys periodically
- Store production secrets in a secure vault

---

## Validation

After configuring, start the server and check the console:

```
✅ Claude (Anthropic) - Ready
✅ GPT (OpenAI) - Ready
✅ Voice (OpenAI Audio) - Ready
✅ Perplexity (Sonar) - Ready
✅ Web Search (Brave) - Ready
✅ Supabase (Database) - Ready
```

Missing API keys will show as skipped or warnings.

# Insight 360 Setup Guide

**Version 2.1 | November 2025**

---

## Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**
- **Supabase** account (free tier works)
- At least one LLM API key:
  - **Anthropic** (Claude) - https://console.anthropic.com
  - **OpenAI** (GPT) - https://platform.openai.com

---

## Quick Start

### 1. Clone/Extract the Project

```bash
cd ~/AIDevelopment  # or your preferred directory
unzip insight-360-phase2.1.zip
cd insight-360-phase2.1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# Required: At least one LLM API key
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Optional: Supabase (for conversation persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Optional: Web Search (pick one)
BRAVE_SEARCH_API_KEY=your-brave-key
```

### 4. Set Up Database (Optional but Recommended)

If using Supabase for conversation persistence:

1. Go to https://supabase.com and create a project
2. Go to **SQL Editor** in your project
3. Copy the contents of `db/schema.sql` and run it
4. Copy the contents of `db/seed.sql` and run it
5. Copy your project URL and keys to `.env`

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Open in Browser

Navigate to: **http://localhost:3000**

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Yes* | GPT API key |
| `SUPABASE_URL` | No | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | No | Supabase service role key |
| `BRAVE_SEARCH_API_KEY` | No | Brave Search API key |
| `TAVILY_API_KEY` | No | Tavily Search API key |
| `SERPER_API_KEY` | No | Serper Search API key |
| `ALLOWED_ORIGINS` | No | CORS allowed origins (comma-separated) |

*At least one LLM API key is required.

---

## Database Setup (Supabase)

### Creating a Supabase Project

1. Go to https://supabase.com
2. Click "Start your project" and sign in
3. Click "New project"
4. Choose your organization (or create one)
5. Enter project details:
   - **Name:** insight-360
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to you
6. Click "Create new project"

### Deploying the Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Open `db/schema.sql` from this project
4. Copy all contents and paste into the SQL Editor
5. Click "Run" (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" for each statement

### Seeding Initial Data

1. In SQL Editor, click "New query"
2. Open `db/seed.sql` from this project
3. Copy all contents and paste
4. Click "Run"
5. Verify: Go to **Table Editor** → **agents** → You should see 8 starter agents

### Getting Your API Keys

1. Go to **Settings** → **API** in your Supabase project
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (keep secret!)

---

## Feature Configuration

### Web Search

Web search allows the AI to fetch current information. Choose one provider:

#### Brave Search (Recommended)
1. Go to https://brave.com/search/api/
2. Sign up for free tier (2,000 queries/month)
3. Get your API key
4. Add to `.env`: `BRAVE_SEARCH_API_KEY=your-key`

#### Tavily
1. Go to https://tavily.com
2. Sign up for free tier
3. Get your API key
4. Add to `.env`: `TAVILY_API_KEY=your-key`

#### Serper
1. Go to https://serper.dev
2. Sign up for free tier
3. Get your API key
4. Add to `.env`: `SERPER_API_KEY=your-key`

### Voice Features

Voice input/output requires OpenAI API key (uses Whisper and TTS models).

No additional configuration needed - if `OPENAI_API_KEY` is set, voice is enabled.

---

## Verifying Installation

After starting the server, check:

### Health Check
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "anthropic": true,
    "openai": true,
    "search": true,
    "voice": true,
    "supabase": true
  }
}
```

### Console Output

You should see:
```
═══════════════════════════════════════════════════════════
               INSIGHT 360 - Phase 2.1
═══════════════════════════════════════════════════════════

  Server running at http://localhost:3000

  Services:
    • Anthropic Claude: ✓ Ready
    • OpenAI GPT:       ✓ Ready
    • Web Search:       ✓ Ready
    • Voice:            ✓ Ready
    • Supabase:         ✓ Ready

  Available Models:
    • Claude: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5...
    • GPT: GPT-4.1, GPT-4o, GPT-4o Mini...

═══════════════════════════════════════════════════════════
```

---

## Troubleshooting

### "Anthropic/OpenAI not configured"
- Check your API key is correct in `.env`
- Ensure no extra spaces or quotes around the key
- Verify the key is active in your provider's dashboard

### "Supabase not configured"
- This is a warning, not an error
- Chat will work, but conversations won't persist
- To fix: Set up Supabase per instructions above

### "Web Search not configured"
- This is optional - chat works without it
- To enable: Add one of the search API keys

### Port already in use
```bash
# Find what's using port 3000
lsof -i :3000

# Or use a different port
PORT=3001 npm run dev
```

### Database connection errors
- Verify SUPABASE_URL is correct (no trailing slash)
- Check that schema was deployed successfully
- Ensure RLS policies allow your operations

---

## Project Structure

```
insight-360/
├── server/
│   ├── index.js           # Express server entry point
│   ├── routes/
│   │   └── chat.js        # Chat API endpoints
│   ├── services/
│   │   ├── anthropic.js   # Claude API wrapper
│   │   ├── openai.js      # GPT API wrapper
│   │   ├── search.js      # Web search service
│   │   └── voice.js       # Voice service
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   └── utils/
│       └── fileProcessor.js
├── public/
│   ├── index.html         # Dashboard
│   ├── chat.html          # Chat interface
│   ├── agents.html        # Agent library (Phase 3)
│   ├── briefing.html      # Daily briefing (Phase 4)
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── chat.js        # Chat UI logic
│   │   └── supabase.js    # Supabase client
│   └── assets/
│       └── logo.svg
├── db/
│   ├── schema.sql         # Database schema
│   └── seed.sql           # Initial data
├── docs/
│   └── SETUP.md           # This file
├── package.json
├── .env.example
├── .env                   # Your configuration (gitignored)
└── .gitignore
```

---

## Next Steps

1. **Test the chat** - Try different models, upload images, use voice
2. **Enable web search** - Add a search API key for current information
3. **Set up database** - Enable conversation persistence with Supabase
4. **Customize agents** - Modify seed.sql or create agents via UI (Phase 3)

---

## Getting Help

- **Issues?** Check the troubleshooting section above
- **Questions?** Review the blueprint documentation
- **Updates?** Check for new versions of this setup guide

---

*Built by Synergi AI | "Technology should augment human brilliance—not replace it."*

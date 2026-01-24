# Insight 360

A values-based AI command center and multi-LLM orchestration platform. Manage AI agents, inject contextual knowledge, track integrity metrics, and build automated workflows—all from a unified interface.

## Features

- **Multi-LLM Chat** - Converse with Claude, GPT-4, Perplexity, and more from a single interface with real-time streaming
- **Agent Management** - Create, configure, and deploy specialized AI agents with custom system prompts and skills
- **Context Injection** - Automatically enrich conversations with relevant company knowledge, brand voice, and domain expertise
- **Integrity Metrics** - Track AI alignment with organizational values using the Parthenon governance framework
- **Workflow Automation** - Build and execute multi-step AI workflows with YAML/JSON definitions
- **Strategy-to-Execution Pipeline** - Align 120-day strategic goals with execution plans (Align120, Strategy120, Execute120)
- **Multi-Tenant Organizations** - Agency-ready with organizations, team members, and client management
- **Research Studio** - Conduct AI-assisted research with web search integration
- **Daily Briefings** - Automated intelligence briefings powered by scheduled workflows
- **Thought Leadership** - AI-assisted content creation with social media publishing integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 18+, Express |
| Database | Supabase (PostgreSQL) |
| AI Models | Anthropic Claude, OpenAI GPT, Google Gemini, Perplexity |
| Search | Brave, Tavily, Serper |
| Frontend | Vanilla JS, CSS3 |
| Testing | Jest, Playwright |

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Supabase account (free tier works)
- At least one LLM API key (Anthropic or OpenAI)

### Installation

```bash
# Clone the repository
git clone https://github.com/jbherrera17/insight-360.git
cd insight-360

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:

```env
# Required - Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Required - At least one LLM
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# Optional - Web search
BRAVE_SEARCH_API_KEY=your-brave-key
```

### Database Setup

Run the SQL migrations in your Supabase SQL Editor:

```sql
-- Core schema (required)
-- Run: db/schema.sql

-- Phase schemas (run in order as needed)
-- Run: db/phase3-schema.sql through db/phase39-*.sql

-- Seed data (optional, includes starter agents)
-- Run: db/seed.sql
```

### Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
insight-360/
├── server/
│   ├── index.js          # Express app entry point
│   ├── routes/           # API endpoints (39 route files)
│   ├── services/         # LLM wrappers, search, workflows
│   ├── middleware/       # Auth, error handling
│   └── utils/            # Helpers and utilities
├── public/
│   ├── *.html            # Frontend pages (45 pages)
│   ├── js/               # Client-side JavaScript
│   └── css/              # Stylesheets
├── db/
│   ├── schema.sql        # Core database schema
│   ├── phase*.sql        # Feature migrations
│   └── seed.sql          # Initial data
├── documentation/
│   ├── blueprints/       # Version specs (v2.8 - v3.8)
│   └── guides/           # User and technical guides
├── __tests__/
│   ├── unit/             # Unit tests
│   └── integration/      # API tests
└── docs/                 # Additional documentation
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm test` | Run Jest test suite |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Run ESLint |

## API Overview

The API follows REST conventions. Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | Multi-LLM chat with streaming (SSE) |
| `GET/POST /api/agents` | Agent CRUD operations |
| `GET/POST /api/context` | Context asset management |
| `POST /api/actions` | Execute Parthenon actions |
| `GET/POST /api/workflows` | Workflow management |
| `GET /api/briefing` | Generate daily briefings |

All endpoints require authentication via session cookie.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key |
| `OPENAI_API_KEY` | Yes* | OpenAI API key |
| `GOOGLE_API_KEY` | No | Google AI API key |
| `PERPLEXITY_API_KEY` | No | Perplexity API key |
| `BRAVE_SEARCH_API_KEY` | No | Brave Search API key |
| `TAVILY_API_KEY` | No | Tavily Search API key |
| `PORT` | No | Server port (default: 3000) |

*At least one LLM API key is required.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) - Claude AI
- [OpenAI](https://openai.com) - GPT models
- [Supabase](https://supabase.com) - Database and auth
- [Brave Search](https://brave.com/search/api/) - Web search API

---

Built by [Synergi AI](https://github.com/jbherrera17)

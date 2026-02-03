# Insight 360 Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐
│  Railway     │     │  Railway     │
│  (Staging)   │     │  (Production)│
│  Node.js App │     │  Node.js App │
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌─────────────┐     ┌─────────────┐
│  Supabase    │     │  Supabase    │
│  (Staging)   │     │  (Pro)       │
│  Free tier   │     │  Production  │
└─────────────┘     └─────────────┘
```

---

## 1. Supabase Setup

### Production (Supabase Pro)

1. Create a new Supabase project for production
2. Upgrade to Pro plan ($25/mo) in Project Settings → Billing
3. Enable automated backups: Settings → Database → Backups
4. Run all migrations in order (see `db/migration-order.md`)
5. Copy the project URL, anon key, and service key

### Staging (Supabase Free)

1. Create a separate Supabase project for staging
2. Run the same migrations as production
3. Use this for testing migrations before applying to production

---

## 2. Railway Setup

### Create Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository
3. Railway will auto-detect the `Dockerfile`

### Configure Services

Create two services from the same repo:

**Staging Service:**
- Name: `insight360-staging`
- Branch: `develop`
- Set environment variables from `.env.staging.example`

**Production Service:**
- Name: `insight360-production`
- Branch: `main`
- Set environment variables from `.env.production.example`

### Required Environment Variables

Set these in Railway's Variables tab for each service:

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | Yes | `production` for both staging and prod |
| `ENVIRONMENT` | Yes | `staging` or `production` |
| `PORT` | No | Railway sets this automatically |
| `SUPABASE_URL` | Yes | Different per environment |
| `SUPABASE_ANON_KEY` | Yes | Different per environment |
| `SUPABASE_SERVICE_KEY` | Yes | Different per environment |
| `ALLOWED_ORIGINS` | Yes | Your Railway domain(s) |
| `ANTHROPIC_API_KEY` | Yes | Same key for both environments |
| `OPENAI_API_KEY` | Yes | Same key for both environments |

### Custom Domain (Production)

1. In Railway service settings, add your custom domain
2. Configure DNS CNAME record pointing to Railway
3. Update `ALLOWED_ORIGINS` to include the custom domain

---

## 3. Deployment Workflow

### Staging
1. Push to `develop` branch
2. Railway auto-deploys to staging
3. Verify at staging URL
4. Test critical paths: login, chat, agent execution

### Production
1. Merge `develop` → `main`
2. Railway auto-deploys to production
3. Monitor health: `https://your-domain/api/health`
4. Check detailed metrics: `https://your-domain/api/health/detailed`

---

## 4. Credential Rotation Checklist

Before first production deployment, rotate ALL of these:

- [ ] Supabase project keys (create new production project)
- [ ] Anthropic API key (console.anthropic.com → API Keys)
- [ ] OpenAI API key (platform.openai.com → API Keys)
- [ ] Google API key (if used)
- [ ] Perplexity API key (if used)
- [ ] Brave Search API key (if used)
- [ ] Notion API key (if used)
- [ ] TOKEN_ENCRYPTION_KEY (generate new: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Any LinkedIn/OAuth credentials

**Important:** The `.env` file has been in git history. All previously used keys should be considered compromised.

---

## 5. Database Migrations

### Running migrations on a new environment

1. Open Supabase Dashboard → SQL Editor
2. Follow the order in `db/migration-order.md`
3. Run each file one at a time, verify no errors
4. Seed data files are optional depending on your needs

### Before running migrations on production

1. Always test on staging first
2. Take a manual backup: Dashboard → Database → Backups → Create
3. Run the migration
4. Verify with a quick smoke test

---

## 6. Monitoring

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Overall status |
| `/api/health/live` | Liveness probe (used by Railway) |
| `/api/health/ready` | Readiness probe |
| `/api/health/detailed` | Memory, CPU, services |
| `/api/health/circuits` | Circuit breaker states |
| `/metrics` | Prometheus metrics |

### Recommended Alerts

Set up monitoring for:
- Health check failures (Railway built-in)
- High memory usage (>512MB)
- Error rate spikes (check `/metrics`)
- Supabase connection failures

---

## 7. Scaling Notes

- Railway supports horizontal scaling but in-memory rate limiting won't share state across instances
- For multi-instance deployment, migrate rate limiting to Redis (future phase)
- Supabase Pro supports 100 concurrent connections; monitor via Supabase Dashboard
- Consider Supabase connection pooling (pgBouncer) if connection count grows

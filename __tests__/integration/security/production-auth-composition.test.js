const express = require('express');
const request = require('supertest');
const { createMockSupabase, createQueryBuilder } = require('../../setup/mockSupabase');
const {
  applyApiAuthBoundary,
  requireMetricsAuth
} = require('../../../server/routes/registry');

describe('production authentication composition', () => {
  function createProductionLikeApp() {
    const app = express();
    const supabase = createMockSupabase();
    const expensiveHandler = jest.fn((_req, res) => res.json({ success: true }));

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'production-composition-user' } },
      error: null
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'users') {
        return createQueryBuilder({ data: { default_org_id: 'org-a' }, error: null });
      }
      if (table === 'organization_members') {
        return createQueryBuilder({
          data: { role: 'member', business_role: 'ic' },
          error: null
        });
      }
      return createQueryBuilder();
    });

    app.use(express.json());
    app.use((req, _res, next) => {
      req.supabase = supabase;
      next();
    });
    applyApiAuthBoundary(app);
    app.post('/api/chat/expensive', expensiveHandler);
    app.get('/api/chat/models', (_req, res) => res.json({ success: true }));
    app.get('/api/chat/models-private', (_req, res) => res.json({ success: true }));

    return { app, expensiveHandler, supabase };
  }

  it('runs authentication before rate limiting and expensive chat work', async () => {
    const { app, expensiveHandler, supabase } = createProductionLikeApp();

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await request(app)
        .post('/api/chat/expensive')
        .send({ message: 'anonymous' })
        .expect(401);
    }

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await request(app)
        .post('/api/chat/expensive')
        .set('Authorization', 'Bearer valid-token')
        .send({ message: 'authenticated' })
        .expect(200);
    }

    await request(app)
      .post('/api/chat/expensive')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: 'rate limited' })
      .expect(429);

    expect(expensiveHandler).toHaveBeenCalledTimes(30);
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(31);
  });

  it('allows only exact public chat metadata paths', async () => {
    const { app } = createProductionLikeApp();

    await request(app).get('/api/chat/models').expect(200);
    await request(app).get('/api/chat/models-private').expect(401);
  });
});

describe('metrics authentication', () => {
  const originalToken = process.env.METRICS_AUTH_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.METRICS_AUTH_TOKEN;
    } else {
      process.env.METRICS_AUTH_TOKEN = originalToken;
    }
  });

  function createMetricsApp() {
    const app = express();
    app.get('/metrics', requireMetricsAuth, (_req, res) => res.send('metrics'));
    return app;
  }

  it('fails closed when the internal metrics token is not configured', async () => {
    delete process.env.METRICS_AUTH_TOKEN;
    await request(createMetricsApp()).get('/metrics').expect(503);
  });

  it('requires the configured bearer token', async () => {
    process.env.METRICS_AUTH_TOKEN = 'metrics-test-token';
    const app = createMetricsApp();

    await request(app).get('/metrics').expect(401);
    await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer wrong-token')
      .expect(401);
    await request(app)
      .get('/metrics')
      .set('Authorization', 'Bearer metrics-test-token')
      .expect(200, 'metrics');
  });
});

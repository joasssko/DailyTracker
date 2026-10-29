import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AppCtx } from './ctx.js';
import { requireAuth } from './lib/auth.js';
import { errorHandler } from './lib/http.js';
import { authRoutes } from './routes/auth.js';
import { relationshipRoutes } from './routes/relationships.js';
import { completionRoutes, taskRoutes } from './routes/tasks.js';
import { redemptionRoutes, rewardRoutes } from './routes/rewards.js';
import { diaryRoutes } from './routes/diary.js';
import { pointRoutes } from './routes/points.js';
import { reviewRoutes } from './routes/review.js';

export function createApp(ctx: AppCtx, opts: { staticDir?: string } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Google Analytics 4 y GoSquared (cargados desde /analytics.js)
          // GoSquared envía cada evento como <script> (JSONP) a data/data2/chat.gosquared.com.
          'script-src': ["'self'", 'https://www.googletagmanager.com', 'https://d1l6p2sc9645hc.cloudfront.net', 'https://*.gosquared.com'],
          'frame-src': ["'self'", 'https://*.gosquared.com'],
          'connect-src': [
            "'self'",
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://*.googletagmanager.com',
            'https://*.gosquared.com',
            'wss://*.gosquared.com',
          ],
          'img-src': ["'self'", 'data:', 'https://*.google-analytics.com', 'https://*.googletagmanager.com', 'https://*.gosquared.com'],
          'upgrade-insecure-requests': ctx.secureCookies ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(ctx));

  const api = express.Router();
  api.use(requireAuth(ctx.db, ctx.secret, ctx.secureCookies));
  api.use('/relationships', relationshipRoutes(ctx));
  api.use('/tasks', taskRoutes(ctx));
  api.use('/completions', completionRoutes(ctx));
  api.use('/rewards', rewardRoutes(ctx));
  api.use('/redemptions', redemptionRoutes(ctx));
  api.use('/diary', diaryRoutes(ctx));
  api.use('/points', pointRoutes(ctx));
  api.use('/review', reviewRoutes(ctx));
  app.use('/api', api);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Frontend compilado (SPA).
  if (opts.staticDir && existsSync(opts.staticDir)) {
    app.use('/assets', express.static(join(opts.staticDir, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(opts.staticDir, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(opts.staticDir!, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

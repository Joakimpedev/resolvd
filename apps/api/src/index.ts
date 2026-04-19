import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { auth } from './auth.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { adminRoutes, adminPublicRoutes } from './routes/admin.js';
import { meRoutes } from './routes/me.js';
import { postsRoutes } from './routes/posts.js';
import { requestsRoutes } from './routes/requests.js';
import { lessonsRoutes } from './routes/lessons.js';

const isProd = process.env.NODE_ENV === 'production';
const log = (...args: unknown[]) => { if (!isProd) console.log(...args); };

const app = new Hono();

// CORS — list every origin that may call us in a browser context.
const corsOrigins = [
  process.env.BETTER_AUTH_URL ?? '',
  process.env.ADMIN_DIRECTUS_URL ?? '',
  process.env.ADMIN_UI_URL ?? '',
  'http://localhost:8081',
  'http://localhost:3000',
].filter(Boolean);

app.use('*', cors({
  origin: corsOrigins,
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Block public signup.
app.all('/api/auth/sign-up', (c) => c.json({ error: 'Self-signup disabled. Contact admin.' }, 403));
app.all('/api/auth/sign-up/*', (c) => c.json({ error: 'Self-signup disabled. Contact admin.' }, 403));

// Better Auth mount.
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Protected API routes.
const api = new Hono();
api.use('*', authMiddleware);
api.use('*', tenantMiddleware);

api.route('/me',       meRoutes);
api.route('/posts',    postsRoutes);
api.route('/requests', requestsRoutes);
api.route('/lessons',  lessonsRoutes);

app.route('/api', api);

// Admin routes
app.route('/admin', adminPublicRoutes);
app.route('/admin', adminRoutes);

app.get('/health', (c) => c.json({ ok: true }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
log(`API listening on :${port}`);

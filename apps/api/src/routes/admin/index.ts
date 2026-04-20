import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.js';
import { companiesRoutes } from './companies.js';
import { usersRoutes } from './users.js';
import { postsAdminRoutes } from './posts.js';
import { coursesRoutes } from './courses.js';
import { tagsRoutes } from './tags.js';
import { solutionsRoutes } from './solutions.js';
import { requestsAdminRoutes } from './requests.js';
import { overviewRoutes } from './overview.js';
import { DASHBOARD_HTML } from './templates/dashboard.js';

// ─── Unauthenticated admin routes (sign-in) ───────────────────────────
export const adminPublicRoutes = new Hono();

adminPublicRoutes.get('/sign-in', (c) => c.html(`<!doctype html><html lang="no"><head><meta charset="utf-8"><title>Resolvd admin login</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;max-width:320px;margin:0 auto;background:#F5F1E8;color:#1A2420}input{display:block;width:100%;padding:10px;margin:8px 0;font-size:14px;box-sizing:border-box;border:1px solid #E8E2D4;border-radius:6px;background:#FBF8F1}button{padding:10px 16px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer;width:100%;font-size:14px}h2{font-weight:800}</style>
</head><body>
<h2>Re|solvd admin</h2>
<form id="f">
  <input name="email" type="email" placeholder="E-post" required>
  <input name="password" type="password" placeholder="Passord" required>
  <button>Logg inn</button>
</form>
<script>
  document.getElementById('f').onsubmit = async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target).entries());
    const r = await fetch('/api/auth/sign-in/email', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify(d)
    });
    if (r.ok) location.href = '/admin/dashboard';
    else alert('Feil innlogging');
  };
</script>
</body></html>`));

// ─── Authenticated admin routes ───────────────────────────────────────
export const adminRoutes = new Hono();

adminRoutes.use('*', authMiddleware);
adminRoutes.use('*', async (c, next) => {
  if (c.get('userRole') !== 'ADMIN') {
    const accept = c.req.header('accept') ?? '';
    if (accept.includes('text/html')) return c.redirect('/admin/sign-in');
    return c.json({ error: 'Admin only' }, 403);
  }
  await next();
});

adminRoutes.get('/', (c) => c.redirect('/admin/dashboard'));
adminRoutes.get('/dashboard', (c) => c.html(DASHBOARD_HTML));

adminRoutes.route('/overview',  overviewRoutes);
adminRoutes.route('/companies', companiesRoutes);
adminRoutes.route('/users',     usersRoutes);
adminRoutes.route('/posts',     postsAdminRoutes);
adminRoutes.route('/courses',   coursesRoutes);
adminRoutes.route('/tags',      tagsRoutes);
adminRoutes.route('/solutions', solutionsRoutes);
adminRoutes.route('/requests',  requestsAdminRoutes);

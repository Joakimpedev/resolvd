import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../auth.js';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const cuidParam = z.object({ id: z.string().min(10).max(64) });

// ─── Unauthenticated admin routes (sign-in page) ──────────────────────
export const adminPublicRoutes = new Hono();

adminPublicRoutes.get('/sign-in', (c) => c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Resolvd admin login</title>
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

// ─── Companies (bootstrap helper until Directus is set up) ─────────────
const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
});

adminRoutes.get('/companies', async (c) => {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, industry: true, createdAt: true },
  });
  return c.json({ companies });
});

adminRoutes.post('/companies', async (c) => {
  const body = await c.req.json();
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const company = await prisma.company.create({ data: parsed.data });

  // Auto-create an INDUSTRY tag matching the company's industry (for Feed filtering later).
  await prisma.tag.upsert({
    where: { name: parsed.data.industry },
    update: {},
    create: { name: parsed.data.industry, kind: 'INDUSTRY' },
  });

  return c.json({ company });
});

adminRoutes.get('/new-company-form', (c) => c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Ny bedrift</title>
<style>body{font-family:sans-serif;padding:24px;max-width:480px;margin:0 auto}label{display:block;margin:4px 0 2px;font-size:12px;color:#6B6558}input{display:block;width:100%;padding:8px;margin-bottom:12px;font-size:14px;box-sizing:border-box}button{padding:10px 16px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer}a{color:#2D6A4F}table{border-collapse:collapse;width:100%;margin-top:24px;font-size:13px}td,th{border:1px solid #E8E2D4;padding:8px;text-align:left}code{background:#F5F1E8;padding:2px 6px;border-radius:4px}</style>
</head><body>
<h2>Ny bedrift</h2>
<p><a href="/admin/new-user-form">→ Lag bruker i stedet</a></p>
<form id="f">
  <label>Bedriftsnavn</label><input name="name" required>
  <label>Bransje (f.eks. "Rørleggere", "Frisører")</label><input name="industry" required>
  <button>Opprett bedrift</button>
  <p id="msg" style="margin-top:12px"></p>
</form>
<h3>Eksisterende bedrifter</h3>
<table id="t"><thead><tr><th>ID (kopier denne)</th><th>Navn</th><th>Bransje</th></tr></thead><tbody></tbody></table>
<script>
  async function load() {
    const r = await fetch('/admin/companies', { credentials: 'include' });
    if (!r.ok) return;
    const { companies } = await r.json();
    const tb = document.querySelector('#t tbody');
    tb.innerHTML = companies.map(c => \`<tr><td><code>\${c.id}</code></td><td>\${c.name}</td><td>\${c.industry}</td></tr>\`).join('');
  }
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch('/admin/companies', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data), credentials:'include',
    });
    const msg = document.getElementById('msg');
    if (res.ok) {
      const { company } = await res.json();
      msg.innerHTML = 'Bedrift opprettet. ID: <code>' + company.id + '</code> (kopier denne til "Lag bruker"-skjemaet)';
      msg.style.color = '#2D6A4F';
      e.target.reset();
      load();
    } else {
      const b = await res.text();
      msg.textContent = 'Feil: ' + b;
      msg.style.color = '#7A4F0E';
    }
  };
  load();
</script>
</body></html>`));

adminRoutes.get('/new-user-form', (c) => c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Ny bruker</title>
<style>body{font-family:sans-serif;padding:24px;max-width:480px;margin:0 auto}label{display:block;margin:4px 0 2px;font-size:12px;color:#6B6558}input,select{display:block;width:100%;padding:8px;margin-bottom:12px;font-size:14px;box-sizing:border-box}button{padding:10px 16px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer}</style>
</head><body>
<h2>Ny bruker</h2>
<p><a href="/admin/new-company-form">→ Lag bedrift først</a></p>
<form id="f">
  <label>E-post</label><input name="email" type="email" required>
  <label>Passord (midlertidig)</label><input name="password" type="text" required minlength="8">
  <label>Navn</label><input name="name" required>
  <label>Avatar-bokstav (1-2 tegn)</label><input name="avatarInitial" maxlength="2" required>
  <label>Bedrift</label><select name="companyId" id="companySelect" required></select>
  <label>Rolle</label><select name="role"><option value="OWNER">Eier</option><option value="EMPLOYEE">Ansatt</option></select>
  <button>Opprett bruker</button>
  <p id="msg" style="margin-top:12px"></p>
</form>
<script>
  async function loadCompanies() {
    const r = await fetch('/admin/companies', { credentials: 'include' });
    if (!r.ok) return;
    const { companies } = await r.json();
    const sel = document.getElementById('companySelect');
    if (!companies.length) {
      sel.innerHTML = '<option value="">Ingen bedrifter — opprett en først</option>';
    } else {
      sel.innerHTML = companies.map(c => '<option value="' + c.id + '">' + c.name + ' (' + c.industry + ')</option>').join('');
    }
  }
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch('/admin/users', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data), credentials:'include',
    });
    const msg = document.getElementById('msg');
    if (res.ok) { msg.textContent = 'Bruker opprettet'; msg.style.color = '#2D6A4F'; e.target.reset(); loadCompanies(); }
    else { const b = await res.text(); msg.textContent = 'Feil: ' + b; msg.style.color = '#7A4F0E'; }
  };
  loadCompanies();
</script>
</body></html>`));

const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  avatarInitial: z.string().min(1).max(2),
  companyId: z.string().min(10).max(64),
  role: z.enum(['OWNER', 'EMPLOYEE']),
});

adminRoutes.post('/users', async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const { email, password, name, avatarInitial, companyId, role } = parsed.data;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return c.json({ error: 'Invalid companyId' }, 400);

  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  if (!result) return c.json({ error: 'Signup failed' }, 500);

  await prisma.user.update({
    where: { email },
    data: { avatarInitial, companyId, role, plaintextPasswordNote: password },
  });

  return c.json({ ok: true, email });
});

adminRoutes.post('/invitations/:id/approve', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const inv = await prisma.invitation.update({
    where: { id: parsed.data.id },
    data: { status: 'APPROVED', resolvedAt: new Date(), resolvedByAdminId: c.get('userId') },
  });
  return c.json({ ok: true, invitation: inv });
});

adminRoutes.post('/invitations/:id/reject', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.invitation.update({
    where: { id: parsed.data.id },
    data: { status: 'REJECTED', resolvedAt: new Date(), resolvedByAdminId: c.get('userId') },
  });
  return c.json({ ok: true });
});

adminRoutes.delete('/users/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.user.update({ where: { id: parsed.data.id }, data: { deletedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId: parsed.data.id } });
  return c.json({ ok: true });
});

// ─── Password reset ─────────────────────────────────────────────
const resetPasswordSchema = z.object({
  userId: z.string().min(10).max(64),
  newPassword: z.string().min(8).max(128),
});
adminRoutes.post('/users/reset-password', async (c) => {
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, email: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(parsed.data.newPassword);
  await prisma.account.updateMany({
    where: { userId: user.id, providerId: 'credential' },
    data: { password: hash },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { plaintextPasswordNote: parsed.data.newPassword },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  return c.json({ ok: true });
});

// ─── Post creation ─────────────────────────────────────────────
const createPostSchema = z.object({
  kind: z.enum(['ARTICLE', 'LESSON', 'BROADCAST']),
  scopeType: z.enum(['GLOBAL', 'TAG', 'PROJECT']),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().max(50).optional(),
  readingMinutes: z.number().int().min(1).max(600).optional(),
  lessonLevel: z.enum(['BEGINNER', 'INTER', 'ADVANCED']).optional(),
  lessonOrder: z.number().int().min(1).optional(),
  tagIds: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  publishNow: z.boolean().default(true),
});
adminRoutes.post('/posts', async (c) => {
  const body = await c.req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { tagIds, publishNow, ...rest } = parsed.data;

  const post = await prisma.post.create({
    data: {
      ...rest,
      authorUserId: c.get('userId'),
      publishedAt: publishNow ? new Date() : null,
      tags: tagIds && tagIds.length ? { connect: tagIds.map(id => ({ id })) } : undefined,
    },
  });
  return c.json({ post });
});

adminRoutes.delete('/posts/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.post.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

// ─── Request status update ─────────────────────────────────────
const updateRequestSchema = z.object({
  status: z.enum(['I_ARBEID', 'VENTER_PA_DEG', 'FERDIG']),
});
adminRoutes.post('/requests/:id/status', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = updateRequestSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);
  await prisma.request.update({
    where: { id: parsed.data.id },
    data: { status: bodyParsed.data.status },
  });
  return c.json({ ok: true });
});

// ─── Solution CRUD ─────────────────────────────────────────────
const createSolutionSchema = z.object({
  companyId: z.string().min(10).max(64),
  name: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
adminRoutes.post('/solutions', async (c) => {
  const body = await c.req.json();
  const parsed = createSolutionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const solution = await prisma.solution.create({ data: parsed.data });
  return c.json({ solution });
});

adminRoutes.delete('/solutions/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.solution.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

// ─── Tag lookup ────────────────────────────────────────────────
adminRoutes.get('/tags/:name', async (c) => {
  const name = c.req.param('name');
  const tag = await prisma.tag.findUnique({ where: { name } });
  if (!tag) return c.json({ error: 'Not found' }, 404);
  return c.json(tag);
});

// ─── Overview JSON ─────────────────────────────────────────────
adminRoutes.get('/overview', async (c) => {
  const [companies, users, posts, requests, solutions, invitations] = await Promise.all([
    prisma.company.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } } },
    }),
    prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.request.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { company: { select: { name: true } }, createdBy: { select: { name: true, email: true } } },
    }),
    prisma.solution.findMany({ orderBy: { createdAt: 'desc' }, include: { company: { select: { name: true } } } }),
    prisma.invitation.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { name: true } }, invitedBy: { select: { name: true } } },
    }),
  ]);
  return c.json({
    companies: companies.map(co => ({ id: co.id, name: co.name, industry: co.industry, createdAt: co.createdAt.toISOString() })),
    users: users.map(u => ({
      id: u.id, email: u.email, name: u.name, role: u.role, avatarInitial: u.avatarInitial,
      company: u.company?.name ?? null, createdAt: u.createdAt.toISOString(),
      plaintextPassword: u.plaintextPasswordNote ?? null,
    })),
    posts: posts.map(p => ({
      id: p.id, kind: p.kind, scopeType: p.scopeType, title: p.title, category: p.category,
      lessonLevel: p.lessonLevel, lessonOrder: p.lessonOrder, readingMinutes: p.readingMinutes,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
    requests: requests.map(r => ({
      id: r.id, title: r.title, description: r.description, status: r.status,
      company: r.company.name, createdBy: r.createdBy?.name ?? r.createdBy?.email ?? '—',
      updatedAt: r.updatedAt.toISOString(),
    })),
    solutions: solutions.map(s => ({
      id: s.id, name: s.name, subtitle: s.subtitle, status: s.status,
      company: s.company.name,
    })),
    invitations: invitations.map(i => ({
      id: i.id, invitedIdentifier: i.invitedIdentifier, status: i.status,
      company: i.company.name, invitedBy: i.invitedBy.name,
      createdAt: i.createdAt.toISOString(),
    })),
  });
});

// ─── Dashboard HTML ────────────────────────────────────────────
adminRoutes.get('/', (c) => c.redirect('/admin/dashboard'));

adminRoutes.get('/dashboard', (c) => c.html(DASHBOARD_HTML));
adminRoutes.get('/new-article-form', (c) => c.html(NEW_ARTICLE_HTML));
adminRoutes.get('/new-lesson-form', (c) => c.html(NEW_LESSON_HTML));
adminRoutes.get('/new-solution-form', async (c) => {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const options = companies.map(co => `<option value="${co.id}">${co.name}</option>`).join('');
  return c.html(NEW_SOLUTION_HTML.replace('__OPTIONS__', options));
});

// HTML templates defined at bottom for readability
const DASHBOARD_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Resolvd admin</title>
<style>
  :root{--bg:#F5F1E8;--surface:#FBF8F1;--border:#E8E2D4;--text:#1A2420;--muted:#6B6558;--accent:#2D6A4F;--amber:#F5E8D0;--amberT:#7A4F0E;--green:#E1F0E8;--greenT:#1B4332;}
  *{box-sizing:border-box}
  body{font-family:-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--text);margin:0;padding:0;font-size:14px}
  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 20px;display:flex;gap:16px;align-items:center;position:sticky;top:0;z-index:10}
  .topbar h1{margin:0;font-size:18px;font-weight:800}
  .topbar nav{display:flex;gap:14px;margin-left:auto;flex-wrap:wrap}
  .topbar nav a{color:var(--accent);text-decoration:none;font-size:13px}
  .container{max-width:1200px;margin:0 auto;padding:20px}
  .section{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px}
  .section h2{margin:0 0 12px 0;font-size:15px;font-weight:800;display:flex;justify-content:space-between;align-items:center}
  .section h2 .count{background:var(--border);color:var(--muted);font-size:11px;padding:2px 8px;border-radius:12px;font-weight:500}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{text-align:left;color:var(--muted);font-weight:500;padding:8px 10px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
  td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
  tr:last-child td{border-bottom:none}
  code{background:var(--bg);padding:1px 6px;border-radius:4px;font-size:11px;color:var(--muted);word-break:break-all}
  .btn{background:var(--accent);color:white;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;text-decoration:none;display:inline-block}
  .btn.secondary{background:transparent;color:var(--accent);border:1px solid var(--accent)}
  .btn.danger{background:transparent;color:var(--amberT);border:1px solid var(--amberT)}
  .badge{padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;display:inline-block}
  .badge.green{background:var(--green);color:var(--greenT)}
  .badge.amber{background:var(--amber);color:var(--amberT)}
  .badge.neutral{background:var(--border);color:var(--muted)}
  .badge.admin{background:var(--accent);color:white}
  .actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  select,input{padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--surface);font-family:inherit}
  .empty{color:var(--muted);font-style:italic;padding:20px;text-align:center}
  .search{margin-bottom:10px}
  .search input{width:100%;padding:8px 10px;font-size:13px}
  details.inline summary{cursor:pointer;color:var(--accent);font-size:12px;padding:2px 0}
  details.inline .body{margin-top:8px;padding:10px;background:var(--bg);border-radius:6px;white-space:pre-wrap;font-size:12px}
</style>
</head><body>
<div class="topbar">
  <h1>Re|solvd admin</h1>
  <nav>
    <a href="/admin/dashboard">Dashboard</a>
    <a href="/admin/new-company-form">+ Bedrift</a>
    <a href="/admin/new-user-form">+ Bruker</a>
    <a href="/admin/new-article-form">+ Artikkel</a>
    <a href="/admin/new-lesson-form">+ Leksjon</a>
    <a href="/admin/new-solution-form">+ AI-løsning</a>
    <a href="#" id="signout">Logg ut</a>
  </nav>
</div>
<div class="container">
  <div class="section">
    <h2>Ventende invitasjoner <span class="count" id="invCount">0</span></h2>
    <table id="invTable"><thead><tr><th>E-post / telefon</th><th>Bedrift</th><th>Status</th><th>Invitert av</th><th>Handlinger</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Brukere <span class="count" id="userCount">0</span></h2>
    <div class="search"><input type="search" id="userSearch" placeholder="Søk brukere..."></div>
    <table id="userTable"><thead><tr><th>Navn</th><th>E-post</th><th>Passord</th><th>Rolle</th><th>Bedrift</th><th>Opprettet</th><th>Handlinger</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Bedrifter <span class="count" id="compCount">0</span></h2>
    <table id="compTable"><thead><tr><th>Navn</th><th>Bransje</th><th>ID</th><th>Opprettet</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Innhold <span class="count" id="postCount">0</span></h2>
    <div class="search"><input type="search" id="postSearch" placeholder="Søk tittel..."></div>
    <table id="postTable"><thead><tr><th>Type</th><th>Tittel</th><th>Kategori / nivå</th><th>Publisert</th><th>Handlinger</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Meldinger <span class="count" id="reqCount">0</span></h2>
    <table id="reqTable"><thead><tr><th>Tittel</th><th>Bedrift</th><th>Fra</th><th>Status</th><th>Oppdatert</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>AI-løsninger <span class="count" id="solCount">0</span></h2>
    <table id="solTable"><thead><tr><th>Navn</th><th>Bedrift</th><th>Status</th><th>Undertekst</th><th>Handlinger</th></tr></thead><tbody></tbody></table>
  </div>
</div>

<script>
const roleClass = { ADMIN: 'admin', OWNER: 'green', EMPLOYEE: 'neutral' };
function fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('no-NO') + ' ' + d.toTimeString().slice(0,5); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function load() {
  const r = await fetch('/admin/overview', { credentials: 'include' });
  if (!r.ok) { alert('Kunne ikke laste. Logget ut?'); return; }
  const d = await r.json();

  document.getElementById('invCount').textContent = d.invitations.length;
  document.querySelector('#invTable tbody').innerHTML = d.invitations.length ? d.invitations.map(i =>
    '<tr><td>' + esc(i.invitedIdentifier) + '</td><td>' + esc(i.company) + '</td>' +
    '<td><span class="badge ' + (i.status === 'PENDING' ? 'amber' : 'green') + '">' + i.status + '</span></td>' +
    '<td>' + esc(i.invitedBy) + '</td>' +
    '<td><div class="actions">' +
    (i.status === 'PENDING' ? '<button class="btn" onclick="approveInv(\\'' + i.id + '\\')">Godkjenn</button> <button class="btn danger" onclick="rejectInv(\\'' + i.id + '\\')">Avvis</button>' : '—') +
    '</div></td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen ventende invitasjoner</td></tr>';

  document.getElementById('userCount').textContent = d.users.length;
  window._users = d.users;
  renderUsers(d.users);

  document.getElementById('compCount').textContent = d.companies.length;
  document.querySelector('#compTable tbody').innerHTML = d.companies.length ? d.companies.map(c =>
    '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.industry) + '</td><td><code>' + esc(c.id) + '</code></td><td>' + fmtDate(c.createdAt) + '</td></tr>'
  ).join('') : '<tr><td colspan="4" class="empty">Ingen bedrifter</td></tr>';

  document.getElementById('postCount').textContent = d.posts.length;
  window._posts = d.posts;
  renderPosts(d.posts);

  document.getElementById('reqCount').textContent = d.requests.length;
  document.querySelector('#reqTable tbody').innerHTML = d.requests.length ? d.requests.map(r =>
    '<tr><td><details class="inline"><summary>' + esc(r.title) + '</summary><div class="body">' + esc(r.description) + '</div></details></td>' +
    '<td>' + esc(r.company) + '</td>' +
    '<td>' + esc(r.createdBy) + '</td>' +
    '<td><select onchange="updateReqStatus(\\'' + r.id + '\\', this.value)">' +
      '<option value="I_ARBEID"' + (r.status === 'I_ARBEID' ? ' selected' : '') + '>I arbeid</option>' +
      '<option value="VENTER_PA_DEG"' + (r.status === 'VENTER_PA_DEG' ? ' selected' : '') + '>Venter på deg</option>' +
      '<option value="FERDIG"' + (r.status === 'FERDIG' ? ' selected' : '') + '>Ferdig</option>' +
    '</select></td>' +
    '<td>' + fmtDate(r.updatedAt) + '</td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen meldinger</td></tr>';

  document.getElementById('solCount').textContent = d.solutions.length;
  document.querySelector('#solTable tbody').innerHTML = d.solutions.length ? d.solutions.map(s =>
    '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.company) + '</td>' +
    '<td><span class="badge ' + (s.status === 'ACTIVE' ? 'green' : 'neutral') + '">' + s.status + '</span></td>' +
    '<td>' + esc(s.subtitle || '—') + '</td>' +
    '<td><button class="btn danger" onclick="deleteSolution(\\'' + s.id + '\\')">Slett</button></td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen løsninger. <a href="/admin/new-solution-form">Opprett en</a></td></tr>';
}

function renderUsers(users) {
  document.querySelector('#userTable tbody').innerHTML = users.length ? users.map(u =>
    '<tr>' +
    '<td>' + esc(u.name) + '</td>' +
    '<td><code>' + esc(u.email) + '</code></td>' +
    '<td>' + (u.plaintextPassword ? '<code>' + esc(u.plaintextPassword) + '</code>' : '<span style="color:var(--muted);font-style:italic">ikke lagret</span>') + '</td>' +
    '<td><span class="badge ' + roleClass[u.role] + '">' + u.role + '</span></td>' +
    '<td>' + esc(u.company || '—') + '</td>' +
    '<td>' + fmtDate(u.createdAt) + '</td>' +
    '<td><div class="actions">' +
    '<button class="btn secondary" onclick="resetPw(\\'' + u.id + '\\', \\'' + esc(u.email) + '\\')">Nytt passord</button> ' +
    '<button class="btn danger" onclick="deleteUser(\\'' + u.id + '\\', \\'' + esc(u.email) + '\\')">Slett</button>' +
    '</div></td></tr>'
  ).join('') : '<tr><td colspan="7" class="empty">Ingen brukere</td></tr>';
}

function renderPosts(posts) {
  document.querySelector('#postTable tbody').innerHTML = posts.length ? posts.map(p =>
    '<tr><td><span class="badge ' + (p.kind === 'LESSON' ? 'amber' : 'green') + '">' + p.kind + '</span></td>' +
    '<td><details class="inline"><summary>' + esc(p.title) + '</summary><div class="body">ID: ' + esc(p.id) + '\\nScope: ' + p.scopeType + '</div></details></td>' +
    '<td>' + (p.kind === 'LESSON' ? (p.lessonLevel || '') + ' / #' + (p.lessonOrder || '?') : (p.category || '—')) + '</td>' +
    '<td>' + fmtDate(p.publishedAt) + '</td>' +
    '<td><button class="btn danger" onclick="deletePost(\\'' + p.id + '\\')">Slett</button></td></tr>'
  ).join('') : '<tr><td colspan="5" class="empty">Ingen innhold. Lag en <a href="/admin/new-article-form">artikkel</a> eller <a href="/admin/new-lesson-form">leksjon</a>.</td></tr>';
}

document.getElementById('userSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderUsers((window._users || []).filter(u => [u.name, u.email, u.company, u.role].join(' ').toLowerCase().includes(q)));
});
document.getElementById('postSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderPosts((window._posts || []).filter(p => [p.title, p.category || '', p.kind].join(' ').toLowerCase().includes(q)));
});

async function approveInv(id) {
  const r = await fetch('/admin/invitations/' + id + '/approve', { method: 'POST', credentials: 'include' });
  if (r.ok) { alert('Godkjent. Opprett så en bruker for denne e-posten via +Bruker-skjemaet.'); load(); }
  else alert('Feilet');
}
async function rejectInv(id) {
  if (!confirm('Avvis denne invitasjonen?')) return;
  const r = await fetch('/admin/invitations/' + id + '/reject', { method: 'POST', credentials: 'include' });
  if (r.ok) load(); else alert('Feilet');
}
async function resetPw(userId, email) {
  const p = prompt('Nytt passord for ' + email + ' (min 8 tegn):');
  if (!p) return;
  if (p.length < 8) { alert('Minimum 8 tegn'); return; }
  const r = await fetch('/admin/users/reset-password', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, newPassword: p }) });
  if (r.ok) { alert('Passord oppdatert.'); load(); } else alert('Feilet');
}
async function deleteUser(id, email) {
  if (!confirm('Slette ' + email + '? Dette kan ikke angres.')) return;
  const r = await fetch('/admin/users/' + id, { method: 'DELETE', credentials: 'include' });
  if (r.ok) load(); else alert('Feilet');
}
async function updateReqStatus(id, status) {
  const r = await fetch('/admin/requests/' + id + '/status', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
  if (!r.ok) alert('Kunne ikke oppdatere status');
  load();
}
async function deletePost(id) {
  if (!confirm('Slette dette innlegget?')) return;
  const r = await fetch('/admin/posts/' + id, { method: 'DELETE', credentials: 'include' });
  if (r.ok) load(); else alert('Feilet');
}
async function deleteSolution(id) {
  if (!confirm('Slette denne løsningen? Bruk-historikk slettes også.')) return;
  const r = await fetch('/admin/solutions/' + id, { method: 'DELETE', credentials: 'include' });
  if (r.ok) load(); else alert('Feilet');
}
document.getElementById('signout').onclick = async (e) => {
  e.preventDefault();
  await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
  location.href = '/admin/sign-in';
};

load();
</script>
</body></html>`;

const NEW_ARTICLE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Ny artikkel</title>
<style>body{font-family:-apple-system,sans-serif;padding:24px;max-width:640px;margin:0 auto;background:#F5F1E8;color:#1A2420}label{display:block;margin:10px 0 2px;font-size:12px;color:#6B6558;font-weight:500}input,select,textarea{display:block;width:100%;padding:10px;font-size:14px;box-sizing:border-box;border:1px solid #E8E2D4;border-radius:6px;background:#FBF8F1;font-family:inherit}textarea{min-height:240px;resize:vertical}button{padding:12px 20px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:12px}a{color:#2D6A4F}h2{margin-top:0}</style>
</head><body>
<h2>Ny artikkel</h2>
<p><a href="/admin/dashboard">← Tilbake til dashboard</a></p>
<form id="f">
  <label>Tittel</label><input name="title" required maxlength="200">
  <label>Kategori</label>
  <select name="category">
    <option value="Ny løsning">Ny løsning</option>
    <option value="Kundehistorie">Kundehistorie</option>
    <option value="Prompt-bibliotek">Prompt-bibliotek</option>
    <option value="Bransje-tips">Bransje-tips</option>
    <option value="Nyheter">Nyheter</option>
  </select>
  <label>Lesetid (minutter)</label><input name="readingMinutes" type="number" min="1" max="60" value="3">
  <label>Synlighet</label>
  <select name="scopeType" id="scopeType">
    <option value="GLOBAL">Alle brukere</option>
    <option value="TAG">Kun brukere med bestemt bransje</option>
  </select>
  <div id="tagField" style="display:none">
    <label>Bransje-navn (f.eks. "Rørleggere" — må matche eksisterende tag)</label>
    <input name="tagName" placeholder="Rørleggere">
  </div>
  <label>Innhold (markdown støttes)</label><textarea name="body" required></textarea>
  <label><input type="checkbox" name="publishNow" checked style="width:auto;display:inline-block;margin-right:6px"> Publiser umiddelbart</label>
  <button>Opprett artikkel</button>
  <p id="msg" style="margin-top:12px"></p>
</form>
<script>
  document.getElementById('scopeType').onchange = (e) => {
    document.getElementById('tagField').style.display = e.target.value === 'TAG' ? 'block' : 'none';
  };
  async function resolveTag(name) {
    if (!name) return null;
    const r = await fetch('/admin/tags/' + encodeURIComponent(name), { credentials: 'include' });
    if (r.ok) { const j = await r.json(); return j.id; }
    return null;
  }
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      kind: 'ARTICLE',
      scopeType: f.get('scopeType'),
      title: f.get('title'),
      body: f.get('body'),
      category: f.get('category'),
      readingMinutes: Number(f.get('readingMinutes')) || undefined,
      publishNow: f.get('publishNow') === 'on',
    };
    if (body.scopeType === 'TAG') {
      const tagName = f.get('tagName');
      const tagId = await resolveTag(tagName);
      if (!tagId) { document.getElementById('msg').textContent = 'Fant ikke tag "' + tagName + '". Sjekk at bedrift med den bransjen finnes.'; return; }
      body.tagIds = [tagId];
    }
    const res = await fetch('/admin/posts', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const msg = document.getElementById('msg');
    if (res.ok) { msg.textContent = 'Artikkel opprettet ✓'; msg.style.color = '#2D6A4F'; e.target.reset(); }
    else { const b = await res.text(); msg.textContent = 'Feil: ' + b; msg.style.color = '#7A4F0E'; }
  };
</script>
</body></html>`;

const NEW_LESSON_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Ny leksjon</title>
<style>body{font-family:-apple-system,sans-serif;padding:24px;max-width:640px;margin:0 auto;background:#F5F1E8;color:#1A2420}label{display:block;margin:10px 0 2px;font-size:12px;color:#6B6558;font-weight:500}input,select,textarea{display:block;width:100%;padding:10px;font-size:14px;box-sizing:border-box;border:1px solid #E8E2D4;border-radius:6px;background:#FBF8F1;font-family:inherit}textarea{min-height:240px;resize:vertical}button{padding:12px 20px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:12px}a{color:#2D6A4F}h2{margin-top:0}</style>
</head><body>
<h2>Ny leksjon</h2>
<p><a href="/admin/dashboard">← Tilbake til dashboard</a></p>
<form id="f">
  <label>Tittel</label><input name="title" required maxlength="200">
  <label>Nivå</label>
  <select name="lessonLevel" required>
    <option value="BEGINNER">Nybegynner — "Aldri brukt AI"</option>
    <option value="INTER" selected>Middels — "Har prøvd litt"</option>
    <option value="ADVANCED">Avansert — "Bruker det jevnlig"</option>
  </select>
  <label>Rekkefølge (1, 2, 3, ...)</label><input name="lessonOrder" type="number" min="1" value="1" required>
  <label>Lesetid (minutter)</label><input name="readingMinutes" type="number" min="1" max="120" value="5">
  <label>Innhold (markdown støttes)</label><textarea name="body" required></textarea>
  <label><input type="checkbox" name="publishNow" checked style="width:auto;display:inline-block;margin-right:6px"> Publiser umiddelbart</label>
  <button>Opprett leksjon</button>
  <p id="msg" style="margin-top:12px"></p>
</form>
<script>
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      kind: 'LESSON',
      scopeType: 'GLOBAL',
      title: f.get('title'),
      body: f.get('body'),
      lessonLevel: f.get('lessonLevel'),
      lessonOrder: Number(f.get('lessonOrder')),
      readingMinutes: Number(f.get('readingMinutes')) || undefined,
      publishNow: f.get('publishNow') === 'on',
    };
    const res = await fetch('/admin/posts', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const msg = document.getElementById('msg');
    if (res.ok) { msg.textContent = 'Leksjon opprettet ✓'; msg.style.color = '#2D6A4F'; e.target.reset(); }
    else { const b = await res.text(); msg.textContent = 'Feil: ' + b; msg.style.color = '#7A4F0E'; }
  };
</script>
</body></html>`;

const NEW_SOLUTION_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Ny AI-løsning</title>
<style>body{font-family:-apple-system,sans-serif;padding:24px;max-width:480px;margin:0 auto;background:#F5F1E8;color:#1A2420}label{display:block;margin:10px 0 2px;font-size:12px;color:#6B6558;font-weight:500}input,select{display:block;width:100%;padding:10px;font-size:14px;box-sizing:border-box;border:1px solid #E8E2D4;border-radius:6px;background:#FBF8F1}button{padding:12px 20px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer;font-size:14px;margin-top:12px}a{color:#2D6A4F}h2{margin-top:0}</style>
</head><body>
<h2>Ny AI-løsning</h2>
<p><a href="/admin/dashboard">← Tilbake</a></p>
<form id="f">
  <label>Navn</label><input name="name" required>
  <label>Bedrift</label><select name="companyId" required>__OPTIONS__</select>
  <label>Undertekst (valgfri, f.eks. "Aktiv · 12 svar i går")</label><input name="subtitle">
  <label>Status</label>
  <select name="status"><option value="ACTIVE">Aktiv</option><option value="INACTIVE">Inaktiv</option></select>
  <button>Opprett</button>
  <p id="msg" style="margin-top:12px"></p>
</form>
<script>
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    if (!body.subtitle) delete body.subtitle;
    const res = await fetch('/admin/solutions', { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const msg = document.getElementById('msg');
    if (res.ok) { msg.textContent = 'Opprettet ✓'; msg.style.color = '#2D6A4F'; e.target.reset(); }
    else { const b = await res.text(); msg.textContent = 'Feil: ' + b; msg.style.color = '#7A4F0E'; }
  };
</script>
</body></html>`;

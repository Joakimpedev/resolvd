import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../auth.js';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const cuidParam = z.object({ id: z.string().min(20).max(30) });

// ─── Unauthenticated admin routes (sign-in page) ──────────────────────
export const adminPublicRoutes = new Hono();

adminPublicRoutes.get('/sign-in', (c) => c.html(`<!doctype html><html><head><meta charset="utf-8"><title>Resolvd admin login</title>
<style>body{font-family:sans-serif;padding:40px;max-width:320px;margin:0 auto}input{display:block;width:100%;padding:10px;margin:8px 0;font-size:14px;box-sizing:border-box}button{padding:10px 16px;background:#2D6A4F;color:white;border:0;border-radius:6px;cursor:pointer;width:100%;font-size:14px}h2{font-weight:800}</style>
</head><body>
<h2>Admin login</h2>
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
    if (r.ok) location.href = '/admin/new-user-form';
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
  companyId: z.string().min(20).max(30),
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
    data: { avatarInitial, companyId, role },
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

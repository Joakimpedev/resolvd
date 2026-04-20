import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const companiesRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const upsertSchema = z.object({
  name: z.string().min(1).max(200),
});

companiesRoutes.get('/', async (c) => {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true, _count: { select: { users: true } } },
  });
  return c.json({
    companies: companies.map(co => ({
      id: co.id,
      name: co.name,
      createdAt: co.createdAt.toISOString(),
      userCount: co._count.users,
    })),
  });
});

companiesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const company = await prisma.company.create({ data: parsed.data });
  return c.json({ company });
});

companiesRoutes.patch('/:id', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const company = await prisma.company.update({ where: { id: idParsed.data.id }, data: parsed.data });
  return c.json({ company });
});

companiesRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.company.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

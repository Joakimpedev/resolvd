import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const solutionsRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const createSchema = z.object({
  companyId: z.string().min(10).max(64),
  name: z.string().min(1).max(100),
  subtitle: z.string().max(200).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

solutionsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const solution = await prisma.solution.create({ data: parsed.data });
  return c.json({ solution });
});

solutionsRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.solution.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

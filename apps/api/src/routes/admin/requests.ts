import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const requestsAdminRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const statusSchema = z.object({
  status: z.enum(['I_ARBEID', 'VENTER_PA_DEG', 'FERDIG']),
});

requestsAdminRoutes.post('/:id/status', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = statusSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);
  await prisma.request.update({
    where: { id: parsed.data.id },
    data: { status: bodyParsed.data.status },
  });
  return c.json({ ok: true });
});

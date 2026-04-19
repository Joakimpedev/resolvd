import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { Request as RequestRow } from '@prisma/client';

export const requestsRoutes = new Hono();

requestsRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const all = await prisma.request.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
  });

  const active = all.filter(r => r.status !== 'FERDIG').map(serialize);
  const completed = all.filter(r => r.status === 'FERDIG').map(serialize);

  return c.json({ active, completed });
});

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
});

requestsRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const request = await prisma.request.create({
    data: {
      companyId,
      createdByUserId: userId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: 'I_ARBEID',
    },
  });
  return c.json({ request: serialize(request) });
});

function serialize(r: RequestRow) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

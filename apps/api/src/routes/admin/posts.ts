import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const postsAdminRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const createSchema = z.object({
  kind: z.enum(['ARTICLE', 'LESSON', 'BROADCAST']),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  category: z.string().max(50).nullable().optional(),
  readingMinutes: z.number().int().min(1).max(600).nullable().optional(),
  everyone: z.boolean().default(false),
  companyIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  moduleId: z.string().nullable().optional(),
  moduleOrder: z.number().int().min(1).nullable().optional(),
  publishNow: z.boolean().default(true),
});

const updateSchema = createSchema.partial().extend({
  publishNow: z.boolean().optional(),
});

postsAdminRoutes.get('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const post = await prisma.post.findUnique({
    where: { id: parsed.data.id },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      module:    { select: { id: true, title: true, courseId: true } },
    },
  });
  if (!post) return c.json({ error: 'Not found' }, 404);
  return c.json({ post });
});

postsAdminRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { companyIds, tagIds, publishNow, moduleId, moduleOrder, ...rest } = parsed.data;

  const post = await prisma.post.create({
    data: {
      ...rest,
      authorUserId: c.get('userId'),
      publishedAt: publishNow ? new Date() : null,
      moduleId: moduleId ?? null,
      moduleOrder: moduleOrder ?? null,
      companies: companyIds.length ? { connect: companyIds.map(id => ({ id })) } : undefined,
      tags:      tagIds.length      ? { connect: tagIds.map(id => ({ id })) }      : undefined,
    },
  });
  return c.json({ post });
});

postsAdminRoutes.patch('/:id', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { companyIds, tagIds, publishNow, moduleId, moduleOrder, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (publishNow !== undefined) data.publishedAt = publishNow ? new Date() : null;
  if (moduleId !== undefined) data.moduleId = moduleId;
  if (moduleOrder !== undefined) data.moduleOrder = moduleOrder;
  if (companyIds !== undefined) data.companies = { set: companyIds.map(id => ({ id })) };
  if (tagIds      !== undefined) data.tags      = { set: tagIds.map(id => ({ id })) };

  const post = await prisma.post.update({ where: { id: idParsed.data.id }, data });
  return c.json({ post });
});

postsAdminRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.post.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

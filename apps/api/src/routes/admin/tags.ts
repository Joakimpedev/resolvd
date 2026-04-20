import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const tagsRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const upsertSchema = z.object({
  name: z.string().min(1).max(100),
});

tagsRoutes.get('/', async (c) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, posts: true, courses: true } },
    },
  });
  return c.json({
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      userCount: t._count.users,
      postCount: t._count.posts,
      courseCount: t._count.courses,
    })),
  });
});

tagsRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const tag = await prisma.tag.create({ data: parsed.data });
  return c.json({ tag });
});

tagsRoutes.patch('/:id', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const tag = await prisma.tag.update({ where: { id: idParsed.data.id }, data: parsed.data });
  return c.json({ tag });
});

tagsRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.tag.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

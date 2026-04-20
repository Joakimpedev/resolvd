import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';

export const requestsRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

// GET /api/requests — list company requests.
requestsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const requests = await prisma.request.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, avatarInitial: true } },
      views: { where: { userId }, select: { lastViewedAt: true } },
      _count: { select: { comments: true } },
      comments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  });

  return c.json({
    requests: requests.map((r) => {
      const lastCommentAt = r.comments[0]?.createdAt ?? r.updatedAt;
      const lastViewed = r.views[0]?.lastViewedAt ?? null;
      const hasUnread = !lastViewed || lastCommentAt > lastViewed;
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        createdBy: r.createdBy,
        commentCount: r._count.comments,
        lastActivityAt: lastCommentAt.toISOString(),
        promotedAt: r.promotedAt?.toISOString() ?? null,
        hasUnread,
      };
    }),
  });
});

// GET /api/requests/unread-count — for tab badge.
requestsRoutes.get('/unread-count', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ count: 0 });

  const requests = await prisma.request.findMany({
    where: { companyId },
    select: {
      id: true,
      updatedAt: true,
      views: { where: { userId }, select: { lastViewedAt: true } },
      comments: { select: { createdAt: true } },
    },
  });

  let count = 0;
  for (const r of requests) {
    const times = [r.updatedAt.getTime(), ...r.comments.map((c) => c.createdAt.getTime())];
    const last = Math.max(...times);
    const lastViewed = r.views[0]?.lastViewedAt.getTime() ?? 0;
    if (last > lastViewed) count++;
  }
  return c.json({ count });
});

// GET /api/requests/:id — request detail with full comment thread.
requestsRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);

  const request = await prisma.request.findFirst({
    where: { id: parsed.data.id, companyId },
    include: {
      createdBy: { select: { id: true, name: true, avatarInitial: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, avatarInitial: true, role: true } } },
      },
    },
  });
  if (!request) return c.json({ error: 'Not found' }, 404);

  await prisma.requestView.upsert({
    where: { userId_requestId: { userId, requestId: request.id } },
    create: { userId, requestId: request.id, lastViewedAt: new Date() },
    update: { lastViewedAt: new Date() },
  });

  return c.json({
    request: {
      id: request.id,
      title: request.title,
      description: request.description,
      status: request.status,
      createdBy: request.createdBy,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      promotedAt: request.promotedAt?.toISOString() ?? null,
      promotedToTaskId: request.promotedToTaskId,
      comments: request.comments.map((cm) => ({
        id: cm.id,
        body: cm.body,
        user: cm.user,
        createdAt: cm.createdAt.toISOString(),
      })),
    },
  });
});

// POST /api/requests — user creates a new request.
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
      status: 'OPEN',
    },
  });
  return c.json({
    request: {
      id: request.id,
      title: request.title,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    },
  });
});

// POST /api/requests/:id/comments — admin, owner, employee all allowed.
const commentSchema = z.object({ body: z.string().min(1).max(2000) });

requestsRoutes.post('/:id/comments', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);

  const request = await prisma.request.findFirst({
    where: { id: parsed.data.id, companyId },
    select: { id: true },
  });
  if (!request) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const bodyParsed = commentSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);

  const comment = await prisma.requestComment.create({
    data: { requestId: request.id, userId, body: bodyParsed.data.body },
    include: { user: { select: { id: true, name: true, avatarInitial: true, role: true } } },
  });

  await prisma.request.update({
    where: { id: request.id },
    data: { updatedAt: new Date() },
  });

  return c.json({
    comment: {
      id: comment.id,
      body: comment.body,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
    },
  });
});

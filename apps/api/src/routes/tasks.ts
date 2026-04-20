import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';

export const tasksRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });
const eventParam = z.object({ eventId: z.string().min(10).max(64) });

// GET /api/tasks — list tasks for the user's company.
tasksRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const tasks = await prisma.task.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatarInitial: true } } } },
      priceViewers: { select: { userId: true } },
      views: { where: { userId }, select: { lastViewedAt: true } },
      _count: { select: { events: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, comments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } },
      },
    },
  });

  return c.json({
    tasks: tasks.map((t) => {
      const canSeePrice = t.priceViewers.some((pv) => pv.userId === userId);
      const lastActivity = t.events[0]
        ? new Date(Math.max(
            t.events[0].createdAt.getTime(),
            t.events[0].comments[0]?.createdAt.getTime() ?? 0,
          ))
        : t.updatedAt;
      const lastViewed = t.views[0]?.lastViewedAt ?? null;
      const hasUnread = !lastViewed || lastActivity > lastViewed;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priceOre: canSeePrice ? t.priceOre : null,
        canSeePrice,
        eventCount: t._count.events,
        assignees: t.assignees.map((a) => a.user),
        isAssigned: t.assignees.some((a) => a.userId === userId),
        lastActivityAt: lastActivity.toISOString(),
        hasUnread,
      };
    }),
  });
});

// GET /api/tasks/unread-count — for tab badge.
tasksRoutes.get('/unread-count', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ count: 0 });

  const tasks = await prisma.task.findMany({
    where: { companyId },
    select: {
      id: true,
      updatedAt: true,
      views: { where: { userId }, select: { lastViewedAt: true } },
      events: { select: { createdAt: true, comments: { select: { createdAt: true } } } },
    },
  });

  let count = 0;
  for (const t of tasks) {
    const activityTimes = [
      t.updatedAt.getTime(),
      ...t.events.map((e) => e.createdAt.getTime()),
      ...t.events.flatMap((e) => e.comments.map((c) => c.createdAt.getTime())),
    ];
    const last = Math.max(...activityTimes);
    const lastViewed = t.views[0]?.lastViewedAt.getTime() ?? 0;
    if (last > lastViewed) count++;
  }
  return c.json({ count });
});

// GET /api/tasks/:id — task detail including timeline events.
tasksRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);

  const task = await prisma.task.findFirst({
    where: { id: parsed.data.id, companyId },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, avatarInitial: true } } } },
      priceViewers: { select: { userId: true } },
      events: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, avatarInitial: true } },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, name: true, avatarInitial: true } } },
          },
        },
      },
    },
  });
  if (!task) return c.json({ error: 'Not found' }, 404);

  const canSeePrice = task.priceViewers.some((pv) => pv.userId === userId);

  await prisma.taskView.upsert({
    where: { userId_taskId: { userId, taskId: task.id } },
    create: { userId, taskId: task.id, lastViewedAt: new Date() },
    update: { lastViewedAt: new Date() },
  });

  return c.json({
    task: {
      id: task.id,
      title: task.title,
      descriptionMd: task.descriptionMd,
      status: task.status,
      priceOre: canSeePrice ? task.priceOre : null,
      canSeePrice,
      assignees: task.assignees.map((a) => a.user),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      events: task.events.map((e) => ({
        id: e.id,
        header: e.header,
        body: e.body,
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
        comments: e.comments.map((cm) => ({
          id: cm.id,
          body: cm.body,
          user: cm.user,
          createdAt: cm.createdAt.toISOString(),
        })),
      })),
    },
  });
});

// POST /api/tasks/:id/events/:eventId/comments — any company user can comment.
const commentSchema = z.object({ body: z.string().min(1).max(2000) });

tasksRoutes.post('/:id/events/:eventId/comments', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  const eventParsed = eventParam.safeParse({ eventId: c.req.param('eventId') });
  if (!parsed.success || !eventParsed.success) return c.json({ error: 'Invalid id' }, 400);

  const event = await prisma.taskEvent.findFirst({
    where: { id: eventParsed.data.eventId, taskId: parsed.data.id, task: { companyId } },
    select: { id: true },
  });
  if (!event) return c.json({ error: 'Not found' }, 404);

  const body = await c.req.json();
  const bodyParsed = commentSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);

  const comment = await prisma.taskEventComment.create({
    data: { eventId: event.id, userId, body: bodyParsed.data.body },
    include: { user: { select: { id: true, name: true, avatarInitial: true } } },
  });

  await prisma.task.update({
    where: { id: parsed.data.id },
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

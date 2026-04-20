import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const requestsAdminRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

// POST /admin/requests/:id/status — resolve or reopen.
const statusSchema = z.object({ status: z.enum(['OPEN', 'RESOLVED']) });

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

// POST /admin/requests/:id/comments — admin replies on a request thread.
const commentSchema = z.object({ body: z.string().min(1).max(2000) });

requestsAdminRoutes.post('/:id/comments', async (c) => {
  const adminUserId = c.get('userId');
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = commentSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);

  const comment = await prisma.requestComment.create({
    data: { requestId: parsed.data.id, userId: adminUserId, body: bodyParsed.data.body },
  });
  await prisma.request.update({
    where: { id: parsed.data.id },
    data: { updatedAt: new Date() },
  });
  return c.json({ comment: { id: comment.id } });
});

// POST /admin/requests/:id/promote — mark as promoted; returns prefill data.
// Does NOT create the task — admin fills in extras (assignees, price) before saving.
requestsAdminRoutes.post('/:id/promote', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);

  const request = await prisma.request.findUniqueOrThrow({
    where: { id: parsed.data.id },
    select: { id: true, companyId: true, title: true, description: true, status: true },
  });

  await prisma.request.update({
    where: { id: request.id },
    data: { status: 'PROMOTED', promotedAt: new Date() },
  });

  return c.json({
    prefill: {
      companyId: request.companyId,
      title: request.title,
      descriptionMd: request.description,
    },
    requestId: request.id,
  });
});

// POST /admin/requests/:id/link-task — after admin creates the task, record the link.
const linkSchema = z.object({ taskId: z.string().min(10).max(64) });
requestsAdminRoutes.post('/:id/link-task', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = linkSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);
  await prisma.request.update({
    where: { id: parsed.data.id },
    data: { promotedToTaskId: bodyParsed.data.taskId },
  });
  return c.json({ ok: true });
});

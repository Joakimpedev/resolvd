import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const tasksAdminRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const createSchema = z.object({
  companyId: z.string().min(10).max(64),
  title: z.string().min(1).max(120),
  descriptionMd: z.string().max(20000).default(''),
  priceOre: z.number().int().min(0).nullable().optional(),
  assigneeUserIds: z.array(z.string().min(10).max(64)).default([]),
  priceViewerUserIds: z.array(z.string().min(10).max(64)).default([]),
  status: z.enum(['NY', 'I_ARBEID', 'FERDIG']).default('NY'),
  initialEventHeader: z.string().min(1).max(200).default('Oppgave opprettet'),
  initialEventBody: z.string().max(4000).default(''),
});

// POST /admin/tasks — create task with auto-seeded initial event.
tasksAdminRoutes.post('/', async (c) => {
  const adminUserId = c.get('userId');
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const d = parsed.data;

  const task = await prisma.task.create({
    data: {
      companyId: d.companyId,
      title: d.title,
      descriptionMd: d.descriptionMd,
      priceOre: d.priceOre ?? null,
      status: d.status,
      createdByUserId: adminUserId,
      assignees: { create: d.assigneeUserIds.map((userId) => ({ userId })) },
      priceViewers: { create: d.priceViewerUserIds.map((userId) => ({ userId })) },
      events: {
        create: {
          header: d.initialEventHeader,
          body: d.initialEventBody,
          createdByUserId: adminUserId,
        },
      },
    },
  });
  return c.json({ task: { id: task.id } });
});

// PATCH /admin/tasks/:id — edit task metadata + replace assignee/viewer lists.
const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  descriptionMd: z.string().max(20000).optional(),
  priceOre: z.number().int().min(0).nullable().optional(),
  status: z.enum(['NY', 'I_ARBEID', 'FERDIG']).optional(),
  assigneeUserIds: z.array(z.string().min(10).max(64)).optional(),
  priceViewerUserIds: z.array(z.string().min(10).max(64)).optional(),
});

tasksAdminRoutes.patch('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = updateSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);
  const d = bodyParsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: parsed.data.id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.descriptionMd !== undefined ? { descriptionMd: d.descriptionMd } : {}),
        ...(d.priceOre !== undefined ? { priceOre: d.priceOre } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
      },
    });
    if (d.assigneeUserIds) {
      await tx.taskAssignee.deleteMany({ where: { taskId: parsed.data.id } });
      if (d.assigneeUserIds.length > 0) {
        await tx.taskAssignee.createMany({
          data: d.assigneeUserIds.map((userId) => ({ taskId: parsed.data.id, userId })),
        });
      }
    }
    if (d.priceViewerUserIds) {
      await tx.taskPriceViewer.deleteMany({ where: { taskId: parsed.data.id } });
      if (d.priceViewerUserIds.length > 0) {
        await tx.taskPriceViewer.createMany({
          data: d.priceViewerUserIds.map((userId) => ({ taskId: parsed.data.id, userId })),
        });
      }
    }
  });

  return c.json({ ok: true });
});

// DELETE /admin/tasks/:id
tasksAdminRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.task.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

// POST /admin/tasks/:id/events — add a timeline entry.
const eventSchema = z.object({
  header: z.string().min(1).max(200),
  body: z.string().max(4000).default(''),
});

tasksAdminRoutes.post('/:id/events', async (c) => {
  const adminUserId = c.get('userId');
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const bodyParsed = eventSchema.safeParse(body);
  if (!bodyParsed.success) return c.json({ error: bodyParsed.error.format() }, 400);

  const event = await prisma.taskEvent.create({
    data: {
      taskId: parsed.data.id,
      header: bodyParsed.data.header,
      body: bodyParsed.data.body,
      createdByUserId: adminUserId,
    },
  });
  await prisma.task.update({ where: { id: parsed.data.id }, data: { updatedAt: new Date() } });
  return c.json({ event: { id: event.id } });
});

// DELETE /admin/tasks/:id/events/:eventId
tasksAdminRoutes.delete('/:id/events/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  if (!eventId) return c.json({ error: 'Invalid id' }, 400);
  await prisma.taskEvent.delete({ where: { id: eventId } });
  return c.json({ ok: true });
});

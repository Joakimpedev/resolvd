import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../../db.js';

export const coursesRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const courseCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  coverImage: z.string().max(500).nullable().optional(),
  everyone: z.boolean().default(false),
  companyIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
});

const courseUpdateSchema = courseCreateSchema.partial();

const moduleSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(1),
});

coursesRoutes.get('/', async (c) => {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      _count:    { select: { modules: true } },
    },
  });
  return c.json({
    courses: courses.map(co => ({
      id: co.id,
      title: co.title,
      description: co.description,
      coverImage: co.coverImage,
      everyone: co.everyone,
      companies: co.companies,
      tags: co.tags,
      moduleCount: co._count.modules,
      createdAt: co.createdAt.toISOString(),
    })),
  });
});

coursesRoutes.get('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const course = await prisma.course.findUnique({
    where: { id: parsed.data.id },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { moduleOrder: 'asc' },
            select: { id: true, title: true, readingMinutes: true, moduleOrder: true, publishedAt: true },
          },
        },
      },
    },
  });
  if (!course) return c.json({ error: 'Not found' }, 404);
  return c.json({ course });
});

coursesRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = courseCreateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { companyIds, tagIds, ...rest } = parsed.data;
  const course = await prisma.course.create({
    data: {
      ...rest,
      companies: companyIds.length ? { connect: companyIds.map(id => ({ id })) } : undefined,
      tags:      tagIds.length      ? { connect: tagIds.map(id => ({ id })) }      : undefined,
    },
  });
  return c.json({ course });
});

coursesRoutes.patch('/:id', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = courseUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const { companyIds, tagIds, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (companyIds !== undefined) data.companies = { set: companyIds.map(id => ({ id })) };
  if (tagIds      !== undefined) data.tags      = { set: tagIds.map(id => ({ id })) };

  const course = await prisma.course.update({ where: { id: idParsed.data.id }, data });
  return c.json({ course });
});

coursesRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.course.delete({ where: { id: parsed.data.id } });
  return c.json({ ok: true });
});

// Module CRUD nested under a course
coursesRoutes.post('/:id/modules', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = moduleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const mod = await prisma.module.create({ data: { ...parsed.data, courseId: idParsed.data.id } });
  return c.json({ module: mod });
});

coursesRoutes.patch('/:courseId/modules/:moduleId', async (c) => {
  const moduleParsed = cuidParam.safeParse({ id: c.req.param('moduleId') });
  if (!moduleParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = moduleSchema.partial().safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
  const mod = await prisma.module.update({ where: { id: moduleParsed.data.id }, data: parsed.data });
  return c.json({ module: mod });
});

coursesRoutes.delete('/:courseId/modules/:moduleId', async (c) => {
  const moduleParsed = cuidParam.safeParse({ id: c.req.param('moduleId') });
  if (!moduleParsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.module.delete({ where: { id: moduleParsed.data.id } });
  return c.json({ ok: true });
});

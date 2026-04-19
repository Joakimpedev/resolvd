import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';

export const lessonsRoutes = new Hono();

const idParam = z.object({ id: z.string().min(20).max(30) });

lessonsRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const userLevel = await prisma.userLevel.findUnique({ where: { userId } });
  const level = userLevel?.level ?? 'BEGINNER';

  const lessons = await prisma.post.findMany({
    where: {
      kind: 'LESSON',
      lessonLevel: level,
      publishedAt: { not: null, lte: new Date() },
    },
    orderBy: { lessonOrder: 'asc' },
    include: { progress: { where: { userId }, select: { completedAt: true } } },
  });

  const mapped = lessons.map((l, idx) => ({
    id: l.id,
    title: l.title,
    readingMinutes: l.readingMinutes,
    order: l.lessonOrder ?? idx + 1,
    isCompleted: l.progress.length > 0,
    isNext: false,
    isLocked: false,
  }));

  const firstIncomplete = mapped.findIndex((m) => !m.isCompleted);
  mapped.forEach((m, i) => {
    if (m.isCompleted) return;
    m.isNext = i === firstIncomplete;
    m.isLocked = i !== firstIncomplete;
  });

  const completedCount = mapped.filter((m) => m.isCompleted).length;

  return c.json({
    lessons: mapped,
    level,
    totalCount: mapped.length,
    completedCount,
  });
});

lessonsRoutes.post('/:id/complete', async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const userId = c.get('userId');
  const postId = parsed.data.id;

  const lesson = await prisma.post.findUnique({
    where: { id: postId },
    include: { tags: { select: { id: true } } },
  });
  if (!lesson || lesson.kind !== 'LESSON') return c.json({ error: 'Not a lesson' }, 404);

  if (lesson.scopeType === 'TAG') {
    const userTagIds = (
      await prisma.userTag.findMany({ where: { userId }, select: { tagId: true } })
    ).map((u) => u.tagId);
    const postTagIds = lesson.tags.map((t) => t.id);
    if (!postTagIds.some((id) => userTagIds.includes(id))) {
      return c.json({ error: 'Not found' }, 404);
    }
  } else if (lesson.scopeType !== 'GLOBAL') {
    return c.json({ error: 'Not a Lær lesson' }, 400);
  }

  const userLevel = await prisma.userLevel.findUnique({ where: { userId } });
  if (!userLevel || lesson.lessonLevel !== userLevel.level) {
    return c.json({ error: 'Wrong level' }, 400);
  }

  const priorLessons = await prisma.post.findMany({
    where: {
      kind: 'LESSON',
      lessonLevel: userLevel.level,
      lessonOrder: { lt: lesson.lessonOrder ?? 0 },
    },
    include: { progress: { where: { userId } } },
  });
  if (priorLessons.some((l) => l.progress.length === 0)) {
    return c.json({ error: 'Previous lessons not complete' }, 400);
  }

  await prisma.lessonProgress.upsert({
    where: { userId_postId: { userId, postId } },
    update: {},
    create: { userId, postId },
  });

  return c.json({ ok: true });
});

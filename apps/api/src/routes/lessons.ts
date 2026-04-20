import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';

export const lessonsRoutes = new Hono();

const idParam = z.object({ id: z.string().min(20).max(30) });

async function getUserScope(userId: string) {
  const [userRow, userTags] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }),
    prisma.userTag.findMany({ where: { userId }, select: { tagId: true } }),
  ]);
  return {
    companyId: userRow?.companyId ?? null,
    tagIds: userTags.map(ut => ut.tagId),
  };
}

function isVisible(
  entity: { everyone: boolean; companies: { id: string }[]; tags: { id: string }[] },
  scope: { companyId: string | null; tagIds: string[] },
): boolean {
  if (entity.everyone) return true;
  const hasCompanies = entity.companies.length > 0;
  const hasTags = entity.tags.length > 0;
  if (!hasCompanies && !hasTags) return false;
  const companyOk = !hasCompanies || (!!scope.companyId && entity.companies.some(c => c.id === scope.companyId));
  const tagOk = !hasTags || entity.tags.some(t => scope.tagIds.includes(t.id));
  return companyOk && tagOk;
}

/** GET /lessons/courses — list courses visible to the user with progress summary. */
lessonsRoutes.get('/courses', async (c) => {
  const userId = c.get('userId');
  const scope = await getUserScope(userId);

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { kind: 'LESSON', publishedAt: { not: null, lte: new Date() } },
            orderBy: { moduleOrder: 'asc' },
            select: { id: true },
          },
        },
      },
    },
  });

  const visible = courses.filter(co => isVisible(co, scope));

  const lessonIds = visible.flatMap(co => co.modules.flatMap(m => m.lessons.map(l => l.id)));
  const progress = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId, postId: { in: lessonIds } },
        select: { postId: true },
      })
    : [];
  const completedSet = new Set(progress.map(p => p.postId));

  return c.json({
    courses: visible.map(co => {
      const allLessons = co.modules.flatMap(m => m.lessons);
      const total = allLessons.length;
      const completed = allLessons.filter(l => completedSet.has(l.id)).length;
      return {
        id: co.id,
        title: co.title,
        description: co.description,
        coverImage: co.coverImage,
        totalCount: total,
        completedCount: completed,
        everyone: co.everyone,
        companies: co.companies,
        tags: co.tags,
      };
    }),
  });
});

/** GET /lessons/courses/:id — full course with modules, lessons, and unlock state. */
lessonsRoutes.get('/courses/:id', async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const userId = c.get('userId');

  const course = await prisma.course.findUnique({
    where: { id: parsed.data.id },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { kind: 'LESSON', publishedAt: { not: null, lte: new Date() } },
            orderBy: { moduleOrder: 'asc' },
          },
        },
      },
    },
  });
  if (!course) return c.json({ error: 'Not found' }, 404);

  const scope = await getUserScope(userId);
  if (!isVisible(course, scope)) return c.json({ error: 'Not found' }, 404);

  const allLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
  const progress = allLessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { userId, postId: { in: allLessonIds } },
        select: { postId: true, completedAt: true },
      })
    : [];
  const completedSet = new Set(progress.map(p => p.postId));

  // Flat ordered list to determine next / locked
  const flat = course.modules.flatMap(m => m.lessons.map(l => ({ lessonId: l.id, moduleId: m.id })));
  const firstIncompleteIdx = flat.findIndex(x => !completedSet.has(x.lessonId));

  const modulesOut = course.modules.map(m => ({
    id: m.id,
    title: m.title,
    order: m.order,
    lessons: m.lessons.map(l => {
      const idx = flat.findIndex(f => f.lessonId === l.id);
      const isCompleted = completedSet.has(l.id);
      const isNext = !isCompleted && idx === firstIncompleteIdx;
      const isLocked = !isCompleted && !isNext;
      return {
        id: l.id,
        title: l.title,
        readingMinutes: l.readingMinutes,
        order: l.moduleOrder ?? 0,
        isCompleted,
        isNext,
        isLocked,
      };
    }),
  }));

  return c.json({
    id: course.id,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    totalCount: flat.length,
    completedCount: flat.filter(f => completedSet.has(f.lessonId)).length,
    modules: modulesOut,
  });
});

/** POST /lessons/:id/complete — mark a lesson complete (enforces scope + sequential unlock). */
lessonsRoutes.post('/:id/complete', async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const userId = c.get('userId');
  const postId = parsed.data.id;

  const lesson = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      module: {
        include: {
          course: {
            include: {
              companies: { select: { id: true } },
              tags:      { select: { id: true } },
              modules: {
                orderBy: { order: 'asc' },
                include: {
                  lessons: {
                    where: { kind: 'LESSON', publishedAt: { not: null, lte: new Date() } },
                    orderBy: { moduleOrder: 'asc' },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!lesson || lesson.kind !== 'LESSON' || !lesson.module) {
    return c.json({ error: 'Not a lesson' }, 404);
  }
  const course = lesson.module.course;

  const scope = await getUserScope(userId);
  if (!isVisible(course, scope)) return c.json({ error: 'Not found' }, 404);

  // Sequential unlock check across the course's ordered lesson list
  const orderedLessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
  const targetIdx = orderedLessonIds.indexOf(postId);
  if (targetIdx === -1) return c.json({ error: 'Lesson not in course' }, 400);

  if (targetIdx > 0) {
    const priorIds = orderedLessonIds.slice(0, targetIdx);
    const completedPrior = await prisma.lessonProgress.count({
      where: { userId, postId: { in: priorIds } },
    });
    if (completedPrior < priorIds.length) {
      return c.json({ error: 'Previous lessons not complete' }, 400);
    }
  }

  await prisma.lessonProgress.upsert({
    where: { userId_postId: { userId, postId } },
    update: {},
    create: { userId, postId },
  });

  return c.json({ ok: true });
});

import { Hono } from 'hono';
import { prisma } from '../db.js';

export const meRoutes = new Hono();

// GET /api/me — current user profile + company + tags
meRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      company: true,
      tags: { include: { tag: true } },
    },
  });
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarInitial: user.avatarInitial,
    role: user.role,
    company: user.company,
    tags: user.tags.map(ut => ut.tag),
  });
});

// GET /api/me/stats
meRoutes.get('/stats', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const [runsThisWeek, activeTasks, openRequests, lessonsCompleted] = await Promise.all([
    prisma.solutionUsage.count({ where: { solution: { companyId }, usedAt: { gte: weekAgo } } }),
    prisma.task.count({ where: { companyId, status: { not: 'FERDIG' } } }),
    prisma.request.count({ where: { companyId, status: 'OPEN' } }),
    prisma.lessonProgress.count({ where: { userId } }),
  ]);

  return c.json({ runsThisWeek, activeTasks, openRequests, lessonsCompleted });
});

// GET /api/me/solutions
meRoutes.get('/solutions', async (c) => {
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const solutions = await prisma.solution.findMany({
    where: { companyId },
    include: { usages: { where: { usedAt: { gte: weekAgo } }, select: { id: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return c.json({
    solutions: solutions.map(s => ({
      id: s.id, name: s.name, subtitle: s.subtitle, status: s.status,
      usageCountWeek: s.usages.length,
    })),
  });
});

// GET /api/me/team
meRoutes.get('/team', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const members = await prisma.user.findMany({
    where: { companyId, deletedAt: null, role: { in: ['OWNER', 'EMPLOYEE'] } },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, avatarInitial: true, role: true },
  });

  return c.json({
    members: members.map(m => ({ ...m, isSelf: m.id === userId })),
  });
});

// DELETE /api/me — self-service account deletion (Apple 5.1.1(v))
meRoutes.delete('/', async (c) => {
  const userId   = c.get('userId');
  const userRole = c.get('userRole');
  const companyId = c.get('companyId');

  if (userRole === 'OWNER' && companyId) {
    const otherActive = await prisma.user.count({
      where: { companyId, deletedAt: null, id: { not: userId } },
    });
    if (otherActive > 0) {
      const nextOwner = await prisma.user.findFirst({
        where: { companyId, deletedAt: null, id: { not: userId }, role: 'EMPLOYEE' },
        orderBy: { createdAt: 'asc' },
      });
      if (nextOwner) {
        await prisma.user.update({ where: { id: nextOwner.id }, data: { role: 'OWNER' } });
      }
    } else {
      await prisma.solutionUsage.deleteMany({ where: { solution: { companyId } } });
      await prisma.solution.deleteMany({ where: { companyId } });
      await prisma.request.deleteMany({ where: { companyId } });
      await prisma.task.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId } });
  return c.json({ ok: true });
});

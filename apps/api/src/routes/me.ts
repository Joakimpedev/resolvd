import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';

export const meRoutes = new Hono();

// GET /api/me — current user profile + company + tags + level
meRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      company: true,
      tags: { include: { tag: true } },
      userLevel: true,
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
    onboardingDone: user.onboardingDone,
    userLevel: user.userLevel?.level ?? null,
  });
});

// POST /api/me/level — set user's AI-Skolen level and mark onboarding done
const levelSchema = z.object({ level: z.enum(['BEGINNER', 'INTER', 'ADVANCED']) });
meRoutes.post('/level', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = levelSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  await prisma.userLevel.upsert({
    where: { userId },
    update: { level: parsed.data.level, setAt: new Date() },
    create: { userId, level: parsed.data.level },
  });
  await prisma.user.update({ where: { id: userId }, data: { onboardingDone: true } });

  return c.json({ ok: true });
});

// POST /api/me/skip-onboarding
meRoutes.post('/skip-onboarding', async (c) => {
  const userId = c.get('userId');
  await prisma.user.update({ where: { id: userId }, data: { onboardingDone: true } });
  await prisma.userLevel.upsert({
    where: { userId },
    update: {},
    create: { userId, level: 'BEGINNER' },
  });
  return c.json({ ok: true });
});

// GET /api/me/stats
meRoutes.get('/stats', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
  const [runsThisWeek, activeRequests, lessonsCompleted, userLevel] = await Promise.all([
    prisma.solutionUsage.count({ where: { solution: { companyId }, usedAt: { gte: weekAgo } } }),
    prisma.request.count({ where: { companyId, status: { not: 'FERDIG' } } }),
    prisma.lessonProgress.count({ where: { userId } }),
    prisma.userLevel.findUnique({ where: { userId } }),
  ]);
  const aiSkolenTotal = await prisma.post.count({
    where: { kind: 'LESSON', lessonLevel: userLevel?.level ?? 'BEGINNER' },
  });

  return c.json({ runsThisWeek, activeRequests, lessonsCompleted, aiSkolenTotal });
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
  const userRole = c.get('userRole');
  if (!companyId) return c.json({ error: 'No company' }, 400);

  const [members, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, deletedAt: null, role: { in: ['OWNER', 'EMPLOYEE'] } },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, avatarInitial: true, role: true },
    }),
    prisma.invitation.findMany({
      where: { companyId, status: { in: ['PENDING', 'APPROVED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, invitedIdentifier: true, status: true },
    }),
  ]);

  return c.json({
    members: members.map(m => ({ ...m, isSelf: m.id === userId })),
    invitations,
    canInvite: userRole === 'OWNER',
  });
});

// POST /api/me/invite — owner-only
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\+?[\d\s]{8,}$/;
const inviteSchema = z.object({
  identifier: z.string().min(3).max(200).transform(s => s.trim()).refine(
    v => emailRe.test(v) || phoneRe.test(v),
    { message: 'Ugyldig e-post eller telefonnummer' },
  ),
});

meRoutes.post('/invite', async (c) => {
  const userId = c.get('userId');
  const companyId = c.get('companyId');
  const userRole = c.get('userRole');
  if (!companyId) return c.json({ error: 'No company' }, 400);
  if (userRole !== 'OWNER') return c.json({ error: 'Only owner can invite' }, 403);

  const body = await c.req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const invite = await prisma.invitation.create({
    data: {
      companyId,
      invitedByUserId: userId,
      invitedIdentifier: parsed.data.identifier,
      status: 'PENDING',
    },
  });
  return c.json({ invitation: invite });
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
      await prisma.invitation.deleteMany({ where: { companyId } });
      await prisma.solutionUsage.deleteMany({ where: { solution: { companyId } } });
      await prisma.solution.deleteMany({ where: { companyId } });
      await prisma.request.deleteMany({ where: { companyId } });
      await prisma.projectMember.deleteMany({ where: { project: { companyId } } });
      await prisma.project.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId } });
  return c.json({ ok: true });
});

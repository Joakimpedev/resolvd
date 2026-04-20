import { Hono } from 'hono';
import { prisma } from '../../db.js';

export const overviewRoutes = new Hono();

overviewRoutes.get('/', async (c) => {
  const [companies, users, posts, requests, tasks, solutions, courses, tags] = await Promise.all([
    prisma.company.findMany({ orderBy: { createdAt: 'desc' }, include: { _count: { select: { users: true } } } }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        tags:    { include: { tag: { select: { id: true, name: true } } } },
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        companies: { select: { id: true, name: true } },
        tags:      { select: { id: true, name: true } },
        module:    { select: { id: true, title: true, courseId: true } },
      },
    }),
    prisma.request.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        company:   { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        comments:  {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatarInitial: true, role: true } } },
        },
      },
    }),
    prisma.task.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        company:   { select: { id: true, name: true } },
        createdBy: { select: { name: true, email: true } },
        assignees: { include: { user: { select: { id: true, name: true, avatarInitial: true } } } },
        priceViewers: { include: { user: { select: { id: true, name: true } } } },
        events: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true } },
            comments:  {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { id: true, name: true, avatarInitial: true } } },
            },
          },
        },
      },
    }),
    prisma.solution.findMany({ orderBy: { createdAt: 'desc' }, include: { company: { select: { name: true } } } }),
    prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        companies: { select: { id: true, name: true } },
        tags:      { select: { id: true, name: true } },
        _count:    { select: { modules: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, posts: true, courses: true } } },
    }),
  ]);

  return c.json({
    companies: companies.map(co => ({
      id: co.id,
      name: co.name,
      userCount: co._count.users,
      createdAt: co.createdAt.toISOString(),
    })),
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatarInitial: u.avatarInitial,
      company: u.company,
      tags: u.tags.map(ut => ut.tag),
      createdAt: u.createdAt.toISOString(),
      plaintextPassword: u.plaintextPasswordNote ?? null,
    })),
    posts: posts.map(p => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      body: p.body,
      category: p.category,
      readingMinutes: p.readingMinutes,
      everyone: p.everyone,
      companies: p.companies,
      tags: p.tags,
      module: p.module,
      moduleOrder: p.moduleOrder,
      publishedAt: p.publishedAt?.toISOString() ?? null,
    })),
    requests: requests.map(r => ({
      id: r.id, title: r.title, description: r.description, status: r.status,
      company: r.company.name, createdBy: r.createdBy?.name ?? r.createdBy?.email ?? '—',
      commentCount: r.comments.length,
      promotedAt: r.promotedAt?.toISOString() ?? null,
      promotedToTaskId: r.promotedToTaskId,
      updatedAt: r.updatedAt.toISOString(),
      comments: r.comments.map(cm => ({
        id: cm.id,
        body: cm.body,
        user: cm.user,
        createdAt: cm.createdAt.toISOString(),
      })),
    })),
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      descriptionMd: t.descriptionMd,
      status: t.status,
      priceOre: t.priceOre,
      company: t.company,
      createdBy: t.createdBy?.name ?? t.createdBy?.email ?? '—',
      assignees: t.assignees.map(a => a.user),
      priceViewers: t.priceViewers.map(pv => pv.user),
      events: t.events.map(e => ({
        id: e.id,
        header: e.header,
        body: e.body,
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
        comments: e.comments.map(cm => ({
          id: cm.id,
          body: cm.body,
          user: cm.user,
          createdAt: cm.createdAt.toISOString(),
        })),
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    solutions: solutions.map(s => ({
      id: s.id, name: s.name, subtitle: s.subtitle, status: s.status,
      company: s.company.name,
    })),
    courses: courses.map(co => ({
      id: co.id,
      title: co.title,
      description: co.description,
      everyone: co.everyone,
      companies: co.companies,
      tags: co.tags,
      moduleCount: co._count.modules,
    })),
    tags: tags.map(t => ({
      id: t.id,
      name: t.name,
      userCount: t._count.users,
      postCount: t._count.posts,
      courseCount: t._count.courses,
    })),
  });
});

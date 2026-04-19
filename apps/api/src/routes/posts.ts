import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { PostKind, Post } from '@prisma/client';

export const postsRoutes = new Hono();

const idParam = z.object({ id: z.string().min(20).max(30) });

postsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const kind = (c.req.query('kind') ?? 'ARTICLE') as PostKind;
  const scope = c.req.query('scope') ?? 'industry';

  const tags = await prisma.userTag.findMany({
    where: { userId },
    include: { tag: true },
  });
  const industryTagIds = tags.filter(ut => ut.tag.kind === 'INDUSTRY').map(ut => ut.tag.id);
  const allTagIds      = tags.map(ut => ut.tag.id);
  const activeTagIds   = scope === 'all' ? allTagIds : industryTagIds;

  const posts = await prisma.post.findMany({
    where: {
      kind,
      publishedAt: { not: null, lte: new Date() },
      OR: [
        { scopeType: 'GLOBAL' },
        { scopeType: 'TAG', tags: { some: { id: { in: activeTagIds } } } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      reads:     { where: { userId }, select: { readAt: true } },
      bookmarks: { where: { userId }, select: { bookmarkedAt: true } },
    },
    take: 50,
  });

  return c.json({
    posts: posts.map(p => ({
      id: p.id,
      kind: p.kind,
      title: p.title,
      body: p.body.length > 400 ? p.body.slice(0, 400) + '…' : p.body,
      category: p.category,
      readingMinutes: p.readingMinutes,
      publishedAt: p.publishedAt!.toISOString(),
      isRead: p.reads.length > 0,
      isBookmarked: p.bookmarks.length > 0,
    })),
  });
});

/** Visibility check — every POST mutation on a post must pass this. */
async function ensureUserCanSeePost(userId: string, postId: string): Promise<Post | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { tags: { select: { id: true } } },
  });
  if (!post) return null;
  if (post.scopeType === 'GLOBAL') return post;
  if (post.scopeType === 'TAG') {
    const userTagIds = (await prisma.userTag.findMany({ where: { userId }, select: { tagId: true } }))
      .map(u => u.tagId);
    const postTagIds = post.tags.map(t => t.id);
    return postTagIds.some(id => userTagIds.includes(id)) ? post : null;
  }
  if (post.scopeType === 'PROJECT' && post.projectId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: post.projectId, userId } },
    });
    return member ? post : null;
  }
  return null;
}

postsRoutes.post('/:id/read', async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const userId = c.get('userId');
  const post = await ensureUserCanSeePost(userId, parsed.data.id);
  if (!post) return c.json({ error: 'Not found' }, 404);

  await prisma.postRead.upsert({
    where: { userId_postId: { userId, postId: post.id } },
    update: {},
    create: { userId, postId: post.id },
  });
  return c.json({ ok: true });
});

postsRoutes.post('/:id/bookmark', async (c) => {
  const parsed = idParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  const userId = c.get('userId');
  const post = await ensureUserCanSeePost(userId, parsed.data.id);
  if (!post) return c.json({ error: 'Not found' }, 404);

  const existing = await prisma.postBookmark.findUnique({
    where: { userId_postId: { userId, postId: post.id } },
  });
  if (existing) {
    await prisma.postBookmark.delete({ where: { userId_postId: { userId, postId: post.id } } });
    return c.json({ bookmarked: false });
  }
  await prisma.postBookmark.create({ data: { userId, postId: post.id } });
  return c.json({ bookmarked: true });
});

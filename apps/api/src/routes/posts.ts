import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../db.js';
import type { PostKind, Post } from '@prisma/client';

export const postsRoutes = new Hono();

const idParam = z.object({ id: z.string().min(20).max(30) });

/**
 * Scope rule: a user sees a post if
 *   everyone=true
 *   OR (
 *     (post has no companies OR user's company is in post.companies)
 *     AND
 *     (post has no tags OR user has at least one of post.tags)
 *     AND
 *     (post has at least one company or tag set — i.e. scope is actually narrowed)
 *   )
 */
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

function postVisibleToUser(
  post: { everyone: boolean; companies: { id: string }[]; tags: { id: string }[] },
  scope: { companyId: string | null; tagIds: string[] },
): boolean {
  if (post.everyone) return true;
  const hasCompanies = post.companies.length > 0;
  const hasTags = post.tags.length > 0;
  if (!hasCompanies && !hasTags) return false;
  const companyOk = !hasCompanies || (!!scope.companyId && post.companies.some(c => c.id === scope.companyId));
  const tagOk = !hasTags || post.tags.some(t => scope.tagIds.includes(t.id));
  return companyOk && tagOk;
}

postsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const kind = (c.req.query('kind') ?? 'ARTICLE') as PostKind;

  const scope = await getUserScope(userId);

  // Broad prefilter at DB level, then narrow in JS for the AND semantics.
  const raw = await prisma.post.findMany({
    where: {
      kind,
      publishedAt: { not: null, lte: new Date() },
      OR: [
        { everyone: true },
        scope.companyId ? { companies: { some: { id: scope.companyId } } } : { id: '__none__' },
        scope.tagIds.length ? { tags: { some: { id: { in: scope.tagIds } } } } : { id: '__none__' },
      ],
    },
    orderBy: { publishedAt: 'desc' },
    include: {
      companies: { select: { id: true, name: true } },
      tags:      { select: { id: true, name: true } },
      reads:     { where: { userId }, select: { readAt: true } },
      bookmarks: { where: { userId }, select: { bookmarkedAt: true } },
    },
    take: 100,
  });

  const posts = raw.filter(p => postVisibleToUser(p, scope)).slice(0, 50);

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
      everyone: p.everyone,
      companies: p.companies,
      tags: p.tags,
    })),
  });
});

/** Visibility check — every POST mutation on a post must pass this. */
async function ensureUserCanSeePost(userId: string, postId: string): Promise<Post | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      companies: { select: { id: true } },
      tags:      { select: { id: true } },
    },
  });
  if (!post) return null;
  const scope = await getUserScope(userId);
  return postVisibleToUser(post, scope) ? post : null;
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

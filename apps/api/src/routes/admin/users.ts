import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../../auth.js';
import { prisma } from '../../db.js';

export const usersRoutes = new Hono();

const cuidParam = z.object({ id: z.string().min(10).max(64) });

const createSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  avatarInitial: z.string().min(1).max(2),
  companyId: z.string().min(10).max(64),
  role: z.enum(['OWNER', 'EMPLOYEE']),
  tagIds: z.array(z.string()).default([]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarInitial: z.string().min(1).max(2).optional(),
  companyId: z.string().min(10).max(64).nullable().optional(),
  role: z.enum(['OWNER', 'EMPLOYEE', 'ADMIN']).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

const setTagsSchema = z.object({
  tagIds: z.array(z.string()),
});

usersRoutes.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const { email, password, name, avatarInitial, companyId, role, tagIds } = parsed.data;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return c.json({ error: 'Invalid companyId' }, 400);

  const result = await auth.api.signUpEmail({ body: { email, password, name } });
  if (!result) return c.json({ error: 'Signup failed' }, 500);

  await prisma.user.update({
    where: { email },
    data: { avatarInitial, companyId, role, plaintextPasswordNote: password },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  if (tagIds.length) {
    await prisma.userTag.createMany({
      data: tagIds.map(tagId => ({ userId: user.id, tagId })),
      skipDuplicates: true,
    });
  }

  return c.json({ ok: true, email, userId: user.id });
});

usersRoutes.patch('/:id', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const user = await prisma.user.update({
    where: { id: idParsed.data.id },
    data: parsed.data,
  });
  return c.json({ user });
});

usersRoutes.put('/:id/tags', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = setTagsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  await prisma.$transaction([
    prisma.userTag.deleteMany({ where: { userId: idParsed.data.id } }),
    ...parsed.data.tagIds.map(tagId =>
      prisma.userTag.create({ data: { userId: idParsed.data.id, tagId } }),
    ),
  ]);
  return c.json({ ok: true });
});

usersRoutes.post('/:id/reset-password', async (c) => {
  const idParsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!idParsed.success) return c.json({ error: 'Invalid id' }, 400);
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

  const user = await prisma.user.findUnique({ where: { id: idParsed.data.id }, select: { id: true, email: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(parsed.data.newPassword);
  await prisma.account.updateMany({
    where: { userId: user.id, providerId: 'credential' },
    data: { password: hash },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { plaintextPasswordNote: parsed.data.newPassword },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  return c.json({ ok: true });
});

usersRoutes.delete('/:id', async (c) => {
  const parsed = cuidParam.safeParse({ id: c.req.param('id') });
  if (!parsed.success) return c.json({ error: 'Invalid id' }, 400);
  await prisma.user.update({ where: { id: parsed.data.id }, data: { deletedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId: parsed.data.id } });
  return c.json({ ok: true });
});

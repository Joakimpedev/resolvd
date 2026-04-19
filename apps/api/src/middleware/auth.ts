import type { Context, Next } from 'hono';
import { auth } from '../auth.js';
import { prisma } from '../db.js';

declare module 'hono' {
  interface ContextVariableMap {
    userId: string;
    userRole: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
    companyId: string | null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthenticated' }, 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    return c.json({ error: 'Account deleted' }, 401);
  }
  c.set('userId', user.id);
  c.set('userRole', user.role);
  c.set('companyId', user.companyId);
  await next();
}

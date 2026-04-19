import type { Context, Next } from 'hono';

// Marker middleware. Each protected route MUST filter Prisma queries by
// c.get('companyId') — ADMIN users bypass. Enforced via code review, not runtime.
export async function tenantMiddleware(_c: Context, next: Next) {
  await next();
}

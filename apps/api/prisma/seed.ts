import { PrismaClient, UserRole } from '@prisma/client';
import { auth } from '../src/auth.js';

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var for seed: ${name}. Add it to the environment before running db:seed.`);
  return v;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * Seed is structured into three tiers:
 *
 *  1. ALWAYS seeded (production + dev)
 *     - The admin user (Marius) — required, bootstraps the admin dashboard
 *     - Minimal global content: 3 example articles + 12 lessons per level
 *       so the mobile app has something to show before Marius writes his own.
 *       Marius can edit/delete these via Directus once it's deployed.
 *
 *  2. OPTIONALLY seeded (only when SEED_DEMO_* env vars are present)
 *     - Demo company "Rørleggeren AS" + owner + employee
 *     - Demo requests, solutions with usage, pending invitation
 *     This is for local development only; do not set these on production.
 *
 *  3. NEVER seeded
 *     - Real customer users, companies, or content. Marius creates those
 *       through the admin dashboard once he has paying customers.
 */
async function seed() {
  const isProd = process.env.NODE_ENV === 'production';

  const adminEmail    = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  const ownerEmail       = optionalEnv('SEED_DEMO_OWNER_EMAIL');
  const ownerPassword    = optionalEnv('SEED_DEMO_OWNER_PASSWORD');
  const employeeEmail    = optionalEnv('SEED_DEMO_EMPLOYEE_EMAIL');
  const employeePassword = optionalEnv('SEED_DEMO_EMPLOYEE_PASSWORD');

  const seedDemo = !!(ownerEmail && ownerPassword && employeeEmail && employeePassword);

  if (isProd && seedDemo) {
    throw new Error(
      'Refusing to seed demo users in production. Remove SEED_DEMO_* env vars from your production deploy.',
    );
  }

  // 1. Admin
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await auth.api.signUpEmail({ body: { email: adminEmail, password: adminPassword, name: 'Marius Lauvås' } });
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: UserRole.ADMIN, avatarInitial: 'M' },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  // 2. Global articles (shown to everyone until Marius writes his own via admin)
  const articleCount = await prisma.post.count({ where: { kind: 'ARTICLE' } });
  if (articleCount === 0) {
    await prisma.post.create({
      data: {
        kind: 'ARTICLE', scopeType: 'GLOBAL',
        title: 'Velkommen til Resolvd',
        body: 'Her får du oversikt over AI-løsningene vi bygger for deg, snakker med teamet vårt, og lærer hvordan AI kan jobbe for bedriften din.',
        category: 'Nyheter', readingMinutes: 2,
        publishedAt: new Date(),
        authorUserId: admin.id,
      },
    });
    await prisma.post.create({
      data: {
        kind: 'ARTICLE', scopeType: 'GLOBAL',
        title: 'Faktura-oppfølging som får betalt',
        body: 'Ferdig prompt du kan kopiere. Tilpasset norsk tone og småbedrifter.',
        category: 'Prompt-bibliotek', readingMinutes: 2,
        publishedAt: new Date(),
        authorUserId: admin.id,
      },
    });
    await prisma.post.create({
      data: {
        kind: 'ARTICLE', scopeType: 'GLOBAL',
        title: 'Hvordan bruke AI i hverdagen på jobb',
        body: 'En introduksjon til hvordan du kan spare tid med AI uten å bruke timer på å lære det.',
        category: 'Bransje-tips', readingMinutes: 3,
        publishedAt: new Date(),
        authorUserId: admin.id,
      },
    });
  }

  // 6. Lessons (Phase 6 data) — INTER level as primary demo
  const lessonCount = await prisma.post.count({ where: { kind: 'LESSON' } });
  if (lessonCount === 0) {
    const interLessons = [
      { title: 'Hva AI faktisk kan og ikke kan', readingMinutes: 5 },
      { title: 'Skriv prompts som faktisk funker', readingMinutes: 7 },
      { title: 'AI for kundedialog og e-post', readingMinutes: 12 },
      { title: 'Automatiser tilbudsskriving', readingMinutes: 9 },
      { title: 'Bruk AI i hverdagen på jobb', readingMinutes: 8 },
      { title: 'Datasikkerhet og AI — hva du må passe på', readingMinutes: 10 },
      { title: 'AI for sosiale medier', readingMinutes: 6 },
      { title: 'Lag ditt eget kunde-FAQ med AI', readingMinutes: 8 },
      { title: 'Tidssparere for dokumentarbeid', readingMinutes: 11 },
      { title: 'Når skal du ikke bruke AI?', readingMinutes: 7 },
      { title: 'Bygg en enkel arbeidsflyt', readingMinutes: 14 },
      { title: 'Videre steg og ressurser', readingMinutes: 5 },
    ];
    for (let i = 0; i < interLessons.length; i++) {
      const l = interLessons[i];
      await prisma.post.create({
        data: {
          kind: 'LESSON', scopeType: 'GLOBAL',
          title: l.title,
          body: `Leksjonsinnhold for "${l.title}". (Redigeres via admin-siden.)`,
          lessonLevel: 'INTER', lessonOrder: i + 1,
          readingMinutes: l.readingMinutes,
          publishedAt: new Date(),
          authorUserId: admin.id,
        },
      });
    }
    // Beginner + Advanced minimal seeds so level switching shows something
    const basicLessons = ['Hva er AI egentlig?', 'Slik bruker du ChatGPT første gang', 'Første prompt du skriver'];
    for (let i = 0; i < basicLessons.length; i++) {
      await prisma.post.create({
        data: {
          kind: 'LESSON', scopeType: 'GLOBAL',
          title: basicLessons[i],
          body: 'Leksjonsinnhold (redigeres via admin-siden).',
          lessonLevel: 'BEGINNER', lessonOrder: i + 1,
          readingMinutes: 4 + i,
          publishedAt: new Date(),
          authorUserId: admin.id,
        },
      });
    }
    const advLessons = ['Agent-arbeidsflyter', 'Fininnstilling av prompts', 'Integrering med egne systemer'];
    for (let i = 0; i < advLessons.length; i++) {
      await prisma.post.create({
        data: {
          kind: 'LESSON', scopeType: 'GLOBAL',
          title: advLessons[i],
          body: 'Leksjonsinnhold (redigeres via admin-siden).',
          lessonLevel: 'ADVANCED', lessonOrder: i + 1,
          readingMinutes: 10 + i,
          publishedAt: new Date(),
          authorUserId: admin.id,
        },
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // OPTIONAL demo data (skipped when SEED_DEMO_* env vars are absent).
  // Do NOT include these env vars on production Railway.
  // ──────────────────────────────────────────────────────────────
  if (seedDemo && ownerEmail && ownerPassword && employeeEmail && employeePassword) {
    let company = await prisma.company.findFirst({ where: { name: 'Rørleggeren AS' } });
    if (!company) {
      company = await prisma.company.create({ data: { name: 'Rørleggeren AS', industry: 'Rørleggere' } });
    }
    const tag = await prisma.tag.upsert({
      where: { name: 'Rørleggere' },
      update: {},
      create: { name: 'Rørleggere', kind: 'INDUSTRY' },
    });

    const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (!existingOwner) {
      await auth.api.signUpEmail({ body: { email: ownerEmail, password: ownerPassword, name: 'Marius Lauvås' } });
      await prisma.user.update({
        where: { email: ownerEmail },
        data: { role: UserRole.OWNER, avatarInitial: 'M', companyId: company.id },
      });
    }
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    await prisma.userTag.upsert({
      where:  { userId_tagId: { userId: owner.id, tagId: tag.id } },
      update: {},
      create: { userId: owner.id, tagId: tag.id },
    });

    const existingEmp = await prisma.user.findUnique({ where: { email: employeeEmail } });
    if (!existingEmp) {
      await auth.api.signUpEmail({ body: { email: employeeEmail, password: employeePassword, name: 'Jonas Berg' } });
      await prisma.user.update({
        where: { email: employeeEmail },
        data: { role: UserRole.EMPLOYEE, avatarInitial: 'J', companyId: company.id },
      });
    }

    // Industry-targeted demo articles
    const industryArticleCount = await prisma.post.count({
      where: { kind: 'ARTICLE', scopeType: 'TAG', tags: { some: { id: tag.id } } },
    });
    if (industryArticleCount === 0) {
      const a1 = await prisma.post.create({
        data: {
          kind: 'ARTICLE', scopeType: 'TAG',
          title: 'Automatisk tilbud på 30 sekunder',
          body: 'Send inn jobbeskrivelse, få ferdig tilbud på mail. Bygget for rørleggere.',
          category: 'Ny løsning', readingMinutes: 3,
          publishedAt: new Date(),
          authorUserId: admin.id,
        },
      });
      await prisma.post.update({ where: { id: a1.id }, data: { tags: { connect: [{ id: tag.id }] } } });
      const a2 = await prisma.post.create({
        data: {
          kind: 'ARTICLE', scopeType: 'TAG',
          title: 'Slik sparer en rørlegger i Trondheim 8 timer/uke',
          body: 'Kort case-studie om en AI-assistent som håndterer tilbudsforespørsler mens du er på jobb.',
          category: 'Kundehistorie', readingMinutes: 5,
          publishedAt: new Date(),
          authorUserId: admin.id,
        },
      });
      await prisma.post.update({ where: { id: a2.id }, data: { tags: { connect: [{ id: tag.id }] } } });
    }

    const reqCount = await prisma.request.count({ where: { companyId: company.id } });
    if (reqCount === 0) {
      await prisma.request.createMany({
        data: [
          { companyId: company.id, createdByUserId: owner.id, title: 'Endring på forsiden',    description: 'Legg til kundelogo nederst på hero-seksjonen.', status: 'I_ARBEID',      updatedAt: new Date(Date.now() - 2 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Ny AI-løsning ønsket',   description: 'Vi trenger litt mer info før vi kan starte.',    status: 'VENTER_PA_DEG', updatedAt: new Date(Date.now() - 24 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Oppdater åpningstider', description: 'Endringen er live på siden.',                     status: 'FERDIG',        updatedAt: new Date(Date.now() - 3 * 24 * 3600_000) },
          { companyId: company.id, createdByUserId: owner.id, title: 'Bytt hero-bilde',        description: 'Nytt bilde er på plass.',                         status: 'FERDIG',        updatedAt: new Date(Date.now() - 7 * 24 * 3600_000) },
        ],
      });
    }

    const solCount = await prisma.solution.count({ where: { companyId: company.id } });
    if (solCount === 0) {
      const tilbud = await prisma.solution.create({
        data: { companyId: company.id, name: 'Tilbudsgenerator', subtitle: null, status: 'ACTIVE' },
      });
      const epost = await prisma.solution.create({
        data: { companyId: company.id, name: 'E-post assistent', subtitle: 'Aktiv · 12 svar i går', status: 'ACTIVE' },
      });
      const now = Date.now();
      for (let i = 0; i < 47; i++) {
        await prisma.solutionUsage.create({ data: { solutionId: tilbud.id, usedAt: new Date(now - i * 3600_000) } });
      }
      for (let i = 0; i < 12; i++) {
        await prisma.solutionUsage.create({ data: { solutionId: epost.id, usedAt: new Date(now - 24 * 3600_000 + i * 1800_000) } });
      }
    }

    const invCount = await prisma.invitation.count({ where: { companyId: company.id } });
    if (invCount === 0) {
      await prisma.invitation.create({
        data: {
          companyId: company.id,
          invitedByUserId: owner.id,
          invitedIdentifier: 'kari@rorleggeren.no',
          status: 'PENDING',
        },
      });
    }

    console.log(`Seed complete. Admin: ${adminEmail}. Demo owner: ${ownerEmail}. Demo employee: ${employeeEmail}.`);
  } else {
    console.log(`Seed complete. Admin: ${adminEmail}. (Demo data skipped — SEED_DEMO_* env vars not set.)`);
  }
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

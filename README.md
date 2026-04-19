# Resolvd — iOS App + API

Monorepo containing:

- **apps/mobile** — Expo / React Native iOS app (Norwegian)
- **apps/api** — Hono API on Node, Prisma + Postgres
- **packages/shared** — Types shared between mobile and API

---

## First-time setup

Read `SETUP-CHECKLIST.md` at the repo root. It lists every manual step in order — env vars to set, accounts to create, commands to run. Work through it top to bottom the first time.

## Development

After setup completes:

```bash
# Terminal 1 — API
npm run api

# Terminal 2 — Mobile
npm run mobile
# Scan the QR code with Expo Go on an iPhone, or press 'i' for iOS simulator
```

## Development plan

The full phase-by-phase plan lives one directory up at `../RESOLVD-DEVELOPMENT.md` and `../phases/`. The plan explains every design and implementation decision.

## Admin

Content management is handled via Directus deployed alongside this API on Railway. See `../phases/phase-9-admin-directus.md` for setup.

## Out of scope for v1

See the build brief (`../Development/resolvd-app-build-prompt.md`). Excluded features are clearly listed — do not implement them without an explicit decision.

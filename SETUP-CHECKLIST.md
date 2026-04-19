# Resolvd — Setup Checklist

Work through this **top to bottom** after I've handed off the repo. Nothing below this line can be done by Claude autonomously — it requires your accounts, API keys, Apple Developer membership, or a physical iOS device/simulator (Mac-only).

**Status at handoff:** All code files are written. `git init` has been run inside `resolvd-app/` and all files are staged. `npm install` has been run successfully (~1015 packages). Prisma client has been generated. TypeScript compiles clean for both mobile and API. No git commits yet. No services deployed. No `.env` files populated with real secrets.

**First thing:** `cd resolvd-app && git commit -m "Initial scaffold"` — closes the loop on the autonomous build.

---

## Stage 1 — Install prerequisites on your machine

- [ ] **Node.js 20+** (you already have 24.11.1 — fine)
- [ ] **npm 10+** (you have 11.8 — fine)
- [ ] **Git** (you have 2.51 — fine)
- [ ] `npm install -g expo-cli eas-cli` — Expo CLI + EAS CLI for builds/submits
- [ ] `npm install -g @railway/cli` — Railway CLI for deployment
- [ ] **A code editor** (VS Code recommended)

To test iOS on a real device: install **Expo Go** from the App Store.
To test on the iOS simulator: requires **Xcode** (Mac only).

---

## Stage 2 — Accounts you need to create

- [ ] **Railway account** at [railway.app](https://railway.app) — hosts Postgres, API, Directus
- [ ] **Apple Developer account** at [developer.apple.com](https://developer.apple.com) — $99/yr; required for TestFlight + App Store
- [ ] **App Store Connect** — accessed with same Apple ID after Developer enrollment
- [ ] **GitHub private repo** — to push `resolvd-app/` for deployment + backup
- [ ] **Domain** (optional for v1): `resolvd.no` or similar for admin + privacy-policy page

---

## Stage 3 — Railway setup (Postgres + API)

1. [ ] Log in: `railway login`
2. [ ] From inside `resolvd-app/`: `railway init` → create new project "resolvd"
3. [ ] Add Postgres plugin from Railway dashboard
4. [ ] Open the Postgres plugin → **Connect** tab → copy the `DATABASE_URL`
5. [ ] Create `apps/api/.env` (copy from `.env.example` at repo root) and fill in:
   ```
   DATABASE_URL=<paste from Railway Postgres>
   BETTER_AUTH_SECRET=<run: openssl rand -base64 32>
   BETTER_AUTH_URL=http://localhost:3000
   PORT=3000
   NODE_ENV=development
   SEED_ADMIN_EMAIL=marius@resolvd.no
   SEED_ADMIN_PASSWORD=<your-chosen-strong-password>
   SEED_DEMO_OWNER_EMAIL=demo@rorleggeren.no
   SEED_DEMO_OWNER_PASSWORD=<your-chosen-strong-password>
   SEED_DEMO_EMPLOYEE_EMAIL=jonas@rorleggeren.no
   SEED_DEMO_EMPLOYEE_PASSWORD=<your-chosen-strong-password>
   ```
   **Save these passwords in 1Password or a secure note.** You'll need them to log in.

---

## Stage 4 — Install dependencies + push schema

Run from repo root (`resolvd-app/`):

1. [ ] `npm install` — installs everything across apps/mobile + apps/api + packages/shared
2. [ ] `npm run db:generate` — generates the Prisma client from the schema
3. [ ] `npm run db:push` — creates all tables on the Railway Postgres
4. [ ] `npm run db:seed` — creates admin user, demo company, owner, employee, posts, lessons, requests, solutions, one pending invitation

If seeding fails with "Missing required env var": double-check every `SEED_*` var is set in `apps/api/.env`.

---

## Stage 5 — Run locally to verify

1. [ ] Create `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
2. [ ] Terminal 1 — start API:
   ```
   npm run api
   ```
   Should print `API listening on :3000`. Test with `curl http://localhost:3000/health` → `{"ok":true}`.
3. [ ] Terminal 2 — start mobile:
   ```
   npm run mobile
   ```
   Scan the QR code with Expo Go on your iPhone, or press `i` to open the iOS simulator.

4. [ ] Sign in with the demo owner credentials (`demo@rorleggeren.no` + the password you set).
5. [ ] Verify all four tabs work:
   - **Feed** shows 3 seeded articles; toggle between "For rørleggere" / "Alle" changes filtering
   - **Lær** shows the onboarding question first time, then the main lesson list after selecting a level
   - **Meldinger** shows 2 active + 2 completed requests; "+ Ny forespørsel" opens the modal and submits
   - **Min side** shows the profile, stats (47 kjøringer), AI-løsninger, team with pending invite, settings

---

## Stage 6 — Verify admin access

1. [ ] Visit `http://localhost:3000/admin/sign-in` in a browser
2. [ ] Log in as the admin (`marius@resolvd.no` + your admin password)
3. [ ] You'll be redirected to `/admin/new-user-form` — this is the form that lets you create new customer users

This admin login is intentionally bare-bones. The full Directus admin (Stage 8) gives you CRUD on every table.

---

## Stage 7 — Deploy API to Railway

1. [ ] From `apps/api/`: `railway up` (or connect the GitHub repo from Railway dashboard for auto-deploy)
2. [ ] Configure the Railway API service env vars (same as `apps/api/.env` except `BETTER_AUTH_URL` should be the Railway-assigned HTTPS URL, e.g. `https://resolvd-api.up.railway.app`)
3. [ ] `NODE_ENV=production` on the production service
4. [ ] Verify: `curl https://YOUR-RAILWAY-URL/health`

---

## Stage 8 — Deploy Directus admin on Railway

1. [ ] In the Railway project, **New Service** → **Empty Service**
2. [ ] Settings → Source → Docker Image → `directus/directus:latest`
3. [ ] Set env vars on the Directus service:
   ```
   DB_CLIENT=pg
   DB_HOST=<from Postgres plugin>
   DB_PORT=<from Postgres plugin>
   DB_DATABASE=<from Postgres plugin>
   DB_USER=<from Postgres plugin>
   DB_PASSWORD=<from Postgres plugin>
   KEY=<openssl rand -base64 32>
   SECRET=<openssl rand -base64 32>
   ADMIN_EMAIL=<your admin email>
   ADMIN_PASSWORD=<strong password — save in 1Password>
   PUBLIC_URL=<Railway URL once deployed>
   CORS_ENABLED=true
   CORS_ORIGIN=true
   ```
4. [ ] Deploy. Open the Railway URL and log in with ADMIN_EMAIL/ADMIN_PASSWORD.
5. [ ] In Directus → Settings → Data Model: verify all domain tables appear (Post, Company, Request, Solution, Invitation, etc.)
6. [ ] Grant the Administrator role full CRUD on all domain tables (not Account/Session/Verification).
7. [ ] Add `ADMIN_DIRECTUS_URL=https://<directus-url>` to your API service env vars so CORS lets Directus talk to the API.

---

## Stage 9 — Point the mobile app at the production API

1. [ ] Edit `apps/mobile/.env`: `EXPO_PUBLIC_API_URL=https://<railway-api-url>`
2. [ ] Also update `apps/mobile/eas.json` → `build.production.env.EXPO_PUBLIC_API_URL` to the same URL
3. [ ] `npm run mobile` with the new env. Verify login still works against the production API.

---

## Stage 10 — Create real assets (before App Store submission)

Placeholder PNGs were generated by `scripts/make-placeholder-assets.mjs`. For submission you need real artwork:

- [ ] **App icon** `apps/mobile/assets/icon.png` — 1024×1024, no transparency, warm beige background. Design a proper Re|solvd wordmark or symbol.
- [ ] **Splash** `apps/mobile/assets/splash.png` — 1284×2778, centered logo on `#F5F1E8`
- [ ] Regenerate with real content using a tool like Figma, Sketch, or Pixelmator

If you just want to re-run the placeholder generator at a different color: `node scripts/make-placeholder-assets.mjs` (edit the `warmBeige` constant).

---

## Stage 11 — Privacy policy page

- [ ] Create and publish a page at `https://resolvd.no/privacy` (or your chosen domain)
- [ ] Content must list every data category the app collects:
  - Email address
  - Name
  - Phone number (if any invite uses phone)
  - User content (messages, bookmarks, lesson progress)
  - User ID
- [ ] State retention (e.g. "deleted accounts are soft-deleted immediately; purged after 30 days")
- [ ] State GDPR rights (access, export, deletion)
- [ ] Provide a contact email for privacy questions
- [ ] Text in Norwegian bokmål

---

## Stage 12 — Apple Developer setup

- [ ] Enroll in Apple Developer Program ($99/yr)
- [ ] Create app record in App Store Connect:
  - Bundle ID: `no.resolvd.app`
  - Name: `Resolvd`
  - SKU: `resolvd-001` (or any unique string)
  - Primary category: Business or Productivity
- [ ] Accept all agreements in **Agreements, Tax, and Banking**
- [ ] Note your **Apple Team ID** (in developer.apple.com → Membership)
- [ ] Note your **App Store Connect App ID** (numeric ID on the app page)
- [ ] Update `apps/mobile/eas.json` → `submit.production.ios` with these three values

---

## Stage 13 — EAS Build + Submit

1. [ ] `cd apps/mobile && npx eas login` with your Expo account (create one at expo.dev if needed)
2. [ ] `npx eas build:configure` — first-time project link
3. [ ] `npx eas build --platform ios --profile production`
   - Takes ~15 min
   - EAS will manage iOS signing/provisioning profiles automatically if you let it
4. [ ] When build succeeds: `npx eas submit --platform ios --profile production`
   - Uploads the `.ipa` to App Store Connect
   - Wait ~15 min for processing

---

## Stage 14 — App Store Connect listing

Fill these in on App Store Connect before hitting "Submit for Review":

- [ ] **Subtitle** (30 char): `Din AI-partner for bedrift`
- [ ] **Promotional text** (170 char): `Få oversikt over AI-løsningene dine, snakk med teamet vårt, og lær AI i ditt eget tempo. Bygget for norske småbedrifter.`
- [ ] **Description** — see `../phases/phase-10-submission.md` for the Norwegian copy
- [ ] **Keywords**: `AI,bedrift,norsk,SMB,automatisering,rørlegger,frisør,tømrer,kurs,AI-verktøy`
- [ ] **Support URL**: `https://resolvd.no/support` (set up a page)
- [ ] **Marketing URL**: `https://resolvd.no`
- [ ] **Privacy Policy URL**: the page from Stage 11
- [ ] **Screenshots** (6.7" iPhone, 1290×2796): at minimum 3 — Feed, Meldinger, Min side
- [ ] **Privacy Nutrition Label** — see `../phases/phase-10-submission.md` for exact declarations
- [ ] **App Review Information** → Notes: paste demo credentials + mention "Account deletion: Min side → Slett konto"
- [ ] **Release type**: Manual release after approval (recommended)

---

## Stage 15 — Submit for review

- [ ] Click **Submit for Review**
- [ ] Apple usually responds within 24–48 hours
- [ ] If rejected: read the reason carefully, fix in code, bump build number, resubmit

---

## Stage 16 — Ongoing content management

Once live:

- [ ] Use the **Directus admin** (Stage 8 URL) to write articles for Feed
- [ ] Use Directus to write lessons for each level (BEGINNER / INTER / ADVANCED)
- [ ] Use Directus to respond to customer requests (edit Request rows, change status I_ARBEID → FERDIG)
- [ ] Use `/admin/new-user-form` (Stage 6 URL) to create new customer accounts

---

## Things NOT included in v1 (by design)

These are deliberately excluded from scope per the build brief. Build later if customer feedback justifies it:

- Lesson detail view (tapping "Neste" currently marks complete instead of opening detail)
- Saved-posts list (bookmarks are stored but there's no dedicated list screen)
- Article reading view (tapping a Feed card is a no-op)
- Conversation view on Meldinger (messages table exists but threads aren't shown)
- Solution detail view (tapping "Mine AI-løsninger" cards is a no-op)
- Settings detail screens (settings rows are no-ops except Logg ut + Slett konto)
- Push notifications
- Splash/login-before-first-login onboarding
- Self-signup in the app

---

## If something doesn't work

Check these first:

- **"EXPO_PUBLIC_API_URL is not set"** → you haven't created `apps/mobile/.env` yet
- **"Missing required env var for seed"** → check `apps/api/.env` has all `SEED_*` vars
- **`npm run api` crashes on "Missing required env var: BETTER_AUTH_SECRET"** → generate one with `openssl rand -base64 32` and add to `apps/api/.env`
- **Mobile login returns "Nettverksfeil"** → API isn't running, or `EXPO_PUBLIC_API_URL` points somewhere wrong
- **Mobile login returns "Ugyldig e-post eller passord"** → seeding hasn't run, or the email/password don't match the seed env vars
- **Prisma "P1000" error on db:push** → `DATABASE_URL` is wrong

For anything else: the development plan is in `../RESOLVD-DEVELOPMENT.md` and the phase files in `../phases/` — they include specific debugging notes per phase.

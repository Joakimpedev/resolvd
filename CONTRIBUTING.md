# Contributing

This repo is a monorepo containing the Resolvd mobile app, API, and shared packages. If you've been invited as a collaborator, this document defines what's in-scope for you.

## Setup

See [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) and [README.md](./README.md).

For **frontend-only work**, you only need to run the mobile app. The API is already deployed — you'll hit it at the URL in `apps/mobile/.env`.

```bash
npm install                              # from the repo root
cp .env.example apps/mobile/.env         # only the EXPO_PUBLIC_API_URL line matters for mobile-only work
npm run mobile                           # starts Expo dev server, scan QR with Expo Go
```

## Scope — what you can and can't change

### Frontend collaborator — what's in scope

You can freely change:

- `apps/mobile/theme/` — colors, spacing, typography, icons
- `apps/mobile/components/` — styles, layout, structure of reusable components
- `apps/mobile/app/` — screen layouts and visual structure
- `apps/mobile/assets/` — icons, splash, fonts (ask before swapping brand assets)

If you want to add a new reusable visual component, go for it — put it in `apps/mobile/components/`.

### Frontend collaborator — what's out of scope

Do **not** touch:

- `apps/api/` — the backend. This is @Joakimpedev's domain.
- `packages/shared/` — shared types. Changes here require backend changes.
- `scripts/`, `*.toml`, root `package.json`, root `tsconfig.json`, `.github/` — build and infrastructure config.
- `apps/mobile/lib/` — API client, auth, React Query setup. Don't add new `fetch()` calls, don't change auth, don't modify the API client.
- `apps/mobile/package.json` — don't add or bump dependencies without asking.
- `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/metro.config.js`, `apps/mobile/tsconfig.json` — project config.

### If you want something that needs backend support

Open a GitHub issue describing what you want and what data it needs. Example:

> I want to add a "Featured articles" carousel on the home screen. It needs an endpoint that returns the 5 most recent featured articles with title, thumbnail, and short description.

@Joakimpedev will discuss it, build the backend piece if it makes sense, ship updated types, and then you build the frontend against the new endpoint. Backend leads, frontend follows.

## Workflow

**All changes go through a pull request. Nothing pushes directly to `main`** — branch protection blocks that.

1. Pull latest `main`:
   ```bash
   git checkout main
   git pull
   ```
2. Make a branch with a descriptive name:
   ```bash
   git checkout -b theme/adjust-primary-color
   ```
3. Make your changes, commit them:
   ```bash
   git add apps/mobile/theme/tokens.ts
   git commit -m "Adjust primary color to warmer beige"
   ```
4. Push the branch:
   ```bash
   git push -u origin theme/adjust-primary-color
   ```
5. Open a PR on GitHub. Describe what changed and why. Screenshots welcome for visual changes.
6. @Joakimpedev reviews. If changes are needed, push more commits to the same branch. Once approved, he'll click Merge.
7. After merge, delete your local branch and pull `main` again:
   ```bash
   git checkout main
   git pull
   git branch -d theme/adjust-primary-color
   ```

## Testing

No automated tests yet — verification is manual via Expo Go. Before opening a PR:

- Run `npm run typecheck` from `apps/mobile/` — must pass
- Log in with the test account
- Walk through the main flows (login → home → detail screens)
- Check at least one iOS device and if possible one Android
- Confirm nothing visibly broken elsewhere

## Questions

Ask in our shared channel — don't guess. Especially on anything touching backend code, `lib/`, or data.

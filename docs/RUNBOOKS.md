# RUNBOOKS.md

Practical, copy/paste workflows for common engineering tasks in this repo.

## 0) Local setup (first run)

```bash
npm ci
npm --prefix server ci
docker compose up -d postgres redis
```

Create env files:
- Root `.env`:
  - `EXPO_PUBLIC_API_URL=http://localhost:3000`
- Server `.env` from `server/.env.example`

Start services:

```bash
npm --prefix server run start:dev
npm run start
```

---

## 1) Server-only bugfix (fast loop)

1. Run focused test first:

```bash
npm --prefix server run test -- src/game-data/answer-validator.spec.ts
```

2. Make change.

3. Re-run focused test, then broaden:

```bash
npm --prefix server run test -- -t "should"
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run build
```

---

## 2) API contract change (DTO/response)

Typical files:
- `server/src/**/dto/*.ts`
- feature controller/service
- matching client API wrapper in `src/api/*.ts`
- consuming store/screen

Workflow:
1. Update server DTO + service/controller response shape.
2. Update client API types in `src/api/*`.
3. Update store/UI usage.
4. Validate with targeted tests.

Commands:

```bash
npm --prefix server run test -- -t "dto|game|auth|leaderboard|user"
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run build
npm run test:web -- tests/web/server-validated.spec.ts
```

---

## 3) Gameplay/UI flow change

Typical files:
- `app/game/[mode].tsx`
- `app/game/results.tsx`
- `src/store/gameStore.ts`
- `src/api/gameApi.ts` (if API interaction changes)

Workflow:
1. Update UI/state behavior.
2. Keep API payload/typing in sync.
3. Validate with web e2e tests first, then full suite if needed.

Commands:

```bash
npm run test:web -- tests/web/server-validated.spec.ts
npm run test:web -- tests/web/daily-challenge.spec.ts
npm run test:web
```

---

## 4) Add or update Playwright test

Test location:
- `tests/web/*.spec.ts`

Useful run modes:

```bash
npm run test:web -- tests/web/daily-challenge.spec.ts
npm run test:web -- -g "test name here"
npm run test:web -- --headed
```

Guidelines:
- Prefer deterministic tests.
- Mock network via `page.route(...)`.
- Avoid reliance on external API uptime.

---

## 5) Add server endpoint (feature module pattern)

Typical steps:
1. Add/update DTO in `server/src/<feature>/dto`.
2. Add controller route in `server/src/<feature>/<feature>.controller.ts`.
3. Add business logic in service.
4. Update API docs decorators (`@ApiOperation`, `@ApiResponse`) as needed.
5. Add/update Jest specs.

Commands:

```bash
npm --prefix server run test -- -t "<feature or route name>"
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run build
```

---

## 6) Web + server integrated change

1. Start DB/Redis:

```bash
docker compose up -d postgres redis
```

2. Validate server first:

```bash
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run build
```

3. Validate web flows:

```bash
npm run test:web -- tests/web/server-validated.spec.ts
npm run test:web
```

---

## 7) Pre-PR verification checklist

Run before opening PR:

```bash
npm --prefix server run lint
npm --prefix server run test
npm --prefix server run build
npm run test:web
```

Confirm:
- No secrets added (`.env` remains uncommitted).
- Client API types align with server payloads.
- Changed behavior has test coverage.

---

## 8) Troubleshooting quick hits

- Playwright fails to boot app:
  - Re-run `npm ci`
  - Verify `npm run web:export` works
- API connection issues on web tests:
  - Confirm `EXPO_PUBLIC_API_URL` usage in `playwright.config.ts` webServer env
- Server startup issues:
  - Check `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
  - Ensure `docker compose up -d postgres redis` is healthy

---

## 9) Dataset scale import (REQ-DATASET-SCALE-001)

- Detailed runbook: `docs/CONTENT_IMPORT_RUNBOOK.md`
- Dataset files: `server/data/req-dataset-scale-001`

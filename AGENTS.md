# AGENTS.md
Guidance for coding agents in this repository.
Scope: entire repo unless a deeper AGENTS.md overrides it.

## Repository map
- Root (`/`): Expo React Native client + web export + Playwright tests.
- Server (`/server`): NestJS API with TypeORM, Jest, ESLint, Prettier.
- Web e2e tests: `tests/web/*.spec.ts`.
- Local infra: `docker-compose.yml` (Postgres + Redis).

## Tooling baseline
- Node.js: CI uses Node 20 (`.github/workflows/ci.yml`).
- Package manager: npm (`package-lock.json` in root and `server/`).
- TypeScript:
  - Root: `strict: true` (`tsconfig.json`).
  - Server: NodeNext + decorators (`server/tsconfig.json`).

## Install commands
- Root: `npm ci`
- Server: `npm --prefix server ci`

## Build/lint/test commands

### Root (Expo client + web)
- Start app: `npm run start`
- Platform shortcuts: `npm run android`, `npm run ios`, `npm run web`
- Build web export: `npm run web:export`
- Serve web export: `npm run web:serve`
- Run Playwright suite: `npm run test:web`
- Run a single Playwright file:
  - `npm run test:web -- tests/web/daily-challenge.spec.ts`
- Run a single Playwright test by name:
  - `npm run test:web -- -g "home banner uses server daily challenge letter"`
- Debug Playwright headed:
  - `npm run test:web -- --headed`

Notes:
- Root currently has no dedicated lint script in `package.json`.
- Playwright uses `playwright.config.ts` and spins a local web server automatically.

### Server (NestJS API)
- Build: `npm --prefix server run build`
- Start dev/watch: `npm --prefix server run start:dev`
- Start production: `npm --prefix server run start:prod`
- Lint (auto-fix): `npm --prefix server run lint`
- Format: `npm --prefix server run format`
- Test suite: `npm --prefix server run test`
- Single Jest file:
  - `npm --prefix server run test -- src/game-data/answer-validator.spec.ts`
- Single Jest test by title:
  - `npm --prefix server run test -- -t "should"`
- Coverage: `npm --prefix server run test:cov`
- E2E suite: `npm --prefix server run test:e2e`
- Single E2E file:
  - `npm --prefix server run test:e2e -- test/app.e2e-spec.ts`

### Docker/services
- Start DB/cache: `docker compose up -d postgres redis`
- Stop services: `docker compose down`
- View logs: `docker compose logs -f postgres redis`

## CI behavior to match locally
CI (`.github/workflows/ci.yml`) runs:
- Server lint in `server/`.
- Server tests in `server/` with Postgres and Redis service containers.
- Server build in `server/`.
- Root Playwright tests (`npm run test:web`).
- Docker image build for `server/`.

Agent implication:
- Server changes should pass lint + tests + build.
- Client/web changes should keep Playwright tests green.

## Code style guidelines

### Formatting
- Use TypeScript for new code (`.ts`/`.tsx`).
- Match existing style: semicolons, single quotes, trailing commas.
- Prefer 2-space indentation and readable wrapped lines.
- Use numeric separators for large literals (`45_000`).

### Imports
- Group imports in this order:
  1) framework/core libs,
  2) third-party packages,
  3) local modules.
- Server relative imports use `.js` extension (NodeNext runtime output).
- Use `import type` for type-only imports.

### Types and contracts
- Keep root strict typing (`strict: true`); do not weaken TS settings.
- Define explicit interfaces/types for API payloads and state.
- Prefer string literal unions for statuses over generic `string`.
- Avoid `any`; if unavoidable, isolate and keep narrow.
- On server, validate DTOs with `class-validator` decorators.

### Naming conventions
- React components/classes/types/interfaces: PascalCase.
- Functions, methods, variables: camelCase.
- Constants:
  - UPPER_SNAKE_CASE for stable module constants.
  - camelCase for computed/local constants.
- Keep file naming aligned with existing structure:
  - Expo routes in `app/` (`_layout.tsx`, `[mode].tsx`).
  - Feature folders in `server/src` (`auth`, `game`, `leaderboard`, etc.).

### Architecture patterns
- Client state lives in Zustand stores under `src/store`.
- API wrappers stay in `src/api` and return typed `data` values.
- Reuse theme tokens from `src/theme/theme.ts` (colors, spacing, radii, typography).
- Keep server modules feature-oriented with controller/service/dto/entity separation.

### Error handling
- Do not silently swallow meaningful errors.
- Client:
  - Catch network failures and show user-safe fallback text.
  - Do not expose raw internals or stack traces in UI.
- Server:
  - Throw Nest HTTP exceptions (`BadRequestException`, `NotFoundException`, etc.).
  - Rely on global `ValidationPipe` for input sanitation/validation.
  - Keep game validation behavior deterministic and explicit.

### Testing guidance
- Add or update tests whenever behavior changes.
- Prefer narrow tests first (single file or `-t`/`-g` filtering).
- For server logic changes: add focused Jest specs in same feature area.
- For user-visible flow changes: add/update Playwright coverage.
- Keep tests deterministic; route/mock network requests in Playwright as needed.

## Environment and secrets
- Never commit real secrets.
- Use `server/.env.example` as the source of required server variables.
- Root `.env` should set `EXPO_PUBLIC_API_URL` for local client-server integration.
- Respect `.gitignore` for `.env` files and generated artifacts.

## Cursor/Copilot instructions check
Checked:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Status:
- No Cursor or Copilot instruction files were found at these paths.
- If they are added later, treat them as additional repository policy.

## Practical agent workflow
1. Identify affected surface (root client, server API, or both).
2. Make minimal, pattern-consistent changes.
3. Run smallest relevant test(s) first.
4. Run broader validation for touched area.
5. Report what you ran and what remains unverified.

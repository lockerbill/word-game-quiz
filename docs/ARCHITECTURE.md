# ARCHITECTURE.md

## System at a glance
- Root app: Expo + React Native + Expo Router.
- API: NestJS + TypeORM in `server/`.
- Tests: Playwright in `tests/web`, Jest in `server/`.
- Infra: Postgres + Redis via `docker-compose.yml`.

## Runtime flow (happy path)
1. Client starts game: `POST /api/game/start`.
2. Server returns `gameId`, letter, categories, timer.
3. Client stores answers/timer in Zustand.
4. Client submits answers: `POST /api/game/submit`.
5. Server validates + scores + persists + updates stats.
6. Client shows results from server response.

## Client architecture
- Routes/screens: `app/`
  - layout: `app/_layout.tsx`
  - gameplay: `app/game/[mode].tsx`, `app/game/results.tsx`
  - auth: `app/auth/*`
  - tabs: `app/(tabs)/*`
- State: Zustand stores in `src/store/`
  - game: `src/store/gameStore.ts`
  - user: `src/store/userStore.ts`
- API layer: `src/api/*`
  - base client + token interceptor: `src/api/apiClient.ts`
- Theme/tokens: `src/theme/theme.ts`

## Server architecture
- Entry/bootstrap: `server/src/main.ts`
- Feature modules:
  - `auth`, `game`, `leaderboard`, `user`, `ai-validation`
- Typical request path:
  - controller -> DTO validation -> service -> repository/entity -> response
- Entities: `server/src/entities/*`
- Game internals: `server/src/game-data/*` (letter weights, validator, scoring)

## Validation rules
- Global `ValidationPipe` enabled.
- DTOs use `class-validator`.
- Game submit uses deterministic checks first, optional AI validation fallback.

## Testing map
- Web e2e: `tests/web/*.spec.ts` (Playwright).
- Server unit/integration: `server/src/**/*.spec.ts` (Jest).
- Server e2e: `server/test/*.e2e-spec.ts`.

## Env and config
- Root `.env`: `EXPO_PUBLIC_API_URL`.
- Server env template: `server/.env.example`.
- CI reference: `.github/workflows/ci.yml`.

## Change checklist
1. Edit smallest feature surface first.
2. Keep client types aligned with server payloads.
3. Run narrow tests first, then broader suite.
4. Server changes: lint + test + build.
5. UI flow changes: run relevant Playwright specs.

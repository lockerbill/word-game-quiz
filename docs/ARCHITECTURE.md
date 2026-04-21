# ARCHITECTURE.md

## System at a glance
- Player app: Expo + React Native + Expo Router in root (`app/`, `src/`).
- Admin app: standalone React + Vite app in `admin-web/`.
- API: NestJS + TypeORM in `server/` with RBAC-protected admin namespace.
- Tests: Playwright in `tests/web`, Jest in `server/`.
- Infra: Postgres + Redis via `docker-compose.yml`.

## Runtime flow (happy path)
1. Client starts game: `POST /api/game/start`.
2. Server returns `gameId`, letter, categories, timer.
3. Client stores answers/timer in Zustand.
4. Client submits answers: `POST /api/game/submit`.
5. Server validates + scores + persists + updates stats.
6. Client shows results from server response.

## Runtime flow (admin moderation)
1. Admin web loads moderation queue: `GET /api/admin/sessions`.
2. Admin web loads moderation KPI cards: `GET /api/admin/sessions/metrics`.
3. API returns played sessions with player/session metadata and latest moderation state.
4. Admin opens a session detail: `GET /api/admin/sessions/:id`.
5. API returns answer-level results plus moderation history.
6. Admin records review decision: `POST /api/admin/sessions/:id/review`.
7. API appends review record and writes admin audit log.

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

## Admin web architecture
- App shell: `admin-web/src/App.tsx`, `admin-web/src/components/AdminLayout.tsx`.
- Auth/session: `admin-web/src/auth/*` with token persistence, role gate, idle timeout.
- API layer: `admin-web/src/api/*` using shared axios client.
- Feature pages: `admin-web/src/pages/*`
  - moderation queue/session review: `ModerationPage.tsx`
  - content management: `ContentPage.tsx`
  - user management: `UsersPage.tsx`
  - settings revisions: `SettingsPage.tsx`
  - audit explorer: `AuditPage.tsx`

## Server architecture
- Entry/bootstrap: `server/src/main.ts`
- Feature modules:
  - player APIs: `auth`, `game`, `leaderboard`, `user`, `ai-validation`
  - admin APIs: `admin`, `admin-content`, `admin-users`, `admin-settings`, `admin-session-moderation`
- Typical request path:
  - controller -> DTO validation -> service -> repository/entity -> response
- Entities: `server/src/entities/*`
- Game internals: `server/src/game-data/*` (letter weights, validator, scoring)

## Admin backend patterns
- Namespace: all admin APIs under `/api/admin/*`.
- Authorization: JWT auth + `RolesGuard` + `@Roles(...)` on controllers.
- Roles currently used for admin surfaces: `admin`, `super_admin`.
- Auditability: mutation endpoints write records to `admin_audit_logs`.
- Throttling: admin route throttles use `ADMIN_THROTTLE_*` env controls.
- CORS: admin routes use `ADMIN_CORS_ORIGIN` allowlist in `server/src/main.ts`.
- Moderation metrics endpoint provides fixed 24h KPI windows for queue health.

## Data model highlights
- Gameplay persistence:
  - `games` (session summary)
  - `game_answers` (answer-level validations)
- Admin operations persistence:
  - `admin_audit_logs` (admin mutation audit trail)
  - `content_import_jobs` + `content_revisions`
  - `admin_settings_revisions`
  - `session_moderation_reviews` (append-only reviewed/flagged decisions)

## Validation rules
- Global `ValidationPipe` enabled.
- DTOs use `class-validator`.
- Game submit uses deterministic checks first, optional AI validation fallback.
- Admin moderation decisions are non-destructive (review/flag only).

## Testing map
- Web e2e: `tests/web/*.spec.ts` (Playwright).
- Admin web e2e: `tests/admin-web/*.spec.ts` (Playwright).
- Server unit/integration: `server/src/**/*.spec.ts` (Jest).
- Server e2e: `server/test/*.e2e-spec.ts`.
- Admin web validation in CI: lint + typecheck + build (`admin-web` job).

### Admin E2E matrix
- `tests/admin-web/moderation-lifecycle.spec.ts`
  - Covers moderation queue/session load, review action, flag action, KPI refresh, and history rendering.
- `tests/admin-web/moderation-auth-guards.spec.ts`
  - Covers protected-route redirects and login messaging for forbidden-role and expired-session cases.

## Env and config
- Root `.env`: `EXPO_PUBLIC_API_URL`.
- Server env template: `server/.env.example`.
- CI reference: `.github/workflows/ci.yml`.

## Change checklist
1. Edit smallest feature surface first.
2. Keep player/admin client types aligned with server payloads.
3. Run narrow tests first, then broader suite.
4. Server changes: lint + test + build.
5. Root UI flow changes: run relevant Playwright specs.
6. Admin web changes: lint + typecheck + build.

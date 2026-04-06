# Alpha Bucks Practice App - Requirements Tracker + TODO

Source of truth for requirements: `SRS.md`

This file tracks which SRS features are implemented in this repo, where they live in code, and what remains to be done.

Status legend:
- DONE: implemented and used end-to-end
- PARTIAL: implemented but incomplete, duplicated, or not wired end-to-end
- TODO: not implemented

---

## Implemented (DONE)

REQ-APP-NAV-001 - App navigation shell
- Status: DONE
- Evidence: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`

REQ-GAME-MODES-001 - Practice mode (30s / 10 categories)
- Status: DONE (client); server supports it too
- Evidence: `app/game/[mode].tsx`, `src/store/gameStore.ts`, `server/src/game/game.service.ts`

REQ-GAME-MODES-002 - Relax mode (no timer)
- Status: DONE
- Evidence: `app/game/[mode].tsx`, `src/store/gameStore.ts`, `server/src/game/game.service.ts`

REQ-GAME-MODES-003 - Hardcore mode (20s + hard letters)
- Status: DONE
- Evidence: `src/theme/theme.ts`, `server/src/game-data/letter-weights.ts`, `server/src/game/game.service.ts`

REQ-ENGINE-LETTER-001 - Weighted letter selection
- Status: DONE
- Evidence: `server/src/game-data/letter-weights.ts`, `server/src/game/game.service.ts`

REQ-ENGINE-SCORE-001 - Score + multiplier + time bonus + XP
- Status: DONE
- Evidence: `src/engine/Scoring.ts`, `server/src/game-data/scoring.ts`

REQ-LEADERBOARD-API-001 - Global/Weekly/Daily leaderboards
- Status: DONE (server + app screen)
- Evidence: `server/src/leaderboard/leaderboard.controller.ts`, `server/src/leaderboard/leaderboard.service.ts`, `app/(tabs)/leaderboard.tsx`, `src/api/leaderboardApi.ts`

REQ-AUTH-API-001 - Auth (register/login/guest/upgrade)
- Status: DONE (server + app screens)
- Evidence: `server/src/auth/auth.controller.ts`, `server/src/auth/auth.service.ts`, `src/api/authApi.ts`, `app/auth/login.tsx`, `app/auth/register.tsx`, `src/store/userStore.ts`

REQ-USER-API-001 - User profile/stats/history endpoints
- Status: DONE (server); app uses profile sync partially
- Evidence: `server/src/user/user.controller.ts`, `server/src/user/user.service.ts`, `src/api/userApi.ts`, `src/store/userStore.ts`

REQ-CLIENT-SERVER-SOURCE-001 - Single source of truth for game data
- Status: DONE
- Current behavior:
  - Game sessions, daily challenge, and answer validation use server API/DB as the source of truth.
  - Offline gameplay fallback has been removed.
- Evidence: `server/src/game/game.service.ts`, `server/src/game/game.module.ts`, `app/game/[mode].tsx`, `app/(tabs)/index.tsx`, `src/store/gameStore.ts`

REQ-GAMIFICATION-001 - XP + levels + achievements
- Status: DONE (local)
- Evidence: `src/engine/Scoring.ts`, `src/gamification/Achievements.ts`, `src/store/userStore.ts`, `app/(tabs)/profile.tsx`

REQ-INFRA-001 - Local docker stack for Postgres/Redis/API
- Status: DONE
- Evidence: `docker-compose.yml`

---

## Partially Implemented (PARTIAL)

REQ-GAME-MODES-010 - Ranked mode (competitive)
- Status: PARTIAL
- Current behavior:
  - Mode exists in UI and engine.
  - Leaderboards are "top games" across all modes (except daily leaderboard filters `mode='daily'`).
- Evidence: `src/theme/theme.ts`, `app/(tabs)/index.tsx`, `server/src/leaderboard/leaderboard.service.ts`
- TODO:
  - Decide what "ranked" means (separate leaderboard? rating system? mode-only aggregation?).
  - Filter/global leaderboard by mode or add dedicated ranked endpoints.

REQ-GAME-DAILY-001 - Daily challenge (same letter + categories for everyone)
- Status: DONE
- Current behavior:
  - App consumes `GET /api/game/daily` for daily banner data.
  - Server generates deterministic daily challenge and returns date+letter+categories.
- Evidence: `src/api/gameApi.ts`, `server/src/game/game.service.ts`, `app/(tabs)/index.tsx`

REQ-VALIDATION-PIPELINE-001 - Answer validation pipeline
- Status: PARTIAL
- Current behavior:
  - Validates "starts with letter" + exact/fuzzy DB match first.
  - Unknown/no-match answers are sent to server AI validation (`openai`/`ollama`/`gemini`) with Redis cache.
- Evidence: `server/src/game-data/answer-validator.ts`, `server/src/game/game.service.ts`, `server/src/ai-validation/`, `app/game/results.tsx`
- TODO:
  - Persist and display server validations in the app results (currently results come from local session).

REQ-OFFLINE-001 - Offline practice
- Status: PARTIAL
- Current behavior:
  - Offline gameplay is disabled; app shows friendly unavailable states with retry for game start/daily fetch failures.
  - No SQLite preload or content packs.
- Evidence: `app/game/[mode].tsx`, `app/(tabs)/index.tsx`
- TODO:
  - Add SQLite store and preload sets per SRS.

REQ-VOICE-MODE-001 - Voice mode (TTS prompts + microphone answers + typing fallback)
- Status: PARTIAL
- Current behavior:
  - Added pluggable client-side voice provider contracts for text-to-speech and speech-to-text.
  - Added provider registry/factory with graceful noop fallback and optional web speech providers.
  - Added persisted voice settings store for mode/provider selection and voice defaults.
  - Gameplay screen now supports in-round voice toggle, prompt playback, and microphone answer capture while preserving typed input.
- Added Expo mobile voice providers for local device TTS/STT with speech recognition plugin permissions.
- Evidence: `src/voice/types.ts`, `src/voice/voiceService.ts`, `src/voice/providers/noopVoiceProvider.ts`, `src/voice/providers/webSpeechVoiceProvider.ts`, `src/voice/providers/expoTtsProvider.ts`, `src/voice/providers/expoSttProvider.ts`, `src/store/voiceStore.ts`, `app/_layout.tsx`, `app/game/[mode].tsx`, `app.json`, `package.json`
- TODO:
  - Add cloud AI voice providers.

REQ-DATASET-SCALE-001 - 10,000+ categories and 100k+ answers
- Status: PARTIAL (small static dataset + DB seeding)
- Evidence: `server/src/game-data/categories.ts`, `server/src/game-data/answers.ts`, `server/src/database/seed.service.ts`
- TODO:
  - Move selection/validation to DB-first; implement ingestion pipeline.

---

## Not Implemented (TODO)

REQ-ANTICHEAT-001 - Anti-cheat (paste/bot/time analysis)
- Status: TODO

REQ-AI-VALIDATION-001 - AI answer validation service
- Status: DONE
- Evidence: `server/src/ai-validation/ai-validation.service.ts`, `server/src/ai-validation/providers/openai.provider.ts`, `server/src/ai-validation/providers/ollama.provider.ts`, `server/src/ai-validation/providers/gemini.provider.ts`
- Commit: `1a1c687`

REQ-GROWTH-001 - Invite friends + referral rewards
- Status: TODO

REQ-GROWTH-002 - Share result cards (image generation)
- Status: TODO (text share exists)
- Evidence: `app/game/results.tsx`

REQ-MULTIPLAYER-001 - Multiplayer mode (matchmaking + simultaneous play)
- Status: TODO

REQ-CONTENT-ADMIN-001 - Content expansion system + admin panel
- Status: TODO (planned: Option 2 separate admin app)
- Decision:
  - Admin panel will be a separate web app (`admin-web/`) with separate deploy/domain.
  - Backend remains NestJS with dedicated `/api/admin/*` endpoints.
- Scope:
  - Content management (categories, answers, bulk import, enable/disable, publish/rollback).
  - User administration (search, role assignment, suspend/reactivate).
  - Server settings management (game/validation/feature flags with versioning + rollback).

REQ-MODERATION-001 - Moderation pipeline for new content
- Status: TODO

REQ-ANALYTICS-001 - Analytics pipeline (typing speed, retention, etc.)
- Status: TODO

REQ-LEADERBOARD-VARIANTS-001 - Friends / country leaderboards
- Status: TODO

REQ-SECURITY-001 - Additional security features (beyond JWT + throttling)
- Status: TODO

---

## Backlog (Prioritized TODO Tasks)

### P0 - Make core gameplay + validation coherent end-to-end

- DONE-P0-001 - Use server as source of truth for daily challenge
  - Update app home + gameplay start to consume `GET /api/game/daily` / `POST /api/game/start` consistently.
  - Keep local deterministic daily only as an offline fallback.

- DONE-P0-002 - Show server-validated results in the results screen
  - Capture response from `POST /api/game/submit` and display validations/score from server.
  - Decide UX when offline (local validation shown, and optionally reconcile later).

- TODO-P0-003 - Decide and implement ranked semantics
  - Minimum viable: leaderboards filtered to `mode='ranked'`.
  - Better: per-user best score aggregation by mode; avoid "one user spams top 50".

- TODO-P0-004 - Remove/limit lenient validation fallback
  - Tighten rules so unknown answers are not always accepted.
  - If keeping leniency, do it only in Practice/Relax.

### P0 - Admin security foundation (Option 2)

- DONE-P0-ADMIN-001 - Add RBAC model to users
  - Added `role` (`player|moderator|admin|super_admin`) and account status fields to `users`.
  - Added DB migration file and startup bootstrap path for first `super_admin`.
  - Evidence: `server/src/entities/user.entity.ts`, `server/src/database/migrations/1743859200000-add-user-role-status.ts`, `server/src/auth/admin-bootstrap.service.ts`

- DONE-P0-ADMIN-002 - Add admin authz guards + decorators
  - Implemented `@Roles(...)` and route-level `RolesGuard`.
  - Added RBAC-protected admin namespace under `/api/admin/*`.
  - Evidence: `server/src/auth/roles.decorator.ts`, `server/src/auth/roles.guard.ts`, `server/src/admin/admin.controller.ts`, `server/src/admin/admin.module.ts`

- DONE-P0-ADMIN-003 - Add admin audit logging
  - Created `admin_audit_logs` table model + migration.
  - Added audit logging service and wired admin mutation endpoints to log actor, action, target, before/after, reason, timestamp.
  - Evidence: `server/src/entities/admin-audit-log.entity.ts`, `server/src/database/migrations/1743862800000-add-admin-audit-logs.ts`, `server/src/admin/admin-audit-log.service.ts`, `server/src/admin/admin.service.ts`

- DONE-P0-ADMIN-004 - Harden admin API surface
  - Added separate admin CORS policy via `ADMIN_CORS_ORIGIN` for `/api/admin/*`.
  - Added stricter admin throttling controls (global admin + mutation-specific limits).
  - Added denied-access monitoring logs in authz/authn guards.
  - Evidence: `server/src/main.ts`, `server/src/admin/admin.controller.ts`, `server/src/auth/roles.guard.ts`, `server/src/auth/jwt.strategy.ts`

### P1 - Data model and correctness

- TODO-P1-001 - Move category/answer selection to DB-first
  - Use `categories` and `answers` tables for selection and validation.
  - Keep a small bundle fallback for offline.

- TODO-P1-002 - Add mode filters + richer leaderboard metrics
  - Add endpoints or query params for per-mode leaderboards.
  - Add per-user aggregation (highest score / average) and limit duplicates.

### P1 - Admin backend modules

- DONE-P1-ADMIN-001 - Implement `admin-content` module
  - Added category CRUD and enable/disable endpoints under `/api/admin/content/categories`.
  - Added answer CRUD endpoints under `/api/admin/content/categories/:categoryId/answers` and `/api/admin/content/answers/:answerId`.
  - Implemented validation and dedupe checks (case-insensitive category name uniqueness, category+letter+answer uniqueness, answer starts-with-letter rule).
  - Wired admin audit logs for all content mutations.
  - Evidence: `server/src/admin-content/admin-content.module.ts`, `server/src/admin-content/admin-content.controller.ts`, `server/src/admin-content/admin-content.service.ts`

- DONE-P1-ADMIN-002 - Implement bulk content import pipeline
  - Added import job workflow with CSV/JSON payload validation and dry-run result storage.
  - Added import job status endpoints and apply step to persist categories/answers.
  - Included validation errors/warnings summaries and audit logs for validate/apply actions.
  - Evidence: `server/src/admin-content/admin-content-import.service.ts`, `server/src/admin-content/admin-content.controller.ts`, `server/src/entities/content-import-job.entity.ts`

- DONE-P1-ADMIN-003 - Implement content versioning workflow
  - Added `content_revisions` persistence model and migration for revision history.
  - Added draft/review/publish workflow endpoints with snapshot-based publish apply.
  - Added rollback endpoint that restores a published revision and records a new published rollback revision.
  - Evidence: `server/src/entities/content-revision.entity.ts`, `server/src/admin-content/admin-content-revision.service.ts`, `server/src/admin-content/admin-content.controller.ts`

- DONE-P1-ADMIN-004 - Implement `admin-users` module
  - Added dedicated admin users module with `/api/admin/users` search/filter endpoint and pagination.
  - Moved user role/status mutations to `/api/admin/users/:userId/role` and `/api/admin/users/:userId/status` with reason-required DTO validation.
  - Preserved RBAC constraints and admin audit logging for role/status mutations.
  - Evidence: `server/src/admin-users/admin-users.module.ts`, `server/src/admin-users/admin-users.controller.ts`, `server/src/admin-users/admin-users.service.ts`
  - Commit: `40c8ab4`

- DONE-P1-ADMIN-005 - Implement `admin-settings` module
  - Added runtime settings revision store with optimistic version checks (`expectedVersion`) for publish and rollback operations.
  - Added admin settings endpoints for current settings, revision history, publish update, and rollback.
  - Wired runtime settings consumption into game mode timer/category selection and AI validation behavior.
  - Evidence: `server/src/admin-settings/admin-settings.module.ts`, `server/src/admin-settings/admin-settings.controller.ts`, `server/src/admin-settings/admin-settings.service.ts`, `server/src/entities/admin-settings-revision.entity.ts`
  - Commit: `e65dd38`

### P2 - Anti-cheat (MVP)

- TODO-P2-001 - Client paste detection instrumentation
- TODO-P2-002 - Server suspicious flagging + storage

### P2 - Voice mode foundation

- DONE-P2-VOICE-001 - Implement pluggable local voice provider architecture
  - Added typed provider interfaces for TTS/STT plus a voice service registry with runtime provider selection.
  - Added noop providers for safe fallback and web speech providers for local browser capability.
  - Evidence: `src/voice/types.ts`, `src/voice/voiceService.ts`, `src/voice/providers/noopVoiceProvider.ts`, `src/voice/providers/webSpeechVoiceProvider.ts`

- DONE-P2-VOICE-002 - Add gameplay voice toggle + TTS prompt playback + STT answer capture
  - Added voice mode toggle in gameplay and voice status/error UX.
  - Added prompt auto-play on question change and microphone start/stop controls.
  - Speech transcript updates the answer input while keeping manual typing available.
  - Added cleanup to stop TTS/STT during question navigation, finish, and screen unmount.
  - Evidence: `app/game/[mode].tsx`, `src/store/voiceStore.ts`, `src/voice/voiceService.ts`
- DONE-P2-VOICE-003 - Persist voice mode settings and selected providers in client store
  - Added `voiceStore` with AsyncStorage persistence, provider id normalization/fallback, and voice defaults.
  - Loaded voice settings at app bootstrap to make preferences available before gameplay.
  - Evidence: `src/store/voiceStore.ts`, `app/_layout.tsx`
- DONE-P2-VOICE-004 - Add mobile local voice providers (Expo TTS + speech recognition)
  - Added Expo TTS and Expo speech recognition providers and registered them in the pluggable voice service.
  - Added speech recognition config plugin and permission strings for native platforms.
  - Note: Native speech recognition requires an Expo development build (not Expo Go).
  - Evidence: `src/voice/providers/expoTtsProvider.ts`, `src/voice/providers/expoSttProvider.ts`, `src/voice/voiceService.ts`, `app.json`, `package.json`

### P2 - Separate admin frontend app (`admin-web`)

- DONE-P2-ADMIN-001 - Bootstrap standalone admin app
  - Created standalone React + TypeScript + Vite app in `admin-web/` with independent package, route shell, and admin auth bootstrap.
  - Added dedicated CI job for `admin-web` (lint + typecheck + build).
  - Evidence: `admin-web/package.json`, `admin-web/src/App.tsx`, `admin-web/src/auth/AuthContext.tsx`, `.github/workflows/ci.yml`

- DONE-P2-ADMIN-002 - Implement admin auth flow
  - Added login/session handling with token persistence, protected route redirects, and logout reason UX.
  - Added API auth-failure handling (`401/403`) and cross-tab session sync.
  - Added 15-minute idle timeout auto-logout (configurable via `VITE_ADMIN_IDLE_TIMEOUT_MS`).
  - Evidence: `admin-web/src/auth/AuthContext.tsx`, `admin-web/src/components/ProtectedRoute.tsx`, `admin-web/src/api/client.ts`, `admin-web/src/pages/LoginPage.tsx`, `admin-web/.env.example`

- DONE-P2-ADMIN-003 - Build content management screens
  - Implemented categories table/editor with search, status filter, pagination, create/edit, and enable/disable actions.
  - Implemented answers table/editor with category selector, letter filter, pagination, create/edit, and delete actions.
  - Implemented bulk import UI for validation job create, job list/detail view, and apply flow.
  - Evidence: `admin-web/src/pages/ContentPage.tsx`, `admin-web/src/api/adminContentApi.ts`, `admin-web/src/types/adminContent.ts`, `admin-web/src/index.css`

- DONE-P2-ADMIN-004 - Build user management screens
  - Implemented admin users list with search, role/status filters, and pagination.
  - Added role and account status mutation actions with reason-required prompts and server error surfacing.
  - Evidence: `admin-web/src/pages/UsersPage.tsx`, `admin-web/src/api/adminUsersApi.ts`, `admin-web/src/types/adminUsers.ts`, `admin-web/src/index.css`

- DONE-P2-ADMIN-005 - Build settings + audit screens
  - Implemented runtime settings editor with current snapshot, publish flow, revision history, revision detail, and rollback action.
  - Implemented audit log explorer with limit filters and expandable JSON views for before/after/metadata.
  - Evidence: `admin-web/src/pages/SettingsPage.tsx`, `admin-web/src/pages/AuditPage.tsx`, `admin-web/src/api/adminSettingsApi.ts`, `admin-web/src/api/adminAuditApi.ts`, `admin-web/src/types/adminSettings.ts`, `admin-web/src/types/adminAudit.ts`

### P3 - AI validation (incremental)

- DONE-P3-001 - Add a server-side validation interface with pluggable backends
- DONE-P3-002 - Implement AI validator + cache results

### P3 - Voice provider expansion

- TODO-P3-VOICE-001 - Add cloud AI voice providers (TTS/STT) via provider plugins

### P3 - Testing and rollout

- TODO-P3-ADMIN-001 - Add backend tests for admin RBAC/services/audit.
- TODO-P3-ADMIN-002 - Add Playwright admin E2E flows.
- TODO-P3-ADMIN-003 - Deploy admin app to separate domain and restrict admin API origin.
- TODO-P3-ADMIN-004 - Internal rollout, monitor logs/alerts, then expand admin access.
- TODO-P3-ADMIN-005 - Add temporary password reset + must-change-on-next-login flow
  - Admin can set a temporary password from user management.
  - User must change password on first login after temporary reset.
  - Add backend enforcement and admin/web UX + tests.

### P4+ - Growth / Multiplayer / Admin / Analytics

- TODO-P4-001 - Referrals/invites
- TODO-P4-002 - Shareable image cards
- TODO-P4-003 - Multiplayer real-time sessions + rating system
- TODO-P4-004 - Admin dashboard + moderation queue
- TODO-P4-005 - Analytics events + dashboards

---

## Known Repo Issues / Hygiene

- ISSUE-CI-001 - GitHub Actions CI triggers on `main` but repo branch is `master`
  - Evidence: `.github/workflows/ci.yml` and `git branch --show-current`
  - Fix: update workflow triggers to include `master` or rename default branch.

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
  - Validates "starts with letter" + exact/fuzzy match against a small curated answer list.
  - If no answers exist for a category+letter, validation is lenient (accepts as valid with 0.5 confidence).
- Evidence: `server/src/game-data/answer-validator.ts`, `server/src/game/game.service.ts`, `app/game/results.tsx`
- TODO:
  - Replace lenient fallback with a stronger approach (AI validation or stricter rules).
  - Persist and display server validations in the app results (currently results come from local session).

REQ-OFFLINE-001 - Offline practice
- Status: PARTIAL
- Current behavior:
  - Offline gameplay is disabled; app shows friendly unavailable states with retry for game start/daily fetch failures.
  - No SQLite preload or content packs.
- Evidence: `app/game/[mode].tsx`, `app/(tabs)/index.tsx`
- TODO:
  - Add SQLite store and preload sets per SRS.

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
- Status: TODO

REQ-GROWTH-001 - Invite friends + referral rewards
- Status: TODO

REQ-GROWTH-002 - Share result cards (image generation)
- Status: TODO (text share exists)
- Evidence: `app/game/results.tsx`

REQ-MULTIPLAYER-001 - Multiplayer mode (matchmaking + simultaneous play)
- Status: TODO

REQ-CONTENT-ADMIN-001 - Content expansion system + admin panel
- Status: TODO

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

### P1 - Data model and correctness

- TODO-P1-001 - Move category/answer selection to DB-first
  - Use `categories` and `answers` tables for selection and validation.
  - Keep a small bundle fallback for offline.

- TODO-P1-002 - Add mode filters + richer leaderboard metrics
  - Add endpoints or query params for per-mode leaderboards.
  - Add per-user aggregation (highest score / average) and limit duplicates.

### P2 - Anti-cheat (MVP)

- TODO-P2-001 - Client paste detection instrumentation
- TODO-P2-002 - Server suspicious flagging + storage

### P3 - AI validation (incremental)

- TODO-P3-001 - Add a server-side validation interface with pluggable backends
- TODO-P3-002 - Implement AI validator + cache results

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

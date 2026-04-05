# FEATURE_INDEX.md

## Why this file
Fast file lookup for common tasks.

## App shell and routing
- Root layout: `app/_layout.tsx`
- Tabs layout: `app/(tabs)/_layout.tsx`
- Home: `app/(tabs)/index.tsx`
- Leaderboard tab: `app/(tabs)/leaderboard.tsx`
- Profile tab: `app/(tabs)/profile.tsx`
- Auth screens: `app/auth/login.tsx`, `app/auth/register.tsx`
- Game screens: `app/game/[mode].tsx`, `app/game/results.tsx`

## Client state and APIs
- Game store: `src/store/gameStore.ts`
- User store: `src/store/userStore.ts`
- API base client: `src/api/apiClient.ts`
- Auth API: `src/api/authApi.ts`
- Game API: `src/api/gameApi.ts`
- Leaderboard API: `src/api/leaderboardApi.ts`
- User API: `src/api/userApi.ts`
- Theme tokens: `src/theme/theme.ts`

## Server feature files
- App bootstrap/module: `server/src/main.ts`, `server/src/app.module.ts`

### Auth
- `server/src/auth/auth.controller.ts`
- `server/src/auth/auth.service.ts`
- `server/src/auth/dto/auth.dto.ts`
- `server/src/auth/jwt.strategy.ts`

### Game
- `server/src/game/game.controller.ts`
- `server/src/game/game.service.ts`
- `server/src/game/dto/game.dto.ts`
- `server/src/game-data/answer-validator.ts`
- `server/src/game-data/scoring.ts`
- `server/src/game-data/letter-weights.ts`

### User and leaderboard
- User: `server/src/user/user.controller.ts`, `server/src/user/user.service.ts`
- Leaderboard: `server/src/leaderboard/leaderboard.controller.ts`, `server/src/leaderboard/leaderboard.service.ts`

### AI validation
- `server/src/ai-validation/ai-validation.service.ts`
- `server/src/ai-validation/providers/ai-validation-provider.ts`
- `server/src/ai-validation/providers/openai.provider.ts`
- `server/src/ai-validation/providers/ollama.provider.ts`
- `server/src/ai-validation/providers/gemini.provider.ts`
- `server/src/ai-validation/ai-validation.types.ts`

### Persistence and infra
- Entities: `server/src/entities/*`
- DB module/seed: `server/src/database/*`
- Redis: `server/src/redis/*`

## Tests and configs
- Playwright config: `playwright.config.ts`
- Web tests: `tests/web/*.spec.ts`
- Server Jest config/scripts: `server/package.json`
- Admin web entry/routing: `admin-web/src/main.tsx`, `admin-web/src/App.tsx`
- Admin web auth/api bootstrap: `admin-web/src/auth/AuthContext.tsx`, `admin-web/src/api/adminAuthApi.ts`
- Server e2e config: `server/test/jest-e2e.json`
- ESLint: `server/eslint.config.mjs`
- Prettier: `server/.prettierrc`
- CI: `.github/workflows/ci.yml`
- Docker: `docker-compose.yml`

## Task -> edit map
- API contract change:
  - `server/src/**/dto/*.ts`
  - matching controller/service
  - `src/api/*.ts`
  - relevant store/screen
- Gameplay behavior change:
  - `server/src/game/*` + `server/src/game-data/*`
  - `src/store/gameStore.ts`
  - `app/game/*`
- Auth behavior change:
  - `server/src/auth/*`
  - `src/api/authApi.ts`
  - `src/store/userStore.ts`
  - `app/auth/*`
- Leaderboard/profile UI change:
  - `src/api/leaderboardApi.ts` or `src/api/userApi.ts`
  - `app/(tabs)/leaderboard.tsx` or `app/(tabs)/profile.tsx`

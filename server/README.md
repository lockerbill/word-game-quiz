# Word Game Quiz API

NestJS backend for the Word Game Quiz app. This service handles game logic, authentication, validation, and data access.

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL
- Redis
- TypeORM

## Prerequisites

- Node.js 18+
- npm
- Docker Desktop (recommended for local PostgreSQL/Redis)

## Environment Setup

Copy the example env file:

```bash
cp .env.example .env
```

Required variables in `server/.env`:

- `DATABASE_URL` (example: `postgresql://postgres:password@localhost:5432/alphabucks`)
- `REDIS_URL` (example: `redis://localhost:6379`)
- `JWT_SECRET`
- `PORT` (default: `3000`)
- `NODE_ENV` (default: `development`)
- `CORS_ORIGIN`
- `ADMIN_CORS_ORIGIN` (comma-separated admin web origins; required to call `/api/admin/*` from browser)

Optional super admin bootstrap variables:

- `ADMIN_BOOTSTRAP_ENABLED` (`true` to bootstrap a super admin at startup, default: `false`)
- `ADMIN_BOOTSTRAP_EMAIL` (required when bootstrap is enabled)
- `ADMIN_BOOTSTRAP_PASSWORD` (required when bootstrap is enabled)
- `ADMIN_BOOTSTRAP_USERNAME` (default: `superadmin`)

Optional admin throttling variables:

- `ADMIN_THROTTLE_LIMIT` (default: `30`)
- `ADMIN_THROTTLE_TTL_MS` (default: `60000`)
- `ADMIN_MUTATION_THROTTLE_LIMIT` (default: `10`)

Optional AI validation variables:

- `AI_VALIDATION_ENABLED` (default: `true`)
- `AI_VALIDATION_PROVIDER` (`openai`, `ollama`, or `gemini`, default: `openai`)
- `AI_VALIDATION_TIMEOUT_MS` (default: `2500`)
- `AI_VALIDATION_MIN_CONFIDENCE` (default: `0.70`)
- `AI_VALIDATION_CACHE_TTL_SECONDS` (default: `604800`)

OpenAI provider variables:

- `OPENAI_API_KEY` (required when using `openai` provider)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default: `https://api.openai.com/v1`)

Ollama provider variables:

- `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- `OLLAMA_MODEL` (default: `llama3.1:8b`)

Gemini provider variables (AI Studio key flow):

- `GEMINI_API_KEY` (required when using `gemini` provider)
- `GEMINI_MODEL` (default: `gemini-1.5-flash`)
- `GEMINI_BASE_URL` (default: `https://generativelanguage.googleapis.com`)

Provider switching examples (`server/.env`):

```env
# OpenAI (default)
AI_VALIDATION_PROVIDER=openai
OPENAI_API_KEY=your_openai_key

# Ollama
AI_VALIDATION_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Gemini (AI Studio)
AI_VALIDATION_PROVIDER=gemini
GEMINI_API_KEY=your_ai_studio_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

Validation behavior:

- Server performs deterministic checks first (letter + exact/fuzzy dataset match).
- If unresolved, it asks the configured AI provider.
- Strict fallback is enabled: unresolved answers are marked invalid if AI fails or times out.

## Run in Development

From the repository root, start local dependencies:

```bash
docker compose up -d postgres redis
```

Then run the API:

```bash
cd server
npm install
npm run start:dev
```

API base URL: `http://localhost:3000`

## Available Scripts

```bash
# compile
npm run build

# run
npm run start
npm run start:dev
npm run start:debug
npm run start:prod

# database
npm run migration:show
npm run migration:run
npm run migration:revert
npm run seed:run
npm run deploy:prepare

# lint/format
npm run lint
npm run format

# tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
```

## Docker Notes

- Start DB/cache only: `docker compose up -d postgres redis`
- Stop services: `docker compose down`

For full project setup (client + server), see the root `README.md`.

## GitHub Actions production deploy (Railway)

Workflow: `.github/workflows/deploy-railway-after-ci.yml`

This workflow runs after successful CI pushes to `main`/`master` (or manually via dispatch) and performs:

1. `npm run migration:run` against Railway production variables
2. `npm run seed:run` against Railway production variables
3. `railway up` to deploy the `server/` service

Required GitHub secrets:

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_ENVIRONMENT_ID`
- `RAILWAY_SERVICE_ID`

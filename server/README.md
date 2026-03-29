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

# Word Game Quiz

Word Game Quiz is a mobile-first quiz practice app inspired by Alpha Bucks. Players answer category prompts with words that start with a target letter under time pressure.

This repository contains:

- **Client app**: React Native + Expo (root project)
- **Server API**: NestJS (`server/`)
- **Local infrastructure**: PostgreSQL + Redis via Docker Compose

## Prerequisites

- Node.js 18+
- npm
- Docker Desktop (for local PostgreSQL and Redis)

## Run in Development

### 1) Start local services (PostgreSQL + Redis)

From the repository root:

```bash
docker compose up -d postgres redis
```

### 2) Run the server (NestJS)

In a new terminal:

```bash
cd server
npm install
```

Create `server/.env` from `server/.env.example`, then run:

```bash
npm run start:dev
```

Server runs on `http://localhost:3000` by default.

### 3) Run the client app (Expo)

In another terminal at the repository root:

```bash
npm install
```

Ensure root `.env` contains:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Start the app:

```bash
npm run start
```

Optional platform shortcuts:

```bash
npm run android
npm run ios
npm run web
```

## Helpful Commands

- Stop local services: `docker compose down`
- View service logs: `docker compose logs -f postgres redis`

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

### AI validation provider switching

The server supports three AI validation providers for unknown answers:

- `openai` (default)
- `ollama`
- `gemini` (AI Studio key flow)

Set these in `server/.env`:

```env
AI_VALIDATION_PROVIDER=openai
```

OpenAI:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Ollama:

```env
AI_VALIDATION_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

Gemini (AI Studio):

```env
AI_VALIDATION_PROVIDER=gemini
GEMINI_API_KEY=your_ai_studio_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

You can keep multiple provider variables in `.env`; only the selected `AI_VALIDATION_PROVIDER` is used.

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

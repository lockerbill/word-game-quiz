# admin-web

Standalone React + TypeScript admin frontend for Alpha Bucks.

## Local development

1) Install dependencies:

```bash
npm ci
```

2) Configure environment variables:

```bash
cp .env.example .env
```

3) Start dev server:

```bash
npm run dev
```

Vite runs on `http://localhost:5173` by default.

## Available scripts

- `npm run dev` - start local dev server
- `npm run lint` - run ESLint
- `npm run typecheck` - run TypeScript build mode checks
- `npm run build` - run typecheck + production build
- `npm run preview` - serve built app locally

## API base URL

- `VITE_API_BASE_URL` defaults to `http://localhost:3000/api`
- `VITE_ADMIN_IDLE_TIMEOUT_MS` defaults to `900000` (15 minutes)
- App auth bootstrap calls:
  - `POST /auth/login`
  - `GET /admin/me`

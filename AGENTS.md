# Enterprise Hospital Management System

React + Vite + Tailwind CSS frontend for a hospital management system, backed by a microservice backend (see `hospital-backend/`, symlinked to `keppler-backend/`).

## Development Server

Start the frontend with `npm run dev`; it serves on `$PORT` (default 8443).

The backend is 9 independent Flask services (auth, patients, appointments, er, billing, pharmacy, hr, ai, reporting) sitting behind an nginx API gateway, all defined in `keppler-backend/docker-compose.yml`. The frontend only ever talks to the gateway at `http://localhost:8010` -- same `API_BASE` as before the split, no frontend code depends on which service actually owns a route. Start the whole backend with `docker compose up -d` from `keppler-backend/`; each service also has a standalone entrypoint at `backend/services/<name>/app.py` (e.g. `services/auth/app.py`, `services/billing/app.py`) for running one service outside Docker. See `keppler-backend/backend/shared/` for the cross-service auth/CSRF/DB helpers every service imports, and `keppler-backend/gateway/nginx.conf` for the path-to-service routing table.

- Hot reload: Changes to source files are reflected immediately

## Keppler OCR (dpi-ocr)

`dpi-ocr-frontend/` and `dpi-ocr-backend/` are a copy of the standalone "Keppler AI Medical Document Intelligence Platform" (OCR, PDF summarizer, RAG assistant, document vault) — a separate application (its own React 18 + shadcn/Figma UI kit frontend, its own FastAPI + Postgres + Qdrant + Redis/Celery + vLLM backend), not merged into this app's frontend bundle. It's embedded via iframe as the top-level "Keppler OCR" nav item ([src/components/DpiOcrPortal.tsx](src/components/DpiOcrPortal.tsx), `src/App.tsx`'s NAV array — sibling to "Hosp AI", not nested under it).

**No login screen**: the embedded app has no separate identity for the HMS user to sign in with, so `dpi-ocr-frontend/src/app/lib/auth-context.tsx` signs it in silently against a single shared service account (`hms-embed`, registering it on first use if it doesn't exist yet) instead of showing its own login/2FA/welcome screens or a Sign Out control. This is the one behavioral change made to the copied app; the rest is unmodified.

**Frontend serving**: `dpi-ocr-frontend/` runs as its own Vite dev server on port 3000 (`cd dpi-ocr-frontend && npx vite --port 3000 --host 0.0.0.0`, currently a background/nohup process — not process-managed, restart it if it dies) rather than a Docker-built static bundle, since `npm run build` was blocked in this environment; its own `vite.config.ts` sets `base: '/keppler-ocr/'`. Port 3000 isn't directly reachable from a browser outside this sandbox (only `$PORT`/8443 is forwarded), so it's reverse-proxied through the host dev server instead of loaded cross-port: [vite.config.ts](vite.config.ts) proxies `/keppler-ocr` (with `ws: true` for its HMR) and `/api` (the OCR app proxies `/api` to its own backend itself) to `http://localhost:3000`. `DpiOcrPortal.tsx` points its iframe at `/keppler-ocr/` by default; `VITE_DPI_OCR_URL` overrides it.

**Backend**: merged into `keppler-backend`'s docker compose stack (`hospital-backend/docker-compose.yml`, alongside the 9 hospital microservices), as `ocr-postgres`, `ocr-redis`, `ocr-qdrant`, `ocr-api` (port 7620), and `ocr-worker` — see the "Keppler AI (dpi-ocr)" section near the bottom of that file. `ocr-api`/`ocr-worker` reuse the already-built `dpi-ocr--main-api`/`dpi-ocr--main-worker` images (`build: context: ./dpi-ocr`, a symlink to this repo's `dpi-ocr-backend/`, in case a fresh clone needs to build them) rather than rebuilding, and point `VLLM_BASE_URL` at the already-running `vllm-qwen-7b` container on port 8700. Bring the whole stack up with `cd keppler-backend && docker compose up -d`; on a brand-new `ocr-postgres` volume, run migrations once with `docker exec keppler-backend-ocr-api-1 alembic upgrade head` (the API returns 500s on auth routes until this has run — `relation "users" does not exist`). Check status with `docker ps --filter name=keppler-backend-ocr`.

The standalone deployment this was originally merged from (Docker project `dpi-ocr--main`, built from `/home/kalpra/Videos/dpi-ocr--main (2)/dpi-ocr--main`) is fully retired — its api/worker/frontend containers are removed/stopped; only its postgres/redis/qdrant are left stopped-but-not-removed in case that old test data is ever needed back.

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

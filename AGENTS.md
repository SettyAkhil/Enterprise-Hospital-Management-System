# Enterprise Hospital Management System

React + Vite + Tailwind CSS frontend for a hospital management system, backed by a microservice backend (see `hospital-backend/`, symlinked to `keppler-backend/`).

## Development Server

Start the frontend with `npm run dev`; it serves on `$PORT` (default 8443).

The backend is 9 independent Flask services (auth, patients, appointments, er, billing, pharmacy, hr, ai, reporting) sitting behind an nginx API gateway, all defined in `keppler-backend/docker-compose.yml`. The frontend only ever talks to the gateway at `http://localhost:8010` -- same `API_BASE` as before the split, no frontend code depends on which service actually owns a route. Start the whole backend with `docker compose up -d` from `keppler-backend/`; each service also has a standalone entrypoint at `backend/services/<name>/app.py` (e.g. `services/auth/app.py`, `services/billing/app.py`) for running one service outside Docker. See `keppler-backend/backend/shared/` for the cross-service auth/CSRF/DB helpers every service imports, and `keppler-backend/gateway/nginx.conf` for the path-to-service routing table.

- Hot reload: Changes to source files are reflected immediately

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

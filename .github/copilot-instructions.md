## TechPacker — quick onboard for AI coding agents

This repo is a split frontend/backend monorepo for a Tech Pack management app (React + TypeScript + TailwindUI frontend; Node/Express + TypeScript backend for PDF generation and optional API). Use this document to make focused, low-risk edits and to find the right files for bigger changes.

- Architecture (big picture)
  - Frontend: `src/` — Vite + React + TypeScript. Key areas:
    - UI & forms: `src/components/TechPackForm/` (tabs, forms, auto-save)
    - State: `src/contexts/TechPackContext.tsx`, `src/contexts/AuthContext.tsx` (Context + useReducer)
    - API helpers: `src/lib/api.ts` and optional `src/lib/supabaseClient`
    - Types: `src/types/techpack.ts`
  - Backend: `server/` — Express + TypeScript (PDF generator, REST API).
    - PDF logic & controllers: `server/src/controllers/*`, `server/src/utils/pdf-*`
    - Validation & middleware: `server/src/middleware/*` (rate-limiting, validation)
    - Run scripts and tests: `server/package.json` (dev/build/start/test)

- Data flows & integration points
  - Frontend persistence: default -> `localStorage`. If `VITE_SUPABASE_*` set, Supabase is used. If `VITE_API_BASE_URL` set, the app prefers the server REST API (MongoDB) instead.
  - Env vars:
    - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
    - Backend (server/.env): `MONGO_URI`, `DB_NAME`, `PORT`, puppeteer and rate-limit settings
  - PDF generation: server uses Puppeteer; watch for Puppeteer executable path and system deps on CI/containers.

- Developer workflows & commands
  - Frontend (project root):
    - dev: `npm run dev` (Vite, default port 5173)
    - build: `npm run build`
    - lint: `npm run lint`
  - Backend (server/):
    - dev: `cd server && npm run dev` (nodemon)
    - build: `cd server && npm run build`
    - start (prod): `cd server && npm start`
    - tests: `cd server && npm test` (Jest + mongodb-memory-server)
  - When working locally with API: run backend on `PORT` (4000/4001 documented) and set `VITE_API_BASE_URL=http://localhost:<PORT>` before starting the frontend.

- Project-specific conventions & patterns
  - UI tabs live under `src/components/TechPackForm/tabs/`. To add a tab: create component in that folder, update `TechPackTabs.tsx`, and extend types in `src/types/techpack.ts`.
  - Auto-save: implemented in `useAutoSave.ts` (2s debounce) — prefer to reuse rather than adding parallel timers.
  - Keyboard shortcuts: centralized hook `useKeyboardShortcuts.ts` — alter there for global shortcuts (Ctrl+S, Ctrl+E, tab switching).
  - Validation: frontend schemas in `src/validation/validationSchemas.ts`; backend uses `zod` + express-validator patterns in middleware.

- Safety / build gotchas for agents
  - Puppeteer on the server requires OS deps in CI or Docker (install Chromium or set executable path). See `server/README.md` troubleshooting section.
  - Changing API shape: update both `src/lib/api.ts` and the server controller types to avoid silent runtime mismatches.
  - Avoid direct manipulation of `localStorage` shape; use existing helpers in `src/lib` and context reducers so auto-save, undo, and backup behave correctly.

- Files to inspect first for most PRs
  - Frontend: `src/components/TechPackForm/TechPackTabs.tsx`, `src/contexts/TechPackContext.tsx`, `src/lib/api.ts`, `src/types/techpack.ts`
  - Backend: `server/src/controllers/pdf.controller.ts`, `server/src/middleware/validation.middleware.ts`, `server/src/index.ts` (entry)
  - Devops/docs: `README.md` (root) and `server/README.md` for run/build details

- Minimal examples
  - Add new tab: create `src/components/TechPackForm/tabs/MyNewTab.tsx` -> add import & route in `TechPackTabs.tsx` -> update `src/types/techpack.ts` if new fields used.
  - Enable backend dev: create `server/.env` with `MONGO_URI` and run `cd server && npm run dev`; then set `VITE_API_BASE_URL=http://localhost:4000` before running frontend.

** Answer in VietNamese**

If anything above is unclear or you want more examples (tests, CI, or a sample PR checklist), tell me which section to expand and I will iterate.

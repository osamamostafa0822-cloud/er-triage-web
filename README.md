# ER Triage Board — Angular frontend

Angular client for the ER Triage Board demo (nurse intake form, prioritized board, status workflow, priority override).
**Fictional data only. Not clinically validated.** No authentication (demo limitation).

> **Status: F1 (foundation) only.** The workspace, environments and an empty application shell exist. The registration feature, the board and the override/status screens are not implemented yet (M5 F2–F7, M6).

## Stack
Angular 22.2.3 (standalone components, routing, zoneless, strict TypeScript 6 and strict templates) · SCSS · RxJS · Vitest 5 + jsdom (the Angular CLI default test runner) · no SSR · no UI or state library.
Generated with `@angular/cli@22.2.3` (`ng new --routing --style=scss --ssr=false`).

## Backend contract
This client talks to the ER Triage API. It was planned against backend commit `332227f` (`master`, 2026-10-20). Contract sources: the API's `/openapi/v1.json` (Scalar UI at `/scalar`) and the backend HTTP integration tests. All JSON responses use `GeneralResponse<T>` (`success`, `message`, `data`, `errors`, `traceId`); property names are camelCase and enums are strings. The backend repository is separate; if it changes, update this note.

## Prerequisites
- Node.js `^22.22.3`, `^24.15.0` or `>=26` (verified with 22.23.2) and npm 10.
- For later phases: the API running on `http://localhost:5080` (profile `http`, Development environment; it migrates and seeds the development database on start).

## Commands (PowerShell, from this folder)
```powershell
npm ci                          # exact versions from package-lock.json (first time; use "npm install" only to change dependencies)
npm start                       # ng serve, http://localhost:4200 (development configuration)
npx ng build --configuration development
npx ng build --configuration production
npm test -- --watch=false       # ng test, Vitest + jsdom, runs once
npm audit
```
CORS: the backend allows the origin `http://localhost:4200` in Development.

## Environments
`src/environments/` — `environment.ts` is the default (production) file and `environment.development.ts` replaces it in the `development` build configuration (`ng serve`, tests built for development).

| File | `apiBaseUrl` | Meaning |
|---|---|---|
| `environment.development.ts` | `http://localhost:5080` | API started with the `http` launch profile |
| `environment.ts` (production) | `''` (empty) | same origin: requests go to `/api/...` on the host that serves the app, for example behind a reverse proxy. **No host is hardcoded**; change it at deployment if the API lives elsewhere |

Both files share the `Environment` interface (`environment.model.ts`), so a key cannot exist in one file only. No secret belongs in these files: they are shipped to the browser.

## Structure (target, `docs/02-architecture/frontend-architecture.md`)
`src/app/core` (config, models, HTTP interceptor) · `src/app/shared/ui` · `src/app/features/<feature>/{pages,components,services,models}`. Pages orchestrate, components present, HTTP only in services. Created from F2 onwards.

## Version control
This folder is its own Git repository (default branch `main`), separate from the backend repository. No remote is configured yet.

## Known limitations
English-only UI (the backend supports Arabic messages, the UI does not use them). No idempotency key on registration (a retry after a lost response can register a patient twice).

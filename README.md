# ER Triage Board — Angular frontend

Angular client for the ER Triage Board demo (nurse intake form, prioritized board, status workflow, priority override).
**Fictional data only. Not clinically validated.** No authentication (demo limitation).

> **Status: F1 verified; D-78 shared visual design implemented.** Reusable tokens, layout styles, presentation components and a responsive shell exist. Registration, board data and override/status feature pages are not implemented yet.

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
The shared UI supports English/Arabic and RTL; feature pages are not implemented. Inter font files were not supplied (system-ui fallback). No idempotency key on registration (a retry after a lost response can register a patient twice).

### F1 Windows verification — 2026-10-20
Assistant-run on Windows using a portable Node v22.22.3 and npm 10.9.8 in the user's temporary directory. The system Node installation remains v22.17.0; use the compatible runtime for future Angular commands. Owner authorized using any valid Node version. `npm ci`: 281 packages installed, 282 audited, no engine warnings, 0 vulnerabilities. Development build passed; production build passed (197.69 kB initial raw / 54.32 kB estimated transfer). `npm test -- --watch=false`: 2 files, 4 tests passed, including Arabic/English switching. Standalone `npm audit`: 0 vulnerabilities. Production JavaScript scan: 0 occurrences of `localhost`. Backend `git status --short`: empty, HEAD `332227f`; frontend status clean on `main`, no remote output. No commit, push, merge, API start, migration or seed was run. Sandbox restrictions required network-enabled dependency installation and elevated build output access; the completed checks above used the Windows runtime, not Linux. F1 technical verification passed; owner approval of this report is still pending. D-78 implementation has not started.

## Shared visual design (D-78)
The owner's prototype supplies visual styling only. See [shared UI usage](src/app/shared/ui/README.md) for tokens, component inputs/outputs, board table/mobile card classes, form section classes, accessible field errors and unit suffixes. All shared components are standalone, OnPush, signal-based and contain no API/business logic.

The root now uses the responsive navy/teal shell. Because app.routes.ts is empty, nav entries stay disabled; no feature page or API connection is implied by the shell. Refresh becomes available when a page supplies a handler. The local clock is unrelated to board polling; no polling or SignalR is implemented. JSON English/Arabic and RTL are supported. Inter files were not supplied; system-ui is the documented fallback (public/fonts/README.md). No package was added.

Windows verification with portable Node 22.22.3 / npm 10.9.8: development and production builds passed; 25 tests in 9 files passed; npm audit 0 vulnerabilities; production JavaScript contains no localhost; backend clean. Production initial bundle: 252.27 kB raw / 68.74 kB estimated transfer. Desktop shell checked in English/Arabic; mobile viewport, keyboard and reduced-motion visual checks still need manual review. This section supersedes the earlier F1 pending-approval and English-only status notes. No later phase started.

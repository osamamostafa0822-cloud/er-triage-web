# ER Triage Board — Angular frontend

Angular client for the ER Triage Board demo (nurse intake form, prioritized board, status workflow, priority override).
**Fictional data only. Not clinically validated.** No authentication (demo limitation).

> **Status: F1 verified; D-78 shared design and F2 API foundation implemented.** Typed wire models, API configuration and error handling exist. Feature API services, registration and board pages are not implemented. Current dependency audit has 4 open findings; see below.

## Stack
Current checked install: Angular core 20.3.34, CLI/build 20.3.40 (standalone, zoneless, strict templates), TypeScript 5.9.3, RxJS 7.8.2, Vitest 3.2.7 and jsdom 26.1.0. Plain SCSS; no SSR or state library. CDK is already in the package manifest; F2 adds or uses no extra package.
Originally scaffolded with Angular 22.2.3. The existing toolchain had changed before F2; this phase preserves that configuration.

## Backend contract
This client talks to the ER Triage API. It was planned against backend commit `332227f` (`master`, 2026-10-20). Contract sources: the API's `/openapi/v1.json` (Scalar UI at `/scalar`) and the backend HTTP integration tests. All JSON responses use `GeneralResponse<T>` (`success`, `message`, `data`, `errors`, `traceId`); property names are camelCase and enums are strings. The backend repository is separate; if it changes, update this note.

## Prerequisites
- A Node version compatible with the installed Angular toolchain. F2 was verified on Windows with Node 22.23.2 and npm 11.6.2; packageManager still records npm 10.9.8.
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

## API foundation (F2)
See [core integration notes](src/app/core/README.md). API_BASE_URL comes from the build environment and can be overridden in tests. HttpClient is configured with an API-only interceptor that sends the selected English/Arabic language and normalizes failures to ApiError (status, message, field errors, traceId). Malformed/non-envelope bodies and network failures get safe localized fallbacks. No retry, toast, logging, actual patient request or success unwrapping is added. F3 will add the registration service.

Readonly wire models were checked against backend 332227f DTOs, request records, controllers, JSON configuration and HTTP test sources. The API was not started; live OpenAPI/end-to-end verification is deferred. The raw registration request retains nullable fields; the later validated form will submit non-null values. The shared UI imports the canonical status/priority/waiting types.

F2 verification on Windows (Node 22.23.2, npm 11.6.2): development/production builds passed; 11 test files / 49 tests passed, including 24 new HTTP/config cases; production JavaScript localhost matches 0; backend clean. Production initial bundle: 265.21 kB raw / 71.97 kB estimated transfer. Angular 20's unit-test builder prints its EXPERIMENTAL notice.

Current npm audit: 4 findings (2 moderate, 2 critical) in the existing test/build chain (@vitest/mocker, tinypool, vitest, @angular/build). npm proposes a breaking Vitest 5.0.5 upgrade via audit fix --force; no fix or dependency change was applied. These findings supersede earlier zero-vulnerability snapshots. A compatible toolchain remediation is still open. No backend, API/database run, Git publishing or later phase was performed.

## Global API loading
The app now shows a non-blocking teal progress bar while tracked API requests are active. LoadingService uses a readonly signal counter, so completing or cancelling one concurrent request does not hide the loader for others. The interceptor finalizes on success, error and cancellation, preserves error/language handling, and adds no automatic retry. The shell exposes main aria-busy; the indicator has localized English/Arabic status announcements and a static reduced-motion appearance.

To opt out a background call, pass context: new HttpContext().set(SKIP_GLOBAL_LOADING, true). See core/README.md for imports and usage. No polling, authentication/token flow, feature API service or request on startup is added.

Windows verification: development/production builds passed; 67 tests in 14 files passed; production initial bundle 267.77 kB raw / 72.55 kB estimated transfer. Dependencies were not changed, so the prior F2 audit report remains the latest (4 open findings: 2 moderate, 2 critical); audit was not rerun in this source-only increment. Manual browser/motion review of the active loader remains pending. No backend or Git publishing operation.

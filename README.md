# ER Triage Board — Angular frontend

**Current status (2026-10-20): M5 intake and M6.1 read-only board are implemented.** The board has status/priority filters and server pagination; polling/status/override actions remain future phases. Reduced-motion visual verification remains open. Fictional data only; not clinically validated. No authentication.

## Run locally

Use a compatible Node version: the installed Angular 21 toolchain accepts ^20.19.0, ^22.12.0 or >=24.0.0. Verified on Windows: Node 22.23.2 / npm 11.6.2. packageManager records npm 10.9.8.

From this folder, in PowerShell:

```powershell
npm ci
npm start
```

Open http://localhost:4200 for the lazy triage board; /register remains intake and unknown paths retain the registration fallback. Start the backend separately on http://localhost:5080 using its http launch profile; Development CORS allows http://localhost:4200. For an already migrated database, the root README shows how to disable migration and seed startup. A fresh database needs reviewed migrations first.

## Implemented behavior

- Nine required registration fields, typed Reactive Forms and localized client/server validation. Full name also needs three whitespace-separated words (owner-requested frontend rule; backend length contract unchanged).
- Browser-local arrival defaults/resets to now and converts to UTC on submission. Backend owns clinical priority, status and reason.
- One guarded POST, disabled inputs while sending, global loading, input retention on failure, mapped field errors and selectable TraceId.
- Inline success panel with server-supplied priority/status/reason. No automatic retry: a lost response may mean the patient was already saved.
- English/Arabic, RTL and globe language toggle; only en/ar preference is stored in localStorage, never patient data. Blocked storage falls back to the current in-memory language.
- Responsive shell, current-route skip-to-content, demo footer and fixed phone navigation with both board and registration links.
- Read-only board using GET /api/triage-board, current priority/reason/status/waiting supplied by the server, local arrival formatting and shared desktop table/mobile cards. Status defaults to the active queue; all statuses are sent explicitly. Priority all/P1–P4 and page sizes 10/25/50/100 use server filtering/paging, with page 1 reset on filter/size change.
- Superseded GETs cancel; loading/empty/error/explicit retry and out-of-range-page recovery are supported. Language changes re-read the current selection without resetting it. Waiting is a snapshot, not locally advanced.

No board polling, status actions, override dialog, authentication, toast service or frontend priority calculation is implemented.

## Current stack and structure

Angular core 21.2.25 / CLI-build 21.2.27 / CDK 21.2.14, TypeScript 5.9.3, RxJS 7.8.2, Vitest/mocker 4.1.12, jsdom 26.1.0. Standalone, zoneless, strict templates, plain SCSS; no SSR or state library. The owner-approved security upgrade replaced Angular 20/Vitest 3. Angular 22 was the original scaffold; it does not describe the current install. tinypool is no longer in the dependency graph; Vite 7.3.6 satisfies Angular/Vitest without overrides.

- src/app/core: environment API base URL, wire models, language/error/loading interceptors.
- src/app/shared/ui: shell, priority/status/waiting presentation, loading/empty/error components, shared styles.
- src/app/features/patient-registration: page, forms/validators/request mapping and dedicated API service.
- src/app/features/triage-board: read-only page, dedicated API service, tests and test-only fixtures; existing board/query/paging DTOs reused.
- src/app/i18n: typed English/Arabic JSON resources and language service.
- src/app/app.routes.ts and app.config.ts: lazy registration, redirects, anchor scrolling and providers.

Pages orchestrate; shared UI presents; only feature services make API calls. See src/app/features/patient-registration/README.md and the project docs for details.

## API contract and environments

Built against backend commit 332227f. Source contracts are backend DTOs/validators, HTTP integration tests and /openapi/v1.json (Scalar at /scalar). Responses use GeneralResponse<T>, camelCase fields and string enums. Unsupported Content-Type can return framework 415 ProblemDetails; the interceptor handles non-envelope failures.

| Build | apiBaseUrl | Deployment requirement |
|---|---|---|
| Development | http://localhost:5080 | API http profile; frontend origin localhost:4200 |
| Production | empty string | Same-origin /api reverse proxy; SPA fallback to index.html for /register |

The development build replaces environment.ts with environment.development.ts; both implement Environment. No secrets belong in browser configuration. Production hosting is not configured.

## Verification

```powershell
npm test -- --watch=false
npm run build -- --configuration development
npm run build -- --configuration production
npm audit
npm audit --omit=dev
```

Latest executed M6.1 checks: **284 tests passed, 0 failed, 0 skipped in 22 files**, app/spec types, both builds, changed/new source formatting and git diff --check passed. No lint target is configured. Production initial bundle is 303.20 kB raw / 82.55 kB transfer, board lazy 19.92 kB / 5.38 kB; no budget warnings or production localhost references. API service/page tests use actual interceptors with mocked HTTP, including cancellation and no-polling assertions. Live GET-only review covered filters, pages/size reset/last page and EN/AR desktop/tablet/375 px. No patient POST or backend/schema/package change in M6.1. Full file list/contracts/results: ../../docs/05-delivery/m6-1.md.

The preceding security upgrade's full/production-only audits reported **zero vulnerabilities**, both exit 0. F7's four findings were resolved. M6.1 does not change package.json, package-lock.json or angular.json (hash-verified), so audits were not rerun in this source-only phase. Report/raw evidence: ../../docs/05-delivery/security-upgrade.md; earlier F7 reports retain pre-fix findings.

Reduced-motion CSS was inspected, but this browser exposes viewport resizing and no motion emulation. Actual reduced-motion appearance remains a manual check. Inter font files were not supplied; system-ui fallback remains without external font requests.

## Version control and next work

This folder is its own Git repository on main; no remote is configured. backend/ is a separate repository; root docs/SPEC/PROMPTS remain outside both repositories (D-51/D-76). No commit/push was created in F7. Historical verification and decisions are retained in the project progress/AI-decision logs; previous documentation is backed up under _backup/f7-documentation-20261020.

Next: actual reduced-motion visual check and separately approved M6.2 work. Polling/status/override actions are not implemented. CI/final clean-clone delivery remain later work. Preview is available at localhost:4200.

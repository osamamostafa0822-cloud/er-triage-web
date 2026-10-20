# Frontend API foundation (F2)

No request is issued by this module on startup. F3 will add the registration API service and response unwrapping; forms, routing, polling and real API verification belong to later phases.

## Contract sources

Read-only verification against backend commit `332227f`:

- `ERTriage.Application/Common/{GeneralResponse,ApiError,PagedResult}.cs`
- `ERTriage.Application/Patients/{Dtos,Requests}/`
- `ERTriage.Application/Triage/{Dtos/TriageBoardItemDto,WaitingLevel}.cs`
- `ERTriage.Domain/Patients/PatientStatus.cs`
- `ERTriage.Api/Controllers/{Patients,TriageBoard}Controller.cs`, JSON configuration and HTTP endpoint test sources.

The API was not started and OpenAPI was not fetched during F2.

Wire DTOs use camelCase, readonly arrays/properties, string status/level unions, numeric priorities and ISO date strings. Null remains null, including waiting minutes and optional timestamps. `PagedResult.totalPages` is returned by the server, not recalculated. `RegisterPatientRequest` is the raw nullable backend request shape with flat vital signs, while `PatientDto.vitals` is nested. A future validated form can submit non-null values without changing the raw wire contract. Board query keys match the controller's singular `status` / `priority` parameters; future serialization must repeat each key.

## HTTP configuration

`API_BASE_URL` defaults to the build environment's `apiBaseUrl`; tests can override the token. Empty means same-origin. Dedicated feature services will compose `{baseUrl}/api/...` paths. Development is configured for port 5080; production contains no host.

`app.config.ts` registers `provideHttpClient(withInterceptors([loadingInterceptor, apiErrorInterceptor]))`. Both interceptors share the `isApiRequest` boundary and apply only to `{API_BASE_URL}/api/...`, leaving asset and third-party requests untouched.

- Sends the selected UI language (`en` / `ar`) on each API request. Language and fallback text are captured when the request starts.
- On HTTP failure, validates the complete failure envelope at runtime before accepting its message, field errors and traceId.
- Emits `ApiError extends Error` with `status`, `message`, `errors` and `traceId`. Wire error entries are named `ApiFieldError` to distinguish them from this normalized error.
- Status 0 uses the localized network fallback; ProblemDetails, proxy HTML, null and malformed bodies use a localized HTTP-status fallback.
- Passes success bodies and non-HTTP errors through. Success envelope validation/unwrapping belongs to F3.
- Does not retry, log raw bodies/payloads, show a toast, persist patient data or evaluate business rules.

## Verification

`HttpTestingController` intercepts every HTTP call in the F2 tests; no real network/API call is made. Specs cover application provider wiring, environment/token overrides, 201 pass-through, HTTP 400/404/409/500, status 0, malformed envelopes, language changes, same-origin requests, unrelated origins, no retries and downstream non-HTTP errors.

## Global loading

`LoadingService.pendingRequests` is a readonly signal; `isLoading` stays true until the final tracked request finishes. `loadingInterceptor` starts tracking at subscription, and `finalize` releases the request after success, error or unsubscribe. Deferred downstream invocation also protects the counter if a handler throws synchronously. Each subscription has its own idempotent release; no timers, manual nested subscriptions or automatic retries are added.

The root binds the signal to the presentational `LoadingIndicator` and the shell's `busy` input. The main region gets `aria-busy`; a persistent polite status region announces Loading in English/Arabic. The teal top progress bar does not block interaction and becomes static for reduced-motion preferences. It is absent when idle, including initial startup.

For background requests, pass a typed HTTP context; it affects loading only, not language/error handling:

```typescript
import { HttpContext } from '@angular/common/http';
import { SKIP_GLOBAL_LOADING } from './core/http/loading-context';

// In a future feature service; HttpClient remains cold until subscribed.
http.get(url, {
  context: new HttpContext().set(SKIP_GLOBAL_LOADING, true),
});
```

Set the flag on future polling calls; no polling is implemented here. Existing contexts can use `context.set(SKIP_GLOBAL_LOADING, true)` without replacing their other entries. This is context metadata, not an HTTP header or custom untyped options property.

The loader counts API requests only. Per-form submitting state and duplicate-submit protection remain the responsibility of future feature pages. Authentication headers and refresh-token flows remain deferred until the backend has an approved authentication contract.

# Triage Board — M6.1

The lazy standalone OnPush TriageBoard page is served at /. /register stays available; unknown routes retain the registration fallback. M6.2 adds `actions/` (row buttons and one dialog for status changes and overrides), `services/patient-workflow-api.service.ts` and live SignalR notices (`core/realtime`). Buttons come from the server's `allowedTransitions`; the page never holds the transition matrix. Other users' changes show a notice and trigger a silent refetch; there is no polling timer.

TriageBoardApiService uses the existing BaseApiService and root interceptors for GET /api/triage-board, returning PagedResult<TriageBoardItemDto> from GeneralResponse. It sends repeated status/priority parameters, checks usable wire shapes and preserves the API order and metadata. Clinical priority, waiting level, filters, sorting and paging remain server-owned.

UI status choices are active (omit status, so backend defaults to Waiting + InTreatment), all (explicit four statuses), or one status. Priority is all or P1–P4. Page sizes are 10/25/50/100. Filter/size changes atomically reset page 1; switchMap cancels old requests. toSignal/toObservable provide page lifetime cleanup. A language change reissues the current selection with the selected language; it does not reset paging.

The page reuses shared table/cards, PriorityBadge, StatusBadge, WaitingIndicator, SkeletonRows, EmptyState and ErrorBanner. Current priority/reason and any existing override information are displayed unchanged/read-only. Arrival is formatted in the browser's local zone. Waiting stays at the value returned by the latest request; it is not advanced by a local clock. Filters remain available during requests; old rows are hidden until the new selection completes.

Error details/TraceId are safe normalized values. Retry is explicit and keeps the query. Empty out-of-range pages provide a return-to-first action. Results and patient fields are not put in application URLs or browser storage; only the existing language preference persists.

Tests use HttpTestingController plus actual providers. Final M6.1 suite: 284 passed, 0 failed/skipped across 22 files; app/spec type checks, both builds and formatting passed. No lint target is configured. Live desktop/tablet/phone EN/AR checks used GET only. Full file list/contracts/evidence/remaining scope are in the project docs/05-delivery/m6-1.md report. No package/backend/schema changes or commit.

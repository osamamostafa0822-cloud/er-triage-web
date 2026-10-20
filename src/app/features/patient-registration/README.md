# Patient registration API service (F3)

**Current status (F7):** service, typed form and page are implemented. Root/unknown routes redirect to lazy /register. Latest executed F6 suite: 235 tests and both builds passed; live P1/P2 registration and board persistence verified. F7 reviewed 375 px EN/AR; actual reduced-motion visual check remains open. The dated F3/F5 counts below are historical. Full name additionally needs three words in the frontend; backend contract unchanged. See the project F7 report for current audit findings and verification scope.

`PatientRegistrationApiService.register(request: RegisterPatientRequest): Observable<PatientDto>`

Import from `services/patient-registration-api.service`. The service uses the root HttpClient configuration (global loading, selected language and normalized errors) and the injected API_BASE_URL. It sends POST `{baseUrl}/api/patients`; empty origin is supported and trailing slashes are removed.

The input is the existing raw backend request contract with flat vital signs and `spO2`. The service passes it unchanged. Trimming, form validation and conversion of local datetime input to an ISO UTC string are implemented by the F4 helpers in [forms/README.md](forms/README.md). The returned patient has nested vitals, server-calculated priority/reason and allowedTransitions; those values are never recomputed in the service.

The backend responds with 201 GeneralResponse<PatientDto>. The service observes the HTTP response to retain the actual status if the success envelope is unusable. It requires success === true and a non-null, non-array object in data, then emits that object. This is a defensive envelope/payload check, not a complete runtime PatientDto schema validator.

Malformed successful responses produce a localized ApiError with the actual HTTP status and no copied raw-body data. The message warns that registration may already have succeeded and that the board should be checked before registering again. Fallback text is captured on subscription, matching the interceptor language snapshot.

Each subscription issues a separate non-idempotent POST. There is no automatic retry, cache, shareReplay or internal subscription. Future form submission must subscribe once and prevent duplicate submissions. Unsubscribing cancels the HTTP subscription and releases loading; it does not guarantee rollback of a registration already saved by the server.

HTTP/network errors pass through the existing error interceptor. The service adds no toast, navigation or auth/token flow. Field-error-to-control mapping is a separate F4 form helper; the future page will invoke it. No request is issued merely by injecting the service or creating its returned Observable.

The 19 service specs use HttpTestingController and the real appConfig interceptor chain. They cover lazy execution, method/URL/body/201 unwrapping, same-origin and trailing-slash configuration, HTTP/network errors with no retry, malformed success envelopes/payloads, subscription/in-flight language snapshots and cancellation/loading cleanup. Live API/OpenAPI and database verification have not been run in F3.

## Registration page (F5)
PatientRegistration is now the page consumer at /register (lazy route). It uses createRegistrationForm/buildRegistrationRequest, calls register once per guarded valid submit and owns the single takeUntilDestroyed subscription. It invokes applyRegistrationServerErrors for failures; client messages are translated, known errors are linked to controls and unmatched errors/TraceId remain visible. A native disabled fieldset preserves the form model while a request is pending. Error focus runs after render; invalid-submit focus follows visible field order.

Success displays the returned currentPriority/status/reason without recomputation, resets fields/arrival and offers Register another. Clear also resets errors and arrival. Network/5xx or unusable success responses warn about possible prior registration; no automatic retry or toast/navigation is added. No manual-priority override is accepted by the registration contract.

The original seventeen F5 page/routing specs covered DOM numeric conversion, exact wire payload, duplicate guard/global loading, returned result, focus/reset, field/banner errors, explicit correction/resubmission, failures, language, cancellation and lazy-route access. F6 expanded routing coverage; the latest full suite is 235 passed. Root redirect/live integration and F7 375 px review are complete. Cancellation never implies server rollback.

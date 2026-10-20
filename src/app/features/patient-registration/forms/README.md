# Registration form model (F4)

No page, HTTP call, subscription, store or routing is created here. The backend is authoritative; these are input checks, not clinical priority rules.

## Integration

- `createRegistrationForm(now?: () => Date): RegistrationForm` creates non-nullable text controls, nullable numeric controls, nested `vitals` and a local `arrivalTime` string. The clock defaults to the current browser time; tests supply a fake clock.
- `buildRegistrationRequest(form): ValidatedRegistrationRequest | null` refreshes the clock-dependent client check, gates invalid/pending/disabled forms or disabled required fields, and returns the existing wire request with non-null values. It does not touch fields, submit, subscribe, or change raw form values.
- Text is trimmed; vitals are flattened; local arrival becomes an ISO UTC string. A precision-valid temperature is normalized to one decimal only to remove floating-point noise. Invalid values such as 37.15 are rejected, never rounded into validity.
- To reset after a future successful submission, provide a fresh arrival explicitly: `form.reset({ arrivalTime: formatLocalArrival(new Date()) })`. Plain reset would restore the initial non-nullable arrival value.

## Validation

`registration-limits.ts` names the source constants at backend 332227f: PatientRules, VitalSignsLimits and the one-decimal rule in VitalSigns/Create and RegisterPatientRequestValidator.

Text length uses trimmed values. Numbers must be finite; age, HR, both pressures and SpO2 must be integers. The pressure-order validator runs only when each pressure individually passes its type/range checks. It returns `vitals.errors.bloodPressureOrder` without changing child errors; F5 should show that group error under diastolic BP and include it in that input's accessible invalid/error state.

Arrival accepts local YYYY-MM-DDTHH:mm, optionally seconds and 1–3 fractional digits. Calendar rollovers, offset/Z values and nonexistent local wall times are rejected instead of normalized. The clock is read again on validation/submission; exactly +5 minutes is allowed, later values are rejected. UTC conversion uses the browser's local zone; normal JavaScript Date behavior determines ambiguous repeated local times. The server clock still decides final validity.

Error keys for F5 translation/rendering: required, minlength, maxlength, number, integer, min, max, decimalPlaces, dateTime, arrivalFuture, bloodPressureOrder, server. This phase adds no visible validation messages.

## Server errors

`applyRegistrationServerErrors(form, errors)` replaces the previous server-error batch, maps the exact flat API field names to known controls, merges message arrays under `errors.server`, marks those fields touched and returns null-field/unknown-field errors for a banner. Map lookup does not traverse arbitrary control paths or inherited object properties.

`clearRegistrationServerErrors(form)` removes only the server key, preserving existing client errors. Normal updateOn:change validation replaces a field's manual server errors when it is edited, recomputing client errors and leaving other fields' messages intact. No valueChanges subscriptions or destroy cleanup are needed. Do not force revalidation of unchanged server-errored controls: manual Angular errors are replaced on validation. The request builder specifically preserves an arrival server error while refreshing the clock check. Apply server errors after any disabled controls have been enabled.

The future page owns ApiError.message/traceId, banner rendering, first-invalid-field focus, duplicate-submit protection, language-specific validation labels and calling the F3 service exactly once per accepted submission.

## Tests

119 new cases cover independent literal backend boundaries, finite/integer/precision input, pressure ordering, calendar/UTC conversion, exact arrival tolerance, changing clocks, typed request flattening, disabled/pending rejection, non-mutating mapping, known/unknown/duplicate server errors and clearing behavior. They exercise plain FormControl/FormGroup without creating the registration page or making a request.

### Owner-requested UI name rule — 2026-10-20
The frontend now requires Full name to contain at least three whitespace-separated words, in addition to the existing trimmed 2–100 character check. Arabic names and repeated whitespace are supported. Fewer words yield a localized minWords error and block form submission. This is a UI-only owner requirement; backend PatientRules/RegisterPatientRequestValidator and the API contract remain unchanged. All 232 frontend tests and the Windows production build passed.

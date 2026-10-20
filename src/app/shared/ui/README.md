# Shared visual design (D-78)

The prototype supplies the visual language, not its components or behavior. These are small Angular components and SCSS primitives for the real feature pages. No sample patients, counts, filters, dashboard, management screen, role switcher, data fetching or polling is included.

## Tokens and primitives

Global tokens are in `src/styles.scss`; `_layouts.scss` is loaded once from that entry point. Use CSS variables in feature styles instead of repeating colors and dimensions. The font is system-ui until local Inter WOFF2 files are supplied (see `public/fonts/README.md`).

- Cards: `surface`, `surface-heading`.
- Buttons: `button`, optionally `button-primary` or `icon-button`. Icon-only buttons need an accessible label.
- Numbers: `numeric` (tabular numerals).
- Board: `board-table-wrap > table.board-table` on desktop; `board-cards > article.surface.board-card` on mobile. M6.1 uses both with the same API values. Mark rows/cards with `[attr.data-priority]="patient.currentPriority"`; P1/P2 get a 4px bar. M6.1 renders name, age, chief complaint, priority, arrived, waiting and status; action controls remain a later phase. Use `manual-override` for the read-only hint when the API says `isOverridden`; never infer it from colors.
- Registration: `registration-form` containing `form-section` cards for Patient information and Vital signs. Manual priority override is a separate future M6 flow, not part of registration. Use `form-grid`, `field`, `field-wide`, `field-with-unit`, `field-unit` and `form-actions`. Use `field-error` on inline error text, link it using `aria-describedby`, and set `aria-invalid` on invalid inputs. The implemented registration page owns form state/validation.

## Presentational components

Import each standalone component directly from this directory.

| Component          | Signal inputs                                                                           | Outputs         |
| ------------------ | --------------------------------------------------------------------------------------- | --------------- |
| `PriorityBadge`    | `priority: 1 \| 2 \| 3 \| 4` (API currentPriority)                                      | —               |
| `StatusBadge`      | `status: Waiting \| InTreatment \| Discharged \| Admitted`                              | —               |
| `WaitingIndicator` | `waitingMinutes: number \| null`, `waitingLevel: None \| Normal \| Warning \| Critical` | —               |
| `EmptyState`       | `title: string`, `description: string` (optional); projected action content             | —               |
| `ErrorBanner`      | `message: string`, `retryable: boolean` (default true)                                  | `retry: void`   |
| `SkeletonRows`     | `count: number` (default 5; bounded to 0–20)                                            | —               |
| `AppShell`         | `title`, `boardHref`, `registerHref`, `busy`                          | — |
| `LoadingIndicator` | `active: boolean` (default false) | — |

WaitingIndicator formats the API duration only: 12 min / 1 h 05 m. The level comes from the API, with a text label in addition to color. None + a duration displays frozen waiting time as “Waited”; null displays an accessible not-applicable dash. No threshold calculation or priority evaluation lives here.

## Integration boundary

The lazy root board and `/register` page enable both shell links. Unknown routes retain the registration fallback. The shell owns the translated demo footer. Skip-to-content uses the current route/fragment and anchor scrolling without resetting unsaved form data. The globe toggles persisted EN/AR; the topbar refresh control was removed at the owner's request. The clock updates locally every second, is cleaned up on destroy and makes no requests. M6.1 adds no polling. Its desktop/tablet/mobile EN/AR review passed; actual reduced-motion visual emulation remains open.

All components are OnPush and use signal inputs/outputs. Existing JSON translations provide Arabic/English text; logical CSS properties support RTL. Use a real table with scoped headers and a labeled card list in the future board page. Shared styles do not add a DTO, request or form.

The root now supplies global HTTP loading state to LoadingIndicator and AppShell.busy. LoadingIndicator is a non-blocking teal progress bar with a polite localized status message and static reduced-motion appearance. Shared components do not inject the HTTP loading service; the root owns this connection.

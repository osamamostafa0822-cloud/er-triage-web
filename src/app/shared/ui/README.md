# Shared visual design (D-78)

The prototype supplies the visual language, not its components or behavior. These are small Angular components and SCSS primitives for the real feature pages. No sample patients, counts, filters, dashboard, management screen, role switcher, data fetching or polling is included.

## Tokens and primitives

Global tokens are in `src/styles.scss`; `_layouts.scss` is loaded once from that entry point. Use CSS variables in feature styles instead of repeating colors and dimensions. The font is system-ui until local Inter WOFF2 files are supplied (see `public/fonts/README.md`).

- Cards: `surface`, `surface-heading`.
- Buttons: `button`, optionally `button-primary` or `icon-button`. Icon-only buttons need an accessible label.
- Numbers: `numeric` (tabular numerals).
- Board: `board-table-wrap > table.board-table` on desktop; `board-cards > article.surface.board-card` on mobile. Both use the same API values supplied by the future page. Mark rows/cards with `[attr.data-priority]="patient.currentPriority"`; P1/P2 get a 4px bar. Render only name, age, chief complaint, priority, arrived, waiting, status and actions. Use `manual-override` for the text hint when the API says `isOverridden`; never infer it from colors.
- Registration: `registration-form` containing `form-section` cards with real headings: Patient information, Vital signs, Manual priority override. Use `form-grid`, `field`, `field-wide`, `field-with-unit`, `field-unit` and `form-actions`. Use `field-error` on inline error text, link it using `aria-describedby`, and set `aria-invalid` on invalid inputs. Form state and validation belong to the future page.

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
| `AppShell`         | `title`, `boardHref`, `registerHref`, `refreshEnabled`                                  | `refresh: void` |

WaitingIndicator formats the API duration only: 12 min / 1 h 05 m. The level comes from the API, with a text label in addition to color. None + a duration displays frozen waiting time as “Waited”; null displays an accessible not-applicable dash. No threshold calculation or priority evaluation lives here.

## Integration boundary

The app currently has no configured routes. Navigation items remain disabled until the corresponding real route exists; no route or placeholder screen is added. Refresh is disabled until a page supplies a handler. The shell clock updates locally every second, is cleaned up on destroy and makes no requests.

All components are OnPush and use signal inputs/outputs. Existing JSON translations provide Arabic/English text; logical CSS properties support RTL. Use a real table with scoped headers and a labeled card list in the future board page. Shared styles do not add a DTO, request or form.

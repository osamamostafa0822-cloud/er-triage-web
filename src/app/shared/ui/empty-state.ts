import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="empty-state">
    <span class="empty-icon" aria-hidden="true"
      ><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="5" y="4" width="14" height="17" rx="3" />
        <path d="M9 3h6v4H9zM8 12h8M8 16h5" /></svg
    ></span>
    <h2>{{ title() }}</h2>
    @if (description()) {
      <p>{{ description() }}</p>
    }
    <ng-content />
  </div>`,
  styles: [
    `
      .empty-state {
        display: grid;
        justify-items: center;
        padding: 48px 24px;
        text-align: center;
      }
      .empty-icon {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: var(--color-bg);
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      h2 {
        font-size: 16px;
        margin: 0 0 8px;
      }
      p {
        color: var(--color-muted);
        max-width: 380px;
        margin: 0 0 16px;
      }
    `,
  ],
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input('');
}

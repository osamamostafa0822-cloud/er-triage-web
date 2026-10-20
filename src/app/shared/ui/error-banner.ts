import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-error-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="error-banner" role="alert">
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
    >
      <path d="M10.3 4.3 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4m0 3v1" />
    </svg>
    <p>{{ message() }}</p>
    @if (retryable()) {
      <button type="button" class="button" (click)="retry.emit()">
        {{ i18n.messages().retry }}
      </button>
    }
  </div>`,
  styles: [
    `
      .error-banner {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--priority-1-border);
        border-radius: var(--radius-card);
        background: var(--priority-1-bg);
        color: var(--priority-1-fg);
      }
      p {
        flex: 1;
        min-width: 160px;
        margin: 0;
        overflow-wrap: anywhere;
      }
      button {
        color: var(--priority-1-fg);
        border-color: var(--priority-1-border);
      }
    `,
  ],
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
  protected readonly i18n = inject(TranslationService);
}

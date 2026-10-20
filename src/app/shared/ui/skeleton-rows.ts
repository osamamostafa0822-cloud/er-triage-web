import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-skeleton-rows',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="skeleton" role="status" aria-busy="true">
    <span class="visually-hidden">{{ i18n.messages().loading }}</span>
    <div aria-hidden="true">
      @for (row of rows(); track $index) {
        <div class="skeleton-row"><span></span><span></span><span></span><span></span></div>
      }
    </div>
  </div>`,
  styles: [
    `
      .skeleton {
        overflow: hidden;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-card);
        background: var(--color-surface);
      }
      .skeleton-row {
        display: grid;
        grid-template-columns: 2fr 3fr 1fr 1fr;
        gap: 24px;
        padding: 24px 20px;
      }
      .skeleton-row + .skeleton-row {
        border-top: 1px solid var(--color-border);
      }
      .skeleton-row span {
        display: block;
        height: 14px;
        border-radius: 8px;
        background: var(--color-border);
        animation: pulse 1.4s ease-in-out infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.45;
        }
      }
      @media (max-width: 767px) {
        .skeleton-row {
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton-row span {
          animation: none;
        }
      }
    `,
  ],
})
export class SkeletonRows {
  readonly count = input(5);
  protected readonly i18n = inject(TranslationService);
  readonly rows = computed(() =>
    Array.from({ length: Math.min(20, Math.max(0, Math.floor(this.count()))) }),
  );
}

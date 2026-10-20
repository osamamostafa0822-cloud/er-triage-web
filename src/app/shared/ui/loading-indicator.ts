import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-loading-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{
      active() ? i18n.messages().loading : ''
    }}</span>
    @if (active()) {
      <div class="loading-track" aria-hidden="true"><span></span></div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .loading-track {
        position: fixed;
        z-index: 60;
        inset-inline: 0;
        top: 0;
        height: 3px;
        overflow: hidden;
        background: var(--status-treatment-bg);
        pointer-events: none;
      }
      .loading-track span {
        display: block;
        width: 35%;
        height: 100%;
        background: var(--color-teal);
        animation: slide 1.3s ease-in-out infinite;
      }
      @keyframes slide {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(385%);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .loading-track span {
          width: 100%;
          animation: none;
          transform: none;
        }
      }
    `,
  ],
})
export class LoadingIndicator {
  readonly active = input(false);
  protected readonly i18n = inject(TranslationService);
}

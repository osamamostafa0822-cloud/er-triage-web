import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';

export type WaitingLevel = 'None' | 'Normal' | 'Warning' | 'Critical';

@Component({
  selector: 'app-waiting-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'wait numeric level-' + waitingLevel()">
    @if (waitingMinutes() === null) {
      <span aria-hidden="true">—</span
      ><span class="visually-hidden">{{ i18n.messages().notApplicable }}</span>
    } @else {
      <span>{{ duration() }}</span
      ><span class="level-label">{{ levelLabel() }}</span>
    }
  </span>`,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .wait {
        display: inline-flex;
        flex-direction: column;
        white-space: nowrap;
        font-weight: 600;
      }
      .level-label {
        font-size: 11px;
        font-weight: 500;
      }
      .level-Normal,
      .level-None {
        color: var(--color-muted);
      }
      .level-Warning {
        color: var(--priority-3-fg);
      }
      .level-Critical {
        color: var(--priority-1-fg);
      }
    `,
  ],
})
export class WaitingIndicator {
  readonly waitingMinutes = input.required<number | null>();
  readonly waitingLevel = input.required<WaitingLevel>();
  protected readonly i18n = inject(TranslationService);
  readonly duration = computed(() => {
    const minutes = this.waitingMinutes();
    if (minutes === null) return '';
    const text = this.i18n.messages();
    return minutes < 60
      ? `${minutes} ${text.minuteUnit}`
      : `${Math.floor(minutes / 60)} ${text.hourUnit} ${String(minutes % 60).padStart(2, '0')} ${text.shortMinuteUnit}`;
  });
  readonly levelLabel = computed(() => {
    const text = this.i18n.messages();
    return {
      None: text.waited,
      Normal: text.waiting,
      Warning: text.waitWarning,
      Critical: text.waitCritical,
    }[this.waitingLevel()];
  });
}

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { PatientStatus } from '../../../core/models/patient';
import type { TriageBoardItemDto } from '../../../core/models/triage-board';
import { TranslationService } from '../../../i18n/translation.service';

/**
 * The action buttons of one board row or card. Which status buttons exist is decided by the server's
 * `allowedTransitions` (the transition matrix lives only in the Domain). Terminal patients have none, and the Domain
 * also rejects an override for them, so no override button is offered either.
 */
@Component({
  selector: 'app-patient-row-actions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="action-group">
    @for (target of patient().allowedTransitions; track target) {
      <button
        type="button"
        class="button"
        [class.button-primary]="target === 'InTreatment'"
        [attr.aria-label]="label(target) + ': ' + patient().fullName"
        (click)="statusAction.emit(target)"
      >
        {{ label(target) }}
      </button>
    }
    @if (canOverride()) {
      <button
        type="button"
        class="button"
        [attr.aria-label]="i18n.messages().actionOverridePriority + ': ' + patient().fullName"
        (click)="overrideAction.emit()"
      >
        {{ i18n.messages().actionOverridePriority }}
      </button>
    }
  </div>`,
  styles: [
    `
      .action-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .button {
        min-height: 36px;
        padding-inline: 12px;
        font-size: 13px;
        white-space: nowrap;
      }
    `,
  ],
})
export class PatientRowActions {
  readonly patient = input.required<TriageBoardItemDto>();
  readonly statusAction = output<PatientStatus>();
  readonly overrideAction = output<void>();
  protected readonly i18n = inject(TranslationService);
  protected readonly canOverride = computed(() => this.patient().allowedTransitions.length > 0);

  protected label(target: PatientStatus): string {
    const text = this.i18n.messages();
    return {
      Waiting: text.waiting,
      InTreatment: text.actionStartTreatment,
      Discharged: text.actionDischarge,
      Admitted: text.actionAdmit,
    }[target];
  }
}

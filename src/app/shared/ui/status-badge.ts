import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';
import type { PatientStatus } from '../../core/models/patient';

export type { PatientStatus } from '../../core/models/patient';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge ' + appearance().className">{{ appearance().label }}</span>`,
  styleUrl: './badge.scss',
})
export class StatusBadge {
  readonly status = input.required<PatientStatus>();
  private readonly i18n = inject(TranslationService);
  readonly appearance = computed(() => {
    const text = this.i18n.messages();
    return {
      Waiting: { className: 'waiting', label: text.waiting },
      InTreatment: { className: 'in-treatment', label: text.inTreatment },
      Discharged: { className: 'discharged', label: text.discharged },
      Admitted: { className: 'admitted', label: text.admitted },
    }[this.status()];
  });
}

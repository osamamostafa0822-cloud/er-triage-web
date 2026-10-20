import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';
import type { TriagePriority } from '../../core/models/patient';

export type Priority = TriagePriority;

@Component({
  selector: 'app-priority-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge priority-' + priority()"
    ><span class="dot" aria-hidden="true"></span><bdi>P{{ priority() }} — {{ label() }}</bdi></span
  >`,
  styleUrl: './badge.scss',
})
export class PriorityBadge {
  readonly priority = input.required<Priority>();
  private readonly i18n = inject(TranslationService);
  readonly label = computed(() => {
    const text = this.i18n.messages();
    return { 1: text.critical, 2: text.high, 3: text.moderate, 4: text.low }[this.priority()];
  });
}

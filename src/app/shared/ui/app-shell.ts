import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map, startWith } from 'rxjs';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  readonly title = input.required<string>();
  // Only actual configured routes are supplied by the host. Null renders a disabled item.
  readonly boardHref = input<string | null>(null);
  readonly registerHref = input<string | null>(null);
  readonly refreshEnabled = input(false);
  readonly refresh = output<void>();
  protected readonly i18n = inject(TranslationService);
  protected readonly collapsed = signal(false);
  protected readonly now = toSignal(
    interval(1000).pipe(
      startWith(0),
      map(() => new Date()),
    ),
    { requireSync: true },
  );
  protected readonly clock = computed(() =>
    new Intl.DateTimeFormat(this.i18n.language(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(this.now()),
  );
  protected readonly date = computed(() =>
    new Intl.DateTimeFormat(this.i18n.language(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(this.now()),
  );
  protected readonly navigation = computed(() => [
    {
      label: this.i18n.messages().triageBoard,
      href: this.boardHref(),
      icon: 'M5 6h14M5 12h14M5 18h14M2 6h.01M2 12h.01M2 18h.01',
    },
    {
      label: this.i18n.messages().registerPatient,
      href: this.registerHref(),
      icon: 'M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 11h6M19 8v6M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    },
  ]);
}

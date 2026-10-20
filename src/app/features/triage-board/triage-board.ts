import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import type { PagedResult } from '../../core/models/paged-result';
import type { PatientStatus, TriagePriority } from '../../core/models/patient';
import type { TriageBoardItemDto, TriageBoardQuery } from '../../core/models/triage-board';
import { TranslationService } from '../../i18n/translation.service';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorBanner } from '../../shared/ui/error-banner';
import { PriorityBadge } from '../../shared/ui/priority-badge';
import { SkeletonRows } from '../../shared/ui/skeleton-rows';
import { StatusBadge } from '../../shared/ui/status-badge';
import { WaitingIndicator } from '../../shared/ui/waiting-indicator';
import { TriageBoardApiService } from './services/triage-board-api.service';

type StatusFilter = 'active' | 'all' | PatientStatus;
interface Selection {
  readonly status: StatusFilter;
  readonly priority: 'all' | TriagePriority;
  readonly pageNumber: number;
  readonly pageSize: number;
}
type BoardState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loaded'; readonly page: PagedResult<TriageBoardItemDto> }
  | { readonly kind: 'error'; readonly error: ApiError };

const statuses: readonly PatientStatus[] = ['Waiting', 'InTreatment', 'Discharged', 'Admitted'];

@Component({
  selector: 'app-triage-board',
  imports: [
    RouterLink,
    EmptyState,
    ErrorBanner,
    PriorityBadge,
    SkeletonRows,
    StatusBadge,
    WaitingIndicator,
  ],
  templateUrl: './triage-board.html',
  styleUrl: './triage-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriageBoard {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(TriageBoardApiService);
  protected readonly selection = signal<Selection>({
    status: 'active',
    priority: 'all',
    pageNumber: 1,
    pageSize: 10,
  });
  protected readonly pageSizes = [10, 25, 50, 100] as const;
  private readonly retries = signal(0);
  private readonly request = computed(() => ({
    selection: this.selection(),
    language: this.i18n.language(),
    retry: this.retries(),
  }));
  protected readonly state = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ selection }) =>
        this.api.getBoard(this.queryFor(selection)).pipe(
          map((page): BoardState => ({ kind: 'loaded', page })),
          catchError((error: unknown) =>
            of<BoardState>({
              kind: 'error',
              error:
                error instanceof ApiError
                  ? error
                  : new ApiError(0, this.i18n.messages().apiNetworkError),
            }),
          ),
          startWith<BoardState>({ kind: 'loading' }),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as BoardState },
  );
  protected readonly page = computed(() => {
    const state = this.state();
    return state.kind === 'loaded' ? state.page : null;
  });
  protected readonly failure = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.error : null;
  });
  private readonly arrivalFormatter = computed(
    () =>
      new Intl.DateTimeFormat(this.i18n.language(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
  );

  protected formatArrival(value: string): string {
    return this.arrivalFormatter().format(new Date(value));
  }

  protected setStatus(value: string): void {
    if (!['active', 'all', ...statuses].includes(value) || value === this.selection().status)
      return;
    this.selection.update((selection) => ({
      ...selection,
      status: value as StatusFilter,
      pageNumber: 1,
    }));
  }

  protected setPriority(value: string): void {
    const priority = value === 'all' ? 'all' : Number(value);
    if (priority !== 'all' && ![1, 2, 3, 4].includes(priority)) return;
    if (priority === this.selection().priority) return;
    this.selection.update((selection) => ({
      ...selection,
      priority: priority as Selection['priority'],
      pageNumber: 1,
    }));
  }

  protected setPageSize(value: string): void {
    const size = Number(value);
    if (!this.pageSizes.some((option) => option === size) || size === this.selection().pageSize)
      return;
    this.selection.update((selection) => ({ ...selection, pageSize: size, pageNumber: 1 }));
  }

  protected goToPage(pageNumber: number): void {
    const page = this.page();
    if (
      !page ||
      !Number.isSafeInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > Math.max(1, page.totalPages) ||
      pageNumber === this.selection().pageNumber
    )
      return;
    this.selection.update((selection) => ({ ...selection, pageNumber }));
  }

  protected retry(): void {
    if (this.state().kind !== 'loading') this.retries.update((retry) => retry + 1);
  }

  private queryFor(selection: Selection): TriageBoardQuery {
    return {
      status:
        selection.status === 'active'
          ? undefined
          : selection.status === 'all'
            ? statuses
            : [selection.status],
      priority: selection.priority === 'all' ? undefined : [selection.priority],
      pageNumber: selection.pageNumber,
      pageSize: selection.pageSize,
    };
  }
}

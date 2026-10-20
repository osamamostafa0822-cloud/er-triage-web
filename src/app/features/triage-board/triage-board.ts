import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, map, merge, of, startWith, switchMap } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import type { PagedResult } from '../../core/models/paged-result';
import type { PatientStatus, TriagePriority } from '../../core/models/patient';
import type { PatientChangedEvent } from '../../core/models/realtime';
import type { TriageBoardItemDto, TriageBoardQuery } from '../../core/models/triage-board';
import { TriageRealtimeService } from '../../core/realtime/triage-realtime.service';
import { TranslationService } from '../../i18n/translation.service';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorBanner } from '../../shared/ui/error-banner';
import { PriorityBadge } from '../../shared/ui/priority-badge';
import { SkeletonRows } from '../../shared/ui/skeleton-rows';
import { StatusBadge } from '../../shared/ui/status-badge';
import { WaitingIndicator } from '../../shared/ui/waiting-indicator';
import { PatientActionDialog } from './actions/patient-action-dialog';
import type { ActivePatientAction, PatientActionOutcome } from './actions/patient-action';
import { PatientRowActions } from './actions/patient-row-actions';
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

/** A short message above the list: the result of this user's own action, or a change made by someone else. */
type Notice =
  | { readonly source: 'own'; readonly outcome: PatientActionOutcome['kind'] }
  | { readonly source: 'remote'; readonly event: PatientChangedEvent };

const statuses: readonly PatientStatus[] = ['Waiting', 'InTreatment', 'Discharged', 'Admitted'];
const noticeDurationMs = 8000;
/** Several changes in a burst (or a reconnect) cause one refetch. */
const liveRefreshDebounceMs = 300;

@Component({
  selector: 'app-triage-board',
  imports: [
    RouterLink,
    EmptyState,
    ErrorBanner,
    PatientActionDialog,
    PatientRowActions,
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
  private readonly realtime = inject(TriageRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly liveState = this.realtime.state;
  protected readonly activeAction = signal<ActivePatientAction | null>(null);
  protected readonly notice = signal<Notice | null>(null);
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly selection = signal<Selection>({
    status: 'active',
    priority: 'all',
    pageNumber: 1,
    pageSize: 10,
  });
  protected readonly pageSizes = [10, 25, 50, 100] as const;
  private readonly retries = signal(0);
  /** Bumped to refetch the current page. A "silent" refetch keeps the rows on screen instead of showing the skeleton. */
  private readonly refreshes = signal(0);
  private silentRefresh = false;
  private readonly request = computed(() => ({
    selection: this.selection(),
    language: this.i18n.language(),
    retry: this.retries(),
    refresh: this.refreshes(),
  }));
  protected readonly state: Signal<BoardState> = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ selection }) => {
        const silent = this.silentRefresh && this.state().kind === 'loaded';
        this.silentRefresh = false;
        const load = this.api.getBoard(this.queryFor(selection)).pipe(
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
        );
        return silent ? load : load.pipe(startWith<BoardState>({ kind: 'loading' }));
      }),
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

  protected readonly liveLabel = computed(() => {
    const text = this.i18n.messages();
    return {
      disconnected: '',
      connecting: text.liveConnecting,
      connected: text.liveConnected,
      reconnecting: text.liveReconnecting,
    }[this.liveState()];
  });
  protected readonly noticeText = computed(() => {
    const notice = this.notice();
    if (!notice) return '';
    const text = this.i18n.messages();
    if (notice.source === 'own') {
      return notice.outcome === 'status' ? text.noticeStatusUpdated : text.noticeOverrideSaved;
    }
    const { event } = notice;
    switch (event.changeType) {
      case 'Registered':
        return text.liveRegistered.replace('{priority}', String(event.priority));
      case 'StatusChanged':
        return text.liveStatusChanged.replace('{status}', this.statusLabel(event.status));
      case 'PriorityOverridden':
        return text.livePriorityOverridden.replace('{priority}', String(event.priority));
    }
  });

  constructor() {
    // Live updates (D-79): a signal from another user triggers one debounced refetch, so the server stays the only
    // source of rows. A reconnect also refetches, to pick up anything missed while offline.
    this.realtime.connect();
    this.destroyRef.onDestroy(() => {
      this.realtime.disconnect();
      clearTimeout(this.noticeTimer);
    });
    this.realtime.changes$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.showNotice({ source: 'remote', event });
    });
    merge(this.realtime.changes$, this.realtime.resync$)
      .pipe(debounceTime(liveRefreshDebounceMs), takeUntilDestroyed())
      .subscribe(() => this.refreshSilently());
  }

  protected openStatusAction(patient: TriageBoardItemDto, target: PatientStatus): void {
    this.activeAction.set({ patient, action: { kind: 'status', target } });
  }

  protected openOverrideAction(patient: TriageBoardItemDto): void {
    this.activeAction.set({ patient, action: { kind: 'override' } });
  }

  protected closeAction(): void {
    this.activeAction.set(null);
  }

  protected onActionCompleted(outcome: PatientActionOutcome): void {
    this.activeAction.set(null);
    this.showNotice({ source: 'own', outcome: outcome.kind });
    this.refreshSilently();
  }

  /** The server says the board's copy of the patient is out of date: refetch while the dialog shows the reason. */
  protected onActionStale(): void {
    this.refreshSilently();
  }

  protected dismissNotice(): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(null);
  }

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

  private refreshSilently(): void {
    this.silentRefresh = true;
    this.refreshes.update((count) => count + 1);
  }

  private showNotice(notice: Notice): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(notice);
    this.noticeTimer = setTimeout(() => this.notice.set(null), noticeDurationMs);
  }

  private statusLabel(status: PatientStatus): string {
    const text = this.i18n.messages();
    return {
      Waiting: text.waiting,
      InTreatment: text.inTreatment,
      Discharged: text.discharged,
      Admitted: text.admitted,
    }[status];
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

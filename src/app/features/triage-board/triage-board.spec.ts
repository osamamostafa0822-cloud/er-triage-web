import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../../core/api-config';
import { LoadingService } from '../../core/http/loading.service';
import { TranslationService } from '../../i18n/translation.service';
import { TriageBoardApiService } from './services/triage-board-api.service';
import { boardItem, boardPage } from './testing/triage-board.fixtures';
import { TriageBoard } from './triage-board';

describe('TriageBoard page', () => {
  const url = 'https://triage.example.test/api/triage-board';
  let fixture: ComponentFixture<TriageBoard>;
  let http: HttpTestingController;
  let host: HTMLElement;
  let loading: LoadingService;
  const multiplePages = () => boardPage([boardItem()], { totalCount: 23, totalPages: 3 });

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }
  function pending() {
    return http.expectOne((request) => request.url === url);
  }
  function respond(page = multiplePages()): void {
    pending().flush({ success: true, data: page });
    render();
  }
  function select(id: string, value: string): void {
    const element = host.querySelector<HTMLSelectElement>('#' + id)!;
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    render();
  }
  function button(text: string): HTMLButtonElement {
    const element = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === text,
    );
    if (!element) throw new Error('Missing button ' + text);
    return element;
  }
  function click(text: string): void {
    button(text).click();
    render();
  }
  function pageTwo(): void {
    respond();
    click('Next');
    respond(boardPage([boardItem()], { pageNumber: 2, totalCount: 23, totalPages: 3 }));
  }

  beforeEach(() => {
    localStorage.removeItem('er-triage.language');
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: 'https://triage.example.test' },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    fixture = TestBed.createComponent(TriageBoard);
    host = fixture.nativeElement as HTMLElement;
    render();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
    expect(loading.pendingRequests()).toBe(0);
    localStorage.removeItem('er-triage.language');
  });

  it('initially requests the active queue with server paging and announces loading', () => {
    const request = pending();
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pageNumber')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('priority')).toBe(false);
    expect(host.querySelector('app-skeleton-rows')).not.toBeNull();
    expect(host.querySelector('.board-results')?.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelector('tbody')).toBeNull();
    expect(loading.isLoading()).toBe(true);
    request.flush({ success: true, data: boardPage() });
    render();
    expect(host.querySelector('.board-results')?.getAttribute('aria-busy')).toBe('false');
  });

  it('renders the exact API order and all priorities/statuses without recalculating waiting levels', () => {
    const priorities = [4, 1, 3, 2] as const;
    const statuses = ['Waiting', 'InTreatment', 'Discharged', 'Admitted'] as const;
    respond(
      boardPage(
        priorities.map((priority, index) =>
          boardItem({
            id: String(index),
            fullName: 'Patient ' + index,
            currentPriority: priority,
            status: statuses[index],
            waitingMinutes: index === 0 ? 7 : null,
            waitingLevel: index === 0 ? 'Critical' : 'None',
          }),
        ),
      ),
    );
    expect(
      Array.from(host.querySelectorAll('tbody tr'), (row) => row.getAttribute('data-priority')),
    ).toEqual(['4', '1', '3', '2']);
    expect(
      Array.from(host.querySelectorAll('tbody .patient-name'), (row) => row.textContent?.trim()),
    ).toEqual(['Patient 0', 'Patient 1', 'Patient 2', 'Patient 3']);
    expect(
      Array.from(host.querySelectorAll('tbody app-status-badge'), (badge) =>
        badge.textContent?.trim(),
      ),
    ).toEqual(['Waiting', 'In Treatment', 'Discharged', 'Admitted']);
    expect(host.querySelector('tbody app-waiting-indicator')?.textContent).toContain('7 min');
    expect(host.querySelector('tbody .level-Critical')).not.toBeNull();
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-20T10:00:00Z');
    expect(host.querySelector('time')?.textContent?.trim()).toBeTruthy();
    expect(host.querySelectorAll('.board-card')).toHaveLength(4);
    expect(host.querySelectorAll('tbody th[scope="row"]')).toHaveLength(4);
  });

  it('shows existing override information from the server next to the row actions', () => {
    respond(
      boardPage([
        boardItem({
          currentPriority: 1,
          calculatedPriority: 4,
          isOverridden: true,
          overrideReason: 'Server override reason',
        }),
      ]),
    );
    expect(host.querySelector('tbody app-priority-badge')?.textContent).toContain('P1');
    expect(host.querySelector('.manual-override')?.textContent).toContain('Server override reason');
    expect(host.querySelector('.priority-reason')?.textContent).toBe('Opaque server reason');
    // Actions come from the server's allowedTransitions (fixture: Waiting -> InTreatment) plus the override.
    expect(
      Array.from(host.querySelectorAll('tbody button')).map((b) => b.textContent?.trim()),
    ).toEqual(['Start treatment', 'Override priority']);
    expect(host.querySelector('a[routerLink="/register"]')).not.toBeNull();
  });

  it.each(['Waiting', 'InTreatment', 'Discharged', 'Admitted'])(
    'filters status %s via the backend',
    (status) => {
      respond();
      select('board-status', status);
      const request = pending();
      expect(request.request.params.getAll('status')).toEqual([status]);
      expect(request.request.params.get('pageNumber')).toBe('1');
      request.flush({ success: true, data: boardPage([]) });
      render();
    },
  );

  it('sends every status explicitly for All, and omits status for the default active queue', () => {
    respond();
    select('board-status', 'all');
    const all = pending();
    expect(all.request.params.getAll('status')).toEqual([
      'Waiting',
      'InTreatment',
      'Discharged',
      'Admitted',
    ]);
    all.flush({ success: true, data: boardPage([]) });
    render();
    select('board-status', 'active');
    const active = pending();
    expect(active.request.params.has('status')).toBe(false);
    active.flush({ success: true, data: boardPage([]) });
    render();
  });

  it('combines priority/status filters and omits priority when All is selected', () => {
    respond();
    select('board-status', 'Waiting');
    respond();
    select('board-priority', '2');
    const request = pending();
    expect(request.request.params.getAll('status')).toEqual(['Waiting']);
    expect(request.request.params.getAll('priority')).toEqual(['2']);
    request.flush({ success: true, data: boardPage() });
    render();
    select('board-priority', 'all');
    const all = pending();
    expect(all.request.params.has('priority')).toBe(false);
    all.flush({ success: true, data: boardPage() });
    render();
  });

  it('uses server metadata for next/previous pages and disables boundaries', () => {
    respond();
    expect(button('Previous').disabled).toBe(true);
    click('Next');
    const next = pending();
    expect(next.request.params.get('pageNumber')).toBe('2');
    expect(host.querySelector('tbody')).toBeNull();
    next.flush({
      success: true,
      data: boardPage([boardItem()], { pageNumber: 2, totalCount: 11, totalPages: 2 }),
    });
    render();
    expect(button('Next').disabled).toBe(true);
    expect(host.querySelector('.board-pagination p')?.textContent).toContain('Page 2 of 2');
    expect(host.querySelector('.result-summary')?.textContent).toContain('11');
    click('Previous');
    expect(pending().request.params.get('pageNumber')).toBe('1');
  });

  it.each([
    ['board-status', 'Discharged'],
    ['board-priority', '4'],
    ['board-page-size', '25'],
  ])('resets page 2 to page 1 when %s changes', (id, value) => {
    pageTwo();
    select(id, value);
    const request = pending();
    expect(request.request.params.get('pageNumber')).toBe('1');
    if (id === 'board-page-size') expect(request.request.params.get('pageSize')).toBe('25');
    request.flush({ success: true, data: boardPage([]) });
    render();
  });

  it.each(['10', '25', '50', '100'])('offers supported page size %s', (size) => {
    respond();
    expect(host.querySelector('#board-page-size option[value="' + size + '"]')).not.toBeNull();
  });

  it('shows an empty result without a paginator or fabricated patients', () => {
    respond(boardPage([]));
    expect(host.querySelector('app-empty-state')?.textContent).toContain('No matching patients');
    expect(host.querySelector('.board-pagination')).toBeNull();
    expect(host.querySelector('.result-summary')?.textContent).toContain('0');
    expect(host.querySelector('tbody')).toBeNull();
  });

  it('recovers from an empty out-of-range page even when the queue becomes empty', () => {
    respond();
    click('Next');
    respond(boardPage([], { pageNumber: 2 }));
    expect(host.querySelector('app-empty-state')?.textContent).toContain(
      'This page has no patients',
    );
    click('Go to first page');
    expect(pending().request.params.get('pageNumber')).toBe('1');
  });

  it('shows normalized error details and retries the same selected page after failure', () => {
    respond();
    select('board-status', 'Waiting');
    respond();
    select('board-priority', '1');
    respond();
    click('Next');
    pending().flush(
      {
        success: false,
        message: 'Safe board failure',
        data: null,
        errors: [{ field: 'pageNumber', message: 'Safe detail' }],
        traceId: 'safe-trace',
      },
      { status: 500, statusText: 'Failure' },
    );
    render();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Safe board failure');
    expect(host.querySelector('.board-error-details')?.textContent).toContain('Safe detail');
    expect(host.querySelector('code')?.textContent).toBe('safe-trace');
    expect(host.querySelector('tbody')).toBeNull();
    expect(loading.isLoading()).toBe(false);
    click('Retry');
    const retry = pending();
    expect(retry.request.params.get('pageNumber')).toBe('2');
    expect(retry.request.params.get('status')).toBe('Waiting');
    expect(retry.request.params.get('priority')).toBe('1');
    retry.flush({ success: true, data: boardPage() });
    render();
    expect(host.querySelector('app-error-banner')).toBeNull();
  });

  it('handles initial network failure and can recover after a filter change', () => {
    pending().error(new ProgressEvent('error'));
    render();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'The server cannot be reached',
    );
    select('board-status', 'all');
    respond();
    expect(host.querySelector('tbody tr')).not.toBeNull();
  });

  it('renders a retryable error for a malformed 200 instead of calling it empty', () => {
    pending().flush({ success: true, data: null });
    render();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('invalid board response');
    expect(host.querySelector('app-empty-state')).toBeNull();
    expect(button('Retry').disabled).toBe(false);
  });

  it('cancels superseded queries so an older response cannot replace newer filters', () => {
    const old = pending();
    select('board-priority', '1');
    expect(old.cancelled).toBe(true);
    expect(loading.pendingRequests()).toBe(1);
    respond(boardPage([boardItem({ fullName: 'Latest Fictional Patient', currentPriority: 1 })]));
    expect(host.querySelector('tbody .patient-name')?.textContent).toContain(
      'Latest Fictional Patient',
    );
  });

  it('refreshes the GET language without resetting selection and renders Arabic/RTL then English', () => {
    pageTwo();
    TestBed.inject(TranslationService).setLanguage('ar');
    render();
    const arabic = pending();
    expect(arabic.request.headers.get('Accept-Language')).toBe('ar');
    expect(arabic.request.params.get('pageNumber')).toBe('2');
    arabic.flush({
      success: true,
      data: boardPage([boardItem()], { pageNumber: 2, totalCount: 23, totalPages: 3 }),
    });
    render();
    expect(document.documentElement.dir).toBe('rtl');
    expect(host.querySelector('h2')?.textContent).toBe('لوحة الفرز');
    expect(host.querySelector('tbody app-status-badge')?.textContent).toBe('في الانتظار');
    expect(host.querySelector('.board-pagination')?.textContent).toContain('الصفحة 2 من 3');
    TestBed.inject(TranslationService).setLanguage('en');
    render();
    const english = pending();
    expect(english.request.headers.get('Accept-Language')).toBe('en');
    english.flush({ success: true, data: boardPage() });
    render();
    expect(document.documentElement.dir).toBe('ltr');
    expect(host.querySelector('h2')?.textContent).toBe('Triage Board');
  });

  it('does not poll or advance server-supplied waiting values while idle', () => {
    respond();
    const original = host.querySelector('app-waiting-indicator')?.textContent;
    vi.useFakeTimers();
    try {
      vi.advanceTimersByTime(60_000);
      fixture.detectChanges();
    } finally {
      vi.useRealTimers();
    }
    expect(host.querySelector('app-waiting-indicator')?.textContent).toBe(original);
    http.expectNone((request) => request.url === url);
  });

  it('does not refetch when an unchanged filter is selected', () => {
    respond();
    select('board-status', 'active');
    select('board-priority', 'all');
    select('board-page-size', '10');
    http.expectNone((request) => request.url === url);
  });

  it('cancels the current request on page destruction and releases loading', () => {
    const request = pending();
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});

describe('TriageBoard routing', () => {
  afterEach(() => localStorage.removeItem('er-triage.language'));
  it('opens the actual lazy board on / while /register remains configured', async () => {
    localStorage.removeItem('er-triage.language');
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: TriageBoardApiService, useValue: { getBoard: () => of(boardPage([])) } },
      ],
    });
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Triage Board');
    expect(TestBed.inject(Router).config.some((route) => route.path === 'register')).toBe(true);
  });
});

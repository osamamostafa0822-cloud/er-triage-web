import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../../app.config';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { LoadingService } from '../../../core/http/loading.service';
import { TranslationService } from '../../../i18n/translation.service';
import { boardItem, boardPage } from '../testing/triage-board.fixtures';
import { TriageBoardApiService } from './triage-board-api.service';

describe('TriageBoardApiService', () => {
  const origin = 'https://triage.example.test';
  const url = origin + '/api/triage-board';
  let http: HttpTestingController;
  let loading: LoadingService;

  function configure(baseUrl = origin): TriageBoardApiService {
    localStorage.removeItem('er-triage.language');
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    return TestBed.inject(TriageBoardApiService);
  }

  afterEach(() => {
    http?.verify();
    expect(loading?.pendingRequests()).toBe(0);
    localStorage.removeItem('er-triage.language');
  });

  it('makes a cold GET with default paging, no status/priority and preserves API order/metadata', () => {
    const api = configure();
    const page = boardPage(
      [
        boardItem({ id: 'server-first', currentPriority: 4 }),
        boardItem({ id: 'server-second', currentPriority: 1 }),
      ],
      { totalCount: 21, totalPages: 3 },
    );
    const response = api.getBoard();
    http.expectNone((request) => request.url === url);
    const next = vi.fn();
    response.subscribe(next);
    expect(loading.isLoading()).toBe(true);
    const request = http.expectOne((request) => request.url === url);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.get('pageNumber')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.has('status')).toBe(false);
    expect(request.request.params.has('priority')).toBe(false);
    request.flush({ success: true, data: page });
    expect(next).toHaveBeenCalledExactlyOnceWith(page);
  });

  it('serializes repeated singular filter names, combines filters and sends requested server paging', () => {
    const api = configure();
    const query = Object.freeze({
      status: Object.freeze(['Waiting', 'InTreatment'] as const),
      priority: Object.freeze([1, 3] as const),
      pageNumber: 2,
      pageSize: 25,
    });
    api.getBoard(query).subscribe();
    const request = http.expectOne((request) => request.url === url);
    expect(request.request.params.getAll('status')).toEqual(['Waiting', 'InTreatment']);
    expect(request.request.params.getAll('priority')).toEqual(['1', '3']);
    expect(request.request.params.get('pageNumber')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    expect(request.request.params.has('statuses')).toBe(false);
    request.flush({ success: true, data: boardPage([], { pageNumber: 2, pageSize: 25 }) });
    expect(query.priority).toEqual([1, 3]);
  });

  it.each(['', origin + '///'])('supports configured base URL %s', (baseUrl) => {
    configure(baseUrl).getBoard().subscribe();
    http
      .expectOne((request) => request.url === (baseUrl ? origin : '') + '/api/triage-board')
      .flush({ success: true, data: boardPage([]) });
  });

  it('accepts an empty beyond-last page and completed patients with server-supplied null wait', () => {
    const api = configure();
    const next = vi.fn();
    api.getBoard({ pageNumber: 3 }).subscribe(next);
    const empty = boardPage([], { pageNumber: 3, totalCount: 11, totalPages: 2 });
    http.expectOne((request) => request.url === url).flush({ success: true, data: empty });
    expect(next).toHaveBeenLastCalledWith(empty);
    const completed = boardPage([
      boardItem({
        status: 'Discharged',
        waitingMinutes: null,
        waitingLevel: 'None',
        allowedTransitions: [],
      }),
    ]);
    api.getBoard({ status: ['Discharged'] }).subscribe(next);
    http.expectOne((request) => request.url === url).flush({ success: true, data: completed });
    expect(next).toHaveBeenLastCalledWith(completed);
  });

  it.each([400, 500])(
    'normalizes HTTP %s including trace/field errors without an automatic retry',
    (status) => {
      const error = vi.fn();
      configure().getBoard().subscribe({ error });
      http
        .expectOne((request) => request.url === url)
        .flush(
          {
            success: false,
            message: 'Safe server message',
            data: null,
            errors: [{ field: 'pageNumber', message: 'Safe field error' }],
            traceId: 'board-trace',
          },
          { status, statusText: 'Failure' },
        );
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({ status, message: 'Safe server message', traceId: 'board-trace' }),
      );
      http.expectNone((request) => request.url === url);
    },
  );

  it('normalizes a network failure and releases loading', () => {
    const error = vi.fn();
    configure().getBoard().subscribe({ error });
    http.expectOne((request) => request.url === url).error(new ProgressEvent('error'));
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 0 }));
  });

  it('snapshots the selected language at subscription for the header and malformed-response error', () => {
    const api = configure();
    const response = api.getBoard();
    const i18n = TestBed.inject(TranslationService);
    i18n.setLanguage('ar');
    const expectedMessage = i18n.messages().apiBoardResponseError;
    const error = vi.fn();
    response.subscribe({ error });
    const request = http.expectOne((request) => request.url === url);
    expect(request.request.headers.get('Accept-Language')).toBe('ar');
    i18n.setLanguage('en');
    request.flush({ success: true, data: null });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 200, message: expectedMessage }),
    );
  });

  it.each([
    null,
    {},
    { success: false, data: boardPage() },
    { success: true, data: [] },
    { success: true, data: { ...boardPage(), items: null } },
    { success: true, data: { ...boardPage(), totalCount: -1 } },
    { success: true, data: { ...boardPage(), totalPages: '1' } },
    { success: true, data: { ...boardPage(), pageSize: 101 } },
    { success: true, data: boardPage([boardItem({ currentPriority: 99 as never })]) },
    { success: true, data: boardPage([boardItem({ status: ['Waiting'] as never })]) },
    { success: true, data: boardPage([boardItem({ waitingMinutes: -1 })]) },
    { success: true, data: boardPage([boardItem({ arrivalTime: 'invalid date' })]) },
  ])('rejects an unusable success response %# instead of displaying misleading data', (body) => {
    const error = vi.fn();
    const next = vi.fn();
    configure().getBoard().subscribe({ error, next });
    http.expectOne((request) => request.url === url).flush(body);
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.any(ApiError));
    http.expectNone((request) => request.url === url);
  });

  it('cancels an unsubscribed request and releases the global loader', () => {
    const subscription = configure().getBoard().subscribe();
    const request = http.expectOne((request) => request.url === url);
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });
});

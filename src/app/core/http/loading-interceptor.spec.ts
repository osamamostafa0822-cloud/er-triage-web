import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpEventType,
  HttpRequest,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry } from 'rxjs';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../api-config';
import { ApiError } from './api-error';
import { SKIP_GLOBAL_LOADING } from './loading-context';
import { loadingInterceptor } from './loading-interceptor';
import { LoadingService } from './loading.service';

describe('loadingInterceptor (application chain)', () => {
  const baseUrl = 'https://triage.example.test';
  const url = `${baseUrl}/api/triage-board`;
  let http: HttpClient;
  let controller: HttpTestingController;
  let loading: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    controller.verify();
    expect(loading.pendingRequests()).toBe(0);
    expect(loading.isLoading()).toBe(false);
  });

  it('starts at subscription, keeps loading through progress, and stops at success', () => {
    const response = http.get(url, { observe: 'events', reportProgress: true });
    expect(loading.isLoading()).toBe(false);
    response.subscribe();
    expect(loading.pendingRequests()).toBe(1);
    expect(loading.isLoading()).toBe(true);
    const request = controller.expectOne(url);
    request.event({ type: HttpEventType.DownloadProgress, loaded: 10, total: 100 });
    expect(loading.pendingRequests()).toBe(1);
    request.flush({});
    expect(loading.isLoading()).toBe(false);
  });

  it('keeps loading until the last concurrent request finishes', () => {
    http.get(url).subscribe();
    http.get(`${baseUrl}/api/patients/test-id`).subscribe();
    expect(loading.pendingRequests()).toBe(2);
    controller.expectOne(url).flush({});
    expect(loading.pendingRequests()).toBe(1);
    expect(loading.isLoading()).toBe(true);
    controller.expectOne(`${baseUrl}/api/patients/test-id`).flush({});
  });

  it.each(['http', 'network'] as const)(
    'stops for a %s failure and preserves normalized API errors',
    (kind) => {
      const onError = vi.fn();
      http.get(url).subscribe({ error: onError });
      const request = controller.expectOne(url);
      if (kind === 'network') {
        request.error(new ProgressEvent('error'));
      } else {
        request.flush(
          {
            success: false,
            message: 'Request rejected.',
            data: null,
            errors: [],
            traceId: 'test-trace',
          },
          { status: 500, statusText: 'Failure' },
        );
      }
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
      expect(loading.pendingRequests()).toBe(0);
      controller.expectNone(url);
    },
  );

  it('releases cancelled subscriptions without affecting another active request', () => {
    const cancelled = http.get(url).subscribe();
    const survivor = http.get(`${baseUrl}/api/patients/test-id`).subscribe();
    const request = controller.expectOne(url);
    const remaining = controller.expectOne(`${baseUrl}/api/patients/test-id`);
    cancelled.unsubscribe();
    expect(request.cancelled).toBe(true);
    expect(loading.pendingRequests()).toBe(1);
    expect(loading.isLoading()).toBe(true);
    survivor.unsubscribe();
    expect(remaining.cancelled).toBe(true);
  });

  it('counts each subscription to the same cold Observable separately', () => {
    const response = http.get(url);
    response.subscribe();
    const second = response.subscribe();
    const requests = controller.match(url);
    expect(requests).toHaveLength(2);
    expect(loading.pendingRequests()).toBe(2);
    requests[0].flush({});
    expect(loading.pendingRequests()).toBe(1);
    second.unsubscribe();
    expect(requests[1].cancelled).toBe(true);
  });

  it('supports an explicit consumer retry without leaking the counter (adds no retry itself)', () => {
    http.get(url).pipe(retry(1)).subscribe();
    controller.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(loading.pendingRequests()).toBe(1);
    controller.expectOne(url).flush({});
    expect(loading.pendingRequests()).toBe(0);
  });

  it('skips background loading without changing other request context, headers, or language handling', () => {
    const marker = new HttpContextToken<string>(() => '');
    const context = new HttpContext().set(marker, 'preserved').set(SKIP_GLOBAL_LOADING, true);
    http.get(url).subscribe();
    http.get(`${url}?pageNumber=2`, { context, headers: { 'X-Test': 'preserved' } }).subscribe();
    const visible = controller.expectOne(url);
    const background = controller.expectOne(`${url}?pageNumber=2`);
    expect(loading.pendingRequests()).toBe(1);
    expect(background.request.context.get(marker)).toBe('preserved');
    expect(background.request.context.get(SKIP_GLOBAL_LOADING)).toBe(true);
    expect(background.request.headers.get('X-Test')).toBe('preserved');
    expect(background.request.headers.get('Accept-Language')).toBe('en');
    expect(background.request.headers.has('SKIP_GLOBAL_LOADING')).toBe(false);
    background.flush({});
    expect(loading.pendingRequests()).toBe(1);
    visible.flush({});
  });

  it('still normalizes errors on opted-out requests without starting the loader', () => {
    const onError = vi.fn();
    http
      .get(url, { context: new HttpContext().set(SKIP_GLOBAL_LOADING, true) })
      .subscribe({ error: onError });
    expect(loading.isLoading()).toBe(false);
    controller.expectOne(url).error(new ProgressEvent('error'));
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
  });

  it.each([
    '/assets/config.json',
    `${baseUrl}/api-other/data`,
    'https://triage.example.test.evil/api/patients',
  ])('ignores requests outside the API boundary: %s', (externalUrl) => {
    http.get(externalUrl).subscribe();
    expect(loading.isLoading()).toBe(false);
    controller.expectOne(externalUrl).flush({});
  });

  it('handles same-origin API requests in production', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: '' },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    http.get('/api/triage-board').subscribe();
    expect(loading.pendingRequests()).toBe(1);
    controller.expectOne('/api/triage-board').flush({});
  });

  it('releases the counter even if a downstream handler throws synchronously', () => {
    const original = new Error('Downstream failure');
    const onError = vi.fn();
    const response = TestBed.runInInjectionContext(() =>
      loadingInterceptor(new HttpRequest('GET', url), () => {
        expect(loading.pendingRequests()).toBe(1);
        throw original;
      }),
    );
    expect(loading.pendingRequests()).toBe(0);
    response.subscribe({ error: onError });
    expect(onError).toHaveBeenCalledWith(original);
    expect(loading.pendingRequests()).toBe(0);
  });
});

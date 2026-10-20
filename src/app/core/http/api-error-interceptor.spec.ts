import {
  HttpClient,
  HttpErrorResponse,
  HttpRequest,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { TranslationService } from '../../i18n/translation.service';
import { API_BASE_URL } from '../api-config';
import type { GeneralResponse } from '../models/general-response';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error-interceptor';

describe('apiErrorInterceptor', () => {
  const baseUrl = 'https://triage.example.test';
  const url = `${baseUrl}/api/patients`;
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it.each([400, 404, 409, 500])(
    'preserves the API message, field errors and traceId for HTTP %s without retry',
    (status) => {
      const body: GeneralResponse<null> = {
        success: false,
        message: 'The request could not be processed.',
        data: null,
        errors: [
          { field: 'spO2', message: 'SpO2 is out of range.' },
          { field: null, message: 'Request rejected.' },
        ],
        traceId: '00-example-trace',
      };
      let failure: unknown;
      http.post(url, {}).subscribe({ error: (error) => (failure = error) });
      controller.expectOne(url).flush(body, { status, statusText: 'Failure' });
      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({
        name: 'ApiError',
        status,
        message: body.message,
        errors: body.errors,
        traceId: body.traceId,
      });
      expect(failure).not.toHaveProperty('url');
      expect(failure).not.toHaveProperty('error');
      controller.expectNone(url);
    },
  );

  it('normalizes network failures without exposing the raw browser event', () => {
    let failure: unknown;
    http.get(url).subscribe({ error: (error) => (failure = error) });
    controller.expectOne(url).error(new ProgressEvent('error'));
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status: 0,
      message: 'The server cannot be reached.',
      errors: [],
      traceId: null,
    });
    controller.expectNone(url);
  });

  it.each([
    {
      label: '415 ProblemDetails',
      body: { type: 'about:blank', title: 'Unsupported Media Type', status: 415 },
      status: 415,
    },
    { label: 'proxy HTML', body: '<html>internal proxy details</html>', status: 502 },
    { label: 'empty response', body: null, status: 500 },
    { label: 'partial envelope', body: { message: 'Internal details' }, status: 500 },
    {
      label: 'malformed errors',
      body: {
        success: false,
        message: 'Internal details',
        data: null,
        errors: [null],
        traceId: null,
      },
      status: 500,
    },
    {
      label: 'invalid field type',
      body: {
        success: false,
        message: 'Internal details',
        data: null,
        errors: [{ field: 1, message: 'Invalid' }],
        traceId: null,
      },
      status: 400,
    },
    {
      label: 'invalid trace type',
      body: { success: false, message: 'Internal details', data: null, errors: [], traceId: 99 },
      status: 500,
    },
  ])('uses a safe localized fallback for $label', ({ body, status }) => {
    let failure: unknown;
    http.get(url).subscribe({ error: (error) => (failure = error) });
    controller.expectOne(url).flush(body, { status, statusText: 'Failure' });
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({
      status,
      message: `The request could not be completed (HTTP ${status}).`,
      errors: [],
      traceId: null,
    });
  });

  it('passes a 201 success envelope through intact and preserves the request payload and other headers', () => {
    const payload = { fullName: 'Fictional Test' };
    const response: GeneralResponse<{ id: string }> = {
      success: true,
      message: '',
      data: { id: 'test-id' },
      errors: [],
      traceId: null,
    };
    let received: unknown;
    http
      .post<GeneralResponse<{ id: string }>>(url, payload, { headers: { 'X-Test': 'preserved' } })
      .subscribe((value) => (received = value));
    const request = controller.expectOne(url);
    expect(request.request.body).toEqual(payload);
    expect(request.request.headers.get('X-Test')).toBe('preserved');
    expect(request.request.headers.get('Accept-Language')).toBe('en');
    request.flush(response, { status: 201, statusText: 'Created' });
    expect(received).toEqual(response);
  });

  it('uses the selected language per request, including localized fallbacks', () => {
    const i18n = TestBed.inject(TranslationService);
    i18n.setLanguage('ar');
    let failure: unknown;
    http.get(url).subscribe({ error: (error) => (failure = error) });
    const arabic = controller.expectOne(url);
    expect(arabic.request.headers.get('Accept-Language')).toBe('ar');
    arabic.error(new ProgressEvent('error'));
    expect(failure).toMatchObject({ message: 'تعذّر الاتصال بالخادم.' });

    http.get(url).subscribe({ error: (error) => (failure = error) });
    controller.expectOne(url).flush({}, { status: 415, statusText: 'Unsupported Media Type' });
    expect(failure).toMatchObject({ message: 'تعذّر إكمال الطلب (HTTP 415).' });

    i18n.setLanguage('en');
    http.get(url).subscribe();
    const english = controller.expectOne(url);
    expect(english.request.headers.get('Accept-Language')).toBe('en');
    english.flush({});
  });

  it('keeps the language snapshot for an in-flight request', () => {
    let failure: unknown;
    http.get(url).subscribe({ error: (error) => (failure = error) });
    const request = controller.expectOne(url);
    TestBed.inject(TranslationService).setLanguage('ar');
    request.error(new ProgressEvent('error'));
    expect(failure).toMatchObject({ message: 'The server cannot be reached.' });
  });

  it.each([
    '/assets/config.json',
    'https://triage.example.test.evil/api/patients',
    `${baseUrl}/api-other/patients`,
  ])('leaves unrelated request headers and errors unchanged: %s', (externalUrl) => {
    let failure: unknown;
    http
      .get(externalUrl, { headers: { 'Accept-Language': 'fr' } })
      .subscribe({ error: (error) => (failure = error) });
    const request = controller.expectOne(externalUrl);
    expect(request.request.headers.get('Accept-Language')).toBe('fr');
    request.flush('External failure', { status: 500, statusText: 'Failure' });
    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(failure).not.toBeInstanceOf(ApiError);
  });

  it('supports same-origin /api requests when the production base URL is empty', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: '' },
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    http.get('/api/triage-board').subscribe();
    const request = controller.expectOne('/api/triage-board');
    expect(request.request.headers.get('Accept-Language')).toBe('en');
    request.flush({});
  });

  it('does not wrap programming errors thrown downstream', () => {
    const original = new Error('Local failure');
    let failure: unknown;
    TestBed.runInInjectionContext(() =>
      apiErrorInterceptor(new HttpRequest('GET', url), () => throwError(() => original)),
    ).subscribe({ error: (error) => (failure = error) });
    expect(failure).toBe(original);
  });
});

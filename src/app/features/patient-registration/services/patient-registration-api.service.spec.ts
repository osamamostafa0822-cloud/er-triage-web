import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../../app.config';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { LoadingService } from '../../../core/http/loading.service';
import type { GeneralResponse } from '../../../core/models/general-response';
import type { PatientDto } from '../../../core/models/patient';
import type { RegisterPatientRequest } from '../../../core/models/patient-requests';
import { TranslationService } from '../../../i18n/translation.service';
import { PatientRegistrationApiService } from './patient-registration-api.service';

afterEach(() => localStorage.removeItem('er-triage.language'));

describe('PatientRegistrationApiService', () => {
  const origin = 'https://triage.example.test';
  const url = `${origin}/api/patients`;
  const request: RegisterPatientRequest = Object.freeze({
    fullName: '  Fictional Patient  ',
    age: 42,
    chiefComplaint: 'Fictional complaint',
    heartRate: 80,
    systolicBp: 120,
    diastolicBp: 80,
    temperatureC: 37.1,
    spO2: 98,
    arrivalTime: '2026-10-20T08:00:00Z',
  });
  const patient: PatientDto = {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Fictional Patient',
    age: 42,
    chiefComplaint: 'Fictional complaint',
    vitals: { heartRate: 80, systolicBp: 120, diastolicBp: 80, temperatureC: 37.1, spO2: 98 },
    arrivalTime: '2026-10-20T08:00:00Z',
    calculatedPriority: 4,
    priorityReason: 'Opaque reason returned by the API.',
    overridePriority: null,
    overrideReason: null,
    overriddenBy: null,
    overriddenAt: null,
    currentPriority: 4,
    isOverridden: false,
    status: 'Waiting',
    treatmentStartedAt: null,
    completedAt: null,
    dispositionNote: null,
    allowedTransitions: ['InTreatment'],
  };
  const success: GeneralResponse<PatientDto> = {
    success: true,
    message: '',
    data: patient,
    errors: [],
    traceId: null,
  };
  let service: PatientRegistrationApiService;
  let controller: HttpTestingController;
  let loading: LoadingService;

  function configure(baseUrl: string): void {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: baseUrl },
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PatientRegistrationApiService);
    controller = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
  }

  beforeEach(() => configure(origin));

  afterEach(() => {
    controller.verify();
    expect(loading.pendingRequests()).toBe(0);
  });

  it('issues no request or loading change until subscribed', () => {
    service.register(request);
    controller.expectNone(url);
    expect(loading.isLoading()).toBe(false);
  });

  it('posts the unchanged flat wire request and unwraps the 201 patient without a follow-up GET', () => {
    let received: PatientDto | undefined;
    service.register(request).subscribe((value) => (received = value));
    expect(loading.pendingRequests()).toBe(1);
    const pending = controller.expectOne(url);
    expect(pending.request.method).toBe('POST');
    expect(pending.request.body).toEqual(request);
    expect(pending.request.body).not.toHaveProperty('vitals');
    expect(pending.request.headers.get('Accept-Language')).toBe('en');
    pending.flush(success, {
      status: 201,
      statusText: 'Created',
      headers: { Location: `/api/patients/${patient.id}` },
    });
    expect(received).toEqual(patient);
    expect(request.fullName).toBe('  Fictional Patient  ');
    controller.expectNone((request) => request.method === 'GET');
    expect(loading.isLoading()).toBe(false);
  });

  it.each(['', 'https://triage.example.test', 'https://triage.example.test/'])(
    'uses the configured origin without double slashes: "%s"',
    (baseUrl) => {
      TestBed.resetTestingModule();
      configure(baseUrl);
      const expectedUrl = `${baseUrl.replace(/\/+$/, '')}/api/patients`;
      service.register(request).subscribe();
      controller.expectOne(expectedUrl).flush(success, { status: 201, statusText: 'Created' });
    },
  );

  it.each([400, 500])(
    'preserves normalized HTTP %s errors and does not retry registration',
    (status) => {
      const failure: GeneralResponse<null> = {
        success: false,
        message: 'Request rejected.',
        data: null,
        errors: [{ field: 'spO2', message: 'Test validation message.' }],
        traceId: 'test-trace',
      };
      const onError = vi.fn();
      service.register(request).subscribe({ error: onError });
      controller.expectOne(url).flush(failure, { status, statusText: 'Failure' });
      expect(onError).toHaveBeenCalledOnce();
      expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
      expect(onError.mock.calls[0][0]).toMatchObject({
        status,
        message: failure.message,
        errors: failure.errors,
        traceId: 'test-trace',
      });
      controller.expectNone(url);
    },
  );

  it('propagates network failure without retrying a non-idempotent POST', () => {
    const onError = vi.fn();
    service.register(request).subscribe({ error: onError });
    controller.expectOne(url).error(new ProgressEvent('error'));
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(onError.mock.calls[0][0]).toMatchObject({
      status: 0,
      message: 'The server cannot be reached.',
    });
    controller.expectNone(url);
  });

  it.each([
    { label: 'success false', body: { ...success, success: false } },
    { label: 'null data', body: { ...success, data: null } },
    { label: 'missing data', body: { success: true } },
    { label: 'null body', body: null },
    { label: 'missing success flag', body: { data: patient } },
    { label: 'non-boolean success', body: { ...success, success: 'true' } },
    { label: 'primitive data', body: { ...success, data: 'invalid' } },
    { label: 'array data', body: { ...success, data: [patient] } },
  ])('rejects a 201 response with $label instead of emitting a patient or retrying', ({ body }) => {
    const onNext = vi.fn();
    const onError = vi.fn();
    service.register(request).subscribe({ next: onNext, error: onError });
    controller.expectOne(url).flush(body, { status: 201, statusText: 'Created' });
    expect(onNext).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect(onError.mock.calls[0][0]).toMatchObject({
      status: 201,
      message: TestBed.inject(TranslationService).messages().apiRegistrationResponseError,
      errors: [],
      traceId: null,
    });
    controller.expectNone(url);
    expect(loading.isLoading()).toBe(false);
  });

  it('takes the language snapshot at subscription, matching the interceptors', () => {
    const response = service.register(request);
    const i18n = TestBed.inject(TranslationService);
    i18n.setLanguage('ar');
    const onError = vi.fn();
    response.subscribe({ error: onError });
    const pending = controller.expectOne(url);
    expect(pending.request.headers.get('Accept-Language')).toBe('ar');
    pending.flush({ ...success, data: null }, { status: 201, statusText: 'Created' });
    expect(onError.mock.calls[0][0].message).toBe(i18n.messages().apiRegistrationResponseError);
  });

  it('keeps the request-language fallback if the UI changes during the request', () => {
    const i18n = TestBed.inject(TranslationService);
    const originalMessage = i18n.messages().apiRegistrationResponseError;
    const onError = vi.fn();
    service.register(request).subscribe({ error: onError });
    const pending = controller.expectOne(url);
    i18n.setLanguage('ar');
    pending.flush({ ...success, data: null }, { status: 201, statusText: 'Created' });
    expect(onError.mock.calls[0][0].message).toBe(originalMessage);
  });

  it('unsubscribes the actual HTTP request and releases the global loader', () => {
    const onNext = vi.fn();
    const onError = vi.fn();
    const subscription = service.register(request).subscribe({ next: onNext, error: onError });
    const pending = controller.expectOne(url);
    expect(loading.isLoading()).toBe(true);
    subscription.unsubscribe();
    expect(pending.cancelled).toBe(true);
    expect(loading.isLoading()).toBe(false);
    expect(onNext).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

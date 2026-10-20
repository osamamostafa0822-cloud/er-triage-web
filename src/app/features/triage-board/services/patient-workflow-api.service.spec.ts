import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { appConfig } from '../../../app.config';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { FakeHubConnection } from '../../../core/realtime/testing/fake-hub-connection';
import {
  HUB_CONNECTION_FACTORY,
  ORIGIN_CONNECTION_HEADER,
  TriageRealtimeService,
} from '../../../core/realtime/triage-realtime.service';
import { PatientWorkflowApiService } from './patient-workflow-api.service';

describe('PatientWorkflowApiService', () => {
  const base = 'https://triage.example.test';
  const id = 'aaaaaaaa-0000-0000-0000-000000000001';
  const patient = {
    id,
    status: 'InTreatment',
    currentPriority: 2,
    allowedTransitions: ['Discharged', 'Admitted'],
  };
  let service: PatientWorkflowApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('er-triage.language');
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: base },
        { provide: HUB_CONNECTION_FACTORY, useValue: () => new FakeHubConnection() },
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PatientWorkflowApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('POSTs a status change to the patient and unwraps the envelope', () => {
    let result: unknown;
    service
      .changeStatus(id, { targetStatus: 'InTreatment', dispositionNote: null })
      .subscribe((value) => (result = value));

    const request = http.expectOne(`${base}/api/patients/${id}/status`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ targetStatus: 'InTreatment', dispositionNote: null });
    expect(request.request.headers.has(ORIGIN_CONNECTION_HEADER)).toBe(false);
    request.flush({ success: true, data: patient });

    expect(result).toEqual(patient);
  });

  it('PUTs a priority override to the patient', () => {
    service
      .overridePriority(id, { priority: 1, reason: 'Fictional reason', overriddenBy: null })
      .subscribe();

    const request = http.expectOne(`${base}/api/patients/${id}/priority-override`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      priority: 1,
      reason: 'Fictional reason',
      overriddenBy: null,
    });
    request.flush({ success: true, data: patient });
  });

  it('sends the live connection id so the server does not notify the sender', async () => {
    const realtime = TestBed.inject(TriageRealtimeService);
    realtime.connect();
    await Promise.resolve();
    await Promise.resolve();

    service.changeStatus(id, { targetStatus: 'InTreatment', dispositionNote: null }).subscribe();

    const request = http.expectOne(`${base}/api/patients/${id}/status`);
    expect(request.request.headers.get(ORIGIN_CONNECTION_HEADER)).toBe('fake-connection-1');
    request.flush({ success: true, data: patient });
    realtime.disconnect();
  });

  it('rejects a 2xx response that is not a patient, without leaking it', () => {
    let error: unknown;
    service
      .changeStatus(id, { targetStatus: 'InTreatment', dispositionNote: null })
      .subscribe({ error: (e: unknown) => (error = e) });

    http
      .expectOne(`${base}/api/patients/${id}/status`)
      .flush({ success: true, data: { unexpected: true } });

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain('unexpected response');
  });

  it('normalizes a 409 failure with the server message and trace id', () => {
    let error: ApiError | undefined;
    service
      .changeStatus(id, { targetStatus: 'Discharged', dispositionNote: 'x' })
      .subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(`${base}/api/patients/${id}/status`).flush(
      {
        success: false,
        message: 'Cannot change status.',
        data: null,
        errors: [],
        traceId: 't-1',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(error?.status).toBe(409);
    expect(error?.message).toBe('Cannot change status.');
    expect(error?.traceId).toBe('t-1');
  });
});

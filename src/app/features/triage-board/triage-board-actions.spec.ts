import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../../core/api-config';
import { LoadingService } from '../../core/http/loading.service';
import type { PatientDto } from '../../core/models/patient';
import { FakeHubConnection } from '../../core/realtime/testing/fake-hub-connection';
import {
  HUB_CONNECTION_FACTORY,
  ORIGIN_CONNECTION_HEADER,
} from '../../core/realtime/triage-realtime.service';
import { boardItem, boardPage } from './testing/triage-board.fixtures';
import { TriageBoard } from './triage-board';

const patientId = '11111111-1111-1111-1111-111111111111';

function savedPatient(overrides: Partial<PatientDto> = {}): PatientDto {
  return {
    id: patientId,
    fullName: 'Fictional Board Patient',
    age: 42,
    chiefComplaint: 'Fictional complaint',
    vitals: { heartRate: 80, systolicBp: 120, diastolicBp: 80, temperatureC: 36.8, spO2: 98 },
    arrivalTime: '2026-10-20T10:00:00Z',
    calculatedPriority: 2,
    priorityReason: 'Opaque server reason',
    overridePriority: null,
    overrideReason: null,
    overriddenBy: null,
    overriddenAt: null,
    currentPriority: 2,
    isOverridden: false,
    status: 'InTreatment',
    treatmentStartedAt: '2026-10-20T10:30:00Z',
    completedAt: null,
    dispositionNote: null,
    allowedTransitions: ['Discharged', 'Admitted'],
    ...overrides,
  };
}

describe('TriageBoard actions and live updates', () => {
  const base = 'https://triage.example.test';
  let fixture: ComponentFixture<TriageBoard>;
  let http: HttpTestingController;
  let host: HTMLElement;
  let loading: LoadingService;
  let hub: FakeHubConnection;

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }
  async function settle(): Promise<void> {
    // Let the fake hub's start() promise resolve so the board is "connected".
    await Promise.resolve();
    await Promise.resolve();
    render();
  }
  function boardRequest() {
    return http.expectOne((request) => request.url === `${base}/api/triage-board`);
  }
  function loadBoard(items = [boardItem()]): void {
    boardRequest().flush({ success: true, data: boardPage(items) });
    render();
  }
  function button(text: string, scope: ParentNode = host): HTMLButtonElement {
    const element = Array.from(scope.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    if (!element) throw new Error('Missing button ' + text);
    return element;
  }
  function click(text: string, scope: ParentNode = host): void {
    button(text, scope).click();
    render();
  }
  function dialog(): HTMLElement | null {
    return host.querySelector<HTMLElement>('[role="dialog"]');
  }
  function type(selector: string, value: string): void {
    const element = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    render();
  }
  function choose(selector: string, value: string): void {
    const element = host.querySelector<HTMLSelectElement>(selector)!;
    element.value = value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    render();
  }
  function submit(): void {
    host.querySelector<HTMLButtonElement>('[role="dialog"] button[type="submit"]')!.click();
    render();
  }
  const remoteEvent = (overrides: Record<string, unknown> = {}) => ({
    changeType: 'StatusChanged',
    patientId,
    priority: 2,
    status: 'InTreatment',
    occurredAt: '2026-10-20T10:31:00+00:00',
    ...overrides,
  });

  beforeEach(async () => {
    localStorage.removeItem('er-triage.language');
    hub = new FakeHubConnection();
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: base },
        { provide: HUB_CONNECTION_FACTORY, useValue: () => hub },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    fixture = TestBed.createComponent(TriageBoard);
    host = fixture.nativeElement as HTMLElement;
    render();
    loadBoard();
    await settle();
  });
  afterEach(() => {
    vi.useRealTimers();
    fixture.destroy();
    http.verify();
    expect(loading.pendingRequests()).toBe(0);
    localStorage.removeItem('er-triage.language');
  });

  it('offers only the actions the server allows for each patient', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(TriageBoard);
    host = fixture.nativeElement as HTMLElement;
    render();
    loadBoard([
      boardItem({
        id: 'a',
        fullName: 'Waiting One',
        status: 'Waiting',
        allowedTransitions: ['InTreatment'],
      }),
      boardItem({
        id: 'b',
        fullName: 'Treating Two',
        status: 'InTreatment',
        allowedTransitions: ['Discharged', 'Admitted'],
      }),
      boardItem({ id: 'c', fullName: 'Done Three', status: 'Discharged', allowedTransitions: [] }),
    ]);
    const labels = Array.from(host.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('button')).map((b) => b.textContent?.trim()),
    );
    expect(labels).toEqual([
      ['Start treatment', 'Override priority'],
      ['Discharge', 'Admit', 'Override priority'],
      [],
    ]);
  });

  it('starts treatment after confirmation, then refreshes the rows without hiding them', () => {
    click('Start treatment');
    expect(dialog()?.textContent).toContain('Fictional Board Patient');
    click('Start treatment', dialog()!);

    const request = http.expectOne(`${base}/api/patients/${patientId}/status`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ targetStatus: 'InTreatment', dispositionNote: null });
    // Double submit is blocked while the request is in flight.
    expect(dialog()?.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(
      true,
    );
    request.flush({ success: true, data: savedPatient() });
    render();

    expect(dialog()).toBeNull();
    expect(host.querySelector('.board-notice')?.textContent).toContain('Patient status updated.');
    expect(host.querySelector('app-skeleton-rows')).toBeNull();
    expect(host.querySelector('tbody')).not.toBeNull();
    boardRequest().flush({
      success: true,
      data: boardPage([boardItem({ status: 'InTreatment' })]),
    });
    render();
    expect(host.querySelector('tbody app-status-badge')?.textContent).toContain('In Treatment');
  });

  it('requires a disposition note to discharge and sends the trimmed note', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(TriageBoard);
    host = fixture.nativeElement as HTMLElement;
    render();
    loadBoard([
      boardItem({ status: 'InTreatment', allowedTransitions: ['Discharged', 'Admitted'] }),
    ]);

    click('Discharge');
    submit();
    http.expectNone(`${base}/api/patients/${patientId}/status`);
    expect(dialog()?.querySelector('.field-error')?.textContent).toContain(
      'This field is required.',
    );

    type('#disposition-note', '  Released with advice.  ');
    submit();
    const request = http.expectOne(`${base}/api/patients/${patientId}/status`);
    expect(request.request.body).toEqual({
      targetStatus: 'Discharged',
      dispositionNote: 'Released with advice.',
    });
    request.flush({
      success: true,
      data: savedPatient({
        status: 'Discharged',
        dispositionNote: 'Released with advice.',
        allowedTransitions: [],
      }),
    });
    render();
    boardRequest().flush({ success: true, data: boardPage([]) });
    render();
    expect(dialog()).toBeNull();
  });

  it('requires a priority and a reason to override, then sends them', () => {
    click('Override priority');
    submit();
    http.expectNone(`${base}/api/patients/${patientId}/priority-override`);
    expect(dialog()?.querySelectorAll('.field-error').length).toBe(2);

    choose('#override-priority', '1');
    type('#override-reason', '  Looks worse than the vitals suggest.  ');
    type('#override-by', '  Fictional Nurse ');
    submit();

    const request = http.expectOne(`${base}/api/patients/${patientId}/priority-override`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      priority: 1,
      reason: 'Looks worse than the vitals suggest.',
      overriddenBy: 'Fictional Nurse',
    });
    request.flush({
      success: true,
      data: savedPatient({
        overridePriority: 1,
        currentPriority: 1,
        isOverridden: true,
        overrideReason: 'x',
      }),
    });
    render();
    expect(host.querySelector('.board-notice')?.textContent).toContain('Priority override saved.');
    boardRequest().flush({ success: true, data: boardPage() });
    render();
  });

  it('keeps the dialog open with the server message on a 409 and refreshes the stale board', () => {
    click('Start treatment');
    click('Start treatment', dialog()!);
    http.expectOne(`${base}/api/patients/${patientId}/status`).flush(
      {
        success: false,
        message: 'Cannot change status from InTreatment to InTreatment.',
        data: null,
        errors: [],
        traceId: 'trace-409',
      },
      { status: 409, statusText: 'Conflict' },
    );
    render();

    const open = dialog()!;
    expect(open.textContent).toContain('Cannot change status from InTreatment to InTreatment.');
    expect(open.textContent).toContain('trace-409');
    expect(open.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
    boardRequest().flush({
      success: true,
      data: boardPage([boardItem({ status: 'InTreatment' })]),
    });
    render();
  });

  it('closes with Cancel or Escape without sending anything', () => {
    click('Override priority');
    click('Cancel', dialog()!);
    expect(dialog()).toBeNull();

    click('Override priority');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    render();
    expect(dialog()).toBeNull();
  });

  it('tells the server which connection made the change so it is not notified about itself', () => {
    expect(host.querySelector('.live-chip')?.textContent).toContain('Live updates on');
    click('Start treatment');
    click('Start treatment', dialog()!);

    const request = http.expectOne(`${base}/api/patients/${patientId}/status`);
    expect(request.request.headers.get(ORIGIN_CONNECTION_HEADER)).toBe('fake-connection-1');
    request.flush({ success: true, data: savedPatient() });
    render();
    boardRequest().flush({ success: true, data: boardPage() });
    render();
  });

  it('shows what another user did and refetches once for a burst of changes, keeping the rows', () => {
    vi.useFakeTimers();
    hub.emit('patientChanged', remoteEvent());
    hub.emit(
      'patientChanged',
      remoteEvent({ changeType: 'Registered', priority: 1, status: 'Waiting' }),
    );
    render();
    expect(host.querySelector('.board-notice')?.textContent).toContain(
      'A new patient was registered (priority P1).',
    );

    http.expectNone(`${base}/api/triage-board`);
    vi.advanceTimersByTime(300);
    render();
    expect(host.querySelector('app-skeleton-rows')).toBeNull();
    expect(host.querySelector('tbody')).not.toBeNull();
    boardRequest().flush({ success: true, data: boardPage() });
    render();

    vi.advanceTimersByTime(8000);
    render();
    expect(host.querySelector('.board-notice')).toBeNull();
  });

  it('describes status and override changes from other users and ignores malformed messages', () => {
    hub.emit('patientChanged', { nonsense: true });
    render();
    expect(host.querySelector('.board-notice')).toBeNull();

    hub.emit('patientChanged', remoteEvent());
    render();
    expect(host.querySelector('.board-notice')?.textContent).toContain(
      "A patient's status changed to In Treatment.",
    );
    hub.emit('patientChanged', remoteEvent({ changeType: 'PriorityOverridden', priority: 3 }));
    render();
    expect(host.querySelector('.board-notice')?.textContent).toContain(
      "A patient's priority was overridden to P3.",
    );
    click('Dismiss');
    expect(host.querySelector('.board-notice')).toBeNull();
  });

  it('closes the connection when the board is destroyed', () => {
    fixture.destroy();
    expect(hub.stopCalls).toBe(1);
    // Recreate so the shared afterEach has a live fixture to destroy; this one has no pending work.
    fixture = TestBed.createComponent(TriageBoard);
    host = fixture.nativeElement as HTMLElement;
    render();
    loadBoard();
  });
});

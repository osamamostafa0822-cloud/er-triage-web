import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import type { PatientChangedEvent } from '../models/realtime';
import { FakeHubConnection } from './testing/fake-hub-connection';
import {
  HUB_CONNECTION_FACTORY,
  PATIENT_CHANGED_METHOD,
  TriageRealtimeService,
} from './triage-realtime.service';

describe('TriageRealtimeService', () => {
  let connections: FakeHubConnection[];
  let nextConnection: FakeHubConnection | undefined;
  let service: TriageRealtimeService;

  const event: PatientChangedEvent = {
    changeType: 'StatusChanged',
    patientId: '11111111-1111-1111-1111-111111111111',
    priority: 2,
    status: 'InTreatment',
    occurredAt: '2026-10-20T10:00:00+00:00',
  };

  /** Lets resolved/rejected start() promises and the retry loop's continuations run. */
  async function flush(): Promise<void> {
    for (let i = 0; i < 5; i++) await Promise.resolve();
  }

  beforeEach(() => {
    connections = [];
    nextConnection = undefined;
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'https://triage.example.test' },
        {
          provide: HUB_CONNECTION_FACTORY,
          useValue: () => {
            const connection = nextConnection ?? new FakeHubConnection();
            connections.push(connection);
            return connection;
          },
        },
      ],
    });
    service = TestBed.inject(TriageRealtimeService);
  });
  afterEach(() => {
    service.disconnect();
    vi.useRealTimers();
  });

  it('starts disconnected and has no connection id', () => {
    expect(service.state()).toBe('disconnected');
    expect(service.connectionId()).toBeNull();
    expect(connections).toHaveLength(0);
  });

  it('connects once, even when connect() is called repeatedly', async () => {
    service.connect();
    service.connect();
    expect(service.state()).toBe('connecting');
    await flush();

    expect(connections).toHaveLength(1);
    expect(connections[0].startCalls).toBe(1);
    expect(service.state()).toBe('connected');
    expect(service.connectionId()).toBe('fake-connection-1');
  });

  it('publishes well-formed patientChanged messages and ignores anything else', async () => {
    const received: PatientChangedEvent[] = [];
    service.changes$.subscribe((value) => received.push(value));
    service.connect();
    await flush();

    connections[0].emit(PATIENT_CHANGED_METHOD, event);
    connections[0].emit(PATIENT_CHANGED_METHOD, { ...event, status: 'Unknown' });
    connections[0].emit(PATIENT_CHANGED_METHOD, 'text');
    connections[0].emit(PATIENT_CHANGED_METHOD);

    expect(received).toEqual([event]);
  });

  it('does not ask the board to resync on the first connection', async () => {
    let resyncs = 0;
    service.resync$.subscribe(() => resyncs++);
    service.connect();
    await flush();

    expect(resyncs).toBe(0);
  });

  it('shows reconnecting while the socket is down and resyncs once it is back', async () => {
    let resyncs = 0;
    service.resync$.subscribe(() => resyncs++);
    service.connect();
    await flush();

    connections[0].simulateReconnecting();
    expect(service.state()).toBe('reconnecting');
    expect(service.connectionId()).toBeNull();
    connections[0].simulateReconnected();

    expect(service.state()).toBe('connected');
    expect(resyncs).toBe(1);
  });

  it('retries with backoff when the first start fails, then resyncs', async () => {
    vi.useFakeTimers();
    let resyncs = 0;
    service.resync$.subscribe(() => resyncs++);
    const failing = new FakeHubConnection();
    failing.startFailures = [new Error('refused'), new Error('refused')];
    nextConnection = failing;

    service.connect();
    await flush();
    expect(service.state()).toBe('reconnecting');
    expect(failing.startCalls).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    await flush();
    expect(failing.startCalls).toBe(2);
    expect(service.state()).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(2000);
    await flush();
    expect(failing.startCalls).toBe(3);
    expect(service.state()).toBe('connected');
    expect(resyncs).toBe(1);
  });

  it('restarts after SignalR gives up and closes the connection', async () => {
    let resyncs = 0;
    service.resync$.subscribe(() => resyncs++);
    service.connect();
    await flush();

    connections[0].simulateClosed();
    expect(service.state()).toBe('reconnecting');
    await flush();

    expect(connections[0].startCalls).toBe(2);
    expect(service.state()).toBe('connected');
    expect(resyncs).toBe(1);
  });

  it('stops the connection and goes quiet on disconnect', async () => {
    const received: PatientChangedEvent[] = [];
    service.changes$.subscribe((value) => received.push(value));
    service.connect();
    await flush();

    service.disconnect();
    connections[0].emit(PATIENT_CHANGED_METHOD, event);

    expect(connections[0].stopCalls).toBe(1);
    expect(service.state()).toBe('disconnected');
    expect(service.connectionId()).toBeNull();
    expect(received).toEqual([]);
  });

  it('can connect again after a disconnect', async () => {
    service.connect();
    await flush();
    service.disconnect();

    service.connect();
    await flush();

    expect(connections).toHaveLength(2);
    expect(service.state()).toBe('connected');
  });
});

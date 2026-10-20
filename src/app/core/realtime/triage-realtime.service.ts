import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { isPatientChangedEvent, PatientChangedEvent } from '../models/realtime';

/** Mirrors ERTriage.Api/Realtime/TriageHub.cs. */
export const HUB_PATH = '/hubs/triage';
export const PATIENT_CHANGED_METHOD = 'patientChanged';
/** Lets the server skip this browser when it fans a change out (the browser already knows about its own change). */
export const ORIGIN_CONNECTION_HEADER = 'X-Origin-Connection-Id';

export type RealtimeState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** The slice of SignalR's HubConnection the app uses, so tests never open a socket. */
export interface HubConnectionLike {
  readonly connectionId: string | null;
  start(): Promise<void>;
  stop(): Promise<void>;
  on(methodName: string, handler: (...args: unknown[]) => void): void;
  onreconnecting(handler: () => void): void;
  onreconnected(handler: () => void): void;
  onclose(handler: () => void): void;
}

export const HUB_CONNECTION_FACTORY = new InjectionToken<() => HubConnectionLike>(
  'HUB_CONNECTION_FACTORY',
  {
    providedIn: 'root',
    factory: () => {
      const url = `${inject(API_BASE_URL).replace(/\/+$/, '')}${HUB_PATH}`;
      // withCredentials is off: the API uses no cookies, so the CORS policy needs no credentials mode.
      return () =>
        new HubConnectionBuilder()
          .withUrl(url, { withCredentials: false })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();
    },
  },
);

const retryDelaysMs = [1000, 2000, 5000, 10000, 30000] as const;

/**
 * Receives "a patient changed" signals from other users (D-79). Notifications are hints, never data: the board
 * refetches through the REST API. While the socket is down the board keeps working as a snapshot; after it comes
 * back `resync$` fires once so changes missed in the meantime are fetched.
 */
@Injectable({ providedIn: 'root' })
export class TriageRealtimeService {
  private readonly createConnection = inject(HUB_CONNECTION_FACTORY);
  private readonly stateSignal = signal<RealtimeState>('disconnected');
  private readonly changes = new Subject<PatientChangedEvent>();
  private readonly resyncs = new Subject<void>();
  private connection: HubConnectionLike | null = null;
  private loopRunning = false;
  private needsResync = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private cancelWait: (() => void) | undefined;

  readonly state = this.stateSignal.asReadonly();
  readonly changes$ = this.changes.asObservable();
  readonly resync$ = this.resyncs.asObservable();

  /** The live connection id, or null when not connected. */
  connectionId(): string | null {
    return this.stateSignal() === 'connected' ? (this.connection?.connectionId ?? null) : null;
  }

  /** Idempotent. Keeps trying (with backoff) until `disconnect()`; failures never surface as errors. */
  connect(): void {
    if (this.connection) return;
    const connection = this.createConnection();
    this.connection = connection;

    connection.on(PATIENT_CHANGED_METHOD, (payload) => {
      if (this.connection === connection && isPatientChangedEvent(payload))
        this.changes.next(payload);
    });
    connection.onreconnecting(() => {
      if (this.connection !== connection) return;
      this.needsResync = true;
      this.stateSignal.set('reconnecting');
    });
    connection.onreconnected(() => {
      if (this.connection === connection) this.markConnected();
    });
    // Automatic reconnect gives up after a few tries; restart the loop so the board recovers on its own.
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.needsResync = true;
      this.stateSignal.set('reconnecting');
      void this.startLoop(connection);
    });

    void this.startLoop(connection);
  }

  disconnect(): void {
    const connection = this.connection;
    this.connection = null;
    this.needsResync = false;
    this.stateSignal.set('disconnected');
    clearTimeout(this.retryTimer);
    this.cancelWait?.();
    if (connection) {
      // Teardown only: a failed stop leaves nothing to recover.
      connection.stop().catch(() => undefined);
    }
  }

  private async startLoop(connection: HubConnectionLike): Promise<void> {
    if (this.loopRunning) return;
    this.loopRunning = true;
    try {
      for (let attempt = 0; this.connection === connection; attempt++) {
        this.stateSignal.set(attempt === 0 && !this.needsResync ? 'connecting' : 'reconnecting');
        try {
          await connection.start();
        } catch {
          if (this.connection !== connection) return;
          this.needsResync = true;
          this.stateSignal.set('reconnecting');
          await this.wait(retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)]);
          continue;
        }
        if (this.connection !== connection) {
          await connection.stop().catch(() => undefined);
          return;
        }
        this.markConnected();
        return;
      }
    } finally {
      this.loopRunning = false;
    }
  }

  private markConnected(): void {
    this.stateSignal.set('connected');
    if (this.needsResync) {
      this.needsResync = false;
      this.resyncs.next();
    }
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      this.cancelWait = resolve;
      this.retryTimer = setTimeout(resolve, milliseconds);
    });
  }
}

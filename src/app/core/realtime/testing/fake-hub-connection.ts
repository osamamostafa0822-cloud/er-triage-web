import type { HubConnectionLike } from '../triage-realtime.service';

/**
 * Hand-written stand-in for SignalR's HubConnection (no socket, no timers). `start()` resolves by default, so a
 * component that connects behaves as if the hub were reachable; tests can emit messages and drive reconnects.
 */
export class FakeHubConnection implements HubConnectionLike {
  connectionId: string | null = 'fake-connection-1';
  startCalls = 0;
  stopCalls = 0;
  /** Each queued entry makes one `start()` call reject; when empty, `start()` resolves. */
  startFailures: Error[] = [];
  private readonly handlers = new Map<string, (...args: unknown[]) => void>();
  private reconnecting: () => void = () => undefined;
  private reconnected: () => void = () => undefined;
  private closed: () => void = () => undefined;

  start(): Promise<void> {
    this.startCalls++;
    const failure = this.startFailures.shift();
    return failure ? Promise.reject(failure) : Promise.resolve();
  }

  stop(): Promise<void> {
    this.stopCalls++;
    return Promise.resolve();
  }

  on(methodName: string, handler: (...args: unknown[]) => void): void {
    this.handlers.set(methodName, handler);
  }

  onreconnecting(handler: () => void): void {
    this.reconnecting = handler;
  }

  onreconnected(handler: () => void): void {
    this.reconnected = handler;
  }

  onclose(handler: () => void): void {
    this.closed = handler;
  }

  emit(methodName: string, ...args: unknown[]): void {
    this.handlers.get(methodName)?.(...args);
  }

  simulateReconnecting(): void {
    this.reconnecting();
  }

  simulateReconnected(): void {
    this.reconnected();
  }

  simulateClosed(): void {
    this.closed();
  }
}

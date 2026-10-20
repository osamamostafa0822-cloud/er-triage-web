import { provideZonelessChangeDetection } from '@angular/core';
import { HUB_CONNECTION_FACTORY } from './app/core/realtime/triage-realtime.service';
import { FakeHubConnection } from './app/core/realtime/testing/fake-hub-connection';

export default [
  provideZonelessChangeDetection(),
  // No test may open a real socket: any component that connects gets an inert connection unless a test overrides this.
  { provide: HUB_CONNECTION_FACTORY, useValue: () => new FakeHubConnection() },
];

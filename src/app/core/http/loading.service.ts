import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly pendingRequests = this.count.asReadonly();
  readonly isLoading = computed(() => this.pendingRequests() > 0);

  /** A release belongs to one request and is safe to call more than once. */
  beginRequest(): () => void {
    this.count.update((count) => count + 1);
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.count.update((count) => count - 1);
      }
    };
  }
}

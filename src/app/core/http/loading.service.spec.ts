import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  it('releases only its own request once, preserving other active requests', () => {
    const service = TestBed.inject(LoadingService);
    const finishFirst = service.beginRequest();
    const finishSecond = service.beginRequest();
    expect(service.pendingRequests()).toBe(2);
    finishFirst();
    finishFirst();
    expect(service.pendingRequests()).toBe(1);
    expect(service.isLoading()).toBe(true);
    finishSecond();
    finishSecond();
    expect(service.pendingRequests()).toBe(0);
    expect(service.isLoading()).toBe(false);
  });
});

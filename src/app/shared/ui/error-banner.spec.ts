import { TestBed } from '@angular/core/testing';
import { ErrorBanner } from './error-banner';

describe('ErrorBanner', () => {
  it('announces the error and emits Retry once on activation', async () => {
    const fixture = TestBed.createComponent(ErrorBanner);
    fixture.componentRef.setInput('message', 'Unable to load the board');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Unable to load the board',
    );
    fixture.nativeElement.querySelector('button').click();
    expect(retry).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('retryable', false);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});

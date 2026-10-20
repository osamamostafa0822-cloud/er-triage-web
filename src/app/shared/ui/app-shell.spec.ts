import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('does not invent links or enable refresh when the host has no page connection', async () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('title', 'ER Triage Board');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav a')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Refresh"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('time').getAttribute('datetime')).toBeTruthy();
    const collapse = fixture.nativeElement.querySelector(
      'button[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement;
    collapse.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.shell.collapsed')).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('button[aria-label="Expand sidebar"]')
        .getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('uses only host-supplied routes and emits refresh when explicitly enabled', async () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('title', 'Triage Board');
    fixture.componentRef.setInput('boardHref', '/');
    fixture.componentRef.setInput('registerHref', '/register');
    fixture.componentRef.setInput('refreshEnabled', true);
    const refresh = vi.fn();
    fixture.componentInstance.refresh.subscribe(refresh);
    await fixture.whenStable();
    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>,
      (anchor) => anchor.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/', '/register', '/', '/register']);
    fixture.nativeElement.querySelector('button[aria-label="Refresh"]').click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

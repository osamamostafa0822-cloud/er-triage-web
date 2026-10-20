import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppShell } from './app-shell';

describe('AppShell', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('does not invent links or render a refresh button', async () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('title', 'ER Triage Board');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav a')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Refresh"]')).toBeNull();
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

  it('uses only host-supplied routes', async () => {
    const fixture = TestBed.createComponent(AppShell);
    fixture.componentRef.setInput('title', 'Triage Board');
    fixture.componentRef.setInput('boardHref', '/');
    fixture.componentRef.setInput('registerHref', '/register');
    await fixture.whenStable();
    const hrefs = Array.from(
      fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>,
      (anchor) => anchor.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/', '/register', '/', '/register']);
  });
});

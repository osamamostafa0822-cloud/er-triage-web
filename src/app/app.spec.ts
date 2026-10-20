import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the application title and the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('ER Triage Board');
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('switches translations and document direction between Arabic and English', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('select')!;

    select.value = 'ar';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(compiled.querySelector('h1')?.textContent).toContain('لوحة فرز حالات الطوارئ');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe('لوحة فرز حالات الطوارئ');

    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(compiled.querySelector('h1')?.textContent).toContain('ER Triage Board');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.title).toBe('ER Triage Board');
  });
});

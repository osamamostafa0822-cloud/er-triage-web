import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { LoadingService } from './core/http/loading.service';
import { routes } from './app.routes';

afterEach(() => localStorage.removeItem('er-triage.language'));

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

  it('enables both board and registration navigation for the implemented routes', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = fixture.nativeElement.querySelectorAll('nav a') as NodeListOf<HTMLAnchorElement>;
    expect(Array.from(links, (link) => link.getAttribute('href'))).toEqual([
      '/',
      '/register',
      '/',
      '/register',
    ]);
    expect(fixture.nativeElement.querySelector('footer')?.textContent).toContain('fictional');
  });

  it('should render the application title and the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('ER Triage Board');
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('connects global loading to the visible indicator and main content accessibility state', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const loading = TestBed.inject(LoadingService);
    expect(element.querySelector('main')?.getAttribute('aria-busy')).toBe('false');
    expect(element.querySelector('.loading-track')).toBeNull();
    const finish = loading.beginRequest();
    await fixture.whenStable();
    expect(element.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('.loading-track')).not.toBeNull();
    finish();
    await fixture.whenStable();
    expect(element.querySelector('main')?.getAttribute('aria-busy')).toBe('false');
    expect(element.querySelector('.loading-track')).toBeNull();
  });

  it('switches translations and document direction between Arabic and English', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const languageButton = compiled.querySelector<HTMLButtonElement>('.language-control')!;

    languageButton.click();
    await fixture.whenStable();

    expect(compiled.querySelector('h1')?.textContent).toContain('لوحة فرز حالات الطوارئ');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe('لوحة فرز حالات الطوارئ');

    languageButton.click();
    await fixture.whenStable();

    expect(compiled.querySelector('h1')?.textContent).toContain('ER Triage Board');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.title).toBe('ER Triage Board');
  });
});

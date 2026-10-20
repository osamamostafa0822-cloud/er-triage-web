import { TestBed } from '@angular/core/testing';
import { TranslationService } from '../../i18n/translation.service';
import { LoadingIndicator } from './loading-indicator';

afterEach(() => localStorage.removeItem('er-triage.language'));

describe('LoadingIndicator', () => {
  it('announces active loading and clears both the indicator and message when idle', async () => {
    const fixture = TestBed.createComponent(LoadingIndicator);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const status = element.querySelector('[role="status"]')!;
    expect(status.textContent?.trim()).toBe('');
    expect(element.querySelector('.loading-track')).toBeNull();

    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();
    expect(status.textContent?.trim()).toBe('Loading');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(element.querySelector('.loading-track')?.getAttribute('aria-hidden')).toBe('true');

    fixture.componentRef.setInput('active', false);
    await fixture.whenStable();
    expect(status.textContent?.trim()).toBe('');
    expect(element.querySelector('.loading-track')).toBeNull();
  });

  it('updates the accessible announcement when the active UI changes to Arabic', async () => {
    const fixture = TestBed.createComponent(LoadingIndicator);
    fixture.componentRef.setInput('active', true);
    await fixture.whenStable();
    TestBed.inject(TranslationService).setLanguage('ar');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent.trim()).toBe(
      'جارٍ التحميل',
    );
  });
});

import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('TranslationService language preference', () => {
  const key = 'er-triage.language';
  beforeEach(() => localStorage.removeItem(key));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(key);
  });

  it('defaults to English when no preference exists', () => {
    expect(TestBed.inject(TranslationService).language()).toBe('en');
  });

  it('restores Arabic and applies RTL and translated title', () => {
    localStorage.setItem(key, 'ar');
    const service = TestBed.inject(TranslationService);
    TestBed.flushEffects();
    expect(service.language()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe(service.messages().appTitle);
  });

  it.each(['ar', 'en'])('retains %s across a fresh application injector', (language) => {
    TestBed.inject(TranslationService).setLanguage(language);
    expect(localStorage.getItem(key)).toBe(language);
    TestBed.resetTestingModule();
    expect(TestBed.inject(TranslationService).language()).toBe(language);
  });

  it('rejects unsupported saved and supplied languages', () => {
    localStorage.setItem(key, 'invalid');
    const service = TestBed.inject(TranslationService);
    expect(service.language()).toBe('en');
    service.setLanguage('invalid');
    expect(service.language()).toBe('en');
    expect(localStorage.getItem(key)).toBe('invalid');
  });

  it('falls back to English when storage reads are blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(TestBed.inject(TranslationService).language()).toBe('en');
  });

  it('still switches the current language when storage writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const service = TestBed.inject(TranslationService);
    expect(() => service.setLanguage('ar')).not.toThrow();
    expect(service.language()).toBe('ar');
  });
});

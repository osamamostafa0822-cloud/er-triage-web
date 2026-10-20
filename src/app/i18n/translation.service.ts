import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import ar from './ar.json';
import en from './en.json';

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<TranslationKey, string>> = { en, ar };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);
  private readonly selectedLanguage = signal<Language>(this.restoreLanguage());
  readonly language = this.selectedLanguage.asReadonly();
  readonly messages = computed(() => translations[this.language()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.language();
      this.document.documentElement.dir = this.language() === 'ar' ? 'rtl' : 'ltr';
      this.document.title = this.messages().appTitle;
    });
  }

  setLanguage(language: string): void {
    if (language === 'en' || language === 'ar') {
      this.selectedLanguage.set(language);
      try {
        this.document.defaultView?.localStorage.setItem('er-triage.language', language);
      } catch {
        // Storage can be blocked; keep the current in-memory language usable.
        return;
      }
    }
  }

  private restoreLanguage(): Language {
    try {
      return this.document.defaultView?.localStorage.getItem('er-triage.language') === 'ar'
        ? 'ar'
        : 'en';
    } catch {
      return 'en';
    }
  }
}

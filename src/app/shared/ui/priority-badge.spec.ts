import { TestBed } from '@angular/core/testing';
import { PriorityBadge, Priority } from './priority-badge';
import { TranslationService } from '../../i18n/translation.service';

describe('PriorityBadge', () => {
  it.each([
    [1, 'Critical'],
    [2, 'High'],
    [3, 'Moderate'],
    [4, 'Low'],
  ] as const)(
    'renders P%s with a text label and a decorative dot',
    async (priority: Priority, label) => {
      const fixture = TestBed.createComponent(PriorityBadge);
      fixture.componentRef.setInput('priority', priority);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain(`P${priority} — ${label}`);
      expect(element.querySelector(`.priority-${priority} .dot`)?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    },
  );

  it('updates an existing badge when the language changes', async () => {
    const fixture = TestBed.createComponent(PriorityBadge);
    fixture.componentRef.setInput('priority', 1);
    await fixture.whenStable();
    TestBed.inject(TranslationService).setLanguage('ar');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('حرجة');
  });
});

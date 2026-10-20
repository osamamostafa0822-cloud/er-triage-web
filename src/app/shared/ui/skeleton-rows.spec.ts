import { TestBed } from '@angular/core/testing';
import { SkeletonRows } from './skeleton-rows';

describe('SkeletonRows', () => {
  it('announces loading once and hides decorative rows from assistive technology', async () => {
    const fixture = TestBed.createComponent(SkeletonRows);
    fixture.componentRef.setInput('count', 3);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
    expect(element.textContent).toContain('Loading');
    expect(element.querySelectorAll('[aria-hidden="true"] .skeleton-row').length).toBe(3);
  });
});

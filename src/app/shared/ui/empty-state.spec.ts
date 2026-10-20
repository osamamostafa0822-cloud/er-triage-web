import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('displays supplied copy and treats markup as text', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'No patients in queue');
    fixture.componentRef.setInput('description', '<b>Try again later</b>');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('No patients in queue');
    expect(fixture.nativeElement.querySelector('p').textContent).toBe('<b>Try again later</b>');
    expect(fixture.nativeElement.querySelector('b')).toBeNull();
  });
});

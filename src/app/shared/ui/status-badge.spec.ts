import { TestBed } from '@angular/core/testing';
import { PatientStatus, StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['Waiting', 'Waiting', 'waiting'],
    ['InTreatment', 'In Treatment', 'in-treatment'],
    ['Discharged', 'Discharged', 'discharged'],
    ['Admitted', 'Admitted', 'admitted'],
  ] as const)(
    'renders the API status %s as readable text',
    async (status: PatientStatus, label, className) => {
      const fixture = TestBed.createComponent(StatusBadge);
      fixture.componentRef.setInput('status', status);
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain(label);
      expect(fixture.nativeElement.querySelector(`.${className}`)).not.toBeNull();
    },
  );
});

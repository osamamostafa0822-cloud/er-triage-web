import { TestBed } from '@angular/core/testing';
import { WaitingIndicator } from './waiting-indicator';

describe('WaitingIndicator', () => {
  it.each([
    [0, '0 min'],
    [12, '12 min'],
    [60, '1 h 00 m'],
    [65, '1 h 05 m'],
    [125, '2 h 05 m'],
  ] as const)('formats %s API minutes', async (minutes, expected) => {
    const fixture = TestBed.createComponent(WaitingIndicator);
    fixture.componentRef.setInput('waitingMinutes', minutes);
    fixture.componentRef.setInput('waitingLevel', 'Normal');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(expected);
  });

  it('uses the API level without deriving a level from minutes', async () => {
    const fixture = TestBed.createComponent(WaitingIndicator);
    fixture.componentRef.setInput('waitingMinutes', 120);
    fixture.componentRef.setInput('waitingLevel', 'Normal');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.level-Normal')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Waiting');
    fixture.componentRef.setInput('waitingLevel', 'Warning');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Warning');
    fixture.componentRef.setInput('waitingLevel', 'Critical');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Critical');
  });

  it('shows frozen minutes for None and a dash for null', async () => {
    const fixture = TestBed.createComponent(WaitingIndicator);
    fixture.componentRef.setInput('waitingMinutes', 40);
    fixture.componentRef.setInput('waitingLevel', 'None');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('40 min');
    expect(fixture.nativeElement.textContent).toContain('Waited');
    fixture.componentRef.setInput('waitingMinutes', null);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('—');
    expect(fixture.nativeElement.textContent).toContain('Not applicable');
    expect(fixture.nativeElement.textContent).not.toContain('Waited');
  });
});

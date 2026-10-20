import type { ApiFieldError } from '../../../core/models/general-response';
import {
  createRegistrationForm,
  buildRegistrationRequest,
  registrationFieldControls,
} from './register-patient.form';
import {
  applyRegistrationServerErrors,
  clearRegistrationServerErrors,
} from './registration-server-errors';

describe('registration server error mapping', () => {
  const clock = () => new Date(2026, 9, 20, 12, 30);

  it('maps every flat API field to its actual control, including nested vitals', () => {
    const form = createRegistrationForm(clock);
    const controls = registrationFieldControls(form);
    const errors: ApiFieldError[] = Object.keys(controls).map((field) => ({
      field,
      message: `Server error for ${field}`,
    }));
    expect(applyRegistrationServerErrors(form, errors)).toEqual([]);
    for (const [field, control] of Object.entries(controls)) {
      expect(control.getError('server')).toEqual([`Server error for ${field}`]);
      expect(control.touched).toBe(true);
      expect(control.pristine).toBe(true);
    }
    expect(form.invalid).toBe(true);
  });

  it('preserves multiple messages for a field and clears only that edited field', () => {
    const form = createRegistrationForm(clock);
    form.controls.age.setValue(42);
    form.controls.vitals.controls.heartRate.setValue(80);
    applyRegistrationServerErrors(form, [
      { field: 'heartRate', message: 'First' },
      { field: 'heartRate', message: 'Second' },
      { field: 'age', message: 'Keep until age is edited' },
    ]);
    expect(form.controls.vitals.controls.heartRate.getError('server')).toEqual(['First', 'Second']);
    form.controls.vitals.controls.heartRate.setValue(81);
    expect(form.controls.vitals.controls.heartRate.errors).toBeNull();
    expect(form.controls.age.getError('server')).toEqual(['Keep until age is edited']);
  });

  it('recomputes client errors when an edited value is still invalid', () => {
    const form = createRegistrationForm(clock);
    const control = form.controls.vitals.controls.heartRate;
    control.setValue(80);
    applyRegistrationServerErrors(form, [{ field: 'heartRate', message: 'Server message' }]);
    control.setValue(null);
    expect(control.hasError('server')).toBe(false);
    expect(control.hasError('required')).toBe(true);
  });

  it('returns null/unknown/path/prototype fields for the banner without traversing the form', () => {
    const form = createRegistrationForm(clock);
    const errors: ApiFieldError[] = [
      { field: null, message: 'Request issue' },
      { field: 'unknown', message: 'Unknown field' },
      { field: 'vitals', message: 'Group issue' },
      { field: 'vitals.heartRate', message: 'Unmatched path' },
      { field: '__proto__', message: 'Not a control' },
      { field: 'constructor', message: 'Not a control' },
    ];
    expect(applyRegistrationServerErrors(form, errors)).toEqual(errors);
    expect(form.controls.vitals.hasError('server')).toBe(false);
    expect(form.controls.vitals.controls.heartRate.hasError('server')).toBe(false);
  });

  it('clears or replaces server errors without dropping client validators', () => {
    const form = createRegistrationForm(clock);
    applyRegistrationServerErrors(form, [
      { field: 'fullName', message: 'Old name error' },
      { field: 'age', message: 'Old age error' },
    ]);
    expect(form.controls.fullName.hasError('required')).toBe(true);
    applyRegistrationServerErrors(form, [{ field: 'age', message: 'New age error' }]);
    expect(form.controls.fullName.hasError('server')).toBe(false);
    expect(form.controls.fullName.hasError('required')).toBe(true);
    expect(form.controls.age.getError('server')).toEqual(['New age error']);
    clearRegistrationServerErrors(form);
    expect(form.controls.age.hasError('server')).toBe(false);
    expect(form.controls.age.hasError('required')).toBe(true);
  });

  it('does not overwrite a diastolic server error when systolic BP triggers group validation', () => {
    const form = createRegistrationForm(clock);
    const vitals = form.controls.vitals;
    vitals.controls.systolicBp.setValue(120);
    vitals.controls.diastolicBp.setValue(120);
    applyRegistrationServerErrors(form, [{ field: 'diastolicBp', message: 'Server BP error' }]);
    expect(vitals.hasError('bloodPressureOrder')).toBe(true);
    vitals.controls.systolicBp.setValue(140);
    expect(vitals.hasError('bloodPressureOrder')).toBe(false);
    expect(vitals.controls.diastolicBp.getError('server')).toEqual(['Server BP error']);
    expect(buildRegistrationRequest(form)).toBeNull();
  });
});

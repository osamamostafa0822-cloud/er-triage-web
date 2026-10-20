import {
  createRegistrationForm,
  buildRegistrationRequest,
  RegistrationForm,
  VitalSignsControls,
} from './register-patient.form';
import { formatLocalArrival } from './registration-datetime';

describe('registration form and request mapping', () => {
  const now = new Date(2026, 9, 20, 12, 30);
  function validForm(clock = () => new Date(now)): RegistrationForm {
    const form = createRegistrationForm(clock);
    form.setValue({
      fullName: '  Fictional Test Patient  ',
      age: 42,
      chiefComplaint: '  Fictional complaint  ',
      vitals: { heartRate: 80, systolicBp: 120, diastolicBp: 80, temperatureC: 37.1, spO2: 98 },
      arrivalTime: formatLocalArrival(now),
    });
    return form;
  }

  it('starts with empty required fields, nullable numbers and a browser-local arrival value', () => {
    const form = createRegistrationForm(() => new Date(now));
    expect(form.controls.fullName.value).toBe('');
    expect(form.controls.age.value).toBeNull();
    expect(form.controls.vitals.controls.heartRate.value).toBeNull();
    expect(form.controls.arrivalTime.value).toBe('2026-10-20T12:30');
    expect(form.invalid).toBe(true);
    expect(buildRegistrationRequest(form)).toBeNull();
  });

  const textCases = ([{ field: 'chiefComplaint', min: 2, max: 200 }] as const).flatMap(
    ({ field, min, max }) => [
      { field, value: 'x'.repeat(min - 1), error: 'minlength' },
      { field, value: 'x'.repeat(min), error: null },
      { field, value: 'x'.repeat(max), error: null },
      { field, value: 'x'.repeat(max + 1), error: 'maxlength' },
      { field, value: ' \t\n ', error: 'required' },
      { field, value: '', error: 'required' },
      { field, value: '  س م  ', error: null },
    ],
  );
  it.each(textCases)(
    'validates trimmed $field length without modifying the value ($error)',
    ({ field, value, error }) => {
      const control = validForm().controls[field];
      control.setValue(value);
      expect(control.value).toBe(value);
      expect(control.valid).toBe(error === null);
      if (error) expect(control.hasError(error)).toBe(true);
    },
  );

  it.each([
    ['', 'required'],
    ['x', 'minlength'],
    ['Fictional Patient', 'minWords'],
    ['  Fictional   Patient  ', 'minWords'],
    ['Fictional Test Patient', null],
    ['  أحمد\tمحمد\nعلي  ', null],
    ['أحمد محمد علي حسن', null],
    ['x'.repeat(96) + ' a b', null],
    ['x'.repeat(97) + ' a b', 'maxlength'],
  ] as const)(
    'checks full-name length and at least three whitespace-separated words: %s',
    (value, error) => {
      const form = validForm();
      form.controls.fullName.setValue(value);
      expect(form.controls.fullName.value).toBe(value);
      expect(form.controls.fullName.valid).toBe(error === null);
      if (error) {
        expect(form.controls.fullName.hasError(error)).toBe(true);
        expect(buildRegistrationRequest(form)).toBeNull();
      }
    },
  );

  type IntegerField = 'age' | Exclude<keyof VitalSignsControls, 'temperatureC'>;
  const ranges: readonly { field: IntegerField; min: number; max: number }[] = [
    { field: 'age', min: 0, max: 120 },
    { field: 'heartRate', min: 20, max: 250 },
    { field: 'systolicBp', min: 50, max: 300 },
    { field: 'diastolicBp', min: 20, max: 200 },
    { field: 'spO2', min: 50, max: 100 },
  ];
  const numericCases = ranges.flatMap(({ field, min, max }) => [
    { field, value: min - 1, error: 'min' },
    { field, value: min, error: null },
    { field, value: max, error: null },
    { field, value: max + 1, error: 'max' },
    { field, value: null, error: 'required' },
    { field, value: min + 0.5, error: 'integer' },
  ]);
  it.each(numericCases)('validates $field at $value ($error)', ({ field, value, error }) => {
    const form = validForm();
    const control = field === 'age' ? form.controls.age : form.controls.vitals.controls[field];
    control.setValue(value);
    expect(control.valid).toBe(error === null);
    if (error) expect(control.hasError(error)).toBe(true);
  });

  it.each([
    [29.9, 'min'],
    [30, null],
    [45, null],
    [45.1, 'max'],
    [37.15, 'decimalPlaces'],
    [37.1, null],
    [37.3, null],
    [37.300000000000004, null],
    [37.100000001, 'decimalPlaces'],
    [NaN, 'number'],
    [Infinity, 'number'],
    [null, 'required'],
  ] as const)('validates temperature %s (%s)', (value, error) => {
    const control = validForm().controls.vitals.controls.temperatureC;
    control.setValue(value);
    expect(control.valid).toBe(error === null);
    if (error) expect(control.hasError(error)).toBe(true);
  });

  it.each([
    { systolic: 120, diastolic: 80, orderError: false },
    { systolic: 120, diastolic: 120, orderError: true },
    { systolic: 120, diastolic: 121, orderError: true },
    { systolic: 50, diastolic: 20, orderError: false },
    { systolic: 300, diastolic: 200, orderError: false },
    { systolic: null, diastolic: 80, orderError: false },
    { systolic: 120, diastolic: null, orderError: false },
    { systolic: 49, diastolic: 80, orderError: false },
    { systolic: 120, diastolic: 201, orderError: false },
    { systolic: 120.5, diastolic: 121, orderError: false },
  ])(
    'checks BP order only for individually valid readings: $systolic/$diastolic',
    ({ systolic, diastolic, orderError }) => {
      const group = validForm().controls.vitals;
      group.controls.systolicBp.setValue(systolic);
      group.controls.diastolicBp.setValue(diastolic);
      expect(group.hasError('bloodPressureOrder')).toBe(orderError);
      expect(group.controls.diastolicBp.hasError('bloodPressureOrder')).toBe(false);
    },
  );

  it('clears the BP group error when the other pressure is corrected', () => {
    const group = validForm().controls.vitals;
    group.controls.diastolicBp.setValue(120);
    expect(group.hasError('bloodPressureOrder')).toBe(true);
    group.controls.systolicBp.setValue(140);
    expect(group.valid).toBe(true);
  });

  it.each([
    ['', 'required'],
    ['invalid', 'dateTime'],
    ['2026-02-30T12:30', 'dateTime'],
    ['2026-10-20T12:30Z', 'dateTime'],
    ['2026-10-20T12:30', null],
    ['2026-10-20T12:34', null],
    ['2026-10-20T12:35', null],
    ['2026-10-20T12:35:00.001', 'arrivalFuture'],
    ['2026-10-20T12:36', 'arrivalFuture'],
    ['2024-02-29T12:30', null],
  ] as const)('validates local arrival %s (%s)', (value, error) => {
    const control = validForm().controls.arrivalTime;
    control.setValue(value);
    expect(control.valid).toBe(error === null);
    if (error) expect(control.hasError(error)).toBe(true);
  });

  it('flattens validated values, trims text and converts local arrival to UTC without mutating the form', () => {
    const form = validForm();
    form.controls.age.setValue(0);
    form.controls.arrivalTime.setValue('2026-10-20T12:30:12.123');
    const original = form.getRawValue();
    expect(buildRegistrationRequest(form)).toEqual({
      fullName: 'Fictional Test Patient',
      age: 0,
      chiefComplaint: 'Fictional complaint',
      heartRate: 80,
      systolicBp: 120,
      diastolicBp: 80,
      temperatureC: 37.1,
      spO2: 98,
      arrivalTime: new Date(2026, 9, 20, 12, 30, 12, 123).toISOString(),
    });
    expect(form.getRawValue()).toEqual(original);
    expect(form.pristine).toBe(true);
    expect(form.untouched).toBe(true);
  });

  it('normalizes only validated binary temperature noise, never rounds invalid input into validity', () => {
    const form = validForm();
    form.controls.vitals.controls.temperatureC.setValue(37.300000000000004);
    expect(buildRegistrationRequest(form)?.temperatureC).toBe(37.3);
    expect(form.controls.vitals.controls.temperatureC.value).toBe(37.300000000000004);
    form.controls.vitals.controls.temperatureC.setValue(37.15);
    expect(buildRegistrationRequest(form)).toBeNull();
  });

  it.each(['disabled', 'disabled-field', 'pending'] as const)(
    'does not serialize a %s form',
    (state) => {
      const form = validForm();
      if (state === 'disabled') form.disable();
      if (state === 'disabled-field') form.controls.age.disable();
      if (state === 'pending') form.controls.age.markAsPending();
      expect(buildRegistrationRequest(form)).toBeNull();
    },
  );

  it('rechecks the current clock at serialization time and does not freeze time at form creation', () => {
    let clock = new Date(now);
    const form = validForm(() => new Date(clock));
    expect(form.valid).toBe(true);
    clock = new Date(now.getTime() - 6 * 60_000);
    expect(buildRegistrationRequest(form)).toBeNull();
    expect(form.controls.arrivalTime.hasError('arrivalFuture')).toBe(true);
    clock = new Date(now);
    expect(buildRegistrationRequest(form)).not.toBeNull();
  });

  it('never clears an unedited server error while refreshing arrival validation', () => {
    const form = validForm();
    form.controls.arrivalTime.setErrors({ server: ['Server clock rejected this arrival.'] });
    expect(buildRegistrationRequest(form)).toBeNull();
    expect(form.controls.arrivalTime.getError('server')).toEqual([
      'Server clock rejected this arrival.',
    ]);
  });
});

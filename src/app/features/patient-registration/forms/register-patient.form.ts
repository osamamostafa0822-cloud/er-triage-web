import { FormControl, FormGroup } from '@angular/forms';
import type { RegisterPatientRequest } from '../../../core/models/patient-requests';
import { formatLocalArrival, parseLocalArrival, RegistrationClock } from './registration-datetime';
import { registrationLimits as limits } from './registration-limits';
import {
  arrivalTimeValidator,
  bloodPressureOrder,
  fullNameValidator,
  numberInRange,
  temperaturePrecision,
  trimmedLength,
} from './registration.validators';

export interface VitalSignsControls {
  heartRate: FormControl<number | null>;
  systolicBp: FormControl<number | null>;
  diastolicBp: FormControl<number | null>;
  temperatureC: FormControl<number | null>;
  spO2: FormControl<number | null>;
}
export interface RegistrationControls {
  fullName: FormControl<string>;
  age: FormControl<number | null>;
  chiefComplaint: FormControl<string>;
  vitals: FormGroup<VitalSignsControls>;
  arrivalTime: FormControl<string>;
}
export type RegistrationForm = FormGroup<RegistrationControls>;
export type RegistrationFieldControl = FormControl<string> | FormControl<number | null>;
export type ValidatedRegistrationRequest = {
  readonly [Key in keyof RegisterPatientRequest]: NonNullable<RegisterPatientRequest[Key]>;
};

export function createRegistrationForm(
  now: RegistrationClock = () => new Date(),
): RegistrationForm {
  const numberControl = (min: number, max: number) =>
    new FormControl<number | null>(null, { validators: numberInRange(min, max) });

  return new FormGroup<RegistrationControls>(
    {
      fullName: new FormControl('', {
        nonNullable: true,
        validators: fullNameValidator,
      }),
      age: numberControl(limits.age.min, limits.age.max),
      chiefComplaint: new FormControl('', {
        nonNullable: true,
        validators: trimmedLength(limits.chiefComplaint.min, limits.chiefComplaint.max),
      }),
      vitals: new FormGroup<VitalSignsControls>(
        {
          heartRate: numberControl(limits.heartRate.min, limits.heartRate.max),
          systolicBp: numberControl(limits.systolicBp.min, limits.systolicBp.max),
          diastolicBp: numberControl(limits.diastolicBp.min, limits.diastolicBp.max),
          temperatureC: new FormControl<number | null>(null, { validators: temperaturePrecision }),
          spO2: numberControl(limits.spO2.min, limits.spO2.max),
        },
        { validators: bloodPressureOrder },
      ),
      arrivalTime: new FormControl(formatLocalArrival(now()), {
        nonNullable: true,
        validators: arrivalTimeValidator(now),
      }),
    },
    { updateOn: 'change' },
  );
}

/** Explicit API-to-form mapping: no traversal of arbitrary server-supplied control paths. */
export function registrationFieldControls(
  form: RegistrationForm,
): Readonly<Record<keyof RegisterPatientRequest, RegistrationFieldControl>> {
  return {
    fullName: form.controls.fullName,
    age: form.controls.age,
    chiefComplaint: form.controls.chiefComplaint,
    ...form.controls.vitals.controls,
    arrivalTime: form.controls.arrivalTime,
  };
}

/** No HTTP, touched-state changes or silent repair of invalid input. */
export function buildRegistrationRequest(
  form: RegistrationForm,
): ValidatedRegistrationRequest | null {
  if (
    form.disabled ||
    form.pending ||
    Object.values(registrationFieldControls(form)).some((control) => control.disabled)
  ) {
    return null;
  }
  // Refresh the clock-dependent client check, but never clear an unedited server error.
  const arrivalControl = form.controls.arrivalTime;
  if (!arrivalControl.hasError('server'))
    arrivalControl.updateValueAndValidity({ emitEvent: false });
  if (!form.valid) return null;

  const value = form.getRawValue();
  const vitals = value.vitals;
  const arrival = parseLocalArrival(value.arrivalTime);
  if (
    !arrival ||
    value.age === null ||
    vitals.heartRate === null ||
    vitals.systolicBp === null ||
    vitals.diastolicBp === null ||
    vitals.temperatureC === null ||
    vitals.spO2 === null
  )
    return null;

  return {
    fullName: value.fullName.trim(),
    age: value.age,
    chiefComplaint: value.chiefComplaint.trim(),
    heartRate: vitals.heartRate,
    systolicBp: vitals.systolicBp,
    diastolicBp: vitals.diastolicBp,
    // Already validated: remove tolerated binary noise, not genuine extra decimal places.
    temperatureC: Math.round(vitals.temperatureC * 10) / 10,
    spO2: vitals.spO2,
    arrivalTime: arrival.toISOString(),
  };
}

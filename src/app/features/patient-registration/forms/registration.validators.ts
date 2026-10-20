import type { ValidatorFn } from '@angular/forms';
import { parseLocalArrival, RegistrationClock } from './registration-datetime';
import { registrationLimits as limits } from './registration-limits';

export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control) => {
    const value: unknown = control.value;
    if (typeof value !== 'string' || value.trim().length === 0) return { required: true };
    const actualLength = value.trim().length;
    if (actualLength < min) return { minlength: { requiredLength: min, actualLength } };
    if (actualLength > max) return { maxlength: { requiredLength: max, actualLength } };
    return null;
  };
}

export const fullNameValidator: ValidatorFn = (control) => {
  const lengthError = trimmedLength(limits.fullName.min, limits.fullName.max)(control);
  if (lengthError) return lengthError;
  const value: unknown = control.value;
  const actualWords = typeof value === 'string' ? value.trim().split(/\s+/u).length : 0;
  return actualWords < limits.fullName.minWords
    ? { minWords: { requiredWords: limits.fullName.minWords, actualWords } }
    : null;
};

export function numberInRange(min: number, max: number, integer = true): ValidatorFn {
  return (control) => {
    const value: unknown = control.value;
    if (value === null || value === undefined || value === '') return { required: true };
    if (typeof value !== 'number' || !Number.isFinite(value)) return { number: true };
    if (integer && !Number.isInteger(value)) return { integer: true };
    if (value < min) return { min: { min, actual: value } };
    if (value > max) return { max: { max, actual: value } };
    return null;
  };
}

const temperatureRange = numberInRange(limits.temperatureC.min, limits.temperatureC.max, false);
export const temperaturePrecision: ValidatorFn = (control) => {
  const rangeError = temperatureRange(control);
  if (rangeError) return rangeError;
  const value: unknown = control.value;
  if (typeof value !== 'number') return { number: true };
  const scaled = value * 10;
  // Permit only binary floating-point noise, never a genuine second decimal such as 37.15.
  return Math.abs(scaled - Math.round(scaled)) > Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4
    ? { decimalPlaces: { max: 1 } }
    : null;
};

const systolicRange = numberInRange(limits.systolicBp.min, limits.systolicBp.max);
const diastolicRange = numberInRange(limits.diastolicBp.min, limits.diastolicBp.max);

/** Group error; F5 displays it under diastolic BP without overwriting either child's errors. */
export const bloodPressureOrder: ValidatorFn = (group) => {
  const systolic = group.get('systolicBp');
  const diastolic = group.get('diastolicBp');
  if (!systolic || !diastolic || systolicRange(systolic) || diastolicRange(diastolic)) return null;
  const systolicValue: unknown = systolic.value;
  const diastolicValue: unknown = diastolic.value;
  return typeof systolicValue === 'number' &&
    typeof diastolicValue === 'number' &&
    diastolicValue >= systolicValue
    ? { bloodPressureOrder: true }
    : null;
};

export function arrivalTimeValidator(now: RegistrationClock): ValidatorFn {
  return (control) => {
    const value: unknown = control.value;
    if (value === null || value === undefined || value === '') return { required: true };
    const arrival = parseLocalArrival(value);
    const currentTime = now().getTime();
    if (!arrival || !Number.isFinite(currentTime)) return { dateTime: true };
    return arrival.getTime() > currentTime + limits.arrivalFutureToleranceMinutes * 60_000
      ? { arrivalFuture: { maxMinutes: limits.arrivalFutureToleranceMinutes } }
      : null;
  };
}

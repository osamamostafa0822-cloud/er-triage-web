import type { ValidatorFn } from '@angular/forms';

/**
 * Trimmed text must be present (`required`) and between `min` and `max` characters
 * (`minlength` / `maxlength`, same shape as Angular's built-in validators). Shared by every feature form.
 */
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

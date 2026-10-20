import type { ApiFieldError } from '../../../core/models/general-response';
import { registrationFieldControls, RegistrationForm } from './register-patient.form';

/** Remove server messages only; preserve client-validator errors. */
export function clearRegistrationServerErrors(form: RegistrationForm): void {
  for (const control of Object.values(registrationFieldControls(form))) {
    if (!control.errors || !Object.hasOwn(control.errors, 'server')) continue;
    const remaining = { ...control.errors };
    delete remaining['server'];
    control.setErrors(Object.keys(remaining).length ? remaining : null);
  }
}

/** Return non-field/unknown errors for the future page's banner; never discard them. */
export function applyRegistrationServerErrors(
  form: RegistrationForm,
  errors: readonly ApiFieldError[],
): readonly ApiFieldError[] {
  clearRegistrationServerErrors(form);
  const controls = new Map(Object.entries(registrationFieldControls(form)));
  const messages = new Map<string, string[]>();
  const banner: ApiFieldError[] = [];

  for (const error of errors) {
    if (error.field === null || !controls.has(error.field)) {
      banner.push(error);
      continue;
    }
    const previous = messages.get(error.field) ?? [];
    previous.push(error.message);
    messages.set(error.field, previous);
  }

  for (const [field, server] of messages) {
    const control = controls.get(field);
    if (!control) continue;
    control.setErrors({ ...control.errors, server });
    control.markAsTouched();
  }
  // Default updateOn:'change' validators naturally replace manual server errors when that field is edited.
  // No valueChanges subscriptions, global listener or lifecycle cleanup is needed.
  return banner;
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ApiError } from '../../core/http/api-error';
import type { ApiFieldError } from '../../core/models/general-response';
import type { PatientDto } from '../../core/models/patient';
import type { RegisterPatientRequest } from '../../core/models/patient-requests';
import { TranslationService, TranslationKey } from '../../i18n/translation.service';
import { ErrorBanner } from '../../shared/ui/error-banner';
import { PriorityBadge } from '../../shared/ui/priority-badge';
import { StatusBadge } from '../../shared/ui/status-badge';
import {
  buildRegistrationRequest,
  createRegistrationForm,
  registrationFieldControls,
} from './forms/register-patient.form';
import { formatLocalArrival } from './forms/registration-datetime';
import { registrationLimits as limits } from './forms/registration-limits';
import { applyRegistrationServerErrors } from './forms/registration-server-errors';
import { PatientRegistrationApiService } from './services/patient-registration-api.service';

type FieldName = keyof RegisterPatientRequest;
interface Field {
  readonly name: FieldName;
  readonly label: TranslationKey;
  readonly type: 'text' | 'number' | 'datetime-local' | 'textarea';
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: string;
  readonly wide?: boolean;
}

@Component({
  selector: 'app-patient-registration',
  imports: [ReactiveFormsModule, ErrorBanner, PriorityBadge, StatusBadge],
  templateUrl: './patient-registration.html',
  styleUrl: './patient-registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientRegistration {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(PatientRegistrationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  protected readonly form = createRegistrationForm();
  protected readonly controls = registrationFieldControls(this.form);
  private readonly formEvents = toSignal(this.form.events, { initialValue: null });
  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('registrationForm');
  protected readonly submitting = signal(false);
  protected readonly attempted = signal(false);
  protected readonly patient = signal<PatientDto | null>(null);
  protected readonly failure = signal<ApiError | null>(null);
  protected readonly bannerErrors = signal<readonly ApiFieldError[]>([]);
  protected readonly sections: readonly {
    readonly title: TranslationKey;
    readonly fields: readonly Field[];
  }[] = [
    {
      title: 'patientInformation',
      fields: [
        { name: 'fullName', label: 'fullName', type: 'text' },
        { name: 'age', label: 'age', type: 'number', ...limits.age },
        { name: 'chiefComplaint', label: 'chiefComplaint', type: 'textarea', wide: true },
        {
          name: 'arrivalTime',
          label: 'arrivalTime',
          type: 'datetime-local',
          wide: true,
        },
      ],
    },
    {
      title: 'vitalSigns',
      fields: [
        { name: 'heartRate', label: 'heartRate', type: 'number', unit: 'bpm', ...limits.heartRate },
        { name: 'spO2', label: 'spO2', type: 'number', unit: '%', ...limits.spO2 },
        {
          name: 'systolicBp',
          label: 'systolicBp',
          type: 'number',
          unit: 'mmHg',
          ...limits.systolicBp,
        },
        {
          name: 'diastolicBp',
          label: 'diastolicBp',
          type: 'number',
          unit: 'mmHg',
          ...limits.diastolicBp,
        },
        {
          name: 'temperatureC',
          label: 'temperatureC',
          type: 'number',
          unit: '°C',
          step: '0.1',
          ...limits.temperatureC,
        },
      ],
    },
  ];
  protected readonly invalidCount = computed(() => {
    this.formEvents();
    return Object.entries(this.controls).filter(
      ([name, control]) =>
        control.invalid ||
        (name === 'diastolicBp' && this.form.controls.vitals.hasError('bloodPressureOrder')),
    ).length;
  });

  protected errors(name: FieldName): readonly string[] {
    this.formEvents();
    const control = this.controls[name];
    if (!control.touched) return [];
    const text = this.i18n.messages();
    const messages: string[] = [];
    const errors = control.errors ?? {};
    const interpolate = (template: string, value: unknown) =>
      template.replace('{value}', String(value));
    for (const key of Object.keys(errors)) {
      switch (key) {
        case 'required':
          messages.push(text.validationRequired);
          break;
        case 'minWords':
          messages.push(text.validationFullNameWords);
          break;
        case 'number':
          messages.push(text.validationNumber);
          break;
        case 'integer':
          messages.push(text.validationInteger);
          break;
        case 'min':
          messages.push(interpolate(text.validationMin, errors[key].min));
          break;
        case 'max':
          messages.push(interpolate(text.validationMax, errors[key].max));
          break;
        case 'minlength':
          messages.push(interpolate(text.validationMinLength, errors[key].requiredLength));
          break;
        case 'maxlength':
          messages.push(interpolate(text.validationMaxLength, errors[key].requiredLength));
          break;
        case 'decimalPlaces':
          messages.push(text.validationDecimal);
          break;
        case 'dateTime':
          messages.push(text.validationDateTime);
          break;
        case 'arrivalFuture':
          messages.push(text.validationArrivalFuture);
          break;
        case 'server': {
          const server: unknown = errors[key];
          if (Array.isArray(server))
            messages.push(
              ...server.filter((message): message is string => typeof message === 'string'),
            );
          break;
        }
      }
    }
    if (name === 'diastolicBp' && this.form.controls.vitals.hasError('bloodPressureOrder'))
      messages.push(text.validationBloodPressure);
    return messages;
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.attempted.set(true);
    const request = buildRegistrationRequest(this.form);
    if (!request) {
      this.form.markAllAsTouched();
      this.focusInvalid();
      return;
    }
    this.failure.set(null);
    this.bannerErrors.set([]);
    this.patient.set(null);
    this.submitting.set(true);
    this.api
      .register(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (patient) => {
          this.submitting.set(false);
          this.patient.set(patient);
          this.resetForm();
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const failure =
            error instanceof ApiError
              ? error
              : new ApiError(0, this.i18n.messages().apiNetworkError);
          this.failure.set(failure);
          this.bannerErrors.set(applyRegistrationServerErrors(this.form, failure.errors));
          // Native fieldset must be enabled in the DOM before its input can receive focus.
          afterNextRender(() => this.focusInvalid(), { injector: this.injector });
        },
      });
  }

  protected startAnother(): void {
    if (this.submitting()) return;
    this.patient.set(null);
    this.failure.set(null);
    this.bannerErrors.set([]);
    this.resetForm();
    this.formElement()?.nativeElement.querySelector<HTMLInputElement>('#field-fullName')?.focus();
  }

  private resetForm(): void {
    this.form.reset({ arrivalTime: formatLocalArrival(new Date()) });
    this.attempted.set(false);
  }

  private focusInvalid(): void {
    const field = this.sections
      .flatMap((section) => section.fields)
      .find(
        ({ name }) =>
          this.controls[name].invalid ||
          (name === 'diastolicBp' && this.form.controls.vitals.hasError('bloodPressureOrder')),
      )?.name;
    if (field)
      this.formElement()
        ?.nativeElement.querySelector<HTMLElement>('#field-' + field)
        ?.focus();
  }
}

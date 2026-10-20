import { CdkTrapFocus } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiError } from '../../../core/http/api-error';
import type { PatientDto, PatientStatus, TriagePriority } from '../../../core/models/patient';
import type { TriageBoardItemDto } from '../../../core/models/triage-board';
import { TranslationService } from '../../../i18n/translation.service';
import { trimmedLength } from '../../../shared/forms/text-validators';
import { PriorityBadge } from '../../../shared/ui/priority-badge';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { PatientWorkflowApiService } from '../services/patient-workflow-api.service';
import { actionLimits } from './action-limits';
import type { PatientAction, PatientActionOutcome } from './patient-action';

let nextDialogId = 0;

/**
 * One modal for both write actions of the board: a status change (a disposition note is required for Discharged and
 * Admitted) and a priority override (a reason is required). It owns the typed form and the submit state, keeps the
 * dialog open with the server's message on failure, and tells the board when the data it showed is stale (404/409).
 */
@Component({
  selector: 'app-patient-action-dialog',
  imports: [CdkTrapFocus, NgTemplateOutlet, ReactiveFormsModule, PriorityBadge, StatusBadge],
  templateUrl: './patient-action-dialog.html',
  styleUrl: './patient-action-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'requestClose()' },
})
export class PatientActionDialog {
  readonly patient = input.required<TriageBoardItemDto>();
  readonly action = input.required<PatientAction>();
  readonly closed = output<void>();
  readonly completed = output<PatientActionOutcome>();
  /** The server rejected the change because the patient is no longer as the board showed (404/409). */
  readonly stale = output<void>();

  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(PatientWorkflowApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly titleId = `patient-action-title-${nextDialogId++}`;
  protected readonly limits = actionLimits;
  protected readonly priorities: readonly TriagePriority[] = [1, 2, 3, 4];
  protected readonly submitting = signal(false);
  protected readonly failure = signal<ApiError | null>(null);

  protected readonly noteForm = new FormGroup({
    note: new FormControl('', {
      nonNullable: true,
      validators: [
        trimmedLength(actionLimits.dispositionNote.min, actionLimits.dispositionNote.max),
      ],
    }),
  });
  protected readonly overrideForm = new FormGroup({
    priority: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [trimmedLength(actionLimits.overrideReason.min, actionLimits.overrideReason.max)],
    }),
    overriddenBy: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(actionLimits.overriddenBy.max)],
    }),
  });

  protected readonly needsNote = computed(() => {
    const action = this.action();
    return action.kind === 'status' && action.target !== 'InTreatment';
  });
  protected readonly title = computed(() => {
    const text = this.i18n.messages();
    const action = this.action();
    if (action.kind === 'override') return text.overrideTitle;
    return {
      Waiting: text.waiting,
      InTreatment: text.dialogStartTreatmentTitle,
      Discharged: text.dialogDischargeTitle,
      Admitted: text.dialogAdmitTitle,
    }[action.target];
  });
  protected readonly confirmLabel = computed(() => {
    const text = this.i18n.messages();
    const action = this.action();
    if (action.kind === 'override') return text.overrideConfirm;
    return {
      Waiting: text.confirm,
      InTreatment: text.actionStartTreatment,
      Discharged: text.actionDischarge,
      Admitted: text.actionAdmit,
    }[action.target];
  });

  protected requestClose(): void {
    if (!this.submitting()) this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  protected submit(): void {
    if (this.submitting()) return;
    const request = this.buildRequest();
    if (!request) return;

    this.submitting.set(true);
    this.failure.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (patient) => {
        this.submitting.set(false);
        this.completed.emit({ kind: this.action().kind, patient });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        const apiError =
          error instanceof ApiError ? error : new ApiError(0, this.i18n.messages().apiNetworkError);
        this.failure.set(apiError);
        // Not found / conflict: the board's copy of this patient is out of date, so ask it to refresh.
        if (apiError.status === 404 || apiError.status === 409) this.stale.emit();
      },
    });
  }

  /** Marks invalid fields and returns null, or returns the single write request to send. */
  private buildRequest(): Observable<PatientDto> | null {
    const action = this.action();
    const id = this.patient().id;

    if (action.kind === 'override') {
      if (this.overrideForm.invalid) {
        this.overrideForm.markAllAsTouched();
        return null;
      }
      const value = this.overrideForm.getRawValue();
      return this.api.overridePriority(id, {
        priority: Number(value.priority) as TriagePriority,
        reason: value.reason.trim(),
        overriddenBy: value.overriddenBy.trim() || null,
      });
    }

    const target: PatientStatus = action.target;
    if (this.needsNote()) {
      if (this.noteForm.invalid) {
        this.noteForm.markAllAsTouched();
        return null;
      }
      return this.api.changeStatus(id, {
        targetStatus: target,
        dispositionNote: this.noteForm.getRawValue().note.trim(),
      });
    }
    return this.api.changeStatus(id, { targetStatus: target, dispositionNote: null });
  }

  protected errorFor(control: AbstractControl): string | null {
    if (!control.touched || !control.errors) return null;
    const text = this.i18n.messages();
    const errors = control.errors as Record<string, { requiredLength?: number } | true>;
    if (errors['required']) return text.validationRequired;
    const min = errors['minlength'];
    if (min && min !== true) {
      return text.validationMinLength.replace('{value}', String(min.requiredLength));
    }
    const max = errors['maxlength'];
    if (max && max !== true) {
      return text.validationMaxLength.replace('{value}', String(max.requiredLength));
    }
    return null;
  }

  protected priorityLabel(priority: TriagePriority): string {
    const text = this.i18n.messages();
    return `P${priority} — ${{ 1: text.critical, 2: text.high, 3: text.moderate, 4: text.low }[priority]}`;
  }
}

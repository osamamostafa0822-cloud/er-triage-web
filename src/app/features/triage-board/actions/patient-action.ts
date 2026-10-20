import type { PatientDto, PatientStatus } from '../../../core/models/patient';
import type { TriageBoardItemDto } from '../../../core/models/triage-board';

/** What the nurse or doctor chose to do. The allowed targets come from the server's `allowedTransitions`. */
export type PatientAction =
  { readonly kind: 'status'; readonly target: PatientStatus } | { readonly kind: 'override' };

export interface ActivePatientAction {
  readonly patient: TriageBoardItemDto;
  readonly action: PatientAction;
}

export interface PatientActionOutcome {
  readonly kind: PatientAction['kind'];
  readonly patient: PatientDto;
}

import type { PatientStatus, TriagePriority } from './patient';

/** ERTriage.Application/Triage/WaitingLevel.cs. Supplied by the server, never derived in the UI. */
export type WaitingLevel = 'None' | 'Normal' | 'Warning' | 'Critical';

/** ERTriage.Application/Triage/Dtos/TriageBoardItemDto.cs at 332227f. */
export interface TriageBoardItemDto {
  readonly id: string;
  readonly fullName: string;
  readonly age: number;
  readonly chiefComplaint: string;
  readonly arrivalTime: string;
  readonly currentPriority: TriagePriority;
  readonly calculatedPriority: TriagePriority;
  readonly priorityReason: string;
  readonly isOverridden: boolean;
  readonly overrideReason: string | null;
  readonly status: PatientStatus;
  readonly waitingMinutes: number | null;
  readonly waitingLevel: WaitingLevel;
  readonly allowedTransitions: readonly PatientStatus[];
}

/** HTTP query names from TriageBoardController, not the internal C# request's plural names.
 * status and priority are repeated query parameters, serialized by TriageBoardApiService.
 */
export interface TriageBoardQuery {
  readonly status?: readonly PatientStatus[];
  readonly priority?: readonly TriagePriority[];
  readonly pageNumber?: number;
  readonly pageSize?: number;
}

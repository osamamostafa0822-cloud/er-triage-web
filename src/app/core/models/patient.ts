/**
 * Wire contracts verified against ERTriage.Application/Patients/Dtos and
 * Domain/Patients/PatientStatus.cs at backend 332227f.
 * JSON dates are ISO strings; nullable timestamps remain null. No transition matrix lives here.
 */
export type PatientStatus = 'Waiting' | 'InTreatment' | 'Discharged' | 'Admitted';
export type TriagePriority = 1 | 2 | 3 | 4;

export interface VitalSignsDto {
  readonly heartRate: number;
  readonly systolicBp: number;
  readonly diastolicBp: number;
  readonly temperatureC: number;
  readonly spO2: number;
}

export interface PatientDto {
  readonly id: string;
  readonly fullName: string;
  readonly age: number;
  readonly chiefComplaint: string;
  readonly vitals: VitalSignsDto;
  readonly arrivalTime: string;
  readonly calculatedPriority: TriagePriority;
  readonly priorityReason: string;
  readonly overridePriority: TriagePriority | null;
  readonly overrideReason: string | null;
  readonly overriddenBy: string | null;
  readonly overriddenAt: string | null;
  readonly currentPriority: TriagePriority;
  readonly isOverridden: boolean;
  readonly status: PatientStatus;
  readonly treatmentStartedAt: string | null;
  readonly completedAt: string | null;
  readonly dispositionNote: string | null;
  readonly allowedTransitions: readonly PatientStatus[];
}

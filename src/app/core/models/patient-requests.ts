import type { PatientStatus, TriagePriority } from './patient';

/**
 * Raw JSON request contracts: ERTriage.Application/Patients/Requests at 332227f.
 * The backend accepts nullable members so missing/invalid fields can yield field errors.
 * Registration vitals are FLAT on the request, nested only on PatientDto.
 */
export interface RegisterPatientRequest {
  readonly fullName: string | null;
  readonly age: number | null;
  readonly chiefComplaint: string | null;
  readonly heartRate: number | null;
  readonly systolicBp: number | null;
  readonly diastolicBp: number | null;
  readonly temperatureC: number | null;
  readonly spO2: number | null;
  readonly arrivalTime: string | null;
}

export interface ChangePatientStatusRequest {
  readonly targetStatus: PatientStatus | null;
  readonly dispositionNote: string | null;
}

export interface OverridePriorityRequest {
  readonly priority: TriagePriority | null;
  readonly reason: string | null;
  readonly overriddenBy: string | null;
}

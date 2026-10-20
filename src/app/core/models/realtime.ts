import type { PatientStatus, TriagePriority } from './patient';

/**
 * Payload of the SignalR `patientChanged` message (ERTriage.Application/Patients/Notifications/PatientChangedNotification.cs, D-79).
 * It is an id-and-state signal only: no name, complaint, vitals, note or reason. Clients refetch through the REST API.
 */
export type PatientChangeType = 'Registered' | 'StatusChanged' | 'PriorityOverridden';

export interface PatientChangedEvent {
  readonly changeType: PatientChangeType;
  readonly patientId: string;
  readonly priority: TriagePriority;
  readonly status: PatientStatus;
  readonly occurredAt: string;
}

const changeTypes: readonly string[] = ['Registered', 'StatusChanged', 'PriorityOverridden'];
const statuses: readonly string[] = ['Waiting', 'InTreatment', 'Discharged', 'Admitted'];

/** Socket payloads are unknown at runtime: ignore anything that is not exactly the documented shape. */
export function isPatientChangedEvent(value: unknown): value is PatientChangedEvent {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['changeType'] === 'string' &&
    changeTypes.includes(record['changeType']) &&
    typeof record['patientId'] === 'string' &&
    typeof record['priority'] === 'number' &&
    [1, 2, 3, 4].includes(record['priority']) &&
    typeof record['status'] === 'string' &&
    statuses.includes(record['status']) &&
    typeof record['occurredAt'] === 'string'
  );
}

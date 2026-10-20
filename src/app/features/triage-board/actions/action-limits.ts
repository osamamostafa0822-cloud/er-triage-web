/**
 * Mirrors backend ERTriage.Domain/Patients/PatientRules.cs (DispositionNote*, OverrideReason*, OverriddenByMaxLength).
 * Input length limits only; the server stays authoritative and re-validates everything.
 */
export const actionLimits = {
  dispositionNote: { min: 1, max: 500 },
  overrideReason: { min: 3, max: 500 },
  overriddenBy: { max: 100 },
} as const;

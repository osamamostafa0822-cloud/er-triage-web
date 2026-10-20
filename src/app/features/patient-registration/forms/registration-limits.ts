/**
 * Mirrors backend 332227f:
 * ERTriage.Domain/Patients/PatientRules.cs, VitalSignsLimits.cs, and the one-decimal
 * rule in VitalSigns.Create / RegisterPatientRequestValidator.
 * Input plausibility limits only; these are NOT clinical priority thresholds.
 */
export const registrationLimits = {
  // Three-word minimum is an owner-requested UI rule (2026-10-20), not a backend rule.
  fullName: { min: 2, max: 100, minWords: 3 },
  chiefComplaint: { min: 2, max: 200 },
  age: { min: 0, max: 120 },
  heartRate: { min: 20, max: 250 },
  systolicBp: { min: 50, max: 300 },
  diastolicBp: { min: 20, max: 200 },
  temperatureC: { min: 30, max: 45 },
  spO2: { min: 50, max: 100 },
  arrivalFutureToleranceMinutes: 5,
} as const;

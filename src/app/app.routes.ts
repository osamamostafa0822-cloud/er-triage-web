import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/triage-board/triage-board').then((m) => m.TriageBoard),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/patient-registration/patient-registration').then(
        (m) => m.PatientRegistration,
      ),
  },
  { path: '**', redirectTo: 'register' },
];

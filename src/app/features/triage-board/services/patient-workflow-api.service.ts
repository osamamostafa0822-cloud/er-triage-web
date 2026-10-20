import { inject, Injectable } from '@angular/core';
import { defer, map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { BaseApiService } from '../../../core/http/base-api.service';
import type { GeneralResponse } from '../../../core/models/general-response';
import type { PatientDto } from '../../../core/models/patient';
import type {
  ChangePatientStatusRequest,
  OverridePriorityRequest,
} from '../../../core/models/patient-requests';
import {
  ORIGIN_CONNECTION_HEADER,
  TriageRealtimeService,
} from '../../../core/realtime/triage-realtime.service';
import { TranslationService } from '../../../i18n/translation.service';

/** Status changes and priority overrides. Cold, single-shot writes: never retried here. */
@Injectable({ providedIn: 'root' })
export class PatientWorkflowApiService {
  private readonly baseApi = inject(BaseApiService);
  private readonly i18n = inject(TranslationService);
  private readonly realtime = inject(TriageRealtimeService);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/api/patients`;

  changeStatus(id: string, request: ChangePatientStatusRequest): Observable<PatientDto> {
    return this.send('POST', `${this.url}/${encodeURIComponent(id)}/status`, request);
  }

  overridePriority(id: string, request: OverridePriorityRequest): Observable<PatientDto> {
    return this.send('PUT', `${this.url}/${encodeURIComponent(id)}/priority-override`, request);
  }

  private send(method: 'POST' | 'PUT', url: string, body: unknown): Observable<PatientDto> {
    return defer(() => {
      const invalidResponseMessage = this.i18n.messages().apiWorkflowResponseError;
      const connectionId = this.realtime.connectionId();
      return this.baseApi
        .request<GeneralResponse<PatientDto>>(method, url, body, {
          observe: 'response',
          headers: connectionId ? { [ORIGIN_CONNECTION_HEADER]: connectionId } : undefined,
        })
        .pipe(
          map((response) => {
            const envelope = response.body;
            if (envelope?.success !== true || !isPatient(envelope.data)) {
              throw new ApiError(response.status, invalidResponseMessage);
            }
            return envelope.data;
          }),
        );
    });
  }
}

/** Defensive wire-shape check only; the board is refetched afterwards, so the DTO is not stored. */
function isPatient(value: unknown): value is PatientDto {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['status'] === 'string' &&
    ['Waiting', 'InTreatment', 'Discharged', 'Admitted'].includes(record['status']) &&
    typeof record['currentPriority'] === 'number' &&
    Array.isArray(record['allowedTransitions'])
  );
}

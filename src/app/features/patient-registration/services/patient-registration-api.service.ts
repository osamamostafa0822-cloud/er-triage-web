import { inject, Injectable } from '@angular/core';
import { defer, map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { BaseApiService } from '../../../core/http/base-api.service';
import type { GeneralResponse } from '../../../core/models/general-response';
import type { PatientDto } from '../../../core/models/patient';
import type { RegisterPatientRequest } from '../../../core/models/patient-requests';
import { TranslationService } from '../../../i18n/translation.service';

@Injectable({ providedIn: 'root' })
export class PatientRegistrationApiService {
  private readonly baseApi = inject(BaseApiService);
  private readonly i18n = inject(TranslationService);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/api/patients`;

  /** Cold POST: one registration per subscription. Never retried or subscribed here. */
  register(request: RegisterPatientRequest): Observable<PatientDto> {
    return defer(() => {
      // Match the interceptors' language snapshot at subscription time.
      const invalidResponseMessage = this.i18n.messages().apiRegistrationResponseError;
      return this.baseApi
        .request<GeneralResponse<PatientDto>>('POST', this.url, request, { observe: 'response' })
        .pipe(
          map((response) => {
            const envelope = response.body;
            if (
              envelope?.success !== true ||
              envelope.data === null ||
              typeof envelope.data !== 'object' ||
              Array.isArray(envelope.data)
            ) {
              throw new ApiError(response.status, invalidResponseMessage);
            }
            return envelope.data;
          }),
        );
    });
  }
}

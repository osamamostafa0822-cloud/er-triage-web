import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TranslationService } from '../../i18n/translation.service';
import { API_BASE_URL, isApiRequest } from '../api-config';
import type { ApiFieldError, GeneralResponse } from '../models/general-response';
import { ApiError } from './api-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldError(value: unknown): value is ApiFieldError {
  return (
    isRecord(value) &&
    (value['field'] === null || typeof value['field'] === 'string') &&
    typeof value['message'] === 'string'
  );
}

/** HTTP bodies are unknown at runtime, even when a TypeScript response type is declared. */
function isFailureResponse(value: unknown): value is GeneralResponse<null> {
  return (
    isRecord(value) &&
    value['success'] === false &&
    typeof value['message'] === 'string' &&
    value['data'] === null &&
    Array.isArray(value['errors']) &&
    value['errors'].every(isFieldError) &&
    (value['traceId'] === null || typeof value['traceId'] === 'string')
  );
}

/** API-only localization and error normalization. No retry, logging, toast or success unwrapping. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  if (!isApiRequest(request.url, baseUrl)) {
    return next(request);
  }

  const i18n = inject(TranslationService);
  const messages = i18n.messages();
  const localizedRequest = request.clone({ setHeaders: { 'Accept-Language': i18n.language() } });

  return next(localizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      let normalized: ApiError;
      if (error.status === 0) {
        normalized = new ApiError(0, messages.apiNetworkError);
      } else {
        const body: unknown = error.error;
        normalized = isFailureResponse(body)
          ? new ApiError(error.status, body.message, body.errors, body.traceId)
          : new ApiError(
              error.status,
              messages.apiRequestFailed.replace('{status}', String(error.status)),
            );
      }

      return throwError(() => normalized);
    }),
  );
};

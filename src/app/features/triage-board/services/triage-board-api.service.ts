import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { defer, map, Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-config';
import { ApiError } from '../../../core/http/api-error';
import { BaseApiService } from '../../../core/http/base-api.service';
import type { GeneralResponse } from '../../../core/models/general-response';
import type { PagedResult } from '../../../core/models/paged-result';
import type { TriageBoardItemDto, TriageBoardQuery } from '../../../core/models/triage-board';
import { TranslationService } from '../../../i18n/translation.service';

@Injectable({ providedIn: 'root' })
export class TriageBoardApiService {
  private readonly baseApi = inject(BaseApiService);
  private readonly i18n = inject(TranslationService);
  private readonly url = `${inject(API_BASE_URL).replace(/\/+$/, '')}/api/triage-board`;

  /** One cold GET per subscription. The server owns filtering, ordering and paging. */
  getBoard(query: TriageBoardQuery = {}): Observable<PagedResult<TriageBoardItemDto>> {
    let params = new HttpParams()
      .set('pageNumber', query.pageNumber ?? 1)
      .set('pageSize', query.pageSize ?? 10);
    for (const status of query.status ?? []) params = params.append('status', status);
    for (const priority of query.priority ?? []) params = params.append('priority', priority);

    return defer(() => {
      const invalidMessage = this.i18n.messages().apiBoardResponseError;
      return this.baseApi
        .request<GeneralResponse<PagedResult<TriageBoardItemDto>>>('GET', this.url, undefined, {
          params,
          observe: 'response',
        })
        .pipe(
          map((response) => {
            if (response.body?.success !== true || !isBoardPage(response.body.data)) {
              throw new ApiError(response.status, invalidMessage);
            }
            return response.body.data;
          }),
        );
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInteger(value: unknown, minimum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
}

function isStatus(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['Waiting', 'InTreatment', 'Discharged', 'Admitted'].includes(value)
  );
}

function isPriority(value: unknown): boolean {
  return typeof value === 'number' && [1, 2, 3, 4].includes(value);
}

/** Defensive wire-shape checks only; never derive priority, wait level or sorting. */
function isBoardItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['fullName'] === 'string' &&
    isInteger(value['age'], 0) &&
    typeof value['chiefComplaint'] === 'string' &&
    typeof value['arrivalTime'] === 'string' &&
    Number.isFinite(Date.parse(value['arrivalTime'])) &&
    isPriority(value['currentPriority']) &&
    isPriority(value['calculatedPriority']) &&
    typeof value['priorityReason'] === 'string' &&
    typeof value['isOverridden'] === 'boolean' &&
    (value['overrideReason'] === null || typeof value['overrideReason'] === 'string') &&
    isStatus(value['status']) &&
    (value['waitingMinutes'] === null || isInteger(value['waitingMinutes'], 0)) &&
    typeof value['waitingLevel'] === 'string' &&
    ['None', 'Normal', 'Warning', 'Critical'].includes(value['waitingLevel']) &&
    Array.isArray(value['allowedTransitions']) &&
    value['allowedTransitions'].every(isStatus)
  );
}

function isBoardPage(value: unknown): value is PagedResult<TriageBoardItemDto> {
  return (
    isRecord(value) &&
    Array.isArray(value['items']) &&
    value['items'].every(isBoardItem) &&
    isInteger(value['totalCount'], 0) &&
    isInteger(value['pageNumber'], 1) &&
    isInteger(value['pageSize'], 1) &&
    value['pageSize'] <= 100 &&
    isInteger(value['totalPages'], 0)
  );
}

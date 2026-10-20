import { HttpClient, HttpContext, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
  params?: HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
  withCredentials?: boolean;
}

/** Shared JSON transport. Interceptors own loading, localization and HTTP errors. */
@Injectable({ providedIn: 'root' })
export class BaseApiService {
  private readonly http = inject(HttpClient);

  request<TResult>(
    method: string,
    url: string,
    body: unknown,
    options: ApiOptions & { observe: 'response' },
  ): Observable<HttpResponse<TResult>>;
  request<TResult>(
    method: string,
    url: string,
    body?: unknown,
    options?: ApiOptions & { observe?: 'body' },
  ): Observable<TResult>;
  request<TResult>(
    method: string,
    url: string,
    body?: unknown,
    options: ApiOptions & { observe?: 'body' | 'response' } = {},
  ): Observable<TResult | HttpResponse<TResult>> {
    if (options.observe === 'response') {
      return this.http.request<TResult>(method, url, { ...options, body, observe: 'response' });
    }
    return this.http.request<TResult>(method, url, { ...options, body, observe: 'body' });
  }
}

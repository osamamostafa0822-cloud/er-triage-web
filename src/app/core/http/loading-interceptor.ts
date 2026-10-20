import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, finalize } from 'rxjs';
import { API_BASE_URL, isApiRequest } from '../api-config';
import { SKIP_GLOBAL_LOADING } from './loading-context';
import { LoadingService } from './loading.service';

/** Count API subscriptions, not Observable creation; finalize also handles cancellation. */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const baseUrl = inject(API_BASE_URL);
  if (request.context.get(SKIP_GLOBAL_LOADING) || !isApiRequest(request.url, baseUrl)) {
    return next(request);
  }

  const loading = inject(LoadingService);
  return defer(() => {
    const release = loading.beginRequest();
    // Defer next() as well so a synchronous downstream throw cannot leak the counter.
    return defer(() => next(request)).pipe(finalize(release));
  });
};

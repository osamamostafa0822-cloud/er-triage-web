import type { ApiFieldError } from '../models/general-response';

/** A normalized HTTP failure for feature pages. Does not retain the request or raw response body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: readonly ApiFieldError[] = [],
    readonly traceId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

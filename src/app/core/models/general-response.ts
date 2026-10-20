/** Wire shapes: ERTriage.Application/Common/GeneralResponse.cs and ApiError.cs. */
export interface ApiFieldError {
  readonly field: string | null;
  readonly message: string;
}

export interface GeneralResponse<T> {
  readonly success: boolean;
  readonly message: string;
  readonly data: T | null;
  readonly errors: readonly ApiFieldError[];
  readonly traceId: string | null;
}

/** Wire shape: ERTriage.Application/Common/PagedResult.cs; totalPages is returned by the API. */
export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

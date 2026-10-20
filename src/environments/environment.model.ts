/** Shape shared by every environment file, so a key can never exist in one environment only. */
export interface Environment {
  /**
   * Base URL of the ER Triage API, without a trailing slash.
   * An empty string means "same origin" (the API is served under /api behind the same host).
   */
  readonly apiBaseUrl: string;
}

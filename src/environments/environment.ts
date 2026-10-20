import type { Environment } from './environment.model';

/**
 * Default (production) environment. No host is hardcoded: requests go to the same origin, for example
 * through a reverse proxy that serves /api. Set the real value at deployment time if the API lives elsewhere.
 */
export const environment: Environment = {
  apiBaseUrl: '',
};

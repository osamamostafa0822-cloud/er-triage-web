import type { Environment } from './environment.model';

/** Development: the API started with the `http` launch profile (backend/src/ERTriage.Api/Properties/launchSettings.json). */
export const environment: Environment = {
  apiBaseUrl: 'http://localhost:5080',
};

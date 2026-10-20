import { InjectionToken } from '@angular/core';
import { environment } from '../../environments/environment';

/** API origin only, without /api or a trailing slash. Empty means same origin. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

/** Share the API boundary across interceptors so external/asset requests stay untouched. */
export function isApiRequest(url: string, baseUrl: string): boolean {
  return url.startsWith(`${baseUrl.replace(/\/+$/, '')}/api/`);
}

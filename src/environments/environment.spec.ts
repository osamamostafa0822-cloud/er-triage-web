import { environment } from './environment';

describe('environment', () => {
  it('defines the API base URL as a string without a trailing slash', () => {
    expect(typeof environment.apiBaseUrl).toBe('string');
    expect(environment.apiBaseUrl.endsWith('/')).toBe(false);
  });
});

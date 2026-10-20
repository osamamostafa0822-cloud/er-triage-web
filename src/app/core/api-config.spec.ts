import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { appConfig } from '../app.config';
import { API_BASE_URL } from './api-config';

describe('API configuration', () => {
  it('uses the selected build environment by default', () => {
    expect(TestBed.inject(API_BASE_URL)).toBe(environment.apiBaseUrl);
  });

  it.each(['', 'https://triage.example.test'])(
    'allows tests/hosts to override the API origin with %s',
    (baseUrl) => {
      TestBed.configureTestingModule({ providers: [{ provide: API_BASE_URL, useValue: baseUrl }] });
      expect(TestBed.inject(API_BASE_URL)).toBe(baseUrl);
    },
  );

  it('registers HttpClient with the API interceptor in the actual application configuration', () => {
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpClient);
    const controller = TestBed.inject(HttpTestingController);
    const url = `${TestBed.inject(API_BASE_URL)}/api/triage-board`;
    http.get(url).subscribe();
    const request = controller.expectOne(url);
    expect(request.request.headers.get('Accept-Language')).toBe('en');
    request.flush({});
    controller.verify();
  });
});

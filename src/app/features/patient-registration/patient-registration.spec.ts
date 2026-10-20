import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Router } from '@angular/router';
import { appConfig } from '../../app.config';
import { API_BASE_URL } from '../../core/api-config';
import { LoadingService } from '../../core/http/loading.service';
import type { PatientDto } from '../../core/models/patient';
import { TranslationService } from '../../i18n/translation.service';
import { formatLocalArrival, parseLocalArrival } from './forms/registration-datetime';
import { PatientRegistration } from './patient-registration';

afterEach(() => localStorage.removeItem('er-triage.language'));

describe('PatientRegistration page', () => {
  const url = 'https://triage.example.test/api/patients';
  const saved: PatientDto = {
    id: '11111111-1111-1111-1111-111111111111',
    fullName: 'Fictional Test Patient',
    age: 42,
    chiefComplaint: 'Fictional complaint',
    vitals: { heartRate: 80, systolicBp: 120, diastolicBp: 80, temperatureC: 37.1, spO2: 98 },
    arrivalTime: '2020-01-01T08:00:00Z',
    calculatedPriority: 1,
    priorityReason: 'Reason supplied by server',
    currentPriority: 1,
    status: 'Waiting',
    isOverridden: false,
    overridePriority: null,
    overrideReason: null,
    overriddenBy: null,
    overriddenAt: null,
    treatmentStartedAt: null,
    completedAt: null,
    dispositionNote: null,
    allowedTransitions: ['InTreatment'],
  };
  let fixture: ComponentFixture<PatientRegistration>;
  let http: HttpTestingController;
  let loading: LoadingService;
  let host: HTMLElement;
  function input(name: string): HTMLInputElement | HTMLTextAreaElement {
    const element = host.querySelector<HTMLInputElement | HTMLTextAreaElement>('#field-' + name);
    if (!element) throw new Error('Missing field ' + name);
    return element;
  }
  function enter(name: string, value: string): void {
    const element = input(name);
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('blur'));
  }
  function fill(): void {
    const values = {
      fullName: '  Fictional Test Patient  ',
      age: '42',
      chiefComplaint: '  Fictional complaint  ',
      heartRate: '80',
      systolicBp: '120',
      diastolicBp: '80',
      temperatureC: '37.1',
      spO2: '98',
      arrivalTime: '2020-01-01T10:30',
    };
    for (const [name, value] of Object.entries(values)) enter(name, value);
    fixture.detectChanges();
  }
  function submit(): void {
    host
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
  function success(): void {
    http
      .expectOne(url)
      .flush(
        { success: true, message: '', data: saved, errors: [], traceId: null },
        { status: 201, statusText: 'Created' },
      );
    fixture.detectChanges();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [PatientRegistration],
      providers: [
        ...appConfig.providers,
        { provide: API_BASE_URL, useValue: 'https://triage.example.test' },
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    loading = TestBed.inject(LoadingService);
    fixture = TestBed.createComponent(PatientRegistration);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
    expect(loading.pendingRequests()).toBe(0);
  });

  it('renders nine labeled required fields with local arrival and no eager request or errors', () => {
    expect(host.querySelectorAll('input, textarea')).toHaveLength(9);
    for (const element of host.querySelectorAll<HTMLInputElement>('input, textarea')) {
      expect(host.querySelector('label[for="' + element.id + '"]')).not.toBeNull();
      expect(element.required).toBe(true);
    }
    expect(input('arrivalTime').value).toBe(formatLocalArrival(new Date()));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.querySelector('.field-error')).toBeNull();
    http.expectNone(url);
  });

  it('blocks invalid submission, counts each field once and focuses the first invalid field', () => {
    submit();
    expect(host.querySelector('.validation-summary')?.textContent).toContain('8');
    expect(document.activeElement).toBe(input('fullName'));
    expect(input('fullName').getAttribute('aria-invalid')).toBe('true');
    expect(input('fullName').getAttribute('aria-describedby')).toBe('error-fullName');
    http.expectNone(url);
  });

  it('opens the real lazy registration route without an eager API call', async () => {
    const harness = await RouterTestingHarness.create('/register');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toContain(
      'Register Patient',
    );
    http.expectNone(url);
  });

  it.each(['/unknown/page'])('redirects %s to registration without posting', async (path) => {
    const harness = await RouterTestingHarness.create(path);
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
    http.expectNone(url);
  });

  it('focuses invalid fields in visible order, including arrival before the vitals section', () => {
    enter('fullName', 'Fictional Test Patient');
    enter('age', '42');
    enter('chiefComplaint', 'Fictional complaint');
    enter('arrivalTime', '');
    submit();
    expect(document.activeElement).toBe(input('arrivalTime'));
    http.expectNone(url);
  });

  it('uses number value accessors and sends one trimmed flat POST with local arrival converted to UTC', () => {
    fill();
    submit();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fullName: 'Fictional Test Patient',
      age: 42,
      chiefComplaint: 'Fictional complaint',
      heartRate: 80,
      systolicBp: 120,
      diastolicBp: 80,
      temperatureC: 37.1,
      spO2: 98,
      arrivalTime: parseLocalArrival('2020-01-01T10:30')?.toISOString(),
    });
    request.flush({ success: true, message: '', data: saved, errors: [], traceId: null });
    http.expectNone((request) => request.method === 'GET');
  });

  it('ignores repeated submissions while pending and disables the fieldset/buttons with a busy state', () => {
    fill();
    submit();
    submit();
    expect(loading.pendingRequests()).toBe(1);
    expect(host.querySelector('fieldset')?.disabled).toBe(true);
    expect(host.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('.form-actions button')].every(
        (button) => button.disabled,
      ),
    ).toBe(true);
    success();
    expect(host.querySelector('fieldset')?.disabled).toBe(false);
    expect(loading.isLoading()).toBe(false);
  });

  it('shows only returned priority/status/reason on success and resets to a fresh arrival', () => {
    fill();
    submit();
    success();
    const panel = host.querySelector('.success-panel');
    expect(panel?.textContent).toContain('Patient registered');
    expect(panel?.textContent).toContain(saved.fullName);
    expect(panel?.textContent).toContain('P1 — Critical');
    expect(panel?.textContent).toContain('Waiting');
    expect(panel?.textContent).toContain(saved.priorityReason);
    expect(input('fullName').value).toBe('');
    expect(input('age').value).toBe('');
    expect(input('arrivalTime').value).toBe(formatLocalArrival(new Date()));
    expect(host.querySelector('.validation-summary')).toBeNull();
    http.expectNone(url);
  });

  it('register another dismisses success and focuses the first empty field', () => {
    fill();
    submit();
    success();
    host.querySelector<HTMLButtonElement>('.success-panel button')?.click();
    fixture.detectChanges();
    expect(host.querySelector('.success-panel')).toBeNull();
    expect(document.activeElement).toBe(input('fullName'));
    http.expectNone(url);
  });

  it('keeps input after 400, renders all field/banner errors and a selectable trace ID without a Retry button', () => {
    fill();
    submit();
    http.expectOne(url).flush(
      {
        success: false,
        message: 'Please correct the request.',
        data: null,
        errors: [
          { field: 'fullName', message: 'First name error' },
          { field: 'fullName', message: 'Second name error' },
          { field: null, message: 'General issue' },
          { field: 'unknown', message: 'Unknown field issue' },
        ],
        traceId: 'trace-fictional-1',
      },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(host.querySelector('#error-fullName')?.textContent).toContain('First name error');
    expect(host.querySelector('#error-fullName')?.textContent).toContain('Second name error');
    expect(host.querySelector('.failure-panel')?.textContent).toContain('General issue');
    expect(host.querySelector('.failure-panel')?.textContent).toContain('Unknown field issue');
    expect(host.querySelector('code')?.textContent).toBe('trace-fictional-1');
    expect(host.querySelector('.failure-panel button')).toBeNull();
    expect(input('fullName').value).toBe('  Fictional Test Patient  ');
    expect(document.activeElement).toBe(input('fullName'));
    expect(loading.isLoading()).toBe(false);
    submit();
    http.expectNone(url);
    enter('fullName', 'Corrected fictional name');
    fixture.detectChanges();
    expect(host.querySelector('#error-fullName')).toBeNull();
    submit();
    expect(http.expectOne(url).request.body.fullName).toBe('Corrected fictional name');
  });

  it('displays BP order on diastolic, counts one field and focuses it', () => {
    fill();
    enter('diastolicBp', '120');
    submit();
    expect(host.querySelector('#error-diastolicBp')?.textContent).toContain(
      'Diastolic pressure must be lower',
    );
    expect(input('diastolicBp').getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('.validation-summary')?.textContent).toContain('1');
    expect(document.activeElement).toBe(input('diastolicBp'));
    http.expectNone(url);
  });

  it('blocks two-word names and translates the three-word requirement', async () => {
    fill();
    enter('fullName', 'Fictional Patient');
    submit();
    expect(host.querySelector('#error-fullName')?.textContent).toContain('at least 3 words');
    http.expectNone(url);
    TestBed.inject(TranslationService).setLanguage('ar');
    await fixture.whenStable();
    expect(host.querySelector('#error-fullName')?.textContent).toContain('3 كلمات على الأقل');
    enter('fullName', 'أحمد محمد علي');
    fixture.detectChanges();
    expect(host.querySelector('#error-fullName')).toBeNull();
  });

  it('shows temperature precision on blur and removes the error when corrected', () => {
    enter('temperatureC', '37.15');
    fixture.detectChanges();
    expect(host.querySelector('#error-temperatureC')?.textContent).toContain('one decimal');
    enter('temperatureC', '37.1');
    fixture.detectChanges();
    expect(host.querySelector('#error-temperatureC')).toBeNull();
    http.expectNone(url);
  });

  it.each([0, 500])(
    'retains values and warns about uncertain registration for status %s without retrying',
    (status) => {
      fill();
      submit();
      const request = http.expectOne(url);
      if (status === 0) request.error(new ProgressEvent('error'));
      else request.flush('Server unavailable', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(host.querySelector('.failure-panel')?.textContent).toContain(
        'may already be registered',
      );
      expect(input('heartRate').value).toBe('80');
      expect(host.querySelector('[role="alert"]')).not.toBeNull();
      expect(host.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
      http.expectNone(url);
    },
  );

  it('reports an unusable 2xx response without clearing the form or offering automatic retry', () => {
    fill();
    submit();
    http.expectOne(url).flush({ success: true, data: null });
    fixture.detectChanges();
    expect(host.querySelector('.failure-panel')?.textContent).toContain(
      'unexpected registration response',
    );
    expect(input('fullName').value).toContain('Fictional');
    expect(host.querySelector('.success-panel')).toBeNull();
    http.expectNone(url);
  });

  it('translates labels, client errors and submission text when language changes', async () => {
    submit();
    TestBed.inject(TranslationService).setLanguage('ar');
    await fixture.whenStable();
    expect(host.querySelector('h2')?.textContent).toContain('تسجيل');
    expect(host.querySelector('#error-fullName')?.textContent).toContain('هذا الحقل مطلوب');
    expect(document.documentElement.dir).toBe('rtl');
    fill();
    submit();
    const request = http.expectOne(url);
    expect(request.request.headers.get('Accept-Language')).toBe('ar');
    expect(host.querySelector('button[type="submit"]')?.textContent).toContain('جارٍ التسجيل');
    request.flush({ success: true, data: saved });
  });

  it('clear resets touched/errors, refreshes arrival and dismisses the banner', () => {
    fill();
    submit();
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.form-actions button[type="button"]')?.click();
    fixture.detectChanges();
    expect(host.querySelector('.failure-panel')).toBeNull();
    expect(host.querySelector('.field-error')).toBeNull();
    expect(input('arrivalTime').value).toBe(formatLocalArrival(new Date()));
    expect(input('fullName').value).toBe('');
    expect(document.activeElement).toBe(input('fullName'));
  });

  it('cancels the subscription and releases global loading on page destruction', () => {
    fill();
    submit();
    const request = http.expectOne(url);
    fixture.destroy();
    expect(request.cancelled).toBe(true);
    expect(loading.isLoading()).toBe(false);
  });
});

import { formatLocalArrival, parseLocalArrival } from './registration-datetime';
import { FormControl } from '@angular/forms';
import { numberInRange } from './registration.validators';

describe('local arrival conversion', () => {
  it('formats local calendar parts at minute precision instead of slicing a UTC string', () => {
    expect(formatLocalArrival(new Date(2026, 9, 20, 0, 5, 59))).toBe('2026-10-20T00:05');
    expect(parseLocalArrival('2026-10-20T00:05')?.toISOString()).toBe(
      new Date(2026, 9, 20, 0, 5).toISOString(),
    );
  });

  it.each([
    ['2026-10-20T12:30', 0, 0],
    ['2026-10-20T12:30:12', 12, 0],
    ['2026-10-20T12:30:12.1', 12, 100],
    ['2026-10-20T12:30:12.12', 12, 120],
    ['2026-10-20T12:30:12.123', 12, 123],
  ] as const)(
    'parses local seconds/milliseconds without loss: %s',
    (value, seconds, milliseconds) => {
      expect(parseLocalArrival(value)?.getTime()).toBe(
        new Date(2026, 9, 20, 12, 30, seconds, milliseconds).getTime(),
      );
    },
  );

  it.each([
    '',
    '2026-02-29T12:30',
    '2026-02-30T12:30',
    '2026-13-01T12:30',
    '2026-01-00T12:30',
    '2026-01-01T24:00',
    '2026-01-01T12:60',
    '2026-01-01T12:30:60',
    '0000-01-01T12:30',
    '2026-01-01',
    '2026-01-01T12:30Z',
    '2026-01-01T12:30+03:00',
    '2026-01-01T12:30:00.1234',
    null,
    undefined,
  ])('rejects rollover, non-local or malformed input: %s', (value) => {
    expect(parseLocalArrival(value)).toBeNull();
  });

  it('accepts a genuine leap date and rejects an invalid clock value', () => {
    expect(parseLocalArrival('2024-02-29T12:30')?.getDate()).toBe(29);
    expect(() => formatLocalArrival(new Date(NaN))).toThrow(RangeError);
  });
});

describe('numeric input type validation', () => {
  it.each([NaN, Infinity, -Infinity, '42', {}, true])(
    'rejects non-finite or non-number values: %s',
    (value) => {
      expect(numberInRange(0, 120)(new FormControl<unknown>(value))).toEqual({ number: true });
    },
  );
});

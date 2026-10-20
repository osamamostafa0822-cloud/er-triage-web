import { FormControl } from '@angular/forms';
import { trimmedLength } from './text-validators';

describe('trimmedLength', () => {
  const validate = (value: unknown) => trimmedLength(3, 5)(new FormControl(value));

  it('reports missing, blank and non-string values as required', () => {
    expect(validate('')).toEqual({ required: true });
    expect(validate('   ')).toEqual({ required: true });
    expect(validate(null)).toEqual({ required: true });
    expect(validate(42)).toEqual({ required: true });
  });

  it('measures the trimmed text against both bounds', () => {
    expect(validate(' ab ')).toEqual({ minlength: { requiredLength: 3, actualLength: 2 } });
    expect(validate('abcdef')).toEqual({ maxlength: { requiredLength: 5, actualLength: 6 } });
    expect(validate('  abc  ')).toBeNull();
    expect(validate('abcde')).toBeNull();
  });
});

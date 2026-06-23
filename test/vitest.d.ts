// vitest-axe ships its matcher type augmentation against the legacy `Vi`
// namespace, which Vitest 3 no longer merges into expect(). Re-declare the
// accessibility matcher against Vitest's own Assertion interface so
// `expect(results).toHaveNoViolations()` type-checks. The matcher is registered
// at runtime via expect.extend(axeMatchers) in test/setup.ts.
import 'vitest';

interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

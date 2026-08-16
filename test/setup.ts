import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Accessibility matcher: expect(...).toHaveNoViolations()
expect.extend(axeMatchers);

// Unmount React trees between tests so the DOM doesn't leak across cases.
afterEach(() => {
  cleanup();
});

// ── jsdom gaps that MUI / the app rely on ────────────────────────────────────
//
// The server-side helpers under netlify/ are tested with
// `// @vitest-environment node`, where there is no window or DOM at all — so
// everything below is skipped for those files.

if (typeof window !== 'undefined') {
  // MUI's useMediaQuery and ThemeProvider read window.matchMedia. jsdom doesn't
  // implement it. Default to "no match" (desktop / light). Individual tests can
  // override window.matchMedia to simulate mobile or dark-mode preference.
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),       // deprecated
        removeListener: vi.fn(),    // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }

  // Used by the chatbot's auto-scroll; not implemented in jsdom.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }

  // jsdom's window.alert throws "Not implemented"; the contact form calls it on
  // a failed submit. Stub it so those paths don't crash the test runner.
  window.alert = vi.fn();
}

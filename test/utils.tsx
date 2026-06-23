import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../app/context/theme-context';
import i18n from '../app/i18n';

interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial router entry, e.g. '/contact'. Defaults to '/'. */
  route?: string;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/**
 * Render a component with every app-level provider it might need: i18n, the
 * MUI theme, react-query, and an in-memory router. Mirrors the real provider
 * stack in app/root.tsx so components behave as they do in the app.
 */
export function renderWithProviders(ui: ReactElement, options: ProvidersOptions = {}) {
  const { route = '/', ...renderOptions } = options;
  const queryClient = makeQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/** Renders the current pathname so tests can assert navigation occurred. */
export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-pathname">{location.pathname}</div>;
}

/**
 * Simulate a viewport width by making window.matchMedia evaluate MUI's
 * min-width / max-width media queries against the given pixel width. Use this
 * to test responsive, useMediaQuery-driven rendering (e.g. the mobile nav).
 */
export function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  window.matchMedia = ((query: string) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    let matches = true;
    if (min) matches = matches && width >= parseFloat(min[1]);
    if (max) matches = matches && width <= parseFloat(max[1]);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  }) as typeof window.matchMedia;
}

export const MOBILE_WIDTH = 375;
export const DESKTOP_WIDTH = 1280;

export * from '@testing-library/react';

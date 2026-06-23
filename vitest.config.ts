import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Vitest config is kept separate from vite.config.ts so the React Router /
// Netlify build plugins (which assume a full SSR build pipeline) don't run
// during unit tests. JSX is transformed by esbuild via the esbuild option.
export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: false,
    include: ['app/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    // Provide the env vars app/utils/supabase.ts requires at import time so the
    // module doesn't throw when a route pulls it into the test graph.
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      // Pin the timezone so date helpers (which render in local time, i.e.
      // America/Toronto in production) behave deterministically in CI.
      TZ: 'America/Toronto',
    },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['backend/tests/**/*.{test,spec}.{js,jsx}'],
    setupFiles: ['./backend/tests/setup.js'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['frontend/src/models/**', 'frontend/src/stores/**', 'frontend/src/hooks/useCocina.js', 'frontend/src/services/cocinaSocketHandler.js'],
      thresholds: { lines: 90, functions: 90, branches: 85 },
    },
  },
});

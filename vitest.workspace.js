import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: './vitest.config.js', 
    test: {
      name: 'frontend',
      environment: 'jsdom',
      include: ['frontend/tests/**/*.{test,spec}.{js,jsx}'],
    }
  },

  {
    test: {
      name: 'backend',
      environment: 'node',
      globals: true,
      include: ['backend/tests/**/*.{test,spec}.{js,jsx}'],
      setupFiles: ['backend/tests/setup.js'],
    }
  }
])

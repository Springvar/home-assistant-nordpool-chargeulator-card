import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        threads: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/*.d.ts',
                'src/**/index.ts',
                'src/**/*-card.ts',      // Exclude UI components
                'src/**/*-editor.ts'     // Exclude editor files
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,  // Lower for complex business logic
                statements: 80
            }
        }
    }
});

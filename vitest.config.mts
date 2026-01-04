import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/**/*.ts'],
        exclude: ['**/node_modules/**', '**/_*.ts'],
        globals: true,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'html'],
            reportsDirectory: './coverage'
        }
    }
});

import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['tests/**/*.mjs', 'tests/**/*.test.mjs'],
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.js'],
            exclude: [
                'src/global/**',
                'src/database/**',
                '**/node_modules/**'
            ]
        }
    }
})

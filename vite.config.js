import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/ev-chargeulator-card.ts',
            formats: ['es'],
            fileName: 'home-assistant-nordpool-chargeulator-card'
        },
        outDir: 'dist',
        rollupOptions: {
            external: [],
            output: {
                entryFileNames: 'home-assistant-nordpool-chargeulator-card.js'
            }
        },
        minify: 'esbuild'
    }
});

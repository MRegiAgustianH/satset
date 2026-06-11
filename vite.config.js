import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        // Keep large/optional libraries in their own chunks so the initial
        // page payload stays small and benefits from long-term caching.
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('react-dom') || id.includes('/react/')) {
                            return 'react';
                        }
                        if (id.includes('@inertiajs')) {
                            return 'inertia';
                        }
                    }
                },
            },
        },
        // Raise the warning limit so the editor page (a large single component)
        // doesn't spam warnings during build.
        chunkSizeWarningLimit: 1200,
    },
});

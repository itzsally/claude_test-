import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `--mode artifact` builds one self-contained page: a single JS bundle with the
 * dynamic catalog chunk folded in, one stylesheet, and every asset inlined, so
 * `scripts/build-artifact.mjs` can emit a standalone HTML file. The default
 * build keeps its code splitting.
 */
export default defineConfig(({ mode }) => {
  const standalone = mode === 'artifact';

  return {
    plugins: [react()],
    // Relative asset URLs, so a build works from any path rather than the root.
    base: './',
    server: {
      port: 5173,
    },
    build: standalone
      ? {
          outDir: 'dist-artifact',
          cssCodeSplit: false,
          assetsInlineLimit: Number.MAX_SAFE_INTEGER,
          rollupOptions: {
            output: { codeSplitting: false },
          },
        }
      : {},
  };
});

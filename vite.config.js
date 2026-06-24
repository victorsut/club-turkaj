import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Reemplaza __BUILD_HASH__ en dist/sw.js con un timestamp de build,
// para versionar CACHE_NAME automaticamente en cada deploy.
function swVersionPlugin() {
  return {
    name: 'sw-version',
    closeBundle() {
      const swPath = resolve(process.cwd(), 'dist/sw.js');
      const buildHash = Date.now().toString();
      try {
        let content = readFileSync(swPath, 'utf-8');
        content = content.replace('__BUILD_HASH__', buildHash);
        writeFileSync(swPath, content);
        console.log(`[Vite] SW versioned with hash: ${buildHash}`);
      } catch (e) {
        console.warn('[Vite] Could not version SW:', e.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});

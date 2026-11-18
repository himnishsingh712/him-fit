// Builds the app with a fake Supabase (tests/mock-supabase.js) so it can run headless.
import {defineConfig} from 'vite'; import {fileURLToPath} from 'url'; import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({root: path.resolve(here, '..'), logLevel: 'warn', build: {outDir: path.resolve(here, '.dist'), emptyOutDir: true},
  plugins: [{name: 'mock-supabase', enforce: 'pre', resolveId(id) { if (id === './supabase.js') return path.resolve(here, 'mock-supabase.js'); }}]});

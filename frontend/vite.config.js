import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // relative paths for GitHub Pages project site
  plugins: [react()],
  server: { port: 5173 }
});

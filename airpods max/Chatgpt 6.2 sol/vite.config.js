import {defineConfig} from 'vite';

export default defineConfig({
  build: {
    // The Three.js renderer is already bundled and compressed for static hosting.
    chunkSizeWarningLimit: 600
  }
});

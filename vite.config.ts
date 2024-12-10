import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: './src/main.ts',
      name: 'WebGLFluidEnhanced',
      fileName: (format) => `index.${format}.js`,
    },
    sourcemap: true,
  },
  server: {
    host: true,
    open: true,
  },
  plugins: [dts({ rollupTypes: true })],
});

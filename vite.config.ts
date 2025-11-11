import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Keep env loading available for other env-driven behavior but DO NOT inject secrets into the client bundle.
  const env = loadEnv(mode, '.', '');
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
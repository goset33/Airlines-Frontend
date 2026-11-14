import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.API_PROXY_TARGET || process.env.API_PROXY_TARGET;

  return {
    server: {
      proxy: backendTarget
        ? {
            '/api': {
              target: backendTarget,
              changeOrigin: true,
              secure: true
            }
          }
        : undefined
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});

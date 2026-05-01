import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

const appReleaseVersion = 'ocr-rule-library-20260501'

function readGitVersion() {
  if (process.env.VITE_APP_VERSION || process.env.APP_VERSION) {
    return process.env.VITE_APP_VERSION ?? process.env.APP_VERSION ?? 'local'
  }

  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    const dirty = execSync('git status --short', { encoding: 'utf8' }).trim() ? '-dirty' : ''
    return `${appReleaseVersion}-${hash}${dirty}`
  } catch {
    return appReleaseVersion
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(readGitVersion()),
    __APP_BUILD_TIME__: JSON.stringify(process.env.VITE_BUILD_TIME ?? new Date().toISOString()),
  },
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api-docs': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/version': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
})

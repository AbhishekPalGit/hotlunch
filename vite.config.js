import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://holu-docker-new-env.eba-kjjjd7py.us-east-1.elasticbeanstalk.com',
        // target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

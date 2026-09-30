import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom', 'lucide-react', '@react-pdf/renderer', 'docx', 'jspdf', 'buffer'], entries: ['src/**/*.tsx', 'src/**/*.ts'] },
  resolve: { alias: { buffer: 'buffer/' } },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})


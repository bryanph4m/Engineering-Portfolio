import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fixed-camera 3D scene — one Canvas, no routing. Nothing exotic in the build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2020',
    // Split the (heavy) three/R3F stack out of the app chunk so the initial
    // parse stays reasonable and document content can lazy-load on top.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei', '@react-spring/three'],
        },
      },
    },
  },
})

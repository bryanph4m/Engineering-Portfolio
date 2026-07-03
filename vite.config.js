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
    // Function form: Vite 8's Rolldown build dropped the object shorthand.
    rollupOptions: {
      output: {
        manualChunks(id) {
          const p = id.replace(/\\/g, '/')
          if (!p.includes('/node_modules/')) return undefined
          if (
            p.includes('/@react-three/fiber/') ||
            p.includes('/@react-three/drei/') ||
            p.includes('/@react-spring/')
          ) {
            return 'r3f'
          }
          if (p.includes('/node_modules/three/')) return 'three'
          return undefined
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fixed-camera 3D scene — one Canvas, no routing. Nothing exotic in the build.
export default defineConfig({
  plugins: [react()],
  server: {
    // 5174: this working copy's own dev port — deliberately NOT 5173, which
    // the previous (now retired) local instance used.
    port: 5174,
    open: false,
  },
  build: {
    target: 'es2020',
    // Split the (heavy) three/R3F stack out of the app chunk so the initial
    // parse stays reasonable and the simple mode can load without any of it.
    //
    // Rolldown's `manualChunks` heuristic insists on parking the shared React
    // runtime inside the largest common bundle (r3f), which would then drag
    // all of three/R3F into every entry — including the simple mode. Its
    // native `advancedChunks` groups are honored by priority (first match
    // wins), so putting React *ahead* of the 3D groups pins the runtime in
    // its own small chunk and keeps three/R3F reachable only from the
    // (lazy) desk mode.
    rollupOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: 'react-vendor',
              test: /[\\/]node_modules[\\/](?:react-dom|react|scheduler|use-sync-external-store)[\\/]/,
            },
            {
              name: 'r3f',
              test: /[\\/]node_modules[\\/](?:@react-three|@react-spring)[\\/]/,
            },
            {
              name: 'three',
              test: /[\\/]node_modules[\\/]three[\\/]/,
            },
          ],
        },
      },
    },
  },
})

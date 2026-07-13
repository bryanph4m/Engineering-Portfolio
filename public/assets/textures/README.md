# Textures

The desk currently uses **procedural canvas textures** generated at runtime in
`src/lib/textures.js`, so the project builds with zero binary assets.

To swap in real photography, drop files here and load them instead:

| Drop a file here            | Used by                     | Swap in                                   |
| --------------------------- | --------------------------- | ----------------------------------------- |
| `desk-wood.jpg`             | desktop surface             | `src/desk/Desk.jsx` (see the hook comment)|
| `rocket-cad.*`, project photos | Projects / Research imagery | import inside the content components       |

Anything in `public/` is served from the site root, e.g.
`/assets/textures/desk-wood.jpg`. To use one with React Three Fiber:

```jsx
import { useTexture } from '@react-three/drei'
const wood = useTexture('/assets/textures/desk-wood.jpg')
```

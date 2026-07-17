import * as THREE from 'three'
import { QUALITY } from './quality'

/**
 * The one loader for real photograph textures — the framed album
 * (desk/PhotoFrame) and the polaroids pinned to pages (desk/Polaroids).
 *
 * Photos are the only images the desk downloads, and they are authored for
 * print, not for a phone: the files in /public/assets/photos are up to
 * 2160×2880. A texture that size costs ~24 MB of GPU memory once mipped, and
 * the biggest a photo is ever drawn is a picked-up album filling ~600 device px
 * on a phone (~850 on a desktop) — so all but a fraction of those texels can
 * never be sampled. Every photo is therefore downscaled to a tier-appropriate
 * cap before it reaches the GPU.
 *
 * This shrinks the *upload*, not the *download*: the browser has already
 * fetched and decoded the full-size file by the time we see it, and only a
 * smaller source file can fix that half (see the note on asset sizes in
 * public/assets/photos/README.md). Cutting what is held on the GPU is the part
 * this layer can honestly do, and it is the part that persists for the whole
 * session rather than just the first few seconds.
 */

// Longest edge, in px, a photo texture is allowed to keep. A focused album is
// ~600 device px tall on a phone at the capped DPR and ~850 on a desktop; these
// leave real headroom above that for the mip chain to sample from, while still
// cutting a 2160×2880 portrait by ~93% (mobile) / ~70% (desktop) of its pixels.
const MAX_EDGE = QUALITY.mobile ? 768 : 1600

/** Downscale to MAX_EDGE, preserving aspect. Returns the source untouched if
 *  it already fits, so correctly-sized photos cost nothing. */
function fit(img) {
  const longest = Math.max(img.width, img.height)
  if (longest <= MAX_EDGE) return img
  const s = MAX_EDGE / longest
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(img.width * s))
  c.height = Math.max(1, Math.round(img.height * s))
  const ctx = c.getContext('2d')
  // The browser's own filtered draw is the cheapest decent resample available
  // here, and quality matters: this is a photograph, not a noise texture.
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c
}

/**
 * Load `src` as a colour texture, capped to the tier's size.
 * `onLoad(texture)` fires only on success — a missing file is silent, leaving
 * the caller's painted placeholder in place, which is the long-standing
 * contract for a photo that hasn't been dropped in yet.
 */
export function loadPhotoTexture(src, onLoad) {
  new THREE.TextureLoader().load(
    src,
    (t) => {
      const sized = fit(t.image)
      if (sized !== t.image) {
        t.image = sized
        t.needsUpdate = true
      }
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = QUALITY.anisotropy
      onLoad(t)
    },
    undefined,
    () => {}, // not dropped in yet — the caller keeps its placeholder
  )
}

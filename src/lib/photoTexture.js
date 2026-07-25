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

// Longest edge, in px, a photo texture is allowed to keep.
//
// There are two caps because there are two wildly different photo surfaces on
// this desk, and for a long time they shared one number sized for the larger:
//
//  - ALBUM — the framed photo (desk/PhotoFrame), picked up to fill the view.
//    Its image plane is 0.78 of the frame's 0.9 world height and the frame is
//    scaled to FOCUS_POSE.targetHeight, so it covers ~87% of the focused view:
//    ~1600 device px on a 1440p desktop at the capped DPR. 1600 is that size,
//    with the mip chain doing the rest.
//
//  - POLAROID — a photo pinned to a document page (desk/Polaroids). Its opening
//    is 0.575 world units on a sheet up to 2.9 tall, so once the sheet is scaled
//    to the same targetHeight the photo is only ~20% of the sheet's height:
//    measured at 155 device px on this 1440×900 window, ~372 on a 1440p desktop.
//
// One cap for both meant every page polaroid was uploaded at 1000×1250 for a
// surface that never exceeds ~372 px — roughly 3× oversampled on each axis, so
// ~11× the texels it can ever sample, at 6.4 MB each. That is texture memory
// bought for magnification that cannot happen: pinch-to-zoom is touch-only, and
// touch is the mobile tier, where the cap is smaller again. 512 leaves ~1.4×
// headroom over the largest desktop case; the mobile 384 covers a phone's
// ~182 px polaroid all the way through a full DOC_ZOOM.max pinch.
const ALBUM_MAX_EDGE = QUALITY.mobile ? 768 : 1600
export const POLAROID_MAX_EDGE = QUALITY.mobile ? 384 : 512

/** Downscale to `maxEdge`, preserving aspect. Returns the source untouched if
 *  it already fits, so correctly-sized photos cost nothing. */
function fit(img, maxEdge) {
  const longest = Math.max(img.width, img.height)
  if (longest <= maxEdge) return img
  const s = maxEdge / longest
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
 * Load `src` as a colour texture, capped to `maxEdge` px on its longest side.
 * `onLoad(texture)` fires only on success — a missing file is silent, leaving
 * the caller's painted placeholder in place, which is the long-standing
 * contract for a photo that hasn't been dropped in yet.
 *
 * The cap defaults to the album's, so the caller that needs the big one does
 * not have to say so; the polaroids pass POLAROID_MAX_EDGE explicitly. Sizing
 * a photo is the caller's decision because only the caller knows how large its
 * surface gets on screen — see the two caps above.
 */
export function loadPhotoTexture(src, onLoad, maxEdge = ALBUM_MAX_EDGE) {
  new THREE.TextureLoader().load(
    src,
    (t) => {
      const sized = fit(t.image, maxEdge)
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

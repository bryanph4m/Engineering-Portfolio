/**
 * The one place the site decides "is this a phone, and how hard may we push the
 * GPU?" — resolved once at module load, never re-read. Both site modes import
 * from here so the desk's render settings and the simple mode's layout choices
 * can never disagree about what a mobile device is.
 *
 * The decision is deliberately NOT a user-agent sniff (which lies, and which
 * mislabels iPads and touch laptops) but a capability read:
 *
 *  - `(pointer: coarse)` without a fine pointer  → a finger is the only input.
 *  - a short viewport side under 900px           → a phone/small tablet, not a
 *                                                  touchscreen desktop.
 *
 * Both must hold, so a touch-enabled laptop keeps the full desktop path and a
 * phone in landscape is still treated as a phone (the *short* side is tested,
 * so rotating the device never flips the tier mid-session — the scene's
 * textures and shadow map are baked once and cannot be re-tiered anyway).
 */

const mq = (q) => typeof window !== 'undefined' && window.matchMedia(q).matches

/** A finger is the primary input — drives interaction, not render quality. */
export const IS_TOUCH = mq('(pointer: coarse)') && !mq('(pointer: fine)')

const shortSide =
  typeof window === 'undefined'
    ? 1200
    : Math.min(window.innerWidth, window.innerHeight)

/**
 * Force a tier, for measuring the budget in CLAUDE.md § "Performance budget"
 * from a desktop browser: `?tier=mobile` / `?tier=desktop`.
 *
 * The mobile tier decides texture rasters, DPR cap, MSAA and segment counts —
 * i.e. most of what the budget is written in terms of — and every one of those
 * is baked once at module load and cannot be re-tiered mid-session. Without an
 * override there is no way to check a new feature's mobile cost except on a
 * phone, which in practice means it does not get checked. Only the tier moves;
 * nothing else in the site reads this.
 */
const forcedTier =
  typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('tier')

/** A phone-class device: touch-only AND a small viewport. */
export const IS_MOBILE =
  forcedTier === 'mobile' ? true
  : forcedTier === 'desktop' ? false
  : IS_TOUCH && shortSide < 900

/**
 * What the desk is allowed to spend, per tier. Every number here is a lever the
 * desk mode reads directly; nothing else in the scene branches on IS_MOBILE.
 *
 *  - `dprCap` — the single biggest lever: the scene is fill-rate bound, so cost
 *    scales with the square of this. Desktop caps at 1.5 (beyond that we only
 *    upsample fixed-res paper textures). Phones cap at 1.25: still above native
 *    CSS pixels so focused paper text stays readable, but ~45% fewer fragments
 *    than desktop. AdaptiveDpr drops it further while the camera moves.
 *  - `antialias` — MSAA is disproportionately expensive on tile-based mobile
 *    GPUs (it multiplies the tile-memory resolve), so phones render without it
 *    and lean on the DPR headroom above instead.
 *  - `shadowMapSize` — the map is baked once and frozen (ShadowBake in
 *    DeskScene), so this is a one-time load cost, not a per-frame one; halving
 *    the axis quarters the depth rasterisation work at startup.
 *  - `texScale` — multiplies every procedural canvas texture's backing raster
 *    (src/lib/textures.js). Drawing code is unaffected: the 2D context is
 *    pre-scaled, so art stays authored at its design size.
 *  - `anisotropy` — the desk slab is viewed at a grazing angle, so this is the
 *    texture-sampling cost that actually shows up; 2 taps instead of 8.
 *  - `segScale` — radial segment multiplier for round props (see `seg` below).
 */
export const QUALITY = IS_MOBILE
  ? {
      mobile: true,
      dprCap: 1.25,
      antialias: false,
      shadowMapSize: 512,
      texScale: 0.5,
      anisotropy: 2,
      segScale: 0.5,
    }
  : {
      mobile: false,
      dprCap: 1.5,
      antialias: true,
      shadowMapSize: 1024,
      texScale: 1,
      anisotropy: 8,
      segScale: 1,
    }

/**
 * Level-of-detail for a round prop's radial segment count. Small background
 * dressing (pencils, header pins, resistor bands) is a handful of screen pixels
 * on a phone, so half the segments is invisible there and halves the vertices.
 * Floored at 6 so nothing collapses into a flat sliver, and never applied to a
 * silhouette the eye actually reads as a curve at focus distance.
 */
export const seg = (n) => Math.max(6, Math.round(n * QUALITY.segScale))

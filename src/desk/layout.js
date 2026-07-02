// Physical paper dimensions and resting heights, computed in one place so a
// sheet can never end up coplanar with the desk (y = 0) or with a neighbour.
// Every document group is rotated flat, so a prop's local +Z becomes world +Y.

export const PAPER_T = 0.02 // thickness of a solid sheet/card (box props)
export const SHEET_T = 0.006 // one leaf inside a clipped stack
export const REST_EPS = 0.002 // clearance between the desk top and the lowest face

/**
 * World Y for a document group at rest: half its own thickness (or the base
 * leaf for stacks) plus the desk clearance. Stacks build upward from here at
 * `index * SHEET_T` inside StackProp, so adding pages never changes this.
 */
export function restHeightFor(kind) {
  switch (kind) {
    case 'stack':
      return REST_EPS // bottom leaf is the group origin plane
    case 'blueprint':
      return REST_EPS + 0.002 // single plane; polygonOffset handles the rest
    default:
      return REST_EPS + PAPER_T / 2 // solid box sheets rest on their under face
  }
}

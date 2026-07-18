import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DOCUMENTS } from '../documents/registry'

/**
 * Dev-only layout regression check. Warns in the console when
 *  - two interactive documents' footprints overlap (that's how the papers
 *    z-fought in the first place), or
 *  - desk clutter shares footprint with a document, or
 *  - the rocket model shares footprint with a document or with the clutter, or
 *  - a document hangs off the desk.
 * Footprints are yaw-aligned rectangles tested with 2D SAT; prop meshes are
 * measured from the live scene so new props are covered automatically.
 * Re-run any time from the console: window.__deskLayoutAudit()
 *
 * The rocket (group "rocket") is measured exactly like the clutter, and then
 * additionally tested against it. That extra pass exists because the rocket is
 * the one prop big enough to reach across other props' footprints rather than
 * merely sit near them — for everything else, prop-vs-prop crowding is a look
 * you can see, but a four-and-a-half-unit airframe laid across the desk can
 * quietly intersect a cradle, a compass leg or a coffee mug from the one camera
 * angle nobody checks.
 */

const DOC_INFLATE = 0.05 // covers the stack fan + a safety margin
const CLUTTER_INFLATE = 0.02
const DESK_HALF_X = 5.45
const DESK_HALF_Z = 3.7
const PAPER_ZONE_Y = 0.35 // clutter wholly above this can't touch resting paper

export default function DevLayoutAudit() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    // clutter is all-synchronous geometry; one beat is enough for mounting
    const t = setTimeout(() => auditLayout(scene), 600)
    window.__deskLayoutAudit = () => auditLayout(scene)
    return () => {
      clearTimeout(t)
      delete window.__deskLayoutAudit
    }
  }, [scene])
  return null
}

function docObb(doc) {
  const yaw = doc.rest.yaw || 0
  return {
    label: `doc:${doc.id}`,
    cx: doc.rest.position[0],
    cz: doc.rest.position[2],
    ux: Math.cos(yaw),
    uz: -Math.sin(yaw),
    hw: doc.paper.w / 2 + DOC_INFLATE,
    hh: doc.paper.h / 2 + DOC_INFLATE,
  }
}

/** Separating-axis test for two rectangles in the desk plane. */
function overlaps(a, b) {
  const axes = [
    [a.ux, a.uz],
    [-a.uz, a.ux],
    [b.ux, b.uz],
    [-b.uz, b.ux],
  ]
  const dx = b.cx - a.cx
  const dz = b.cz - a.cz
  for (const [x, z] of axes) {
    const dist = Math.abs(dx * x + dz * z)
    const ra = a.hw * Math.abs(a.ux * x + a.uz * z) + a.hh * Math.abs(-a.uz * x + a.ux * z)
    const rb = b.hw * Math.abs(b.ux * x + b.uz * z) + b.hh * Math.abs(-b.uz * x + b.ux * z)
    if (dist > ra + rb) return false
  }
  return true
}

const _v = new THREE.Vector3()

function vertexBounds(mesh) {
  const pos = mesh.geometry?.getAttribute('position')
  if (!pos) return null
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    min.min(_v)
    max.max(_v)
  }
  return { min, max }
}

function auditLayout(scene) {
  const warnings = []
  const docs = DOCUMENTS.map(docObb)

  // documents vs each other
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      if (overlaps(docs[i], docs[j])) {
        warnings.push(`${docs[i].label} overlaps ${docs[j].label}`)
      }
    }
  }

  // documents on the desk
  for (const d of docs) {
    const reachX = d.hw * Math.abs(d.ux) + d.hh * Math.abs(d.uz)
    const reachZ = d.hw * Math.abs(d.uz) + d.hh * Math.abs(d.ux)
    if (Math.abs(d.cx) + reachX > DESK_HALF_X || Math.abs(d.cz) + reachZ > DESK_HALF_Z) {
      warnings.push(`${d.label} hangs off the desk`)
    }
  }

  // Measured prop meshes, per group. Collected rather than only tested in
  // place, because the rocket then has to be tested against the clutter too.
  const measure = (groupName) => {
    const group = scene.getObjectByName(groupName)
    if (!group) {
      warnings.push(`no "${groupName}" group found in the scene — audit incomplete`)
      return []
    }
    const out = []
    group.updateWorldMatrix(true, true)
    group.traverse((obj) => {
      if (!obj.isMesh) return
      // exact vertex-space bounds — Box3.setFromObject transforms the local
      // AABB's corners, which badly over-covers rotated shapes like the
      // drafting triangle and produces phantom overlaps
      const box = vertexBounds(obj)
      if (!box || box.min.y > PAPER_ZONE_Y) return
      const b = {
        label: `${obj.geometry.type.replace('Geometry', '')} x[${box.min.x.toFixed(2)},${box.max.x.toFixed(2)}] z[${box.min.z.toFixed(2)},${box.max.z.toFixed(2)}] y[${box.min.y.toFixed(2)},${box.max.y.toFixed(2)}]`,
        cx: (box.min.x + box.max.x) / 2,
        cz: (box.min.z + box.max.z) / 2,
        ux: 1,
        uz: 0,
        hw: (box.max.x - box.min.x) / 2 + CLUTTER_INFLATE,
        hh: (box.max.z - box.min.z) / 2 + CLUTTER_INFLATE,
      }
      if (box.min.y < -0.005) {
        warnings.push(`${groupName} ${b.label} is sunk into the desk (minY ${box.min.y.toFixed(3)})`)
      }
      for (const d of docs) {
        if (overlaps(d, b)) warnings.push(`${d.label} shares footprint with ${groupName} ${b.label}`)
      }
      out.push(b)
    })
    return out
  }

  const clutter = measure('clutter')
  const rocket = measure('rocket')

  // The rocket against the clutter. Only these two groups are cross-tested —
  // within a group, props are allowed to touch (the mug pins the pennant, the
  // gears mesh), and that is deliberate composition rather than a mistake.
  for (const r of rocket) {
    for (const c of clutter) {
      if (overlaps(r, c)) warnings.push(`rocket ${r.label} intersects clutter ${c.label}`)
    }
  }

  if (warnings.length) {
    for (const w of warnings) console.warn(`[desk-layout] ${w}`)
  } else {
    console.info('[desk-layout] clean — no document/clutter overlaps, everything on the desk')
  }
  return warnings
}

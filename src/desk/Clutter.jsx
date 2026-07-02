import * as THREE from 'three'
import { COLORS } from './constants'
import { paperTexture } from '../lib/textures'

/**
 * Static desk dressing that sells the "older engineer, manual drafting" read:
 * T-square, compass + divider, mechanical pencils, kneaded eraser, slide rule,
 * a vellum roll, a coffee mug, a drafting triangle and a pin dish.
 *
 * Layout rules (enforced by DevLayoutAudit in dev builds):
 *  - every object rests ON the desk: y = half its own height, nothing sunk
 *  - nothing shares footprint with an interactive document
 * The root group is named "clutter" so the audit can find these meshes.
 */

const brass = { color: COLORS.brass, metalness: 0.7, roughness: 0.35 }
const graphite = { color: COLORS.graphite, metalness: 0.4, roughness: 0.5 }

function Pencil({ position, rotation, color = '#7a1f24' }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.045, 0.045, 1.5, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* knurled grip */}
      <mesh castShadow position={[0, -0.72, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
        <meshStandardMaterial {...graphite} />
      </mesh>
      {/* tip cone */}
      <mesh castShadow position={[0, -0.86, 0]}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* clip */}
      <mesh castShadow position={[0.05, 0.55, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.04]} />
        <meshStandardMaterial {...brass} />
      </mesh>
    </group>
  )
}

/**
 * A compass/divider standing slightly open like an A-frame. Legs pivot at the
 * hub and are sized so both tips rest exactly on the desk (y = 0).
 */
function CompassTool({ position, rotationY = 0, spread = 0.24, leg = 1.0, hubR = 0.08 }) {
  // +0.01 keeps the tilted tip-cap rim from dipping below the desktop
  const hubY = leg * Math.cos(spread) + 0.01
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow position={[0, hubY + hubR * 0.4, 0]}>
        <sphereGeometry args={[hubR, 16, 16]} />
        <meshStandardMaterial {...brass} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[0, hubY, 0]} rotation={[0, 0, s * spread]}>
          <mesh castShadow position={[0, -leg / 2, 0]}>
            <cylinderGeometry args={[0.028, 0.012, leg, 10]} />
            <meshStandardMaterial {...brass} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Clutter() {
  const paper = paperTexture(true)
  return (
    <group name="clutter">
      {/* ---- T-square along the front-left, head hanging left ---- */}
      <group position={[-3.05, 0, 2.7]} rotation={[0, -1.43, 0]}>
        {/* blade rides on top of the head, like the real tool */}
        <mesh castShadow position={[0, 0.046, 0]}>
          <boxGeometry args={[0.09, 0.03, 3.2]} />
          <meshStandardMaterial color="#c7b28a" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 0.021, 1.55]}>
          <boxGeometry args={[1.6, 0.04, 0.14]} />
          <meshStandardMaterial color="#b99a68" roughness={0.6} />
        </mesh>
      </group>

      {/* ---- Compass + divider, standing slightly open, right edge ---- */}
      <CompassTool position={[4.55, 0, 3.5]} rotationY={-0.4} />
      <CompassTool position={[4.5, 0, 1.0]} rotationY={0.3} spread={0.13} leg={0.75} hubR={0.06} />

      {/* ---- Mechanical pencils + kneaded eraser, front-centre-left ---- */}
      <Pencil position={[-1.8, 0.048, 2.98]} rotation={[Math.PI / 2, 0, 0.9]} color="#7a1f24" />
      <Pencil position={[-1.45, 0.048, 3.2]} rotation={[Math.PI / 2, 0, 1.0]} color="#1f3a5a" />
      <mesh castShadow position={[-0.85, 0.062, 3.25]} rotation={[0, 0.4, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.2]} />
        <meshStandardMaterial color="#4a4a48" roughness={0.95} />
      </mesh>

      {/* ---- Slide rule along the left edge ---- */}
      <group position={[-4.4, 0, 0.9]} rotation={[0, 0.15, 0]}>
        <mesh castShadow position={[0, 0.027, 0]}>
          <boxGeometry args={[0.5, 0.05, 2.6]} />
          <meshStandardMaterial color="#e9e2cf" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 0.057, 0]}>
          <boxGeometry args={[0.2, 0.06, 2.6]} />
          <meshStandardMaterial color="#f2ecdb" roughness={0.4} />
        </mesh>
        {/* cursor slide */}
        <mesh castShadow position={[0, 0.082, 0.5]}>
          <boxGeometry args={[0.56, 0.02, 0.22]} />
          <meshStandardMaterial color="#cfd6db" metalness={0.5} roughness={0.3} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* ---- Vellum roll with a loose tail, rear-right ---- */}
      <group position={[3.55, 0.2, -3.15]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 2.2, 24]} />
          <meshStandardMaterial color={COLORS.paperBright} roughness={0.85} />
        </mesh>
        {/* the unrolled tail lying flat on the desk in front of the roll */}
        <mesh receiveShadow position={[0, -0.194, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.7, 0.5]} />
          <meshStandardMaterial
            map={paper}
            color={COLORS.paper}
            roughness={0.9}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>

      {/* ---- Coffee mug (warmth), mid-right ---- */}
      <group position={[3.7, 0, 0.4]}>
        <mesh castShadow position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.32, 0.28, 0.66, 24]} />
          <meshStandardMaterial color="#7c3b2a" roughness={0.4} />
        </mesh>
        {/* coffee */}
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.29, 0.29, 0.04, 24]} />
          <meshStandardMaterial color="#2a1a10" roughness={0.2} />
        </mesh>
        {/* handle */}
        <mesh castShadow position={[0.36, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.045, 12, 24]} />
          <meshStandardMaterial color="#7c3b2a" roughness={0.4} />
        </mesh>
      </group>

      {/* ---- Drafting triangle, mid-right between blueprint and roll ---- */}
      <group position={[3.75, 0.004, -1.35]} rotation={[-Math.PI / 2, 0, 0.9]}>
        <mesh castShadow>
          <extrudeGeometry
            args={[
              (() => {
                const s = new THREE.Shape()
                s.moveTo(0, 0)
                s.lineTo(1.6, 0)
                s.lineTo(0, 1.6)
                s.lineTo(0, 0)
                // hollow centre
                s.holes.push(
                  (() => {
                    const h = new THREE.Path()
                    h.moveTo(0.28, 0.28)
                    h.lineTo(1.0, 0.28)
                    h.lineTo(0.28, 1.0)
                    h.lineTo(0.28, 0.28)
                    return h
                  })()
                )
                return s
              })(),
              { depth: 0.03, bevelEnabled: false },
            ]}
          />
          <meshStandardMaterial color="#8fb9c9" transparent opacity={0.55} roughness={0.2} metalness={0.1} />
        </mesh>
      </group>

      {/* ---- Pushpin dish, front-left corner ---- */}
      <group position={[-3.3, 0, 3.4]}>
        <mesh castShadow position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.3, 0.26, 0.1, 24]} />
          <meshStandardMaterial color="#4a4033" roughness={0.6} metalness={0.2} />
        </mesh>
        {[['#b23b3b', 0.1, 0.05], ['#3b6bb2', -0.08, 0.11], ['#d4a23b', 0.06, -0.09]].map(
          ([c, x, z], i) => (
            <mesh key={i} castShadow position={[x, 0.08, z]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color={c} roughness={0.4} />
            </mesh>
          )
        )}
      </group>
    </group>
  )
}

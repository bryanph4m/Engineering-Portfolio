import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { COLORS } from './constants'
import { paperTexture, pcbTexture, photoPlaceholderTexture } from '../lib/textures'

/**
 * Static desk dressing that sells the "older engineer, manual drafting,
 * mid-project" read: T-square, a drafting compass, mechanical pencils,
 * kneaded eraser, slide rule, a vellum roll, a coffee mug, a drafting
 * triangle, a pin dish, stray circuit boards with loose components, and a
 * small framed photo leaning at the back of the desk.
 *
 * Layout rules (enforced by DevLayoutAudit in dev builds):
 *  - every object rests ON the desk: y = half its own height, nothing sunk
 *  - nothing shares footprint with an interactive document
 * The root group is named "clutter" so the audit can find these meshes.
 */

const brass = { color: COLORS.brass, metalness: 0.7, roughness: 0.35 }
const graphite = { color: COLORS.graphite, metalness: 0.4, roughness: 0.5 }
const steel = { color: '#aeb4bc', metalness: 0.85, roughness: 0.3 }

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
 * The one drafting compass on the desk: a steel bow compass lying flat,
 * legs partially open — needle point on one leg, lead holder on the other,
 * brass hinge barrel and the adjustment bar spanning the legs.
 */
function DraftingCompass({ position, yaw = 0 }) {
  const leg = 0.95
  const half = 0.31 // half the opening angle between the legs

  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* hinge barrel + spindle handle, standing proud of the flat legs */}
      <mesh castShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.075, 16]} />
        <meshStandardMaterial {...brass} />
      </mesh>
      <mesh castShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.08, 10]} />
        <meshStandardMaterial {...steel} />
      </mesh>

      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, s * half, 0]}>
          {/* tapered leg lying on the desk, hinge end thicker */}
          <mesh castShadow position={[0, 0.036, leg / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.026, leg, 10]} />
            <meshStandardMaterial {...steel} />
          </mesh>
          {s < 0 ? (
            // needle point
            <mesh castShadow position={[0, 0.028, leg + 0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.011, 0.09, 8]} />
              <meshStandardMaterial {...steel} />
            </mesh>
          ) : (
            // lead holder: knurled collar + graphite tip
            <group>
              <mesh castShadow position={[0, 0.034, leg - 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 0.09, 10]} />
                <meshStandardMaterial {...brass} />
              </mesh>
              <mesh castShadow position={[0, 0.028, leg + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.013, 0.08, 8]} />
                <meshStandardMaterial color="#2c2c2e" roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* adjustment bar spanning the open legs */}
      <mesh castShadow position={[0, 0.036, 0.333]}>
        <boxGeometry args={[0.3, 0.016, 0.016]} />
        <meshStandardMaterial {...steel} />
      </mesh>
    </group>
  )
}

/** A bare PCB set down mid-project; children are its through-hole parts. */
function CircuitBoard({ position, yaw = 0, w = 0.95, d = 0.62, mask = 'green', children }) {
  const tex = pcbTexture(mask)
  const edge = mask === 'blue' ? '#0d2440' : '#0b3a1e'
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.012, 0]}>
        <boxGeometry args={[w, 0.024, d]} />
        <meshStandardMaterial attach="material-0" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-1" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-2" map={tex} roughness={0.45} />
        <meshStandardMaterial attach="material-3" color={edge} roughness={0.7} />
        <meshStandardMaterial attach="material-4" color={edge} roughness={0.6} />
        <meshStandardMaterial attach="material-5" color={edge} roughness={0.6} />
      </mesh>
      {children}
    </group>
  )
}

/** A loose axial resistor — tan body, colour bands, bent silver leads. */
function LooseResistor({ position, yaw = 0 }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <mesh castShadow position={[0, 0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.024, 0.11, 10]} />
        <meshStandardMaterial color="#d2b48c" roughness={0.6} />
      </mesh>
      {[-0.03, 0, 0.032].map((dx, i) => (
        <mesh key={i} position={[dx, 0.024, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0255, 0.0255, 0.013, 10]} />
          <meshStandardMaterial color={['#7a3b1f', '#1d1d1d', '#b3402a'][i]} roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.007, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.13, 6]} />
          <meshStandardMaterial color="#b9bec6" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Placeholder-aware loader for the framed profile photo. */
function useProfilePhoto() {
  const placeholder = useMemo(() => photoPlaceholderTexture(), [])
  const [photo, setPhoto] = useState(null)
  useEffect(() => {
    let alive = true
    new THREE.TextureLoader().load(
      '/assets/profile-photo.jpg',
      (t) => {
        if (!alive) return
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        setPhoto(t)
      },
      undefined,
      () => {} // no photo dropped in yet — keep the painted placeholder
    )
    return () => {
      alive = false
    }
  }, [])
  return photo ?? placeholder
}

/**
 * A small worn wooden frame leaning against the (unseen) wall at the back
 * edge of the desk, propped on a kickstand. Drop the real portrait at
 * /public/assets/profile-photo.jpg and it replaces the placeholder.
 */
function PictureFrame({ position, yaw = 0 }) {
  const photo = useProfilePhoto()
  const W = 0.72
  const H = 0.9
  const B = 0.06
  const D = 0.05
  const wood = { color: '#4e3823', roughness: 0.72, metalness: 0.05 }
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      <group rotation={[-0.17, 0, 0]}>
        <mesh castShadow position={[0, B / 2, 0]}>
          <boxGeometry args={[W, B, D]} />
          <meshStandardMaterial {...wood} />
        </mesh>
        <mesh castShadow position={[0, H - B / 2, 0]}>
          <boxGeometry args={[W, B, D]} />
          <meshStandardMaterial {...wood} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} castShadow position={[(s * (W - B)) / 2, H / 2, 0]}>
            <boxGeometry args={[B, H - 2 * B, D]} />
            <meshStandardMaterial {...wood} />
          </mesh>
        ))}
        {/* the photo, recessed just behind the front face of the rails */}
        <mesh position={[0, H / 2, 0.01]}>
          <planeGeometry args={[W - 2 * B + 0.02, H - 2 * B + 0.02]} />
          <meshStandardMaterial map={photo} roughness={0.5} />
        </mesh>
      </group>
      {/* kickstand strut down to the desk behind the frame */}
      <mesh castShadow position={[0, 0.31, -0.215]} rotation={[0.267, 0, 0]}>
        <boxGeometry args={[0.09, 0.63, 0.016]} />
        <meshStandardMaterial {...wood} />
      </mesh>
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

      {/* ---- The drafting compass, set down by the pencils mid-layout ---- */}
      <DraftingCompass position={[0.15, 0, 2.95]} yaw={1.25} />

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

      {/* ---- Stray electronics, rear-centre: set down mid-project ---- */}
      <CircuitBoard position={[-1.62, 0, -3.22]} yaw={0.35} mask="green">
        {/* MCU + electrolytic cap + header row */}
        <mesh castShadow position={[-0.18, 0.046, 0.05]} rotation={[0, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.045, 0.14]} />
          <meshStandardMaterial color="#1b1b1f" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.14, 0.079, -0.14]}>
          <cylinderGeometry args={[0.05, 0.05, 0.11, 14]} />
          <meshStandardMaterial color="#26375c" roughness={0.45} />
        </mesh>
        <mesh position={[0.14, 0.137, -0.14]}>
          <cylinderGeometry args={[0.047, 0.047, 0.006, 14]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.7} roughness={0.3} />
        </mesh>
        <group position={[0.26, 0, 0.18]} rotation={[0, -0.06, 0]}>
          <mesh castShadow position={[0, 0.049, 0]}>
            <boxGeometry args={[0.28, 0.05, 0.05]} />
            <meshStandardMaterial color="#141416" roughness={0.55} />
          </mesh>
          {[-2, -1, 0, 1, 2].map((i) => (
            <mesh key={i} castShadow position={[i * 0.055, 0.105, 0]}>
              <cylinderGeometry args={[0.007, 0.007, 0.062, 6]} />
              <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
        </group>
      </CircuitBoard>

      <CircuitBoard position={[0.15, 0, -3.28]} yaw={-0.42} w={0.68} d={0.5} mask="blue">
        {/* small IC + crystal can + a ceramic cap */}
        <mesh castShadow position={[-0.1, 0.044, -0.04]} rotation={[0, -0.05, 0]}>
          <boxGeometry args={[0.13, 0.04, 0.1]} />
          <meshStandardMaterial color="#1b1b1f" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.12, 0.052, 0.08]} rotation={[0, 0.3, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 12]} />
          <meshStandardMaterial {...steel} />
        </mesh>
        <mesh castShadow position={[0.2, 0.05, -0.12]}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshStandardMaterial color="#c77b3a" roughness={0.6} />
        </mesh>
      </CircuitBoard>

      <LooseResistor position={[-0.62, 0, -3.06]} yaw={0.7} />

      {/* loose header pin strip, waiting to be soldered */}
      <group position={[0.82, 0, -3.12]} rotation={[0, -0.3, 0]}>
        <mesh castShadow position={[0, 0.026, 0]}>
          <boxGeometry args={[0.3, 0.052, 0.055]} />
          <meshStandardMaterial color="#141416" roughness={0.55} />
        </mesh>
        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={i} castShadow position={[i * 0.055, 0.077, 0]}>
            <cylinderGeometry args={[0.007, 0.007, 0.05, 6]} />
            <meshStandardMaterial color="#c9a227" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ---- Framed photo leaning at the back edge of the desk ---- */}
      <PictureFrame position={[1.9, 0.005, -3.32]} yaw={0.08} />

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

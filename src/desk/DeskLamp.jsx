import { COLORS } from './constants'

/**
 * A jointed brass drafting lamp that is also the scene's key light. The bulb
 * geometry sits inside the shade with an emissive material and a warm spot
 * light shining down onto the desk — flicker-free, ~3000K.
 */
export default function DeskLamp() {
  return (
    <group position={[-3.9, 0, -1.4]}>
      {/* weighted base */}
      <mesh castShadow position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.16, 32]} />
        <meshStandardMaterial color={COLORS.brass} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* lower arm */}
      <mesh castShadow position={[0.35, 1.0, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.045, 0.045, 2.0, 16]} />
        <meshStandardMaterial color={COLORS.brass} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* elbow */}
      <mesh castShadow position={[0.83, 1.9, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={COLORS.brass} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* upper arm reaching over the desk */}
      <mesh castShadow position={[1.75, 2.15, 0]} rotation={[0, 0, -1.28]}>
        <cylinderGeometry args={[0.045, 0.045, 2.0, 16]} />
        <meshStandardMaterial color={COLORS.brass} metalness={0.7} roughness={0.35} />
      </mesh>

      {/* shade */}
      <group position={[2.55, 2.28, 0]} rotation={[0, 0, -2.5]}>
        <mesh castShadow>
          <coneGeometry args={[0.62, 0.7, 32, 1, true]} />
          <meshStandardMaterial
            color="#8a6a2f"
            metalness={0.6}
            roughness={0.4}
            side={2}
          />
        </mesh>
        {/* glowing bulb */}
        <mesh position={[0, -0.18, 0]}>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshStandardMaterial
            color={COLORS.lampWarm}
            emissive={COLORS.lampWarm}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* the actual light: warm spot aimed at desk centre */}
      <spotLight
        position={[2.35, 3.9, 0.1]}
        target-position={[1.4, 0, 0.6]}
        angle={0.72}
        penumbra={0.65}
        distance={16}
        intensity={95}
        color={COLORS.lampWarm}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      {/* tiny point light so the bulb itself reads as a glow source */}
      <pointLight position={[2.55, 2.1, 0]} intensity={2.2} distance={4} color={COLORS.lampWarm} />
    </group>
  )
}

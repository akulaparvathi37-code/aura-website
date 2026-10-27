import { useRef, useMemo, useEffect, Component } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Suppress R3F/Three version-mismatch deprecation warning (cosmetic only)
const _origWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return
  _origWarn(...args)
}

/* ---------- Floating gold dust particles ---------- */
function GoldParticles({ count = 120 }) {
  const meshRef = useRef()
  const clock = useRef(0)

  // Generate random particle positions once
  const { positions, speeds, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const ph  = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 16   // x  spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9    // y  spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4    // z  depth
      spd[i] = 0.15 + Math.random() * 0.35
      ph[i]  = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, phases: ph }
  }, [count])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    clock.current += delta

    const posAttr = meshRef.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      // Gentle drift upward with sinusoidal sway
      posAttr.array[i * 3 + 1] += speeds[i] * delta * 0.5
      posAttr.array[i * 3]     += Math.sin(clock.current * 0.4 + phases[i]) * 0.003

      // Wrap around when particle floats off top
      if (posAttr.array[i * 3 + 1] > 4.8) {
        posAttr.array[i * 3 + 1] = -4.8
        posAttr.array[i * 3]     = (Math.random() - 0.5) * 16
      }
    }
    posAttr.needsUpdate = true

    // Very slow overall rotation for depth
    meshRef.current.rotation.z = Math.sin(clock.current * 0.05) * 0.02
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.028}
        color="#C9A84C"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/* ---------- Camera parallax rig ---------- */
function CameraRig({ mouseX, mouseY }) {
  useFrame((state) => {
    // Smooth lerp toward mouse target — subtle, not jarring
    state.camera.position.x += (mouseX.current * 0.4 - state.camera.position.x) * 0.04
    state.camera.position.y += (mouseY.current * 0.2 - state.camera.position.y) * 0.04
    state.camera.lookAt(0, 0, 0)
  })
  return null
}

class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err) {
    console.warn('[AURA] 3D Hero Scene fallback active (WebGL notice):', err?.message || err)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

/* ---------- Exported Scene ---------- */
export default function HeroScene({ mouseX, mouseY }) {
  return (
    <SceneErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 3,
        }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: 'low-power',
        }}
        dpr={[1, 1.5]}
      >
        <CameraRig mouseX={mouseX} mouseY={mouseY} />
        <GoldParticles count={100} />
      </Canvas>
    </SceneErrorBoundary>
  )
}

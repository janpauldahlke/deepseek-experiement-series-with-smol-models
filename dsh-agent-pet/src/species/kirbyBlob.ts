import * as THREE from 'three'
import type { Species, SpeciesHandle } from './types.ts'
import type { Mood } from '../mood/types.ts'
import type { PetConfig } from '../config.ts'

/**
 * The shippable Kirby-like blob. A squashed pink sphere with oval eyes, cheeks,
 * a mood-driven mouth, and two feet; the whole body squashes-and-stretches on a
 * per-mood bob. A short "flash" pop fires on every mood change so transitions
 * feel snappy. All animation runs on its own RAF; `setMood` only records the
 * target.
 */

interface Pose {
  bobFreq: number
  bobAmp: number
  squash: number
  eyeY: number
  eyeScale: number
  mouthOpen: number
}

const POSE: Record<Mood, Pose> = {
  idle: { bobFreq: 1.2, bobAmp: 0.06, squash: 1.0, eyeY: 0.12, eyeScale: 1.0, mouthOpen: 0.15 },
  think: { bobFreq: 0.7, bobAmp: 0.03, squash: 0.95, eyeY: 0.3, eyeScale: 0.8, mouthOpen: 0.1 },
  talk: { bobFreq: 2.4, bobAmp: 0.05, squash: 1.0, eyeY: 0.12, eyeScale: 1.0, mouthOpen: 0.6 },
  work: { bobFreq: 4.5, bobAmp: 0.04, squash: 0.9, eyeY: 0.0, eyeScale: 0.85, mouthOpen: 0.2 },
  happy: { bobFreq: 3.0, bobAmp: 0.14, squash: 1.06, eyeY: 0.1, eyeScale: 1.12, mouthOpen: 0.95 },
  sad: { bobFreq: 0.5, bobAmp: 0.02, squash: 0.8, eyeY: -0.06, eyeScale: 0.8, mouthOpen: 0.05 },
  surprised: { bobFreq: 1.0, bobAmp: 0.0, squash: 1.16, eyeY: 0.18, eyeScale: 1.45, mouthOpen: 1.0 },
  sneeze: { bobFreq: 6.0, bobAmp: 0.05, squash: 0.88, eyeY: 0.0, eyeScale: 0.5, mouthOpen: 1.0 },
}

function lerp(a: number, b: number, kk: number): number {
  return a + (b - a) * kk
}

export const kirbyBlob: Species = {
  id: 'kirby-blob',
  create(canvas, cfg): SpeciesHandle {
    const dpr = Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, 2)
    const cssSize = canvas.clientWidth || cfg.sizePx

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(dpr)
    renderer.setSize(cssSize, cssSize, false)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20)
    camera.position.set(0, 0.15, 3.7)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, 0.95))
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
    keyLight.position.set(1.6, 2.2, 2.2)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0xffd6e6, 0.5)
    rimLight.position.set(-1.4, 0.6, -2.0)
    scene.add(rimLight)

    const group = new THREE.Group()
    scene.add(group)

    // Body: a slightly flat pink sphere.
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.55, metalness: 0 })
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), bodyMat)
    body.scale.set(1, 0.94, 1)
    group.add(body)

    // Feet.
    const footMat = new THREE.MeshBasicMaterial({ color: 0x9c3a5e })
    const footGeo = new THREE.SphereGeometry(1, 24, 24)
    const makeFoot = (x: number) => {
      const foot = new THREE.Mesh(footGeo, footMat)
      foot.position.set(x, -0.86, 0.12)
      foot.scale.set(0.34, 0.22, 0.5)
      return foot
    }
    group.add(makeFoot(-0.34), makeFoot(0.34))

    // Eyes: dark tall ovals with a white highlight.
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2b1b2b })
    const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const eyeGeo = new THREE.SphereGeometry(1, 24, 24)
    const hiGeo = new THREE.SphereGeometry(1, 16, 16)
    const makeEye = (x: number) => {
      const eyeGroup = new THREE.Group()
      const eye = new THREE.Mesh(eyeGeo, eyeMat)
      eye.scale.set(0.09, 0.2, 0.06)
      eyeGroup.add(eye)
      const hi = new THREE.Mesh(hiGeo, hiMat)
      hi.position.set(0.018, 0.06, 0.03)
      hi.scale.set(0.03, 0.05, 0.03)
      eyeGroup.add(hi)
      eyeGroup.position.set(x, 0.12, 0.86)
      return eyeGroup
    }
    const leftEye = makeEye(-0.18)
    const rightEye = makeEye(0.18)
    group.add(leftEye, rightEye)

    // Cheeks.
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff5d8f })
    const cheekGeo = new THREE.SphereGeometry(1, 16, 16)
    const makeCheek = (x: number) => {
      const cheek = new THREE.Mesh(cheekGeo, cheekMat)
      cheek.position.set(x, -0.02, 0.74)
      cheek.scale.set(0.14, 0.09, 0.06)
      return cheek
    }
    group.add(makeCheek(-0.46), makeCheek(0.46))

    // Mouth.
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x3a1f2a })
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), mouthMat)
    mouth.position.set(0, -0.14, 0.9)
    mouth.scale.set(0.14, 0.09, 0.05)
    group.add(mouth)

    // Animation state.
    let mood: Mood = 'idle'
    let flash = 0
    let disposed = false
    let raf = 0
    const start = typeof performance !== 'undefined' ? performance.now() : 0
    const disp = { squash: 1, eyeY: 0.12, eyeScale: 1, mouthOpen: 0.15 }

    const loop = (now: number) => {
      if (disposed) return
      raf = requestAnimationFrame(loop)
      const t = (now - start) / 1000
      const pose = POSE[mood]
      const reduced = cfg.reducedMotion

      disp.squash = lerp(disp.squash, pose.squash, 0.16)
      disp.eyeY = lerp(disp.eyeY, pose.eyeY, 0.16)
      disp.eyeScale = lerp(disp.eyeScale, pose.eyeScale, 0.16)
      const targetMouth = mood === 'talk' && !reduced ? 0.5 + 0.4 * Math.sin(t * 9) : pose.mouthOpen
      disp.mouthOpen = lerp(disp.mouthOpen, targetMouth, 0.4)

      const bobAmp = reduced ? 0 : pose.bobAmp
      const bobFreq = reduced ? 0 : pose.bobFreq
      const phase = Math.sin(t * bobFreq * 2 * Math.PI)
      flash *= 0.88
      const pop = 1 + 0.16 * flash
      const stretch = 1 + (reduced ? 0 : 0.08 * phase)
      const yScale = disp.squash * stretch * pop
      const xScale = (1 - 0.05 * phase) * (1 - 0.04 * flash)

      group.position.y = reduced ? 0 : bobAmp * phase
      group.scale.set(xScale, yScale, xScale)

      leftEye.position.y = disp.eyeY
      rightEye.position.y = disp.eyeY
      leftEye.scale.setScalar(disp.eyeScale)
      rightEye.scale.setScalar(disp.eyeScale)

      mouth.scale.set(0.14, 0.05 + 0.22 * disp.mouthOpen, 0.05)
      mouth.position.y = -0.14 - 0.05 * disp.mouthOpen

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(loop)

    return {
      setMood(m: Mood) {
        if (m !== mood) {
          mood = m
          flash = 1
        }
      },
      dispose() {
        if (disposed) return
        disposed = true
        cancelAnimationFrame(raf)
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (mesh.geometry) mesh.geometry.dispose()
          const material = mesh.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(material)) material.forEach((m) => m.dispose())
          else if (material) material.dispose()
        })
        renderer.dispose()
      },
    }
  },
}

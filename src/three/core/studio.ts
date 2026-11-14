/*
 * The studio: how solid objects on this site are lit and what they are made of.
 * Strictly black and white: a neutral reflection map, white lights, and four finishes.
 * Import this only from scene modules (it pulls in three.js).
 */

import {
  DirectionalLight,
  HemisphereLight,
  MeshPhysicalMaterial,
  PMREMGenerator,
  type Material,
  type MeshPhysicalMaterialParameters,
  type Object3D,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import type { StageContext } from './types'

const environments = new WeakMap<WebGLRenderer, Texture>()

/** A neutral studio reflection map, built once per renderer and reused by every scene on it. */
export function studioEnvironment(renderer: WebGLRenderer): Texture {
  let environment = environments.get(renderer)
  if (!environment) {
    const pmrem = new PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    environment = pmrem.fromScene(room, 0.04).texture
    room.dispose()
    pmrem.dispose()
    environments.set(renderer, environment)
  }
  return environment
}

export interface StudioOptions {
  /** Strength of the reflections. Default 0.9. */
  environment?: number
  /** Key light from the upper left front. Default 1.5. */
  key?: number
  /** Rim light from behind on the right, the one that draws white edges on dark objects. Default 1.8. */
  rim?: number
  /** Soft fill from above. Default 0.3. */
  fill?: number
}

export interface StudioRig {
  key: DirectionalLight
  rim: DirectionalLight
  fill: HemisphereLight
}

/**
 * Light a scene for solid objects: studio reflections plus a key, a rim and a soft fill, all white.
 * Call it once in a scene's init(). The lights belong to the scene; the reflection map is shared and must not be disposed.
 */
export function applyStudio(ctx: StageContext, options: StudioOptions = {}): StudioRig {
  ctx.scene.environment = studioEnvironment(ctx.renderer)
  ctx.scene.environmentIntensity = options.environment ?? 0.9
  const key = new DirectionalLight(0xffffff, options.key ?? 1.5)
  key.position.set(-3, 4, 5)
  const rim = new DirectionalLight(0xffffff, options.rim ?? 1.8)
  rim.position.set(4, 2.5, -5)
  const fill = new HemisphereLight(0xffffff, 0x000000, options.fill ?? 0.3)
  ctx.scene.add(key, rim, fill)
  return { key, rim, fill }
}

/**
 * The four finishes.
 * obsidian: glossy near-black with a clear coat, reads as black glass or polished stone.
 * ceramic: warm white, softly glossy.
 * chrome: mirror metal.
 * graphite: matte dark gray for bases and quiet parts.
 */
export type StudioFinish = 'obsidian' | 'ceramic' | 'chrome' | 'graphite'

const FINISHES: Record<StudioFinish, MeshPhysicalMaterialParameters> = {
  obsidian: { color: 0x0c0c0d, metalness: 0.4, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 },
  ceramic: { color: 0xd9d9d4, metalness: 0, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.25 },
  chrome: { color: 0xffffff, metalness: 1, roughness: 0.07 },
  graphite: { color: 0x1b1b1c, metalness: 0.15, roughness: 0.7 },
}

/** A new material in one of the studio finishes. The caller owns it (dispose it with the object it is on). */
export function studioMaterial(finish: StudioFinish, overrides: MeshPhysicalMaterialParameters = {}): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ ...FINISHES[finish], ...overrides })
}

const TEXTURE_SLOTS = ['map', 'alphaMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const

function disposeMaterial(material: Material): void {
  const slots = material as unknown as Record<string, { isTexture?: boolean; dispose?: () => void } | undefined>
  for (const slot of TEXTURE_SLOTS) {
    const texture = slots[slot]
    if (texture && texture.isTexture && texture.dispose) texture.dispose()
  }
  material.dispose()
}

/** Free the geometries, materials and textures of an object and everything under it. Call it from a scene's dispose(). */
export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    const mesh = object as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] }
    if (mesh.geometry) mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial)
    else if (mesh.material) disposeMaterial(mesh.material)
  })
}

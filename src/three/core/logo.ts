/*
 * Logos as 3D: a white silhouette texture from any logo file, a medallion (coin) that carries it on both faces,
 * and a solid extruded logo built from an SVG's own outlines.
 * Import this only from scene modules (it pulls in three.js).
 */

import {
  Box2,
  CanvasTexture,
  CircleGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector2,
  type BufferGeometry,
  type Shape,
  type Texture,
} from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { studioMaterial, type StudioFinish } from './studio'

export interface LogoTextureOptions {
  /** Texture edge in pixels. Default 512. */
  size?: number
  /** Empty margin on each side as a fraction of the edge. Default 0.2. */
  padding?: number
  /** Silhouette color. Default white. Pass null to keep the file's own colors (for the color logo variants). */
  color?: string | null
}

/**
 * Load a logo (SVG or PNG with transparency) onto a transparent square texture, centered and scaled to fit:
 * as a one-color silhouette by default, or in its own colors with `color: null`. Browser only. The caller owns the texture.
 */
export async function loadLogoTexture(url: string, options: LogoTextureOptions = {}): Promise<CanvasTexture> {
  const size = options.size ?? 512
  const padding = options.padding ?? 0.2
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  await image.decode()
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas is unavailable')
  const width = image.naturalWidth || 300
  const height = image.naturalHeight || 150
  const box = size * (1 - padding * 2)
  const scale = Math.min(box / width, box / height)
  const w = width * scale
  const h = height * scale
  context.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
  if (options.color !== null) {
    context.globalCompositeOperation = 'source-in'
    context.fillStyle = options.color ?? '#ffffff'
    context.fillRect(0, 0, size, size)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export interface MedallionOptions {
  /** The logo silhouette (from loadLogoTexture). Can be set later with setLogo. */
  logo?: Texture | null
  /** Coin radius in world units. Default 1. */
  radius?: number
  /** Coin thickness. Default 0.14 of the radius. */
  thickness?: number
  /** Body finish. Default 'obsidian' (white logo on black). Use 'ceramic' with a dark logoColor for the inverse. */
  finish?: StudioFinish
  /** Tint of the logo faces. Default white (leave it white for color logo textures: the tint multiplies). */
  logoColor?: number
  /**
   * 'light' sets a white enamel disc into both faces, so a logo in its real brand colors reads properly
   * (load it with `loadLogoTexture(logoOn('light', path), { color: null })`). Default 'none': the logo sits on the body finish.
   */
  face?: 'none' | 'light'
}

export interface Medallion {
  /** Add this to the scene. The faces look along +Z and -Z. */
  group: Group
  /** Show a logo on both faces (takes ownership of nothing: dispose textures you load yourself). */
  setLogo(texture: Texture | null): void
  dispose(): void
}

/** A coin with a beveled rim that carries a logo on both faces. */
export function createMedallion(options: MedallionOptions = {}): Medallion {
  const radius = options.radius ?? 1
  const thickness = options.thickness ?? radius * 0.14
  const half = thickness / 2
  const bevel = Math.min(half * 0.7, radius * 0.05)

  // Profile of half the coin, revolved around Y, then turned so the faces look along Z.
  const profile = [
    new Vector2(0, half),
    new Vector2(radius - bevel, half),
    new Vector2(radius, half - bevel),
    new Vector2(radius, -(half - bevel)),
    new Vector2(radius - bevel, -half),
    new Vector2(0, -half),
  ]
  const bodyGeometry = new LatheGeometry(profile, 96)
  bodyGeometry.rotateX(Math.PI / 2)
  bodyGeometry.computeVertexNormals()
  const bodyMaterial = studioMaterial(options.finish ?? 'obsidian')
  const body = new Mesh(bodyGeometry, bodyMaterial)

  const faceGeometry = new CircleGeometry(radius - bevel * 1.5, 72)
  const faceMaterial = new MeshBasicMaterial({
    map: options.logo ?? null,
    color: options.logoColor ?? 0xffffff,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
  faceMaterial.visible = Boolean(options.logo)
  const front = new Mesh(faceGeometry, faceMaterial)
  front.position.z = half + radius * 0.004
  const back = new Mesh(faceGeometry, faceMaterial)
  back.position.z = -(half + radius * 0.004)
  back.rotation.y = Math.PI
  front.renderOrder = 1
  back.renderOrder = 1

  const group = new Group()
  group.add(body, front, back)

  // Optional white enamel inlay under the logo, on both faces.
  let inlayGeometry: CircleGeometry | null = null
  let inlayMaterial: ReturnType<typeof studioMaterial> | null = null
  if (options.face === 'light') {
    inlayGeometry = new CircleGeometry(radius * 0.86, 72)
    inlayMaterial = studioMaterial('ceramic', { color: 0xf4f4f1, roughness: 0.5, clearcoat: 0.3 })
    const inlayFront = new Mesh(inlayGeometry, inlayMaterial)
    inlayFront.position.z = half + radius * 0.002
    const inlayBack = new Mesh(inlayGeometry, inlayMaterial)
    inlayBack.position.z = -(half + radius * 0.002)
    inlayBack.rotation.y = Math.PI
    group.add(inlayFront, inlayBack)
    front.scale.setScalar(0.86)
    back.scale.setScalar(0.86)
  }

  return {
    group,
    setLogo(texture) {
      faceMaterial.map = texture
      faceMaterial.visible = Boolean(texture)
      faceMaterial.needsUpdate = true
    },
    dispose() {
      bodyGeometry.dispose()
      bodyMaterial.dispose()
      faceGeometry.dispose()
      faceMaterial.dispose()
      inlayGeometry?.dispose()
      inlayMaterial?.dispose()
    },
  }
}

export interface LogoSolidOptions {
  /** Length of the logo's longer side in world units. Default 2. */
  size?: number
  /** Extrusion depth in world units. Default 0.22. */
  depth?: number
  /** Finish. Default 'ceramic'. */
  finish?: StudioFinish
}

export interface LogoSolid {
  /** Add this to the scene. Centered on the origin, facing +Z. */
  group: Group
  dispose(): void
}

/**
 * Build a solid, beveled 3D logo from the filled outlines of an SVG file. Works best on simple marks and wordmarks.
 * Rejects when the file has no usable outlines, so callers can fall back to a medallion.
 */
export async function loadLogoSolid(url: string, options: LogoSolidOptions = {}): Promise<LogoSolid> {
  const size = options.size ?? 2
  const depth = options.depth ?? 0.22
  const data = await new SVGLoader().loadAsync(url)

  const shapes: Shape[] = []
  for (const path of data.paths) {
    const style = path.userData?.style as { fill?: string } | undefined
    if (style && style.fill === 'none') continue
    shapes.push(...SVGLoader.createShapes(path))
  }
  if (shapes.length === 0) throw new Error(`No filled outlines in ${url}`)

  const bounds = new Box2()
  for (const shape of shapes) for (const point of shape.getPoints(8)) bounds.expandByPoint(point)
  const extent = Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y) || 1
  const unit = extent / size // SVG units per world unit

  const parts: BufferGeometry[] = shapes.map(
    (shape) =>
      new ExtrudeGeometry(shape, {
        depth: depth * unit,
        bevelEnabled: true,
        bevelThickness: 0.018 * unit,
        bevelSize: 0.012 * unit,
        bevelSegments: 2,
        curveSegments: 10,
      }),
  )
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  if (!merged) throw new Error(`Could not merge outlines of ${url}`)

  merged.computeBoundingBox()
  const box = merged.boundingBox
  if (box) merged.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -(box.min.z + box.max.z) / 2)

  const material = studioMaterial(options.finish ?? 'ceramic')
  const mesh = new Mesh(merged, material)
  // SVG's Y axis points down: flip the object (three corrects the winding for mirrored objects).
  mesh.scale.set(1 / unit, -1 / unit, 1 / unit)

  const group = new Group()
  group.add(mesh)
  return {
    group,
    dispose() {
      merged.dispose()
      material.dispose()
    },
  }
}

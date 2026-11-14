import { Vector3 } from 'three'
import type { Object3D, Vector2, Vector4 } from 'three'

/*
 * Occlusion is analytic, not a depth buffer: a sphere is tested per fragment in the line and node shaders and
 * on the CPU for labels and picking. That gives an exact, antialiased silhouette with no z-fighting, lets the
 * far side be dimmed instead of hidden, and means the renderer needs no depth buffer at all.
 * Spheres are the only occluder shape (every solid in this site's scenes is a globe).
 */

const _eye = new Vector3()
const _dir = new Vector3()
const _oc = new Vector3()

export class Occluder {
  /** World-space centre. Refreshed by the stage before every frame when the occluder follows an object. */
  readonly center = new Vector3()
  /** World-space radius. */
  radius: number
  private readonly follow: Object3D | null
  private readonly localRadius: number

  constructor(radius: number, follow: Object3D | null = null) {
    this.radius = radius
    this.localRadius = radius
    this.follow = follow
  }

  /** Re-read the followed object's world position and scale. */
  update(): void {
    if (!this.follow) return
    this.center.setFromMatrixPosition(this.follow.matrixWorld)
    this.radius = this.localRadius * this.follow.matrixWorld.getMaxScaleOnAxis()
  }

  /**
   * How much of a world point is hidden from the eye: 0 (clear) to 1 (fully behind the sphere).
   * `soft` is the width of the silhouette edge in world units.
   */
  occlusion(point: Vector3, eye: Vector3, soft: number): number {
    _dir.subVectors(point, eye)
    const len = _dir.length()
    if (len < 1e-9) return 0
    _dir.multiplyScalar(1 / len)
    _oc.subVectors(this.center, eye)
    const b = _dir.dot(_oc)
    const h = Math.sqrt(Math.max(_oc.lengthSq() - b * b, 0))
    const r = this.radius
    if (h >= r + soft * 0.5 || len < b) return 0
    const inside = (r - h) / Math.max(soft, 1e-9) + 0.5
    return inside < 0 ? 0 : inside > 1 ? 1 : inside
  }
}

/** Uniforms every wire material of one stage shares by reference. Owned and updated by the stage. */
export interface StageShared {
  /** Size of the view in canvas pixels. */
  uResolution: { value: Vector2 }
  /** Canvas pixels per CSS pixel. */
  uPixelRatio: { value: number }
  /** Camera near plane distance. */
  uNear: { value: number }
  /** World units per canvas pixel at depth 1. */
  uPxScale: { value: number }
  /** Token colors. Each is its own uniform slot so a tone refresh reaches every material. */
  uFront: { value: Vector4 }
  uBack: { value: Vector4 }
  uNode: { value: Vector4 }
}

/** Eye position of a camera in world space, written into a shared scratch vector. Do not keep the result. */
export function eyeOf(camera: Object3D): Vector3 {
  return _eye.setFromMatrixPosition(camera.matrixWorld)
}

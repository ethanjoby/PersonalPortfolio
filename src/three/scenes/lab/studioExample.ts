import { Group } from 'three'
import { logoOn } from '@/lib/logos'
import { createMedallion, loadLogoSolid, loadLogoTexture } from '../../core/logo'
import { applyStudio } from '../../core/studio'
import type { SceneFactory } from '../../core/types'

/*
 * Worked example of the studio kit: a white-logo coin, a full-color logo on a white enamel face, a ceramic coin,
 * and a solid extruded logo, all under studio light.
 */
const scene: SceneFactory = () => {
  const root = new Group()
  const spinners: Group[] = []
  const disposers: Array<() => void> = []
  return {
    init(ctx) {
      applyStudio(ctx)
      ctx.scene.add(root)
      // [logo, x, body finish, logo tint, 'light' = white enamel face carrying the logo in its brand colors]
      const coins: Array<[string, number, 'obsidian' | 'ceramic', number, 'none' | 'light']> = [
        ['/logos/react.svg', -3.3, 'obsidian', 0xffffff, 'none'],
        ['/logos/python.svg', -1.1, 'obsidian', 0xffffff, 'light'],
        ['/logos/docker.svg', 1.1, 'ceramic', 0x0e0e0d, 'none'],
      ]
      for (const [url, x, finish, logoColor, face] of coins) {
        const coin = createMedallion({ finish, logoColor, face })
        coin.group.position.x = x
        root.add(coin.group)
        spinners.push(coin.group)
        disposers.push(coin.dispose)
        const loading = face === 'light' ? loadLogoTexture(logoOn('light', url), { color: null }) : loadLogoTexture(url)
        void loading.then((texture) => {
          coin.setLogo(texture)
          disposers.push(() => texture.dispose())
          ctx.invalidate()
        })
      }
      void loadLogoSolid('/logos/typescript.svg', { size: 1.8 }).then((solid) => {
        solid.group.position.x = 3.3
        root.add(solid.group)
        spinners.push(solid.group)
        disposers.push(solid.dispose)
        ctx.invalidate()
      })
    },
    update(_ctx, time) {
      spinners.forEach((group, i) => {
        group.rotation.y = Math.sin(time * 0.6 + i) * 0.9
        group.rotation.x = Math.sin(time * 0.4 + i * 2) * 0.18
      })
      return true
    },
    resize(ctx) {
      ctx.frame(4.6, 0.96)
    },
    dispose() {
      disposers.forEach((dispose) => dispose())
    },
  }
}

export default scene

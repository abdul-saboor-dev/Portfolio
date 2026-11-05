import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

// PNG frames stay in public/frames as the conversion sources for
// scripts/convert-webp.mjs. Only WebP is fetched at runtime, so the PNG copies
// are dropped from the built output to keep deployments small.
function prunePngFrames() {
  let framesOutDir = null

  return {
    name: 'prune-png-frames',
    apply: 'build',
    configResolved(config) {
      framesOutDir = join(config.root, config.build.outDir, 'frames')
    },
    async closeBundle() {
      if (!framesOutDir) return
      let entries = []
      try {
        entries = await readdir(framesOutDir)
      } catch {
        return
      }
      const pngs = entries.filter((name) => name.toLowerCase().endsWith('.png'))
      await Promise.all(pngs.map((name) => rm(join(framesOutDir, name), { force: true })))
      this.info(`pruned ${pngs.length} PNG frames from ${framesOutDir}`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), prunePngFrames()],
})

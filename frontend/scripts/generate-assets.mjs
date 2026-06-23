import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO = path.resolve(__dirname, '../public/logo.png')
const RES  = path.resolve(__dirname, '../android/app/src/main/res')

const BG   = { r: 12,  g: 12,  b: 18,  alpha: 1 }  // #0c0c12
const GOLD = { r: 201, g: 162, b: 39,  alpha: 1 }  // #c9a227

// ── App icons ───────────────────────────────────────────────────
const ICONS = [
  { dir: 'mipmap-mdpi',    size: 48  },
  { dir: 'mipmap-hdpi',    size: 72  },
  { dir: 'mipmap-xhdpi',   size: 96  },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
]

async function makeIcon(size) {
  const pad      = Math.round(size * 0.14)
  const logoSize = size - pad * 2
  const logo = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .png()
    .composite([{ input: logo, top: pad, left: pad }])
    .toBuffer()
}

// ── Splash screens ──────────────────────────────────────────────
const SPLASHES = [
  { dir: 'drawable',             w: 1080, h: 1920 },
  { dir: 'drawable-port-mdpi',   w: 320,  h: 480  },
  { dir: 'drawable-port-hdpi',   w: 480,  h: 800  },
  { dir: 'drawable-port-xhdpi',  w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi',w: 1280, h: 1920 },
  { dir: 'drawable-land-mdpi',   w: 480,  h: 320  },
  { dir: 'drawable-land-hdpi',   w: 800,  h: 480  },
  { dir: 'drawable-land-xhdpi',  w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi',w: 1920, h: 1280 },
]

async function makeSplash(w, h) {
  const logoSize = Math.round(Math.min(w, h) * 0.36)
  const logoTop  = Math.round((h - logoSize) / 2) - Math.round(h * 0.04)
  const logoLeft = Math.round((w - logoSize) / 2)

  const barW = Math.round(w * 0.28)
  const barH = Math.max(3, Math.round(h * 0.003))
  const barTop  = Math.round(h * 0.70)
  const barLeft = Math.round((w - barW) / 2)

  const logo = await sharp(LOGO)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer()

  const bar = await sharp({ create: { width: barW, height: barH, channels: 4, background: GOLD } })
    .png().toBuffer()

  return sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .png()
    .composite([
      { input: logo, top: logoTop,  left: logoLeft },
      { input: bar,  top: barTop,   left: barLeft  },
    ])
    .toBuffer()
}

// ── Run ─────────────────────────────────────────────────────────
console.log('Generating app icons...')
for (const { dir, size } of ICONS) {
  const buf = await makeIcon(size)
  const outDir = path.join(RES, dir)
  fs.mkdirSync(outDir, { recursive: true })
  await sharp(buf).toFile(path.join(outDir, 'ic_launcher.png'))
  await sharp(buf).toFile(path.join(outDir, 'ic_launcher_round.png'))
  await sharp(buf).toFile(path.join(outDir, 'ic_launcher_foreground.png'))
  console.log(`  ✓ ${dir} (${size}x${size})`)
}

console.log('Generating splash screens...')
for (const { dir, w, h } of SPLASHES) {
  const buf = await makeSplash(w, h)
  const outDir = path.join(RES, dir)
  fs.mkdirSync(outDir, { recursive: true })
  await sharp(buf).toFile(path.join(outDir, 'splash.png'))
  console.log(`  ✓ ${dir} (${w}x${h})`)
}

console.log('\n✅ All assets generated!')

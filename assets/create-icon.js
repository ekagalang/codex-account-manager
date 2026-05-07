const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const assetsDir = __dirname
fs.mkdirSync(assetsDir, { recursive: true })

// SVG logo huruf C
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
    font-size="40" fill="#22c55e" font-family="Arial, sans-serif" font-weight="bold">
    C
  </text>
</svg>
`

// Simpan SVG dulu
fs.writeFileSync(path.join(assetsDir, 'tray-icon.svg'), svg)
console.log('SVG created')

// Convert ke PNG 32x32 (lebih clear dari 16x16)
sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toFile(path.join(assetsDir, 'tray-icon.png'))
  .then(() => console.log('PNG created: assets/tray-icon.png'))
  .catch(err => console.error('Error:', err))
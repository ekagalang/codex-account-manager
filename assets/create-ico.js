const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const pngToIco = require('png-to-ico')

async function createIco() {
  const svgPath = path.join(__dirname, 'tray-icon.svg')
  const svg = fs.readFileSync(svgPath)

  // Generate PNG berbagai ukuran untuk .ico
  const sizes = [16, 32, 48, 64, 128, 256]

  console.log('Generating PNG sizes...')
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(svg)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  )

  // Simpan 256x256 sebagai icon.png utama
  fs.writeFileSync(path.join(__dirname, 'icon.png'), pngBuffers[5])
  console.log('✓ icon.png created (256x256)')

  // Convert ke .ico
  const icoBuffer = await pngToIco(pngBuffers)
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer)
  console.log('✓ icon.ico created')

  // Update tray-icon.png ke 32x32
  fs.writeFileSync(path.join(__dirname, 'tray-icon.png'), pngBuffers[1])
  console.log('✓ tray-icon.png updated (32x32)')
}

createIco().catch(console.error)
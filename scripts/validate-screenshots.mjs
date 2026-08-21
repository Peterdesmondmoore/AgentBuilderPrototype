import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(root, 'demo/package.json'))
const sharp = require('sharp')
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_BYTES = 25 * 1024 * 1024
const MAX_WIDTH = 4096
const MAX_HEIGHT = 4096
const MAX_PIXELS = 16_777_216

const catalogue = JSON.parse(await readFile(resolve(root, 'prototype.json'), 'utf8'))
let total = 0
let count = 0
for (const reference of catalogue.prototypes.filter((item) => item.deliveryMode === 'screenshots')) {
  const manifest = JSON.parse(await readFile(resolve(root, reference.manifestPath.slice(1)), 'utf8'))
  for (const descriptor of manifest.screenshots) {
    const path = resolve(root, descriptor.path.slice(1))
    const bytes = await readFile(path)
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error(`${descriptor.path} exceeds the file-size limit.`)
    let metadata
    try {
      metadata = await sharp(bytes, { animated: true, failOn: 'warning', limitInputPixels: MAX_PIXELS }).metadata()
    } catch (error) {
      throw new Error(`${descriptor.path} is not a safely decodable image.`, { cause: error })
    }
    const suffix = descriptor.path.split('.').at(-1).toLowerCase()
    const declared = suffix === 'jpg' ? 'jpeg' : suffix
    if (metadata.format !== declared) throw new Error(`${descriptor.path} does not match its declared PNG, JPEG or WebP type.`)
    if ((metadata.pages ?? 1) !== 1) throw new Error(`${descriptor.path} must not be animated.`)
    if (!metadata.width || !metadata.height || metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT || metadata.width * metadata.height > MAX_PIXELS) throw new Error(`${descriptor.path} exceeds the decoded-image limits.`)
    try {
      await sharp(bytes, { failOn: 'warning', limitInputPixels: MAX_PIXELS }).raw().toBuffer()
    } catch (error) {
      throw new Error(`${descriptor.path} could not be decoded completely.`, { cause: error })
    }
    total += bytes.length
    count += 1
  }
}
if (total > MAX_TOTAL_BYTES) throw new Error('Repository screenshots exceed the total image-size limit.')
console.log(`Validated ${count} committed screenshot artifacts (${total} bytes).`)

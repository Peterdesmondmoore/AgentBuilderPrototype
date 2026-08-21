import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const modes = new Set(['live', 'screenshots'])
const factors = new Set(['mobile', 'laptop'])
const statuses = new Set(['draft', 'testing', 'approved'])
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

const load = async (path) => JSON.parse(await readFile(resolve(rootDirectory, path), 'utf8'))
const fail = (message) => { throw new Error(message) }
const exactKeys = (value, keys, label) => {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.join('\0') !== expected.join('\0')) fail(`${label} has unsupported or missing fields.`)
}

const catalogue = await load('prototype.json')
if (
  catalogue.schemaVersion !== 1
  || !keyPattern.test(catalogue.productKey)
  || !keyPattern.test(catalogue.catalogueId)
  || catalogue.repository !== undefined
) fail('Root catalogue identity is invalid.')
if (!Array.isArray(catalogue.prototypes) || !catalogue.prototypes.length) fail('Root catalogue must register prototypes.')
const rootKeys = new Set()
const rootPaths = new Set()
for (const reference of catalogue.prototypes) {
  exactKeys(reference, ['prototypeKey', 'isSample', 'deliveryMode', 'formFactor', 'manifestPath'], 'Root prototype entry')
  if (!keyPattern.test(reference.prototypeKey) || rootKeys.has(reference.prototypeKey)) fail('Prototype keys must be unique semantic slugs.')
  if (!modes.has(reference.deliveryMode) || !factors.has(reference.formFactor)) fail('Root delivery mode or form factor is invalid.')
  const expectedPath = `/prototypes/${reference.prototypeKey}/prototype.json`
  if (reference.manifestPath !== expectedPath || rootPaths.has(reference.manifestPath)) fail('Manifest paths must match unique prototype keys.')
  rootKeys.add(reference.prototypeKey)
  rootPaths.add(reference.manifestPath)

  const child = await load(reference.manifestPath.slice(1))
  if (
    child.schemaVersion !== 1
    || child.productKey !== catalogue.productKey
    || child.catalogueId !== catalogue.catalogueId
    || child.repositoryKey !== undefined
    || child.prototypeKey !== reference.prototypeKey
    || typeof child.isSample !== 'boolean'
    || child.isSample !== reference.isSample
    || child.deliveryMode !== reference.deliveryMode
    || child.formFactor !== reference.formFactor
    || child.fidelity !== 'simulated'
    || !statuses.has(child.status)
  ) fail(`Child manifest ${reference.prototypeKey} does not match the root catalogue.`)
  if (!Array.isArray(child.pages) || !child.pages.length || new Set(child.pages).size !== child.pages.length) fail(`Child manifest ${reference.prototypeKey} has invalid pages.`)
  if (!Array.isArray(child.limitations) || !child.limitations.length) fail(`Child manifest ${reference.prototypeKey} must disclose limitations.`)
  const annotationPages = (child.annotations ?? []).map((annotation) => annotation.page)
  if (new Set(annotationPages).size !== annotationPages.length || annotationPages.some((page) => !child.pages.includes(page))) fail(`Child manifest ${reference.prototypeKey} has invalid annotations.`)
  for (const annotation of child.annotations ?? []) {
    const numbers = annotation.items?.map((item) => item.number) ?? []
    if (new Set(numbers).size !== numbers.length) fail(`Child manifest ${reference.prototypeKey} has duplicate annotation numbers on page ${annotation.page}.`)
    for (const item of annotation.items ?? []) {
      if (
        item.title !== undefined
        && (typeof item.title !== 'string' || item.title.length < 1 || item.title.length > 120 || controlCharacters.test(item.title))
      ) fail(`Child manifest ${reference.prototypeKey} has an invalid annotation title on page ${annotation.page}.`)
    }
  }
  if (child.deliveryMode === 'live') {
    if (!child.demoPath || !child.entryRoute || child.integration?.protocol !== 'mission-surface-prototype' || child.integration?.version !== 2) fail(`Live prototype ${reference.prototypeKey} has invalid bridge metadata.`)
    if (child.screenshots) fail(`Live prototype ${reference.prototypeKey} must not declare screenshots.`)
  } else {
    if (child.demoPath || child.entryRoute || child.integration) fail(`Screenshot prototype ${reference.prototypeKey} must not declare live metadata.`)
    const mappings = child.screenshots ?? []
    if (mappings.length !== child.pages.length || mappings.some((mapping, index) => mapping.page !== child.pages[index])) fail(`Screenshot prototype ${reference.prototypeKey} must map every page exactly once and in order.`)
    const prefix = `/prototypes/${reference.prototypeKey}/screenshots/`
    if (mappings.some((mapping) => !mapping.path.startsWith(prefix) || mapping.path.slice(prefix.length).includes('/') || mapping.path.includes('..') || !/\.(png|jpe?g|webp)$/i.test(mapping.path))) fail(`Screenshot prototype ${reference.prototypeKey} has an unsafe artifact path.`)
  }
}

console.log(`Validated ${catalogue.prototypes.length} mixed-mode prototype manifests.`)

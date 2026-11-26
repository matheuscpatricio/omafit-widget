#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(root, '..')
const failures = []

function check(name, fn) {
  try {
    fn()
    console.log(`ok ${name}`)
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    console.error(`fail ${name}`)
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (name === 'node_modules' || name === '.vtex') continue
    if (statSync(path).isDirectory()) walk(path, acc)
    else if (name.endsWith('.json')) acc.push(path)
  }
  return acc
}

check('json', () => {
  const files = walk(root)
  assert.ok(files.length >= 8)
  for (const file of files) readJson(file)
})

check('manifest', () => {
  const manifest = readJson(join(root, 'manifest.json'))
  assert.equal(manifest.vendor, 'omafit')
  assert.equal(manifest.name, 'store-widget')
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
  assert.ok(manifest.title && manifest.description)
  for (const builder of ['react', 'store', 'admin', 'messages', 'docs']) {
    assert.ok(manifest.builders[builder], builder)
  }
  for (const dep of [
    'vtex.styleguide',
    'vtex.product-context',
    'vtex.render-runtime',
    'vtex.css-handles',
    'vtex.order-items',
    'vtex.apps-graphql',
  ]) {
    assert.ok(manifest.dependencies[dep], dep)
  }
  assert.equal(manifest.peerDependencies['vtex.store'], '2.x')
  assert.equal(manifest.billingOptions.type, 'free')
  assert.equal(manifest.billingOptions.support.email, 'contato@omafit.co')
  assert.equal(manifest.settingsSchema.type, 'object')
  assert.ok(manifest.settingsSchema.properties.publicId)

  const constants = readFileSync(join(root, 'react/modules/constants.ts'), 'utf8')
  assert.match(constants, new RegExp(`OMAFIT_VENDOR = '${manifest.vendor}'`))
  assert.match(constants, new RegExp(`OMAFIT_APP_NAME = '${manifest.name}'`))

  const interfaces = readJson(join(root, 'store/interfaces.json'))
  assert.equal(interfaces['omafit-pdp'].component, 'OmafitPdp')
  const routes = readJson(join(root, 'admin/routes.json'))
  assert.equal(routes['admin.app.omafit'].component, 'AdminOmafit')
  assert.equal(routes['admin.app.omafit'].path, '/admin/omafit')
})

check('messages', () => {
  const en = readJson(join(root, 'messages/en.json'))
  const pt = readJson(join(root, 'messages/pt.json'))
  const es = readJson(join(root, 'messages/es.json'))
  const context = readJson(join(root, 'messages/context.json'))
  const keys = Object.keys(en).sort()
  assert.deepEqual(Object.keys(pt).sort(), keys)
  assert.deepEqual(Object.keys(es).sort(), keys)
  assert.deepEqual(Object.keys(context).sort(), keys)
  for (const key of keys) {
    assert.equal(typeof en[key], 'string')
    assert.ok(String(en[key]).trim())
    assert.ok(String(pt[key]).trim())
    assert.ok(String(es[key]).trim())
  }
  const navigation = JSON.stringify(readJson(join(root, 'admin/navigation.json')))
  for (const id of [
    'admin/omafit.navigation.group',
    'admin/omafit.navigation.label',
    'admin/omafit.navigation.search',
  ]) {
    assert.ok(navigation.includes(id), id)
    assert.ok(en[id], id)
  }
})

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

const contract = spawnSync(
  process.execPath,
  ['--import', join(root, 'scripts/register-ts.mjs'), '--test', join(root, 'react/modules/omafitVtex.test.ts')],
  {
    cwd: root,
    encoding: 'utf8',
  }
)
process.stdout.write(contract.stdout || '')
process.stderr.write(contract.stderr || '')
if (contract.status !== 0) process.exit(contract.status || 1)

const tscBin = join(repoRoot, 'node_modules/typescript/bin/tsc')
let hasTsc = false
try {
  statSync(tscBin)
  hasTsc = true
} catch {
  hasTsc = false
}
if (!hasTsc) {
  console.log('tsc ausente (node_modules na raiz). Contrato e manifest já foram validados.')
  process.exit(0)
}

const compiled = spawnSync(process.execPath, [tscBin, '-p', join(root, 'react/tsconfig.json')], {
  cwd: root,
  encoding: 'utf8',
})
process.stdout.write(compiled.stdout || '')
process.stderr.write(compiled.stderr || '')
if (compiled.status !== 0) process.exit(compiled.status || 1)
console.log('tsc --noEmit ok')

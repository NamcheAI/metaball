#!/usr/bin/env node
/**
 * Vendor the built engine into the design repo.
 *
 * The design system consumes a plain, dependency-free ES module plus its type
 * declarations — no build step, no node_modules — so it can be read by the
 * Claude Design project and imported by the React wrapper alike. Each file
 * gets a provenance header naming the version and source commit, so a stale
 * copy is always identifiable.
 *
 *   npm run sync:design                    → ../design/generator/
 *   npm run sync:design -- --to <dir>
 *   npm run sync:design -- --check         → verify only, non-zero if stale
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Written alongside the vendored files so the consumer can verify them
 *  without needing access to this repo. */
const MANIFEST = '.sync-manifest.json'
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex')

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const distDir = resolve(repo, 'core/dist')

const args = process.argv.slice(2)
const toFlag = args.indexOf('--to')
const target =
  toFlag === -1 ? resolve(repo, '../design/generator') : resolve(args[toFlag + 1])
const checkOnly = args.includes('--check')

const pkg = JSON.parse(await readFile(resolve(repo, 'core/package.json'), 'utf8'))

function gitInfo() {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim()
    const dirty =
      execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim()
        .length > 0
    return { commit, dirty }
  } catch {
    return { commit: 'unknown', dirty: false }
  }
}

const { commit, dirty } = gitInfo()

const header = (name) =>
  `/* ${name} — generated file, do not edit.\n` +
  ` * Source: metaball (${pkg.name}@${pkg.version}) at commit ${commit}${dirty ? '+dirty' : ''}\n` +
  ` * Regenerate with: npm run sync:design  (in the metaball repo)\n` +
  ` */\n`

let files
try {
  files = (await readdir(distDir)).filter((f) => f.endsWith('.js') || f.endsWith('.d.ts'))
} catch {
  console.error(`sync: no build output at ${distDir}\nRun "npm run build:core" first.`)
  process.exit(1)
}
if (!files.length) {
  console.error(`sync: ${distDir} is empty — run "npm run build:core" first.`)
  process.exit(1)
}

if (dirty && !checkOnly) {
  console.warn('sync: working tree is dirty — the header will record it as +dirty.\n')
}

await mkdir(target, { recursive: true })

let stale = 0
const hashes = {}
for (const file of files.sort()) {
  const body = await readFile(resolve(distDir, file), 'utf8')
  const content = header(file) + body
  const dest = resolve(target, file)
  hashes[file] = sha256(content)

  if (checkOnly) {
    let existing = null
    try {
      existing = await readFile(dest, 'utf8')
    } catch {
      /* missing counts as stale */
    }
    // Compare bodies only — the header carries a commit hash that legitimately
    // changes without the code changing.
    const strip = (s) => (s ?? '').replace(/^\/\*[\s\S]*?\*\/\n/, '')
    if (strip(existing) !== strip(content)) {
      console.error(`stale: ${file}`)
      stale++
    }
  } else {
    await writeFile(dest, content, 'utf8')
    console.log(`→ ${file}`)
  }
}

if (checkOnly) {
  if (stale) {
    console.error(`\n${stale} file(s) out of date in ${target}`)
    process.exit(1)
  }
  console.log(`up to date: ${target}`)
} else {
  const manifest = {
    package: pkg.name,
    version: pkg.version,
    commit: dirty ? `${commit}+dirty` : commit,
    algorithm: 'sha256',
    files: hashes,
  }
  await writeFile(
    resolve(target, MANIFEST),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  )
  console.log(`→ ${MANIFEST}`)
  console.log(`\n${files.length} files → ${target}`)
  console.log(`stamped ${pkg.name}@${pkg.version} @ ${manifest.commit}`)
}

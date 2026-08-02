#!/usr/bin/env node
/**
 * Copy the baked marks into the design repo.
 *
 * `assets/shapes/` there holds the vectors exported from the Figma file and
 * stays canonical; these land in `assets/shapes/generated/` so the two are
 * never confused. A generated form is a new form, not a replacement for a
 * drawn one.
 *
 *   npm run sync:marks                 → ../design/assets/shapes/generated/
 *   npm run sync:marks -- --to <dir>
 *   npm run sync:marks -- --check      → verify only, non-zero if stale
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const marksDir = resolve(repo, 'assets/marks')

const args = process.argv.slice(2)
const toFlag = args.indexOf('--to')
const target =
  toFlag === -1
    ? resolve(repo, '../design/assets/shapes/generated')
    : resolve(args[toFlag + 1])
const checkOnly = args.includes('--check')

let files
try {
  files = (await readdir(marksDir)).filter((f) => f.endsWith('.svg')).sort()
} catch {
  console.error(`sync: no baked marks at ${marksDir}\nRun "npm run bake" first.`)
  process.exit(1)
}
if (!files.length) {
  console.error(`sync: ${marksDir} holds no SVGs — run "npm run bake" first.`)
  process.exit(1)
}

if (!checkOnly) await mkdir(target, { recursive: true })

let stale = 0
for (const file of files) {
  const content = await readFile(resolve(marksDir, file), 'utf8')
  const dest = resolve(target, file)
  if (checkOnly) {
    let existing = null
    try {
      existing = await readFile(dest, 'utf8')
    } catch {
      /* missing counts as stale */
    }
    if (existing !== content) {
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
    console.error(`\n${stale} mark(s) out of date in ${target}`)
    process.exit(1)
  }
  console.log(`up to date: ${target}`)
} else {
  console.log(`\n${files.length} marks → ${target}`)
}

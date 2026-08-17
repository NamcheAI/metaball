import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const skillsRoot = join(root, '.cursor', 'skills')

async function markdownFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files
}

const failures = []
let checked = 0
for (const file of await markdownFiles(skillsRoot)) {
  const markdown = await readFile(file, 'utf8')
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split('#', 1)[0]
    if (!target || target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue
    checked += 1
    const resolved = resolve(dirname(file), decodeURIComponent(target))
    try {
      await stat(resolved)
    } catch {
      failures.push(`${relative(root, file)} -> ${target}`)
    }
  }
}

if (failures.length) {
  console.error(`Broken skill links:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Verified ${checked} local skill links.`)
}

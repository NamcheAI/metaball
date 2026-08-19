#!/usr/bin/env node
/**
 * Sync the serializable public surface registry into the sibling design repo.
 * Runtime shader/fiber implementations remain in the renderer; design tools
 * consume this catalog for controls, prompts, provenance, and approved assets.
 *
 *   npm run build:renderer
 *   npm run sync:surfaces
 *   npm run sync:surfaces -- --check
 *   npm run sync:surfaces -- --to <file>
 */
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const args = process.argv.slice(2);
const toFlag = args.indexOf('--to');
const target = toFlag === -1
  ? resolve(repo, '../design/assets/metaballs/surfaces/catalog.json')
  : resolve(args[toFlag + 1]);
const checkOnly = args.includes('--check');

const rendererPackage = JSON.parse(
  await readFile(resolve(repo, 'renderer/package.json'), 'utf8'),
);
const rendererEntry = resolve(repo, 'renderer/dist/index.js');
const { SURFACE_PRESETS } = await import(pathToFileURL(rendererEntry).href);

function gitInfo() {
  try {
    const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim().length > 0;
    return dirty ? `${commit}+dirty` : commit;
  } catch {
    return 'unknown';
  }
}

const catalog = {
  schemaVersion: 1,
  source: {
    package: rendererPackage.name,
    version: rendererPackage.version,
    commit: gitInfo(),
    repository: 'https://github.com/NamcheAI/metaball',
  },
  rule: 'Only scale, intensity, and seed are common; use each preset controls array for the rest.',
  surfaces: SURFACE_PRESETS,
};
const content = `${JSON.stringify(catalog, null, 2)}\n`;

if (checkOnly) {
  let existing = null;
  try {
    existing = await readFile(target, 'utf8');
  } catch {
    // Missing is stale.
  }
  if (existing !== content) {
    console.error(`stale: ${target}`);
    process.exit(1);
  }
  console.log(`up to date: ${target}`);
} else {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  console.log(`→ ${target}`);
}

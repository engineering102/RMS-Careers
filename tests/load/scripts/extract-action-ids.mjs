#!/usr/bin/env node
// Extract { exportedName: actionId } for Next.js Server Actions from a build, for the write scenarios.
//
//   node tests/load/scripts/extract-action-ids.mjs <build dir> [--out=<file>]
//
// <build dir> is the build the TARGET is running: apps/student/.next (next start / next dev build) or
// apps/student/.open-next (OpenNext / workerd). Action ids are generated per build, so ids from any other build
// will not match. The manifest holds ids and export names only: nothing secret.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST = 'server-reference-manifest.json';

export function findManifests(dir, depth = 0, out = []) {
  if (depth > 12) return out;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'cache') continue;
    const full = path.join(dir, name);
    if (name === MANIFEST) out.push(full);
    else if (statSync(full, { throwIfNoEntry: false })?.isDirectory()) findManifests(full, depth + 1, out);
  }
  return out;
}

/** Pure: manifest JSON -> Map(exportedName -> Set(id)). */
export function actionsFromManifest(manifest) {
  const found = new Map();
  const add = (name, id) => {
    if (!name || !id) return;
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(id);
  };
  for (const layer of ['node', 'edge']) {
    for (const [id, entry] of Object.entries(manifest?.[layer] ?? {})) {
      if (entry?.exportedName) add(entry.exportedName, id);
      for (const worker of Object.values(entry?.workers ?? {})) {
        const moduleId = typeof worker === 'string' ? worker : worker?.moduleId;
        const m = String(moduleId ?? '').match(/[?&]actions=([^&!]+)/);
        if (!m) continue;
        let parsed;
        try {
          parsed = JSON.parse(decodeURIComponent(m[1]));
        } catch {
          continue;
        }
        for (const [, actions] of parsed) {
          for (const a of actions ?? []) if (a?.id === id) add(a.exportedName, a.id);
        }
      }
    }
  }
  return found;
}

function main() {
  const [dir, ...rest] = process.argv.slice(2);
  if (!dir) {
    console.error('usage: extract-action-ids.mjs <build dir> [--out=<file>]');
    process.exit(2);
  }
  const manifests = findManifests(path.resolve(dir));
  if (manifests.length === 0) {
    console.error(`No ${MANIFEST} under ${dir}. Build the app first.`);
    process.exit(1);
  }
  const merged = new Map();
  for (const file of manifests) {
    for (const [name, ids] of actionsFromManifest(JSON.parse(readFileSync(file, 'utf8')))) {
      if (!merged.has(name)) merged.set(name, new Set());
      for (const id of ids) merged.get(name).add(id);
    }
  }
  const result = {};
  const ambiguous = [];
  for (const [name, ids] of [...merged].sort(([a], [b]) => a.localeCompare(b))) {
    if (ids.size === 1) result[name] = [...ids][0];
    else ambiguous.push(name);
  }
  if (ambiguous.length) console.error(`Skipped ambiguous export names (several ids): ${ambiguous.join(', ')}`);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  const out = rest.find((a) => a.startsWith('--out='))?.slice(6);
  if (out) {
    writeFileSync(out, json);
    console.error(`Wrote ${Object.keys(result).length} action id(s) to ${out}`);
  } else {
    process.stdout.write(json);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

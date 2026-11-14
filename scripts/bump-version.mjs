#!/usr/bin/env node
// Bumps the Jenzo Download Manager (JDM) version across all workspace manifests at once.
// Usage:
//   node source/scripts/bump-version.mjs 1.2.0
//   node source/scripts/bump-version.mjs patch | minor | major

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = dirname(__dirname);
const rootDir = dirname(sourceDir);

const tauriConfPath = join(sourceDir, 'app', 'src-tauri', 'tauri.conf.json');
const current = JSON.parse(readFileSync(tauriConfPath, 'utf8')).version;

const arg = process.argv[2] || 'patch';
let next = arg;
if (['patch', 'minor', 'major'].includes(arg)) {
  const [maj, min, pat] = current.split('.').map(Number);
  if (arg === 'patch') next = `${maj}.${min}.${pat + 1}`;
  if (arg === 'minor') next = `${maj}.${min + 1}.0`;
  if (arg === 'major') next = `${maj + 1}.0.0`;
}

if (!/^\d+\.\d+\.\d+$/.test(next)) {
  console.error(`Invalid version "${next}". Expected X.Y.Z or patch|minor|major.`);
  process.exit(1);
}

// 1. source/Cargo.toml
const cargoPath = join(sourceDir, 'Cargo.toml');
writeFileSync(
  cargoPath,
  readFileSync(cargoPath, 'utf8').replace(/^version\s*=\s*"[^"]+"/m, `version = "${next}"`)
);

// 2. source/app/package.json
for (const pkgRel of [['app', 'package.json'], ['extension', 'package.json'], ['app', 'src-tauri', 'tauri.conf.json']]) {
  const p = join(sourceDir, ...pkgRel);
  const json = JSON.parse(readFileSync(p, 'utf8'));
  json.version = next;
  writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
}

// 3. build.bat
const batPath = join(rootDir, 'build.bat');
try {
  writeFileSync(
    batPath,
    readFileSync(batPath, 'utf8')
      .replace(/v\d+\.\d+\.\d+/g, `v${next}`)
      .replace(/\r?\n/g, '\r\n')
  );
} catch {}

// 4. PROJECT_HANDOFF.md
const handoffPath = join(rootDir, 'PROJECT_HANDOFF.md');
try {
  writeFileSync(
    handoffPath,
    readFileSync(handoffPath, 'utf8')
      .replace(/\*\*Current Version:\*\*\s*`[^`]+`/g, `**Current Version:** \`${next}\``)
      .replace(/\|\s*\*\*Current Version\*\*\s*\|\s*`[^`]+`/g, `| **Current Version** | \`${next}\``)
  );
} catch {}

console.log(`Bumped Jenzo Download Manager (JDM) version: ${current} -> ${next}`);

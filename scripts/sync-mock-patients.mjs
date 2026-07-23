/* global process, console */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = join(appRoot, 'src', 'data');
const localRoot = join(dataRoot, 'mock_patients');
const provenancePath = join(dataRoot, 'mockPatientsSource.json');
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const suppliedRoot = process.argv[2] ? resolve(process.argv[2]) : null;
let temporaryClone = null;
let stagingRoot = null;
let backupRoot = null;

function assertSafeTarget() {
  if (basename(localRoot) !== 'mock_patients' || dirname(localRoot) !== dataRoot) {
    throw new Error(`Refusing unsafe sync target: ${localRoot}`);
  }
}

function patientFolders(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const folder = join(root, entry.name);
      return existsSync(join(folder, 'recorded_sessions.md'))
        || existsSync(join(folder, 'session_summaries.md'));
    });
}

function filesBelow(root, current = root) {
  if (!existsSync(current)) return [];
  return readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const path = join(current, entry.name);
    return entry.isDirectory() ? filesBelow(root, path) : [path.slice(root.length + 1)];
  });
}

function syncTree(source, target) {
  cpSync(source, target, { recursive: true, force: true });
  const sourceFiles = new Set(filesBelow(source));
  for (const relativePath of filesBelow(target)) {
    if (!sourceFiles.has(relativePath)) rmSync(join(target, relativePath), { force: true });
  }
}

try {
  assertSafeTarget();
  let upstreamRoot = suppliedRoot;
  let gitRoot;
  if (upstreamRoot) {
    gitRoot = resolve(upstreamRoot, '..');
  } else {
    temporaryClone = mkdtempSync(join(tmpdir(), 'sensei-patients-sync-'));
    execFileSync('git', ['clone', '--depth', '1', provenance.repository, temporaryClone], { stdio: 'inherit' });
    gitRoot = temporaryClone;
    upstreamRoot = join(temporaryClone, provenance.directory);
  }

  if (!existsSync(upstreamRoot)) throw new Error(`Upstream directory does not exist: ${upstreamRoot}`);
  const folders = patientFolders(upstreamRoot);
  if (!folders.length) throw new Error('Upstream repository contains no discoverable patient directories.');

  const commit = execFileSync('git', ['-C', gitRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  stagingRoot = join(dataRoot, `.mock_patients-sync-${process.pid}`);
  backupRoot = join(dataRoot, `.mock_patients-backup-${process.pid}`);
  cpSync(upstreamRoot, stagingRoot, { recursive: true, force: false, errorOnExist: true });

  if (existsSync(localRoot)) cpSync(localRoot, backupRoot, { recursive: true, force: false, errorOnExist: true });
  try {
    syncTree(stagingRoot, localRoot);
  } catch (error) {
    if (existsSync(backupRoot)) syncTree(backupRoot, localRoot);
    throw error;
  }

  writeFileSync(provenancePath, `${JSON.stringify({
    repository: provenance.repository,
    directory: provenance.directory,
    commit,
  }, null, 2)}\n`, 'utf8');

  rmSync(backupRoot, { recursive: true, force: true });
  backupRoot = null;
  rmSync(stagingRoot, { recursive: true, force: true });
  stagingRoot = null;
  console.log(`Synchronized ${folders.length} patient directories from ${commit}.`);
} finally {
  if (stagingRoot && existsSync(stagingRoot)) rmSync(stagingRoot, { recursive: true, force: true });
  if (backupRoot && existsSync(backupRoot)) rmSync(backupRoot, { recursive: true, force: true });
  if (temporaryClone) rmSync(temporaryClone, { recursive: true, force: true });
}

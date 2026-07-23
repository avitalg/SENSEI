/* global process, console */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localRoot = join(appRoot, 'src', 'data', 'mock_patients');
const provenancePath = join(appRoot, 'src', 'data', 'mockPatientsSource.json');
const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
const suppliedRoot = process.argv[2] ? resolve(process.argv[2]) : null;
let temporaryClone = null;

function filesBelow(root) {
  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(relative(root, path).replaceAll('\\', '/'));
    }
  };
  visit(root);
  return files.sort();
}

function normalized(path) {
  return readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
}

try {
  let upstreamRoot = suppliedRoot;
  let upstreamCommit = null;
  if (!upstreamRoot) {
    temporaryClone = mkdtempSync(join(tmpdir(), 'sensei-patients-'));
    execFileSync('git', ['clone', '--depth', '1', provenance.repository, temporaryClone], { stdio: 'inherit' });
    upstreamRoot = join(temporaryClone, provenance.directory);
  }

  const gitRoot = suppliedRoot ? resolve(suppliedRoot, '..') : temporaryClone;
  try {
    upstreamCommit = execFileSync('git', ['-C', gitRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    // A plain exported mock_patients directory has no commit metadata. Content
    // verification still remains complete.
  }

  const localFiles = filesBelow(localRoot);
  const upstreamFiles = filesBelow(upstreamRoot);
  const problems = [];
  for (const file of upstreamFiles) {
    if (!localFiles.includes(file)) problems.push(`missing locally: ${file}`);
    else if (normalized(join(upstreamRoot, file)) !== normalized(join(localRoot, file))) {
      problems.push(`content differs: ${file}`);
    }
  }
  for (const file of localFiles) {
    if (!upstreamFiles.includes(file)) problems.push(`extra local file: ${file}`);
  }
  if (upstreamCommit && upstreamCommit !== provenance.commit) {
    problems.push(`provenance commit ${provenance.commit} does not match upstream ${upstreamCommit}`);
  }

  if (problems.length) {
    console.error(`Mock-patient verification failed (${problems.length}):`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`Verified ${localFiles.length} files against ${upstreamCommit || 'the supplied repository export'}.`);
  }
} finally {
  if (temporaryClone) rmSync(temporaryClone, { recursive: true, force: true });
}

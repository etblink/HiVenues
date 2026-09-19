'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const RUNTIME_DEPENDENCIES = Object.freeze([
  'ejs',
  'express',
  'htmx.org',
  'zod',
]);

const RUNTIME_FILES = Object.freeze([
  'LICENSE',
  'scripts/hivenues-public-runtime.js',
  'src/deploy/public-router.js',
  'src/deploy/public-runtime.js',
  'src/deploy/release-store.js',
  'src/product/model.js',
  'src/product/present.js',
  'views/hivenues/index.ejs',
  'views/hivenues/consequence.ejs',
  'views/hivenues/_head.ejs',
  'views/hivenues/_logo.ejs',
  'views/hivenues/_status.ejs',
  'views/hivenues/_art.ejs',
  'views/hivenues/compositions/poster.ejs',
  'views/hivenues/compositions/editorial.ejs',
  'views/hivenues/compositions/hospitality.ejs',
  'views/hivenues/compositions/poster-activity.ejs',
  'views/hivenues/compositions/editorial-activity.ejs',
  'views/hivenues/compositions/hospitality-activity.ejs',
  'views/hivenues/fragments/rsvp-receipt.ejs',
  'views/hivenues/fragments/rsvp-closed.ejs',
  'public/css/hivenues.css',
  'public/css/hivenues-hospitality.css',
  'public/css/hivenues-accessibility.css',
  'public/css/hivenues-remediation.css',
  'public/css/hivenues-convergence.css',
  'public/css/hivenues-direction-convergence.css',
  'public/css/hivenues-first-draft.css',
  'public/css/hivenues-post-astra.css',
  'public/css/hivenues-territory.css',
  'public/css/hivenues-territory-a11y.css',
  'public/css/hivenues-territory-review.css',
  'public/css/hivenues-territory-authoring.css',
  'public/css/hivenues-accent-a11y.css',
  'public/css/hivenues-community.css',
]);

function bundleError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function gitValue(args) {
  return execFileSync('git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      throw new TypeError('Unexpected runtime-bundle argument: ' + value);
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      throw new TypeError('Missing value for --' + key);
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function resolveLockedDependency(packages, parentKey, name) {
  let cursor = parentKey;
  while (true) {
    const candidate = cursor
      ? cursor + '/node_modules/' + name
      : 'node_modules/' + name;
    if (packages[candidate]) return candidate;

    if (!cursor) break;
    const marker = cursor.lastIndexOf('/node_modules/');
    if (marker >= 0) {
      cursor = cursor.slice(0, marker);
      continue;
    }
    if (cursor.startsWith('node_modules/')) {
      cursor = '';
      continue;
    }
    break;
  }
  throw bundleError(
    'DEPLOYED_RUNTIME_LOCK_INCOMPLETE',
    'Runtime dependency is not present in the canonical lockfile: ' + name,
  );
}

function buildRuntimeLock(rootLock, runtimePackage) {
  if (!rootLock?.packages?.['']) {
    throw bundleError('DEPLOYED_RUNTIME_LOCK_INVALID', 'Canonical package lock is invalid.');
  }

  const selected = new Map();
  const queue = [];
  for (const name of Object.keys(runtimePackage.dependencies)) {
    queue.push(resolveLockedDependency(rootLock.packages, '', name));
  }

  while (queue.length) {
    const key = queue.shift();
    if (selected.has(key)) continue;
    const node = rootLock.packages[key];
    if (!node) {
      throw bundleError('DEPLOYED_RUNTIME_LOCK_INCOMPLETE', 'Missing lock node: ' + key);
    }
    selected.set(key, structuredClone(node));

    for (const group of ['dependencies', 'optionalDependencies']) {
      for (const name of Object.keys(node[group] || {})) {
        queue.push(resolveLockedDependency(rootLock.packages, key, name));
      }
    }
  }

  const packages = { '': structuredClone(runtimePackage) };
  for (const key of [...selected.keys()].sort()) {
    packages[key] = selected.get(key);
  }

  return {
    name: runtimePackage.name,
    version: runtimePackage.version,
    lockfileVersion: rootLock.lockfileVersion,
    requires: true,
    packages,
  };
}

function copyRuntimeFiles(outputRoot) {
  const entries = [];
  for (const relative of RUNTIME_FILES) {
    const source = path.join(PROJECT_ROOT, relative);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      throw bundleError('DEPLOYED_RUNTIME_FILE_MISSING', 'Runtime source file is missing: ' + relative);
    }
    const destination = path.join(outputRoot, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    const bytes = fs.readFileSync(destination);
    entries.push({
      path: relative.replaceAll('\\', '/'),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  return entries;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function buildPublicRuntimeBundle({
  outputRoot,
  sourceSha,
  sourceTree,
  nodeVersion = process.version,
} = {}) {
  if (!outputRoot) throw new TypeError('Runtime bundle requires outputRoot.');
  if (!/^[a-f0-9]{40}$/.test(String(sourceSha || ''))) {
    throw bundleError('DEPLOYED_RUNTIME_SOURCE_SHA_INVALID', 'Runtime source SHA is invalid.');
  }
  if (!/^[a-f0-9]{40}$/.test(String(sourceTree || ''))) {
    throw bundleError('DEPLOYED_RUNTIME_SOURCE_TREE_INVALID', 'Runtime source tree is invalid.');
  }

  const destination = path.resolve(outputRoot);
  if (fs.existsSync(destination)) {
    throw bundleError('DEPLOYED_RUNTIME_OUTPUT_EXISTS', 'Runtime bundle output already exists.');
  }
  fs.mkdirSync(destination, { recursive: false });

  const rootPackage = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const rootLock = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package-lock.json'), 'utf8'));
  const dependencies = {};
  for (const name of RUNTIME_DEPENDENCIES) {
    const version = rootPackage.dependencies?.[name];
    if (!version) {
      throw bundleError(
        'DEPLOYED_RUNTIME_DEPENDENCY_MISSING',
        'Runtime dependency is not pinned in package.json: ' + name,
      );
    }
    dependencies[name] = version;
  }

  const runtimePackage = {
    name: 'hivenues-public-runtime',
    version: rootPackage.version,
    private: true,
    description: 'Public-only deployed runtime for one immutable HiVenues Release.',
    main: 'src/deploy/public-runtime.js',
    engines: {
      node: rootPackage.engines.node,
      npm: rootPackage.engines.npm,
    },
    scripts: {
      start: 'node scripts/hivenues-public-runtime.js',
    },
    dependencies,
    packageManager: rootPackage.packageManager,
    license: rootPackage.license,
  };

  writeJson(path.join(destination, 'package.json'), runtimePackage);
  writeJson(
    path.join(destination, 'package-lock.json'),
    buildRuntimeLock(rootLock, runtimePackage),
  );

  const entries = copyRuntimeFiles(destination);
  for (const generated of ['package.json', 'package-lock.json']) {
    const bytes = fs.readFileSync(path.join(destination, generated));
    entries.push({
      path: generated,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));

  const manifestCore = {
    version: 1,
    sourceSha,
    sourceTree,
    packageVersion: rootPackage.version,
    nodeVersion,
    files: entries,
  };
  const bundleDigest = sha256(Buffer.from(JSON.stringify(manifestCore), 'utf8'));
  const manifest = Object.freeze({
    ...manifestCore,
    bundleDigest,
  });
  const provenance = Object.freeze({
    version: 1,
    sourceSha,
    sourceTree,
    packageVersion: rootPackage.version,
    nodeVersion,
    bundleDigest,
  });

  writeJson(path.join(destination, 'runtime-manifest.json'), manifest);
  writeJson(path.join(destination, 'runtime-provenance.json'), provenance);

  return Object.freeze({
    outputRoot: destination,
    bundleDigest,
    fileCount: entries.length,
    dependencies: Object.freeze({ ...dependencies }),
    sourceSha,
    sourceTree,
  });
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const result = buildPublicRuntimeBundle({
    outputRoot: args.output,
    sourceSha: args['source-sha'] || gitValue(['rev-parse', 'HEAD']),
    sourceTree: args['source-tree'] || gitValue(['rev-parse', 'HEAD^{tree}']),
    nodeVersion: args['node-version'] || process.version,
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

module.exports = {
  RUNTIME_DEPENDENCIES,
  RUNTIME_FILES,
  buildPublicRuntimeBundle,
  buildRuntimeLock,
};

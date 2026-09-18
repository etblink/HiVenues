'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const out = { output: '', sourceSha: 'UNKNOWN', sourceTree: 'UNKNOWN' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') out.output = path.resolve(argv[++i] || '');
    else if (arg === '--source-sha') out.sourceSha = String(argv[++i] || 'UNKNOWN');
    else if (arg === '--source-tree') out.sourceTree = String(argv[++i] || 'UNKNOWN');
    else throw new Error('Unknown build proof argument: ' + arg);
  }
  if (!out.output) throw new Error('--output is required.');
  return out;
}

function copy(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(__dirname, '..', '..');
  const appRoot = path.join(options.output, 'app');
  const runtimeRoot = path.join(options.output, 'runtime');
  fs.rmSync(options.output, { recursive: true, force: true });
  fs.mkdirSync(appRoot, { recursive: true });
  fs.mkdirSync(runtimeRoot, { recursive: true });

  for (const item of ['src', 'views', 'public']) copy(path.join(root, item), path.join(appRoot, item));
  for (const item of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(root, item), path.join(appRoot, item));
  }
  fs.mkdirSync(path.join(appRoot, 'scripts', 'era5'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'scripts', 'era5', 'installed-bootstrap.js'),
    path.join(appRoot, 'scripts', 'era5', 'installed-bootstrap.js')
  );

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const install = spawnSync(npm, ['ci', '--omit=dev', '--ignore-scripts', '--no-fund', '--no-audit'], {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (install.status !== 0) {
    process.stderr.write(install.stdout || '');
    process.stderr.write(install.stderr || '');
    throw new Error('Production dependency installation failed for the runtime proof.');
  }

  const runtimeName = process.platform === 'win32' ? 'node.exe' : 'node';
  fs.copyFileSync(process.execPath, path.join(runtimeRoot, runtimeName));
  if (process.platform !== 'win32') fs.chmodSync(path.join(runtimeRoot, runtimeName), 0o755);

  const manifest = {
    proofVersion: 1,
    sourceSha: options.sourceSha,
    sourceTree: options.sourceTree,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    layout: {
      runtime: `runtime/${runtimeName}`,
      app: 'app/',
    },
  };
  fs.writeFileSync(
    path.join(options.output, 'build-provenance.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  process.stdout.write(JSON.stringify(manifest) + '\n');
}

main();

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const out = { output: '', sourceSha: '', sourceTree: '', launcher: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') out.output = path.resolve(argv[++i] || '');
    else if (arg === '--source-sha') out.sourceSha = String(argv[++i] || 'UNKNOWN');
    else if (arg === '--source-tree') out.sourceTree = String(argv[++i] || 'UNKNOWN');
    else if (arg === '--launcher') out.launcher = path.resolve(argv[++i] || '');
    else throw new Error('Unknown Windows bundle build argument: ' + arg);
  }
  if (!out.output) throw new Error('--output is required.');
  if (!/^[a-f0-9]{40}$/i.test(out.sourceSha)) throw new Error('--source-sha must be a full 40-character Git SHA.');
  if (!/^[a-f0-9]{40}$/i.test(out.sourceTree)) throw new Error('--source-tree must be a full 40-character Git tree SHA.');
  if (!out.launcher) throw new Error('--launcher is required for the Windows bundle.');
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('The Era-5 Windows distributable currently supports only Windows x64 build hosts.');
  }
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
  fs.mkdirSync(path.join(appRoot, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'scripts', 'hivenues-installed.js'),
    path.join(appRoot, 'scripts', 'hivenues-installed.js')
  );

  const install = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', [
        '/d',
        '/s',
        '/c',
        'npm ci --omit=dev --ignore-scripts --no-fund --no-audit',
      ], {
        cwd: appRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      })
    : spawnSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-fund', '--no-audit'], {
        cwd: appRoot,
        encoding: 'utf8',
        stdio: 'pipe',
      });
  if (install.status !== 0) {
    process.stderr.write(install.stdout || '');
    process.stderr.write(install.stderr || '');
    if (install.error) process.stderr.write(String(install.error.stack || install.error) + '\n');
    throw new Error('Production dependency installation failed for the Windows bundle.');
  }

  const runtimeName = process.platform === 'win32' ? 'node.exe' : 'node';
  fs.copyFileSync(process.execPath, path.join(runtimeRoot, runtimeName));
  if (process.platform !== 'win32') fs.chmodSync(path.join(runtimeRoot, runtimeName), 0o755);

  if (!fs.existsSync(options.launcher)) throw new Error('Launcher path does not exist: ' + options.launcher);
  fs.copyFileSync(options.launcher, path.join(options.output, 'HiVenues Studio.exe'));

  const packageRecord = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const manifest = {
    bundleProvenanceVersion: 1,
    product: 'HiVenues Studio',
    sourceSha: options.sourceSha,
    sourceTree: options.sourceTree,
    nodeVersion: process.version,
    packageVersion: packageRecord.version,
    packageManager: packageRecord.packageManager,
    platform: process.platform,
    arch: process.arch,
    qualificationArtifact: true,
    layout: {
      runtime: `runtime/${runtimeName}`,
      app: 'app/',
      launcher: 'HiVenues Studio.exe',
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

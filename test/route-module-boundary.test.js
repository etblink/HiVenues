'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const ROUTE_FILES = Object.freeze([
  'api.js',
  'auth.js',
  'common.js',
  'community.js',
  'health.js',
  'index.js',
  'm4.js',
  'moderation.js',
  'onboarding.js',
  'payments.js',
  'profile.js',
  'social.js',
]);

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

test('application route modules are source-owned under src/routes', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'routes')), false);

  for (const filename of ROUTE_FILES) {
    const routePath = path.join(ROOT, 'src', 'routes', filename);
    assert.equal(fs.existsSync(routePath), true, `missing source-owned route ${filename}`);
    const source = fs.readFileSync(routePath, 'utf8');
    assert.doesNotMatch(source, /require\(['"]\.\.\/src\//, `${filename} crossed back through src/`);
  }

  const appSource = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');
  assert.doesNotMatch(appSource, /require\(['"]\.\.\/routes\//);
  assert.match(appSource, /require\('\.\/routes\/health'\)/);
  assert.match(appSource, /require\('\.\/routes\/auth'\)/);
  assert.match(appSource, /require\('\.\/routes\/m4'\)/);
  assert.match(appSource, /require\('\.\/routes\/moderation'\)/);
  assert.match(appSource, /require\('\.\/routes\/payments'\)/);
  assert.match(appSource, /require\('\.\/routes\/social'\)/);
  assert.match(appSource, /require\('\.\/routes\/index'\)/);
  assert.match(appSource, /require\('\.\/routes\/community'\)/);
  assert.match(appSource, /require\('\.\/routes\/profile'\)/);
  assert.match(appSource, /require\('\.\/routes\/common'\)/);
  assert.match(appSource, /require\('\.\/routes\/api'\)/);

  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts.lint, /(?:^|\s)src(?:\s|$)/);
  assert.doesNotMatch(packageJson.scripts.lint, /(?:^|\s)routes(?:\s|$)/);
});

test('test consumers do not depend on the removed root routes directory', () => {
  const routeNames = ROUTE_FILES.map((filename) => filename.replace(/\.js$/u, '')).join('|');
  const routeFiles = ROUTE_FILES.join('|').replace(/\./gu, '\\.');
  const staleModuleImport = new RegExp(`require\\(['"]\\.\\.\\/routes\\/(?:${routeNames})['"]\\)`);
  const staleRouteFile = new RegExp(`['"]routes\\/(?:${routeFiles})['"]`);
  const staleRootTraversal = /filesUnder\(path\.join\([^,\n]+,\s*['"]routes['"]\)\)/;

  const testFiles = filesUnder(path.join(ROOT, 'test'))
    .filter((filename) => filename.endsWith('.js') && filename !== __filename);

  for (const filename of testFiles) {
    const source = fs.readFileSync(filename, 'utf8');
    assert.doesNotMatch(source, staleModuleImport, `${filename} imports the removed root routes directory`);
    assert.doesNotMatch(source, staleRouteFile, `${filename} inspects a removed root route file`);
    assert.doesNotMatch(source, staleRootTraversal, `${filename} traverses the removed root routes directory`);
  }
});

test('route relocation preserves the public mount contract in src/app.js', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src', 'app.js'), 'utf8');
  const mounts = [
    "'/auth'",
    "'/api/social'",
    "'/api/m4'",
    "'/api/payments'",
    "app.use('/', indexRouter);",
    "app.use('/community', communityRouter);",
    "app.use('/profile', profileRouter);",
    "app.use('/', commonRouter);",
    "app.use('/api', apiRouter);",
  ];

  for (const mount of mounts) assert.ok(source.includes(mount), `missing route mount ${mount}`);
});

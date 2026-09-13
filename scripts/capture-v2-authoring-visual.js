#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(script, extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const v2Root = path.resolve(
  ROOT,
  process.env.V2_AUTHORING_REVIEW_ROOT || 'artifacts/v2-authoring-review',
);

run('capture-v2-authoring-visual-core.js');
run('capture-v3-cross-host-journeys-visual.js', {
  V3_S4_REVIEW_ROOT: path.join(v2Root, 'v3-cross-host'),
});

'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { requiresLegacyVisual } = require('../scripts/classify-qualification-scope');

test('Candidate C-owned paths use Candidate C qualification instead of legacy visual replay', () => {
  const candidatePaths = [
    'src/candidate-c/model.js',
    'src/candidate-c/media.js',
    'views/candidate-c/studio.ejs',
    'views/candidate-c/compositions/hospitality.ejs',
    'public/css/candidate-c.css',
    'public/js/candidate-c-studio.js',
    'public/candidate-c/media/harbor-hearth-hero.svg',
    'test/candidate-c-phase2b.test.js',
    'scripts/candidate-c-phase2b-browser.js',
    '.github/workflows/candidate-c-phase2b-browser.yml',
  ];

  for (const path of candidatePaths) {
    assert.equal(requiresLegacyVisual(path), false, path);
  }
});

test('shared and legacy product paths still require legacy/current visual evidence', () => {
  const legacyPaths = [
    'src/routes/index.js',
    'src/app.js',
    'views/home.ejs',
    'views/partials/navigation.ejs',
    'public/css/style.css',
    'public/js/app.js',
    'src/venue/v2/studio-app.js',
    'test/venue-v2-authoring-studio.test.js',
  ];

  for (const path of legacyPaths) {
    assert.equal(requiresLegacyVisual(path), true, path);
  }
});

test('dedicated v3 paths remain excluded from legacy visual replay', () => {
  const v3Paths = [
    'src/venue/v3/studio-app.js',
    'scripts/capture-v3-cross-host-journeys-visual.js',
    '.github/workflows/v3-s4-browser.yml',
  ];

  for (const path of v3Paths) {
    assert.equal(requiresLegacyVisual(path), false, path);
  }
});

test('mixed Candidate C and shared changes still require the legacy gate', () => {
  const changed = [
    'views/candidate-c/studio.ejs',
    'public/js/candidate-c-studio.js',
    'src/routes/index.js',
  ];

  assert.equal(changed.some(requiresLegacyVisual), true);
});

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const ROOT = path.join(__dirname, '..');

function appFixture() {
  const store = new CandidateCStore();
  const app = express();
  app.set('views', path.join(ROOT, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return app;
}

test('Studio exposes one discoverable, non-durable wide/narrow canvas review control', async () => {
  const response = await request(appFixture()).get('/candidate-c/studio/harbor-and-hearth').expect(200);
  assert.match(response.text, /data-review-stage data-review-mode="wide"/);
  assert.match(response.text, /data-review-width="wide" aria-pressed="true">Wide/);
  assert.match(response.text, /data-review-width="narrow" aria-pressed="false">Narrow review/);
  assert.match(response.text, /data-review-device/);
  assert.doesNotMatch(response.text, /cc-full-preview-frame|<iframe/i);
});

test('narrow review is driven by canvas container width rather than viewport media emulation', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public', 'css', 'candidate-c-post-astra.css'), 'utf8');
  assert.match(css, /container-name:\s*cc-stage/);
  assert.match(css, /container-type:\s*inline-size/);
  assert.match(css, /data-review-mode='narrow'[\s\S]*width:\s*min\(390px,\s*100%\)/);
  assert.match(css, /@container cc-stage \(max-width:\s*430px\)/);
  assert.match(css, /\.cc-studio-canvas--poster[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.cc-studio-canvas--editorial[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.cc-canvas-hospitality__hero[\s\S]*grid-template-columns:\s*1fr/);
});

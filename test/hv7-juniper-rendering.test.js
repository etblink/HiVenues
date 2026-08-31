'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const axe = require('axe-core');
const { HtmlValidate } = require('html-validate');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const { createApp } = require('../src/app');
const { configFrom, logger } = require('./support/test-app');
const {
  JUNIPER_WORKS_PACKAGE,
  JUNIPER_WORKS_VENUE,
} = require('./support/hv7-juniper-venue');

function createJuniperApp() {
  const config = configFrom({
    HIVE_PAYMENT_ENABLED: 'false',
    HIVE_PAYMENT_MERCHANT_ACCOUNTS: '',
  });
  const hiveReadService = {
    async getOfficialCommunityPosts() {
      return [];
    },
  };
  const app = createApp({
    config,
    venue: JUNIPER_WORKS_VENUE,
    venuePackage: JUNIPER_WORKS_PACKAGE,
    deploymentIdentity: { build: 'hv7-juniper-fixture', commit: 'fixture', tree: 'fixture' },
    hiveReadService,
    logger,
    now: () => Date.parse('2026-09-09T23:45:00Z'),
  });
  return app;
}

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

async function assertAccessibleHtml(html, url) {
  const validator = new HtmlValidate({
    extends: ['html-validate:recommended'],
    rules: { 'no-trailing-whitespace': 'off' },
  });
  const report = await validator.validateString(html);
  assert.equal(
    report.valid,
    true,
    report.results.flatMap((result) => result.messages).map((message) => `${message.ruleId}: ${message.message}`).join('\n'),
  );

  const dom = new JSDOM(html, { runScripts: 'outside-only', url });
  dom.window.eval(axe.source);
  const result = await dom.window.axe.run(dom.window.document, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  });
  dom.window.close();
  const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(
    blocking.map((violation) => ({ id: violation.id, impact: violation.impact })),
    [],
  );
}

test('Juniper renders through the real shared application path with structured venue content and no predecessor identity leakage', async () => {
  const app = createJuniperApp();
  try {
    const response = await request(app).get('/').expect(200);
    const html = response.text;

    assert.match(html, /Juniper Works Cooperative/);
    assert.match(html, /Upcoming at the workshop/);
    assert.match(html, /New member orientation/);
    assert.match(html, /Open build night/);
    assert.match(html, /Equipment status/);
    assert.match(html, /Laser cutter/);
    assert.match(html, /Maintenance/);
    assert.match(html, /Available/);
    assert.match(html, /Limited/);
    assert.match(html, /First visit/);
    assert.match(html, /steward/i);
    assert.match(html, /member/i);
    assert.match(html, /Hive-Venues/);
    assert.match(html, /data-hv7-venue-theme/);
    assert.match(html, /--venue-accent:\s*#b86f00/);
    assert.match(html, /data-program-id="orientation-101"/);
    assert.match(html, /data-equipment-id="laser-cutter"/);
    assert.doesNotMatch(html, />\s*Hive-Bar\s*</i);
    assert.doesNotMatch(html, /Fourth Street|fourthstreetbar|hive-108590|fourthst\.threads/i);
    assert.doesNotMatch(html, /\b(?:beer|bartender|patron)\b/i);
    assert.doesNotMatch(html, /href="\/pay"/);

    await assertAccessibleHtml(html, 'https://juniper-works.example/');
  } finally {
    app.locals.services.receiptStore?.close?.();
  }
});

test('Juniper onboarding preserves custody semantics while using venue/successor identity instead of Hive-Bar', async () => {
  const app = createJuniperApp();
  try {
    const response = await request(app).get('/create-account').expect(200);
    const html = response.text;
    assert.match(html, /Create your Hive account at Juniper Works Cooperative/);
    assert.match(html, /show the one-time QR to the steward/i);
    assert.match(html, /Hive-Venues receives only the four public keys/i);
    assert.match(html, /Hive-Venues removes the recovery download/i);
    assert.match(html, /does not give the workshop your private keys/i);
    assert.doesNotMatch(html, /Hive-Bar/i);
    await assertAccessibleHtml(html, 'https://juniper-works.example/create-account');
  } finally {
    app.locals.services.receiptStore?.close?.();
  }
});

test('candidate-facing EJS templates cannot reintroduce the predecessor product label', () => {
  const viewsDirectory = path.join(__dirname, '..', 'views');
  for (const filename of filesUnder(viewsDirectory).filter((file) => file.endsWith('.ejs'))) {
    const source = fs.readFileSync(filename, 'utf8');
    assert.doesNotMatch(source, /\bHive-Bar\b/, filename);
  }
});

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
  assert.equal(
    blocking.length,
    0,
    JSON.stringify(blocking.map((violation) => ({ id: violation.id, impact: violation.impact }))),
  );
}

test('Juniper renders through the real shared application path with structured venue content and no predecessor identity leakage', async () => {
  const app = createJuniperApp();
  try {
    const response = await request(app).get('/').expect(200);
    const html = response.text;
    const visibleDom = new JSDOM(html);
    const visibleText = visibleDom.window.document.body.textContent || '';

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
    assert.match(html, /HiVenues/);
    assert.match(html, /data-hv7-venue-theme/);
    assert.match(html, /--venue-accent:\s*#945500/);
    assert.match(html, /--venue-on-accent:\s*#f4f1e8/);
    assert.match(html, /--venue-gallery-bg:\s*#f4f1e8/);
    const homepageCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'ux-1f-home.css'), 'utf8');
    assert.match(homepageCss, /\.home-gallery\s*\{\s*background:\s*var\(--venue-gallery-bg,\s*#050504\);/s);
    assert.match(html, /data-program-id="orientation-101"/);
    assert.match(html, /data-equipment-id="laser-cutter"/);
    assert.doesNotMatch(visibleText, /\b(?:bar|beer|bartender|patron)\b/i);
    assert.doesNotMatch(visibleText, /\bHive-Bar\b/i);
    assert.doesNotMatch(html, /Fourth Street|fourthstreetbar|hive-108590|fourthst\.threads/i);
    assert.doesNotMatch(html, /href="\/pay"/);
    visibleDom.window.close();

    await assertAccessibleHtml(html, 'https://juniper-works.example/');
  } finally {
    app.locals.services.receiptStore?.close?.();
  }
});

test('Juniper shared FAQ uses venue-neutral platform language without losing Hive safety guidance', async () => {
  const app = createJuniperApp();
  try {
    const response = await request(app).get('/faq').expect(200);
    const html = response.text;
    const visibleDom = new JSDOM(html);
    const visibleText = visibleDom.window.document.body.textContent || '';

    assert.match(visibleText, /use Juniper Works Cooperative/);
    assert.match(visibleText, /workshop temporarily delegates Hive Power/i);
    assert.match(visibleText, /give it to the steward/i);
    assert.match(visibleText, /HiVenues/);
    assert.match(visibleText, /Using the community/);
    assert.doesNotMatch(visibleText, /\b(?:bar|beer|bartender|patron)\b/i);
    assert.doesNotMatch(visibleText, /\bHive-Bar\b/i);
    assert.doesNotMatch(html, /Fourth Street|fourthstreetbar|hive-108590|fourthst\.threads/i);
    visibleDom.window.close();

    await assertAccessibleHtml(html, 'https://juniper-works.example/faq');
  } finally {
    app.locals.services.receiptStore?.close?.();
  }
});

test('Juniper direct Pay route remains dormant and does not imply a merchant capability', async () => {
  const app = createJuniperApp();
  try {
    const response = await request(app).get('/pay').expect(200);
    const html = response.text;
    const visibleDom = new JSDOM(html);
    const { document } = visibleDom.window;
    const visibleText = document.body.textContent || '';

    assert.equal(document.title, 'Pay — Juniper Works Cooperative');
    assert.match(visibleText, /Payments aren’t available at Juniper Works Cooperative/);
    assert.match(visibleText, /Juniper Works Cooperative does not currently offer payments through HiVenues/);
    assert.equal(document.querySelector('[data-pay-form]'), null);
    assert.equal(document.querySelector('[data-pay-receipt]'), null);
    assert.equal(document.querySelector('script[src*="pay-tab.js"]'), null);
    assert.equal(document.querySelector('script[src*="zxing-browser.min.js"]'), null);
    assert.doesNotMatch(visibleText, /Pay with HBD|Pay your tab|Sign in to pay|Verified destination|Scan QR|merchant|cashback/i);
    assert.doesNotMatch(visibleText, /\bHive-Bar\b|4th Street Bar/i);
    assert.doesNotMatch(html, /fourthstreetbar|hive-108590|fourthst\.threads/i);
    visibleDom.window.close();

    await assertAccessibleHtml(html, 'https://juniper-works.example/pay');
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
    assert.match(html, /does not give the workshop your private keys/i);
    assert.match(html, /In-person account creation isn’t active yet/i);
    assert.match(html, /HiVenues never asks for or stores private keys/i);
    assert.doesNotMatch(html, /Hive-Bar/i);

    const onboardingSource = fs.readFileSync(
      path.join(__dirname, '..', 'views', 'pages', 'onboarding', 'index.ejs'),
      'utf8',
    );
    assert.match(onboardingSource, /HiVenues receives only the four public keys/i);
    assert.match(onboardingSource, /HiVenues removes the recovery download/i);

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

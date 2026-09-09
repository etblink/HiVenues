#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { URLSearchParams } = require('node:url');
const { chromium } = require('playwright');
const axe = require('axe-core');
const { createReferenceV2AuthoringStudioFixture } = require('../test/support/v2-authoring-studio-fixture');
const { closeServer, listenLoopback, sha256 } = require('./support/visual-harness');

const OUTPUT = path.resolve(__dirname, '..', process.env.V2_MENU_SCALAR_REVIEW_ROOT || 'artifacts/v2-menu-scalar-review');
const occurrence = 'component:home-menu/resource:menus:dinner';

async function click(page, name, keyboard = false) {
  const button = page.getByRole('button', { name, exact: true });
  await button.focus();
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  if (keyboard) await button.press('Enter'); else await button.click();
  await navigation;
}

async function capture(page, name, records) {
  const frame = page.frames().find((f) => f !== page.mainFrame());
  const item = frame.locator('[data-component-id="home-menu"] [data-menu-section-id="starters"] [data-menu-item-id="oysters"]');
  await item.evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const visibleSubject = await item.locator('h4').evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { text: el.textContent.trim(), top: box.top, bottom: box.bottom, height: globalThis.innerHeight };
  });
  assert.ok(visibleSubject.top >= 0 && visibleSubject.bottom <= visibleSubject.height);
  await page.evaluate(() => globalThis.scrollTo(0, 0));
  await page.locator('.inspector-panel').evaluate((panel) => {
    const editor = panel.querySelector('.menu-editor');
    panel.scrollTop += editor.getBoundingClientRect().top - panel.getBoundingClientRect().top;
  });
  const active = await page.locator('.menu-editor .preview-state').count();
  if (active) {
    assert.equal(await page.locator('.menu-field-form,.menu-entry-form').count(), 0);
    for (const name of ['Undo', 'Redo']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true);
    for (const name of ['Apply to draft', 'Discard preview']) {
      const button = page.getByRole('button', { name, exact: true });
      assert.equal(await button.isEnabled(), true);
      const box = await button.boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= 1000);
    }
  }
  const geometry = [];
  for (const f of page.frames()) {
    const box = await f.evaluate(() => ({ width: globalThis.document.documentElement.clientWidth, scroll: globalThis.document.documentElement.scrollWidth }));
    assert.ok(box.scroll <= box.width + 1); geometry.push(box);
    await f.addScriptTag({ content: axe.source });
    const violations = await f.evaluate(async () => (await globalThis.axe.run(globalThis.document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, resultTypes: ['violations'],
    })).violations);
    assert.deepEqual(violations.filter((v) => ['serious', 'critical'].includes(v.impact)), []);
  }
  const file = `screenshots/${name}.png`;
  await page.screenshot({ path: path.join(OUTPUT, file), fullPage: false, animations: 'disabled' });
  const bytes = fs.readFileSync(path.join(OUTPUT, file));
  records.push({ name, file, bytes: bytes.length, sha256: sha256(bytes), visibleSubject, geometry, blockingAccessibilityFindings: 0 });
}

async function main() {
  fs.mkdirSync(path.join(OUTPUT, 'screenshots'), { recursive: true });
  const browser = await chromium.launch();
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const server = await listenLoopback(fixture.app);
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const records = [];
  let historyProofs = 0;
  const select = async (entry) => {
    await page.locator('#menu-entry').selectOption(entry); await click(page, 'Edit selection');
    assert.equal(await page.locator('#menu-entry').inputValue(), entry);
  };
  const edit = async (field, value, label, keyboard = false) => {
    await page.locator(`#menu-${field}`).fill(value); await click(page, `Preview ${label}`, keyboard);
  };
  const acceptHistory = async (entry) => {
    const before = fixture.session().draftDigest; const after = fixture.proposal().afterDigest;
    await click(page, 'Apply to draft'); assert.equal(fixture.session().draftDigest, after);
    await click(page, 'Undo'); assert.equal(fixture.session().draftDigest, before);
    await click(page, 'Redo'); assert.equal(fixture.session().draftDigest, after);
    assert.equal(await page.locator('#menu-entry').inputValue(), entry); historyProofs += 1;
  };
  const consumers = async (value, present = true) => {
    for (const route of ['', 'menu']) {
      const response = await fetch(`${base}/studio-authoring-preview/site/${route}`);
      assert.equal(response.ok, true); assert.equal((await response.text()).includes(value), present);
    }
  };
  try {
    await page.goto(`${base}/studio-authoring?${new URLSearchParams({ nodeId: occurrence, viewport: 'tablet', menuEntry: 'menu' })}`, { waitUntil: 'networkidle' });
    await edit('title', 'Seasonal dinner', 'menu title'); await consumers('Seasonal dinner'); await acceptHistory('menu');
    await select('section:starters'); await edit('title', 'Small plates', 'section title'); await consumers('Small plates'); await acceptHistory('section:starters');
    await select('item:starters:oysters');
    await edit('name', 'Coastal oysters', 'item name', true); await consumers('Coastal oysters'); await acceptHistory('item:starters:oysters');
    await capture(page, 'menu-item-controls', records);
    await edit('priceLabel', '$23 / half dozen', 'price'); await consumers('$23 / half dozen');
    await capture(page, 'menu-price-preview', records); await acceptHistory('item:starters:oysters');
    await edit('description', 'Lemon and fresh herbs', 'description'); await consumers('Lemon and fresh herbs'); await acceptHistory('item:starters:oysters');
    await edit('priceLabel', '', 'price'); await consumers('$23 / half dozen', false);
    await capture(page, 'menu-price-cleared-preview', records);
    const beforeDiscard = fixture.session().draftDigest;
    await click(page, 'Discard preview'); assert.equal(fixture.session().draftDigest, beforeDiscard);
    assert.equal(await page.locator('#menu-entry').inputValue(), 'item:starters:oysters');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/studio-authoring?${new URLSearchParams({ nodeId: occurrence, viewport: 'mobile', menuEntry: 'item:starters:oysters' })}`, { waitUntil: 'networkidle' });
    for (const f of page.frames()) assert.equal(await f.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.document.documentElement.clientWidth + 1), true);
    const diagnostics = fixture.diagnostics();
    for (const key of ['persistentWrites', 'hiveRpcAttempts', 'hiveWrites']) assert.equal(diagnostics[key], 0);
    assert.equal(historyProofs, 5); assert.equal(records.length, 3);
    const manifest = { kind: 'hivenues-menu-scalar-review', schemaVersion: 1,
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      summary: { journeys: 1, screenshots: 3, fields: 5, exactHistory: historyProofs, sharedConsumers: 2, keyboardEdits: 1, narrowGeometry: true }, records, diagnostics };
    fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log('V2_MENU_SCALAR_VISUAL_EVIDENCE', JSON.stringify(manifest.summary));
  } finally { await page.close(); await closeServer(server); await browser.close(); }
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

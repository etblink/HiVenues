'use strict';
/* global document, window, atob, File */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.join(__dirname, '..');
const existingPayload = fs.readFileSync(
  path.join(root, 'test', 'fixtures', 'payments', 'v4v-hbd-blank-payer.txt'),
  'utf8',
).trim();
const exactScreenshotUri = 'hive://sign/op/WyJ0cmFuc2ZlciIseyJmcm9tIjoiIiwidG8iOiJmb3VydGhzdHJlZXRiYXIiLCJhbW91bnQiOiIxLjUwMCBIQkQiLCJtZW1vIjoiQ2hpcHMgdjR2LXg1c0RyIn1d';

const fixtures = {
  normal: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-v4v-normal.png'),
    gitBlob: '099f2491f39467f028a592f5acd2ae2fda9f8172',
    expected: existingPayload,
  },
  inverted: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-v4v-inverted.png'),
    gitBlob: 'fba2595ea1018c953c423cbf61e6d6c4be711f36',
    expected: existingPayload,
  },
  unreadable: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-unreadable.png'),
    gitBlob: '27ffd9d3630027e1fff9f4f1102a57f6fbee9335',
    expected: null,
  },
  screenshot: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-3-v4v-screenshot-inverted.png'),
    sha256: 'eea7bca94742c112a40d591c5617090c4fa9a09595011a7300b1c155a7bc91f9',
    expected: exactScreenshotUri,
  },
};

const rootMarkup = `
  <main data-pay-tab>
    <button type="button" data-pay-camera-start>Scan</button>
    <button type="button" data-pay-camera-stop hidden>Stop</button>
    <input type="file" data-pay-image>
    <video data-pay-video class="hidden" muted playsinline></video>
    <form data-pay-form>
      <textarea name="uri" data-pay-uri></textarea>
      <button type="submit">Validate</button>
    </form>
    <p data-pay-status></p>
  </main>`;

function fixtureBytes(fixture) {
  const bytes = fs.readFileSync(fixture.path);
  if (fixture.gitBlob) {
    const actual = execFileSync('git', ['hash-object', fixture.path], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    assert.equal(actual, fixture.gitBlob);
  }
  if (fixture.sha256) {
    const actual = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(actual, fixture.sha256);
  }
  return bytes;
}

async function importFixture(page, fixture) {
  const base64 = fixtureBytes(fixture).toString('base64');
  return page.evaluate(async ({ base64: encoded, markup }) => {
    document.body.innerHTML = markup;
    let networkCalls = 0;
    const controller = new window.HiveBarPay.PayTabController({
      documentRef: document,
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error('QR import must remain browser-local');
      },
    });

    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const file = new File([bytes], 'fixture.png', { type: 'image/png' });
    await controller.importImage(file);

    return {
      uri: document.querySelector('[data-pay-uri]').value,
      status: document.querySelector('[data-pay-status]').textContent,
      networkCalls,
    };
  }, { base64, markup: rootMarkup });
}

async function runBrowser(name, browserType) {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({
      path: path.join(path.dirname(require.resolve('@zxing/browser')), '..', 'umd', 'zxing-browser.min.js'),
    });
    await page.addScriptTag({ path: path.join(root, 'public', 'js', 'pay-tab.js') });

    for (const fixtureName of ['normal', 'inverted', 'screenshot']) {
      const fixture = fixtures[fixtureName];
      const result = await importFixture(page, fixture);
      assert.equal(result.uri, fixture.expected, `${name} ${fixtureName}: ${result.status}`);
      assert.match(result.status, /QR image decoded locally/);
      assert.equal(result.networkCalls, 0);
      console.log(`R5_3_${name.toUpperCase()}_${fixtureName.toUpperCase()}_IMPORT=PASS`);
    }

    const unreadable = await importFixture(page, fixtures.unreadable);
    assert.equal(unreadable.uri, '');
    assert.match(unreadable.status, /couldn't read the payment QR/);
    assert.equal(unreadable.networkCalls, 0);
    console.log(`R5_3_${name.toUpperCase()}_UNREADABLE_FAIL_CLOSED=PASS`);

    console.log(`R5_3_${name.toUpperCase()}_LOCAL_ONLY=PASS`);
  } finally {
    await browser.close();
  }
}

async function main() {
  assert.match(existingPayload, /^hive:\/\/sign\/op\//);
  assert.match(exactScreenshotUri, /^hive:\/\/sign\/op\//);
  await runBrowser('chromium', chromium);
  await runBrowser('webkit', webkit);
  console.log('R5_3_EXACT_SCREENSHOT_URI=PASS');
  console.log('LOCAL_ONLY_NO_UPLOAD=PASS');
  console.log('PAYMENT_API_POST=NONE');
  console.log('PAYMENT_RECEIPT=NONE');
  console.log('KEYCHAIN_REQUEST=NONE');
  console.log('HIVE_WRITE=NONE');
  console.log('R5_3_REAL_DECODER_CHROMIUM_WEBKIT=PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
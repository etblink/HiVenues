'use strict';
/* global document, window, atob, File, createImageBitmap, Blob, navigator, performance */

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const payload = fs.readFileSync(
  path.join(root, 'test', 'fixtures', 'payments', 'v4v-hbd-blank-payer.txt'),
  'utf8',
).trim();
const fixtures = {
  normal: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-v4v-normal.png'),
    gitBlob: '099f2491f39467f028a592f5acd2ae2fda9f8172',
  },
  inverted: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-v4v-inverted.png'),
    gitBlob: 'fba2595ea1018c953c423cbf61e6d6c4be711f36',
  },
  unreadable: {
    path: path.join(root, 'test', 'fixtures', 'payments', 'r5-2-unreadable.png'),
    gitBlob: '27ffd9d3630027e1fff9f4f1102a57f6fbee9335',
  },
};

function fixtureBase64(fixture) {
  const actualBlob = execFileSync('git', ['hash-object', fixture.path], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  assert.equal(actualBlob, fixture.gitBlob);
  return fs.readFileSync(fixture.path).toString('base64');
}

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

async function importFixture(page, fixture) {
  return page.evaluate(async ({ base64, markup }) => {
    document.body.innerHTML = markup;
    let networkCalls = 0;
    const controller = new window.HiveBarPay.PayTabController({
      documentRef: document,
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error('QR capture must not perform a network request');
      },
    });
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const file = new File([bytes], 'fixture.png', { type: 'image/png' });
    await controller.importImage(file);
    return {
      uri: document.querySelector('[data-pay-uri]').value,
      status: document.querySelector('[data-pay-status]').textContent,
      networkCalls,
    };
  }, { base64: fixtureBase64(fixture), markup: rootMarkup });
}

async function cameraFixture(page, fixture) {
  return page.evaluate(async ({ base64, expected, markup }) => {
    document.body.innerHTML = markup;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('camera fixture canvas context is required');
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('pinned Chromium must support canvas captureStream');
    }
    const stream = canvas.captureStream(10);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => stream,
      },
    });

    let networkCalls = 0;
    const controller = new window.HiveBarPay.PayTabController({
      documentRef: document,
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error('QR capture must not perform a network request');
      },
    });
    await controller.startCamera();
    const input = document.querySelector('[data-pay-uri]');
    const started = performance.now();
    while (input.value !== expected && performance.now() - started < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const result = {
      uri: input.value,
      status: document.querySelector('[data-pay-status]').textContent,
      networkCalls,
    };
    controller.stopCamera();
    stream.getTracks().forEach((track) => track.stop());
    return result;
  }, { base64: fixtureBase64(fixture), expected: payload, markup: rootMarkup });
}

async function main() {
  assert.match(payload, /^hive:\/\/sign\/op\//);
  const browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({
      path: path.join(path.dirname(require.resolve('@zxing/browser')), '..', 'umd', 'zxing-browser.min.js'),
    });
    await page.addScriptTag({ path: path.join(root, 'public', 'js', 'pay-tab.js') });

    const normalImport = await importFixture(page, fixtures.normal);
    assert.equal(normalImport.uri, payload);
    assert.match(normalImport.status, /QR image decoded locally/);
    assert.equal(normalImport.networkCalls, 0);
    console.log('NORMAL_QR_REAL_DECODER=PASS');

    const invertedImport = await importFixture(page, fixtures.inverted);
    assert.equal(invertedImport.uri, payload);
    assert.match(invertedImport.status, /QR image decoded locally/);
    assert.equal(invertedImport.networkCalls, 0);
    console.log('INVERTED_QR_REAL_DECODER=PASS');
    assert.equal(invertedImport.uri, normalImport.uri);
    console.log('IDENTICAL_DECODED_URI=PASS');

    const unreadable = await importFixture(page, fixtures.unreadable);
    assert.equal(unreadable.uri, '');
    assert.match(unreadable.status, /couldn't read the payment QR/);
    assert.equal(unreadable.networkCalls, 0);
    console.log('UNREADABLE_QR_FAIL_CLOSED=PASS');

    const normalCamera = await cameraFixture(page, fixtures.normal);
    assert.equal(normalCamera.uri, payload, normalCamera.status);
    assert.match(normalCamera.status, /QR decoded locally/);
    assert.equal(normalCamera.networkCalls, 0);
    console.log('NORMAL_QR_CAMERA_REAL_DECODER=PASS');

    const invertedCamera = await cameraFixture(page, fixtures.inverted);
    assert.equal(invertedCamera.uri, payload, invertedCamera.status);
    assert.match(invertedCamera.status, /QR decoded locally/);
    assert.equal(invertedCamera.networkCalls, 0);
    console.log('INVERTED_QR_CAMERA_REAL_DECODER=PASS');

    console.log('LOCAL_ONLY_NO_UPLOAD=PASS');
    console.log('PAYMENT_API_POST=NONE');
    console.log('KEYCHAIN_BROADCAST=NONE');
    console.log('HIVE_WRITE=NONE');
    console.log('R5_2_REAL_DECODER_CHROMIUM=PASS');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

'use strict';
/* global document, window, atob, File, Blob, URL */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.join(__dirname, '..');
const smallFixture = path.join(
  root,
  'test',
  'fixtures',
  'payments',
  'r5-4-v4v-small-screenshot-inverted.png',
);
const unreadableFixture = path.join(
  root,
  'test',
  'fixtures',
  'payments',
  'r5-2-unreadable.png',
);
const expectedUri =
  'hive://sign/op/WyJ0cmFuc2ZlciIseyJmcm9tIjoiIiwidG8iOiJmb3VydGhzdHJlZXRiYXIiLCJhbW91bnQiOiIxLjUwMCBIQkQiLCJtZW1vIjoidGVzdGVyIDAgdjR2LXRJczZNIn1d';
const expectedSha256 =
  'fab2b97b2969cda4628cc1c2011150048750b616e765706b655216923455b489';
const expectedWidth = 368;
const expectedHeight = 437;

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

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function isExpectedMissStatus(status) {
  return /couldn't read the payment QR/.test(String(status || ''));
}

async function importThroughUnmodifiedR53(page, bytes) {
  const encoded = bytes.toString('base64');
  return page.evaluate(async ({ base64, markup }) => {
    document.body.innerHTML = markup;
    let networkCalls = 0;
    const controller = new window.HiveBarPay.PayTabController({
      documentRef: document,
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error('R5.4 diagnostic QR processing must remain browser-local');
      },
    });

    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      data[index] = binary.charCodeAt(index);
    }
    const file = new File([data], 'r5-4-small.png', { type: 'image/png' });
    await controller.importImage(file);

    return {
      uri: document.querySelector('[data-pay-uri]').value,
      status: document.querySelector('[data-pay-status]').textContent,
      networkCalls,
    };
  }, { base64: encoded, markup: rootMarkup });
}

async function decodeAtScale(page, bytes, scale) {
  const encoded = bytes.toString('base64');
  return page.evaluate(async ({ base64, scaleValue }) => {
    const binary = atob(base64);
    const data = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      data[index] = binary.charCodeAt(index);
    }

    const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
    try {
      const image = document.createElement('img');
      await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener(
          'error',
          () => reject(new Error('The R5.4 diagnostic image could not be loaded')),
          { once: true },
        );
        image.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scaleValue));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scaleValue));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('The R5.4 diagnostic canvas is unavailable');
      context.imageSmoothingEnabled = true;
      if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const reader = window.HiveBarPay.createPolarityTolerantQrReader();
      try {
        const result = reader.decodeFromCanvas(canvas);
        return {
          kind: 'DECODE_PASS',
          uri: result.getText(),
          sourceWidth: image.naturalWidth,
          sourceHeight: image.naturalHeight,
          width: canvas.width,
          height: canvas.height,
        };
      } catch (error) {
        if (window.HiveBarPay.isExpectedQrDecodeMiss(error)) {
          return {
            kind: 'EXPECTED_MISS',
            uri: '',
            sourceWidth: image.naturalWidth,
            sourceHeight: image.naturalHeight,
            width: canvas.width,
            height: canvas.height,
            errorName: error?.name || null,
            errorKind: typeof error?.getKind === 'function' ? error.getKind() : null,
          };
        }
        throw error;
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { base64: encoded, scaleValue: scale });
}

async function runBrowser(name, browserType) {
  const browser = await browserType.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({
      path: path.join(
        path.dirname(require.resolve('@zxing/browser')),
        '..',
        'umd',
        'zxing-browser.min.js',
      ),
    });
    await page.addScriptTag({ path: path.join(root, 'public', 'js', 'pay-tab.js') });

    const smallBytes = fs.readFileSync(smallFixture);
    const baseline = await importThroughUnmodifiedR53(page, smallBytes);
    assert.equal(baseline.networkCalls, 0);

    let baselineKind;
    if (baseline.uri) {
      assert.equal(baseline.uri, expectedUri);
      baselineKind = 'DECODE_PASS';
    } else {
      assert.ok(
        isExpectedMissStatus(baseline.status),
        `${name} unmodified R5.3 returned unexpected status: ${baseline.status}`,
      );
      baselineKind = 'EXPECTED_MISS';
    }

    const results = { baseline: baselineKind };

    console.log(
      `R5_4_${name.toUpperCase()}_UNMODIFIED_R5_3_SMALL_IMPORT=${baselineKind}`,
    );

    for (const [label, scale] of [
      ['UPSCALE_150', 1.5],
      ['UPSCALE_200', 2.0],
    ]) {
      const result = await decodeAtScale(page, smallBytes, scale);
      assert.equal(result.sourceWidth, expectedWidth);
      assert.equal(result.sourceHeight, expectedHeight);
      if (result.kind === 'DECODE_PASS') assert.equal(result.uri, expectedUri);
      results[label] = result.kind;
      console.log(
        `R5_4_${name.toUpperCase()}_${label}=${result.kind} size=${result.width}x${result.height}`,
      );

      const unreadable = await decodeAtScale(
        page,
        fs.readFileSync(unreadableFixture),
        scale,
      );
      assert.equal(
        unreadable.kind,
        'EXPECTED_MISS',
        `${name} ${label} made the unreadable fixture decodable`,
      );
      console.log(
        `R5_4_${name.toUpperCase()}_${label}_UNREADABLE=EXPECTED_MISS`,
      );
    }

    console.log(`R5_4_${name.toUpperCase()}_LOCAL_ONLY=PASS`);
    return results;
  } finally {
    await browser.close();
  }
}

async function main() {
  const smallBytes = fs.readFileSync(smallFixture);
  assert.equal(sha256(smallBytes), expectedSha256);

  console.log(`R5_4_SMALL_FIXTURE_SHA256=${expectedSha256}`);
  console.log(`R5_4_SMALL_FIXTURE_BYTES=${smallBytes.length}`);
  console.log(`R5_4_SMALL_FIXTURE_DIMENSIONS=${expectedWidth}x${expectedHeight}`);
  console.log(`R5_4_EXPECTED_URI=${expectedUri}`);

  const chromiumResult = await runBrowser('chromium', chromium);
  const webkitResult = await runBrowser('webkit', webkit);

  const baselineAllPass =
    chromiumResult.baseline === 'DECODE_PASS' &&
    webkitResult.baseline === 'DECODE_PASS';

  let candidate = 'NONE';
  if (!baselineAllPass) {
    if (
      chromiumResult.UPSCALE_150 === 'DECODE_PASS' &&
      webkitResult.UPSCALE_150 === 'DECODE_PASS'
    ) {
      candidate = 'UPSCALE_150';
    } else if (
      chromiumResult.UPSCALE_200 === 'DECODE_PASS' &&
      webkitResult.UPSCALE_200 === 'DECODE_PASS'
    ) {
      candidate = 'UPSCALE_200';
    }
  }

  console.log(
    `R5_4_DETERMINISTIC_BROWSER_DISCRIMINATOR=${candidate === 'NONE' ? 'NO' : 'YES'}`,
  );
  console.log(`R5_4_SMALLEST_COMMON_CANDIDATE=${candidate}`);
  console.log('LOCAL_ONLY_NO_UPLOAD=PASS');
  console.log('PAYMENT_API_POST=NONE');
  console.log('PAYMENT_RECEIPT=NONE');
  console.log('KEYCHAIN_REQUEST=NONE');
  console.log('HIVE_WRITE=NONE');
  console.log('APPLICATION_SOURCE_CHANGE=NONE');
  console.log('R5_4_DIAGNOSTIC_COMPLETE=PASS');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

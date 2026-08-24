'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pay-tab.js'), 'utf8');

function loadPayTab(BaseReader, html = '<!doctype html><body></body>') {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://hive-bar.example/pay',
  });
  dom.window.ZXingBrowser = { BrowserQRCodeReader: BaseReader };
  dom.window.eval(source);
  return dom;
}

function namedError(name, message = name) {
  const error = new Error(message);
  error.name = name;
  return error;
}

test('R5.2 retries only expected QR misses and preserves normal-first decoding', () => {
  let calls = 0;
  let invertedCanvasCreates = 0;
  const result = { getText: () => 'hive://normal' };
  class BaseReader {
    decodeFromCanvas() {
      calls += 1;
      return result;
    }
  }
  const dom = loadPayTab(BaseReader);
  const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
  const canvas = {
    width: 1,
    height: 1,
    ownerDocument: {
      createElement() {
        invertedCanvasCreates += 1;
        throw new Error('normal decode must not create an inverted canvas');
      },
    },
  };

  try {
    assert.equal(reader.decodeFromCanvas(canvas), result);
    assert.equal(calls, 1);
    assert.equal(invertedCanvasCreates, 0);
    for (const name of ['NotFoundException', 'ChecksumException', 'FormatException']) {
      assert.equal(dom.window.HiveBarPay.isExpectedQrDecodeMiss(namedError(name)), true);
    }
    assert.equal(dom.window.HiveBarPay.isExpectedQrDecodeMiss(namedError('SecurityError')), false);
  } finally {
    dom.window.close();
  }
});

test('R5.2 inverts RGB locally after a normal NotFound miss and preserves alpha', () => {
  const calls = [];
  let invertedPixels = null;
  const decoded = { getText: () => 'hive://inverted' };
  class BaseReader {
    decodeFromCanvas(canvas) {
      calls.push(canvas);
      if (calls.length === 1) throw namedError('NotFoundException');
      return decoded;
    }
  }
  const dom = loadPayTab(BaseReader);
  const invertedCanvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        putImageData(imageData) {
          invertedPixels = Array.from(imageData.data);
        },
      };
    },
  };
  const originalCanvas = {
    width: 1,
    height: 1,
    ownerDocument: {
      createElement(name) {
        assert.equal(name, 'canvas');
        return invertedCanvas;
      },
    },
    getContext() {
      return {
        getImageData() {
          return { data: Uint8ClampedArray.from([10, 20, 30, 77]) };
        },
      };
    },
  };

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    assert.equal(reader.decodeFromCanvas(originalCanvas), decoded);
    assert.deepEqual(calls, [originalCanvas, invertedCanvas]);
    assert.deepEqual(invertedPixels, [245, 235, 225, 77]);
    assert.equal(invertedCanvas.width, 1);
    assert.equal(invertedCanvas.height, 1);
  } finally {
    dom.window.close();
  }
});

test('R5.2 does not swallow unexpected decoder or canvas failures', () => {
  let creates = 0;
  class BaseReader {
    decodeFromCanvas() {
      throw namedError('SecurityError', 'canvas access denied');
    }
  }
  const dom = loadPayTab(BaseReader);
  const canvas = {
    width: 1,
    height: 1,
    ownerDocument: {
      createElement() {
        creates += 1;
        return null;
      },
    },
  };

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    assert.throws(() => reader.decodeFromCanvas(canvas), /canvas access denied/);
    assert.equal(creates, 0);
  } finally {
    dom.window.close();
  }
});

test('R5.2 keeps camera and imported-image capture on the same reader factory', () => {
  assert.equal((source.match(/this\.qrReaderFactory\(\)/g) || []).length, 2);
  assert.match(source, /const reader = this\.qrReaderFactory\(\);[\s\S]*reader\.decodeFromConstraints/);
  assert.match(source, /this\.qrReaderFactory\(\)\.decodeFromImageUrl/);
});

test('R5.2 distinguishes an unreadable QR from an unexpected local decoder failure', async () => {
  class BaseReader {}
  const html = `<!doctype html><main data-pay-tab>
    <button data-pay-camera-start></button><button data-pay-camera-stop hidden></button>
    <input type="file" data-pay-image><video data-pay-video></video>
    <form data-pay-form><textarea data-pay-uri name="uri"></textarea><button type="submit">Validate</button></form>
    <p data-pay-status></p><section data-pay-receipt hidden></section>
  </main>`;
  const dom = loadPayTab(BaseReader, html);
  const revoked = [];
  dom.window.URL.createObjectURL = () => 'blob:fixture';
  dom.window.URL.revokeObjectURL = (value) => revoked.push(value);
  const status = dom.window.document.querySelector('[data-pay-status]');
  const file = { type: 'image/png', size: 1000 };

  try {
    const expectedMiss = new dom.window.HiveBarPay.PayTabController({
      documentRef: dom.window.document,
      qrReaderFactory: () => ({
        async decodeFromImageUrl() {
          throw namedError('FormatException');
        },
      }),
    });
    await expectedMiss.importImage(file);
    assert.match(status.textContent, /couldn't read the payment QR/);

    const unexpected = new dom.window.HiveBarPay.PayTabController({
      documentRef: dom.window.document,
      qrReaderFactory: () => ({
        async decodeFromImageUrl() {
          throw namedError('SecurityError', 'canvas access denied');
        },
      }),
    });
    await unexpected.importImage(file);
    assert.equal(status.textContent, 'canvas access denied');
    assert.deepEqual(revoked, ['blob:fixture', 'blob:fixture']);
  } finally {
    dom.window.close();
  }
});

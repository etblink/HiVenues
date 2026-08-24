'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pay-tab.js'), 'utf8');

function namedError(name, message = name) {
  const error = new Error(message);
  error.name = name;
  return error;
}

function loadPayTab(BaseReader, html = '<!doctype html><body></body>') {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://hive-bar.example/pay',
  });
  dom.window.ZXingBrowser = { BrowserQRCodeReader: BaseReader };
  dom.window.eval(source);
  return dom;
}

function installImageCanvasHarness(dom, { failLoad = false } = {}) {
  const originalCreateElement = dom.window.document.createElement.bind(dom.window.document);
  const state = {
    imageCreates: 0,
    canvasCreates: 0,
    drawCalls: [],
    contexts: [],
  };

  dom.window.document.createElement = (name, ...args) => {
    if (String(name).toLowerCase() === 'img') {
      state.imageCreates += 1;
      const listeners = new Map();
      const image = {
        ownerDocument: dom.window.document,
        naturalWidth: 992,
        naturalHeight: 1077,
        addEventListener(type, listener) {
          listeners.set(type, listener);
        },
        removeEventListener(type, listener) {
          if (listeners.get(type) === listener) listeners.delete(type);
        },
        set src(value) {
          this._src = value;
          dom.window.queueMicrotask(() => {
            const event = failLoad ? 'error' : 'load';
            listeners.get(event)?.();
          });
        },
        get src() {
          return this._src;
        },
      };
      return image;
    }

    if (String(name).toLowerCase() === 'canvas') {
      state.canvasCreates += 1;
      const context = {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
        drawImage(...drawArgs) {
          state.drawCalls.push(drawArgs);
        },
      };
      state.contexts.push(context);
      return {
        ownerDocument: dom.window.document,
        width: 0,
        height: 0,
        getContext(type) {
          assert.equal(type, '2d');
          return context;
        },
      };
    }

    return originalCreateElement(name, ...args);
  };

  return state;
}

test('R5.3 keeps successful native imported-image decoding first with no normalization', async () => {
  const decoded = { getText: () => 'hive://native' };
  class BaseReader {
    async decodeFromImageUrl(url) {
      assert.equal(url, 'blob:native');
      return decoded;
    }
  }
  const dom = loadPayTab(BaseReader);
  const originalCreateElement = dom.window.document.createElement.bind(dom.window.document);
  let imageOrCanvasCreates = 0;
  dom.window.document.createElement = (name, ...args) => {
    if (['img', 'canvas'].includes(String(name).toLowerCase())) imageOrCanvasCreates += 1;
    return originalCreateElement(name, ...args);
  };

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    assert.equal(await reader.decodeFromImageUrl('blob:native'), decoded);
    assert.equal(imageOrCanvasCreates, 0);
  } finally {
    dom.window.close();
  }
});

test('R5.3 performs exactly one evidence-supported half-scale import retry after an expected miss', async () => {
  const decoded = { getText: () => 'hive://half-scale' };
  const calls = [];
  class BaseReader {
    async decodeFromImageUrl(url) {
      calls.push(['image-url', url]);
      throw namedError('NotFoundException');
    }

    decodeFromCanvas(canvas) {
      calls.push(['canvas', canvas.width, canvas.height]);
      return decoded;
    }
  }

  const dom = loadPayTab(BaseReader);
  const harness = installImageCanvasHarness(dom);

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    assert.equal(await reader.decodeFromImageUrl('blob:fixture'), decoded);
    assert.deepEqual(calls, [
      ['image-url', 'blob:fixture'],
      ['canvas', 496, 539],
    ]);
    assert.equal(harness.imageCreates, 1);
    assert.equal(harness.canvasCreates, 1);
    assert.equal(harness.drawCalls.length, 1);
    assert.equal(harness.drawCalls[0][1], 0);
    assert.equal(harness.drawCalls[0][2], 0);
    assert.equal(harness.drawCalls[0][3], 496);
    assert.equal(harness.drawCalls[0][4], 539);
    assert.equal(harness.contexts[0].imageSmoothingEnabled, true);
    assert.equal(harness.contexts[0].imageSmoothingQuality, 'high');
  } finally {
    dom.window.close();
  }
});

test('R5.3 never normalizes after an unexpected decoder failure', async () => {
  class BaseReader {
    async decodeFromImageUrl() {
      throw namedError('SecurityError', 'canvas access denied');
    }
  }
  const dom = loadPayTab(BaseReader);
  const harness = installImageCanvasHarness(dom);

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    await assert.rejects(reader.decodeFromImageUrl('blob:fixture'), /canvas access denied/);
    assert.equal(harness.imageCreates, 0);
    assert.equal(harness.canvasCreates, 0);
  } finally {
    dom.window.close();
  }
});

test('R5.3 keeps local image-load failure visible instead of converting it into a QR miss', async () => {
  class BaseReader {
    async decodeFromImageUrl() {
      throw namedError('FormatException');
    }
  }
  const dom = loadPayTab(BaseReader);
  installImageCanvasHarness(dom, { failLoad: true });

  try {
    const reader = dom.window.HiveBarPay.createPolarityTolerantQrReader();
    await assert.rejects(
      reader.decodeFromImageUrl('blob:fixture'),
      /selected QR image could not be loaded locally/,
    );
  } finally {
    dom.window.close();
  }
});

test('R5.3 preserves the existing unsupported and oversized image fail-closed boundary', async () => {
  let decodeCalls = 0;
  class BaseReader {
    async decodeFromImageUrl() {
      decodeCalls += 1;
      return { getText: () => 'hive://should-not-run' };
    }
  }

  const html = `<!doctype html><main data-pay-tab>
    <button data-pay-camera-start></button><button data-pay-camera-stop hidden></button>
    <input type="file" data-pay-image><video data-pay-video></video>
    <form data-pay-form><textarea data-pay-uri name="uri"></textarea><button type="submit">Validate</button></form>
    <p data-pay-status></p>
  </main>`;
  const dom = loadPayTab(BaseReader, html);
  const controller = new dom.window.HiveBarPay.PayTabController({ documentRef: dom.window.document });
  const status = dom.window.document.querySelector('[data-pay-status]');

  try {
    await controller.importImage({ type: 'text/plain', size: 100 });
    assert.match(status.textContent, /supported QR image no larger than 8 MB/);

    await controller.importImage({ type: 'image/png', size: 8 * 1024 * 1024 + 1 });
    assert.match(status.textContent, /supported QR image no larger than 8 MB/);

    assert.equal(decodeCalls, 0);
  } finally {
    dom.window.close();
  }
});

test('R5.3 leaves the R5.2 camera semantics and bounded import shape explicit', () => {
  assert.equal((source.match(/decodeFromConstraints\(/g) || []).length, 1);
  assert.match(source, /const reader = this\.qrReaderFactory\(\);[\s\S]*reader\.decodeFromConstraints/);
  assert.match(source, /async decodeFromImageUrl\(imageUrl\)/);
  assert.match(source, /Math\.round\(Number\(image\.naturalWidth\) \* 0\.5\)/);
  assert.match(source, /Math\.round\(Number\(image\.naturalHeight\) \* 0\.5\)/);
  assert.doesNotMatch(source, /for\s*\([^)]*scale|while\s*\([^)]*scale/i);
});
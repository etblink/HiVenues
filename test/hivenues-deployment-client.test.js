'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { setImmediate: waitImmediate } = require('node:timers/promises');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(ROOT, 'public/js/hivenues-deployment.js'), 'utf8');

async function settle() {
  await waitImmediate();
  await waitImmediate();
}

test('deployment client copies only the public SSH key from the rendered authority boundary', async () => {
  const dom = new JSDOM(
    '<!doctype html><body>'
      + '<section data-deployment-authority-public>'
      + '<textarea data-deployment-public-key readonly>ssh-rsa AAAATEST hivenues-deployment</textarea>'
      + '<button data-copy-deployment-public-key type="button">Copy</button>'
      + '<span data-copy-deployment-public-key-status></span>'
      + '</section>'
      + '</body>',
    {
      runScripts: 'outside-only',
      url: 'http://hivenues.test/hivenues/studio/example/deploy',
    },
  );

  const copied = [];
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    configurable: true,
    value: {
      async writeText(value) {
        copied.push(value);
      },
    },
  });

  dom.window.eval(client);
  dom.window.HiVenuesDeployment.initialize();
  dom.window.document.querySelector('[data-copy-deployment-public-key]').click();
  await settle();

  assert.deepEqual(copied, ['ssh-rsa AAAATEST hivenues-deployment']);
  assert.equal(
    dom.window.document.querySelector('[data-copy-deployment-public-key-status]').dataset.copyState,
    'copied',
  );
  dom.window.close();
});

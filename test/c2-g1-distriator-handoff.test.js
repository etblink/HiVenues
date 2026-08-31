'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');
const { JSDOM } = require('jsdom');
const { responseRecord } = require('../src/routes/payments');
const { configFrom } = require('./support/test-app');

const root = path.join(__dirname, '..');
const receiptTemplate = fs.readFileSync(
  path.join(root, 'views', 'pages', 'pay', 'partials', 'receipt.ejs'),
  'utf8',
);
const clientSource = fs.readFileSync(path.join(root, 'public', 'js', 'pay-tab.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'src', 'routes', 'payments.js'), 'utf8');

const NON_CONFIRMED_STATES = [
  'Validated',
  'AwaitingSignature',
  'BroadcastAccepted',
  'ConfirmationTimeout',
  'Cancelled',
];

function handoffConfig(legacyEnabled) {
  return configFrom({
    DISTRIATOR_ENABLED: legacyEnabled ? 'true' : 'false',
    DISTRIATOR_CLAIM_URL: 'https://distriator.com/#/claim',
  });
}

function baseReceipt(state) {
  return {
    id: 'receipt-1',
    account: 'testerone',
    merchant: 'fourthstreetbar',
    amount: '0.100 HBD',
    fingerprint: 'f'.repeat(64),
    state,
    transactionId: null,
    blockNumber: null,
  };
}

test('C2-G.1c-R5.1 exposes the neutral Distriator handoff only for ChainConfirmed independent of the legacy flag', () => {
  for (const legacyEnabled of [false, true]) {
    const config = handoffConfig(legacyEnabled);
    assert.equal(config.distriator.claimUrl, 'https://distriator.com/#/claim');

    for (const state of NON_CONFIRMED_STATES) {
      const record = responseRecord(baseReceipt(state), config, 'state');
      assert.deepEqual(record.distriatorHandoff, {
        available: false,
        url: null,
        external: true,
      });
      assert.equal(record.rebate, record.distriatorHandoff);
    }

    const confirmed = responseRecord(baseReceipt('ChainConfirmed'), config, 'paid');
    assert.deepEqual(confirmed.distriatorHandoff, {
      available: true,
      url: 'https://distriator.com/#/claim',
      external: true,
    });
    assert.equal(confirmed.rebate, confirmed.distriatorHandoff);
  }
});

test('C2-G.1c-R5.1 always renders the safe external claim link and describes Distriator as a separate non-guaranteed service', () => {
  assert.match(receiptTemplate, /data-distriator-handoff hidden/);
  assert.match(receiptTemplate, /data-distriator-handoff-link/);
  assert.match(receiptTemplate, /href="<%= distriator\.claimUrl %>"/);
  assert.match(receiptTemplate, /target="_blank" rel="noopener noreferrer"/);
  assert.match(receiptTemplate, /Distriator is a separate service that may recognize qualifying purchases/);
  assert.match(receiptTemplate, /Hive-Bar does not determine or guarantee recognition, eligibility, cashback amount, claim processing, or payout/);
  assert.doesNotMatch(
    receiptTemplate,
    /if \(distriator\.enabled\)[\s\S]{0,120}<div class="pay-external-claim"/,
  );

  const disabledHtml = ejs.render(receiptTemplate, {
    receiptClass: '',
    distriator: handoffConfig(false).distriator,
  });
  assert.match(disabledHtml, /href="https:\/\/distriator\.com\/#\/claim"/);
  assert.match(disabledHtml, /data-distriator-handoff-link/);
  assert.doesNotMatch(disabledHtml, /data-distriator-claim/);

  const legacyEnabledHtml = ejs.render(receiptTemplate, {
    receiptClass: '',
    distriator: handoffConfig(true).distriator,
  });
  assert.match(legacyEnabledHtml, /href="https:\/\/distriator\.com\/#\/claim"/);
  assert.match(legacyEnabledHtml, /data-distriator-handoff-link/);
  assert.match(legacyEnabledHtml, /data-distriator-claim/);
});

test('C2-G.1c-R5.1 browser presentation suppresses every non-confirmed state even if availability is malformed true', () => {
  const dom = new JSDOM(
    `<!doctype html><main data-pay-tab>
      <section data-pay-receipt hidden>
        <p data-pay-receipt-state></p>
        <span data-pay-receipt-account></span>
        <span data-pay-receipt-merchant></span>
        <span data-pay-receipt-amount></span>
        <span data-pay-receipt-block></span>
        <span data-pay-receipt-transaction></span>
        <span data-pay-receipt-fingerprint></span>
        <p data-pay-receipt-message></p>
        <button data-pay-recheck hidden></button>
        <div data-distriator-handoff hidden></div>
      </section>
    </main>`,
    { runScripts: 'outside-only', url: 'https://hive-bar.example/pay' },
  );
  dom.window.eval(clientSource);
  const controller = new dom.window.HiveBarPay.PayTabController({ documentRef: dom.window.document });
  const handoff = dom.window.document.querySelector('[data-distriator-handoff]');

  try {
    for (const state of NON_CONFIRMED_STATES) {
      controller.render({
        ...baseReceipt(state),
        distriatorHandoff: {
          available: true,
          url: 'https://distriator.com/#/claim',
          external: true,
        },
        message: 'state',
      });
      assert.equal(handoff.hidden, true, `${state} must suppress the Distriator handoff`);
    }

    controller.render({
      ...baseReceipt('ChainConfirmed'),
      distriatorHandoff: {
        available: true,
        url: 'https://distriator.com/#/claim',
        external: true,
      },
      message: 'paid',
    });
    assert.equal(handoff.hidden, false);
  } finally {
    dom.window.close();
  }
});

test('C2-G.1c-R5.1 contains no Distriator API, claim submission, eligibility, or payout request path', () => {
  assert.doesNotMatch(routeSource, /(?:fetch|axios|got)\s*\([^)]*distriator/i);
  assert.doesNotMatch(clientSource, /(?:fetch|axios|XMLHttpRequest)[\s\S]{0,160}distriator\.com/i);
  assert.doesNotMatch(routeSource, /distriator[^\n]{0,80}(?:claim\s*\(|eligibility\s*\(|payout\s*\()/i);
  assert.match(routeSource, /url: confirmed \? config\.distriator\.claimUrl : null/);
});

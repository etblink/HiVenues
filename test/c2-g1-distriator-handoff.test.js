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

function handoffConfig(venueParticipating) {
  return configFrom({
    // Historical environment-key spelling retained for deployment compatibility.
    // Product semantics are venue participation/onboarding, not control of Distriator.
    DISTRIATOR_ENABLED: venueParticipating ? 'true' : 'false',
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

test('C2-G.1c-R5.1 exposes the Distriator handoff only after chain confirmation for a participating venue', () => {
  const notParticipating = handoffConfig(false);
  const participating = handoffConfig(true);

  assert.equal(notParticipating.distriator.enabled, false);
  assert.equal(participating.distriator.enabled, true);
  assert.equal(participating.distriator.claimUrl, 'https://distriator.com/#/claim');

  for (const config of [notParticipating, participating]) {
    for (const state of NON_CONFIRMED_STATES) {
      const record = responseRecord(baseReceipt(state), config, 'state');
      assert.deepEqual(record.distriatorHandoff, {
        available: false,
        url: null,
        external: true,
      });
      assert.equal(record.rebate, record.distriatorHandoff);
    }
  }

  const disabledConfirmed = responseRecord(baseReceipt('ChainConfirmed'), notParticipating, 'paid');
  assert.deepEqual(disabledConfirmed.distriatorHandoff, {
    available: false,
    url: null,
    external: true,
  });

  const enabledConfirmed = responseRecord(baseReceipt('ChainConfirmed'), participating, 'paid');
  assert.deepEqual(enabledConfirmed.distriatorHandoff, {
    available: true,
    url: 'https://distriator.com/#/claim',
    external: true,
  });
});

test('C2-G.1c-R5.1 treats DISTRIATOR_ENABLED as a venue-participation toggle, never an external-service switch', () => {
  assert.match(routeSource, /legacy environment-key spelling for a venue-local/);
  assert.match(routeSource, /const venueParticipating = Boolean\(config\.distriator\.enabled\)/);
  assert.match(routeSource, /const handoffAvailable = confirmed && venueParticipating/);
  assert.match(routeSource, /never enables or disables Distriator itself/);
});

test('C2-G.1c-R5.1 server markup omits the external handoff when the venue is not participating', () => {
  assert.match(receiptTemplate, /if \(distriator\.enabled\)/);
  assert.match(receiptTemplate, /data-distriator-handoff hidden/);
  assert.match(receiptTemplate, /data-distriator-handoff-link/);
  assert.match(receiptTemplate, /href="<%= distriator\.claimUrl %>"/);
  assert.match(receiptTemplate, /target="_blank" rel="noopener noreferrer"/);
  assert.match(receiptTemplate, /This venue is configured for Distriator rebate participation/);
  assert.match(receiptTemplate, /Distriator is a separate service that independently decides whether a particular transaction qualifies/);
  assert.match(receiptTemplate, /Hive-Venues does not control or guarantee transaction recognition, rebate amount, claim processing, or payout/);
  assert.match(receiptTemplate, /<%= siteName %>’s own records remain the final source of truth for the underlying purchase/);
  assert.doesNotMatch(receiptTemplate, /\bHive-Bar\b|The bar’s point-of-sale system|final record for your tab/);

  const disabledHtml = ejs.render(receiptTemplate, {
    receiptClass: '',
    distriator: handoffConfig(false).distriator,
    siteName: '4th Street Bar',
  });
  assert.doesNotMatch(disabledHtml, /data-distriator-handoff/);
  assert.doesNotMatch(disabledHtml, /distriator\.com/i);
  assert.match(disabledHtml, /4th Street Bar’s own records remain the final source of truth for the underlying purchase/);

  const participatingHtml = ejs.render(receiptTemplate, {
    receiptClass: '',
    distriator: handoffConfig(true).distriator,
    siteName: '4th Street Bar',
  });
  assert.match(participatingHtml, /href="https:\/\/distriator\.com\/#\/claim"/);
  assert.match(participatingHtml, /data-distriator-handoff/);
  assert.match(participatingHtml, /data-distriator-handoff-link/);
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

test('C2-G.1c-R5.1 contains no Distriator API, claim submission, recognition, or payout request path', () => {
  assert.doesNotMatch(routeSource, /(?:fetch|axios|got)\s*\([^)]*distriator/i);
  assert.doesNotMatch(clientSource, /(?:fetch|axios|XMLHttpRequest)[\s\S]{0,160}distriator\.com/i);
  assert.doesNotMatch(routeSource, /distriator[^\n]{0,80}(?:claim\s*\(|eligibility\s*\(|payout\s*\()/i);
  assert.match(routeSource, /url: handoffAvailable \? config\.distriator\.claimUrl : null/);
});

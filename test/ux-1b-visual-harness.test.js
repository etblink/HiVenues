'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createUx1bVisualFixture } = require('./support/ux-1b-fixture');

const ROOT = path.join(__dirname, '..');
const capture = fs.readFileSync(path.join(ROOT, 'scripts', 'capture-ux-1b-visual.js'), 'utf8');
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('UX-1B visual fixture activates beneficiary and funds-claim states without mutations', async () => {
  const fixture = createUx1bVisualFixture();
  assert.equal(fixture.account, 'etblink');
  assert.equal(fixture.config.hive.writeMode, 'beta');
  assert.equal(fixture.config.hive.signerMode, 'keychain');
  assert.equal(fixture.config.hive.v1SelfSigningEnabled, false);
  assert.equal(fixture.config.hive.beneficiaryPolicy.creatorDonation.enabled, true);
  assert.equal(fixture.config.hive.beneficiaryPolicy.creatorDonation.weight, 125);

  const page = await request(fixture.app)
    .get('/community/threads')
    .set('cookie', `hive_bar_session=${fixture.token}`)
    .expect(200);
  assert.match(page.text, /data-social-action="thread" data-signer-mode="keychain"/);
  assert.match(page.text, /Who is stopping by the bar tonight/);
  assert.match(page.text, /name="creatorDonation" type="checkbox"/);
  assert.match(page.text, /Donate 1\.25% of this content’s author reward to @fourthstreetbar/);
  assert.doesNotMatch(page.text, /name="creatorDonation"[^>]*checked/);

  const merchantPage = await request(fixture.app)
    .get('/community/threads')
    .set('cookie', `hive_bar_session=${fixture.merchantToken}`)
    .expect(200);
  assert.match(merchantPage.text, /data-threads-funds-alert/);
  assert.match(merchantPage.text, /1\.234 HIVE/);
  assert.match(merchantPage.text, /5\.678 HBD/);
  assert.match(merchantPage.text, />\s*Claim funds\s*</);
  assert.match(merchantPage.text, /Nothing transfers until you approve it/);

  fixture.setThreadsFundsAuthorized(false);
  const unavailablePage = await request(fixture.app)
    .get('/community/threads')
    .set('cookie', `hive_bar_session=${fixture.merchantToken}`)
    .expect(200);
  assert.match(unavailablePage.text, /data-threads-funds-alert/);
  assert.match(unavailablePage.text, /Claiming is unavailable/);
  assert.match(unavailablePage.text, /No automatic transfer will be attempted/);
  assert.match(unavailablePage.text, /<button[\s\S]*?disabled[\s\S]*?>\s*Claim funds\s*<\/button>/);

  await request(fixture.app)
    .post('/api/social/preflight/thread')
    .send({ body: 'must not prepare' })
    .expect(405)
    .expect(({ body }) => assert.equal(body.error.code, 'UX_1B_VISUAL_MUTATION_FORBIDDEN'));
  assert.deepEqual(fixture.mutationAttempts, [
    { method: 'POST', path: '/api/social/preflight/thread' },
  ]);
});

test('UX-1B pinned-Chromium contract covers composers and new conditional economic UI', () => {
  assert.equal(packageJson.scripts['test:visual:ux-1b'], 'node scripts/capture-ux-1b-visual.js');
  assert.match(capture, /Object\.freeze\(\[390, 1440\]\)/);
  for (const scenario of [
    'community-post-active',
    'thread-active',
    'nested-reply-active',
    'public-wall-active',
    'private-message-active',
    'threads-funds-claim-ready',
    'threads-funds-claim-unavailable',
  ]) assert.match(capture, new RegExp(scenario));
  assert.match(capture, /open: '\[data-composer\^="reply-composer-"\] \[data-composer-dialog-trigger\]'/);
  assert.doesNotMatch(capture, /reply-composer-.*> summary/);
  assert.match(capture, /creatorDonationPresent/);
  assert.match(capture, /assert\.equal\(evidence\.creatorDonationChecked, false\)/);
  assert.match(capture, /Donate 1\\\.25%/);
  assert.match(capture, /captureThreadsFunds/);
  assert.match(capture, /Nothing transfers until you approve it/);
  assert.match(capture, /No automatic transfer will be attempted/);
  assert.match(capture, /UX-1B visual qualification forbids Keychain signing/);
  assert.match(capture, /UX-1B visual qualification forbids Keychain encryption/);
  assert.match(capture, /assert\.deepEqual\(fixture\.mutationAttempts, \[\]\)/);

  const settleStart = capture.indexOf('async function settleCaptureViewport(page)');
  const settleEnd = capture.indexOf('function assertSafeOutputRoot', settleStart);
  assert.ok(settleStart >= 0 && settleEnd > settleStart);
  const settle = capture.slice(settleStart, settleEnd);
  assert.match(settle, /scroll-behavior:auto!important/);
  assert.match(settle, /overflow-anchor:none!important/);
  const fontReadyIndex = settle.indexOf('document.fonts.ready');
  const finalScrollIndex = settle.indexOf('window.scrollTo(0, 0)');
  assert.ok(fontReadyIndex >= 0 && finalScrollIndex > fontReadyIndex);
  assert.match(settle, /window\.requestAnimationFrame/);
  assert.match(capture, /await settleCaptureViewport\(page\)/);
  assert.match(capture, /assert\.equal\(evidence\.scrollY, 0\)/);
  assert.match(capture, /counterOwnershipErrors/);
  assert.match(capture, /statusOwnershipErrors/);
  assert.match(capture, /duplicateIds/);
});

test('UX-1B remains in UI/UX visual evidence with commit-bound artifacts', () => {
  const job = workflow.match(/  visual-acceptance:\n[\s\S]*?(?=\n  live-read-smoke:)/)?.[0];
  assert.ok(job);
  assert.match(job, /UI\/UX visual evidence \(Ubuntu \/ pinned Chromium\)/);
  assert.match(job, /npx --no-install playwright install --with-deps chromium/);
  assert.match(job, /UX_1A_VISUAL_OUTPUT: artifacts\/ux-1a-visual/);
  assert.match(job, /npm run test:visual:ux-1a/);
  assert.match(job, /UX_1B_VISUAL_OUTPUT: artifacts\/ux-1b-visual/);
  assert.match(job, /npm run test:visual:ux-1b/);
  assert.match(
    job,
    /consolidated-visual-evidence-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
  );
  assert.match(job, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
});

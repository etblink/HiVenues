'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const { createHiVenuesApp } = require('../src/product/app');
const { HiVenuesStore } = require('../src/product/store');
const { documentInventory, documentUrl, DOCUMENT_CSP } = require('../src/product/draft-document');
const { authoringProofCases } = require('./helpers/authoring-proof-fixtures');

function setup(host, extra = {}) {
  const store = new HiVenuesStore({ hosts: [host], now: () => Date.parse('2026-09-16T05:30:00Z') });
  const app = createHiVenuesApp({ store, identityServices: false, participationServices: false, authoringProof: true, ...extra });
  const snapshot = store.snapshot(host.identity.slug);
  const base = '/hivenues/studio/' + host.identity.slug;
  return { store, app, snapshot, base };
}

// Ignore only execution/navigation capability and nonvisual whitespace.
// All semantic elements, text, image attributes, order and counts are compared.
function canonicalBody(html) {
  const doc = new JSDOM(html).window.document;
  doc.querySelectorAll('script').forEach((node) => node.remove());
  for (const node of doc.querySelectorAll('*')) {
    for (const { name } of Array.from(node.attributes)) {
      if (['href', 'action', 'disabled', 'aria-disabled', 'target', 'ping', 'download'].includes(name) || name.startsWith('hx-')) node.removeAttribute(name);
    }
  }
  return doc.body.outerHTML.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
}

for (const specimen of authoringProofCases()) {
  test('canonical document fidelity: ' + specimen.id, async () => {
    const { app, store, snapshot, base } = setup(specimen.host);
    const before = store.exportState();
    for (const surface of documentInventory(snapshot, base + '/preview')) {
      const proofPath = base + '/authoring-document?surface=' + encodeURIComponent(surface.key)
        + '&revision=' + snapshot.revision + '&digest=' + snapshot.draftDigest;
      const proof = await request(app).get(proofPath).expect(200);
      const preview = await request(app).get(documentUrl(surface.path, snapshot)).expect(200);
      assert.equal(proof.text, preview.text, surface.key + ': both consumers use the same document');
      assert.equal(proof.headers['content-security-policy'], DOCUMENT_CSP);
      assert.equal(proof.headers['x-hivenues-draft-digest'], snapshot.draftDigest);
      assert.equal(proof.headers['cache-control'], 'no-store');
      assert.doesNotMatch(proof.text, /op-preview-frame|cc-edit-chip|VISITOR PAGE|COMPLETE CONTENT|authoring-proof\.js|expectedDraftDigest/);
      const doc = new JSDOM(proof.text).window.document;
      assert.equal(doc.querySelectorAll('script,iframe,object,embed,[action],[hx-post]').length, 0);
      for (const link of doc.querySelectorAll('a[href]')) {
        assert.ok(link.getAttribute('href').startsWith('#') || link.getAttribute('href').startsWith(base + '/preview'), link.outerHTML);
      }
      for (const control of doc.querySelectorAll('input,button,select,textarea')) assert.equal(control.disabled, true);
      const releasedPath = surface.path.replace(base + '/preview', '/hivenues/' + specimen.host.identity.slug);
      const released = await request(app).get(releasedPath).expect(200);
      assert.equal(doc.title, new JSDOM(released.text).window.document.title, 'review labels stay outside the host document');
      assert.equal(canonicalBody(proof.text), canonicalBody(released.text), surface.key + ': no invented content, layout or duplicate objects relative to canonical visitor rendering');
      assert.doesNotMatch(released.text, /authoring-document|authoring-proof|document=1|privateDraftDocument|expectedDraftDigest/);
      assert.equal(released.headers['x-hivenues-draft-digest'], undefined);
    }
    assert.deepEqual(store.exportState(), before, 'read-only proof must not alter graph, releases or diagnostics');
  });
}

test('proof is opt-in, local-only, read-only and rejects unrecognized contexts', async () => {
  const host = authoringProofCases()[0].host;
  const { app, base } = setup(host, { authoringProof: false });
  await request(app).get(base + '/authoring-proof').expect(404);
  await request(app).get(base + '/authoring-document').expect(404);
  await request(app).get(base + '/preview?document=1').expect(404);
  assert.throws(() => setup(host, { publicIngress: true, accessSecret: 'x'.repeat(40) }), /only in the local development runtime/);
  const enabled = setup(host);
  await request(enabled.app).post(base + '/authoring-proof').send({}).expect(405);
  await request(enabled.app).post(base + '/authoring-document').send({}).expect(405);
  await request(enabled.app).get(base + '/authoring-proof?surface=canvas').expect(404);
  await request(enabled.app).get(base + '/authoring-proof?surface=https://example.com').expect(404);
  await request(enabled.app).get(base + '/authoring-proof?viewport=__proto__').expect(400);
  await request(enabled.app).get(base + '/authoring-proof?mode=execute').expect(400);
  await request(enabled.app).get(base + '/authoring-document').expect(409);
});

test('pinned document refuses stale content; private edits stay out of public output', async () => {
  const { app, store, snapshot, base } = setup(authoringProofCases()[1].host);
  const url = documentUrl(base + '/preview', snapshot);
  await request(app).get(url).expect(200);
  const result = store.commit(snapshot.draft.identity.slug, snapshot.revision, 'synthetic-proof-change',
    (draft) => { draft.facts.tagline = 'PRIVATE PROOF DRAFT'; }, ['facts.tagline'], snapshot.draftDigest);
  assert.equal(result.ok, true);
  await request(app).get(url).expect(409).expect(/DRAFT_DOCUMENT_STALE/);
  await request(app).get(documentUrl(base + '/preview', store.snapshot(snapshot.draft.identity.slug))).expect(200).expect(/PRIVATE PROOF DRAFT/);
  const live = await request(app).get('/hivenues/' + snapshot.draft.identity.slug).expect(200);
  assert.doesNotMatch(live.text, /PRIVATE PROOF DRAFT|authoring-document|document=1/);
});

test('default Studio and ordinary Preview retain their existing roles', async () => {
  const { app, base } = setup(authoringProofCases()[1].host);
  const studio = await request(app).get(base).expect(200);
  assert.match(studio.text, /data-selected-review="canvas"/);
  assert.doesNotMatch(studio.text, /authoring-proof|authoring-document|proof-document/);
  const ordinary = await request(app).get(base + '/preview').expect(200);
  assert.match(ordinary.text, /op-preview-frame/);
  assert.doesNotMatch(ordinary.text, /authoring-proof|authoring-document/);
});

test('encoded Activity paths stay pinned and HTML input stays text', async () => {
  const host = authoringProofCases()[1].host;
  host.activities[0].slug = 'friday night+assembly';
  host.facts.tagline = '<script>parent.compromised=true</script>';
  const { app, snapshot, base } = setup(host);
  const html = await request(app).get(documentUrl(base + '/preview', snapshot)).expect(200);
  const doc = new JSDOM(html.text).window.document;
  assert.equal(doc.querySelector('h1').textContent, host.facts.tagline);
  assert.equal(doc.querySelectorAll('script').length, 0);
  const link = Array.from(doc.querySelectorAll('a[href]')).find((item) => item.getAttribute('href').includes('friday%20night%2Bassembly?'));
  assert.ok(link);
  await request(app).get(link.getAttribute('href')).expect(200);
  await request(app).get(base + '/preview/activities/friday%20night%2Bassembly/calendar.ics?document=1').expect(404);
  const published = await request(app).get('/hivenues/' + host.identity.slug + '?document=1&privateDraftDocument=true').expect(200);
  assert.doesNotMatch(published.text, /authoring-document|authoring-proof|document=1|X-HiVenues-Draft/);
});

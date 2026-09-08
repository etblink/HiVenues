'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { execFileSync } = require('node:child_process');
const { JSDOM } = require('jsdom');
const a = require('../src/venue/v2/authoring-transaction');
const { serializeV2DeploymentAgnosticVenueSource: serialize } = require('../src/venue/v2/source');
const { renderV2Page, renderV2EventDetail } = require('../src/venue/v2/renderer');
const { REFERENCE_FACTORIES } = require('./support/v2-renderer-fixture');
const { createReferenceV2AuthoringStudioFixture, createV2AuthoringStudioWorkspaceFixture } = require('./support/v2-authoring-studio-fixture');
const { V2_PERSISTED_SOURCE_ABSENT } = require('../src/venue/v2/source-file');

const cases = [
  { reference: 'juniper', kind: 'equipment', component: 'home-equipment-status',
    payload: { name: 'Portable workbench', note: 'Awaiting inspection', accessNote: 'Ask workshop staff', lastUpdated: '2026-09-08T10:00:00-07:00' } },
  { reference: 'juniper', kind: 'programs', component: 'home-programs',
    payload: { title: 'Open studio evening', description: 'Guided work and shared learning.', accessNote: 'Orientation required', startAt: '2026-09-18T18:00:00-07:00', endAt: '2026-09-18T20:00:00-07:00' } },
  { reference: 'live-music', kind: 'events', component: 'home-shows',
    payload: { title: 'Late summer session', description: 'An evening of live music.', startAt: '2026-09-18T18:00:00-07:00', endAt: '2026-09-18T20:00:00-07:00' } },
];
function cmd(session, spec, type, extra = {}) {
  return { schemaVersion: 1, type, target: { nodeId: `component:${spec.component}` },
    expectedDraftDigest: session.draftDigest, ...extra };
}
function list(source, id) { return source.site.pages.flatMap((p) => p.components).find((c) => c.id === id); }
function propose(session, command) { return a.proposeV2AuthoringCommand(session, command); }
function apply(session, command) { return a.applyV2AuthoringProposal(session, propose(session, command)); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function text(html) { return new JSDOM(html).window.document.body.textContent; }

for (const spec of cases) {
  test(`${spec.kind}: typed creation, real output, local order, discard and exact history`, () => {
    const source = REFERENCE_FACTORIES[spec.reference]();
    let session = a.createV2AuthoringSession(source);
    const opening = serialize(session.draftSource);
    const proposal = propose(session, cmd(session, spec, a.ADD_RESOURCE, { payload: spec.payload }));
    const id = proposal.resolvedTarget.resourceId;
    assert.deepEqual(a.discardV2AuthoringProposal(session, proposal), session);
    assert.equal(serialize(session.draftSource), opening);
    const resource = proposal.previewSource.resources[spec.kind].find((r) => r.id === id);
    assert.equal(resource.title || resource.name, spec.payload.title || spec.payload.name);
    assert.equal(list(proposal.previewSource, spec.component).content.resourceIds.at(-1), id);
    for (const p of source.site.pages) for (const c of p.components) {
      if (c.id !== spec.component) assert.deepEqual(list(proposal.previewSource, c.id), c);
    }
    assert.ok(text(renderV2Page(proposal.previewSource)).includes(spec.payload.title || spec.payload.name));
    if (spec.kind === 'events') assert.ok(text(renderV2EventDetail(proposal.previewSource, resource.slug)).includes(spec.payload.title));
    session = a.applyV2AuthoringProposal(session, proposal);
    const first = list(session.draftSource, spec.component).content.resourceIds[0];
    const move = cmd(session, spec, a.MOVE_RESOURCE, { target: { nodeId: `component:${spec.component}`, resourceId: id }, destination: first });
    const beforeMove = session.draftSource;
    session = apply(session, move);
    assert.equal(list(session.draftSource, spec.component).content.resourceIds[0], id);
    assert.deepEqual(session.draftSource.resources, beforeMove.resources);
    for (const page of beforeMove.site.pages) for (const c of page.components) {
      if (c.id !== spec.component) assert.deepEqual(list(session.draftSource, c.id), c);
    }
    const output = text(renderV2Page(session.draftSource));
    const originalResource = source.resources[spec.kind].find((r) => r.id === first);
    assert.ok(output.indexOf(resource.title || resource.name) < output.indexOf(originalResource.title || originalResource.name));
    const finalDigest = session.draftDigest;
    session = a.undoV2AuthoringSession(a.undoV2AuthoringSession(session));
    assert.equal(serialize(session.draftSource), opening);
    session = a.redoV2AuthoringSession(a.redoV2AuthoringSession(session));
    assert.equal(session.draftDigest, finalDigest);
    const forged = clone(session); forged.history[0].inverseCommand.target.resourceId = first;
    assert.throws(() => a.undoV2AuthoringSession(forged), /inverse command binding/);
  });

  test(`${spec.kind}: deletion updates all consumers, exact restore preserves IDs and list orders`, () => {
    let session = a.createV2AuthoringSession(REFERENCE_FACTORIES[spec.reference]());
    const original = session.draftSource;
    const id = list(original, spec.component).content.resourceIds[0];
    const resource = original.resources[spec.kind].find((r) => r.id === id);
    const removal = propose(session, cmd(session, spec, a.REMOVE_RESOURCE, { target: { nodeId: `component:${spec.component}`, resourceId: id } }));
    assert.ok(removal.resolvedTarget.affectedLists.length >= 2, 'shared fixture must exercise multiple consumers');
    assert.equal(removal.previewSource.resources[spec.kind].some((r) => r.id === id), false);
    for (const p of removal.previewSource.site.pages) for (const c of p.components) {
      if (c.content.resourceIds) assert.equal(c.content.resourceIds.includes(id), false);
    }
    if (spec.kind === 'events') assert.throws(() => renderV2EventDetail(removal.previewSource, resource.slug));
    session = a.applyV2AuthoringProposal(session, removal);
    const removedDigest = session.draftDigest;
    session = a.undoV2AuthoringSession(session);
    assert.equal(serialize(session.draftSource), serialize(original));
    assert.equal(a.redoV2AuthoringSession(session).draftDigest, removedDigest);
    assert.throws(() => propose(session, removal.inverseCommand), /unsupported command type/);
  });
}

test('resource admission rejects stale, forged, unsupported, invalid-calendar and cross-list operations', () => {
  const spec = cases[2];
  const session = a.createV2AuthoringSession(REFERENCE_FACTORIES[spec.reference]());
  const good = cmd(session, spec, a.ADD_RESOURCE, { payload: spec.payload });
  const invalid = [
    { ...good, expectedDraftDigest: '0'.repeat(64) },
    { ...good, resourceSnapshot: {} },
    { ...good, target: { ...good.target, resourceId: 'mine' } },
    { ...good, target: { nodeId: 'component:home-hero' } },
    ...['id', 'slug', 'mediaAssetId', 'externalAction', 'sourcePointer'].map((key) => ({ ...good, payload: { ...good.payload, [key]: 'forged' } })),
    ...['2026-02-30T10:00:00Z', '2026-13-01T10:00:00Z', '2026-09-01T24:00:00Z', '2026-09-01T10:00:00+14:30', '2026-09-01T10:00:00'].map((startAt) => ({ ...good, payload: { ...good.payload, startAt } })),
    { ...good, payload: { ...good.payload, endAt: good.payload.startAt } },
    { ...good, payload: { ...good.payload, title: '   ' } },
  ];
  const original = serialize(session.draftSource);
  for (const command of invalid) assert.throws(() => propose(session, command));
  const ids = list(session.draftSource, spec.component).content.resourceIds;
  for (const [resourceId, destination] of [[ids[0], ids[0]], [ids[0], ids[1]], [ids.at(-1), a.END_OF_LIST], [ids[0], 'missing'], ['missing', ids[0]]]) {
    assert.throws(() => propose(session, cmd(session, spec, a.MOVE_RESOURCE, { target: { ...good.target, resourceId }, destination })));
  }
  assert.equal(serialize(session.draftSource), original);
});

test('empty and full lists, duplicate occurrence ambiguity and server ID collision avoidance', () => {
  const spec = cases[0]; let source = clone(REFERENCE_FACTORIES.juniper());
  source.resources.equipment[0].id = 'equipment-1';
  for (const p of source.site.pages) for (const c of p.components) {
    if (c.kind === 'equipment-status') c.content.resourceIds = ['equipment-1'];
  }
  let session = a.createV2AuthoringSession(source);
  const add = propose(session, cmd(session, spec, a.ADD_RESOURCE, { payload: spec.payload }));
  assert.equal(add.resolvedTarget.resourceId, 'equipment-2');
  session = apply(session, cmd(session, spec, a.REMOVE_RESOURCE, { target: { nodeId: `component:${spec.component}`, resourceId: 'equipment-1' } }));
  assert.equal(list(session.draftSource, spec.component).content.resourceIds.length, 0);
  assert.doesNotThrow(() => renderV2Page(session.draftSource));
  assert.doesNotThrow(() => propose(session, cmd(session, spec, a.ADD_RESOURCE, { payload: spec.payload })));
  source = clone(REFERENCE_FACTORIES.juniper());
  const c = list(source, spec.component); c.content.resourceIds.push(c.content.resourceIds[0]);
  assert.throws(() => a.getV2ResourceListContext(source, { nodeId: `component:${spec.component}` }), /ambiguous/);
  source = clone(REFERENCE_FACTORIES.juniper());
  const template = source.resources.equipment[0];
  source.resources.equipment = Array.from({ length: 200 }, (_, i) => ({ ...template, id: `full-${i}` }));
  for (const p of source.site.pages) for (const list of p.components) if (list.kind === 'equipment-status') list.content.resourceIds = ['full-0'];
  session = a.createV2AuthoringSession(source);
  assert.throws(() => propose(session, cmd(session, spec, a.ADD_RESOURCE, { payload: spec.payload })));
});

test('Studio lifecycle rejects forged forms, requires named removal and preserves selection/history', async () => {
  const spec = cases[0]; const fixture = createReferenceV2AuthoringStudioFixture(spec.reference);
  const nodeId = `component:${spec.component}`;
  const id = fixture.session().draftSource.resources.equipment[0].id;
  const occurrence = `${nodeId}/resource:equipment:${id}`;
  const base = { nodeId: occurrence, viewport: 'desktop', expectedDraftDigest: fixture.session().draftDigest, operation: a.REMOVE_RESOURCE, resourceId: id, confirmation: 'wrong' };
  for (const bad of [base, { ...base, nodeId: 'missing' }, { ...base, raw: '{}' }, { ...base, resourceId: 'other' }]) {
    await request(fixture.app).post('/studio-authoring/resource-lifecycle').type('form').send(bad).expect(400);
  }
  assert.equal(fixture.proposal(), null);
  const before = fixture.session().draftDigest;
  await request(fixture.app).post('/studio-authoring/resource-lifecycle').type('form').send({ ...base, confirmation: fixture.session().draftSource.resources.equipment[0].name }).expect(303);
  await request(fixture.app).get(`/studio-authoring?nodeId=${encodeURIComponent(occurrence)}`).expect(200).expect(/Remove preview — not applied/);
  assert.equal(fixture.session().draftDigest, before);
  let response = await request(fixture.app).post('/studio-authoring/apply').type('form').send({ nodeId: occurrence, viewport: 'desktop' }).expect(303);
  await request(fixture.app).get(response.headers.location).expect(200).expect(/Add equipment item/);
  response = await request(fixture.app).post('/studio-authoring/undo').type('form').send({ nodeId: occurrence, viewport: 'desktop' }).expect(303);
  await request(fixture.app).get(response.headers.location).expect(200);
  assert.equal(fixture.session().draftDigest, before);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});

for (const spec of cases) test(`${spec.kind}: ordinary creation, local Save and exact process reopen`, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-lifecycle-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'venue-assets'));
  const fixture = createReferenceV2AuthoringStudioFixture(spec.reference, { workspaceDirectory: root });
  const nodeId = `component:${spec.component}`;
  const payload = Object.fromEntries(Object.entries(spec.payload).map(([k, v]) => [k, ['startAt', 'endAt', 'lastUpdated'].includes(k) ? v.slice(0, 19) : v]));
  const form = { nodeId, viewport: 'mobile', operation: a.ADD_RESOURCE, expectedDraftDigest: fixture.session().draftDigest, ...payload, utcOffset: '-07:00' };
  await request(fixture.app).post('/studio-authoring/resource-lifecycle').type('form').send(form).expect(303);
  const id = fixture.proposal().resolvedTarget.resourceId;
  assert.equal(fs.existsSync(path.join(root, 'venue-source-v2.json')), false);
  await request(fixture.app).post('/studio-authoring/apply').type('form').send({ nodeId, viewport: 'mobile' }).expect(303);
  assert.equal(fs.existsSync(path.join(root, 'venue-source-v2.json')), false);
  const accepted = serialize(fixture.session().draftSource);
  await request(fixture.app).post('/studio-authoring/save-workspace').type('form').send({ nodeId, viewport: 'mobile', expectedDraftDigest: fixture.session().draftDigest, expectedPersistedDigest: V2_PERSISTED_SOURCE_ABSENT }).expect(303);
  const restartedDigest = execFileSync(process.execPath, ['-e',
    "const {createV2AuthoringStudioWorkspaceApp}=require('./src/venue/v2/studio-app'); process.stdout.write(createV2AuthoringStudioWorkspaceApp({workspaceDirectory:process.argv[1]}).session().draftDigest);", root,
  ], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.equal(restartedDigest, fixture.session().draftDigest);
  const reopened = createV2AuthoringStudioWorkspaceFixture({ workspaceDirectory: root });
  assert.equal(serialize(reopened.session().draftSource), accepted);
  assert.equal(reopened.session().draftSource.resources[spec.kind].at(-1).id, id);
  assert.equal(reopened.session().history.length, 0);
  await request(reopened.app).get(`/studio-authoring?nodeId=${encodeURIComponent(nodeId)}`).expect(200);
  assert.equal(reopened.diagnostics().hiveWrites, 0);
});

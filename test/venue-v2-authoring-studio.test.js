'use strict';

const { URLSearchParams } = require('node:url');

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const {
  createReferenceV2AuthoringStudioFixture,
} = require('./support/v2-authoring-studio-fixture');

const CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'page:home',
    fieldId: 'title',
    value: 'Home and neighborhood updates',
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    fieldId: 'heading',
    value: 'Equipment availability today',
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    fieldId: 'heading',
    value: 'An evening by the water',
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    fieldId: 'heading',
    value: 'This week at Northline',
  },
]);

function selectionPath(spec, viewport = 'desktop') {
  const query = new URLSearchParams({
    nodeId: spec.nodeId,
    fieldId: spec.fieldId,
    viewport,
  });
  return `/studio-authoring?${query.toString()}`;
}

test('memory-only authoring Studio exposes one typed editable surface across all four references', async () => {
  for (const spec of CASES) {
    const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
    const response = await request(fixture.app).get(selectionPath(spec));

    assert.equal(response.status, 200, spec.referenceId);
    assert.match(response.headers['cache-control'] || '', /no-store/, spec.referenceId);
    assert.match(response.text, /data-v2-authoring-studio="true"/, spec.referenceId);
    assert.match(response.text, /data-studio-persistent="false"/, spec.referenceId);
    assert.match(response.text, /data-studio-runtime-wired="false"/, spec.referenceId);
    assert.match(response.text, /Session draft · memory only/, spec.referenceId);
    assert.match(response.text, /Preview change/, spec.referenceId);
    assert.match(response.text, /name="expectedDraftDigest"/, spec.referenceId);
    assert.match(response.text, /Real v2 authoring preview/, spec.referenceId);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0, spec.referenceId);
    assert.equal(diagnostics.hiveRpcAttempts, 0, spec.referenceId);
    assert.equal(diagnostics.hiveWrites, 0, spec.referenceId);
  }
});

test('proposal preview does not change accepted draft; discard, apply, undo, and redo restore exact digests', async () => {
  const spec = CASES.find((item) => item.referenceId === 'restaurant');
  const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
  const openingDigest = fixture.session().draftDigest;

  let response = await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: spec.value,
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.ok(fixture.proposal());
  const previewDigest = fixture.proposal().afterDigest;
  assert.notEqual(previewDigest, openingDigest);

  response = await request(fixture.app).get(response.headers.location);
  assert.equal(response.status, 200);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, new RegExp(`data-accepted-digest="${openingDigest}"`));
  assert.match(response.text, new RegExp(`data-preview-digest="${previewDigest}"`));

  response = await request(fixture.app)
    .post('/studio-authoring/discard')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.session().historyIndex, 0);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: spec.value,
    })
    .expect(303);

  const appliedDigest = fixture.proposal().afterDigest;
  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(fixture.session().historyIndex, 1);
  assert.equal(fixture.session().canUndo, true);

  await request(fixture.app)
    .post('/studio-authoring/undo')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.session().canRedo, true);

  await request(fixture.app)
    .post('/studio-authoring/redo')
    .type('form')
    .send({
      nodeId: spec.nodeId,
      fieldId: spec.fieldId,
      viewport: 'desktop',
    })
    .expect(303);

  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(fixture.session().historyIndex, 1);

  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.proposals, 2);
  assert.equal(diagnostics.discards, 1);
  assert.equal(diagnostics.applies, 1);
  assert.equal(diagnostics.undos, 1);
  assert.equal(diagnostics.redos, 1);
  assert.equal(diagnostics.persistentWrites, 0);
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
});

test('stale and unauthorized browser requests fail closed without changing session state', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      fieldId: 'heading',
      viewport: 'desktop',
      expectedDraftDigest: '0'.repeat(64),
      value: 'Stale',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'page:home',
      fieldId: 'slug',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: 'renamed-route',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);

  await request(fixture.app)
    .post('/studio-authoring/propose')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      fieldId: 'heading',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      value: 'No path authority',
      sourcePointer: '/site/pages/0/components/0/content/heading',
    })
    .expect(400);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
});

test('preview transport is GET-only and does not expose mutation authority to the renderer route', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('live-music');

  const preview = await request(fixture.app)
    .get('/studio-authoring-preview/page/home');

  assert.equal(preview.status, 200);
  assert.match(preview.headers['cache-control'] || '', /no-store/);
  assert.match(preview.text, /data-component-id="home-hero"/);

  const rejected = await request(fixture.app)
    .post('/studio-authoring-preview/page/home')
    .send('mutation');

  assert.equal(rejected.status, 405);
  assert.equal(rejected.headers.allow, 'GET, HEAD');
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});


const REORDER_CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'component:home-pathways',
    destination: 'BEFORE_COMPONENT:home-hero',
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    destination: 'END_OF_PAGE',
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    destination: 'BEFORE_COMPONENT:home-hero',
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    destination: 'BEFORE_COMPONENT:home-hero',
  },
]);

function selectedComponentPath(spec, viewport = 'desktop') {
  return `/studio-authoring?nodeId=${encodeURIComponent(spec.nodeId)}&viewport=${viewport}`;
}

function homeOrder(fixture) {
  return fixture.session().draftSource.site.pages
    .find((page) => page.id === 'home')
    .components.map((component) => component.id);
}

test('selected components expose server-derived stable same-page position controls across four references', async () => {
  for (const spec of REORDER_CASES) {
    const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
    const response = await request(fixture.app).get(selectedComponentPath(spec));

    assert.equal(response.status, 200, spec.referenceId);
    assert.match(response.text, /Reorder component/, spec.referenceId);
    assert.match(response.text, /action="\/studio-authoring\/reorder"/, spec.referenceId);
    assert.match(response.text, /name="destination"/, spec.referenceId);
    assert.match(response.text, new RegExp(`value="${spec.destination}"`), spec.referenceId);
    assert.match(response.text, /Destinations are derived from stable siblings on this page/, spec.referenceId);
    assert.doesNotMatch(response.text, /name="pageId"/, spec.referenceId);
    assert.doesNotMatch(response.text, /name="componentIndex"/, spec.referenceId);
    assert.doesNotMatch(response.text, /name="sourcePointer"/, spec.referenceId);
  }
});

test('structural proposal previews through the real renderer and apply, discard, undo, redo restore exact order and digests', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;
  const openingOrder = homeOrder(fixture);

  let response = await request(fixture.app)
    .post('/studio-authoring/reorder')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'BEFORE_COMPONENT:home-hero',
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.deepEqual(homeOrder(fixture), openingOrder);
  assert.ok(fixture.proposal());
  const previewDigest = fixture.proposal().afterDigest;
  assert.notEqual(previewDigest, openingDigest);

  response = await request(fixture.app).get(response.headers.location);
  assert.equal(response.status, 200);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, /value="BEFORE_COMPONENT:home-hero" selected/);

  const preview = await request(fixture.app)
    .get('/studio-authoring-preview/page/home');
  assert.equal(preview.status, 200);
  assert.ok(
    preview.text.indexOf('data-component-id="home-gallery"')
      < preview.text.indexOf('data-component-id="home-hero"'),
  );

  await request(fixture.app)
    .post('/studio-authoring/discard')
    .type('form')
    .send({ nodeId: 'component:home-gallery', viewport: 'desktop' })
    .expect(303);

  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.deepEqual(homeOrder(fixture), openingOrder);

  await request(fixture.app)
    .post('/studio-authoring/reorder')
    .type('form')
    .send({
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'BEFORE_COMPONENT:home-hero',
    })
    .expect(303);

  const appliedDigest = fixture.proposal().afterDigest;
  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({ nodeId: 'component:home-gallery', viewport: 'desktop' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(homeOrder(fixture)[0], 'home-gallery');

  await request(fixture.app)
    .post('/studio-authoring/undo')
    .type('form')
    .send({ nodeId: 'component:home-gallery', viewport: 'desktop', fieldId: '' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.deepEqual(homeOrder(fixture), openingOrder);

  await request(fixture.app)
    .post('/studio-authoring/redo')
    .type('form')
    .send({ nodeId: 'component:home-gallery', viewport: 'desktop', fieldId: '' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(homeOrder(fixture)[0], 'home-gallery');

  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.proposals, 2);
  assert.equal(diagnostics.discards, 1);
  assert.equal(diagnostics.applies, 1);
  assert.equal(diagnostics.undos, 1);
  assert.equal(diagnostics.redos, 1);
  assert.equal(diagnostics.persistentWrites, 0);
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
});

test('structural browser transport rejects stale, cross-page, no-op, malformed, and browser-selected authority', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;

  const rejectedBodies = [
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: '0'.repeat(64),
      destination: 'BEFORE_COMPONENT:home-hero',
    },
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'BEFORE_COMPONENT:menu-main',
    },
    {
      nodeId: 'component:home-hero',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'BEFORE_COMPONENT:home-menu',
    },
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'BEFORE_COMPONENT:home-hero:extra',
    },
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'END_OF_PAGE',
      sourcePointer: '/site/pages/0/components',
    },
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      destination: 'END_OF_PAGE',
      pageId: 'home',
    },
  ];

  for (const body of rejectedBodies) {
    await request(fixture.app)
      .post('/studio-authoring/reorder')
      .type('form')
      .send(body)
      .expect(400);
    assert.equal(fixture.session().draftDigest, openingDigest);
    assert.equal(fixture.proposal(), null);
  }

  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});


test('page selections expose the bounded component catalog across four references without browser structure authority', async () => {
  for (const referenceId of ['fourth-street', 'juniper', 'restaurant', 'live-music']) {
    const fixture = createReferenceV2AuthoringStudioFixture(referenceId);
    const response = await request(fixture.app)
      .get('/studio-authoring?nodeId=page%3Ahome&viewport=desktop');

    assert.equal(response.status, 200, referenceId);
    assert.match(response.text, /Add component/, referenceId);
    assert.match(response.text, /Story \/ Intro/, referenceId);
    assert.match(response.text, /Hours &amp; Location/, referenceId);
    assert.match(response.text, /Contact \/ Visit/, referenceId);
    assert.match(response.text, /action="\/studio-authoring\/add"/, referenceId);
    assert.match(response.text, /name="catalogItemId"/, referenceId);
    assert.match(response.text, /name="destination"/, referenceId);
    assert.doesNotMatch(response.text, /name="componentId"/, referenceId);
    assert.doesNotMatch(response.text, /name="kind"/, referenceId);
    assert.doesNotMatch(response.text, /name="recipeId"/, referenceId);
    assert.doesNotMatch(response.text, /name="content"/, referenceId);
    assert.doesNotMatch(response.text, /name="responsive"/, referenceId);
    assert.doesNotMatch(response.text, /name="pageIndex"/, referenceId);
    assert.doesNotMatch(response.text, /name="sourcePointer"/, referenceId);
  }
});

test('eligible catalog-backed components expose removal while ineligible components do not', async () => {
  for (const referenceId of ['fourth-street', 'juniper', 'restaurant', 'live-music']) {
    const fixture = createReferenceV2AuthoringStudioFixture(referenceId);
    const page = fixture.session().draftSource.site.pages.find((candidate) => candidate.id === 'home');
    const removable = page.components.find(
      (component) => component.kind === 'contact-visit' && component.recipeId === 'visit-legacy-v1',
    );
    assert.ok(removable, referenceId);

    const allowed = await request(fixture.app)
      .get(`/studio-authoring?nodeId=${encodeURIComponent(`component:${removable.id}`)}&viewport=desktop`);
    assert.equal(allowed.status, 200, referenceId);
    assert.match(allowed.text, /Remove component/, referenceId);
    assert.match(allowed.text, /action="\/studio-authoring\/remove"/, referenceId);

    const eligibleSignatures = new Set([
      'editorial-intro::intro-legacy-v1',
      'hours-location::hours-location-standard',
      'contact-visit::visit-legacy-v1',
    ]);
    const ineligible = page.components.find(
      (component) => !eligibleSignatures.has(`${component.kind}::${component.recipeId}`),
    );
    assert.ok(ineligible, referenceId);
    const denied = await request(fixture.app)
      .get(`/studio-authoring?nodeId=${encodeURIComponent(`component:${ineligible.id}`)}&viewport=desktop`);
    assert.equal(denied.status, 200, referenceId);
    assert.doesNotMatch(denied.text, /Remove component/, referenceId);
    assert.doesNotMatch(denied.text, /action="\/studio-authoring\/remove"/, referenceId);
  }
});

test('ADD_COMPONENT previews through the real renderer and apply discard undo redo preserve exact authority', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;
  const openingSerialization = JSON.stringify(fixture.session().draftSource);

  let response = await request(fixture.app)
    .post('/studio-authoring/add')
    .type('form')
    .send({
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'BEFORE_COMPONENT:home-gallery',
    });

  assert.equal(response.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(JSON.stringify(fixture.session().draftSource), openingSerialization);
  assert.equal(fixture.proposal().command.type, 'ADD_COMPONENT');
  assert.equal(fixture.proposal().resolvedTarget.componentId, 'story-intro');

  response = await request(fixture.app).get(response.headers.location);
  assert.equal(response.status, 200);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, /value="story-intro" selected/);

  let preview = await request(fixture.app).get('/studio-authoring-preview/page/home');
  assert.equal(preview.status, 200);
  assert.ok(
    preview.text.indexOf('data-component-id="story-intro"')
      < preview.text.indexOf('data-component-id="home-gallery"'),
  );

  await request(fixture.app)
    .post('/studio-authoring/discard')
    .type('form')
    .send({ nodeId: 'page:home', viewport: 'desktop' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(JSON.stringify(fixture.session().draftSource), openingSerialization);

  await request(fixture.app)
    .post('/studio-authoring/add')
    .type('form')
    .send({
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'BEFORE_COMPONENT:home-gallery',
    })
    .expect(303);

  const appliedDigest = fixture.proposal().afterDigest;
  await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({ nodeId: 'page:home', viewport: 'desktop' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, appliedDigest);
  assert.equal(
    fixture.session().draftSource.site.pages
      .find((page) => page.id === 'home')
      .components.some((component) => component.id === 'story-intro'),
    true,
  );

  await request(fixture.app)
    .post('/studio-authoring/undo')
    .type('form')
    .send({ nodeId: 'page:home', viewport: 'desktop', fieldId: '' })
    .expect(303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(JSON.stringify(fixture.session().draftSource), openingSerialization);

  await request(fixture.app)
    .post('/studio-authoring/redo')
    .type('form')
    .send({ nodeId: 'page:home', viewport: 'desktop', fieldId: '' })
    .expect(303);
  assert.equal(fixture.session().draftDigest, appliedDigest);

  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.persistentWrites, 0);
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
});

test('REMOVE_COMPONENT previews disappearance and Undo restores exact component snapshot and order', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('live-music');
  const opening = fixture.session();
  const page = opening.draftSource.site.pages.find((candidate) => candidate.id === 'home');
  const removable = page.components.find(
    (component) => component.kind === 'contact-visit' && component.recipeId === 'visit-legacy-v1',
  );
  assert.ok(removable);
  const nodeId = `component:${removable.id}`;
  const openingDigest = opening.draftDigest;
  const openingSerialization = JSON.stringify(opening.draftSource);

  let response = await request(fixture.app)
    .post('/studio-authoring/remove')
    .type('form')
    .send({
      nodeId,
      viewport: 'mobile',
      expectedDraftDigest: openingDigest,
    });
  assert.equal(response.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal().command.type, 'REMOVE_COMPONENT');

  response = await request(fixture.app).get(response.headers.location);
  assert.equal(response.status, 200);
  assert.match(response.text, /Preview — not applied/);
  assert.match(response.text, /Canvas is rendering this component removed/);

  const preview = await request(fixture.app).get('/studio-authoring-preview/page/home');
  assert.equal(preview.status, 200);
  assert.equal(preview.text.includes(`data-component-id="${removable.id}"`), false);

  response = await request(fixture.app)
    .post('/studio-authoring/apply')
    .type('form')
    .send({ nodeId, viewport: 'mobile' });
  assert.equal(response.status, 303);
  assert.match(response.headers.location, /nodeId=page%3Ahome/);
  assert.equal(
    fixture.session().draftSource.site.pages
      .find((candidate) => candidate.id === 'home')
      .components.some((component) => component.id === removable.id),
    false,
  );

  await request(fixture.app)
    .post('/studio-authoring/undo')
    .type('form')
    .send({ nodeId: 'page:home', viewport: 'mobile', fieldId: '' })
    .expect(303);

  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(JSON.stringify(fixture.session().draftSource), openingSerialization);

  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.persistentWrites, 0);
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
});

test('cardinality browser transport rejects unknown stale cross-page and browser-owned component structure', async () => {
  const fixture = createReferenceV2AuthoringStudioFixture('restaurant');
  const openingDigest = fixture.session().draftDigest;

  const rejectedAdds = [
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'unknown',
      destination: 'END_OF_PAGE',
    },
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: '0'.repeat(64),
      catalogItemId: 'story-intro',
      destination: 'END_OF_PAGE',
    },
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'BEFORE_COMPONENT:menu-main',
    },
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'END_OF_PAGE',
      componentId: 'browser-id',
    },
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'END_OF_PAGE',
      kind: 'hero',
    },
    {
      nodeId: 'page:home',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      catalogItemId: 'story-intro',
      destination: 'END_OF_PAGE',
      sourcePointer: '/site/pages/0/components',
    },
  ];
  for (const body of rejectedAdds) {
    await request(fixture.app)
      .post('/studio-authoring/add')
      .type('form')
      .send(body)
      .expect(400);
    assert.equal(fixture.proposal(), null);
    assert.equal(fixture.session().draftDigest, openingDigest);
  }

  for (const body of [
    {
      nodeId: 'component:home-hero',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
    },
    {
      nodeId: 'component:home-gallery',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
    },
    {
      nodeId: 'component:home-contact',
      viewport: 'desktop',
      expectedDraftDigest: openingDigest,
      componentSnapshot: '{"forged":true}',
    },
  ]) {
    await request(fixture.app)
      .post('/studio-authoring/remove')
      .type('form')
      .send(body)
      .expect(400);
    assert.equal(fixture.proposal(), null);
    assert.equal(fixture.session().draftDigest, openingDigest);
  }

  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assert.equal(fixture.diagnostics().hiveRpcAttempts, 0);
  assert.equal(fixture.diagnostics().hiveWrites, 0);
});

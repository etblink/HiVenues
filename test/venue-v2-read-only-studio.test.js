'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const {
  createV2DeploymentAgnosticVenueSource,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  V2ReadOnlyStudioError,
  createV2ReadOnlyStudioModel,
  parseV2ReadOnlyStudioQuery,
  renderV2ReadOnlyStudioSurface,
  v2ReadOnlyStudioSelectionHref,
} = require('../src/venue/v2/studio-read-only');
const {
  REFERENCE_FACTORIES,
  musicSource,
  restaurantSource,
} = require('./support/v2-renderer-fixture');
const {
  createReferenceV2ReadOnlyStudioFixture,
} = require('./support/v2-studio-fixture');

const ROOT = path.join(__dirname, '..');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function documentFrom(html) {
  return new JSDOM(html).window.document;
}

test('one read-only v2 Studio model serves all four references with explicit nonpersistent authority', () => {
  for (const [referenceId, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = factory();
    const model = createV2ReadOnlyStudioModel(source);

    assert.equal(model.kind, 'hivenues-v2-read-only-studio-model', referenceId);
    assert.equal(model.venue.id, source.venue.id, referenceId);
    assert.equal(model.authority.derived, true, referenceId);
    assert.equal(model.authority.persistent, false, referenceId);
    assert.equal(model.authority.runtimeWired, false, referenceId);
    assert.equal(model.authority.mutationsAvailable, false, referenceId);
    assert.equal(model.selection.nodeId, `page:${source.site.homePageId}`, referenceId);
    assert.equal(model.selection.fieldId, null, referenceId);
    assert.equal(model.selection.viewport, 'desktop', referenceId);
    assert.equal(model.previewPage.id, source.site.homePageId, referenceId);
    assert.ok(model.treeRows.length >= source.site.pages.length + 1, referenceId);
  }
});

test('Studio selection contract is strict, canonical, and fail-closed', () => {
  const source = restaurantSource();

  assert.deepEqual(parseV2ReadOnlyStudioQuery(source, {
    nodeId: 'component:home-hero',
    fieldId: 'heading',
    viewport: 'tablet',
  }), {
    schemaVersion: 1,
    nodeId: 'component:home-hero',
    fieldId: 'heading',
    viewport: 'tablet',
  });

  assert.equal(
    v2ReadOnlyStudioSelectionHref('/studio', {
      nodeId: 'component:home-hero',
      fieldId: 'heading',
      viewport: 'tablet',
    }),
    '/studio?nodeId=component%3Ahome-hero&fieldId=heading&viewport=tablet',
  );

  const invalidQueries = [
    { unexpected: 'value' },
    { fieldId: 'heading' },
    { nodeId: 'missing-node' },
    { nodeId: 'component:home-hero', fieldId: 'missing-field' },
    { nodeId: 'component:home-hero', viewport: 'watch' },
  ];
  for (const query of invalidQueries) {
    assert.throws(
      () => parseV2ReadOnlyStudioQuery(source, query),
      V2ReadOnlyStudioError,
    );
  }
  assert.throws(
    () => parseV2ReadOnlyStudioQuery(source, []),
    V2ReadOnlyStudioError,
  );
  assert.throws(
    () => v2ReadOnlyStudioSelectionHref('https://example.com/studio', {
      nodeId: 'page:home',
      fieldId: null,
      viewport: 'desktop',
    }),
    V2ReadOnlyStudioError,
  );
});

test('component and shared-resource selection identities survive array reordering', () => {
  const original = restaurantSource();
  const componentSelection = 'component:home-menu';
  const resourceSelection = 'component:home-menu/resource:menus:dinner';

  const originalComponent = createV2ReadOnlyStudioModel(original, {
    nodeId: componentSelection,
    viewport: 'desktop',
  });
  const originalResource = createV2ReadOnlyStudioModel(original, {
    nodeId: resourceSelection,
    viewport: 'desktop',
  });

  const reorderedInput = clone(original);
  reorderedInput.site.pages.reverse();
  const home = reorderedInput.site.pages.find((page) => page.id === 'home');
  home.components.reverse();
  reorderedInput.site.navigation.reverse();
  reorderedInput.media.assets.reverse();
  reorderedInput.resources.menus.reverse();
  const reordered = createV2DeploymentAgnosticVenueSource(reorderedInput);

  const reorderedComponent = createV2ReadOnlyStudioModel(reordered, {
    nodeId: componentSelection,
    viewport: 'desktop',
  });
  const reorderedResource = createV2ReadOnlyStudioModel(reordered, {
    nodeId: resourceSelection,
    viewport: 'desktop',
  });

  assert.equal(originalComponent.selectedEntry.selectionId, reorderedComponent.selectedEntry.selectionId);
  assert.equal(originalComponent.selectedEntry.componentId, reorderedComponent.selectedEntry.componentId);
  assert.equal(originalComponent.previewPage.id, reorderedComponent.previewPage.id);
  assert.equal(originalResource.selectedEntry.selectionId, reorderedResource.selectedEntry.selectionId);
  assert.equal(originalResource.selectedEntry.kind, 'resource-reference');
  assert.equal(reorderedResource.selectedEntry.kind, 'resource-reference');
  assert.equal(originalResource.previewPage.id, 'home');
  assert.equal(reorderedResource.previewPage.id, 'home');
});

test('selection and responsive preview switching are source-neutral presentation state', () => {
  const source = restaurantSource();
  const beforeBytes = serializeV2DeploymentAgnosticVenueSource(source);
  const beforeDigest = deriveV2DeploymentAgnosticVenueSourceDigest(source);

  const selections = [
    { nodeId: 'page:home', viewport: 'desktop' },
    { nodeId: 'component:home-hero', fieldId: 'heading', viewport: 'tablet' },
    { nodeId: 'component:home-menu/resource:menus:dinner', viewport: 'mobile' },
    { nodeId: 'page:menu', fieldId: 'title', viewport: 'desktop' },
  ];

  for (const selection of selections) {
    const model = createV2ReadOnlyStudioModel(source, selection);
    assert.equal(model.sourceDigest, beforeDigest);
    assert.equal(model.authority.mutationsAvailable, false);
  }

  assert.equal(serializeV2DeploymentAgnosticVenueSource(source), beforeBytes);
  assert.equal(deriveV2DeploymentAgnosticVenueSourceDigest(source), beforeDigest);
});

test('page, component and resource selection resolve the correct real-renderer page context', () => {
  const source = restaurantSource();

  const page = createV2ReadOnlyStudioModel(source, {
    nodeId: 'page:menu',
    viewport: 'desktop',
  });
  const component = createV2ReadOnlyStudioModel(source, {
    nodeId: 'component:menu-main',
    viewport: 'desktop',
  });
  const resource = createV2ReadOnlyStudioModel(source, {
    nodeId: 'component:menu-main/resource:menus:dinner',
    viewport: 'desktop',
  });

  assert.equal(page.previewPage.id, 'menu');
  assert.equal(component.previewPage.id, 'menu');
  assert.equal(resource.previewPage.id, 'menu');
  assert.equal(component.inspector.recipeId, 'list-editorial-rows');
  assert.equal(resource.inspector.semanticKind, 'resource-reference');
  assert.equal(
    resource.inspector.resourceFacts.some((fact) => fact.label === 'Title' && fact.value === 'Dinner'),
    true,
  );
});

test('Inspector exposes typed field, ownership and responsive inheritance without raw JSON as the ordinary surface', () => {
  const source = restaurantSource();
  const model = createV2ReadOnlyStudioModel(source, {
    nodeId: 'component:home-hero',
    fieldId: 'heading',
    viewport: 'tablet',
  });

  assert.equal(model.inspector.semanticKind, 'venue-hero');
  assert.equal(model.inspector.recipeId, 'hero-editorial-split');
  assert.equal(model.inspector.selectedField.fieldId, 'heading');
  assert.equal(model.inspector.selectedField.valueSummary, 'A warmer kind of gathering');
  assert.equal(model.inspector.selectedField.ownership, 'OPERATOR_AUTHORED');

  const layout = model.inspector.responsive.find((item) => item.key === 'layoutVariant');
  assert.deepEqual(layout, {
    key: 'layoutVariant',
    label: 'Layout Variant',
    value: 'stacked',
    source: 'tablet',
  });

  const html = renderV2ReadOnlyStudioSurface({
    sourceInput: source,
    query: {
      nodeId: 'component:home-hero',
      fieldId: 'heading',
      viewport: 'tablet',
    },
    studioPath: '/studio',
    previewPathForPage: (page) => `/studio-preview/page/${page.id}`,
  });
  const document = documentFrom(html);
  assert.equal(document.querySelector('main').dataset.studioMutations, 'false');
  assert.equal(document.querySelector('main').dataset.studioPersistent, 'false');
  assert.match(document.querySelector('.selected-field').textContent, /A warmer kind of gathering/);
  assert.doesNotMatch(document.querySelector('.inspector-panel').textContent, /"heading"\s*:/);
  assert.equal(document.querySelector('iframe').getAttribute('src'), '/studio-preview/page/home');
  assert.equal(document.querySelector('[data-preview-viewport]').dataset.previewViewport, 'tablet');
});

test('public-only restaurant and music Studios do not acquire Hive/community/payment-shaped controls', () => {
  for (const factory of [restaurantSource, musicSource]) {
    const source = factory();
    const html = renderV2ReadOnlyStudioSurface({
      sourceInput: source,
      query: { viewport: 'desktop' },
      studioPath: '/studio',
      previewPathForPage: (page) => `/studio-preview/page/${page.id}`,
    });
    const document = documentFrom(html);
    const studioText = document.body.textContent;

    assert.doesNotMatch(studioText, /Community|Threads|Hive Keychain|HBD|Pay with|Sign in/i);
    assert.equal(document.querySelectorAll('form').length, 0);
    assert.equal(document.querySelectorAll('button').length, 0);
    assert.equal(document.querySelectorAll('input, textarea, select').length, 0);
  }
});

test('isolated Studio fixture is GET-only, uses the real renderer, and records zero Hive/write effects', async () => {
  for (const referenceId of Object.keys(REFERENCE_FACTORIES)) {
    const fixture = createReferenceV2ReadOnlyStudioFixture(referenceId);
    const studio = await request(fixture.app).get('/studio?viewport=mobile').expect(200);
    const document = documentFrom(studio.text);
    assert.equal(document.documentElement.dataset.v2ReadOnlyStudio, 'true', referenceId);
    assert.match(document.querySelector('iframe').getAttribute('src'), /^\/studio-preview\/page\//, referenceId);

    const previewPath = document.querySelector('iframe').getAttribute('src');
    const preview = await request(fixture.app).get(previewPath).expect(200);
    assert.match(preview.text, /data-component-id=|v2-page-intro/, referenceId);

    await request(fixture.app)
      .post('/studio')
      .send('forbidden')
      .expect(405);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.hiveRpcAttempts, 0, referenceId);
    assert.equal(diagnostics.writes, 0, referenceId);
    assert.equal(diagnostics.mutationRequests, 1, referenceId);
  }
});

test('embedded renderer navigation remains functional for multi-page and event references', async () => {
  const restaurant = createReferenceV2ReadOnlyStudioFixture('restaurant');
  await request(restaurant.app).get('/studio-preview/site/').expect(200);
  const menu = await request(restaurant.app).get('/studio-preview/site/menu').expect(200);
  assert.match(menu.text, /Seasonal menu|The menu/);

  const music = createReferenceV2ReadOnlyStudioFixture('live-music');
  await request(music.app).get('/studio-preview/site/shows').expect(200);
  const event = await request(music.app)
    .get('/studio-preview/site/events/fixture-show-one')
    .expect(200);
  assert.match(event.text, /The Static Lights/);
  assert.match(event.text, /application\/ld\+json/);

  const fourth = createReferenceV2ReadOnlyStudioFixture('fourth-street');
  const community = await request(fourth.app)
    .get('/studio-preview/site/community')
    .expect(200);
  assert.match(community.text, /No Hive RPC was attempted/);
  assert.equal(fourth.diagnostics().hiveRpcAttempts, 0);
});

test('current v1 production and Turnkey Studio remain free of v2 Studio wiring', () => {
  const paths = [
    path.join(ROOT, 'src', 'app.js'),
    path.join(ROOT, 'src', 'server.js'),
    path.join(ROOT, 'src', 'venue', 'turnkey-studio.js'),
  ];
  for (const filename of paths) {
    const source = fs.readFileSync(filename, 'utf8');
    assert.doesNotMatch(source, /studio-read-only|createV2ReadOnlyStudioModel|renderV2ReadOnlyStudioSurface/);
  }
});

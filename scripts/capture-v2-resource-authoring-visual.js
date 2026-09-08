#!/usr/bin/env node
'use strict';

const { URLSearchParams } = require('node:url');

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  createReferenceV2AuthoringStudioFixture,
} = require('../test/support/v2-authoring-studio-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_RESOURCE_AUTHORING_REVIEW_ROOT || 'artifacts/v2-resource-authoring-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const CASES = Object.freeze([
  {
    referenceId: 'juniper',
    componentId: 'home-programs',
    resourceKind: 'programs',
    fieldId: 'title',
    value: 'Open shop orientation',
    shellViewport: { width: 1280, height: 900 },
    previewViewport: 'tablet',
    secondaryPath: '/studio-authoring-preview/site/programs',
    screenshotId: 'juniper-program-preview',
  },
  {
    referenceId: 'live-music',
    componentId: 'home-shows',
    resourceKind: 'events',
    fieldId: 'title',
    value: 'The Static Lights — Second Set',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
    secondaryPath: '/studio-authoring-preview/site/shows',
    eventDetail: true,
    screenshotId: 'live-event-detail-preview',
  },
]);

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function runAxe(frame) {
  await frame.addScriptTag({ content: axe.source });
  const result = await frame.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    resultTypes: ['violations'],
  }));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    targets: violation.nodes.map((node) => node.target),
  }));
}

async function accessibility(page, label) {
  const outer = await runAxe(page.mainFrame());
  const previewFrame = page.frames().find((frame) => frame !== page.mainFrame());
  assert.ok(previewFrame, `${label}: preview frame missing`);
  const preview = await runAxe(previewFrame);
  const blocking = [...outer, ...preview]
    .filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(
    blocking,
    [],
    `${label}: blocking accessibility findings\n${JSON.stringify(blocking, null, 2)}`,
  );
  return { outer, preview, blocking };
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const heights = [...globalThis.document.querySelectorAll('a,button,input,textarea,select')]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      resourceEditorCount: globalThis.document.querySelectorAll('.resource-editor').length,
      minimumTargetHeight: heights.length ? Math.min(...heights) : null,
    };
  });
  assert.ok(
    metrics.scrollWidth - metrics.clientWidth <= 1,
    `${label}: horizontal overflow ${JSON.stringify(metrics)}`,
  );
  assert.equal(metrics.mainCount, 1, `${label}: expected one main landmark`);
  assert.equal(metrics.iframeCount, 1, `${label}: expected one real-renderer iframe`);
  assert.equal(metrics.resourceEditorCount, 1, `${label}: expected one typed resource editor`);
  assert.ok(
    metrics.minimumTargetHeight === null || metrics.minimumTargetHeight >= 43.5,
    `${label}: target below 44px convention ${JSON.stringify(metrics)}`,
  );
  return metrics;
}

async function authority(page) {
  return page.locator('main.studio').evaluate((element) => ({
    acceptedDigest: element.dataset.acceptedDigest,
    previewDigest: element.dataset.previewDigest,
    previewActive: element.dataset.previewActive,
    persistent: element.dataset.studioPersistent,
    runtimeWired: element.dataset.studioRuntimeWired,
    mutations: element.dataset.studioMutations,
  }));
}

async function navigateByButton(page, name) {
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name, exact: true }).click();
  await navigation;
}

async function bodyText(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `preview request failed: ${url}`);
  return response.text();
}

async function runCase(browser, spec) {
  const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
  const source = fixture.session().draftSource;
  const resource = source.resources[spec.resourceKind][0];
  assert.ok(resource, `${spec.referenceId}: resource missing`);
  const occurrence = `component:${spec.componentId}/resource:${spec.resourceKind}:${resource.id}`;
  const stableNodeId = `resource:${spec.resourceKind}:${resource.id}`;
  const query = new URLSearchParams({
    nodeId: occurrence,
    viewport: spec.previewViewport,
  });
  const server = await listenLoopback(fixture.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    await page.goto(`${baseUrl}/studio-authoring?${query.toString()}`, { waitUntil: 'networkidle' });
    const baseline = await authority(page);
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'false');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.mutations, 'true');
    assert.equal(await page.locator('.resource-editor').count(), 1);
    assert.equal(await page.locator('input[name="resourceNodeId"]').first().inputValue(), stableNodeId);

    const form = page.locator(
      `form.resource-field-form:has(input[name="fieldId"][value="${spec.fieldId}"])`,
    );
    assert.equal(await form.count(), 1, `${spec.referenceId}: expected one field form`);
    const valueControl = form.locator('[name="value"]');
    await valueControl.fill(spec.value);
    const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await form.getByRole('button').click();
    await navigation;

    const preview = await authority(page);
    assert.equal(preview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(preview.previewDigest, baseline.acceptedDigest);
    assert.equal(preview.previewActive, 'true');
    assert.equal(fixture.session().draftDigest, baseline.acceptedDigest);
    assert.equal(fixture.proposal().resolvedTarget.resourceKind, spec.resourceKind);
    assert.equal(fixture.proposal().resolvedTarget.resourceId, resource.id);

    const home = await bodyText(`${baseUrl}/studio-authoring-preview/site/`);
    const secondary = await bodyText(`${baseUrl}${spec.secondaryPath}`);
    assert.ok(home.includes(spec.value), `${spec.referenceId}: Home consumer did not update`);
    assert.ok(secondary.includes(spec.value), `${spec.referenceId}: secondary consumer did not update`);

    const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
    assert.ok(frame, `${spec.referenceId}: preview frame missing`);
    if (spec.eventDetail) {
      const detailPath = `/studio-authoring-preview/site/events/${resource.slug}`;
      assert.ok(
        (await bodyText(`${baseUrl}${detailPath}`)).includes(spec.value),
        'event detail consumer did not update',
      );
      await frame.goto(`${baseUrl}${detailPath}`, { waitUntil: 'networkidle' });
    } else {
      await frame.goto(`${baseUrl}${spec.secondaryPath}`, { waitUntil: 'networkidle' });
    }

    const previewGeometry = await geometry(page, `${spec.referenceId}/resource-preview`);
    const previewAccessibility = await accessibility(page, `${spec.referenceId}/resource-preview`);
    const filename = path.join(SCREENSHOTS, `${spec.screenshotId}.png`);
    await page.screenshot({ path: filename, fullPage: false });
    const screenshot = screenshotRecord(filename);

    await navigateByButton(page, 'Apply to draft');
    const applied = await authority(page);
    assert.equal(applied.acceptedDigest, preview.previewDigest);
    assert.equal(
      fixture.session().draftSource.resources[spec.resourceKind][0][spec.fieldId],
      spec.value,
    );

    await navigateByButton(page, 'Undo');
    const undone = await authority(page);
    assert.equal(undone.acceptedDigest, baseline.acceptedDigest);
    assert.equal(
      fixture.session().draftSource.resources[spec.resourceKind][0][spec.fieldId],
      resource[spec.fieldId],
    );

    await navigateByButton(page, 'Redo');
    const redone = await authority(page);
    assert.equal(redone.acceptedDigest, applied.acceptedDigest);
    assert.equal(
      fixture.session().draftSource.resources[spec.resourceKind][0][spec.fieldId],
      spec.value,
    );

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.resourceScalarProposalRequests, 1);
    assert.equal(diagnostics.persistentWrites, 0);
    assert.equal(diagnostics.hiveRpcAttempts, 0);
    assert.equal(diagnostics.hiveWrites, 0);

    return {
      referenceId: spec.referenceId,
      resourceKind: spec.resourceKind,
      resourceId: resource.id,
      fieldId: spec.fieldId,
      occurrenceSelection: occurrence,
      stableNodeId,
      shellViewport: spec.shellViewport,
      previewViewport: spec.previewViewport,
      sharedConsumerProof: true,
      eventDetailProof: Boolean(spec.eventDetail),
      digests: {
        before: baseline.acceptedDigest,
        preview: preview.previewDigest,
        applied: applied.acceptedDigest,
        undone: undone.acceptedDigest,
        redone: redone.acceptedDigest,
      },
      previewGeometry,
      previewAccessibility,
      screenshot,
      diagnostics,
    };
  } finally {
    await page.close();
    await closeServer(server);
  }
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const browser = await chromium.launch();
  const scenarios = [];
  try {
    for (const spec of CASES) scenarios.push(await runCase(browser, spec));
  } finally {
    await browser.close();
  }

  const summary = {
    scenarioCount: scenarios.length,
    screenshotCount: scenarios.length,
    sharedConsumerProofCount: scenarios.filter((item) => item.sharedConsumerProof).length,
    eventDetailProofCount: scenarios.filter((item) => item.eventDetailProof).length,
    digestProofCount: scenarios.length,
    blockingAccessibilityFindings: scenarios.reduce(
      (sum, item) => sum + item.previewAccessibility.blocking.length,
      0,
    ),
    horizontalOverflowFindings: scenarios.filter(
      (item) => item.previewGeometry.scrollWidth - item.previewGeometry.clientWidth > 1,
    ).length,
    persistentWrites: scenarios.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: scenarios.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: scenarios.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };
  assert.equal(summary.scenarioCount, 2);
  assert.equal(summary.screenshotCount, 2);
  assert.equal(summary.sharedConsumerProofCount, 2);
  assert.equal(summary.eventDetailProofCount, 1);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.persistentWrites, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);

  const manifest = {
    kind: 'hivenues-v2-resource-scalar-authoring-visual-evidence',
    schemaVersion: 1,
    issue: 199,
    generatedAt: new Date().toISOString(),
    summary,
    scenarios,
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('V2_RESOURCE_AUTHORING_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});

'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), 'utf8'));
const rawRoot = path.resolve(ROOT, process.env.VISUAL_RAW_ROOT || contract.execution.rawRoot);
const reviewRoot = path.resolve(ROOT, process.env.VISUAL_REVIEW_ROOT || contract.execution.reviewRoot);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngSize(bytes) {
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', 'Review screenshot must be PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function normalizeFindings(findings) {
  const keyed = new Map();
  for (const finding of findings) keyed.set(`${finding.id}:${finding.impact}`, { id: finding.id, impact: finding.impact });
  return [...keyed.values()].sort((a, b) => `${a.id}:${a.impact}`.localeCompare(`${b.id}:${b.impact}`));
}

function accessibilityEvidence() {
  const ux1e = readJson(rawRoot, 'ux-1e-visual/manifest.json');
  const ux1eFindings = normalizeFindings(Object.values(ux1e.axe || {}).flat());
  const source = readJson(rawRoot, 'source-authoring-visual/manifest.json');
  const sourceEditor = normalizeFindings(Object.values(source.scenarios || {}).flatMap((scenario) => scenario.axeEditor || []));
  const sourcePreview = normalizeFindings(Object.values(source.scenarios || {}).flatMap((scenario) => scenario.axePreview || []));
  const canvas = normalizeFindings(Object.values(source.scenarios || {}).flatMap((scenario) => scenario.readOnlyCanvas?.axeCanvas || []));
  const canvasPreview = normalizeFindings(Object.values(source.scenarios || {}).flatMap((scenario) => scenario.readOnlyCanvas?.axeCanvasPreview || []));
  const editableStates = Object.values(source.scenarios).flatMap(s => s.editableCanvas || []);
  const editableCanvas = normalizeFindings(editableStates.flatMap(s => s.axeCanvas));
  const editablePreview = normalizeFindings(editableStates.flatMap(s => s.axePreview));

  const declared = contract.accessibilityContract.classifiedNonBlocking;
  const declaredFor = (suite) => normalizeFindings(declared.filter((item) => item.suite === suite));
  assert.deepEqual(ux1eFindings, declaredFor('wall-inbox'), 'UX-1E accessibility findings changed from the classified contract');
  assert.deepEqual(sourceEditor, declaredFor('source-authoring'), 'Source-authoring accessibility findings changed from the classified contract');
  assert.deepEqual(sourcePreview, [], 'Source-authoring preview must remain free of Axe violations');
  for (const finding of canvas) assert.ok(declaredFor('source-authoring').some((entry) => entry.id === finding.id && entry.impact === finding.impact), `Unclassified Canvas Axe finding: ${JSON.stringify(finding)}`);
  assert.deepEqual(canvasPreview, [], 'Canvas renderer preview must remain free of Axe violations');
  for (const finding of editableCanvas) assert.ok(declaredFor('source-authoring').some(entry => entry.id === finding.id && entry.impact === finding.impact), `Unclassified editable Canvas Axe finding: ${JSON.stringify(finding)}`);
  assert.deepEqual(editablePreview, [], 'Editable Canvas preview must remain free of Axe violations');
  return {
    blockingImpacts: contract.accessibilityContract.blockingImpacts,
    wallInbox: ux1eFindings,
    sourceAuthoringEditor: sourceEditor,
    sourceAuthoringPreview: sourcePreview,
    readOnlyCanvas: canvas,
    readOnlyCanvasPreview: canvasPreview,
    editableCanvas,
    editablePreview,
    classifiedNonBlocking: declared,
  };
}

function historicalAuthoringEvidence() {
  const source = readJson(rawRoot, 'source-authoring-visual/manifest.json');
  const fourthStreet = Object.entries(source.scenarios || {})
    .filter(([id]) => id.startsWith('fourth-street'))
    .map(([id, scenario]) => ({ id, preservedVenueName: scenario.exercise?.preservedVenueName }));
  assert.ok(fourthStreet.length >= 2, 'Fourth Street source-authoring evidence is missing');
  assert.ok(fourthStreet.every(({ preservedVenueName }) => preservedVenueName === '4th Street Bar'), JSON.stringify(fourthStreet));
  const juniper = Object.entries(source.scenarios || {})
    .filter(([id]) => id.startsWith('juniper'))
    .map(([id, scenario]) => ({ id, generatedProgramId: scenario.exercise?.generatedProgramId }));
  assert.ok(juniper.length >= 2 && juniper.every(({ generatedProgramId }) => generatedProgramId), JSON.stringify(juniper));
  return { fourthStreet, juniperStructuredEditProof: juniper };
}

function verifyViewportReview() {
  const manifestPath = path.join(reviewRoot, 'manifest.json');
  const review = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(review.contractId, contract.contractId);
  assert.equal(review.screenshotMode, 'viewport-only');
  assert.equal(review.fullPageScreenshots, false);
  assert.equal(review.captures.length, contract.reviewScenarios.length);
  const ids = new Set();
  const hashes = new Set();
  let screenshotBytes = 0;
  for (const capture of review.captures) {
    assert.ok(!ids.has(capture.id), `Duplicate review id ${capture.id}`);
    ids.add(capture.id);
    const declared = contract.reviewScenarios.find(({ id }) => id === capture.id);
    assert.ok(declared, `Undeclared review capture ${capture.id}`);
    const bytes = fs.readFileSync(path.join(reviewRoot, capture.file));
    const size = pngSize(bytes);
    assert.deepEqual(size, declared.viewport, `${capture.id}: screenshot must equal the declared real viewport`);
    assert.ok(size.height <= contract.reviewRules.maxReviewHeight, `${capture.id}: review screenshot too tall`);
    const digest = sha256(bytes);
    assert.equal(digest, capture.sha256, `${capture.id}: manifest hash mismatch`);
    assert.ok(!hashes.has(digest), `${capture.id}: duplicate screenshot evidence`);
    hashes.add(digest);
    screenshotBytes += bytes.length;
  }
  const fourthStreet = review.captures.find(({ id }) => id === 'fourth-street-authoring-mobile');
  const juniper = review.captures.find(({ id }) => id === 'juniper-authoring-mobile');
  assert.equal(fourthStreet?.preservedFourthStreetIdentity, true, JSON.stringify(fourthStreet));
  assert.equal(fourthStreet?.originalName, '4th Street Bar');
  assert.equal(fourthStreet?.editedName, null);
  assert.equal(juniper?.syntheticIdentityEdit, true, JSON.stringify(juniper));
  assert.notEqual(juniper?.originalName, '4th Street Bar');
  assert.equal(juniper?.editedName, 'Juniper Works Community Lab');
  return { review, screenshotBytes };
}

function readOnlyCanvasEvidence(captures) {
  const expectedIds = ['fourth-street-canvas-desktop', 'juniper-canvas-mobile'];
  const selected = captures.filter(({ mode }) => mode === 'canvas');
  assert.deepEqual(selected.map(({ id }) => id), expectedIds);
  const source = readJson(rawRoot, 'source-authoring-visual/manifest.json');
  const machine = Object.entries(source.scenarios).map(([id, scenario]) => ({ id, ...scenario.readOnlyCanvas }));
  assert.equal(machine.length, 4);
  for (const evidence of [...machine, ...selected]) {
    const metrics = evidence.metrics || evidence.geometry;
    assert.equal(evidence.sourceNeutral, true, evidence.id);
    assert.equal(metrics.readOnlyCanvas, true, evidence.id);
    assert.equal(metrics.selectedCanvasCardCount, 1, evidence.id);
    assert.equal(metrics.selectedTreeRowCount, 1, evidence.id);
    assert.equal(metrics.selectedInspectorFieldCount, 1, evidence.id);
    assert.equal(metrics.exactSelectedControls, true, evidence.id);
    assert.equal(metrics.selectionMirrorCount, 7, evidence.id);
    assert.equal(metrics.selectionSummaryFocused, true, evidence.id);
    assert.ok(metrics.visibleAnchorMinimumHeight >= 44 && metrics.visibleAnchorMinimumWidth >= 44, evidence.id);
    assert.ok(metrics.horizontalOverflow <= 1, evidence.id);
    assert.equal(metrics.mutationControlCount, 0, evidence.id);
    assert.equal(metrics.rendererIframeCount, 1, evidence.id);
  }
  for (const capture of selected) {
    const declared = contract.reviewScenarios.find(({ id }) => id === capture.id);
    assert.deepEqual(capture.selection, declared.selection);
    assert.equal(capture.editedName, null);
    assert.equal(capture.externalRequests, 0);
    assert.equal(capture.hiveRpcCalls, 0);
  }
  assert.equal(selected[0].preservedFourthStreetIdentity, true);
  assert.equal(selected[0].rendererVenueName, '4th Street Bar');
  assert.equal(selected[1].syntheticFixture, true);
  assert.equal(selected[1].rendererVenueName, 'Juniper Works Cooperative');
  assert.ok(machine.every(({ keyboardRoundTrip }) => keyboardRoundTrip));
  return { machine, viewport: selected };
}

function editableCanvasEvidence(captures) {
  const selected = captures.filter(s => s.mode === 'canvas-edit');
  const declared = contract.reviewScenarios.filter(s => s.mode === 'canvas-edit');
  assert.equal(selected.length, 4);
  assert.deepEqual(selected.map(s => s.id), declared.map(s => s.id));
  const source = readJson(rawRoot, 'source-authoring-visual/manifest.json');
  const machine = Object.entries(source.scenarios).flatMap(([id, scenario]) => {
    assert.deepEqual(scenario.editableCanvas.map(s => s.outcome), id.startsWith('juniper') ? ['ready', 'success', 'invalid', 'conflict', 'unsupported'] : ['ready', 'unsupported']);
    assert.equal(scenario.externalNetworkRequests, 0);
    assert.equal(scenario.hiveRpcCalls, 0);
    return scenario.editableCanvas.map(s => ({ id, ...s }));
  });
  assert.equal(machine.length, 14);
  for (const state of [...machine, ...selected]) {
    assert.equal(state.acceptedUnchanged, true);
    assert.equal(state.rendererTextVerified, true);
    assert.equal(state.proposalUnchanged, state.outcome !== 'success');
    assert.equal(state.geometry.selectionMirrorCount, 7);
    assert.equal(state.geometry.selectionSummaryFocused, true);
    assert.ok(state.geometry.horizontalOverflow <= 1);
    assert.ok(state.geometry.minimumTargetHeight >= 44 && state.geometry.minimumTargetWidth >= 44);
    assert.equal(state.geometry.formCount, state.outcome === 'unsupported' ? 0 : 1);
    assert.equal(state.geometry.iframeCount, 1);
    assert.deepEqual(state.expectedHttpErrors, state.outcome === 'invalid' ? [400] : state.outcome === 'conflict' ? [409] : []);
    if (state.id.startsWith('fourth-street')) assert.equal(state.rendererVenueName, '4th Street Bar');
  }
  for (let i = 0; i < selected.length; i += 1) {
    assert.equal(selected[i].outcome, declared[i].outcome);
    assert.deepEqual(selected[i].selection, declared[i].selection);
    assert.equal(selected[i].syntheticFixture, true);
    assert.equal(selected[i].externalRequests, 0);
    assert.equal(selected[i].hiveRpcCalls, 0);
  }
  return { machine, viewport: selected };
}

function main() {
  const { review, screenshotBytes } = verifyViewportReview();
  const machineSummary = readJson(path.join(ROOT, 'artifacts'), 'current-visual-machine-summary.json');
  assert.equal(machineSummary.suites.length, contract.machineSuites.length);
  assert.equal(machineSummary.suites.every(({ exitCode }) => exitCode === 0), true);
  const accessibility = accessibilityEvidence();
  const historicalAuthoring = historicalAuthoringEvidence();
  const captures = review.captures;
  const applicationMobile = captures.filter(({ kind, viewport }) => kind === 'application' && viewport.width < 1200);
  assert.ok(applicationMobile.length >= 4);
  assert.ok(applicationMobile.every(({ geometry }) => geometry.nav?.position === 'fixed' && Math.abs(geometry.nav.bottom - geometry.nav.viewportHeight) <= 1), JSON.stringify(applicationMobile));

  const finalManifest = {
    ...review,
    git: {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    },
    baseline: contract.baseline,
    machine: {
      suiteCount: machineSummary.suites.length,
      wallSeconds: machineSummary.wallSeconds,
      maxConcurrency: machineSummary.maxConcurrency,
      allPassed: true,
      suites: machineSummary.suites.map(({ id, durationMs, exitCode }) => ({ id, durationMs, exitCode })),
    },
    reviewMetrics: {
      screenshotCount: captures.length,
      screenshotBytes,
      screenshotMode: contract.reviewRules.screenshotMode,
      fullPageScreenshotsAllowed: contract.reviewRules.fullPageScreenshotsAllowed,
    },
    accessibility,
    readOnlyCanvas: readOnlyCanvasEvidence(captures),
    editableCanvas: editableCanvasEvidence(captures),
    authoringIdentity: {
      historicalMachineEvidence: historicalAuthoring,
      currentViewportEvidence: {
        fourthStreet: captures.find(({ id }) => id === 'fourth-street-authoring-mobile'),
        syntheticJuniper: captures.find(({ id }) => id === 'juniper-authoring-mobile'),
      },
    },
    supersededHistoricalSuites: contract.supersededHistoricalSuites,
  };
  fs.writeFileSync(path.join(reviewRoot, 'manifest.json'), `${JSON.stringify(finalManifest, null, 2)}\n`);
  fs.copyFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), path.join(reviewRoot, 'visual-qualification-contract.json'));
  process.stdout.write(`Current visual evidence PASS: ${captures.length} real viewport screenshots, ${screenshotBytes} PNG bytes\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
}

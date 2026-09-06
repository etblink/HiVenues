'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { editableCanvasEvidence } = require('../scripts/assemble-current-visual-evidence');
const contract = require('../config/visual-qualification-contract.json');

// Minimal reports at the evidence-consumer boundary, independent of browser setup.
function fixture() {
  const cases = ['ready', 'success', 'invalid', 'conflict', 'unsupported', 'history-dirty', 'history-undo', 'reorder-ready', 'reorder-moved', 'equipment-empty', 'equipment-full', 'equipment-invalid', 'equipment-added', 'equipment-confirm', 'equipment-removed', 'field-status-ready', 'field-status-changed', 'field-time-changed', 'field-time-invalid'];
  function state(outcome) {
    const changed = ['success', 'history-dirty', 'history-undo', 'reorder-moved', 'equipment-added', 'equipment-removed', 'field-status-changed', 'field-time-changed'].includes(outcome);
    const history = outcome === 'history-dirty' ? { undoCount: 2, redoCount: 0, undoEnabled: true, redoEnabled: false }
      : outcome === 'history-undo' ? { undoCount: 1, redoCount: 1, undoEnabled: true, redoEnabled: true }
        : { undoCount: changed ? 1 : 0, redoCount: 0, undoEnabled: changed, redoEnabled: false };
    return { outcome, acceptedUnchanged: true, rendererTextVerified: true,
      rendererHeading: { textFits: true, horizontalOverflow: 0 }, proposalUnchanged: !changed,
      geometry: { selectionMirrorCount: 7, selectionSummaryFocused: true, horizontalOverflow: 0, minimumTargetHeight: 44, minimumTargetWidth: 44,
        formCount: outcome === 'unsupported' || /^(equipment|reorder)-/.test(outcome) ? 0 : 1, iframeCount: 1, history,
        move: { present: true, upEnabled: true, downEnabled: outcome !== 'reorder-moved', moveToPresent: true, destinationCount: 3, validDestinationCount: 2, currentDestinationCount: 1, currentPosition: outcome === 'reorder-moved' ? 3 : 2 } },
      expectedHttpErrors: outcome === 'equipment-invalid' ? [{ status: 400, pathname: '/__source_authoring/simple/canvas-editor/equipment/add' }]
        : ['invalid', 'field-time-invalid'].includes(outcome) ? [400] : outcome === 'conflict' ? [409] : [] };
  }
  const source = { scenarios: Object.fromEntries(['fourth-street-desktop', 'fourth-street-mobile', 'juniper-desktop', 'juniper-mobile'].map(id => [id, {
    externalNetworkRequests: 0, hiveRpcCalls: 0,
    editableCanvas: (id.startsWith('juniper') ? cases : ['ready', 'unsupported']).map(outcome => ({ ...state(outcome), rendererVenueName: id.startsWith('fourth-street') ? '4th Street Bar' : 'Juniper Works Cooperative' })),
  }])) };
  const captures = contract.reviewScenarios.filter(s => s.mode === 'canvas-edit').map(s => ({ ...state(s.outcome), id: s.id, mode: s.mode,
    selection: s.selection || { blockId: 'home.equipment-status.item.equipment-' + 'a'.repeat(24) }, syntheticFixture: true, externalRequests: 0, hiveRpcCalls: 0 }));
  return { captures, source };
}

test('Actual Canvas evidence assembler accepts all declared typed-field states and rejects missing or forged reports', () => {
  const good = fixture();
  const result = editableCanvasEvidence(good.captures, good.source);
  assert.equal(result.machine.length, 42);
  assert.equal(result.viewport.length, 18);
  for (const damage of [
    f => f.source.scenarios['juniper-mobile'].editableCanvas.pop(),
    f => f.captures.pop(),
    f => { f.captures.find(x => x.outcome === 'field-status-changed').proposalUnchanged = true; },
    f => { f.captures.find(x => x.outcome === 'field-time-invalid').expectedHttpErrors = []; },
    f => { f.captures.find(x => x.outcome === 'field-time-changed').acceptedUnchanged = false; },
    f => { f.captures.find(x => x.outcome === 'reorder-moved').geometry.history.undoCount = 0; },
    f => { f.source.scenarios['juniper-desktop'].hiveRpcCalls = 1; },
  ]) {
    const bad = fixture(); damage(bad);
    assert.throws(() => editableCanvasEvidence(bad.captures, bad.source));
  }
});
